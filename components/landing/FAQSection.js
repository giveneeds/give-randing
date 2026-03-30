'use client';
import { useState } from 'react';

export default function FAQSection({ title, subtitle, content }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="section section-alternate">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="faq-list-minimal">
          {(content.items || []).map((item, i) => (
            <div 
              key={i} 
              className={`faq-item-minimal ${openIndex === i ? 'open' : ''}`}
            >
              <button 
                className="faq-question-minimal"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              >
                <span>{item.question}</span>
                <span className="faq-toggle-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </button>
              <div className="faq-answer-wrapper">
                <div className="faq-answer-minimal">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
