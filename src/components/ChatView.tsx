"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AgentRow, MessageRow, ProjectRow } from "@/lib/types";

interface ChatViewProps {
  project: ProjectRow | null;
}

export default function ChatView({ project }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [agentsById, setAgentsById] = useState<Record<string, AgentRow>>({});
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project) return;

    let cancelled = false;

    async function loadInitial() {
      const [{ data: agentRows }, { data: messageRows }] = await Promise.all([
        supabase.from("agents").select("*").eq("project_id", project!.id),
        supabase
          .from("messages")
          .select("*")
          .eq("project_id", project!.id)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (agentRows) {
        const map: Record<string, AgentRow> = {};
        for (const agent of agentRows) map[agent.id] = agent;
        setAgentsById(map);
      }
      if (messageRows) setMessages(messageRows);
      setLoadedProjectId(project!.id);
    }

    loadInitial();

    const channel = supabase
      .channel(`messages:${project.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${project.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [project]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !draft.trim()) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      project_id: project.id,
      sender_type: "user",
      sender_id: null,
      content: draft.trim(),
    });
    setSending(false);

    if (!error) setDraft("");
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
        Wähle oder erstelle ein Projekt, um den Chat zu sehen.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-neutral-500">{project.description}</p>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {loadedProjectId !== project.id && (
          <p className="text-sm text-neutral-400">Lade Nachrichten…</p>
        )}
        {loadedProjectId === project.id && messages.map((message) => {
          const agent = message.sender_id ? agentsById[message.sender_id] : null;
          const senderName = message.sender_type === "user" ? "Du" : agent?.name ?? "Unbekannter Agent";
          const senderRole = message.sender_type === "agent" ? agent?.role : null;

          return (
            <div key={message.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{senderName}</span>
                {senderRole && (
                  <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {senderRole}
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {new Date(message.created_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          );
        })}
        {loadedProjectId === project.id && messages.length === 0 && (
          <p className="text-sm text-neutral-400">Noch keine Nachrichten in diesem Projekt.</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nachricht schreiben…"
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
