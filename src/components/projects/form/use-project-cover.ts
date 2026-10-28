'use client';

import { useEffect, useState } from 'react';
import { getRandomProjectPlaceholder } from '@/lib/projects/project-placeholders';
import { isUploadedCoverPath } from '@/lib/projects/uploaded-cover';

export function useProjectCover(savedUrl: string | null) {
  const [file, setFile] = useState<File | null>(null);
  const [removedPlaceholder, setRemovedPlaceholder] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
