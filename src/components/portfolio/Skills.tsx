"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { usePortfolioData, type Skill } from "./provider";
import { accentColor } from "@/lib/links";

const CAT_COLORS: Record<string, string> = {
  Language: "var(--teal)",
  Frontend:  "#00d4ff",
  Backend:   "var(--violet)",
  DevOps:    "#f5c400",
  Cloud:     "#ff9900",
  Database:  "var(--coral)",
  Infra:     "#b060ff",
  Tool:      "#7a9ab5",
};

function useReveal(ref: React.RefObject<Element | null>) {
  return useInView(ref, { once: true, amount: 0.08 });
}

function SkillCard({ skill, delay }: { skill: Skill; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const vis = useReveal(ref);
  const col = accentColor(CAT_COLORS[skill.category] ?? "var(--teal)");
  const iconUrl = `https://cdn.simpleicons.org/${skill.slug}/ffffff`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={vis ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.65, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      className="group border flex flex-col items-center gap-3 p-4 transition-colors duration-200"
      style={{
        borderColor: "rgba(0,229,184,0.1)",
        background: "rgba(6,16,26,0.7)",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${col}50`;
        (e.currentTarget as HTMLElement).style.background = `${col}08`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,184,0.1)";
        (e.currentTarget as HTMLElement).style.background = "rgba(6,16,26,0.7)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Logo */}
      <div className="w-9 h-9 flex items-center justify-center">
        {skill.slug && <img
          src={iconUrl}
          alt={skill.name}
          className="w-8 h-8 object-contain"
          style={{ filter: `drop-shadow(0 0 6px ${col}60)`, opacity: 0.85, transition: "opacity 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.85"; }}
          onError={(e) => {
            // Fallback: show initials if icon fails to load
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />}
        {/* Fallback initials */}
        <span
          className={`${skill.slug ? "hidden" : "flex"} w-8 h-8 items-center justify-center font-head font-bold text-sm`}
          style={{ color: col }}
        >
          {skill.name.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Name */}
      <span className="font-code text-[10px] text-center leading-tight break-words max-w-full" style={{ color: "#8892b0" }}>
        {skill.name}
      </span>

      {/* Level bar */}
      <div className="w-full">
        <div className="flex justify-between mb-1">
          <span className="font-code text-[8px]" style={{ color: "var(--dim)" }}>
            {skill.category}
          </span>
          <span className="font-code text-[8px]" style={{ color: col }}>
            {skill.level}%
          </span>
        </div>
        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full transition-all duration-700 delay-300"
            style={{ width: vis ? `${skill.level}%` : "0%", background: col, boxShadow: `0 0 6px ${col}` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Skills() {
  const { data } = usePortfolioData();
  const secRef = useRef<HTMLDivElement>(null);
  const vis = useReveal(secRef);

  const categories = [...new Set(data.skills.map((s) => s.category).filter(Boolean))];

  return (
    <section id="skills" className="py-28 px-8 md:px-20 border-t relative" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(124,63,255,0.04) 0%, transparent 70%)" }}
      />

      <div ref={secRef} className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="font-code text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--teal)" }}>
              {"// 02 · capabilities"}
            </p>
            <h2 className="font-head font-bold leading-none" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>SKILLS</h2>
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1.5 font-code text-[9px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[cat] ?? "var(--teal)" }} />
                <span style={{ color: "var(--dim)" }}>{cat}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Skill grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-16">
          {data.skills.map((skill, i) => (
            <SkillCard key={skill.id} skill={skill} delay={i * 35} />
          ))}
        </div>

        {!data.skills.length && <p className="empty-state">No skills published yet.</p>}

        {/* Experience timeline */}
        {data.profile.showExperience && <div className="border-t pt-12" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <p className="font-code text-[9px] tracking-widest uppercase mb-8" style={{ color: "var(--dim)" }}>
            work history
          </p>
          {data.experience.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 32 }} animate={vis ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
              transition={{ duration: 0.65, delay: 0.3 + i * 0.08 }}
              className="experience-row grid grid-cols-[100px_1fr_auto] gap-6 py-5 border-b -mx-4 px-4 transition-colors hover:bg-teal-400/[0.02]"
              style={{ borderColor: "rgba(0,229,184,0.07)" }}
            >
              <span className="font-code text-[10px] pt-0.5" style={{ color: "var(--dim)" }}>{e.period}</span>
              <div>
                <div className="text-sm font-medium mb-0.5">{e.role}</div>
                <div className="font-code text-[10px]" style={{ color: "var(--dim)" }}>{e.note}</div>
              </div>
              <div className="font-head font-bold text-right self-center" style={{ color: "var(--teal)", fontSize: "0.95rem" }}>
                {e.company}
              </div>
            </motion.div>
          ))}
          {!data.experience.length && <p className="empty-state">No work history published yet.</p>}
        </div>}
      </div>
    </section>
  );
}
