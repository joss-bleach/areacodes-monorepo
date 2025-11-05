/**
 * Parses a comma-separated address string into separate fields
 * Format: "addressLine1, addressLine2, townOrCity, county, postcode"
 * 
 * Note: This is a best-effort parser. Address formats can vary,
 * so users can manually correct the parsed fields if needed.
 */
export function parseAddress(address: string): {
  addressLine1: string;
  addressLine2: string;
  townOrCity: string;
  county: string;
  postcode: string;
} {
  if (!address || address.trim().length === 0) {
    return {
      addressLine1: "",
      addressLine2: "",
      townOrCity: "",
      county: "",
      postcode: "",
    };
  }

  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  
  // Try to parse based on common UK address format
  // Expected: addressLine1, addressLine2 (optional), townOrCity, county, postcode
  if (parts.length >= 4) {
    // Assume last part is postcode
    const postcode = parts[parts.length - 1] || "";
    
    // Second to last is county
    const county = parts[parts.length - 2] || "";
    
    // Third to last is town/city
    const townOrCity = parts[parts.length - 3] || "";
    
    // Everything before is address lines
    const addressParts = parts.slice(0, parts.length - 3);
    const addressLine1 = addressParts[0] || "";
    const addressLine2 = addressParts.slice(1).join(", ") || "";
    
    return {
      addressLine1,
      addressLine2,
      townOrCity,
      county,
      postcode,
    };
  }
  
  // Fallback: if format doesn't match, put everything in addressLine1
  return {
    addressLine1: address,
    addressLine2: "",
    townOrCity: "",
    county: "",
    postcode: "",
  };
}

