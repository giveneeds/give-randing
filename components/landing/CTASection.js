export default function CTASection({ content, settings }) {
  const ctaGlobal = settings?.cta_global || {};

  const handleCTAClick = (btn) => {
    if (btn.type === 'kakao') window.open(ctaGlobal.kakao_url || btn.url || 'https://pf.kakao.com/', '_blank');
    else if (btn.type === 'phone') window.location.href = `tel:${ctaGlobal.phone || btn.value}`;
    else if (btn.type === 'scroll') {
      const el = document.querySelector(btn.url || btn.value);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    else window.open(btn.url, '_blank');
  };

  return (
    <section className="section cta-section-minimal">
      <div className="container">
        <div className="cta-box-minimal">
          <h2 className="cta-title-minimal">{content.headline}</h2>
          <p className="cta-desc-minimal">{content.description}</p>
          
          <div className="cta-actions-minimal">
            {(content.cta_buttons || []).map((btn, i) => (
              <button
                key={i}
                className={`btn ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCTAClick(btn)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
