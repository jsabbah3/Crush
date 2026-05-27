"use client";

import { useState, useTransition } from "react";
import { Plus, Check, ChevronDown } from "lucide-react";
import { addTrackedRole } from "@/app/actions/roles";
import { useRouter } from "next/navigation";

type Role = { title: string; description: string; category: string };

const TRENDING_ROLES: Role[] = [
  // AI Engineering
  {
    title: "AI Engineer",
    description: "Builds AI-powered products using LLMs and foundation models — the fastest-growing eng role in tech right now.",
    category: "AI Engineering",
  },
  {
    title: "LLM Engineer",
    description: "Specializes in building with large language models: prompt engineering, fine-tuning, RAG pipelines.",
    category: "AI Engineering",
  },
  {
    title: "Applied AI Engineer",
    description: "Applies ML/AI to real product problems — less pure research, more shipping.",
    category: "AI Engineering",
  },
  {
    title: "Inference Engineer",
    description: "Optimizes speed and cost of running AI models in production — critical as AI scales.",
    category: "AI Engineering",
  },
  {
    title: "ML Platform Engineer",
    description: "Builds infrastructure ML teams rely on: training pipelines, model registries, serving systems.",
    category: "AI Engineering",
  },
  {
    title: "AI Safety Engineer",
    description: "Works on reliability, alignment, and responsible deployment of AI systems.",
    category: "AI Engineering",
  },
  {
    title: "MLOps Engineer",
    description: "Manages deployment, monitoring, and maintenance of ML models in production — the DevOps of machine learning.",
    category: "AI Engineering",
  },
  {
    title: "AI Agent Architect",
    description: "Designs how autonomous AI agents collaborate, manages human-in-the-loop checkpoints, and enforces safeguards. One of the hottest emerging roles as agentic AI takes off.",
    category: "AI Engineering",
  },
  {
    title: "AI Solutions Architect",
    description: "Assesses which AI tools best fit a company's needs and leads implementation from proof of concept to production.",
    category: "AI Engineering",
  },
  {
    title: "AI Red Team Engineer",
    description: "Ethical AI hacker — simulates adversarial attacks to expose model vulnerabilities and test safeguards before deployment.",
    category: "AI Engineering",
  },
  // Startup / Go-to-Market
  {
    title: "Forward Deployed Engineer",
    description: "Embedded engineer who works directly with customers to implement and customize the product. Made famous by Palantir, now common at AI startups.",
    category: "Startup",
  },
  {
    title: "Founding Engineer",
    description: "Early engineer (#1–5) at a startup with broad scope and significant equity. Often becomes a generalist technical leader.",
    category: "Startup",
  },
  {
    title: "GTM Engineer",
    description: "Technical role bridging sales and engineering — automates GTM workflows, builds demo environments, and supports the revenue team.",
    category: "Startup",
  },
  {
    title: "Revenue Engineer",
    description: "Another name for GTM Engineer at many startups — owns the technical layer of the sales motion.",
    category: "Startup",
  },
  {
    title: "Growth Engineer",
    description: "Runs experiments across acquisition, activation, and retention. Sits at the intersection of engineering and marketing.",
    category: "Startup",
  },
  // Customer-Facing Technical
  {
    title: "Solutions Engineer",
    description: "Pre-sales technical role that demos the product and architects customer implementations.",
    category: "Customer-Facing",
  },
  {
    title: "Implementation Engineer",
    description: "Owns onboarding for complex enterprise customers — often SQL-heavy, API-heavy.",
    category: "Customer-Facing",
  },
  {
    title: "Technical Customer Success",
    description: "Post-sale role ensuring customers achieve outcomes. Common path into PM or Solutions Architecture.",
    category: "Customer-Facing",
  },
  // Developer / Community
  {
    title: "Developer Advocate",
    description: "Technical evangelist who writes docs, builds demos, and represents the developer community inside the company.",
    category: "Developer",
  },
  {
    title: "Developer Relations Engineer",
    description: "More eng-heavy than DevRel — builds SDKs, example apps, and integrations while engaging the developer community.",
    category: "Developer",
  },
  // Product
  {
    title: "AI Product Manager",
    description: "PM specialized in AI features: dataset strategy, model iteration loops, and responsible AI practices.",
    category: "Product",
  },
  {
    title: "Technical Product Manager",
    description: "PM who can write specs, read code, and partner closely with engineering on API/platform products.",
    category: "Product",
  },
  {
    title: "AI Strategist",
    description: "Evaluates where AI drives business value, assesses org readiness, and defines the implementation roadmap. Common at consultancies and larger tech companies.",
    category: "Product",
  },
  {
    title: "Conversational AI Designer",
    description: "Designs the dialogue flow, tone, and personality of chatbots and voice assistants — UX design meets NLP.",
    category: "Product",
  },
  {
    title: "AI Ethics Officer",
    description: "Develops AI governance policies, audits models for bias, and ensures compliance with emerging AI regulations.",
    category: "Product",
  },
];

const INITIAL_SHOW = 9;

export function TrendingRoles({
  trackedTitles,
}: {
  trackedTitles: string[];
}) {
  const router = useRouter();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const tracked = new Set([
    ...trackedTitles.map((t) => t.toLowerCase()),
    ...[...added].map((t) => t.toLowerCase()),
  ]);

  function handleAdd(role: Role) {
    if (tracked.has(role.title.toLowerCase())) return;
    setAdded((prev) => new Set([...prev, role.title]));
    startTransition(async () => {
      const res = await addTrackedRole(role.title);
      if (res.role) {
        window.dispatchEvent(new CustomEvent("crush:roleAdded", { detail: res.role }));
      }
      router.refresh();
    });
  }

  const visible = expanded ? TRENDING_ROLES : TRENDING_ROLES.slice(0, INITIAL_SHOW);
  const remaining = TRENDING_ROLES.length - INITIAL_SHOW;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>🔥</span> Trending roles in AI
        </span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t px-3 py-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            New job titles worth knowing — hover to learn what they mean, click <span className="font-medium">+</span> to track
          </p>

          <div className="flex flex-wrap gap-2">
            {visible.map((role) => {
              const isTracked = tracked.has(role.title.toLowerCase());
              const isHovered = tooltip === role.title;
              return (
                <div key={role.title} className="relative">
                  <button
                    onClick={() => handleAdd(role)}
                    onMouseEnter={() => setTooltip(role.title)}
                    onMouseLeave={() => setTooltip(null)}
                    disabled={isTracked || isPending}
                    className={[
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      isTracked
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 cursor-default"
                        : "border-border bg-background hover:border-foreground/40 hover:bg-muted cursor-pointer",
                    ].join(" ")}
                  >
                    {role.title}
                    {isTracked ? (
                      <Check className="size-3 shrink-0" />
                    ) : (
                      <Plus className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isHovered && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 w-56 rounded-lg border bg-popover px-3 py-2 shadow-md text-xs text-popover-foreground leading-relaxed pointer-events-none">
                      <span className="font-medium block mb-0.5">{role.title}</span>
                      {role.description}
                      <div className="mt-1 text-[10px] text-muted-foreground">{role.category}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {TRENDING_ROLES.length > INITIAL_SHOW && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? "Show less" : `Show ${remaining} more`}
              <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
