import type { Job } from "@/generated/prisma/client";

const EMPLOYMENT_TYPE: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  INTERNSHIP: "INTERN",
  FREELANCE: "CONTRACTOR",
};

// Google requires a real description; skip jobs without one rather than
// emitting invalid JobPosting entities.
const MIN_DESCRIPTION_CHARS = 100;
const MAX_DESCRIPTION_CHARS = 2000;
const MAX_JOBS = 20;

/**
 * JobPosting structured data (schema.org) for a company's active roles.
 * Makes listings eligible for the Google Jobs experience — high-intent,
 * zero-cost distribution for a job-alert product.
 */
export function JobPostingJsonLd({
  jobs,
  companyName,
  companyWebsite,
}: {
  jobs: Job[];
  companyName: string;
  companyWebsite: string | null;
}) {
  const entities = jobs
    .filter((j) => j.description.trim().length >= MIN_DESCRIPTION_CHARS && j.postedAt)
    .slice(0, MAX_JOBS)
    .map((job) => {
      const posting: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.description.slice(0, MAX_DESCRIPTION_CHARS),
        datePosted: job.postedAt!.toISOString().slice(0, 10),
        employmentType: EMPLOYMENT_TYPE[job.type] ?? "FULL_TIME",
        hiringOrganization: {
          "@type": "Organization",
          name: companyName,
          ...(companyWebsite ? { sameAs: companyWebsite } : {}),
        },
        ...(job.url ? { url: job.url } : {}),
      };

      if (job.remote) {
        posting.jobLocationType = "TELECOMMUTE";
      }
      if (job.location) {
        posting.jobLocation = {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location },
        };
      }
      if (job.salaryMin != null || job.salaryMax != null) {
        posting.baseSalary = {
          "@type": "MonetaryAmount",
          currency: job.currency,
          value: {
            "@type": "QuantitativeValue",
            ...(job.salaryMin != null ? { minValue: job.salaryMin } : {}),
            ...(job.salaryMax != null ? { maxValue: job.salaryMax } : {}),
            unitText: "YEAR",
          },
        };
      }
      return posting;
    });

  if (entities.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(entities) }}
    />
  );
}
