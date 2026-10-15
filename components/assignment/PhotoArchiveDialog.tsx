"use client";

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssignmentPhoto from './AssignmentPhoto';
import type { ArchivePhoto } from '@/lib/storage/photoArchive';

export default function PhotoArchiveDialog({ open, onOpenChange, initialBucket }: {
  open: boolean; onOpenChange: (open: boolean) => void; initialBucket: 'einsatz-photos' | 'market-photos';
}) {
  const [bucket, setBucket] = useState(initialBucket);
  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ArchivePhoto | null>(null);
  useEffect(() => { if (open) { setBucket(initialBucket); setPage(0); } }, [open, initialBucket]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setPhotos([]); setPage(0); setPreview(null);
    fetch(`/api/admin/photo-archive?bucket=${bucket}${revision ? '&refresh=1' : ''}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Das Fotoarchiv konnte nicht geladen werden.');
        setPhotos(data.photos || []);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, bucket, revision]);
  const filtered = photos.filter(photo => filter === 'all' || !photo.linked);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-xl p-6">
      <DialogHeader>
        <DialogTitle>Fotoarchiv</DialogTitle>
        <DialogDescription>Gespeicherte Fotos aus Einsätzen und Märkten. Auch Fotos ohne aktuelle Zuordnung bleiben hier einsehbar.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={bucket} onValueChange={value => setBucket(value as typeof bucket)}>
          <SelectTrigger className="w-40 rounded-lg focus:ring-0 focus:border-gray-400" aria-label="Fotobereich"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="einsatz-photos">Einsatzfotos</SelectItem><SelectItem value="market-photos">Marktfotos</SelectItem></SelectContent>
        </Select>
        <Select value={filter} onValueChange={value => { setFilter(value); setPage(0); }}>
          <SelectTrigger className="w-48 rounded-lg focus:ring-0 focus:border-gray-400" aria-label="Foto-Zuordnung"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle Fotos</SelectItem><SelectItem value="unlinked">Ohne Zuordnung</SelectItem></SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => setRevision(value => value + 1)} disabled={loading} aria-label="Fotoarchiv aktualisieren"><RotateCcw className="h-4 w-4" /></Button>
        {!loading && !error && <span className="ml-auto text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'Foto' : 'Fotos'}</span>}
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Fotos werden geladen…</div>
          : error ? <p role="alert" className="py-8 text-sm text-red-600">{error}</p>
          : preview ? <div className="space-y-3"><Button type="button" variant="outline" size="sm" onClick={() => setPreview(null)}><ChevronLeft className="mr-1 h-4 w-4" />Zur Übersicht</Button><AssignmentPhoto src={preview.url} alt={preview.title} className="max-h-[60vh] min-h-48 w-full rounded-lg object-contain" /></div>
          : filtered.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.slice(page * 12, page * 12 + 12).map(photo => <div key={photo.id} className="overflow-hidden rounded-lg border border-gray-200">
              <AssignmentPhoto src={photo.url} alt={photo.title} className="h-36 w-full cursor-pointer object-cover" onClick={() => setPreview(photo)} />
              <div className="space-y-1 p-3"><button type="button" className="text-left text-sm font-medium text-gray-900 hover:underline" onClick={() => setPreview(photo)} aria-label={`${photo.title} öffnen`}>{photo.title}</button><p className="text-xs text-gray-500">{photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('de-AT') : ''}</p><p className="text-xs text-gray-500">{photo.linked ? 'Zugeordnet' : 'Ohne Zuordnung'}</p></div>
            </div>)}
          </div> : <p className="py-8 text-sm text-gray-500">Keine Fotos für diese Auswahl vorhanden.</p>}
      </div>
      {!preview && !loading && !error && pageCount > 1 && <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
        <Button type="button" variant="outline" size="sm" disabled={!page} onClick={() => setPage(value => value - 1)} aria-label="Vorherige Fotoseite"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm text-gray-500">{page + 1} / {pageCount}</span>
        <Button type="button" variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)} aria-label="Nächste Fotoseite"><ChevronRight className="h-4 w-4" /></Button>
      </div>}
    </DialogContent>
  </Dialog>;
}
