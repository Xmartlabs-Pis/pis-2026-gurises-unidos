const UPLOADED_COVER_PATH =
  /^\/uploads\/covers\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.webp$/;

export function isUploadedCoverPath(value: unknown): value is string {
  return typeof value === 'string' && UPLOADED_COVER_PATH.test(value);
}

export function uploadedCoverId(coverPath: string) {
  return UPLOADED_COVER_PATH.exec(coverPath)?.[1] ?? null;
}
