import { createEnv } from "@t3-oss/env-core";
import {
  clerkServerSchema,
  clerkClientSchema,
  convexClientSchema,
  geoapifyServerSchema,
} from "@repo/env";

export const env = createEnv({
  server: {
    ...clerkServerSchema,
    ...geoapifyServerSchema,
  },
  clientPrefix: "VITE_",
  client: {
    ...clerkClientSchema,
    ...convexClientSchema,
  },
  runtimeEnv: import.meta.env,
});
