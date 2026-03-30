export default function VideoSection() {
  return (
    <section className="section bg-card">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">기브니즈 알아보기</h2>
          <p className="section-subtitle">마케팅의 새로운 기준을 제시하는 기브니즈를 영상으로 만나보세요.</p>
        </div>
        <div 
          style={{ 
            position: 'relative', 
            width: '100%', 
            paddingBottom: '56.25%', // 16:9 Aspect Ratio
            height: 0, 
            overflow: 'hidden', 
            borderRadius: '8px',
            border: '1px solid var(--border)' 
          }}
        >
          <iframe 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%' 
            }}
            src="https://www.youtube.com/embed/XEe8DN-JOgU?si=Gmt3aeVMM_JLjEpU" 
            title="GIVENEEDS Introduction" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
}
