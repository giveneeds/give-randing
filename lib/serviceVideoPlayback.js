export function getServiceVideoPlaybackProps(media = {}) {
  if (media.autoplay === false) {
    return {
      muted: true,
      playsInline: true,
      controls: true,
    };
  }

  return {
    muted: true,
    autoPlay: true,
    loop: true,
    playsInline: true,
  };
}
