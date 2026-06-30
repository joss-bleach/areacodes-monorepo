import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  Button,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@repo/ui";
import { AdminNavbar } from "~/components/admin-navbar";
import { RequireAdmin } from "~/components/require-admin";
import { Flag, RotateCcw, Plus, CheckCircle, Clock, Send, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/businesses")({
  component: BusinessesPage,
});

function BusinessesPage() {
  return (
    <RequireAdmin>
      <AdminNavbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Businesses</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all registered businesses
            </p>
          </div>
          <AddBusinessButton />
        </div>
        <BusinessesList />
      </main>
    </RequireAdmin>
  );
}

function AddBusinessButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Add Business
      </Button>
      <AddBusinessDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    postcode?: string;
  };
  lat?: number;
  lon?: number;
}

interface ResolvedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

function AddressAutocomplete({
  onResolve,
}: {
  onResolve: (location: ResolvedLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [resolved, setResolved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) { setSuggestions([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "autocomplete", q: input }),
      });
      const data = await res.json();
      if (res.ok) setSuggestions(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setResolved(null);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = async (suggestion: LocationSuggestion) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setQuery(suggestion.display_name);
    setIsLoadingDetails(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "details", placeId: suggestion.place_id }),
      });
      if (!res.ok) { toast.error("Could not fetch address details"); return; }
      const details: LocationSuggestion = await res.json();
      if (details.lat == null || details.lon == null) {
        toast.error("Could not resolve coordinates for this address");
        return;
      }
      const line1 = [details.address?.house_number, details.address?.road].filter(Boolean).join(" ");
      const formatted = [line1, details.address?.city, details.address?.postcode]
        .filter(Boolean).join(", ") || details.display_name;
      setResolved(formatted);
      onResolve({ address: details.display_name, latitude: Number(details.lat), longitude: Number(details.lon) });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && selectedIndex >= 0) { e.preventDefault(); handleSelect(suggestions[selectedIndex]!); }
    if (e.key === "Escape") { setShowSuggestions(false); }
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing an address…"
          autoComplete="off"
        />
        {(isLoading || isLoadingDetails) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {resolved && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Address resolved — coordinates set automatically
        </p>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border shadow-md overflow-hidden">
          <div className="max-h-52 overflow-y-auto p-1">
            {suggestions.map((s, i) => (
              <div
                key={s.place_id}
                className={`flex cursor-pointer select-none items-center px-2 py-1.5 text-sm transition-colors ${selectedIndex === i ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="truncate">{s.display_name}</span>
              </div>
            ))}
          </div>
          <div className="border-t px-2 py-1.5 text-xs text-muted-foreground text-right">Powered by Google</div>
        </div>
      )}
    </div>
  );
}

interface AddBusinessFormValues {
  name: string;
  ownerEmail: string;
  description: string;
  websiteUrl: string;
  industryId: string;
}

const EMPTY_FORM: AddBusinessFormValues = {
  name: "",
  ownerEmail: "",
  description: "",
  websiteUrl: "",
  industryId: "",
};

function AddBusinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const industries = useQuery(
    api.functions.industries.getAllIndustries,
    isAuthenticated ? {} : "skip",
  );
  const addBusiness = useMutation(api.functions.admin.addBusinessByAdmin);
  const generateUploadUrl = useMutation(api.functions.businesses.generateUploadUrl);

  const [values, setValues] = useState<AddBusinessFormValues>(EMPTY_FORM);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof AddBusinessFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setValues(v => ({ ...v, [field]: e.target.value }));

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_FORM);
      setResolvedLocation(null);
      setLogoFile(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name || !values.ownerEmail || !values.industryId) {
      toast.error("Business name, owner email, and industry are required");
      return;
    }
    if (!resolvedLocation) {
      toast.error("Please select an address from the suggestions to set the location");
      return;
    }

    setIsSubmitting(true);
    try {
      let logoStorageId: Id<"_storage"> | undefined;
      if (logoFile) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });
        if (!response.ok) throw new Error("Logo upload failed");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        logoStorageId = storageId;
      }

      await addBusiness({
        name: values.name,
        ownerEmail: values.ownerEmail,
        description: values.description,
        websiteUrl: values.websiteUrl,
        industryId: values.industryId as Id<"industries">,
        address: resolvedLocation.address,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        logoStorageId,
      });
      toast.success(`Business "${values.name}" created and invitation email sent`);
      handleClose(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-none border-none sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Business</DialogTitle>
          <DialogDescription>
            Create a Pilot Business account. The owner will receive a sign-in invitation by email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-2 space-y-6">

          {/* Essential info */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Business name *</Label>
                <Input id="add-name" value={values.name} onChange={set("name")} placeholder="The Anchor" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Owner email *</Label>
                <Input id="add-email" type="email" value={values.ownerEmail} onChange={set("ownerEmail")} placeholder="owner@business.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-industry">Industry *</Label>
              <Select value={values.industryId} onValueChange={v => setValues(prev => ({ ...prev, industryId: v }))}>
                <SelectTrigger id="add-industry" className="rounded-none">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {(industries ?? []).map(ind => (
                    <SelectItem key={ind._id} value={ind._id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Location */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <AddressAutocomplete onResolve={setResolvedLocation} />
              {!resolvedLocation && (
                <p className="text-xs text-muted-foreground">Select from suggestions — coordinates are resolved automatically.</p>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Optional extras */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Optional</p>
            <div className="space-y-1.5">
              <Label htmlFor="add-description">Description</Label>
              <Textarea id="add-description" value={values.description} onChange={set("description")} placeholder="A short description of the business" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-website">Website URL</Label>
                <Input id="add-website" value={values.websiteUrl} onChange={set("websiteUrl")} placeholder="https://thebusiness.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-logo">Logo</Label>
                <Input id="add-logo" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Business"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy sign-in link"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

const BUSINESS_PORTAL_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(":3002", ":3000").replace("admin.", "business.")
    : "https://business.acbrighton.com";

function BusinessesList() {
  const { isAuthenticated } = useConvexAuth();
  const businesses = useQuery(api.functions.admin.getAllBusinesses, isAuthenticated ? {} : "skip");
  const flagBusiness = useMutation(api.functions.admin.flagBusiness);
  const reinstateBusiness = useMutation(api.functions.admin.reinstateBusiness);
  const resendInvitation = useMutation(api.functions.admin.resendBusinessInvitation);
  const [flagTarget, setFlagTarget] = useState<{ id: Id<"businesses">; name: string } | null>(null);
  const [reinstateTarget, setReinstateTarget] = useState<{ id: Id<"businesses">; name: string } | null>(null);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleFlag = async () => {
    if (!flagTarget) return;
    setIsFlagging(true);
    try {
      await flagBusiness({ businessId: flagTarget.id });
      toast.success(`Business "${flagTarget.name}" has been flagged`);
      setFlagTarget(null);
    } catch {
      toast.error("Failed to flag business");
    } finally {
      setIsFlagging(false);
    }
  };

  const handleReinstate = async () => {
    if (!reinstateTarget) return;
    setIsReinstating(true);
    try {
      await reinstateBusiness({ businessId: reinstateTarget.id });
      toast.success(`Business "${reinstateTarget.name}" has been reinstated`);
      setReinstateTarget(null);
    } catch {
      toast.error("Failed to reinstate business");
    } finally {
      setIsReinstating(false);
    }
  };

  const handleResend = async (id: Id<"businesses">, name: string) => {
    setResendingId(id);
    try {
      await resendInvitation({ businessId: id });
      toast.success(`Invitation resent to ${name}`);
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  if (businesses === undefined) {
    return <BusinessesListLoading />;
  }

  return (
    <>
      <Card className="rounded-none border-none">
        <CardHeader>
          <h2 className="text-lg font-semibold leading-none">All Businesses</h2>
          <CardDescription>{businesses.length} businesses registered</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Industry</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Address</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Invitation</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-muted-foreground">
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  businesses.map(business => (
                    <tr key={business._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {business.logoUrl && (
                            <img src={business.logoUrl} alt={business.name} className="h-8 w-8 object-cover" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{business.name}</div>
                            <div className="text-xs text-muted-foreground">/{business.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {business.industry?.name ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground max-w-[180px] truncate">
                        {business.address}
                      </td>
                      <td className="py-4 px-4">
                        {business.hasLoggedIn ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Logged in
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              Awaiting login
                            </span>
                            {business.invitationSentAt != null && (
                              <span className="text-xs text-muted-foreground">
                                Sent {new Date(business.invitationSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                onClick={() => handleResend(business._id as Id<"businesses">, business.name)}
                                disabled={resendingId === business._id}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <Send className="h-3 w-3" />
                                {resendingId === business._id ? "Sending…" : "Resend"}
                              </button>
                              <span className="text-muted-foreground/40">·</span>
                              <CopyButton text={`${BUSINESS_PORTAL_URL}/sign-in`} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold ${
                          business.flaggedAt !== undefined
                            ? "border-red-500/50 text-red-700 dark:text-red-400"
                            : "border-green-500/50 text-green-700 dark:text-green-400"
                        }`}>
                          {business.flaggedAt !== undefined ? "Flagged" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {business.flaggedAt !== undefined ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20"
                            onClick={() => setReinstateTarget({ id: business._id as Id<"businesses">, name: business.name })}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reinstate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setFlagTarget({ id: business._id as Id<"businesses">, name: business.name })}
                          >
                            <Flag className="h-4 w-4 mr-1" />
                            Flag
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!flagTarget} onOpenChange={open => !open && setFlagTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Flag Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to flag "{flagTarget?.name}"? This will suspend the business and all its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setFlagTarget(null)} disabled={isFlagging} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleFlag} disabled={isFlagging} className="w-full sm:w-auto">
              {isFlagging ? "Flagging..." : "Flag Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reinstateTarget} onOpenChange={open => !open && setReinstateTarget(null)}>
        <DialogContent className="rounded-none border-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reinstate Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to reinstate "{reinstateTarget?.name}"? This will restore the business and its vouchers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReinstateTarget(null)} disabled={isReinstating} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" onClick={handleReinstate} disabled={isReinstating} className="w-full sm:w-auto">
              {isReinstating ? "Reinstating..." : "Reinstate Business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const BusinessesListLoading = () => (
  <Card className="rounded-none border-none">
    <CardHeader>
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-border">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </CardContent>
  </Card>
);
