"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-5">
    <h1 className="font-head text-3xl font-bold text-[var(--teal)]">Temporarily unavailable</h1>
    <p className="font-code text-xs text-[var(--dim)]">Please try again in a moment.</p>
    <button onClick={reset} className="font-code text-xs border border-teal-400/30 px-5 py-3">try again →</button>
  </main>;
}
