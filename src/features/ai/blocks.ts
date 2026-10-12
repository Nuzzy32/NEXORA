export type Block = { kind: "text"; text: string } | { kind: "code"; lang: string; code: string };

/** Splits message text into prose and fenced ``` code blocks. An unclosed fence stays plain text. */
export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const fence = /```([\w+#.-]*)[^\S\n]*\n([\s\S]*?)\n?```/g;
  let last = 0;
  for (const m of content.matchAll(fence)) {
    const before = content.slice(last, m.index).trim();
    if (before) blocks.push({ kind: "text", text: before });
    blocks.push({ kind: "code", lang: m[1], code: m[2] });
    last = m.index + m[0].length;
  }
  const rest = content.slice(last).trim();
  if (rest) blocks.push({ kind: "text", text: rest });
  return blocks;
}
