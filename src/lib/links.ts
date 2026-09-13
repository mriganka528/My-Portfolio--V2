export function externalUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function socialUrl(value: string, provider?: string) {
  if (provider === "twitter" && /^@[\w]{1,30}$/.test(value)) return `https://x.com/${value.slice(1)}`;
  return externalUrl(value);
}

export function accentColor(value: string) {
  const colors: Record<string, string> = {
    "var(--teal)": "#00e5b8", "var(--violet)": "#7c3fff",
    "var(--coral)": "#ff4d6d", "var(--lime)": "#c8ff00"
  };
  return colors[value] ?? value;
}
