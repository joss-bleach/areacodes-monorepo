import { createEnv } from "@t3-oss/env-core";
import {
  clerkServerSchema,
  clerkClientSchema,
  convexClientSchema,
  googlePlacesServerSchema,
} from "@repo/env";

export const env = createEnv({
  server: {
    ...clerkServerSchema,
    ...googlePlacesServerSchema,
  },
  clientPrefix: "VITE_",
  client: {
    ...clerkClientSchema,
    ...convexClientSchema,
  },
  runtimeEnv: import.meta.env,
});
