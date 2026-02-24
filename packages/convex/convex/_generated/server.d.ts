/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import {
  ActionBuilder,
  AnyComponents,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

/**
 * Define a query in this Convex app's public API.
 *
 * This function is used to define queries that are callable from the client.
 * Use this to build your app's query API.
 */
export declare const query: QueryBuilder<DataModel, "public">;

/**
 * Define a query that is only accessible from other Convex functions (not the client).
 *
 * This function is used to define queries that are NOT callable from the client.
 * Use this to build internal APIs that can be called from other Convex functions.
 */
export declare const internalQuery: QueryBuilder<DataModel, "internal">;

/**
 * Define a mutation in this Convex app's public API.
 *
 * This function is used to define mutations that are callable from the client.
 * Use this to build your app's mutation API.
 */
export declare const mutation: MutationBuilder<DataModel, "public">;

/**
 * Define a mutation that is only accessible from other Convex functions (not the client).
 *
 * This function is used to define mutations that are NOT callable from the client.
 * Use this to build internal APIs that can be called from other Convex functions.
 */
export declare const internalMutation: MutationBuilder<DataModel, "internal">;

/**
 * Define an action in this Convex app's public API.
 *
 * This function is used to define actions that are callable from the client.
 * Use this to build your app's action API.
 */
export declare const action: ActionBuilder<DataModel, "public">;

/**
 * Define an action that is only accessible from other Convex functions (not the client).
 *
 * This function is used to define actions that are NOT callable from the client.
 * Use this to build internal APIs that can be called from other Convex functions.
 */
export declare const internalAction: ActionBuilder<DataModel, "internal">;

/**
 * A set of services for use within Convex query functions.
 *
 * The query context is passed as the first argument to any Convex query
 * function run on the server.
 */
export type QueryCtx = GenericQueryCtx<DataModel>;

/**
 * A set of services for use within Convex mutation functions.
 *
 * The mutation context is passed as the first argument to any Convex mutation
 * function run on the server.
 */
export type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * A set of services for use within Convex action functions.
 *
 * The action context is passed as the first argument to any Convex action
 * function run on the server.
 */
export type ActionCtx = GenericActionCtx<DataModel>;

/**
 * An interface to read from the database within Convex query functions.
 *
 * The database is accessible via the `db` property of the {@link QueryCtx}.
 */
export type DatabaseReader = GenericDatabaseReader<DataModel>;

/**
 * An interface to read from and write to the database within Convex mutation
 * functions.
 *
 * The database is accessible via the `db` property of the {@link MutationCtx}.
 */
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;

/**
 * Define an HTTP action.
 *
 * This function is used to define HTTP actions.
 */
export declare const httpAction: HttpActionBuilder;
