import Link from "next/link";

export default function NotFound() {
  return <main className="min-h-screen flex flex-col items-center justify-center gap-5">
    <h1 className="font-head font-bold text-6xl text-[var(--teal)]">404</h1>
    <p className="font-code text-xs text-[var(--dim)]">Page not found.</p>
    <Link href="/" className="font-code text-xs border border-teal-400/30 px-5 py-3">back to portfolio →</Link>
  </main>;
}
