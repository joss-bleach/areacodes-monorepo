import { Effect } from "effect";
import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Button,
  Input,
  Label,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BoundaryAlert } from "~/components/boundary-alert";
import { ConfirmationDialog } from "~/components/confirmation-dialog";

export const Route = createFileRoute("/_authenticated/b/$slug/pos")({
  component: PosPage,
});

type Provider = "square" | "zettle";

type FilterTab = "all" | "connected";

const INTEGRATIONS = [
  {
    id: "square" as Provider,
    name: "Square POS",
    logo: "Square",
    description:
      "Sync voucher redemptions automatically from Square Orders. When a customer redeems a voucher in store, counts update daily.",
    comingSoon: false,
  },
  {
    id: "shopify" as string,
    name: "Shopify POS",
    logo: "Shopify",
    description:
      "Track voucher redemptions from in-store Shopify POS sales. Keep redemption data in sync across your online and offline channels.",
    comingSoon: true,
  },
  {
    id: "sumup" as string,
    name: "SumUp POS",
    logo: "SumUp",
    description:
      "Automatically log voucher redemptions from SumUp card readers and point-of-sale terminals throughout your business.",
    comingSoon: true,
  },
  {
    id: "zettle" as Provider,
    name: "Zettle POS",
    logo: "Zettle",
    description:
      "Connect Zettle by PayPal to sync redemptions from purchases made at your Zettle point-of-sale terminal.",
    comingSoon: false,
  },
] as const;

function ProviderLogo({ id }: { id: string }) {
  const styles: Record<string, string> = {
    square: "font-bold tracking-tight",
    shopify: "font-bold tracking-tight",
    sumup: "font-bold tracking-tight",
    zettle: "font-bold tracking-tight",
  };
  const labels: Record<string, string> = {
    square: "Square",
    shopify: "Shopify",
    sumup: "SumUp",
    zettle: "Zettle",
  };
  return (
    <span className={`text-xl leading-none text-foreground ${styles[id] ?? "font-bold"}`}>
      {labels[id] ?? id}
    </span>
  );
}

function ConnectDialog({
  integration,
  businessId,
  open,
  onOpenChange,
}: {
  integration: { id: Provider; name: string };
  businessId: Id<"businesses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const connectPosProvider = useMutation(
    api.functions.posConnections.connectPosProvider,
  );

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    void Effect.runPromise(
      Effect.gen(function* () {
        yield* Effect.tryPromise({
          try: () =>
            connectPosProvider({
              businessId,
              provider: integration.id,
              apiKey: apiKey.trim(),
            }),
          catch: () => new Error(`Failed to connect ${integration.name}`),
        });
        yield* Effect.sync(() => {
          setApiKey("");
          onOpenChange(false);
          toast.success(`${integration.name} connected`);
        });
      }).pipe(
        Effect.catchAll((err) =>
          Effect.sync(() =>
            toast.error(
              (err as Error).message || `Failed to connect ${integration.name}`,
            ),
          ),
        ),
        Effect.ensuring(Effect.sync(() => setIsConnecting(false))),
      ),
    );

    setIsConnecting(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {integration.name}</DialogTitle>
          <DialogDescription>
            Enter your API key to connect {integration.name} and start syncing
            redemptions automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConnect} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-api-key">API Key</Label>
            <Input
              id="pos-api-key"
              type="password"
              placeholder={`Enter your ${integration.name} API key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isConnecting}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isConnecting || !apiKey.trim()}
            >
              {isConnecting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Connect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({
  integration,
  isConnected,
  businessId,
}: {
  integration: (typeof INTEGRATIONS)[number];
  isConnected: boolean;
  businessId: Id<"businesses">;
}) {
  const [showConnect, setShowConnect] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const disconnectPosProvider = useMutation(
    api.functions.posConnections.disconnectPosProvider,
  );

  function handleDisconnect() {
    void Effect.runPromise(
      Effect.gen(function* () {
        yield* Effect.tryPromise({
          try: () =>
            disconnectPosProvider({
              businessId,
              provider: integration.id as Provider,
            }),
          catch: () => new Error(`Failed to disconnect ${integration.name}`),
        });
        yield* Effect.sync(() => {
          toast.success(`${integration.name} disconnected`);
          setShowDisconnect(false);
        });
      }).pipe(
        Effect.catchAll((err) =>
          Effect.sync(() =>
            toast.error(
              (err as Error).message ||
                `Failed to disconnect ${integration.name}`,
            ),
          ),
        ),
        Effect.ensuring(Effect.sync(() => setIsDisconnecting(false))),
      ),
    );

    setIsDisconnecting(true);
  }

  return (
    <>
      <div
        className={`bg-surface-raised border border-border flex flex-col p-5 min-h-64 ${
          integration.comingSoon ? "opacity-60" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <ProviderLogo id={integration.id} />
          {isConnected ? (
            <span className="inline-flex items-center border border-foreground/30 px-2 py-0.5 text-xs font-bold uppercase tracking-tight text-foreground leading-none">
              Connected
            </span>
          ) : integration.comingSoon ? (
            <span className="inline-flex items-center border border-border px-2 py-0.5 text-xs font-bold uppercase tracking-tight text-muted-foreground leading-none">
              Coming soon
            </span>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-bold mb-2">{integration.name}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {integration.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          {integration.comingSoon ? (
            <>
              <Button variant="outline" size="sm" disabled>
                Details
              </Button>
              <Button variant="outline" size="sm" disabled>
                Install
              </Button>
            </>
          ) : isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnect(true)}
            >
              Disconnect
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnect(true)}
              >
                Connect
              </Button>
            </>
          )}
        </div>
      </div>

      {!integration.comingSoon && !isConnected && (
        <ConnectDialog
          integration={integration as { id: Provider; name: string }}
          businessId={businessId}
          open={showConnect}
          onOpenChange={setShowConnect}
        />
      )}

      {!integration.comingSoon && isConnected && (
        <ConfirmationDialog
          open={showDisconnect}
          onOpenChange={setShowDisconnect}
          title={`Disconnect ${integration.name}`}
          description={`Are you sure you want to disconnect ${integration.name}? Redemption polling will stop for this provider.`}
          confirmText="Disconnect"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDisconnect}
          isLoading={isDisconnecting}
        />
      )}
    </>
  );
}

function PosContent({ businessId }: { businessId: Id<"businesses"> }) {
  const [filter, setFilter] = useState<FilterTab>("all");

  const connections = useQuery(api.functions.posConnections.getPosConnections, {
    businessId,
  });

  if (connections === undefined) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const connectedIds = new Set(connections.map((c) => c.provider));

  const visible =
    filter === "connected"
      ? INTEGRATIONS.filter((i) => connectedIds.has(i.id as Provider))
      : INTEGRATIONS;

  return (
    <>
      {/* Filter tabs */}
      <div className="flex mb-6">
        {(["all", "connected"] as const).map((tab, i) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-tight border border-border transition-colors ${
              i > 0 ? "border-l-0" : ""
            } ${
              filter === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" ? "All" : "Connected"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No connected integrations yet. Connect a POS provider to start
            syncing redemptions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              isConnected={connectedIds.has(integration.id as Provider)}
              businessId={businessId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PosPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  if (business === null) {
    return (
      <main className="px-8 py-8">
        <BoundaryAlert title="Error" description="Business not found." />
      </main>
    );
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <span className="inline-block bg-foreground text-background px-2 py-1 text-2xl font-bold uppercase tracking-tight leading-none">
          POS Integrations
        </span>
        <p className="text-xs text-muted-foreground mt-2">
          Connect your point-of-sale system to automatically track voucher
          redemptions
        </p>
      </div>

      {businessId ? (
        <PosContent businessId={businessId} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}
    </main>
  );
}
