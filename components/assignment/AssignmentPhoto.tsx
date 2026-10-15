"use client";

import { useState, type ComponentProps } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PhotoProps = ComponentProps<'img'> & { src: string };

function PhotoImage({ src, alt, className, ...props }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentSrc = attempt
    ? `${src}${src.includes('?') ? '&' : '?'}refresh=1&attempt=${attempt}`
    : src;

  if (failed) {
    return (
      <div className={`${className || ''} flex flex-col items-center justify-center gap-2 bg-gray-50 p-3 text-center`} role="status">
        <span className="text-xs text-gray-600">Foto konnte nicht geladen werden.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => { setAttempt(value => value + 1); setFailed(false); }}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Erneut laden
        </Button>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={currentSrc} alt={alt || 'Einsatzfoto'} className={className} loading={props.loading || 'lazy'} onError={() => setFailed(true)} />;
}

export default function AssignmentPhoto(props: PhotoProps) {
  return <PhotoImage key={props.src} {...props} />;
}
