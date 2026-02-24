import { mutation, query } from "../_generated/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const getAllIndustries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("industries").collect();
  },
});

const industryList = [
  { name: "Cafés & Coffee Shops", category: "Food & Drink" },
  { name: "Restaurants", category: "Food & Drink" },
  { name: "Takeaways", category: "Food & Drink" },
  { name: "Bakeries & Patisseries", category: "Food & Drink" },
  { name: "Bars & Pubs", category: "Food & Drink" },
  { name: "Breweries & Distilleries", category: "Food & Drink" },
  { name: "Ice Cream & Dessert Parlours", category: "Food & Drink" },
  { name: "Street Food Vendors", category: "Food & Drink" },
  { name: "Delis & Specialty Food Shops", category: "Food & Drink" },
  { name: "Vintage & Thrift Stores", category: "Retail & Shopping" },
  { name: "Fashion & Clothing Boutiques", category: "Retail & Shopping" },
  { name: "Record Shops", category: "Retail & Shopping" },
  { name: "Bookshops", category: "Retail & Shopping" },
  { name: "Art Galleries & Print Shops", category: "Retail & Shopping" },
  { name: "Gift Shops & Homeware", category: "Retail & Shopping" },
  { name: "Florists", category: "Retail & Shopping" },
  { name: "Markets & Pop-up Stores", category: "Retail & Shopping" },
  { name: "Pet Shops & Groomers", category: "Retail & Shopping" },
  { name: "Hair Salons", category: "Health, Beauty & Wellness" },
  { name: "Beauty Salons", category: "Health, Beauty & Wellness" },
  { name: "Spas & Massage Studios", category: "Health, Beauty & Wellness" },
  { name: "Yoga & Pilates Studios", category: "Health, Beauty & Wellness" },
  { name: "Gyms & Fitness Studios", category: "Health, Beauty & Wellness" },
  { name: "Tattoo & Piercing Studios", category: "Health, Beauty & Wellness" },
  { name: "Alternative Therapy Clinics", category: "Health, Beauty & Wellness" },
  { name: "Art Studios & Workshops", category: "Arts, Culture & Experiences" },
  { name: "Music Venues", category: "Arts, Culture & Experiences" },
  { name: "Theatres & Comedy Clubs", category: "Arts, Culture & Experiences" },
  { name: "Escape Rooms & Activity Venues", category: "Arts, Culture & Experiences" },
  { name: "Photography Studios", category: "Arts, Culture & Experiences" },
  { name: "Festivals & Pop-Ups", category: "Arts, Culture & Experiences" },
  { name: "Coworking Spaces", category: "Services" },
  { name: "Repair Shops", category: "Services" },
  { name: "Tailoring & Alterations", category: "Services" },
  { name: "Dry Cleaners & Launderettes", category: "Services" },
  { name: "Printers & Copy Shops", category: "Services" },
  { name: "Key Cutting & Locksmiths", category: "Services" },
  { name: "Tech & Phone Repair", category: "Services" },
  { name: "Bike Shops & Rentals", category: "Lifestyle & Leisure" },
  { name: "Surf & Skate Shops", category: "Lifestyle & Leisure" },
  { name: "Hobby & Craft Stores", category: "Lifestyle & Leisure" },
  { name: "Outdoor & Camping Stores", category: "Lifestyle & Leisure" },
  { name: "Toy Shops", category: "Lifestyle & Leisure" },
  { name: "Vintage Furniture & Interiors", category: "Lifestyle & Leisure" },
  { name: "Interior Design & Decor", category: "Home & Services" },
  { name: "Furniture Makers", category: "Home & Services" },
  { name: "Gardening & Landscaping", category: "Home & Services" },
  { name: "Cleaning Services", category: "Home & Services" },
  { name: "Builders & Handymen", category: "Home & Services" },
  { name: "Pet Grooming & Care", category: "Animal & Pet Care" },
  { name: "Veterinary Clinics", category: "Animal & Pet Care" },
  { name: "Hotels & Guesthouses", category: "Tourism & Hospitality" },
  { name: "B&Bs & Boutique Stays", category: "Tourism & Hospitality" },
  { name: "Tour Operators", category: "Tourism & Hospitality" },
  { name: "Seaside Attractions", category: "Tourism & Hospitality" },
];

export const seedIndustries = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("industries").collect();
    if (existing.length > 0) {
      return { seeded: 0, existing: existing.length };
    }

    let seeded = 0;
    for (const industry of industryList) {
      const slug = slugify(industry.name);
      await ctx.db.insert("industries", {
        name: industry.name,
        category: industry.category,
        slug,
      });
      seeded++;
    }
    return { seeded, existing: 0 };
  },
});
