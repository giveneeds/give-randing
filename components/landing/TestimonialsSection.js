export default function TestimonialsSection({ title, subtitle, content }) {
  return (
    <section id="testimonials" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="testimonials-grid-minimal">
          {(content.items || []).map((item, i) => (
            <div key={i} className="testimonial-card-minimal">
              <div className="quote-mark">"</div>
              <p className="testimonial-text-minimal">{item.text}</p>
              <div className="testimonial-author-minimal">
                <div className="author-info">
                  <span className="author-name">{item.name}</span>
                  <span className="author-company">{item.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
