// Square OAuth scopes requested during authorization and persisted on the
// connection. Single source of truth so the requested and stored scopes stay
// in sync. See https://developer.squareup.com/docs/oauth-api/square-permissions
export const SQUARE_SCOPES: string[] = [
  "ITEMS_READ",
  "ITEMS_WRITE",
  "ORDERS_READ",
  "MERCHANT_PROFILE_READ",
];
