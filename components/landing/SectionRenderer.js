import HeroSection from './HeroSection';
import ServicesSection from './ServicesSection';
import ResourcesSection from './ResourcesSection';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQSection';
import CTASection from './CTASection';
import GallerySection from './GallerySection';
import TextSection from './TextSection';
import VideoSection from './VideoSection';
import ProductsSection from './ProductsSection';
import MarketingHookSection from './MarketingHookSection';
import StatsGridSection from './StatsGridSection';
import BrandIdentitySection from './BrandIdentitySection';
import ProductTabsSection from './ProductTabsSection';
import AIStrategySection from './AIStrategySection';
import MagazineList from './MagazineList';

export default function SectionRenderer({ type, content, settings, title, subtitle }) {
  const commonProps = { title, subtitle, content, settings };

  switch (type) {
    case 'hero':
      return <HeroSection {...commonProps} />;
    case 'services':
      return <ServicesSection {...commonProps} />;
    case 'resources':
      return <ResourcesSection {...commonProps} />;
    case 'testimonials':
      return <TestimonialsSection {...commonProps} />;
    case 'faq':
      return <FAQSection {...commonProps} />;
    case 'cta':
      return <CTASection {...commonProps} />;
    case 'gallery':
      return <GallerySection {...commonProps} />;
    case 'text':
      return <TextSection {...commonProps} />;
    case 'video':
      return <VideoSection {...commonProps} />;
    case 'products':
      return <ProductsSection {...commonProps} />;
    case 'hook':
      return <MarketingHookSection {...commonProps} />;
    case 'stats':
      return <StatsGridSection {...commonProps} />;
    case 'identity':
      return <BrandIdentitySection {...commonProps} />;
    case 'product_detail':
      return <ProductTabsSection {...commonProps} />;
    case 'ai_strategy':
      return <AIStrategySection {...commonProps} />;
    case 'magazine':
      return <MagazineList {...commonProps} />;
    default:
      return (
        <div style={{ padding: '50px', textAlign: 'center', color: '#888' }}>
          <div>알 수 없는 섹션 타입입니다: {type}</div>
        </div>
      );
  }
}
