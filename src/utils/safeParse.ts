export function safeParse(jsonStr: any) {
  try {
    return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    console.error("JSON parse failed:", e);
    return jsonStr;
  }
}