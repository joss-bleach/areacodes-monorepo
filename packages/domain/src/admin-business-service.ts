import { Context, Data, Effect } from "effect";
import { BusinessRepo } from "./business-service.js";
import * as BusinessService from "./business-service.js";
import type { CreateBusinessArgs } from "./business-service.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminAddBusinessArgs extends CreateBusinessArgs {
  ownerEmail: string;
}

// ── Typed errors ─────────────────────────────────────────────────────────────

export class AuthAdminError extends Data.TaggedError("AuthAdminError")<{
  message: string;
}> {}

export class EmailError extends Data.TaggedError("EmailError")<{
  message: string;
}> {}

// ── Port interfaces ───────────────────────────────────────────────────────────

export interface IAuthAdminPort {
  readonly createUser: (
    email: string,
    name: string,
  ) => Effect.Effect<string, AuthAdminError>;
}

export class AuthAdminPort extends Context.Tag("@areacodes/domain/AuthAdminPort")<
  AuthAdminPort,
  IAuthAdminPort
>() {}

export interface IEmailPort {
  readonly sendInvitation: (
    to: string,
    businessName: string,
  ) => Effect.Effect<void, EmailError>;
}

export class EmailPort extends Context.Tag("@areacodes/domain/EmailPort")<
  EmailPort,
  IEmailPort
>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const addBusiness = (
  args: AdminAddBusinessArgs,
): Effect.Effect<string, AuthAdminError | EmailError, AuthAdminPort | EmailPort | BusinessRepo> =>
  Effect.gen(function* () {
    const authAdmin = yield* AuthAdminPort;
    const userId = yield* authAdmin.createUser(args.ownerEmail, args.name);

    const businessId = yield* BusinessService.create(userId, args);

    const emailPort = yield* EmailPort;
    yield* emailPort.sendInvitation(args.ownerEmail, args.name);

    return businessId;
  });
