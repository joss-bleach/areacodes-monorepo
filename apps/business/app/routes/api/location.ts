import { Effect } from "effect";
import { createFileRoute } from "@tanstack/react-router";

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.error("[location API] GOOGLE_PLACES_API_KEY is not set in process.env");
  }
  return key;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getComponent(components: any[], type: string): string {
  return components.find((c: any) => c.types?.includes(type))?.longText ?? "";
}

const handleAutocomplete = (q: string, apiKey: string): Effect.Effect<Response, Response> =>
  Effect.gen(function* () {
    if (!q || q.length < 3) {
      return yield* Effect.fail(
        jsonResponse({ error: "Search query must be at least 3 characters" }, 400)
      );
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "X-Goog-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: q,
            includedRegionCodes: ["gb"],
            languageCode: "en-GB",
          }),
        }),
      catch: () => jsonResponse({ error: "Failed to fetch suggestions" }, 500),
    });

    if (!response.ok) {
      const text = yield* Effect.promise(() => response.text());
      console.error("[location API] Google autocomplete error:", response.status, text);
      return yield* Effect.fail(
        jsonResponse({ error: "Failed to fetch suggestions" }, response.status)
      );
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => jsonResponse({ error: "Failed to parse response" }, 500),
    });

    const results = (data.suggestions ?? [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        place_id: s.placePrediction.placeId,
        display_name:
          s.placePrediction.text?.text ??
          s.placePrediction.structuredFormat?.mainText?.text ??
          "",
      }));

    return jsonResponse(results);
  });

const handleDetails = (placeId: string, apiKey: string): Effect.Effect<Response, Response> =>
  Effect.gen(function* () {
    if (!placeId) {
      return yield* Effect.fail(jsonResponse({ error: "placeId is required" }, 400));
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "addressComponents,location,formattedAddress",
          },
        }),
      catch: () => jsonResponse({ error: "Failed to fetch place details" }, 500),
    });

    if (!response.ok) {
      const text = yield* Effect.promise(() => response.text());
      console.error("[location API] Google details error:", response.status, text);
      return yield* Effect.fail(
        jsonResponse({ error: "Failed to fetch place details" }, response.status)
      );
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => jsonResponse({ error: "Failed to parse response" }, 500),
    });

    const components = data.addressComponents ?? [];
    const houseNumber = getComponent(components, "street_number");
    const road = getComponent(components, "route");
    const city =
      getComponent(components, "postal_town") || getComponent(components, "locality");
    const county = getComponent(components, "administrative_area_level_2");
    const postcode = getComponent(components, "postal_code");

    return jsonResponse({
      place_id: placeId,
      display_name: data.formattedAddress ?? "",
      address: { house_number: houseNumber, road, city, county, postcode },
      lat: data.location?.latitude ?? null,
      lon: data.location?.longitude ?? null,
    });
  });

const handleGeocode = (q: string, apiKey: string): Effect.Effect<Response, Response> =>
  Effect.gen(function* () {
    if (!q || q.length < 3) {
      return yield* Effect.fail(
        jsonResponse({ error: "Search query must be at least 3 characters" }, 400)
      );
    }

    const params = new URLSearchParams({ address: q, components: "country:GB", key: apiKey });

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`),
      catch: () => jsonResponse({ error: "Failed to geocode address" }, 500),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        jsonResponse({ error: "Failed to geocode address" }, response.status)
      );
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => jsonResponse({ error: "Failed to parse response" }, 500),
    });

    const results = (data.results ?? []).map((r: any) => ({
      lat: r.geometry?.location?.lat ?? null,
      lon: r.geometry?.location?.lng ?? null,
    }));

    return jsonResponse(results);
  });

export const Route = createFileRoute("/api/location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = getApiKey();
          if (!apiKey) {
            return jsonResponse({ error: "Google Places API key not configured" }, 500);
          }

          const body = await request.json();
          const mode = body.mode ?? "autocomplete";

          let handlerEffect: Effect.Effect<Response, Response>;
          switch (mode) {
            case "autocomplete":
              handlerEffect = handleAutocomplete(body.q, apiKey);
              break;
            case "details":
              handlerEffect = handleDetails(body.placeId, apiKey);
              break;
            case "geocode":
              handlerEffect = handleGeocode(body.q, apiKey);
              break;
            default:
              return jsonResponse({ error: `Unknown mode: ${mode}` }, 400);
          }

          return await Effect.runPromise(
            handlerEffect.pipe(Effect.catchAll((errResponse) => Effect.succeed(errResponse)))
          );
        } catch (error) {
          console.error("[location API] Unexpected error:", error);
          return jsonResponse({ error: "Failed to process location request" }, 500);
        }
      },
    },
  },
});
