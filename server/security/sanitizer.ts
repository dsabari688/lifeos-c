/**
 * Deeply sanitizes values to defend against XSS injections and NoSQL operator injections.
 */
export function deepSanitize(val: any): any {
  if (typeof val === "string") {
    return val
      .trim()
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/javascript:/gi, "") // Neutralize javascript URIs
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  if (typeof val === "object" && val !== null) {
    if (Array.isArray(val)) {
      return val.map(deepSanitize);
    }
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      // Block NoSQL injection (e.g. operators beginning with $)
      const safeKey = key.startsWith("$") ? key.replace(/^\$/, "") : key;
      cleanObj[safeKey] = deepSanitize(val[key]);
    }
    return cleanObj;
  }

  return val;
}
