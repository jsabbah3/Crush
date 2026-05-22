import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Crush</h1>
          <p className="text-sm text-muted-foreground">
            Track companies. Get notified when your role opens.
          </p>
        </div>

        <form action={signInWithGoogle}>
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
