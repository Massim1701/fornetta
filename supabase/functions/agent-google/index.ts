import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash";

interface MessageRecord {
  id: string;
  project_id: string;
  sender_type: "agent" | "user";
  sender_id: string | null;
  content: string;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record as MessageRecord | undefined;

    if (!record) {
      return new Response("no record in payload", { status: 200 });
    }

    if (!GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY not configured, skipping");
      return new Response("gemini api key not configured", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: googleAgent } = await supabase
      .from("agents")
      .select("id, name, role")
      .eq("project_id", record.project_id)
      .eq("provider", "google")
      .maybeSingle();

    if (!googleAgent) {
      return new Response("no google agent configured for this project", { status: 200 });
    }

    // Avoid responding to its own messages (loop guard)
    if (record.sender_type === "agent" && record.sender_id === googleAgent.id) {
      return new Response("ignored own message", { status: 200 });
    }

    const { data: history } = await supabase
      .from("messages")
      .select("sender_type, sender_id, content, created_at")
      .eq("project_id", record.project_id)
      .order("created_at", { ascending: true })
      .limit(30);

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, role")
      .eq("project_id", record.project_id);

    const agentsById = new Map((agents ?? []).map((a) => [a.id, a]));

    const transcript = (history ?? [])
      .map((m) => {
        const speaker =
          m.sender_type === "user" ? "Nutzer" : agentsById.get(m.sender_id ?? "")?.name ?? "Agent";
        return `${speaker}: ${m.content}`;
      })
      .join("\n");

    const prompt =
      `Du bist "${googleAgent.name}" (Rolle: ${googleAgent.role}) in einem Multi-Agent-Chat-Projekt ` +
      `namens Fornetta, zusammen mit einem menschlichen Nutzer und weiteren KI-Agenten. ` +
      `Antworte kurz, konkret und hilfreich auf den bisherigen Gesprächsverlauf, auf Deutsch. ` +
      `Gib nur deine Antwort aus, ohne Rollenpräfix.\n\n` +
      `Gesprächsverlauf:\n${transcript}\n\nDeine Antwort:`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error", geminiRes.status, errText);
      return new Response("gemini api error", { status: 200 });
    }

    const geminiJson = await geminiRes.json();
    const replyText: string | undefined = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!replyText) {
      console.error("Empty Gemini reply", JSON.stringify(geminiJson));
      return new Response("empty gemini reply", { status: 200 });
    }

    const { error: insertError } = await supabase.from("messages").insert({
      project_id: record.project_id,
      sender_type: "agent",
      sender_id: googleAgent.id,
      content: replyText,
    });

    if (insertError) {
      console.error("Insert error", insertError);
      return new Response("insert error", { status: 200 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Unhandled error", err);
    return new Response("unhandled error", { status: 200 });
  }
});
