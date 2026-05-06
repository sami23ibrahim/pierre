"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

type Props = {
  videoId: string | null;
  onClose: () => void;
};

export default function VideoModal({ videoId, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  const ping = () => {
    setActive(true);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setActive(false), 2200);
  };

  useEffect(() => {
    if (!videoId || !iframeRef.current) return;

    const player = new Player(iframeRef.current);
    playerRef.current = player;

    player.on("play", () => setPlaying(true));
    player.on("pause", () => setPlaying(false));
    player.on("ended", () => setPlaying(false));
    player.on("volumechange", ({ volume: v }: { volume: number }) => {
      setVolume(v);
      setMuted(v === 0);
    });

    return () => {
      player.destroy().catch(() => {});
      playerRef.current = null;
      setPlaying(false);
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    ping();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = prevBodyOverflow;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, onClose]);

  const togglePlay = async () => {
    const p = playerRef.current;
    if (!p) return;
    const isPaused = await p.getPaused();
    if (isPaused) p.play();
    else p.pause();
  };

  const toggleMute = async () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted || volume === 0) await p.setVolume(1);
    else await p.setVolume(0);
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    playerRef.current?.setVolume(v);
  };

  const requestFullscreen = async () => {
    const p = playerRef.current;
    try {
      if (p) await p.requestFullscreen();
    } catch {
      const el = iframeRef.current as
        | (HTMLIFrameElement & { webkitRequestFullscreen?: () => void })
        | null;
      if (el?.requestFullscreen) el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  };

  if (!videoId) return null;

  const src = `https://player.vimeo.com/video/${videoId}?autoplay=1&controls=0&title=0&byline=0&portrait=0&dnt=1&playsinline=1`;

  return (
    <div className="vm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`vm-stage ${playing ? "" : "is-paused"} ${active ? "is-active" : ""}`}
        onClick={(e) => { e.stopPropagation(); ping(); }}
        onMouseMove={ping}
        onMouseLeave={() => setActive(false)}
        onTouchStart={ping}
      >
        <div className="vm-frame">
          <iframe
            ref={iframeRef}
            src={src}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video"
          />
          <button className="vm-close" onClick={onClose} aria-label="Close" type="button">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="vm-controls">
          <button className="vm-btn" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} type="button">
            {playing ? (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
              </svg>
            )}
          </button>

          <div className="vm-vol">
            <button className="vm-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} type="button">
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
                  <path d="M16 8l6 8M22 8l-6 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
                  <path d="M16 8c1.5 1.2 2.5 2.7 2.5 4s-1 2.8-2.5 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={onVolumeChange}
              aria-label="Volume"
              className="vm-range"
            />
          </div>

          <button className="vm-btn vm-fs" onClick={requestFullscreen} aria-label="Fullscreen" type="button">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
