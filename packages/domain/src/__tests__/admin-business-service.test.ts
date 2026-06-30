import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  AuthAdminPort,
  EmailPort,
  AuthAdminError,
  EmailError,
  type IAuthAdminPort,
  type IEmailPort,
} from "../admin-business-service.js";
import { BusinessRepo, type IBusinessRepo, type BusinessDoc } from "../business-service.js";
import * as AdminBusinessService from "../admin-business-service.js";

function makeTestAuthAdmin(
  result: { ok: true; userId: string } | { ok: false; message: string },
): IAuthAdminPort {
  return {
    createUser: (_email, _name) =>
      result.ok
        ? Effect.succeed(result.userId)
        : Effect.fail(new AuthAdminError({ message: result.message })),
  };
}

function makeTestEmailPort(
  fail = false,
): { port: IEmailPort; calls: Array<{ to: string; businessName: string }> } {
  const calls: Array<{ to: string; businessName: string }> = [];
  const port: IEmailPort = {
    sendInvitation: (to, businessName) =>
      fail
        ? Effect.fail(new EmailError({ message: "email send failed" }))
        : Effect.sync(() => { calls.push({ to, businessName }); }),
  };
  return { port, calls };
}

function makeTestBusinessRepo(businesses: BusinessDoc[] = []): IBusinessRepo {
  let nextId = 1;
  return {
    findBySlug: (slug) =>
      Effect.succeed(businesses.find((b) => b.slug === slug) ?? null),
    findById: (id) =>
      Effect.succeed(businesses.find((b) => b._id === id) ?? null),
    insert: (data) => {
      const id = `business-${nextId++}`;
      businesses.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
    patch: (_id, _data) => Effect.void,
    findVouchersByBusiness: (_businessId) => Effect.succeed([]),
    patchVoucher: (_id, _data) => Effect.void,
    deleteStorage: (_storageId) => Effect.void,
  };
}

const baseArgs = {
  name: "The Anchor",
  ownerEmail: "owner@theanchor.com",
  description: "A great pub",
  websiteUrl: "https://theanchor.com",
  industryId: "industry-1",
  address: "1 Test St, Brighton",
  latitude: 50.82,
  longitude: -0.14,
};

function makeLayer(
  authAdmin: IAuthAdminPort,
  emailPort: IEmailPort,
  businessRepo: IBusinessRepo,
) {
  return Layer.mergeAll(
    Layer.succeed(AuthAdminPort, authAdmin),
    Layer.succeed(EmailPort, emailPort),
    Layer.succeed(BusinessRepo, businessRepo),
  );
}

describe("AdminBusinessService.addBusiness", () => {
  test("happy path: creates auth user, inserts business, sends invitation email", async () => {
    const authAdmin = makeTestAuthAdmin({ ok: true, userId: "auth-user-1" });
    const { port: emailPort, calls: emailCalls } = makeTestEmailPort();
    const businesses: BusinessDoc[] = [];
    const businessRepo = makeTestBusinessRepo(businesses);

    const result = await Effect.runPromise(
      Effect.provide(
        AdminBusinessService.addBusiness(baseArgs),
        makeLayer(authAdmin, emailPort, businessRepo),
      ),
    );

    expect(result).toBe("business-1");
    expect(businesses[0]).toMatchObject({
      userId: "auth-user-1",
      name: "The Anchor",
      slug: "the-anchor",
    });
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0]).toMatchObject({
      to: "owner@theanchor.com",
      businessName: "The Anchor",
    });
  });

  test("short-circuits with AuthAdminError when user creation fails", async () => {
    const authAdmin = makeTestAuthAdmin({ ok: false, message: "email already exists" });
    const { port: emailPort, calls: emailCalls } = makeTestEmailPort();
    const businesses: BusinessDoc[] = [];
    const businessRepo = makeTestBusinessRepo(businesses);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(AdminBusinessService.addBusiness(baseArgs)),
        makeLayer(authAdmin, emailPort, businessRepo),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("AuthAdminError");
      expect(result.left.message).toBe("email already exists");
    }
    // Business should not have been created
    expect(businesses).toHaveLength(0);
    // Email should not have been sent
    expect(emailCalls).toHaveLength(0);
  });

  test("propagates EmailError when invitation email fails", async () => {
    const authAdmin = makeTestAuthAdmin({ ok: true, userId: "auth-user-2" });
    const { port: emailPort } = makeTestEmailPort(true);
    const businesses: BusinessDoc[] = [];
    const businessRepo = makeTestBusinessRepo(businesses);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(AdminBusinessService.addBusiness(baseArgs)),
        makeLayer(authAdmin, emailPort, businessRepo),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("EmailError");
    }
    // Business WAS created (email failure happens after)
    expect(businesses).toHaveLength(1);
    expect(businesses[0]).toMatchObject({ userId: "auth-user-2" });
  });

  test("applies slugification to business name", async () => {
    const authAdmin = makeTestAuthAdmin({ ok: true, userId: "auth-user-3" });
    const { port: emailPort } = makeTestEmailPort();
    const businesses: BusinessDoc[] = [];
    const businessRepo = makeTestBusinessRepo(businesses);

    await Effect.runPromise(
      Effect.provide(
        AdminBusinessService.addBusiness({ ...baseArgs, name: "The Coffee & Co." }),
        makeLayer(authAdmin, emailPort, businessRepo),
      ),
    );

    expect(businesses[0]?.slug).toBe("the-coffee-co");
  });
});
