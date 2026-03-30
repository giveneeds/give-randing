import { FILE_TYPE_LABELS } from '@/lib/constants';

export default function ResourcesSection({ title, subtitle, content }) {
  return (
    <section id="resources" className="section section-alternate">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="resources-list-minimal">
          {(content.items || []).map((item, i) => (
            <a key={i} href={item.file_url} target="_blank" rel="noopener noreferrer" className="resource-item-minimal">
              <div className="resource-info">
                <span className="resource-format-badge">
                  {FILE_TYPE_LABELS[item.file_type] || 'FILE'}
                </span>
                <div>
                  <h3 className="resource-item-title">{item.title}</h3>
                  <p className="resource-item-desc">{item.description}</p>
                </div>
              </div>
              <div className="resource-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
