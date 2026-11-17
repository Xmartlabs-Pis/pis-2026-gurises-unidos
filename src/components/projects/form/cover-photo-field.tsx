'use client';

import { useRef, useState } from 'react';
import type { ReusableCover } from '@/app/actions/project-covers';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import type { CoverCrop } from '@/lib/projects/cover-crop';
import { CoverPhotoDialog, type CoverEditorImage } from './cover-photo-dialog';
import type { CoverDraft } from './use-project-cover';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];

export function CoverPhotoField({
  previewUrl,
  crop,
  file,
  canRemoveSaved,
  hasUnsavedSelection,
  hasUnsavedCrop,
  onApply,
  onClearUnsaved,
  onRemoveSaved,
}: {
  previewUrl: string | null;
  crop: CoverCrop | null;
  file: File | null;
  canRemoveSaved: boolean;
  hasUnsavedSelection: boolean;
  hasUnsavedCrop: boolean;
  onApply: (draft: CoverDraft) => void;
  onClearUnsaved: () => void;
  onRemoveSaved?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ownedUrl = useRef<string | null>(null);
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [covers, setCovers] = useState<ReusableCover[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [coversError, setCoversError] = useState(false);
  const [image, setImage] = useState<CoverEditorImage | null>(null);
  const [uploadError, setUploadError] = useState<string>();
  const descriptionId = 'coverPhoto-description';

  function releaseOwnedUrl() {
    if (!ownedUrl.current) return;
    URL.revokeObjectURL(ownedUrl.current);
    ownedUrl.current = null;
  }

  function closeDialog() {
    releaseOwnedUrl();
    setOpen(false);
  }

  function openDialog() {
    releaseOwnedUrl();
    setUploadError(undefined);
    setImage(previewUrl ? { source: previewUrl, file, initialCrop: crop } : null);
    setOpen(true);
    const id = ++requestId.current;
    setLoadingCovers(true);
    setCoversError(false);
    void import('@/app/actions/project-covers')
      .then(({ listProjectCovers }) => listProjectCovers())
      .then((next) => {
        if (requestId.current === id) setCovers(next);
      })
      .catch(() => {
        if (requestId.current === id) setCoversError(true);
      })
      .finally(() => {
        if (requestId.current === id) setLoadingCovers(false);
      });
  }

  function chooseExisting(path: string) {
    releaseOwnedUrl();
    setUploadError(undefined);
    setImage({ source: path, file: null, initialCrop: null });
  }

  function chooseFile(next: File) {
    if (!IMAGE_TYPES.includes(next.type)) {
      setUploadError('La imagen debe ser JPG o PNG.');
      return;
    }
    if (next.size > MAX_IMAGE_SIZE) {
      setUploadError('La imagen no puede superar los 5 MB.');
      return;
    }
    releaseOwnedUrl();
    const url = URL.createObjectURL(next);
    ownedUrl.current = url;
    setUploadError(undefined);
    setImage({ source: url, file: next, initialCrop: null });
  }

  return (
    <Field className="min-w-0 gap-1.5">
      <FieldLabel htmlFor="coverPhoto" className="text-foreground text-xs leading-4 font-medium">
        Foto de portada
      </FieldLabel>
      <div className="h-0 w-0 overflow-hidden">
        <input
          ref={inputRef}
          form="cover-photo-detached"
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const next = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (next) chooseFile(next);
          }}
        />
      </div>
      <Button
        id="coverPhoto"
        type="button"
        variant="ghost"
        aria-describedby={descriptionId}
        title={file?.name}
        className="border-input bg-muted text-muted-foreground hover:bg-accent h-auto min-h-18 w-full min-w-0 shrink overflow-hidden rounded-lg border px-4 py-3 text-center text-xs leading-4 font-normal whitespace-normal"
        onClick={openDialog}
      >
        <span id={descriptionId} className="block w-full min-w-0">
          {file ? (
            <span className="flex w-full min-w-0 items-center justify-center">
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="shrink-0"> · Cambiar imagen</span>
            </span>
          ) : previewUrl ? (
            'Cambiar imagen'
          ) : (
            'Elegir foto de portada'
          )}
        </span>
      </Button>
      {(hasUnsavedSelection || hasUnsavedCrop || canRemoveSaved) && (
        <div className="flex flex-wrap gap-2">
          {hasUnsavedSelection && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-foreground"
              onClick={onClearUnsaved}
            >
              Quitar foto
            </Button>
          )}
          {hasUnsavedCrop && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-foreground"
              onClick={onClearUnsaved}
            >
              Deshacer encuadre
            </Button>
          )}
          {canRemoveSaved && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-foreground"
              onClick={onRemoveSaved}
            >
              Quitar foto
            </Button>
          )}
        </div>
      )}
      <CoverPhotoDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDialog();
          else openDialog();
        }}
        covers={covers}
        loadingCovers={loadingCovers}
        coversError={coversError}
        image={open ? image : null}
        uploadError={uploadError}
        onRequestUpload={() => inputRef.current?.click()}
        onChooseExisting={chooseExisting}
        onApply={(draft) => {
          onApply(draft);
          closeDialog();
        }}
      />
    </Field>
  );
}
