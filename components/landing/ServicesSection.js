export default function ServicesSection({ title, subtitle, content }) {
  if (!content || !content.items) return null;
  
  return (
    <section id="services" className="section py-24">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-black tracking-tighter mb-4">{title}</h2>
          {subtitle && <p className="text-zinc-500 max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {content.items.map((item, i) => (
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
