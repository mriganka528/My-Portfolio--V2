"use client";
import { usePortfolioData } from "./provider";

export default function About() {
  const { data } = usePortfolioData();
  const { bio, bio2, philosophy, approach, focus } = data.profile;

  return (
    <section id="about" className="py-28 px-8 md:px-20 border-t relative" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div
        className="absolute right-0 top-0 bottom-0 w-px opacity-10"
        style={{ background: "linear-gradient(to bottom, transparent, var(--teal), transparent)" }}
      />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-12">
        <div className="pt-1">
          <p className="font-code text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--teal)" }}>{"// 01"}</p>
          <h2 className="font-head font-bold leading-none" style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}>ABOUT</h2>
        </div>
        <div>
          <p className="text-xl leading-relaxed mb-5" style={{ color: "var(--text)", fontWeight: 300 }}>
            {bio.split("—")[0]}
            {bio.includes("—") && (
              <>— <span style={{ color: "var(--teal)", fontStyle: "italic" }}>{bio.split("—").slice(1).join("—")}</span></>
            )}
          </p>
          <p className="leading-relaxed mb-5 text-[15px]" style={{ color: "#5a7a94", fontWeight: 300 }}>{bio2}</p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { sym: "⟨/⟩", label: "Philosophy", val: philosophy },
              { sym: "⚡",   label: "Approach",   val: approach },
              { sym: "◈",    label: "Focus",      val: focus },
            ].map((c) => (
              <div
                key={c.label}
                className="border p-5 transition-colors hover:border-teal-400/30"
                style={{ borderColor: "rgba(0,229,184,0.1)", background: "rgba(6,16,26,0.5)" }}
              >
                <div className="text-xl mb-3" style={{ color: "var(--teal)" }}>{c.sym}</div>
                <div className="font-code text-[9px] tracking-widest uppercase mb-1.5" style={{ color: "var(--dim)" }}>{c.label}</div>
                <div className="text-sm font-medium min-h-5">{c.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
