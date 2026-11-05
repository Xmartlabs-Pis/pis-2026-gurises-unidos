'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CoverCrop } from '@/lib/projects/cover-crop';
import { getRandomProjectPlaceholder } from '@/lib/projects/project-placeholders';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

export type CoverDraft = {
  file: File | null;
  existingPath: string | null;
  crop: CoverCrop;
};

export function useProjectCover(savedUrl: string | null, savedCrop: CoverCrop | null) {
  const [file, setFile] = useState<File | null>(null);
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [crop, setCrop] = useState<CoverCrop | null>(savedCrop);
  const [cropDirty, setCropDirty] = useState(false);
  const [removedPlaceholder, setRemovedPlaceholder] = useState<string | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const replacedImage = Boolean(file || (existingPath && existingPath !== savedUrl));
  const showingSaved = !replacedImage && !removedPlaceholder;

  return {
    file,
    existingPath,
    crop: removedPlaceholder ? null : crop,
    cropDirty: cropDirty && !removedPlaceholder,
    previewUrl: objectUrl ?? existingPath ?? removedPlaceholder ?? savedUrl,
    canRemoveSaved: isUploadedCoverPath(savedUrl) && showingSaved,
    hasUnsavedSelection: replacedImage,
    hasUnsavedCrop: cropDirty && !removedPlaceholder && !replacedImage,
    removedPlaceholder,
    apply(draft: CoverDraft) {
      setFile(draft.file);
      setExistingPath(draft.file ? null : draft.existingPath);
      setCrop(draft.crop);
      setCropDirty(true);
      setRemovedPlaceholder(null);
    },
    clearUnsaved() {
      setFile(null);
      setExistingPath(null);
      setCrop(savedCrop);
      setCropDirty(false);
    },
    remove() {
      setFile(null);
      setExistingPath(null);
      setCrop(null);
      setCropDirty(false);
      setRemovedPlaceholder(getRandomProjectPlaceholder());
    },
  };
}
