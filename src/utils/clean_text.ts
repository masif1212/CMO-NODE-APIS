export function cleanText(text: any): string {
  if (typeof text !== "string") {
    return String(text ?? ""); // gracefully handle null/undefined/non-strings
  }
  return text
    .replace(/\s+/g, " ")        // collapse multiple spaces/newlines
    .replace(/[^\x20-\x7E]/g, "") // strip non-ASCII chars (emojis, weird unicode)
    .trim();
}

export function deepClean(obj: any): any {
  if (typeof obj === "string") {
    return cleanText(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(deepClean);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deepClean(v)])
    );
  }
  return obj; // numbers, booleans, null stay as-is
}
