import { StartClient } from "@tanstack/react-start/client";
import { createRouter } from "./router";
import { hydrateRoot } from "react-dom/client";

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
