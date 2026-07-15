import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listNotesTool from "./tools/list-notes";
import getNoteTool from "./tools/get-note";
import createNoteTool from "./tools/create-note";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud
// proxy). Build it from the project ref at build time — a runtime env read
// here would run during the throwaway manifest-extract eval where secrets
// aren't present.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smarthub-mcp",
  title: "SmartHub",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in SmartHub user. Use `whoami` to verify the session, `list_notes` and `get_note` to read the user's personal notes, and `create_note` to add a new note. All tools operate strictly on the authenticated user's own data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listNotesTool, getNoteTool, createNoteTool],
});