import { env } from "@/config/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { q } = await request.json();

    if (!q || q.length < 3) {
      return NextResponse.json(
        { error: "Search query must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Geoapify Autocomplete API
    const params = new URLSearchParams({
      apiKey: env.GEOAPIFY_API_KEY,
      text: q,
      limit: "5",
      filter: "countrycode:gb", // Focus on UK addresses
      format: "json",
    });

    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Geoapify API error ${response.status}:`, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          {
            error: "Invalid API key. Please check your Geoapify configuration.",
          },
          { status: 401 }
        );
      }

      throw new Error(`Geoapify API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Transform Geoapify response to match our expected format (include coordinates)
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

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error("Error fetching location suggestions:", error);

    if (error instanceof Error && error.message.includes("401")) {
      return NextResponse.json(
        {
          error: "Invalid API key. Please check your Geoapify configuration.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch location suggestions" },
      { status: 500 }
    );
  }
}
