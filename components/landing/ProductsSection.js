const products = [
  {
    id: 1,
    category: "DATA",
    title: "퍼포먼스 마케팅",
    desc: "Meta, Google 매체 최적화를 통한 ROAS 극대화 및 고객 획득 비용(CAC) 절감"
  },
  {
    id: 2,
    category: "GROWTH",
    title: "CRM 마케팅",
    desc: "행동 데이터 기반의 세그먼트 타겟팅으로 고객 라이프타임 밸류(LTV) 상승"
  },
  {
    id: 3,
    category: "CREATIVE",
    title: "브랜드 콘텐츠",
    desc: "고관여 타겟을 매료시키는 심미적이고 논리적인 영상/디자인 애셋 제작"
  },
  {
    id: 4,
    category: "SEARCH",
    title: "SEO 최적화",
    desc: "오가닉 트래픽 증대를 위한 테크니컬 SEO 및 콘텐츠 온페이지 최적화"
  }
];

export default function ProductsSection() {
  return (
    <section className="section section-alternate">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">주요 솔루션</h2>
          <p className="section-subtitle">고객의 브랜드를 성장시키는 방법</p>
        </div>
      </div>
      
      {/* Horizontal Scroll Area */}
      <div 
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '0 24px 40px 24px',
          gap: '24px',
          // Hide scrollbar but keep functionality
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Helper style snippet to hide webkit scrollbar specifically inside the JSX */}
        <style dangerouslySetInnerHTML={{__html: `
          ::-webkit-scrollbar { display: none; }
        `}} />
        
        {/* Empty padding block for initial alignment */}
        <div style={{ minWidth: 'max(0vw, calc((100vw - 1200px) / 2))' }}></div>

        {products.map(product => (
          <div 
            key={product.id}
            className="service-card-minimal"
            style={{ 
              minWidth: '300px', 
              width: '80vw', 
              maxWidth: '400px', 
              scrollSnapAlign: 'center',
              flexShrink: 0 
            }}
          >
            <div className="minimal-label">{product.category}</div>
            <h3 className="minimal-title">{product.title}</h3>
            <p className="minimal-desc">{product.desc}</p>
          </div>
        ))}

        {/* Empty padding block for ending alignment */}
        <div style={{ minWidth: 'max(0vw, calc((100vw - 1200px) / 2))', paddingRight: '24px' }}></div>
      </div>
    </section>
  );
}
