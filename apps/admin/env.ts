import { createEnv } from "@t3-oss/env-core";
import {
  clerkServerSchema,
  clerkClientSchema,
  convexClientSchema,
} from "@repo/env";

export const env = createEnv({
  server: { ...clerkServerSchema },
  clientPrefix: "VITE_",
  client: { ...clerkClientSchema, ...convexClientSchema },
  runtimeEnv: import.meta.env,
});
