import OptimizedImage from '@/components/ui/OptimizedImage';

export default function GallerySection({ title, subtitle, content }) {
  return (
    <section id="gallery" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="gallery-grid-minimal">
          {(content.items || []).map((item, i) => (
            <div key={i} className="gallery-item-minimal group">
              <OptimizedImage
                src={item.image_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop'}
                alt={item.caption || title || '갤러리 이미지'}
                className="gallery-image-minimal object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {item.caption && (
                <div className="gallery-caption-minimal">
                  {item.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
