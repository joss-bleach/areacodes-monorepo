import { createApi } from "@convex-dev/better-auth";
import type { RegisteredMutation, RegisteredQuery } from "convex/server";
import { createAuthOptions } from "./auth";
import schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMutation = RegisteredMutation<"public", any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = RegisteredQuery<"public", any, any>;

const api = createApi(schema, createAuthOptions) as {
  create: AnyMutation;
  findOne: AnyQuery;
  findMany: AnyQuery;
  updateOne: AnyMutation;
  updateMany: AnyMutation;
  deleteOne: AnyMutation;
  deleteMany: AnyMutation;
};

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = api;
