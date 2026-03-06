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
  return (
    components.find((c: any) => c.types?.includes(type))?.longText ?? ""
  );
}

async function handleAutocomplete(q: string, apiKey: string) {
  if (!q || q.length < 3) {
    return jsonResponse({ error: "Search query must be at least 3 characters" }, 400);
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
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
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("[location API] Google autocomplete error:", response.status, text);
    return jsonResponse({ error: "Failed to fetch suggestions" }, response.status);
  }

  const data = await response.json();

  const results = (data.suggestions ?? [])
    .filter((s: any) => s.placePrediction)
    .map((s: any) => ({
      place_id: s.placePrediction.placeId,
      display_name: s.placePrediction.text?.text ?? s.placePrediction.structuredFormat?.mainText?.text ?? "",
    }));

  return jsonResponse(results);
}

async function handleDetails(placeId: string, apiKey: string) {
  if (!placeId) {
    return jsonResponse({ error: "placeId is required" }, 400);
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "addressComponents,location,formattedAddress",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("[location API] Google details error:", response.status, text);
    return jsonResponse({ error: "Failed to fetch place details" }, response.status);
  }

  const data = await response.json();
  const components = data.addressComponents ?? [];

  const houseNumber = getComponent(components, "street_number");
  const road = getComponent(components, "route");
  const city =
    getComponent(components, "postal_town") ||
    getComponent(components, "locality");
  const county = getComponent(components, "administrative_area_level_2");
  const postcode = getComponent(components, "postal_code");

  return jsonResponse({
    place_id: placeId,
    display_name: data.formattedAddress ?? "",
    address: {
      house_number: houseNumber,
      road,
      city,
      county,
      postcode,
    },
    lat: data.location?.latitude ?? null,
    lon: data.location?.longitude ?? null,
  });
}

async function handleGeocode(q: string, apiKey: string) {
  if (!q || q.length < 3) {
    return jsonResponse({ error: "Search query must be at least 3 characters" }, 400);
  }

  const params = new URLSearchParams({
    address: q,
    components: "country:GB",
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );

  if (!response.ok) {
    return jsonResponse({ error: "Failed to geocode address" }, response.status);
  }

  const data = await response.json();

  const results = (data.results ?? []).map((r: any) => ({
    lat: r.geometry?.location?.lat ?? null,
    lon: r.geometry?.location?.lng ?? null,
  }));

  return jsonResponse(results);
}

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

          switch (mode) {
            case "autocomplete":
              return await handleAutocomplete(body.q, apiKey);
            case "details":
              return await handleDetails(body.placeId, apiKey);
            case "geocode":
              return await handleGeocode(body.q, apiKey);
            default:
              return jsonResponse({ error: `Unknown mode: ${mode}` }, 400);
          }
        } catch (error) {
          console.error("[location API] Unexpected error:", error);
          return jsonResponse({ error: "Failed to process location request" }, 500);
        }
      },
    },
  },
});
