'use client';
import { useEffect, useRef, useState } from 'react';

export function LandingVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { setEnabled(!preference.matches); if (preference.matches) video.current?.pause(); };
    sync(); preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  return <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'url(/media/corporate-office.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {enabled && <video ref={video} autoPlay muted loop playsInline preload="metadata" poster="/media/corporate-office.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} className="h-full w-full object-cover" tabIndex={-1}>
        <source src="/media/corporate-office.webm" type="video/webm" />
        <source src="/media/corporate-office.mp4" type="video/mp4" />
      </video>}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, rgba(248,252,250,.68), rgba(248,252,250,.55) 50%, rgba(248,252,250,.66))' }} />
    </div>
    {enabled && <button type="button" className="absolute bottom-3 right-4 z-10 rounded-lg border px-3 py-2 text-xs" aria-label={playing ? 'Pause background video' : 'Play background video'} onClick={() => { if (playing) video.current?.pause(); else void video.current?.play().catch(() => setPlaying(false)); }}>{playing ? 'Pause background' : 'Play background'}</button>}
  </>;
}
