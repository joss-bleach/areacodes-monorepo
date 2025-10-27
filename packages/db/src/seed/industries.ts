import { db } from "../database";
import { industries } from "../schema/industries";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Utility function to create URL-friendly slugs
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Use the full UUID as the ID
function extractIdFromUuid(uuid: string): string {
  return uuid;
}

// Industry list provided by user
const industryList = [
  // 🥐 Food & Drink
  { name: "Cafés & Coffee Shops", category: "Food & Drink" },
  { name: "Restaurants", category: "Food & Drink" },
  { name: "Takeaways", category: "Food & Drink" },
  { name: "Bakeries & Patisseries", category: "Food & Drink" },
  { name: "Bars & Pubs", category: "Food & Drink" },
  { name: "Breweries & Distilleries", category: "Food & Drink" },
  { name: "Ice Cream & Dessert Parlours", category: "Food & Drink" },
  { name: "Street Food Vendors", category: "Food & Drink" },
  { name: "Delis & Specialty Food Shops", category: "Food & Drink" },

  // 🛍 Retail & Shopping
  { name: "Vintage & Thrift Stores", category: "Retail & Shopping" },
  { name: "Fashion & Clothing Boutiques", category: "Retail & Shopping" },
  { name: "Record Shops", category: "Retail & Shopping" },
  { name: "Bookshops", category: "Retail & Shopping" },
  { name: "Art Galleries & Print Shops", category: "Retail & Shopping" },
  { name: "Gift Shops & Homeware", category: "Retail & Shopping" },
  { name: "Florists", category: "Retail & Shopping" },
  { name: "Markets & Pop-up Stores", category: "Retail & Shopping" },
  { name: "Pet Shops & Groomers", category: "Retail & Shopping" },

  // 💆 Health, Beauty & Wellness
  { name: "Hair Salons", category: "Health, Beauty & Wellness" },
  { name: "Beauty Salons", category: "Health, Beauty & Wellness" },
  { name: "Spas & Massage Studios", category: "Health, Beauty & Wellness" },
  { name: "Yoga & Pilates Studios", category: "Health, Beauty & Wellness" },
  { name: "Gyms & Fitness Studios", category: "Health, Beauty & Wellness" },
  { name: "Tattoo & Piercing Studios", category: "Health, Beauty & Wellness" },
  {
    name: "Alternative Therapy Clinics",
    category: "Health, Beauty & Wellness",
  },

  // 🎨 Arts, Culture & Experiences
  { name: "Art Studios & Workshops", category: "Arts, Culture & Experiences" },
  { name: "Music Venues", category: "Arts, Culture & Experiences" },
  { name: "Theatres & Comedy Clubs", category: "Arts, Culture & Experiences" },
  {
    name: "Escape Rooms & Activity Venues",
    category: "Arts, Culture & Experiences",
  },
  { name: "Photography Studios", category: "Arts, Culture & Experiences" },
  { name: "Festivals & Pop-Ups", category: "Arts, Culture & Experiences" },

  // 🧑‍💼 Services
  { name: "Coworking Spaces", category: "Services" },
  { name: "Repair Shops", category: "Services" },
  { name: "Tailoring & Alterations", category: "Services" },
  { name: "Dry Cleaners & Launderettes", category: "Services" },
  { name: "Printers & Copy Shops", category: "Services" },
  { name: "Key Cutting & Locksmiths", category: "Services" },
  { name: "Tech & Phone Repair", category: "Services" },

  // 🚲 Lifestyle & Leisure
  { name: "Bike Shops & Rentals", category: "Lifestyle & Leisure" },
  { name: "Surf & Skate Shops", category: "Lifestyle & Leisure" },
  { name: "Hobby & Craft Stores", category: "Lifestyle & Leisure" },
  { name: "Outdoor & Camping Stores", category: "Lifestyle & Leisure" },
  { name: "Toy Shops", category: "Lifestyle & Leisure" },
  { name: "Vintage Furniture & Interiors", category: "Lifestyle & Leisure" },

  // 🏡 Home & Services
  { name: "Interior Design & Decor", category: "Home & Services" },
  { name: "Furniture Makers", category: "Home & Services" },
  { name: "Gardening & Landscaping", category: "Home & Services" },
  { name: "Cleaning Services", category: "Home & Services" },
  { name: "Builders & Handymen", category: "Home & Services" },

  // 🐕 Animal & Pet Care
  { name: "Pet Grooming & Care", category: "Animal & Pet Care" },
  { name: "Veterinary Clinics", category: "Animal & Pet Care" },

  // 🧳 Tourism & Hospitality
  { name: "Hotels & Guesthouses", category: "Tourism & Hospitality" },
  { name: "B&Bs & Boutique Stays", category: "Tourism & Hospitality" },
  { name: "Tour Operators", category: "Tourism & Hospitality" },
  { name: "Seaside Attractions", category: "Tourism & Hospitality" },
];

export async function seedIndustries() {
  console.log("Starting to seed industries...");

  try {
    // Check if industries already exist
    const existingIndustries = await db.select().from(industries);

    if (existingIndustries.length > 0) {
      console.log(
        `Found ${existingIndustries.length} existing industries. Skipping seed.`
      );
      return existingIndustries;
    }

    console.log(`Seeding ${industryList.length} industries...`);

    const results = [];

    // Insert each industry with a slug in name-id format
    for (const industryData of industryList) {
      // Generate a UUID for the industry
      const industryId = randomUUID();
      const slug = `${slugify(industryData.name)}-${industryId}`;

      const [insertedIndustry] = await db
        .insert(industries)
        .values({
          id: industryId,
          name: industryData.name,
          category: industryData.category,
          slug: slug,
        })
        .returning();

      results.push(insertedIndustry);
      console.log(`✓ ${insertedIndustry.name} (${insertedIndustry.slug})`);
    }

    console.log(
      `\nSuccessfully seeded ${results.length} industries across ${new Set(results.map((r) => r.category)).size} categories:`
    );

    // Group by category for better display
    const groupedByCategory = results.reduce(
      (acc, industry) => {
        if (!acc[industry.category]) {
          acc[industry.category] = [];
        }
        acc[industry.category].push(industry);
        return acc;
      },
      {} as Record<string, typeof results>
    );

    Object.entries(groupedByCategory).forEach(([category, industries]) => {
      console.log(`\n${category}:`);
      industries.forEach((industry) => {
        console.log(`  - ${industry.name}`);
      });
    });

    return results;
  } catch (error) {
    console.error("Error seeding industries:", error);
    throw error;
  }
}

export async function updateIndustrySlugs() {
  console.log("Starting to update industry slugs...");

  try {
    // Get all existing industries from the database
    const existingIndustries = await db.select().from(industries);

    if (existingIndustries.length === 0) {
      console.log("No industries found in the database.");
      return [];
    }

    console.log(
      `Found ${existingIndustries.length} existing industries to update.`
    );

    const results = [];

    // Update each industry's slug using its existing ID
    for (const industry of existingIndustries) {
      // Extract the industry ID from the UUID
      const industryId = extractIdFromUuid(industry.id);
      const newSlug = `${slugify(industry.name)}-${industryId}`;

      // Update with the new slug
      const [updatedIndustry] = await db
        .update(industries)
        .set({ slug: newSlug })
        .where(eq(industries.id, industry.id))
        .returning();

      results.push(updatedIndustry);
      console.log(`✓ ${updatedIndustry.name} (${updatedIndustry.slug})`);
    }

    console.log(
      `\nSuccessfully updated ${results.length} industry slugs across ${new Set(results.map((r) => r.category)).size} categories:`
    );

    // Group by category for better display
    const groupedByCategory = results.reduce(
      (acc, industry) => {
        if (!acc[industry.category]) {
          acc[industry.category] = [];
        }
        acc[industry.category].push(industry);
        return acc;
      },
      {} as Record<string, typeof results>
    );

    Object.entries(groupedByCategory).forEach(([category, industries]) => {
      console.log(`\n${category}:`);
      industries.forEach((industry) => {
        console.log(`  - ${industry.name}`);
      });
    });

    return results;
  } catch (error) {
    console.error("Error updating industry slugs:", error);
    throw error;
  }
}

// Run the appropriate function if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === "update-slugs") {
    updateIndustrySlugs()
      .then(() => {
        console.log("Industry slug updates completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Industry slug updates failed:", error);
        process.exit(1);
      });
  } else {
    // Default to seeding
    seedIndustries()
      .then(() => {
        console.log("Industry seeding completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Industry seeding failed:", error);
        process.exit(1);
      });
  }
}
