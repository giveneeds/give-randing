/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';

const OPTIMIZED_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'giveneeds.co.kr',
  'www.giveneeds.co.kr',
  'give-randing.vercel.app',
]);

function isAllowedSupabaseImage(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/');
}

export function canUseOptimizedImage(src) {
  if (!src || typeof src !== 'string') return false;
  if (src.startsWith('/')) return true;

  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    return OPTIMIZED_IMAGE_HOSTS.has(url.hostname) || isAllowedSupabaseImage(url);
  } catch {
    return false;
  }
}

export default function OptimizedImage({
  src,
  alt = '',
  fill = true,
  width,
  height,
  className,
  sizes,
  loading,
  preload,
  fetchPriority,
  ...props
}) {
  if (!src) return null;

  if (!canUseOptimizedImage(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading || (preload || fetchPriority === 'high' ? 'eager' : 'lazy')}
        fetchPriority={fetchPriority}
        decoding="async"
        {...props}
      />
    );
  }

  const imageProps = {
    src,
    className,
    sizes,
    loading,
    preload,
    fetchPriority,
    ...props,
  };

  if (fill || (!width && !height)) {
    return <Image {...imageProps} alt={alt} fill />;
  }

  return <Image {...imageProps} alt={alt} width={width} height={height} />;
}
