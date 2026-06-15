import { createEnv } from "@t3-oss/env-core";
import {
  betterAuthClientSchema,
  convexClientSchema,
  googlePlacesServerSchema,
} from "@repo/env";

export const env = createEnv({
  server: {
    ...googlePlacesServerSchema,
  },
  clientPrefix: "VITE_",
  client: {
    ...betterAuthClientSchema,
    ...convexClientSchema,
  },
  runtimeEnv: import.meta.env,
});
