import LazyYouTubeEmbed from '@/components/ui/LazyYouTubeEmbed';

export default function VideoSection() {
  return (
    <section className="section bg-card">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">기브니즈 알아보기</h2>
          <p className="section-subtitle">마케팅의 새로운 기준을 제시하는 기브니즈를 영상으로 만나보세요.</p>
        </div>
        <LazyYouTubeEmbed
          videoId="XEe8DN-JOgU"
          title="GIVENEEDS Introduction"
          embedUrl="https://www.youtube.com/embed/XEe8DN-JOgU?si=Gmt3aeVMM_JLjEpU"
          className="border border-[var(--border)] rounded-lg"
          aspectClassName="aspect-video"
        />
      </div>
    </section>
  );
}
