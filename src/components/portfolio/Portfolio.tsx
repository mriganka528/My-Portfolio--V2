"use client";
import { useState, useEffect } from "react";
import ParticleCanvas from "./ParticleCanvas";
import CustomCursor from "./CustomCursor";
import Hero from "./Hero";
import About from "./About";
import Skills from "./Skills";
import Projects from "./Projects";
import Contact from "./Contact";
import { PortfolioProvider, usePortfolioData, type PortfolioData } from "./provider";
import Reveal from "./Reveal";

const NAV_ITEMS = ["about", "skills", "projects", "contact"];

function LeftNav() {
  const { data: { profile } } = usePortfolioData();
  const [active, setActive] = useState("hero");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const ids = ["hero", ...NAV_ITEMS];
    const obs = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(id); },
        { threshold: 0.35 }
      );
      o.observe(el);
      return o;
    });
    return () => obs.forEach((o) => o?.disconnect());
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const d = document.documentElement;
      const total = d.scrollHeight - d.clientHeight;
      setScrollPct(total > 0 ? Math.min(100, Math.max(0, (d.scrollTop / total) * 100)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 w-14 flex flex-col items-center justify-between py-6 border-r"
      style={{ borderColor: "rgba(0,229,184,0.08)", background: "rgba(4,8,13,0.88)", backdropFilter: "blur(12px)" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "rgba(0,229,184,0.07)" }}>
        <div
          className="absolute left-0 top-0 w-full transition-all duration-150"
          style={{ height: `${scrollPct}%`, background: "var(--teal)", boxShadow: "0 0 8px var(--teal)" }}
        />
      </div>

      <button
        aria-label="Back to top"
        onClick={() => go("hero")}
        className="font-head font-bold text-xs tracking-widest"
        style={{ color: "var(--teal)", writingMode: "vertical-rl", textOrientation: "mixed" }}
        data-hover
      >
        {profile.brandMark || `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "⟨/⟩"}
      </button>

      <nav aria-label="Portfolio sections" className="flex flex-col items-center gap-6">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            aria-current={active === item ? "location" : undefined}
            onClick={() => go(item)}
            className="font-code text-[9px] tracking-widest uppercase transition-colors duration-200"
            style={{
              color: active === item ? "var(--teal)" : "var(--dim)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}
            data-hover
          >
            {item}
          </button>
        ))}
      </nav>

      <button
        onClick={() => go("contact")}
        className="font-code text-[8px] tracking-widest uppercase px-1 py-2 border transition-colors"
        style={{ color: "var(--teal)", borderColor: "rgba(0,229,184,0.3)", writingMode: "vertical-rl" }}
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
    <footer className="border-t py-7 px-8 md:px-20" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>
          <span style={{ color: "var(--teal)" }}>~/</span>portfolio · {new Date().getFullYear()}
        </span>
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>
          {profile.footerNote}
        </span>
        <button
          onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })}
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
  return (
    <PortfolioProvider data={data}>
    <div className="scanline min-h-screen bg-background text-foreground">
      <a href="#hero" className="skip-link font-code text-xs">Skip to content</a>
      <CustomCursor />
      <ParticleCanvas />
      <LeftNav />
      <main className="relative z-10 pl-14">
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
