import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

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

    if (!OPENAI_API_KEY) {
      console.log("OPENAI_API_KEY not configured, skipping");
      return new Response("openai api key not configured", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: openaiAgent } = await supabase
      .from("agents")
      .select("id, name, role")
      .eq("project_id", record.project_id)
      .eq("provider", "openai")
      .maybeSingle();

    if (!openaiAgent) {
      return new Response("no openai agent configured for this project", { status: 200 });
    }

    // Avoid responding to its own messages (loop guard)
    if (record.sender_type === "agent" && record.sender_id === openaiAgent.id) {
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

    const systemPrompt =
      `Du bist "${openaiAgent.name}" (Rolle: ${openaiAgent.role}) in einem Multi-Agent-Chat-Projekt ` +
      `namens Fornetta, zusammen mit einem menschlichen Nutzer und weiteren KI-Agenten. ` +
      `Antworte kurz, konkret und hilfreich auf den bisherigen Gesprächsverlauf, auf Deutsch. ` +
      `Gib nur deine Antwort aus, ohne Rollenpräfix.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gesprächsverlauf:\n${transcript}\n\nDeine Antwort:` },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI API error", openaiRes.status, errText);
      return new Response("openai api error", { status: 200 });
    }

    const openaiJson = await openaiRes.json();
    const replyText: string | undefined = openaiJson?.choices?.[0]?.message?.content?.trim();

    if (!replyText) {
      console.error("Empty OpenAI reply", JSON.stringify(openaiJson));
      return new Response("empty openai reply", { status: 200 });
    }

    const { error: insertError } = await supabase.from("messages").insert({
      project_id: record.project_id,
      sender_type: "agent",
      sender_id: openaiAgent.id,
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
