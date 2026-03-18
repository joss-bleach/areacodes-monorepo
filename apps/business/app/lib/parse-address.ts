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

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    const postcode = parts[parts.length - 1] || "";
    const county = parts[parts.length - 2] || "";
    const townOrCity = parts[parts.length - 3] || "";
    const addressParts = parts.slice(0, parts.length - 3);
    const addressLine1 = addressParts[0] || "";
    const addressLine2 = addressParts.slice(1).join(", ") || "";

    return { addressLine1, addressLine2, townOrCity, county, postcode };
  }

  if (parts.length === 3) {
    return {
      addressLine1: parts[0] || "",
      addressLine2: "",
      townOrCity: parts[1] || "",
      county: "",
      postcode: parts[2] || "",
    };
  }

  if (parts.length === 2) {
    return {
      addressLine1: parts[0] || "",
      addressLine2: "",
      townOrCity: "",
      county: "",
      postcode: parts[1] || "",
    };
  }

  return {
    addressLine1: address,
    addressLine2: "",
    townOrCity: "",
    county: "",
    postcode: "",
  };
}
