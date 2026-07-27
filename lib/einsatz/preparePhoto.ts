const MAX_PASSTHROUGH_SIZE = 4 * 1024 * 1024;
const MAX_INPUT_SIZE = 30 * 1024 * 1024;
const SUPPORTED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const IMAGE_FILE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
]);

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

function isLikelyImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.type.toLowerCase().startsWith('image/') || IMAGE_FILE_EXTENSIONS.has(extension);
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Older mobile browsers can still decode the image through an HTMLImageElement.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image decode failed'));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image encoding failed'));
      },
      'image/jpeg',
      quality
    );
  });
}

function getJpegName(fileName: string) {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 64);
  return `${baseName || 'einsatz-foto'}.jpg`;
}

export async function prepareEinsatzPhoto(file: File): Promise<File> {
  if (!isLikelyImage(file)) {
    throw new Error('Bitte w\u00e4hlen Sie eine Bilddatei aus.');
  }

  if (file.size <= 0 || file.size > MAX_INPUT_SIZE) {
    throw new Error('Das ausgew\u00e4hlte Foto ist zu gro\u00df.');
  }

  const contentType = file.type.toLowerCase();
  if (SUPPORTED_UPLOAD_TYPES.has(contentType) && file.size <= MAX_PASSTHROUGH_SIZE) {
    return file;
  }

  let decoded: DecodedImage;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new Error(
      'Das Fotoformat konnte nicht verarbeitet werden. Bitte w\u00e4hlen Sie ein JPG-, PNG- oder WebP-Foto.'
    );
  }

  try {
    const attempts = [
      { maxEdge: 2048, quality: 0.84 },
      { maxEdge: 1800, quality: 0.76 },
      { maxEdge: 1600, quality: 0.68 },
    ];

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxEdge / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is unavailable');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      const blob = await canvasToJpeg(canvas, attempt.quality);
      if (blob.size <= MAX_PASSTHROUGH_SIZE) {
        return new File([blob], getJpegName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }
  } finally {
    decoded.dispose();
  }

  throw new Error('Das Foto konnte nicht ausreichend verkleinert werden.');
}
