// A stable colour per project, drawn from a small set of muted hues that share lightness and chroma,
// so a project is recognisable at a glance and none of them shouts.
const HUES = [28, 78, 128, 172, 214, 262, 310, 352] as const;

export function projectHue(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export const projectColor = (id: string): string => `oklch(0.78 0.09 ${projectHue(id)})`;
