import { createFileRoute } from "@tanstack/react-router";
import { AddBusinessWizard } from "~/components/add-business-wizard/add-business-wizard";

export const Route = createFileRoute("/dashboard/businesses/new")({
  component: AddBusinessWizard,
});
