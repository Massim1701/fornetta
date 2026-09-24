"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AgentRow, ProjectRow, Provider } from "@/lib/types";

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectRow) => void;
}

export default function Sidebar({ selectedProjectId, onSelectProject }: SidebarProps) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState("");
  const [newAgentProvider, setNewAgentProvider] = useState<Provider>("anthropic");
  const [creatingAgent, setCreatingAgent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled && data) setProjects(data);
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    let cancelled = false;

    async function loadAgents() {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("project_id", selectedProjectId)
        .order("created_at", { ascending: true });
      if (!cancelled && data) setAgents(data);
    }

    loadAgents();

    const channel = supabase
      .channel(`agents:${selectedProjectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents", filter: `project_id=eq.${selectedProjectId}` },
        () => loadAgents()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedProjectId]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreatingProject(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newProjectName.trim(), description: newProjectDescription.trim() || null })
      .select()
      .single();
    setCreatingProject(false);

    if (!error && data) {
      setProjects((prev) => [data, ...prev]);
      setNewProjectName("");
      setNewProjectDescription("");
      onSelectProject(data);
    }
  }

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !newAgentName.trim() || !newAgentRole.trim()) return;

    setCreatingAgent(true);
    const { error } = await supabase.from("agents").insert({
      project_id: selectedProjectId,
      name: newAgentName.trim(),
      role: newAgentRole.trim(),
      provider: newAgentProvider,
    });
    setCreatingAgent(false);

    if (!error) {
      setNewAgentName("");
      setNewAgentRole("");
    }
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Projekte</h2>
        <ul className="space-y-1">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                onClick={() => onSelectProject(project)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  project.id === selectedProjectId
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
                }`}
              >
                {project.name}
              </button>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-400">Noch keine Projekte</li>
          )}
        </ul>

        <form onSubmit={handleCreateProject} className="mt-3 space-y-2">
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Projektname"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={creatingProject || !newProjectName.trim()}
            className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            + Projekt anlegen
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Agenten</h2>
        {!selectedProjectId && (
          <p className="text-sm text-neutral-400">Wähle zuerst ein Projekt</p>
        )}
        {selectedProjectId && (
          <>
            <ul className="space-y-1">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-xs text-neutral-500">
                    {agent.role} · {agent.provider}
                  </div>
                </li>
              ))}
              {agents.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-400">Noch keine Agenten</li>
              )}
            </ul>

            <form onSubmit={handleCreateAgent} className="mt-3 space-y-2">
              <input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agentenname"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <input
                value={newAgentRole}
                onChange={(e) => setNewAgentRole(e.target.value)}
                placeholder="Rolle (z.B. Architektur)"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <select
                value={newAgentProvider}
                onChange={(e) => setNewAgentProvider(e.target.value as Provider)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
              </select>
              <button
                type="submit"
                disabled={creatingAgent || !newAgentName.trim() || !newAgentRole.trim()}
                className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                + Agent hinzufügen
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}
