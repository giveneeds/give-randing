export default function TextSection({ title, subtitle, content }) {
  return (
    <section className="section text-section-minimal">
      <div className="container" style={{ maxWidth: '800px' }}>
        {title && <h2 className="section-title text-left">{title}</h2>}
        {subtitle && <p className="section-subtitle text-left">{subtitle}</p>}
        
        <div 
          className="text-body-minimal"
          dangerouslySetInnerHTML={{ __html: content.body || '' }} 
        />
      </div>
    </section>
  );
}
