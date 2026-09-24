"use client";

import { useEffect, useState } from "react";
import ChatView from "@/components/ChatView";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase/client";
import type { ProjectRow } from "@/lib/types";

export default function Home() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;

    let cancelled = false;

    async function loadProject() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", selectedProjectId)
        .single();
      if (!cancelled && data) setSelectedProject(data);
    }

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  return (
    <div className="flex h-dvh">
      <Sidebar selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />
      <ChatView
        project={
          selectedProjectId && selectedProject?.id === selectedProjectId ? selectedProject : null
        }
      />
    </div>
  );
}
