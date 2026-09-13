import type { Metadata } from "next";
import Portfolio from "@/components/portfolio/Portfolio";
import { readPortfolio } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await readPortfolio();
  const title = [profile.name, profile.title].filter(Boolean).join(" | ") || "Portfolio";
  const description = profile.bio || profile.subtitle || undefined;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function HomePage() {
  return <Portfolio data={await readPortfolio()} />;
}
