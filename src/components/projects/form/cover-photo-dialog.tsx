'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { cn } from 'cn';
import type { ReusableCover } from '@/app/actions/project-covers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseCoverCrop, sameCoverCrop, type CoverCrop } from '@/lib/projects/cover-crop';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';
import type { CoverDraft } from './use-project-cover';

const COVER_ASPECT = 16 / 9;

function coverLabel(cover: ReusableCover) {
  if (cover.usedBy <= 1) return cover.projectName;
  return `${cover.projectName} (+${cover.usedBy - 1})`;
}

export type CoverEditorImage = {
  source: string;
  file: File | null;
  initialCrop: CoverCrop | null;
};

export function CoverPhotoDialog({
  open,
  onOpenChange,
  covers,
  loadingCovers,
  coversError,
  image,
  uploadError,
  onRequestUpload,
  onChooseExisting,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  covers: ReusableCover[];
  loadingCovers: boolean;
  coversError: boolean;
  image: CoverEditorImage | null;
  uploadError?: string;
  onRequestUpload: () => void;
  onChooseExisting: (path: string) => void;
  onApply: (draft: CoverDraft) => void;
}) {
  const source = image?.source ?? null;
  const [trackedSource, setTrackedSource] = useState(source);
  const [readyCrop, setReadyCrop] = useState<CoverCrop | null>(image?.initialCrop ?? null);
  const [query, setQuery] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  if (source !== trackedSource) {
    setTrackedSource(source);
    setReadyCrop(image?.initialCrop ?? null);
  }
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery('');
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const visibleCovers = normalizedQuery
    ? covers.filter((cover) => cover.projectName.toLocaleLowerCase('es').includes(normalizedQuery))
    : covers;

  const rememberCrop = useCallback((crop: CoverCrop) => {
    setReadyCrop((current) => (current && sameCoverCrop(crop, current) ? current : crop));
  }, []);

  function apply() {
    if (!image || !readyCrop) return;
    onApply({
      file: image.file,
      existingPath: image.file || !isUploadedCoverPath(image.source) ? null : image.source,
      crop: readyCrop,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto de portada</DialogTitle>
          <DialogDescription>
            Elegí una imagen cargada o subí una nueva, y ajustá el encuadre.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-foreground text-xs font-medium">
                Imágenes cargadas
                {covers.length > 0 && (
                  <span className="text-muted-foreground font-normal"> ({covers.length})</span>
                )}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onRequestUpload}>
                Subir imagen
              </Button>
            </div>
            {covers.length > 0 && (
              <Input
                type="search"
                value={query}
                placeholder="Buscar por proyecto"
                aria-label="Buscar imagen por proyecto"
                className="h-8 text-xs"
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            )}
            {loadingCovers && <p className="text-muted-foreground text-xs">Cargando imágenes...</p>}
            {coversError && (
              <p className="text-destructive text-xs" role="alert">
                No se pudieron cargar las imágenes.
              </p>
            )}
            {!loadingCovers && !coversError && covers.length === 0 && (
              <p className="text-muted-foreground text-xs">Todavía no hay imágenes cargadas.</p>
            )}
            {covers.length > 0 && visibleCovers.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Ninguna imagen coincide con la búsqueda.
              </p>
            )}
            {visibleCovers.length > 0 && (
              <div className="max-h-44 overflow-y-auto p-1">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {visibleCovers.map((cover) => {
                    const label = coverLabel(cover);
                    return (
                      <button
                        key={cover.path}
                        type="button"
                        aria-pressed={image?.source === cover.path}
                        aria-label={label}
                        title={label}
                        className={cn(
                          'ring-border relative aspect-video overflow-hidden rounded-md ring-1',
                          image?.source === cover.path && 'ring-primary ring-2'
                        )}
                        onClick={() => onChooseExisting(cover.path)}
                      >
                        <Image
                          src={cover.path}
                          alt=""
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1.5 py-0.5 text-left text-[10px] leading-4 text-white">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {uploadError && (
              <p className="text-destructive text-xs" role="alert">
                {uploadError}
              </p>
            )}
          </div>
          {image ? (
            <CoverEditor key={image.source} image={image} onCropReady={rememberCrop} />
          ) : (
            <p className="text-muted-foreground text-xs">
              Elegí una imagen para ajustar el encuadre.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={apply} disabled={!image || !readyCrop}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoverEditor({
  image,
  onCropReady,
}: {
  image: CoverEditorImage;
  onCropReady: (crop: CoverCrop) => void;
}) {
  const [cropPoint, setCropPoint] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const skipInitialEmit = useRef(image.initialCrop !== null);
  const onCropComplete = useCallback(
    (croppedArea: Area) => {
      if (skipInitialEmit.current) {
        skipInitialEmit.current = false;
        return;
      }
      const parsed = parseCoverCrop(croppedArea);
      if (!parsed) return;
      onCropReady(parsed);
    },
    [onCropReady]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted relative isolate h-72 w-full overflow-hidden rounded-lg">
        <Cropper
          image={image.source}
          crop={cropPoint}
          zoom={zoom}
          rotation={0}
          aspect={COVER_ASPECT}
          minZoom={1}
          maxZoom={3}
          cropShape="rect"
          objectFit="cover"
          zoomSpeed={1}
          restrictPosition
          keyboardStep={1}
          style={{
            cropAreaStyle: {
              overflow: 'visible',
              boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.5)',
            },
          }}
          classes={{}}
          mediaProps={{}}
          cropperProps={{}}
          onCropChange={setCropPoint}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          initialCroppedAreaPercentages={image.initialCrop ?? undefined}
        />
      </div>
      <label className="text-muted-foreground flex items-center gap-3 text-xs">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          className="accent-primary w-full"
          onChange={(event) => setZoom(Number(event.currentTarget.value))}
        />
      </label>
    </div>
  );
}
