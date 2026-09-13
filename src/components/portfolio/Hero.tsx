"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePortfolioData } from "./provider";

const STATIC_CMDS: Record<string, string[]> = {
  help:    ['whoami · about · stack · work · contact · clear'],
  clear:   [],
};

export default function Hero() {
  const { data } = usePortfolioData();
  const { profile } = data;

  const commands = useMemo<Record<string, string[]>>(() => ({
    ...STATIC_CMDS,
    whoami:  [[profile.name, profile.title].filter(Boolean).join(" — ") || "No profile published yet."],
    about:   [profile.bio, profile.bio2],
    stack:   [data.skills.slice(0, 8).map(s => s.name).join(" · ")],
    work:    data.projects.length ? data.projects.map(p => `${p.name}${p.stars ? ` ★${p.stars}` : ""}`) : ["No projects published yet."],
    contact: [[profile.email, profile.github, profile.twitter].filter(Boolean).join("  ·  ")],
  }), [profile, data.skills, data.projects]);

  type E = { cmd?: string; out: string[] };
  const [hist, setHist] = useState<E[]>([{ out: ['Portfolio · type "help" to explore'] }]);
  const [input, setInput] = useState("");
  const [prevCmds, setPrev] = useState<string[]>([]);
  const [pi, setPi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 9999 }); }, [hist]);

  const run = useCallback((raw: string) => {
    const c = raw.trim().toLowerCase();
    if (c === "clear") { setHist([]); if (c) setPrev(p => [c, ...p]); setPi(-1); return; }
    const out = Object.hasOwn(commands, c) ? commands[c] : (c ? [`unknown: ${c}. try "help"`] : []);
    setHist(p => [...p.slice(-99), { cmd: c || undefined, out }]);
    if (c) setPrev(p => [c, ...p].slice(0, 100));
    setPi(-1);
  }, [commands]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { run(input); setInput(""); }
    else if (e.key === "ArrowUp") { e.preventDefault(); const i = Math.min(pi + 1, prevCmds.length - 1); setPi(i); setInput(prevCmds[i] ?? ""); }
    else if (e.key === "ArrowDown") { e.preventDefault(); const i = Math.max(pi - 1, -1); setPi(i); setInput(i < 0 ? "" : prevCmds[i]); }
  };

  const marqueeItems = profile.marqueeItems.length ? profile.marqueeItems : [profile.title, ...profile.subtitle.split("·"), profile.location].map(value => value.trim()).filter(Boolean);

  return (
    <section id="hero" className="relative min-h-screen flex flex-col justify-center px-8 md:px-20 pt-8 grid-overlay overflow-hidden">
      {/* Ghost name background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden>
        <span className="font-head font-bold uppercase tracking-tighter opacity-[0.025] whitespace-nowrap"
          style={{ fontSize: "clamp(80px,18vw,220px)", color: "var(--teal)" }}>
          {profile.name.toUpperCase()}
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">
        {/* Left */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2.5 mb-10 px-4 py-1.5 border"
            style={{ borderColor: "rgba(0,229,184,0.25)", background: "rgba(0,229,184,0.05)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: profile.available ? "var(--teal)" : "var(--coral)" }} />
            <span className="font-code text-[10px] tracking-widest uppercase" style={{ color: profile.available ? "var(--teal)" : "var(--coral)" }}>
              {profile.name || profile.firstName ? [profile.available ? "Open to work" : "Not available", profile.location].filter(Boolean).join(" · ") : "Profile not published"}
            </span>
          </div>

          <h1 className="font-head font-bold leading-none tracking-tight mb-5" style={{ fontSize: profile.name || profile.firstName || profile.lastName ? "clamp(3.2rem,9vw,8.5rem)" : "clamp(2rem,5vw,5rem)" }}>
            <span className="block" style={{ color: "var(--text)" }}>{profile.firstName.toUpperCase() || (!profile.lastName ? (profile.name.toUpperCase() || "PORTFOLIO") : "")}</span>
            <span className="block glitch teal-text-glow" data-text={profile.lastName.toUpperCase()} style={{ color: "var(--teal)" }}>
              {profile.lastName.toUpperCase()}
            </span>
          </h1>

          {/* Marquee */}
          <div className="overflow-hidden border-y py-2.5 mb-8" style={{ borderColor: "rgba(0,229,184,0.12)" }}>
            <div className="marquee-inner inline-flex gap-12 font-code text-xs tracking-widest uppercase" style={{ color: "var(--dim)" }}>
              {[...marqueeItems, ...marqueeItems].map((t, i) => (
                <span key={i}>{t}<span className="mx-6 opacity-30">◆</span></span>
              ))}
            </div>
          </div>

          <p className="text-base leading-relaxed mb-10 max-w-lg" style={{ color: "#7a9ab5", fontWeight: 300 }}>
            {profile.bio || (!profile.name && !profile.firstName ? "Content will appear here once published." : "")}
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <a href="#projects" className="group inline-flex items-center gap-3 px-7 py-3.5 font-code text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
              style={{ background: "var(--teal)", color: "var(--bg)" }} data-hover>
              explore work <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </a>
            <a href="#contact" className="inline-flex items-center gap-3 px-7 py-3.5 font-code text-sm tracking-wide border transition-all"
              style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }} data-hover>
              get in touch
            </a>
          </div>

          <div className="grid grid-cols-2 gap-0 pt-8 border-t" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
            {[
              [profile.yearsExp, "years"],
              [profile.projectsShipped, "shipped"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-head text-2xl font-bold mb-0.5 min-h-8" style={{ color: "var(--teal)" }}>{v}</div>
                <div className="font-code text-[10px] tracking-widest uppercase" style={{ color: "var(--dim)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: terminal */}
        <div className="border teal-glow" style={{ borderColor: "rgba(0,229,184,0.18)", background: "rgba(4,8,13,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(0,229,184,0.1)", background: "rgba(6,16,26,0.8)" }}>
            <div className="flex gap-1.5">
              {["var(--coral)", "#f5c400", "var(--teal)"].map((c, i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span className="font-code text-[10px] ml-2" style={{ color: "var(--dim)" }}>
              bash · {profile.name.toLowerCase().replace(" ", "_")}@portfolio
            </span>
            <span className="ml-auto font-code text-[10px]" style={{ color: "var(--teal)" }}>● LIVE</span>
          </div>

          <div ref={bodyRef} className="h-64 overflow-y-auto p-4 space-y-1 cursor-text" onClick={() => inputRef.current?.focus()}>
            {hist.map((e, i) => (
              <div key={i} className="font-code text-[11px] leading-5">
                {e.cmd !== undefined && (
                  <div className="flex gap-2">
                    <span style={{ color: "var(--teal)" }}>❯</span>
                    <span style={{ color: "var(--text)" }}>{e.cmd}</span>
                  </div>
                )}
                {e.out.map((l, j) => (
                  <div key={j} className="pl-4" style={{ color: "var(--dim)" }}>{l}</div>
                ))}
              </div>
            ))}
            <div className="flex gap-2 items-center font-code text-[11px]">
              <span style={{ color: "var(--teal)" }}>❯</span>
              <input aria-label="Terminal command" maxLength={200} ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                className="flex-1 bg-transparent outline-none" spellCheck={false} autoComplete="off"
                style={{ color: "var(--text)", caretColor: "var(--teal)", fontFamily: "inherit", fontSize: "inherit" }} />
            </div>
          </div>

          <div className="px-4 py-2 border-t flex justify-between" style={{ borderColor: "rgba(0,229,184,0.08)", background: "rgba(6,16,26,0.6)" }}>
            <span className="font-code text-[9px]" style={{ color: "var(--dim)" }}>try: help · about · work</span>
            <span className="font-code text-[9px]" style={{ color: "var(--dim)" }}>↑ history</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
        <span className="font-code text-[9px] tracking-widest uppercase" style={{ color: "var(--teal)" }}>scroll</span>
        <div className="w-px h-10" style={{ background: "linear-gradient(to bottom, var(--teal), transparent)" }} />
      </div>
    </section>
  );
}
