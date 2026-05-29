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

function parseMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  function closeList() {
    if (inList) {
      html.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // Headings
    if (/^### /.test(line)) { closeList(); html.push(`<h3 class="font-semibold text-sm mt-5 mb-1">${renderInline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line))  { closeList(); html.push(`<h2 class="font-semibold text-base mt-6 mb-2">${renderInline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line))   { closeList(); html.push(`<h1 class="font-bold text-lg mt-6 mb-2">${renderInline(line.slice(2))}</h1>`); continue; }

    // Unordered list
    const ulMatch = line.match(/^[-*] (.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        html.push('<ul class="list-disc pl-4 space-y-1 my-2">');
        inList = true;
        listType = "ul";
      }
      html.push(`<li class="text-sm leading-relaxed">${renderInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        html.push('<ol class="list-decimal pl-4 space-y-1 my-2">');
        inList = true;
        listType = "ol";
      }
      html.push(`<li class="text-sm leading-relaxed">${renderInline(olMatch[1])}</li>`);
      continue;
    }

    // Default: paragraph
    closeList();
    html.push(`<p class="text-sm leading-relaxed text-muted-foreground">${renderInline(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

export function MarkdownBody({ markdown, className = "" }: { markdown: string; className?: string }) {
  return (
    <div
      className={`space-y-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown) }}
    />
  );
}
