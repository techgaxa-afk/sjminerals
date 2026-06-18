import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { Shield, Lock, Database, UserCheck, FileText, Mail } from "lucide-react";

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust & Security — SJ Minerals" },
      { name: "description", content: "How SJ Minerals protects your data: access control, encryption in transit, audit logs, and privacy practices." },
      { property: "og:title", content: "Trust & Security — SJ Minerals" },
      { property: "og:description", content: "Security, privacy, and data handling practices for the SJ Minerals quarry ERP." },
    ],
  }),
});

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Trust & Security</h1>
          <p className="text-sm text-muted-foreground">
            This page is maintained by SJ Minerals to answer common security and privacy
            questions about this ERP application. It describes the controls currently in
            place and is not an independent certification or third-party audit.
          </p>
        </div>

        <Section icon={Shield} title="Access Control">
          <p>
            All business data is gated by authentication. Users must sign in before any
            records (bills, payments, expenses, machines, operators, companies) are
            accessible.
          </p>
          <p>
            Role-based permissions separate <strong>admin</strong>, <strong>staff</strong>,
            <strong> accountant</strong>, <strong>operator</strong>, and <strong>viewer</strong>
            capabilities. Write access to financial and master records is restricted to
            admin and staff roles. New users receive no role by default and must be promoted
            by an admin before they can modify data.
          </p>
        </Section>

        <Section icon={Lock} title="Data Protection">
          <p>
            Row-level security policies are enforced at the database layer for every
            business table, so authorization is applied centrally rather than relying on
            client-side checks.
          </p>
          <p>
            Data is transmitted over HTTPS/TLS between the browser and our backend. Secrets
            and API keys are stored server-side and never bundled into client code.
          </p>
        </Section>

        <Section icon={Database} title="Data We Store">
          <p>
            The application stores operational records you enter: companies, vehicles,
            products, bills, payments, expenses, Hitachi machines and entries, fuel logs,
            operator records, and an audit log of sensitive actions.
          </p>
          <p>
            Customer vehicles tracked in the system are recorded for pass/trip purposes
            only and are not used to compute company-owned asset metrics.
          </p>
        </Section>

        <Section icon={UserCheck} title="Authentication">
          <p>
            Sign-in is handled by our managed authentication provider. Passwords are never
            stored in the application database — only the provider's hashed credentials.
            Session tokens are short-lived and refreshed automatically.
          </p>
        </Section>

        <Section icon={FileText} title="Audit & Accountability">
          <p>
            Sensitive actions are recorded in an append-only audit log with the acting
            user, action type, and timestamp. Audit entries are visible to administrators
            for review.
          </p>
        </Section>

        <Section icon={Mail} title="Contact">
          <p>
            For questions about security, data handling, or to report a vulnerability,
            please contact the SJ Minerals administrator who provisioned your account.
          </p>
        </Section>

        <p className="text-xs text-muted-foreground text-center pt-4">
          <Link to="/" className="underline">Back to dashboard</Link>
        </p>
      </div>
    </AppLayout>
  );
}
