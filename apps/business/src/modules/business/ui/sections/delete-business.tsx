"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter, useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDeleteBusiness } from "@/modules/business/hooks/use-delete-business";

export const DeleteBusiness = () => {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const { isOpen, setIsOpen } = useDeleteBusiness();
  const [confirmText, setConfirmText] = useState("");

  // Load business data to show the business name
  const { data: business } = useSuspenseQuery(
    trpc.business.getBusinessBySlug.queryOptions({ slug })
  );

  const deleteBusinessMutation = useMutation({
    ...trpc.business.delete.mutationOptions({}),
    onSuccess: () => {
      toast.success("Business deleted successfully");
      setIsOpen(false);
      router.push("/");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete business");
      setIsOpen(false);
    },
  });

  const handleDelete = () => {
    if (confirmText !== business?.name) {
      toast.error(`Please type "${business?.name}" to confirm`);
      return;
    }

    deleteBusinessMutation.mutate({ slug });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmText("");
    }
  };

  const isConfirmValid = confirmText === business?.name;

  return (
    <div className="flex flex-col gap-6 mt-6">
      <Card className="rounded-none border-red-500/80 bg-red-500/10">
        <CardHeader>
          <CardTitle className="text-foreground">Danger area</CardTitle>
          <CardDescription className="text-foreground">
            Any action you take in here is irreversible.
          </CardDescription>
          <CardContent className="p-4">
            <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete Business
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-none border-none">
                <DialogHeader>
                  <DialogTitle>Delete Business</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    your business "{business?.name}" and all associated data.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    To confirm, please type{" "}
                    <span className="font-semibold text-foreground">
                      {business?.name}
                    </span>{" "}
                    below:
                  </p>
                  <Input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={business?.name}
                    className="w-full"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setConfirmText("");
                    }}
                    disabled={deleteBusinessMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={
                      !isConfirmValid || deleteBusinessMutation.isPending
                    }
                  >
                    {deleteBusinessMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-2" />
                        Delete Business
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
};
