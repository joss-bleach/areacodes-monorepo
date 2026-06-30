import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { api } from "@repo/convex";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  Label,
} from "@repo/ui";
import { MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { usePilotFeature } from "~/hooks/use-pilot-feature";

type WidgetState = "idle" | "open" | "submitting" | "success" | "error";

export function FeedbackWidget() {
  const isEnabled = usePilotFeature("feedback_widget");
  const [state, setState] = useState<WidgetState>("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const routerState = useRouterState();
  const submitFeedback = useAction(api.functions.feedback.submitFeedback);

  if (!isEnabled) return null;

  const routePath = routerState.location.pathname;

  function openWidget() {
    setFeedbackText("");
    setErrorMessage("");
    setState("open");
  }

  function closeWidget() {
    setState("idle");
    setFeedbackText("");
    setErrorMessage("");
  }

  async function handleSubmit() {
    if (!feedbackText.trim()) return;
    setState("submitting");
    try {
      await submitFeedback({ feedbackText: feedbackText.trim(), routePath });
      setState("success");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setState("error");
    }
  }

  const isOpen = state === "open" || state === "submitting" || state === "success" || state === "error";

  return (
    <>
      <button
        onClick={openWidget}
        aria-label="Give feedback"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg hover:opacity-90 transition-opacity"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeWidget(); }}>
        <DialogContent className="sm:max-w-md">
          {state === "success" ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <DialogHeader>
                <DialogTitle>Thanks for your feedback</DialogTitle>
                <DialogDescription>
                  We've logged it and will take a look. Your input helps us improve the portal.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={closeWidget} className="mt-2">
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Share feedback</DialogTitle>
                <DialogDescription>
                  Tell us what's working, what isn't, or anything you'd like to see. We'll pick this up in our next review.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="feedback-text">Your feedback</Label>
                  <Textarea
                    id="feedback-text"
                    placeholder="What's on your mind?"
                    rows={5}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    disabled={state === "submitting"}
                    className="resize-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted from: <span className="font-mono">{routePath}</span>
                </p>
                {state === "error" && (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                )}
                <div className="flex justify-end gap-2 mt-1">
                  <Button
                    variant="outline"
                    onClick={closeWidget}
                    disabled={state === "submitting"}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!feedbackText.trim() || state === "submitting"}
                  >
                    {state === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting…
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
