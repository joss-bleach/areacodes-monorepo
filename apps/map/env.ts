import { createEnv } from "@t3-oss/env-core";
import { betterAuthClientSchema, convexClientSchema } from "@repo/env";

export const env = createEnv({
  server: {},
  clientPrefix: "VITE_",
  client: {
    ...betterAuthClientSchema,
    ...convexClientSchema,
  },
  runtimeEnv: import.meta.env,
});
