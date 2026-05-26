import { JobType } from "@/generated/prisma/enums";
import { type IngestedJob, isRemoteLocation, isUSOrRemote } from "./normalize";

type GreenhouseJob = {
  id: number;
  title: string;
  location: { name: string } | null;
  content: string | null;
  absolute_url: string | null;
  updated_at: string | null;
};

export async function fetchGreenhouseJobs(slug: string): Promise<IngestedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
    { next: { revalidate: 0 } }
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Greenhouse ${slug}: HTTP ${res.status}`);

  const data = await res.json() as { jobs: GreenhouseJob[] };

  return data.jobs
    .filter((job) => isUSOrRemote(job.location?.name))
    .map((job) => {
      const location = job.location?.name ?? null;
      return {
        externalJobId: job.id.toString(),
        title: job.title,
        description: job.content ?? "",
        type: JobType.FULL_TIME,
        location,
        remote: isRemoteLocation(location),
        url: job.absolute_url ?? null,
        postedAt: job.updated_at ? new Date(job.updated_at) : null,
      };
    });
}
