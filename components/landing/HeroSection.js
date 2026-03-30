import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

export default function HeroSection() {
  const words = [
    "안녕하세요.", 
    "당신을 위한", 
    "모든 마케팅을", 
    "제공\n하겠습니다.", 
    "GIVENEEDS\n입니다."
  ];

  return (
    <section id="hero" className="section-hero" style={{ padding: 0 }}>
      <ParticleTextEffect words={words} />
    </section>
  );
}
