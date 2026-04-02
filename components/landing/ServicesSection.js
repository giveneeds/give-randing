export default function ServicesSection({ title, subtitle, content }) {
  return (
    <section id="services" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="services-grid minimal-grid">
          {(content.items || []).map((item, i) => (
            <div key={i} className="service-card-minimal">
              {item.label && <div className="minimal-label">{item.label}</div>}
              <h3 className="minimal-title">{item.title}</h3>
              <p className="minimal-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
