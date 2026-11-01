'use client';

import { useEffect, useMemo, useState } from 'react';
import { getRandomProjectPlaceholder } from '@/lib/projects/project-placeholders';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

export function useProjectCover(savedUrl: string | null) {
  const [file, setFile] = useState<File | null>(null);
  const [removedPlaceholder, setRemovedPlaceholder] = useState<string | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return {
    file,
    previewUrl: objectUrl ?? removedPlaceholder ?? savedUrl,
    fieldImageUrl: objectUrl ? null : (removedPlaceholder ?? savedUrl),
    canRemove: isUploadedCoverPath(savedUrl) && !file && !removedPlaceholder,
    removedPlaceholder,
    changeFile(next: File | null) {
      setFile(next);
      if (next) setRemovedPlaceholder(null);
    },
    remove() {
      setFile(null);
      setRemovedPlaceholder(getRandomProjectPlaceholder());
    },
  };
}
