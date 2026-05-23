"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import VideoModal from "./VideoModal";

type Props = {
  thumbnails: Record<string, string | null>;
};

const PlayIcon = () => (
  <span className="play-overlay" aria-hidden>
    <svg viewBox="0 0 24 24" width="28" height="28">
      <path d="M7 5v14l12-7L7 5z" fill="currentColor" />
    </svg>
  </span>
);

export default function Portfolio({ thumbnails }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"work" | "contact">("work");
  const [navHidden, setNavHidden] = useState(false);
  const open = (id: string) => () => setActiveVideo(id);
  const thumb = (id: string, fallback: string) => thumbnails[id] || fallback;

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
            {/* ROW 1 (featured, full-width): Toyota — If */}
            <div className="row is-full">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "1.65%", top: "2.22%", width: "96.7%", height: "88%" }}
                onClick={open("291694491")}
                aria-label="Play Toyota — If"
              >
                <img src={thumb("291694491", "/images/Heinken.png")} alt="Toyota — If" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "1.65%", top: "92%", width: "96.7%" }}>
                <span className="client">Toyota</span>
                <span className="ttl">If</span>
              </div>
            </div>

            {/* ROW 2: Heineken / McDonald's */}
            <div className="row">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "1.65%", top: "30.97%", width: "62.35%", height: "57.50%" }}
                onClick={open("803985634")}
                aria-label="Play Heineken — The Cleaners"
              >
                <img src={thumb("803985634", "/images/Heinken.png")} alt="Heineken — The Cleaners" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "1.87%", top: "89.86%", width: "62.35%" }}>
                <span className="client">Heineken</span>
                <span className="ttl">The Cleaners</span>
              </div>

              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "66.39%", top: "2.22%", width: "33.50%", height: "89.03%" }}
                onClick={open("1131470962")}
                aria-label="Play Diriyah FC — Underdogs"
              >
                <img src={thumb("1131470962", "/images/Mcdonald%E2%80%99s.png")} alt="Diriyah FC — Underdogs" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "66.39%", top: "92.64%", width: "33.50%" }}>
                <span className="client">Diriyah FC</span>
                <span className="ttl">Underdogs</span>
              </div>
            </div>

            {/* ROW 3: Denner / Du */}
            <div className="row">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "1.65%", top: "2.22%", width: "39.63%", height: "58.89%" }}
                onClick={open("1009764873")}
                aria-label="Play Denner — The Good Life"
              >
                <img src={thumb("1009764873", "/images/Denner.png")} alt="Denner — The Good Life" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "1.65%", top: "62.64%", width: "39.63%" }}>
                <span className="client">Denner</span>
                <span className="ttl">The Good Life (DC)</span>
              </div>

              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "43.14%", top: "7.36%", width: "56.82%", height: "84.44%" }}
                onClick={open("216957056")}
                aria-label="Play Du — The Men Sitting Next To You"
              >
                <img src={thumb("216957056", "/images/DU.png")} alt="Du — The Men Sitting Next To You" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "43.14%", top: "92.22%", width: "56.82%" }}>
                <span className="client">Du</span>
                <span className="ttl">The Men Sitting Next To You</span>
              </div>
            </div>

            {/* ROW 4 (featured, full-width): Du — Too Distressing */}
            <div className="row is-full">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "1.65%", top: "2.22%", width: "96.7%", height: "88%" }}
                onClick={open("121774920")}
                aria-label="Play Du — Too Distressing"
              >
                <img src={thumb("121774920", "/images/DU.png")} alt="Du — Too Distressing" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "1.65%", top: "92%", width: "96.7%" }}>
                <span className="client">Du</span>
                <span className="ttl">Too Distressing</span>
              </div>
            </div>

            {/* ROW 5: L'Occitane / Molto Fino */}
            <div className="row">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "1.65%", top: "2.22%", width: "33.36%", height: "89.03%" }}
                onClick={open("898044833")}
                aria-label="Play L'Occitane"
              >
                <img src={thumb("898044833", "/images/L%E2%80%99OCCITANE.png")} alt="L&apos;Occitane" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "1.65%", top: "92.64%", width: "33.36%" }}>
                <span className="client">L&apos;Occitane</span>
              </div>

              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "36.49%", top: "28.06%", width: "63.55%", height: "63.33%" }}
                onClick={open("682546048")}
                aria-label="Play Molto Fino — Feeds A Village"
              >
                <img src={thumb("682546048", "/images/MOLTO%20FINO.png")} alt="Molto Fino — Feeds A Village" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "36.49%", top: "92.64%", width: "63.55%" }}>
                <span className="client">Molto Fino</span>
                <span className="ttl">Feeds A Village</span>
              </div>
            </div>

            {/* ROW 6: Jeep / Rolling Stone */}
            <div className="row">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "2.17%", top: "5.69%", width: "56.82%", height: "63.75%" }}
                onClick={open("695205162")}
                aria-label="Play Jeep — Rewild Yourself"
              >
                <img src={thumb("695205162", "/images/LAVAZZA.png")} alt="Jeep — Rewild Yourself" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "2.17%", top: "70.83%", width: "56.82%" }}>
                <span className="client">Jeep</span>
                <span className="ttl">Rewild Yourself</span>
              </div>

              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "61.23%", top: "39.86%", width: "38.66%", height: "47.22%" }}
                onClick={open("573367624")}
                aria-label="Play Rolling Stone — Rockin' Mamas"
              >
                <img src={thumb("573367624", "/images/ROLLING%20STONE.png")} alt="Rolling Stone — Rockin&apos; Mamas" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "61.23%", top: "88.47%", width: "38.66%" }}>
                <span className="client">Rolling Stone</span>
                <span className="ttl">Rockin&apos; Mamas</span>
              </div>
            </div>

            {/* ROW 7: Diesel / Hardees */}
            <div className="row">
              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "2.17%", top: "17.08%", width: "63.55%", height: "63.33%" }}
                onClick={open("316674560")}
                aria-label="Play Diesel — Be A Follower"
              >
                <img src={thumb("316674560", "/images/DIESEL.png")} alt="Diesel — Be A Follower" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "2.17%", top: "81.81%", width: "63.55%" }}>
                <span className="client">Diesel</span>
                <span className="ttl">Be A Follower</span>
              </div>

              <button
                type="button"
                className="tile-media is-video"
                style={{ left: "67.81%", top: "2.22%", width: "32.09%", height: "89.03%" }}
                onClick={open("223460819")}
                aria-label="Play Fischer — The Naked Truth"
              >
                <img src={thumb("223460819", "/images/Hardees.png")} alt="Fischer — The Naked Truth" />
                <PlayIcon />
              </button>
              <div className="tile-label" style={{ left: "67.81%", top: "92.64%", width: "32.09%" }}>
                <span className="client">Fischer</span>
                <span className="ttl">The Naked Truth</span>
              </div>
            </div>
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
          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "2.014" }}
              onClick={open("803985634")}
              aria-label="Play Heineken — The Cleaners"
            >
              <img src={thumb("803985634", "/images/Heinken.png")} alt="Heineken — The Cleaners" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Heineken</span>
              <span className="ttl">The Cleaners</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "0.699" }}
              onClick={open("1131470962")}
              aria-label="Play Diriyah FC — Underdogs"
            >
              <img src={thumb("1131470962", "/images/Mcdonald%E2%80%99s.png")} alt="Diriyah FC — Underdogs" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Diriyah FC</span>
              <span className="ttl">Underdogs</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.250" }}
              onClick={open("1009764873")}
              aria-label="Play Denner — The Good Life"
            >
              <img src={thumb("1009764873", "/images/Denner.png")} alt="Denner — The Good Life" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Denner</span>
              <span className="ttl">The Good Life (DC)</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.250" }}
              onClick={open("216957056")}
              aria-label="Play Du — The Men Sitting Next To You"
            >
              <img src={thumb("216957056", "/images/DU.png")} alt="Du — The Men Sitting Next To You" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Du</span>
              <span className="ttl">The Men Sitting Next To You</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "0.695" }}
              onClick={open("898044833")}
              aria-label="Play L'Occitane"
            >
              <img src={thumb("898044833", "/images/L%E2%80%99OCCITANE.png")} alt="L&apos;Occitane" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">L&apos;Occitane</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.865" }}
              onClick={open("682546048")}
              aria-label="Play Molto Fino — Feeds A Village"
            >
              <img src={thumb("682546048", "/images/MOLTO%20FINO.png")} alt="Molto Fino — Feeds A Village" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Molto Fino</span>
              <span className="ttl">Feeds A Village</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.655" }}
              onClick={open("695205162")}
              aria-label="Play Jeep — Rewild Yourself"
            >
              <img src={thumb("695205162", "/images/LAVAZZA.png")} alt="Jeep — Rewild Yourself" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Jeep</span>
              <span className="ttl">Rewild Yourself</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.519" }}
              onClick={open("573367624")}
              aria-label="Play Rolling Stone — Rockin' Mamas"
            >
              <img src={thumb("573367624", "/images/ROLLING%20STONE.png")} alt="Rolling Stone — Rockin&apos; Mamas" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Rolling Stone</span>
              <span className="ttl">Rockin&apos; Mamas</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "1.865" }}
              onClick={open("316674560")}
              aria-label="Play Diesel — Be A Follower"
            >
              <img src={thumb("316674560", "/images/DIESEL.png")} alt="Diesel — Be A Follower" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Diesel</span>
              <span className="ttl">Be A Follower</span>
            </div>
          </div>

          <div className="tile">
            <button
              type="button"
              className="tile-media is-video"
              style={{ aspectRatio: "0.670" }}
              onClick={open("223460819")}
              aria-label="Play Fischer — The Naked Truth"
            >
              <img src={thumb("223460819", "/images/Hardees.png")} alt="Fischer — The Naked Truth" />
              <PlayIcon />
            </button>
            <div className="tile-label">
              <span className="client">Fischer</span>
              <span className="ttl">The Naked Truth</span>
            </div>
          </div>
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
