/**
 * role-suggestions.ts
 *
 * Given a person's current job title, returns a ranked list of role titles
 * they're likely to want to track on Crush.
 *
 * Matching is fuzzy — we normalize the input and check for keyword overlap
 * with known role clusters. First matching cluster wins.
 */

type RoleCluster = {
  keywords: string[];       // if any of these appear in the normalized title → match
  suggestions: string[];    // ordered from most to least common
};

const CLUSTERS: RoleCluster[] = [
  {
    keywords: ["founder", "ceo", "chief executive", "co-founder"],
    suggestions: ["CEO", "Founder", "VP Engineering", "VP Product", "General Manager"],
  },
  {
    keywords: ["cto", "chief technology", "vp engineering", "vp of engineering", "head of engineering"],
    suggestions: ["VP Engineering", "Head of Engineering", "Engineering Manager", "Staff Engineer", "Principal Engineer"],
  },
  {
    keywords: ["cpo", "chief product", "vp product", "head of product"],
    suggestions: ["VP Product", "Head of Product", "Group Product Manager", "Director of Product", "Product Lead"],
  },
  {
    keywords: ["staff engineer", "principal engineer", "distinguished engineer", "fellow"],
    suggestions: ["Staff Engineer", "Principal Engineer", "Distinguished Engineer", "Engineering Fellow", "Tech Lead"],
  },
  {
    keywords: ["engineering manager", "eng manager", "em ", "software manager"],
    suggestions: ["Engineering Manager", "Senior Engineering Manager", "Director of Engineering", "Staff Engineer", "Tech Lead"],
  },
  {
    keywords: ["senior software", "senior engineer", "senior swe", "senior developer", "sr. software", "sr software"],
    suggestions: ["Senior Software Engineer", "Staff Engineer", "Tech Lead", "Engineering Manager", "Principal Engineer"],
  },
  {
    keywords: ["software engineer", "software developer", "swe", "full stack", "fullstack", "backend engineer", "frontend engineer", "web developer"],
    suggestions: ["Software Engineer", "Senior Software Engineer", "Full Stack Engineer", "Backend Engineer", "Frontend Engineer"],
  },
  {
    keywords: ["mobile", "ios", "android", "react native", "flutter"],
    suggestions: ["iOS Engineer", "Android Engineer", "Mobile Engineer", "Senior Mobile Engineer", "React Native Engineer"],
  },
  {
    keywords: ["devops", "site reliability", "sre", "platform engineer", "infrastructure"],
    suggestions: ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Infrastructure Engineer", "Staff SRE"],
  },
  {
    keywords: ["machine learning", "ml engineer", "ai engineer", "deep learning", "llm"],
    suggestions: ["ML Engineer", "Senior ML Engineer", "AI Engineer", "Research Engineer", "Applied Scientist"],
  },
  {
    keywords: ["data scientist", "data science"],
    suggestions: ["Data Scientist", "Senior Data Scientist", "ML Engineer", "Research Scientist", "Applied Scientist"],
  },
  {
    keywords: ["data engineer", "analytics engineer", "data platform"],
    suggestions: ["Data Engineer", "Senior Data Engineer", "Analytics Engineer", "Staff Data Engineer", "Data Architect"],
  },
  {
    keywords: ["data analyst", "business analyst", "bi analyst", "business intelligence"],
    suggestions: ["Data Analyst", "Senior Data Analyst", "Analytics Engineer", "Business Analyst", "Data Scientist"],
  },
  {
    keywords: ["research scientist", "researcher", "scientist"],
    suggestions: ["Research Scientist", "Senior Research Scientist", "Research Engineer", "Applied Researcher", "ML Researcher"],
  },
  {
    keywords: ["product designer", "ux designer", "ui designer", "ux/ui", "ui/ux", "interaction designer", "product design"],
    suggestions: ["Product Designer", "Senior Product Designer", "UX Designer", "Design Lead", "Staff Designer"],
  },
  {
    keywords: ["graphic designer", "visual designer", "brand designer"],
    suggestions: ["Visual Designer", "Brand Designer", "Graphic Designer", "Senior Designer", "Creative Director"],
  },
  {
    keywords: ["design manager", "head of design", "vp design", "design director"],
    suggestions: ["Head of Design", "VP Design", "Design Director", "Senior Product Designer", "Design Lead"],
  },
  {
    keywords: ["product manager", "pm ", "senior pm", "product lead", "product owner", "group pm"],
    suggestions: ["Product Manager", "Senior Product Manager", "Group Product Manager", "Staff PM", "Director of Product"],
  },
  {
    keywords: ["technical program", "tpm", "program manager"],
    suggestions: ["Technical Program Manager", "Senior TPM", "Engineering Program Manager", "Staff TPM", "Director of Engineering"],
  },
  {
    keywords: ["growth", "growth engineer", "growth product", "growth manager"],
    suggestions: ["Growth Engineer", "Growth PM", "Head of Growth", "Senior Growth Manager", "GTM Engineer"],
  },
  {
    keywords: ["gtm", "go to market", "go-to-market", "solutions engineer", "sales engineer"],
    suggestions: ["GTM Engineer", "Solutions Engineer", "Sales Engineer", "Enterprise Solutions Engineer", "Technical Account Manager"],
  },
  {
    keywords: ["account executive", "ae ", "sales rep", "account manager", "enterprise sales"],
    suggestions: ["Account Executive", "Senior AE", "Enterprise AE", "Strategic Account Manager", "Head of Sales"],
  },
  {
    keywords: ["head of sales", "vp sales", "chief revenue", "cro", "sales director"],
    suggestions: ["VP Sales", "Head of Sales", "Chief Revenue Officer", "Director of Sales", "Enterprise Sales Lead"],
  },
  {
    keywords: ["marketing manager", "senior marketing", "growth marketing", "demand generation"],
    suggestions: ["Marketing Manager", "Senior Marketing Manager", "Head of Marketing", "Growth Marketing Manager", "Demand Generation Manager"],
  },
  {
    keywords: ["content", "content writer", "content strategist", "copywriter"],
    suggestions: ["Content Strategist", "Senior Content Manager", "Head of Content", "Content Writer", "Copywriter"],
  },
  {
    keywords: ["recruiter", "talent", "talent acquisition", "head of talent", "recruiting"],
    suggestions: ["Recruiter", "Senior Recruiter", "Head of Talent", "Technical Recruiter", "Director of Talent"],
  },
  {
    keywords: ["finance", "fp&a", "financial analyst", "controller", "cfo"],
    suggestions: ["Financial Analyst", "FP&A Manager", "Senior Finance Manager", "Head of Finance", "CFO"],
  },
  {
    keywords: ["operations", "biz ops", "business operations", "chief of staff", "strategy"],
    suggestions: ["Business Operations Manager", "Chief of Staff", "Head of Ops", "Strategy & Operations Manager", "Biz Ops Lead"],
  },
  {
    keywords: ["customer success", "csm", "account manager", "implementation"],
    suggestions: ["Customer Success Manager", "Senior CSM", "Head of Customer Success", "Implementation Manager", "Enterprise CSM"],
  },
  {
    keywords: ["security", "appsec", "infosec", "cybersecurity", "penetration"],
    suggestions: ["Security Engineer", "Senior Security Engineer", "AppSec Engineer", "Head of Security", "Staff Security Engineer"],
  },
  {
    keywords: ["qa", "quality assurance", "test engineer", "sdet", "quality engineer"],
    suggestions: ["QA Engineer", "Senior QA Engineer", "SDET", "Staff QA Engineer", "Head of Quality"],
  },
];

const FALLBACK: string[] = [
  "Software Engineer",
  "Product Manager",
  "Product Designer",
  "Data Scientist",
  "Engineering Manager",
];

export function getRoleSuggestions(currentTitle: string, limit = 5): string[] {
  const normalized = currentTitle.toLowerCase().trim();
  if (!normalized) return FALLBACK.slice(0, limit);

  for (const cluster of CLUSTERS) {
    const matched = cluster.keywords.some((kw) => normalized.includes(kw));
    if (matched) {
      return cluster.suggestions.slice(0, limit);
    }
  }

  return FALLBACK.slice(0, limit);
}

/** Normalize a LinkedIn URL to a clean profile URL or null if invalid. */
export function normalizeLinkedinUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a full URL
  if (/^https?:\/\/(www\.)?linkedin\.com\/in\/[^/]+/.test(trimmed)) {
    // Strip trailing slashes and query params
    return trimmed.split("?")[0].replace(/\/$/, "");
  }

  // Just the username
  if (/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return `https://www.linkedin.com/in/${trimmed}`;
  }

  // linkedin.com/in/username without https
  if (/^(www\.)?linkedin\.com\/in\/[^/]+/.test(trimmed)) {
    return `https://${trimmed.replace(/\/$/, "")}`;
  }

  return null;
}
