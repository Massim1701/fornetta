"use client";

import { useState } from "react";
import ChatView from "@/components/ChatView";
import Sidebar from "@/components/Sidebar";
import type { ProjectRow } from "@/lib/types";

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  return (
    <div className="flex h-dvh">
      <Sidebar selectedProjectId={selectedProject?.id ?? null} onSelectProject={setSelectedProject} />
      <ChatView project={selectedProject} />
    </div>
  );
}
