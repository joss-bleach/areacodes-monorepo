# Environment Variables Documentation

This document lists all required environment variables for the Areacodes monorepo applications.

## Business App (`apps/business`)

### Server-side Variables
- `DATABASE_URL` - PostgreSQL database connection string
- `CLERK_SECRET_KEY` - Clerk authentication secret key
- `GEOAPIFY_API_KEY` - Geoapify API key for address autocomplete
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (optional, but required for storage operations)

### Client-side Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Clerk sign-in URL path
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` - Fallback redirect URL after sign-in
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` - Fallback redirect URL after sign-up
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key (public)

## Map App (`apps/map`)

### Server-side Variables
- `DATABASE_URL` - PostgreSQL database connection string

## Marketing App (`apps/marketing`)

No environment variables required (static site).

## Production Checklist

Before deploying to production, ensure:

1. ✅ All environment variables are set in your hosting platform (Vercel)
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` is set for business app (required for file uploads)
3. ✅ Database migrations have been run
4. ✅ Clerk authentication is configured with correct redirect URLs
5. ✅ Geoapify API key has sufficient quota for production usage
6. ✅ Update `robots.txt` files with your actual domain URLs
7. ✅ Update OpenGraph `og:url` tags with your production domain

## Security Notes

- Never commit `.env` files to version control
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - keep it secure
- `CLERK_SECRET_KEY` should never be exposed to the client
- All API routes now require authentication (except public tRPC queries)

