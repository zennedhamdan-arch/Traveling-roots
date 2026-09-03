/**
 * JSON-LD serialization safe for an HTML script context.
 *
 * Escapes <, > and & as short-form Unicode escapes: the output is still
 * exactly the same JSON to a JSON parser, but no string value can terminate
 * the <script> element and inject markup — the classic structured-data XSS.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    // Line separators are legal in JSON strings but illegal in JS string
    // literals — escaped defensively.
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
