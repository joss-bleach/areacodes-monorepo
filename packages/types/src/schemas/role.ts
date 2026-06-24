import { z } from "zod";

export const roleSchema = z.enum(["customer", "business", "admin"]);
export type Role = z.infer<typeof roleSchema>;
