import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import * as z from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_notes",
  title: "List notes",
  description: "List the signed-in user's SmartHub notes, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max notes to return (default 20)."),
    search: z.string().optional().describe("Optional case-insensitive substring to match against note title."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("pkm_notes")
      .select("id,title,status,updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (search && search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { notes: data ?? [] },
    };
  },
});