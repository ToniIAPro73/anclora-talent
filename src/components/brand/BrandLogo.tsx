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
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full ${className}`.trim()}
      aria-hidden="true"
    >
      <Image
        src={TALENT_BRAND.logoPath}
        alt={TALENT_BRAND.name}
        width={size}
        height={size}
        priority={priority}
        className={`h-full w-full object-cover ${imageClassName}`.trim()}
      />
    </span>
  );
}
