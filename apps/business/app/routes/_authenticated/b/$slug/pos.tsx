import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Skeleton,
} from "@repo/ui";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { BusinessNavbar } from "~/components/business-navbar";
import { BoundaryAlert } from "~/components/boundary-alert";
import { ConfirmationDialog } from "~/components/confirmation-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/b/$slug/pos")({
  component: PosSettingsPage,
});

type Provider = "square" | "zettle";

interface ProviderCardProps {
  provider: Provider;
  label: string;
  description: string;
  businessId: Id<"businesses">;
  isConnected: boolean;
}

const ProviderCard = ({
  provider,
  label,
  description,
  businessId,
  isConnected,
}: ProviderCardProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const connectPosProvider = useMutation(
    api.functions.posConnections.connectPosProvider,
  );
  const disconnectPosProvider = useMutation(
    api.functions.posConnections.disconnectPosProvider,
  );

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setIsConnecting(true);
    try {
      await connectPosProvider({ businessId, provider, apiKey: apiKey.trim() });
      setApiKey("");
      toast.success(`${label} connected successfully`);
    } catch {
      toast.error(`Failed to connect ${label}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectPosProvider({ businessId, provider });
      toast.success(`${label} disconnected`);
      setShowDisconnectDialog(false);
    } catch {
      toast.error(`Failed to disconnect ${label}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {label}
                {isConnected ? (
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800 border-green-200"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectDialog(true)}
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardHeader>
        {!isConnected && (
          <CardContent>
            <form onSubmit={handleConnect} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${provider}-api-key`}>API Key</Label>
                <Input
                  id={`${provider}-api-key`}
                  type="password"
                  placeholder={`Enter your ${label} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnecting}
                />
              </div>
              <Button
                type="submit"
                disabled={isConnecting || !apiKey.trim()}
                className="w-fit"
              >
                {isConnecting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Connect {label}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <ConfirmationDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title={`Disconnect ${label}`}
        description={`Are you sure you want to disconnect your ${label} account? Redemption polling will stop for this provider.`}
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDisconnect}
        isLoading={isDisconnecting}
      />
    </>
  );
};

function PosSettingsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, {
    slug,
  });
  const businessId = business?._id as Id<"businesses"> | undefined;

  const connections = useQuery(
    api.functions.posConnections.getPosConnections,
    businessId ? { businessId } : "skip",
  );

  if (business === null) {
    return (
      <BoundaryAlert title="Error" description="Business not found." />
    );
  }

  const isLoading = business === undefined || connections === undefined;

  const isSquareConnected =
    connections?.some((c) => c.provider === "square") ?? false;
  const isZettleConnected =
    connections?.some((c) => c.provider === "zettle") ?? false;

  return (
    <>
      <BusinessNavbar />
      <main className="w-screen py-6">
        <div className="container-app">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              POS Integration
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect your point-of-sale system to automatically track voucher
              redemptions. Redemption counts update daily.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ProviderCard
                provider="square"
                label="Square"
                description="Connect your Square account to sync redemptions from Square Orders."
                businessId={businessId!}
                isConnected={isSquareConnected}
              />
              <ProviderCard
                provider="zettle"
                label="Zettle by PayPal"
                description="Connect your Zettle account to sync redemptions from Zettle purchases."
                businessId={businessId!}
                isConnected={isZettleConnected}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
