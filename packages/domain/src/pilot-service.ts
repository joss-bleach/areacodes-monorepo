import { Context, Effect } from "effect";

// ── Repository interface ──────────────────────────────────────────────────────

export interface IPilotConfigRepo {
  readonly getActiveFeatures: () => Effect.Effect<string[]>;
  readonly setActiveFeatures: (features: string[]) => Effect.Effect<void>;
}

export class PilotConfigRepo extends Context.Tag("@areacodes/domain/PilotConfigRepo")<
  PilotConfigRepo,
  IPilotConfigRepo
>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const getActiveFeatures = (): Effect.Effect<string[], never, PilotConfigRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotConfigRepo;
    return yield* repo.getActiveFeatures();
  });

export const addFeature = (key: string): Effect.Effect<void, never, PilotConfigRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotConfigRepo;
    const features = yield* repo.getActiveFeatures();
    if (!features.includes(key)) {
      yield* repo.setActiveFeatures([...features, key]);
    }
  });

export const removeFeature = (key: string): Effect.Effect<void, never, PilotConfigRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotConfigRepo;
    const features = yield* repo.getActiveFeatures();
    yield* repo.setActiveFeatures(features.filter((f) => f !== key));
  });
