export function sanitizeAndStringify(input: any): string {
  console.log("🔹 [sanitizeAndStringify] Original Input:", JSON.stringify(input));

  function cleanText(text: string): string {
    const cleaned = text
      .replace(/\s+/g, " ")        // collapse multiple spaces/newlines
      .replace(/[^\x20-\x7E]/g, "")
       // strip non-ASCII chars
       .replace(/[.,!?;:()'"-]/g, "")
      .trim();

    // if (original !== cleaned) {
    //   console.log(`✂️ [cleanText] Modifing string...`);
    // }

    return cleaned;
  }

  function pruneData(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    const entries = Object.entries(obj);
    const filtered = entries.filter(
      ([_, v]) => v != null && v !== "" && v !== "N/A" && v !== "n/a"
    );

    // if (filtered.length < entries.length) {
    //   console.log("🗑️ [pruneData] Some values were pruned!", {
    //     before: obj,
    //     after: Object.fromEntries(filtered),
    //   });
    // }

    return Object.fromEntries(filtered.map(([k, v]) => [k, deepClean(v)]));
  }

  function deepClean(value: any): any {
    if (typeof value === "string") {
      return cleanText(value);
    } else if (Array.isArray(value)) {
      const cleanedArr = value.map(deepClean);
      
      return cleanedArr;
    } else if (value && typeof value === "object") {
      return pruneData(value);
    }
    return value; // keep numbers, booleans, nulls as-is
  }

  const cleaned = deepClean(input);

  console.log("✅ [sanitizeAndStringify] Final Cleaned ");
  return JSON.stringify(cleaned);
}
