import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PLACEHOLDER_JOBS = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    type: "Full-time",
    remote: true,
    salary: "$140k – $180k",
    tags: ["React", "TypeScript", "Next.js"],
    postedAt: "2 days ago",
  },
  {
    id: "2",
    title: "Product Designer",
    company: "Basecamp",
    location: "Remote",
    type: "Full-time",
    remote: true,
    salary: "$120k – $150k",
    tags: ["Figma", "Design Systems", "UX Research"],
    postedAt: "3 days ago",
  },
  {
    id: "3",
    title: "Backend Engineer (Go)",
    company: "Stripe",
    location: "New York, NY",
    type: "Full-time",
    remote: false,
    salary: "$160k – $200k",
    tags: ["Go", "PostgreSQL", "Kubernetes"],
    postedAt: "5 days ago",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <span className="font-semibold text-lg tracking-tight">JobBoard</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Log in</Button>
            <Button size="sm">Post a job</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-muted/40 py-14">
        <div className="mx-auto max-w-5xl px-4 text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Find your next role</h1>
          <p className="text-muted-foreground text-lg">
            Thousands of jobs at companies that care about remote work and work-life balance.
          </p>
          <div className="mx-auto max-w-xl flex gap-2">
            <Input placeholder="Job title, keyword, or company…" />
            <Button>Search</Button>
          </div>
        </div>
      </section>

      {/* Job listings */}
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{PLACEHOLDER_JOBS.length} jobs found</p>
          <div className="flex gap-2">
            <Badge variant="outline">Remote</Badge>
            <Badge variant="outline">Full-time</Badge>
            <Badge variant="outline">Engineering</Badge>
          </div>
        </div>

        {PLACEHOLDER_JOBS.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base leading-tight">{job.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {job.company} · {job.location}
                  </p>
                </div>
                <Badge variant={job.remote ? "default" : "secondary"}>
                  {job.remote ? "Remote" : "On-site"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground flex justify-between">
              <span>{job.salary}</span>
              <span>Posted {job.postedAt}</span>
            </CardFooter>
          </Card>
        ))}
      </main>
    </div>
  );
}
