/**
 * The matcher's answer key. Every case here is a real title from a board we
 * read, with the answer a person would give. Change matching.ts or
 * location.ts → run `npm test` → every case still has to hold.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { titleMatchesRoles, detectSeniority, doesJobMatch } from "./matching";
import type { Job } from "@/generated/prisma/client";
import { locationOk } from "./location";

const TITLES: [title: string, roles: string[], match: boolean][] = [
  // Sales
  ["Enterprise Account Executive, Healthcare", ["Account Executive"], true],
  ["Account Executive - AI Native: Startups", ["Account Executive"], true],
  ["Mid-Market Account Executive", ["account executive"], true],
  ["AE, Mid-Market", ["account executive"], true],
  ["Manager, Account Executives, Startups", ["Account Executive"], false],
  ["Account Manager, Renewals & Expansion (East Coast)", ["Account Manager"], true],
  ["Technical Account Manager, Tampa", ["account manager"], true],
  ["Field Engineer, Tampa", ["tam"], false],
  ["Aerospace Engineer", ["ae"], false],
  ["Sales Intern", ["sales"], false],
  ["Enterprise Account Executive, Healthcare", ["Enterprise AE"], true],
  ["Commercial Account Executive", ["Enterprise Account Executive"], false],
  ["Senior Product Manager, Growth", ["Senior PM"], true],
  // One-word roles count only in what the job is, not what it's about
  ["Account Executive, Startups - Grower", ["Startup"], false],
  ["Account Executive- Startups, Install Base", ["Startup"], false],
  ["Applied AI Architect (Startups)", ["Startup"], false],
  ["FP&A Manager, Product", ["Product"], false],
  ["FP&A Manager, Product", ["Finance"], true],
  ["Senior Product Manager", ["Product"], true],
  ["Senior Technical Program Manager", ["Product"], false],
  ["Production Engineer", ["Product"], false],
  ["Staff Software Engineer, Internal Products", ["Product"], true],
  ["Senior Associate, Strategic Finance (Growth)", ["Finance"], true],
  ["Accounting Manager, GL Operations", ["Finance"], true],
  ["Strategic Account Executive, Asset & Wealth Management", ["Strategy", "Finance", "Product", "Operations"], false],
  ["Named Account Executive", ["Finance"], false],
  ["Senior Accountant", ["Finance"], true],
  // Partnerships: root words count, plural or not
  ["Manager, Startup Partnerships", ["partnerships"], true],
  ["Partnership Manager", ["partnerships"], true],
  ["Senior Partnerships Manager, Crypto", ["partnerships"], true],
  ["Partner Manager, Cloud Service Provider Partnerships", ["partnerships"], true],
  ["AWS Partner Development Manager", ["partnerships"], true],
  ["Talent Partner, Tech", ["partnerships"], false],
  ["Partner Applied AI Engineer, Google Cloud", ["partnerships"], false],
  ["Strategic Sourcing Business Partner, R&D Operations", ["partnerships"], false],
  // Mobile: broad covers specific, specific doesn't pull in siblings
  ["Senior iOS Engineer", ["ios engineer"], true],
  ["Software Engineer, iOS", ["ios"], true],
  ["Software Engineer, Mobile Platform (iOS)", ["ios"], true],
  ["Software Engineer, Passport & Commerce, iOS", ["ios"], true],
  ["Senior Android Engineer, Growth", ["ios engineer"], false],
  ["Senior Android Engineer, Growth", ["mobile engineer"], true],
  ["Data Engineer, iOS - Health Technologies", ["ios"], false],
  ["Engineering Manager II, iOS Modernization", ["ios"], false],
  ["AI Support Engineer, Biosciences - San Francisco", ["ios"], false],
  ["Staff Machine Learning Engineer, Ads Forecasting & Scenarios", ["ios engineer", "ios"], false],
  ["Full-Stack Engineer", ["fullstack engineer"], true],
  // Misc
  ["Quality Assurance Specialist II", ["QA"], false],
  ["QA Engineer", ["QA"], true],
  ["Chief of Staff, CEO", ["Chief of Staff"], true],
  ["Head of Recruiters", ["recruiter"], false],
  ["Senior Recruiter", ["talent acquisition"], true],
];

for (const [title, roles, want] of TITLES) {
  test(`${JSON.stringify(roles)} ${want ? "matches" : "does not match"} "${title}"`, () => {
    assert.equal(titleMatchesRoles(title, roles), want);
  });
}

type Loc = [location: string | null, remote: boolean, filter: string, remoteOnly: boolean | null, ok: boolean, title?: string];
const LOCATIONS: Loc[] = [
  ["New York, NY", false, "New York", null, true],
  ["NYC", false, "New York", null, true],
  ["Brooklyn, NY; San Francisco, CA", false, "New York", null, true],
  ["Boston, Raleigh, NYC", false, "New York", null, true],
  ["Hybrid - Manhattan", false, "New York", null, true],
  ["San Francisco, CA", false, "New York", null, false],
  ["Remote - US", true, "New York", null, true],
  ["Remote", true, "New York", null, true],
  [null, true, "New York", null, true],
  ["Remote - Canada", true, "New York", null, false],
  ["Remote - US", true, "New York", false, false],
  ["San Francisco, CA", false, "United States", null, true],
  ["Austin, Texas", false, "United States", null, true],
  ["London, UK", false, "United States", null, false],
  ["London or New York", false, "United States", null, true],
  ["Toronto, CA", false, "United States", null, false],
  ["South San Francisco", false, "San Francisco", null, true],
  ["Bay Area", false, "San Francisco", null, true],
  ["Berlin, Germany", false, "Europe", null, true],
  ["Remote - EMEA", true, "London", null, true],
  ["Chicago, IL", false, "Chicago", null, true],
  // Territory roles marked remote are not "remote" for someone elsewhere
  ["Remote - Texas", true, "New York", null, false],
  ["Atlanta, GA", true, "New York", null, false],
  ["Remote - Washington D.C.", true, "New York", null, false],
  ["San Francisco (remote)", true, "New York", null, false],
  ["Remote - US", true, "New York", null, false, "Enterprise Account Executive, Chicago"],
  ["Remote - US", true, "New York", null, false, "Enterprise Account Executive, Southeast"],
  ["Remote - US", true, "New York", null, true, "Enterprise Account Executive, Northeast"],
  ["Remote - US", true, "New York", null, true, "Enterprise Account Executive"],
  ["Remote - New York", true, "New York", null, true],
  ["Remote - Texas", true, "United States", null, true],
  ["Remote - North America", true, "New York", null, true, "Account Executive, North America"],
  ["Remote US", true, "New York", null, true, "Staff Security Engineer, Enterprise AI"],
];

for (const [location, remote, filter, remoteOnly, want, title] of LOCATIONS) {
  test(`location "${location}"${remote ? " (remote)" : ""}${title ? ` for "${title}"` : ""} ${want ? "passes" : "fails"} filter "${filter}"`, () => {
    assert.equal(locationOk({ location, remote, title }, filter, remoteOnly), want);
  });
}

const LEVELS: [title: string, description: string, level: string | null][] = [
  ["Risk Operations Analyst - RBO", "Build internal tools across international teams.", null],
  ["Procurement Operations Manager", "You will report to our Chief Financial Officer.", null],
  ["Product Designer, People Innovation Labs", "Partner with internal stakeholders.", null],
  ["Senior Product Manager", "", "senior"],
  ["Staff Software Engineer", "", "staff"],
  ["Director, Product Marketing", "", "director"],
  ["Head of Partnerships", "", "director"],
  ["Software Engineering Intern", "", "intern"],
  ["Associate Product Manager", "", "junior"],
  ["Software Engineer", "This is an entry-level role for new grads.", "junior"],
  ["Enterprise Account Executive", "", "senior"],
  ["SMB Account Executive", "", "junior"],
  ["CTO", "", "executive"],
  ["Doctor of Operations", "", null],
];

for (const [title, description, level] of LEVELS) {
  test(`seniority of "${title}" is ${level}`, () => {
    assert.equal(detectSeniority(title, description), level);
  });
}

const job = (title: string, description = "", location: string | null = "New York, NY", remote = false) =>
  ({ title, description, location, remote }) as unknown as Job;

test("a Lead role fits someone filtering for Senior", () => {
  assert.equal(doesJobMatch(job("Strategic Partnerships Lead, Education"), ["partnerships"], ["mid", "senior"], null, null), true);
});
test("a Junior role does not fit someone filtering for Senior", () => {
  assert.equal(doesJobMatch(job("Associate Product Manager"), ["Product Manager"], ["senior"], null, null), false);
});
test("a Director role does not fit someone filtering for Senior", () => {
  assert.equal(doesJobMatch(job("Director, Product Management"), ["Product Manager"], ["senior"], null, null), false);
});
test("the LangChain renewals role matches an Account Manager in New York", () => {
  assert.equal(doesJobMatch(job("Account Manager, Renewals & Expansion (East Coast)"), ["Account Manager", "Account Executive"], [], null, "New York"), true);
});
