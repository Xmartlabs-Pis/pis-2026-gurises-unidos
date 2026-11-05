import Image from 'next/image';
import { cn } from 'cn';
import { coverCropStyle, parseCoverCrop } from '@/lib/projects/cover-crop';

export function CoverFrame({
  src,
  alt,
  crop,
  className,
  sizes = '(min-width: 1024px) 25rem, 20rem',
}: {
  src: string | null;
  alt: string;
  crop?: unknown;
  className?: string;
  sizes?: string;
}) {
  const parsed = src ? parseCoverCrop(crop) : null;

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden', className)}>
      {src && parsed && (
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={900}
          sizes={sizes}
          className="absolute max-w-none"
          style={coverCropStyle(parsed)}
        />
      )}
      {src && !parsed && <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />}
    </div>
  );
}
