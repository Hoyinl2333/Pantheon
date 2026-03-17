"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MessageSquare,
  ListTodo,
  RefreshCw,
  ArrowLeft,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

import type { TeamData, TeamSummary } from "@/components/team/types";
import { TeamOverview } from "@/components/team/team-overview";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { MessageBubble, MessageDetailPanel } from "@/components/team/message-panel";
import { TaskKanban } from "@/components/team/task-kanban";

// ---- Main Page ----

function TeamPageInner() {
  const t = useTranslations("team");
  const searchParams = useSearchParams();
  const urlTeamName = searchParams.get("name");

  const [viewMode, setViewMode] = useState<"overview" | "detail">(
    urlTeamName ? "detail" : "overview"
  );
  const [teamList, setTeamList] = useState<TeamSummary | null>(null);
  const [activeTeam, setActiveTeam] = useState("");
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedMsgIdx, setSelectedMsgIdx] = useState<number | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"chat" | "tasks">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const initialTeamSet = useRef(false);

  const fetchTeamList = () => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d: TeamSummary) => {
        setTeamList(d);
        if (!initialTeamSet.current && d.teams.length > 0) {
          if (urlTeamName && d.teams.some((t) => t.name === urlTeamName)) {
            setActiveTeam(urlTeamName);
            setViewMode("detail");
          }
          initialTeamSet.current = true;
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeamList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTeamName]);

  useEffect(() => {
    if (!activeTeam) return;
    setDetailLoading(true);
    const load = (isInitial = false) => {
      fetch(`/api/teams/${activeTeam}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setTeamData(d);
        })
        .catch(() => {})
        .finally(() => {
          if (isInitial) setDetailLoading(false);
        });
    };
    load(true);
    let iv: ReturnType<typeof setInterval> | null = setInterval(() => load(false), 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (iv) { clearInterval(iv); iv = null; }
      } else {
        load();
        iv = setInterval(() => load(false), 30000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (iv) clearInterval(iv);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeTeam]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [teamData?.messages?.length]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!teamList || teamList.teams.length === 0)
    return (
      <div className="text-center py-16">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">{t("noActiveTeams")}</h2>
        <p className="text-muted-foreground mt-1">
          {t("noActiveTeamsHint")}
        </p>
      </div>
    );

  // -- Overview mode --
  if (viewMode === "overview") {
    return (
      <TeamOverview
        teams={teamList.teams}
        onSelectTeam={(name) => {
          setActiveTeam(name);
          setSelectedAgent("");
          setSelectedMsgIdx(null);
          setViewMode("detail");
        }}
        onRefresh={fetchTeamList}
      />
    );
  }

  // -- Detail mode --
  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t("loadingTeam") ?? "Loading team..."}</span>
      </div>
    );
  }

  const tasks = teamData?.tasks || [];
  const messages = teamData?.messages || [];
  const members = teamData?.config?.members || [];
  const memberStatus = teamData?.memberStatus || {};
  const pastMembers = teamData?.pastMembers || [];

  const msgCount: Record<string, number> = {};
  for (const m of messages) {
    msgCount[m.from] = (msgCount[m.from] || 0) + 1;
    if (m.to) msgCount[m.to] = (msgCount[m.to] || 0) + 1;
  }

  const filteredMsgs = selectedAgent
    ? messages.filter((m) => m.from === selectedAgent || m.to === selectedAgent)
    : messages;

  const filteredTasks = selectedAgent === "__unassigned__"
    ? tasks.filter((t) => !t.owner)
    : selectedAgent
      ? tasks.filter((t) => t.owner === selectedAgent)
      : tasks;

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleToggleTask = (taskId: string) => {
    const s = new Set(expandedTasks);
    s.has(taskId) ? s.delete(taskId) : s.add(taskId);
    setExpandedTasks(s);
  };

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left sidebar */}
      <TeamSidebar
        teams={teamList.teams}
        activeTeam={activeTeam}
        onSelectTeam={(name) => {
          setActiveTeam(name);
          setSelectedAgent("");
        }}
        onBackToOverview={() => setViewMode("overview")}
        teamDescription={teamData?.config?.description}
        leadSessionId={teamData?.config?.leadSessionId}
        members={members}
        pastMembers={pastMembers}
        memberStatus={memberStatus}
        tasks={tasks}
        messages={messages}
        completedCount={completedCount}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
        msgCount={msgCount}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b md:hidden">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
            onClick={() => setViewMode("overview")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate">{activeTeam}</span>
          {selectedAgent && (
            <Badge variant="secondary" className="text-xs ml-1">{selectedAgent}</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 w-8 p-0 touch-manipulation"
            onClick={() => setSelectedAgent("")}
            title="Clear filter"
          >
            <Users className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center border-b h-10 px-3 overflow-x-auto">
          {(["chat", "tasks"] as const).map((tab) => (
            <button
              key={tab}
              className={`px-3 h-full text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "chat" ? (
                <>
                  <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
                  {t("messagesTab")} ({filteredMsgs.length})
                </>
              ) : (
                <>
                  <ListTodo className="h-3.5 w-3.5 inline mr-1.5" />
                  {t("tasksTab")} ({filteredTasks.length})
                </>
              )}
            </button>
          ))}
          {selectedAgent && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {selectedAgent}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {t("live")}
          </div>
        </div>

        {/* Content */}
        {activeTab === "chat" ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Message list */}
            <div className={`${selectedMsgIdx !== null ? "w-[55%]" : "flex-1"} overflow-auto relative`} ref={chatScrollRef}>
              {filteredMsgs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t("noMessages")}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredMsgs.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      msg={msg}
                      isSelected={selectedMsgIdx === i}
                      onSelect={() => setSelectedMsgIdx(selectedMsgIdx === i ? null : i)}
                    />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Floating scroll controls */}
              {filteredMsgs.length > 5 && (
                <div className="sticky bottom-4 float-right mr-4 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 shadow-md bg-background"
                    onClick={() =>
                      chatScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                    }
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 shadow-md bg-background"
                    onClick={() =>
                      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <ChevronsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right-side message detail panel */}
            {selectedMsgIdx !== null && filteredMsgs[selectedMsgIdx] && (
              <MessageDetailPanel
                msg={filteredMsgs[selectedMsgIdx]}
                onClose={() => setSelectedMsgIdx(null)}
              />
            )}
          </div>
        ) : (
          <TaskKanban
            filteredTasks={filteredTasks}
            expandedTasks={expandedTasks}
            onToggleTask={handleToggleTask}
          />
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TeamPageInner />
    </Suspense>
  );
}
