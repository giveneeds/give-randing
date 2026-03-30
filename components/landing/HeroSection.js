import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

export default function HeroSection() {
  const words = [
    "안녕하세요.", 
    "당신을 위한", 
    "모든 마케팅을", 
    "제공하겠습니다.", 
    "GIVENEEDS입니다."
  ];

  return (
    <section id="hero" className="section-hero" style={{ padding: 0 }}>
      <ParticleTextEffect words={words} />
      
      {/* Scroll indicator for usability */}
      <div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce text-muted"
        style={{ zIndex: 20, color: 'var(--muted)' }}
      >
        <span className="text-xs mb-2 uppercase tracking-widest">Scroll Down</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    </section>
  );
}
