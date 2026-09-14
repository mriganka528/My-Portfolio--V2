"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useMediaQuery } from "../useMediaQuery";
import Hero from "./Hero";
import About from "./About";
import Skills from "./Skills";
import Projects from "./Projects";
import Contact from "./Contact";
import { PortfolioProvider, usePortfolioData, type PortfolioData } from "./provider";
import Reveal from "./Reveal";

const NAV_ITEMS = ["about", "skills", "projects", "contact"];
const DesktopEffects = dynamic(() => import("./DesktopEffects"), { ssr: false });

function goToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

function LeftNav() {
  const { data: { profile } } = usePortfolioData();
  const [active, setActive] = useState("hero");
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    for (const id of ["hero", ...NAV_ITEMS]) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const d = document.documentElement;
      const total = d.scrollHeight - d.clientHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, d.scrollTop / total)) : 0;
      progressRef.current?.style.setProperty("--scroll-progress", String(progress));
    };
    // Keep scroll updates out of React and change only a composited transform.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const resize = new ResizeObserver(onScroll);
    resize.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <aside
      className="portfolio-nav"
    >
      <div className="portfolio-scroll-track" aria-hidden="true">
        <div ref={progressRef} className="portfolio-scroll-progress" />
      </div>

      <button
        aria-label="Back to top"
        onClick={() => goToSection("hero")}
        className="portfolio-brand font-head font-bold"
        data-hover
      >
        {profile.brandMark || `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "⟨/⟩"}
      </button>

      <nav aria-label="Portfolio sections" className="portfolio-nav-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            aria-current={active === item ? "location" : undefined}
            onClick={() => goToSection(item)}
            className="font-code uppercase"
            data-hover
          >
            <span className="portfolio-nav-label">{item}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={() => goToSection("contact")}
        className="portfolio-hire font-code uppercase"
        data-hover
      >
        hire me
      </button>
    </aside>
  );
}

function Footer() {
  const { data: { profile } } = usePortfolioData();
  return (
    <footer className="portfolio-footer border-t py-7 px-8 md:px-20" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>
          <span style={{ color: "var(--teal)" }}>~/</span>portfolio · {new Date().getFullYear()}
        </span>
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>
          {profile.footerNote}
        </span>
        <button
          onClick={() => goToSection("hero")}
          className="font-code text-[10px] transition-colors hover:text-teal-400"
          style={{ color: "var(--dim)" }}
          data-hover
        >
          back to top ↑
        </button>
      </div>
    </footer>
  );
}

export default function Portfolio({ data }: { data: PortfolioData }) {
  const desktopEffects = useMediaQuery("(min-width: 1024px) and (pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
  return (
    <PortfolioProvider data={data}>
    <div className="portfolio-page scanline min-h-screen bg-background text-foreground">
      <a href="#hero" className="skip-link font-code text-xs">Skip to content</a>
      {desktopEffects && <DesktopEffects />}
      <LeftNav />
      <main className="portfolio-main relative z-10">
        <Hero />
        <Reveal><About /></Reveal>
        <Skills />
        <Reveal><Projects /></Reveal>
        <Reveal><Contact /></Reveal>
        <Footer />
      </main>
    </div>
    </PortfolioProvider>
  );
}
