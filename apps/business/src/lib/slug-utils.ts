/**
 * Extracts the 5-character code from the end of a slug
 * Format: business-name-abc12 -> abc12
 */
export function extractSlugCode(slug: string): string | null {
  const parts = slug.split("-");
  if (parts.length < 2) {
    return null;
  }
  // The last part should be the 5-character code
  const code = parts[parts.length - 1];
  return code.length === 5 ? code : null;
}

/**
 * Updates a slug by slugifying the new name and preserving the existing code
 * Format: old-slug-abc12 + "New Business Name" -> new-business-name-abc12
 */
export function updateSlugWithPreservedCode(
  oldSlug: string,
  newName: string
): string {
  const code = extractSlugCode(oldSlug);
  
  // Slugify the new name (without the code)
  const slugName = newName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // Append the preserved code or generate new one if extraction failed
  if (code) {
    return `${slugName}-${code}`;
  }
  
  // Fallback: generate new slug (this shouldn't happen normally)
  return `${slugName}-${Math.random().toString(36).substring(2, 7)}`;
}

