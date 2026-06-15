import { z } from "zod";

export const betterAuthServerSchema = {
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  DATABASE_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
};

export const betterAuthClientSchema = {
  VITE_API_URL: z.string().url(),
};

export const convexClientSchema = {
  VITE_CONVEX_URL: z.string().url(),
};

export const convexServerSchema = {
  CONVEX_DEPLOY_KEY: z.string().optional(),
};

export const googlePlacesServerSchema = {
  GOOGLE_PLACES_API_KEY: z.string().min(1),
};
