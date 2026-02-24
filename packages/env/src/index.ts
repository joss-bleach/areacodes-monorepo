import { z } from "zod";

export const clerkServerSchema = {
  CLERK_SECRET_KEY: z.string().min(1),
};

export const clerkClientSchema = {
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  VITE_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().default("/"),
  VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().default("/"),
};

export const convexClientSchema = {
  VITE_CONVEX_URL: z.string().url(),
};

export const convexServerSchema = {
  CONVEX_DEPLOY_KEY: z.string().optional(),
};

export const geoapifyServerSchema = {
  GEOAPIFY_API_KEY: z.string().min(1),
};
