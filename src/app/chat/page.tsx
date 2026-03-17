"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatStatusBar } from "@/components/chat/chat-status-bar";
import { ChatWorkspaceBar } from "@/components/chat/chat-workspace-bar";
import { ChatTopBar } from "@/components/chat/chat-top-bar";
import { SessionSearchBar } from "@/components/chat/session-search-bar";
import { ChatMessageArea } from "@/components/chat/chat-message-area";
import { ChatInput } from "@/components/chat/chat-input";
import { SessionStatusFooter } from "@/components/chat/session-status-footer";
import { SplitView } from "@/components/chat/split-view";
import { ArrowDown, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChatPage } from "@/hooks/use-chat-page";

function ChatPageContent() {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const chat = useChatPage(t);

  return (
    <div className="flex -mx-3 sm:-mx-4 lg:-mx-6 -mb-3 sm:-mb-4 lg:-mb-6 -mt-14 sm:-mt-14 lg:-mt-6 h-[calc(100vh)] overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <ChatSidebar
          sessions={chat.sessions}
          selectedKey={chat.selectedSessionKey}
          onSelect={chat.setSelectedSessionKey}
          collapsed={chat.sidebarCollapsed}
          onToggleCollapse={() => chat.setSidebarCollapsed((p) => !p)}
          loading={chat.loadingSessions}
          onNewChat={chat.startNewChat}
          isChatMode={chat.chatMode === "chat"}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatTopBar
          isViewingSession={chat.isViewingSession}
          sessionDetail={chat.sessionDetail}
          isSessionActive={chat.isSessionActive}
          autoRefresh={chat.autoRefresh}
          onToggleAutoRefresh={() => chat.setAutoRefresh(!chat.autoRefresh)}
          showTools={chat.showTools}
          onToggleTools={() => chat.setShowTools(!chat.showTools)}
          onExport={chat.exportAsMarkdown}
          onViewInSessions={chat.handleViewInSessions}
          idCopied={chat.idCopied}
          onCopyId={chat.handleCopyId}
          chatMode={chat.chatMode}
          claudeSessionId={chat.claudeSessionId}
          cliModel={chat.cliModel}
          chatMessagesCount={chat.chatMessages.length}
          t={t}
          tc={tc}
        />

        {chat.isViewingSession && (
          <SessionSearchBar
            convSearch={chat.convSearch}
            onSearchChange={chat.setConvSearch}
            convSearchMatch={chat.convSearchMatch}
            onSearchMatchChange={chat.setConvSearchMatch}
            matchedCount={chat.matchedIndices.length}
            placeholder={t("searchInConversation")}
          />
        )}

        {chat.compareMode && (
          <SplitView
            leftProvider={chat.chatProvider}
            rightProvider={chat.compareRightProvider}
            cwd={chat.chatCwd || undefined}
            permissionMode={chat.permissionMode}
            showTools={chat.showTools}
          />
        )}

        {!chat.compareMode && (
          <div ref={chat.chatContainerRef} onScroll={chat.handleScroll} className="flex-1 overflow-y-auto relative">
            <ChatMessageArea
              loading={chat.loading}
              isViewingSession={chat.isViewingSession}
              chatMode={chat.chatMode}
              claudeSessionId={chat.claudeSessionId}
              chatProvider={chat.chatProvider}
              visibleMessages={chat.visible}
              showTools={chat.showTools}
              convSearchLower={chat.convSearchLower}
              matchedIndices={chat.matchedIndices}
              convSearchMatch={chat.convSearchMatch}
              chatMessages={chat.chatMessages}
              allCommands={chat.allCommands}
              onCommandSelect={chat.handleCommandSelect}
              onSend={chat.handleSend}
              onStartNewChat={chat.startNewChat}
              t={t}
            />
          </div>
        )}

        {!chat.compareMode && chat.chatSending && chat.currentPhase && chat.currentPhase !== "complete" && (
          <ChatStatusBar
            phase={chat.currentPhase}
            elapsedMs={chat.elapsedMs}
            toolName={chat.lastToolName}
            onCancel={chat.chatCancel}
            providerLabel={chat.chatProvider === "codex" ? "Codex" : "Claude"}
          />
        )}

        {chat.isViewingSession && chat.sessionDetail && (
          <SessionStatusFooter
            visibleCount={chat.visible.length}
            totalInputTokens={chat.sessionDetail.totalInputTokens}
            totalOutputTokens={chat.sessionDetail.totalOutputTokens}
            cacheReadTokens={chat.sessionDetail.cacheReadTokens}
            estimatedCost={chat.sessionDetail.estimatedCost}
            t={t}
          />
        )}

        <ChatWorkspaceBar
          cwd={chat.chatCwd}
          onCwdChange={chat.handleCwdChange}
          permissionMode={chat.permissionMode}
          onPermissionModeChange={chat.handlePermissionModeChange}
          provider={chat.chatProvider}
          onProviderChange={chat.handleProviderChange}
          model={chat.chatModel}
          onModelChange={chat.handleModelChange}
          compareMode={chat.compareMode}
          onCompareModeChange={chat.handleCompareModeChange}
          compareDisabled={!chat.availableProviders?.has("codex")}
          disabled={chat.chatSending}
        />

        {!chat.loading && !chat.compareMode && (
          <ChatInput
            chatInput={chat.chatInput}
            onInputChange={chat.setChatInput}
            chatSending={chat.chatSending}
            isViewingSession={chat.isViewingSession}
            showCommandMenu={chat.showCommandMenu}
            allCommands={chat.allCommands}
            cmdMenuIndex={chat.cmdMenuIndex}
            onCmdMenuIndexChange={chat.setCmdMenuIndex}
            onCmdMenuDismiss={() => chat.setCmdMenuDismissed(true)}
            onCommandSelect={chat.handleCommandSelect}
            onSend={() => chat.handleSend()}
            onCancel={chat.chatCancel}
            placeholderContinue={t("continueSession")}
            placeholderNew={t("messagePlaceholder")}
            dropFilesLabel={t("dropFilesHere")}
          />
        )}

        {chat.showScrollButton && (
          <div className="absolute bottom-20 right-8 z-10">
            <Button size="sm" className="rounded-full shadow-lg" onClick={chat.scrollToBottom}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
