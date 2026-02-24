import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  Skeleton,
} from "@repo/ui";
import { AdminNavbar } from "~/components/admin-navbar";
import { RequireAdmin } from "~/components/require-admin";

export const Route = createFileRoute("/dashboard/audit-log")({
  beforeLoad: ({ context }) => {
    if (!context.auth.userId) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AuditLogPage,
});

function AuditLogPage() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Chronological record of all admin actions
          </p>
        </div>
        <AuditLogList />
      </main>
    </RequireAdmin>
  );
}

const getActionLabel = (action: string) => {
  switch (action) {
    case "flag_business":
      return "Flagged business";
    case "remove_voucher":
      return "Removed voucher";
    default:
      return action;
  }
};

function AuditLogList() {
  const auditLog = useQuery(api.functions.admin.getAuditLog, {});

  if (auditLog === undefined) {
    return <AuditLogLoading />;
  }

  return (
    <Card className="rounded-none border-none">
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none">Admin Actions</h2>
        <CardDescription>{auditLog.length} total entries</CardDescription>
      </CardHeader>
      <CardContent>
        {auditLog.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No admin actions recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            {auditLog.map((entry) => (
              <div
                key={entry._id}
                className="flex items-start justify-between py-4 border-b border-border last:border-b-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getActionLabel(entry.action)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {entry.targetType}/{entry.targetId}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground">{entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    by {entry.adminClerkUserId}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const AuditLogLoading = () => (
  <Card className="rounded-none border-none">
    <CardHeader>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="py-4 border-b border-border space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
    </CardContent>
  </Card>
);
