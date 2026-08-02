import Image from 'next/image';
import { TALENT_BRAND } from '@/lib/talent-brand';

export function BrandLogo({
  className = '',
  imageClassName = '',
  priority = false,
  size = 28,
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: number;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex-shrink-0 ${className}`.trim()}
      aria-hidden="true"
    >
      <Image
        src={TALENT_BRAND.logoPath}
        alt={TALENT_BRAND.name}
        fill
        sizes={`${size}px`}
        priority={priority}
        className={`object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)] ${imageClassName}`.trim()}
      />
    </div>
  );
}
