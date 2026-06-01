/**
 * Very lightweight markdown renderer — no external deps.
 * Handles headings, bold, italic, bullet lists, numbered lists, paragraphs, and links.
 * Sufficient for company insight body content.
 */

function renderInline(text: string): string {
  return text
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // inline code
    .replace(/`(.+?)`/g, '<code class="text-xs bg-muted px-1 py-0.5 rounded font-mono">$1</code>')
    // links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground transition-colors">$1</a>');
}

function parseMarkdown(md: string, prose = false): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  const p = prose;

  function closeList() {
    if (inList) {
      html.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") { closeList(); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { closeList(); html.push(`<hr class="border-border my-8" />`); continue; }

    // Headings
    if (/^### /.test(line)) { closeList(); html.push(`<h3 class="${p ? "font-heading font-bold text-lg mt-8 mb-2" : "font-semibold text-sm mt-5 mb-1"}">${renderInline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line))  { closeList(); html.push(`<h2 class="${p ? "font-heading font-bold text-2xl mt-10 mb-3" : "font-semibold text-base mt-6 mb-2"}">${renderInline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line))   { closeList(); html.push(`<h1 class="${p ? "font-heading font-bold text-3xl mt-8 mb-4" : "font-bold text-lg mt-6 mb-2"}">${renderInline(line.slice(2))}</h1>`); continue; }

    // Unordered list
    const ulMatch = line.match(/^[-*] (.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        html.push(`<ul class="${p ? "list-disc pl-6 space-y-2 my-4" : "list-disc pl-4 space-y-1 my-2"}">`);
        inList = true; listType = "ul";
      }
      html.push(`<li class="${p ? "text-base leading-relaxed" : "text-sm leading-relaxed"}">${renderInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        html.push(`<ol class="${p ? "list-decimal pl-6 space-y-2 my-4" : "list-decimal pl-4 space-y-1 my-2"}">`);
        inList = true; listType = "ol";
      }
      html.push(`<li class="${p ? "text-base leading-relaxed" : "text-sm leading-relaxed"}">${renderInline(olMatch[1])}</li>`);
      continue;
    }

    // Default: paragraph
    closeList();
    html.push(`<p class="${p ? "text-base leading-[1.8] text-foreground/80" : "text-sm leading-relaxed text-muted-foreground"}">${renderInline(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

export function MarkdownBody({ markdown, className = "", prose = false }: { markdown: string; className?: string; prose?: boolean }) {
  return (
    <div
      className={`${prose ? "space-y-4" : "space-y-2"} ${className}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown, prose) }}
    />
  );
}
