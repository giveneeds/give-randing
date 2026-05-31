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
import BrandStatsSection from './BrandStatsSection';
import ConvictionSection from './ConvictionSection';
import CaseStudiesSection from './CaseStudiesSection';
import ClientLogosSection from './ClientLogosSection';

function PreviewInteractionGuard({ enabled, children }) {
  if (!enabled) return children;
  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <div onClickCapture={block} onSubmitCapture={block}>
      {children}
    </div>
  );
}

function PreviewPlaceholder({ type }) {
  return (
    <div className="px-4 py-12 text-center text-sm font-bold text-zinc-500">
      프리뷰에서 안전하게 표시할 수 없는 섹션입니다: {type}
    </div>
  );
}

export default function SectionRenderer({ type, content, settings, title, subtitle, preview = false, previewData = {} }) {
  const commonProps = { title, subtitle, content, settings, preview, previewData };
  let rendered = null;

  switch (type) {
    case 'hero':
      rendered = <HeroSection {...commonProps} />;
      break;
    case 'services':
      rendered = <ServicesSection {...commonProps} />;
      break;
    case 'resources':
      rendered = <ResourcesSection {...commonProps} />;
      break;
    case 'testimonials':
      rendered = <TestimonialsSection {...commonProps} />;
      break;
    case 'faq':
      rendered = <FAQSection {...commonProps} />;
      break;
    case 'cta':
      rendered = <CTASection {...commonProps} />;
      break;
    case 'gallery':
      rendered = <GallerySection {...commonProps} />;
      break;
    case 'text':
      rendered = <TextSection {...commonProps} />;
      break;
    case 'video':
      rendered = <VideoSection {...commonProps} />;
      break;
    case 'products':
      rendered = <ProductsSection {...commonProps} />;
      break;
    case 'hook':
      rendered = <MarketingHookSection {...commonProps} />;
      break;
    case 'stats':
      rendered = <StatsGridSection {...commonProps} />;
      break;
    case 'identity':
      rendered = <BrandIdentitySection {...commonProps} />;
      break;
    case 'product_detail':
      rendered = <ProductTabsSection {...commonProps} />;
      break;
    case 'ai_strategy':
      rendered = <AIStrategySection {...commonProps} />;
      break;
    case 'magazine':
      rendered = <MagazineList {...commonProps} />;
      break;
    case 'brand_stats':
      rendered = <BrandStatsSection {...commonProps} />;
      break;
    case 'conviction':
      rendered = <ConvictionSection {...commonProps} />;
      break;
    case 'case_studies':
      rendered = <CaseStudiesSection {...commonProps} />;
      break;
    case 'client_logos':
      rendered = <ClientLogosSection {...commonProps} />;
      break;
    default:
      rendered = (
        <div className="px-4 py-12 md:px-8 md:py-16 text-center text-sm text-zinc-500 break-keep">
          알 수 없는 섹션 타입입니다: {type}
        </div>
      );
      break;
  }

  if (preview && !rendered) rendered = <PreviewPlaceholder type={type} />;

  return (
    <PreviewInteractionGuard enabled={preview}>
      {rendered}
    </PreviewInteractionGuard>
  );
}
