"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

type Props = {
  videoId: string | null;
  onClose: () => void;
};

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(TOUCH_QUERY);
    setIsTouch(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isTouch;
}

export default function VideoModal({ videoId, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState(true);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const isTouch = useIsTouchDevice();

  const ping = () => {
    setActive(true);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    const idleMs = isTouch ? 3000 : 2200;
    idleTimerRef.current = window.setTimeout(() => setActive(false), idleMs);
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
      setCssFullscreen(false);
    };
  }, [videoId]);

  // Track native fullscreen state — fires when user enters/exits via any path
  // (the [] button, ESC, hardware back, browser UI, etc.)
  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const el = document.fullscreenElement || doc.webkitFullscreenElement;
      setNativeFs(!!el);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    if (!videoId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (cssFullscreen) setCssFullscreen(false);
        else if (nativeFs) return; // browser handles ESC → exits FS, don't also close modal
        else onClose();
      }
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
  }, [videoId, onClose, cssFullscreen, nativeFs]);

  useEffect(() => {
    if (!cssFullscreen) return;
    window.history.pushState({ vmFs: true }, "");
    const onPop = () => setCssFullscreen(false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.vmFs) window.history.back();
    };
  }, [cssFullscreen]);

  // Browser back / iOS swipe-back closes the modal first instead of leaving the
  // page. Push a history entry when the modal opens; pop it on close.
  // onClose is read through a ref so a parent re-render (which produces a fresh
  // arrow function) doesn't cause this effect to re-run and thrash history.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!videoId) return;

    let userPopped = false;
    window.history.pushState({ vmModal: true }, "");

    const onPop = () => {
      // If user is in native fullscreen, browsers normally exit FS without
      // firing popstate — but if it does fire, re-push so back-out-of-FS
      // doesn't also close the modal.
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        window.history.pushState({ vmModal: true }, "");
        return;
      }
      userPopped = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      const state = window.history.state as { vmModal?: boolean } | null;
      if (!userPopped && state?.vmModal) {
        window.history.back();
      }
    };
  }, [videoId]);

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
    if (isTouch) {
      // OLD MOBILE FULLSCREEN — CSS-based hack. Kept commented as a fallback.
      // setCssFullscreen((prev) => !prev);
      // ping();
      // return;

      // NEW: native fullscreen on the .vm-stage wrapper.
      // Wrapping both the iframe AND our React controls means both go fullscreen
      // together (the previous bug was calling FS on the iframe alone).
      const stage = stageRef.current;
      if (!stage) return;

      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const inFs = document.fullscreenElement || doc.webkitFullscreenElement;
      if (inFs) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        } catch {
          /* ignore */
        }
        return;
      }

      try {
        const el = stage as HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();

        // Best-effort orientation lock — Android honors it, iOS rejects (silently fine).
        const orient = (screen as Screen & {
          orientation?: { lock?: (o: string) => Promise<void> };
        }).orientation;
        try {
          if (orient?.lock) await orient.lock("landscape");
        } catch {
          /* iOS will reject — that's expected */
        }
        ping();
      } catch (err) {
        console.warn("Native fullscreen failed:", err);
      }
      return;
    }

    // DESKTOP — UNCHANGED
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
        ref={stageRef}
        className={`vm-stage ${playing ? "" : "is-paused"} ${active ? "is-active" : ""} ${cssFullscreen ? "is-fs" : ""}`}
        onClick={(e) => { e.stopPropagation(); ping(); }}
        onMouseMove={ping}
        onMouseLeave={() => setActive(false)}
        onTouchEnd={ping}
      >
        <div className="vm-frame">
          <iframe
            ref={iframeRef}
            src={src}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title="Video"
          />
          <div
            className="vm-touch-layer"
            onClick={ping}
            onTouchEnd={ping}
            aria-hidden
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

          <button
            className="vm-btn vm-fs"
            onClick={requestFullscreen}
            aria-label={nativeFs || cssFullscreen ? "Exit fullscreen" : "Fullscreen"}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              {nativeFs || cssFullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
