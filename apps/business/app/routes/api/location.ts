import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { q } = await request.json();

          if (!q || q.length < 3) {
            return new Response(
              JSON.stringify({ error: "Search query must be at least 3 characters" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const apiKey = process.env.GEOAPIFY_API_KEY;
          if (!apiKey) {
            console.error("[location API] GEOAPIFY_API_KEY is not set in process.env");
            return new Response(
              JSON.stringify({ error: "Geoapify API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const params = new URLSearchParams({
            apiKey,
            text: q,
            limit: "5",
            filter: "countrycode:gb",
            format: "json",
          });

          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
          );

          if (!response.ok) {
            if (response.status === 401) {
              return new Response(
                JSON.stringify({ error: "Invalid API key" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
              );
            }
            throw new Error(`Geoapify API error: ${response.status}`);
          }

          const data = await response.json();

          const transformedResults =
            data.results?.map((result: any) => ({
              place_id: result.place_id || result.formatted,
              display_name: result.formatted,
              address: {
                house_number: result.housenumber,
                road: result.street,
                city: result.city,
                county: result.county,
                postcode: result.postcode,
                country: result.country,
              },
              lat: result.lat,
              lon: result.lon,
            })) || [];

          return new Response(JSON.stringify(transformedResults), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[location API] Unexpected error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to fetch location suggestions" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
