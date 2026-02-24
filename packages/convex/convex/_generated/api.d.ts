/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_admin from "../functions/admin.js";
import type * as functions_businesses from "../functions/businesses.js";
import type * as functions_explore from "../functions/explore.js";
import type * as functions_industries from "../functions/industries.js";
import type * as functions_vouchers from "../functions/vouchers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/admin": typeof functions_admin;
  "functions/businesses": typeof functions_businesses;
  "functions/explore": typeof functions_explore;
  "functions/industries": typeof functions_industries;
  "functions/vouchers": typeof functions_vouchers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
