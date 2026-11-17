import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Startup funding announcements from the last few days of news.
 *
 * Headlines come from Google News' public RSS search (TechCrunch, Crunchbase
 * News and VentureBeat block automated readers). Claude reads each headline
 * and decides whether it's a startup raising a round — rejecting VC funds
 * closing, acquisitions, IPOs and the rest — and pulls out the company,
 * round, amount and investors.
 */

const QUERIES = [
  '"raises" "Series A"',
  '"raises" "Series B"',
  '"raises" "Series C"',
  '"raises" "seed round"',
  '"funding round" startup raises',
];

export type Headline = { title: string; link: string; publishedAt: Date | null; publisher: string | null };

export type FundingRound = {
  headline: Headline;
  company: string;
  amountM: number | null;
  round: string;
  investors: string[];
  /** Country the company is based in, when the headline/snippet says. */
  country: string | null;
};

function feedUrl(q: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:3d`)}&hl=en-US&gl=US&ceid=US:en`;
}

export async function fetchFundingHeadlines(): Promise<Headline[]> {
  const parser = new Parser({ timeout: 15_000 });
  const seen = new Set<string>();
  const out: Headline[] = [];
  for (const q of QUERIES) {
    let feed;
    try {
      feed = await parser.parseURL(feedUrl(q));
    } catch {
      continue;
    }
    for (const item of feed.items ?? []) {
      // Google News titles are "Headline - Publisher".
      const raw = (item.title ?? "").trim();
      const cut = raw.lastIndexOf(" - ");
      const title = cut > 0 ? raw.slice(0, cut) : raw;
      const publisher = cut > 0 ? raw.slice(cut + 3) : null;
      const key = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!title || !item.link || seen.has(key)) continue;
      seen.add(key);
      out.push({ title, link: item.link, publishedAt: item.isoDate ? new Date(item.isoDate) : null, publisher });
    }
  }
  return out;
}

/** One entry per company: many outlets cover the same raise. Keep the most complete. */
function dedupe(rounds: FundingRound[]): FundingRound[] {
  const best = new Map<string, FundingRound>();
  const score = (f: FundingRound) => (f.amountM != null ? 2 : 0) + f.investors.length + (f.round !== "Funding round" ? 1 : 0);
  for (const f of rounds) {
    const key = f.company.toLowerCase().replace(/\b(?:ai|inc|labs?|technologies)\b/g, "").replace(/[^a-z0-9]/g, "");
    const cur = best.get(key);
    if (!cur || score(f) > score(cur)) best.set(key, f);
  }
  return [...best.values()];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "isStartupRound", "company", "amountM", "round", "investors", "country"],
        properties: {
          index: { type: "integer" },
          isStartupRound: { type: "boolean" },
          company: { type: ["string", "null"] },
          amountM: { type: ["number", "null"] },
          round: { type: ["string", "null"] },
          investors: { type: "array", items: { type: "string" } },
          country: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = `You read news headlines and pick out startups raising a new venture round.

For each numbered headline, decide isStartupRound: true only when an operating company (a startup) is raising a new equity round — seed, Series A/B/C/D, growth. It is false for: a venture firm or fund closing or raising its own fund; acquisitions or mergers; IPOs, SPACs or listings; debt-only facilities; grants; valuation reports with no new round; roundups covering many companies; anything not about funding.

When true, give:
- company: the company's name only, exactly as written ("Nebuly", not "AI startup Nebuly" or "Nebuly's").
- amountM: the round size in millions of US dollars (convert $1.2B to 1200; null if not stated).
- round: "Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D+" or "Growth".
- investors: investment firms named as leading or joining the round; [] if none.
- country: where the company is based if the headline or publisher makes it clear, else null.

When false, set company, amountM, round and country to null and investors to [].
Return one item per headline, using its number as index.`;

let client: Anthropic | null = null;

/** Read headlines in batches; return the ones that are startup funding rounds. */
export async function extractRounds(headlines: Headline[]): Promise<FundingRound[]> {
  if (headlines.length === 0) return [];
  client ??= new Anthropic();
  const out: FundingRound[] = [];

  for (let i = 0; i < headlines.length; i += 40) {
    const batch = headlines.slice(i, i + 40);
    const list = batch.map((h, n) => `${n}. ${h.title}${h.publisher ? ` (${h.publisher})` : ""}`).join("\n");
    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: INSTRUCTIONS,
        messages: [{ role: "user", content: list }],
      });
    } catch (err) {
      console.error("funding extraction failed", err instanceof Anthropic.APIError ? err.status : err);
      continue;
    }
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") continue;
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") continue;

    let parsed: { items: { index: number; isStartupRound: boolean; company: string | null; amountM: number | null; round: string | null; investors: string[]; country: string | null }[] };
    try {
      parsed = JSON.parse(text.text);
    } catch {
      continue;
    }
    for (const it of parsed.items) {
      const h = batch[it.index];
      if (!h || !it.isStartupRound || !it.company) continue;
      out.push({
        headline: h,
        company: it.company.trim(),
        amountM: it.amountM,
        round: it.round ?? "Funding round",
        investors: it.investors.slice(0, 6),
        country: it.country,
      });
    }
  }
  return dedupe(out);
}
