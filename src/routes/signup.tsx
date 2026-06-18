import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: SignupDisabledPage });

function SignupDisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Truck className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold">SJ Minerals</span>
        </div>
        <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-left">
          <p className="font-medium mb-1">Sign-up is invite-only</p>
          <p className="text-muted-foreground">
            Public registration is disabled. Please ask an administrator to invite you.
            Once invited, you'll receive an email link to set your password.
          </p>
        </div>
        <Link to="/login" className="inline-block text-sm text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
