// Shared helper for calling Lovable AI Gateway from edge functions.
// Server-only — do not import from the client.

export const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export function requireLovableKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/** Map upstream gateway errors to the categories the client renders. */
export function gatewayErrorResponse(status: number, msg: string): Response {
  const body = { error: msg };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}