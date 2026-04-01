import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

export default function HeroSection({ content = {} }) {
  const defaultWords = [
    "안녕하세요.", 
    "당신을 위한", 
    "모든 마케팅을", 
    "제공\n하겠습니다.", 
    "GIVENEEDS\n입니다."
  ];

  const words = content.words && content.words.length > 0 ? content.words : defaultWords;

  return (
    <section id="hero" className="section-hero" style={{ padding: 0 }}>
      <ParticleTextEffect words={words} />
    </section>
  );
}
