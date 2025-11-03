import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { caller } from "@/trpc/server";

/**
 * Checks if the user is authenticated.
 * Redirects to /sign-in if not authenticated.
 * @returns The authenticated user's ID
 */
export async function hasAuthentication(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}

/**
 * Checks if the user already has a business.
 * If slug is provided, verifies that the business belongs to the authenticated user.
 * Redirects to /b/[slug] if they have a business (and slug matches if provided).
 * Returns nothing if they don't have a business (allows flow to continue).
 * @param slug Optional slug to verify ownership of a specific business
 */
export async function hasBusiness(slug?: string): Promise<void> {
  const userId = await hasAuthentication();
  
  // If slug is provided, verify that the business belongs to the authenticated user
  if (slug) {
    const business = await caller.business.getBusinessBySlug({ slug });
    if (!business) {
      redirect("/");
    }
    if (business.clerkUserId !== userId) {
      redirect("/");
    }
    return;
  }
  
  // Original behavior: redirect if user has any business
  const businesses = await caller.business.getBusinessByClerkUserId();
  if (businesses && businesses.length > 0) {
    redirect(`/b/${businesses[0].slug}`);
  }
}

/**
 * Checks if the user does NOT have a business.
 * Redirects to /b/[slug] if they have a business.
 * Returns nothing if they don't have a business (allows flow to continue).
 * This is the inverse of hasBusiness() - same behavior but different naming for clarity.
 */
export async function requiresNoBusiness(): Promise<void> {
  await hasBusiness();
}

/**
 * Gets the user's business if it exists.
 * Does not redirect - returns the business or null.
 * @returns The user's business or null if they don't have one
 */
export async function getBusiness() {
  const businesses = await caller.business.getBusinessByClerkUserId();
  return businesses && businesses.length > 0 ? businesses[0] : null;
}

/**
 * Checks if the user is NOT authenticated.
 * Redirects to / if authenticated.
 * Returns nothing if not authenticated (allows flow to continue).
 */
export async function requiresNoAuthentication(): Promise<void> {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }
}
