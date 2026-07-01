import { permanentRedirect } from 'next/navigation';
import { buildServiceRedirectPath } from '@/lib/serviceRoutes';

export default async function LegacyServiceDetailPage({ params }) {
  const { slug } = await params;
  permanentRedirect(buildServiceRedirectPath(slug));
}
