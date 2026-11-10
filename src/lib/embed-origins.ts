export function getEmbedHeightOrigins(value = process.env.EMBED_FRAME_ANCESTORS) {
  return (value ?? '').split(/\s+/).flatMap((source) => {
    if (source === '*') return [source];
    if (!/^https?:\/\//.test(source) || source.includes('*')) return [];
    try {
      return [new URL(source).origin];
    } catch {
      return [];
    }
  });
}
