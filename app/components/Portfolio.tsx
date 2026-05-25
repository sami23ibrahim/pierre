"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useState } from "react";
import VideoModal from "./VideoModal";
import { slotForIndex, layoutRows } from "@/lib/layout";
import type { VideoWithThumbnail } from "@/lib/videos";

type Props = {
  videos: VideoWithThumbnail[];
};

function captionFor(v: VideoWithThumbnail): string {
  return v.title ? `${v.client} — ${v.title}` : v.client;
}

const PlayIcon = () => (
  <span className="play-overlay" aria-hidden>
    <svg viewBox="0 0 24 24" width="28" height="28">
      <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
    </svg>
  </span>
);

export default function Portfolio({ videos }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"work" | "contact">("work");
  const [navHidden, setNavHidden] = useState(false);
  const open = (id: string) => () => setActiveVideo(id);

  // Mobile: hide the floating nav when scrolling down, reveal it when scrolling
  // up. Near the top of the page the nav stays visible regardless of direction.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 80) setNavHidden(false);
        else if (delta > 4) setNavHidden(true);
        else if (delta < -4) setNavHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll(
      ".tile-media, .tile-label, .contact h2, .agencies-stack, .agencies"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll-spy for the nav underline. Watches both contact sections — only the
  // one visible in the current layout will ever report intersecting (the other
  // is display:none, so its bounding rect is empty).
  useEffect(() => {
    const desktopContact = document.getElementById("contact");
    const mobileContact = document.getElementById("contact-m");
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.some((e) => e.isIntersecting);
        setActiveSection(inView ? "contact" : "work");
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 }
    );
    if (desktopContact) observer.observe(desktopContact);
    if (mobileContact) observer.observe(mobileContact);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setActiveSection("work");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* ===================== DESKTOP ===================== */}
      <div className="layout layout-desktop">
        <nav className="nav">
          <a href="#contact" className={activeSection === "contact" ? "active" : ""}>Contact</a>
          <a href="#work" className={activeSection === "work" ? "active" : ""} onClick={scrollToTop}>Work</a>
        </nav>
        <div className="canvas">
          <header className="hero">
            <div className="hero-text">
              <h1>
                <span className="line"><span>Pierre</span></span>
                <span className="line"><span>Mouarkech</span></span>
              </h1>
              <p className="role">director of photography</p>
            </div>
          </header>

          <section id="work">
            {(() => {
              const rows = layoutRows(videos);
              let videoIndex = 0;
              return rows.map((row, rowIndex) => {
                const rowClass = row.kind === "featured" ? "row is-full" : "row";
                return (
                  <div className={rowClass} key={rowIndex}>
                    {row.items.map((v) => {
                      const slot = slotForIndex(videoIndex);
                      videoIndex += 1;
                      const caption = captionFor(v);
                      return (
                        <Fragment key={v.id}>
                          <button
                            type="button"
                            className="tile-media is-video"
                            style={slot.desktop.media}
                            onClick={open(v.vimeoId)}
                            aria-label={`Play ${caption}`}
                          >
                            {v.thumbnail && <img src={v.thumbnail} alt={caption} />}
                            <PlayIcon />
                          </button>
                          <div className="tile-label" style={slot.desktop.label}>
                            <span className="client">{v.client}</span>
                            {v.title && <span className="ttl">{v.title}</span>}
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </section>

          <section id="contact" className="contact">
            <h2>
              <span className="line"><span>Get in</span></span>
              <span className="line"><span>touch</span></span>
            </h2>
            <div className="portrait">
              <img src="/images/Contact%20portrait.png" alt="Pierre Mouarkech" />
            </div>

            <div className="agencies-stack">
              <div className="agency">
                <span className="region">Middle East</span>
                <a href="mailto:contact@pierremouarkech.com">Contact@pierremouarkech.com</a>
              </div>
              <div className="agency">
                <span className="region">Switzerland . France . Spain</span>
                <a href="mailto:hey@stunning-artists.com">hey@stunning-artists.com</a>
                <span className="phone">+41 44 620 04 48</span>
              </div>
              <div className="agency">
                <span className="region">Berlin</span>
                <a href="mailto:berlin@trinityagency.de">berlin@trinityagency.de</a>
                <span className="phone">+49 30 212 326 08</span>
              </div>
              <div className="agency">
                <span className="region">Hamburg</span>
                <a href="mailto:hamburg@trinityagency.de">hamburg@trinityagency.de</a>
                <span className="phone">+49 40 6365 2128</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="foot">
          <span>© Pierre Mouarkech</span>
          <span>Director of Photography · Since 2005</span>
        </footer>
      </div>

      {/* ===================== MOBILE ===================== */}
      <div className="layout layout-mobile">
        <nav className={`nav ${navHidden ? "is-hidden" : ""}`}>
          <a href="#contact-m" className={activeSection === "contact" ? "active" : ""}>Contact</a>
          <a href="#work-m" className={activeSection === "work" ? "active" : ""} onClick={scrollToTop}>Work</a>
        </nav>

        <header className="hero">
          <div className="hero-text">
            <h1>
              <span className="line"><span>Pierre</span></span>
              <span className="line"><span>Mouarkech</span></span>
            </h1>
            <p className="role">Director of Photography</p>
          </div>
        </header>

        <section id="work-m">
          {videos.map((v, index) => {
            const slot = slotForIndex(index);
            const caption = captionFor(v);
            return (
              <div className="tile" key={v.id}>
                <button
                  type="button"
                  className="tile-media is-video"
                  style={{ aspectRatio: slot.mobile.aspectRatio }}
                  onClick={open(v.vimeoId)}
                  aria-label={`Play ${caption}`}
                >
                  {v.thumbnail && <img src={v.thumbnail} alt={caption} />}
                  <PlayIcon />
                </button>
                <div className="tile-label">
                  <span className="client">{v.client}</span>
                  {v.title && <span className="ttl">{v.title}</span>}
                </div>
              </div>
            );
          })}
        </section>

        <section id="contact-m" className="contact">
          <h2>
            <span className="line"><span>Get in</span></span>
            <span className="line"><span>Touch</span></span>
          </h2>
          <div className="agencies">
            <div className="agency">
              <span className="region">Middle East</span>
              <a href="mailto:contact@pierremouarkech.com">contact@pierremouarkech.com</a>
            </div>
            <div className="agency">
              <span className="region">Switzerland . France . Spain</span>
              <a href="mailto:hey@stunning-artists.com">hey@stunning-artists.com</a>
              <span className="phone">+41 44 620 04 48</span>
            </div>
            <div className="agency">
              <span className="region">Berlin</span>
              <a href="mailto:berlin@trinityagency.de">berlin@trinityagency.de</a>
              <span className="phone">+49 30 212 326 08</span>
            </div>
            <div className="agency">
              <span className="region">Hamburg</span>
              <a href="mailto:hamburg@trinityagency.de">hamburg@trinityagency.de</a>
              <span className="phone">+49 40 6365 2128</span>
            </div>
          </div>
          <div className="portrait">
            <img src="/images/Contact%20portrait.png" alt="Pierre Mouarkech" />
          </div>
        </section>

        <footer className="foot">
          <span>© Pierre Mouarkech</span>
          <span>Director of Photography · Since 2005</span>
        </footer>
      </div>

      <VideoModal videoId={activeVideo} onClose={() => setActiveVideo(null)} />
    </>
  );
}
