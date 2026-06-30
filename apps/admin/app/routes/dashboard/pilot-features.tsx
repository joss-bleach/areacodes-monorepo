import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Skeleton,
  Badge,
} from "@repo/ui";
import { AdminNavbar } from "~/components/admin-navbar";
import { RequireAdmin } from "~/components/require-admin";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/pilot-features")({
  component: PilotFeaturesPage,
});

function PilotFeaturesPage() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Pilot Features</h1>
          <p className="text-muted-foreground mt-1">
            Toggle global feature flags for all Pilot Businesses
          </p>
        </div>
        <PilotFeaturesPanel />
      </main>
    </RequireAdmin>
  );
}

function PilotFeaturesPanel() {
  const { isAuthenticated } = useConvexAuth();
  const features = useQuery(
    api.functions.pilot.getActivePilotFeatures,
    isAuthenticated ? {} : "skip",
  );
  const addFeature = useMutation(api.functions.pilot.addPilotFeature);
  const removeFeature = useMutation(api.functions.pilot.removePilotFeature);
  const [newKey, setNewKey] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    const key = newKey.trim();
    if (!key) return;
    setIsAdding(true);
    try {
      await addFeature({ key });
      setNewKey("");
      toast.success(`Feature "${key}" enabled`);
    } catch {
      toast.error("Failed to enable feature");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(key: string) {
    try {
      await removeFeature({ key });
      toast.success(`Feature "${key}" disabled`);
    } catch {
      toast.error("Failed to disable feature");
    }
  }

  if (features === undefined) {
    return (
      <Card className="rounded-none border-none max-w-lg">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-none max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Active Feature Keys</CardTitle>
        <CardDescription>
          A feature is active for all Pilot Businesses when its key appears here.
          Removing a key immediately disables the feature everywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.length === 0 ? (
          <p className="text-sm text-muted-foreground">No features are currently active.</p>
        ) : (
          <ul className="space-y-2">
            {features.map((key) => (
              <li key={key} className="flex items-center justify-between">
                <Badge variant="secondary" className="font-mono text-xs">
                  {key}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(key)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${key}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="e.g. feedback_widget"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="font-mono text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={!newKey.trim() || isAdding}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Enable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
