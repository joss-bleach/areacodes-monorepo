import { Alert, AlertDescription, AlertTitle } from "@repo/ui";

interface BoundaryAlertProps {
  title: string;
  description: string;
}

export const BoundaryAlert = ({ title, description }: BoundaryAlertProps) => {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};
