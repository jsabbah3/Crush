import { test } from "node:test";
import assert from "node:assert/strict";
import { mentionsCompany, nameVariants } from "./board-check";
import { boardLinks } from "./detect-ats";

const job = (description: string, title = "Engineer") => ({ title, description });

test("names a company the way postings do", () => {
  assert.ok(nameVariants("Recall AI").includes("recall"));
  assert.ok(nameVariants("Gamma.app").includes("gamma"));
  assert.ok(nameVariants("Profound", "https://tryprofound.com").includes("profound"));
});

test("real board mentions the company", () => {
  assert.ok(mentionsCompany("Runway", "https://runwayml.com", [job("About Runway: we build world simulators")]));
  assert.ok(mentionsCompany("TwelveLabs", null, [job("TwelveLabs builds the intelligence layer")]));
  assert.ok(mentionsCompany("Assort Health", null, [job("At Assort, we automate the front desk")]));
  assert.ok(mentionsCompany("Caddy", null, [job("working directly with Caddy’s founders")]));
});

test("namesake board does not", () => {
  // Coactive (AI) vs Co-Active Training Institute
  assert.ok(!mentionsCompany("Coactive", "https://coactive.ai", [job("About Co-Active Training Institute: coaching")]));
  // whole words only: "Rox" is not in "approximately"
  assert.ok(!mentionsCompany("Rox", "https://rox.com", [job("approximately 40 people, proxy work")]));
  // Known limit: an exact namesake ("Glide" the bank vs. Glide the app
  // builder) passes. Only a site link settles those.
});

test("pulls boards out of careers pages", () => {
  const html = `<a href="https://jobs.ashbyhq.com/Rox-Data-Corp">Jobs</a>
    <script src="https://boards.greenhouse.io/embed/job_board/js?for=browserbaseinc"></script>
    <a href="https://jobs.ashbyhq.com/Rox-Data-Corp/123">x</a>`;
  const links = boardLinks(html);
  assert.deepEqual(links[0], { type: "ashby", slug: "Rox-Data-Corp" });
  assert.ok(links.some((l) => l.type === "greenhouse" && l.slug === "browserbaseinc"));
  assert.ok(!links.some((l) => l.slug === "embed"));
});
