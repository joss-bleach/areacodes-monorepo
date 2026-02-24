import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui";

interface BoundaryAlertProps {
  title: string;
  description: string;
}

export const BoundaryAlert = ({ title, description }: BoundaryAlertProps) => {
  return (
    <Alert variant="destructive" className="w-full">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
      </AlertDescription>
    </Alert>
  );
};
