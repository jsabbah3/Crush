import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertSettingsForm } from "@/components/alert-settings-form";
import { TrackedRoles } from "@/components/tracked-roles";
import { ResumeUpload } from "@/components/resume-upload";
import { signOut } from "@/app/actions/auth";

type UserPrefs = {
  seniority?: string[];
  remoteOnly?: boolean | null;
  locationFilter?: string | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) redirect("/login");

  const [trackedCount, trackedRoles] = await Promise.all([
    prisma.trackedCompany.count({ where: { userId: user.id } }),
    prisma.trackedRole.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const prefs = user.defaultCriteria as UserPrefs | null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-heading text-3xl font-bold">⚙️ Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          {user.name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{user.name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Companies tracked</span>
            <span>{trackedCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My roles</CardTitle>
          <p className="text-sm text-muted-foreground">
            Role titles and preferences applied globally across all your tracked companies.
          </p>
        </CardHeader>
        <CardContent>
          <TrackedRoles
            initialRoles={trackedRoles}
            trackedCount={trackedCount}
            initialSeniority={prefs?.seniority ?? []}
            initialRemoteOnly={prefs?.remoteOnly ?? null}
            initialLocationFilter={prefs?.locationFilter ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertSettingsForm
            alertMode={user.alertMode}
            alertsPaused={user.alertsPaused}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered role and company suggestions based on your background.
          </p>
        </CardHeader>
        <CardContent>
          <ResumeUpload
            initialResumeText={user.resumeText ?? null}
            userId={user.id}
            initialTrackedRoles={trackedRoles}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="destructive" size="sm">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
