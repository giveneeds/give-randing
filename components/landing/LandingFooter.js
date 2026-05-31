export default function LandingFooter({ settings, preview = false }) {
  const brand = settings?.brand || {};
  const footer = settings?.footer || {};

  return (
    <footer className="footer-minimal">
      <div className="container" style={{ padding: '60px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          
          <div style={{ fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
            {brand.name || 'GIVENEEDS'}
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {(footer.social_links || []).map((link, i) => (
              <a
                key={i}
                href={preview ? '#' : link.url}
                target={preview ? undefined : '_blank'}
                rel={preview ? undefined : 'noopener noreferrer'}
                onClick={preview ? (e) => e.preventDefault() : undefined}
                style={{ color: 'var(--muted)', fontSize: '0.9rem', transition: 'color 0.2s' }}
              >
                {link.platform}
              </a>
            ))}
          </div>

          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            {footer.copyright || '© 2025 GIVENEEDS. All rights reserved.'}
          </div>
          
        </div>
      </div>
      <style>{`
        .footer-minimal {
          border-top: 1px solid var(--border);
          background-color: var(--background);
        }
        .footer-minimal a:hover {
          color: var(--foreground) !important;
        }
      `}</style>
    </footer>
  );
}
