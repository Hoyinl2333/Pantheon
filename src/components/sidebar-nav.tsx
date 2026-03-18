"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  Coins,
  FileEdit,
  Wrench,
  Settings,
  Menu,
  X,
  Keyboard,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  ListOrdered,
  Globe,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { usePluginSidebarItems } from "@/hooks/use-plugins";
import { useTranslations } from "next-intl";
import { useLocale } from "@/i18n/provider";
import type { LucideIcon } from "lucide-react";

const HIDDEN_NAV_KEY = "ptn-hidden-nav-items";
const ORDER_KEY = "ptn-nav-order";

const navItems = [
  { href: "/", labelKey: "overview", icon: LayoutDashboard },
  { href: "/team", labelKey: "teamBoard", icon: Users },
  { href: "/sessions", labelKey: "sessions", icon: Clock },
  { href: "/chat", labelKey: "chat", icon: MessageCircle },
  { href: "/tokens", labelKey: "tokens", icon: Coins },
  { href: "/toolbox", labelKey: "toolbox", icon: Wrench },
  { href: "/queue", labelKey: "queue", icon: ListOrdered },
  { href: "/editor", labelKey: "instructions", icon: FileEdit },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

function loadHiddenItems(): string[] {
  try {
    const saved = localStorage.getItem(HIDDEN_NAV_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHiddenItems(items: string[]) {
  localStorage.setItem(HIDDEN_NAV_KEY, JSON.stringify(items));
}

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(ORDER_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveOrder(order: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

export function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [manageSidebar, setManageSidebar] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const pluginSidebarGroups = usePluginSidebarItems();
  const { locale, setLocale } = useLocale();

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "zh-CN" : "en");
  }, [locale, setLocale]);

  // Persist collapsed state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Load hidden items and custom order from localStorage
  useEffect(() => {
    setHiddenItems(loadHiddenItems());
    setCustomOrder(loadOrder());
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const toggleItemVisibility = useCallback((id: string) => {
    setHiddenItems((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      saveHiddenItems(next);
      return next;
    });
  }, []);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const handleShowHelp = () => {
    document.dispatchEvent(new CustomEvent("toggle-shortcuts-help"));
  };

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Swipe-to-open: detect edge swipe from left
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only capture edge swipes (within 20px of left edge)
      if (touch.clientX < 20 && !isOpen) {
        touchStartXRef.current = touch.clientX;
      }
      // Capture swipes on the sidebar when open
      if (isOpen && sidebarRef.current) {
        touchStartXRef.current = touch.clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartXRef.current;

      // Swipe right from edge to open
      if (!isOpen && deltaX > 60) {
        setIsOpen(true);
        touchStartXRef.current = null;
      }
      // Swipe left to close
      if (isOpen && deltaX < -60) {
        setIsOpen(false);
        touchStartXRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartXRef.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Plugin label i18n map
  const PLUGIN_LABEL_MAP: Record<string, { en: string; zh: string }> = {
    "api-management": { en: "API Keys", zh: "API 密钥" },
    "agent-teams": { en: "Agent Teams", zh: "Agent 团队" },
    "aris-research": { en: "SAGE", zh: "SAGE 研究" },
    "skill-tree": { en: "Skill Tree", zh: "技能树" },
    "daily-briefing": { en: "Daily Briefing", zh: "每日情报" },
  };

  // Build unified flat list of ALL sidebar items, sorted by custom order
  const allItems = useMemo(() => {
    const items: { id: string; href: string; label: string; Icon: LucideIcon; isPlugin: boolean }[] = [];
    for (const item of navItems) {
      items.push({ id: item.href, href: item.href, label: t(item.labelKey), Icon: item.icon, isPlugin: false });
    }
    for (const group of pluginSidebarGroups) {
      for (const sidebarItem of group.items) {
        const href = sidebarItem.path.startsWith("/")
          ? sidebarItem.path
          : `/plugins/${group.pluginId}${sidebarItem.path ? `/${sidebarItem.path}` : ""}`;
        const Icon: LucideIcon = (sidebarItem.icon && typeof sidebarItem.icon !== "string" ? sidebarItem.icon : Puzzle) as LucideIcon;
        const labels = PLUGIN_LABEL_MAP[group.pluginId];
        const label = labels ? (locale === "zh-CN" ? labels.zh : labels.en) : sidebarItem.label;
        items.push({ id: `plugin:${group.pluginId}:${sidebarItem.path}`, href, label, Icon, isPlugin: true });
      }
    }
    // Apply custom order
    if (customOrder.length > 0) {
      const orderMap = new Map(customOrder.map((id, idx) => [id, idx]));
      items.sort((a, b) => {
        const oa = orderMap.get(a.id) ?? 999;
        const ob = orderMap.get(b.id) ?? 999;
        return oa - ob;
      });
    }
    return items;
  }, [pluginSidebarGroups, t, customOrder, locale]);

  const visibleItems = useMemo(() => allItems.filter((item) => !hiddenItems.includes(item.id)), [allItems, hiddenItems]);
  const othersItems = useMemo(() => allItems.filter((item) => hiddenItems.includes(item.id)), [allItems, hiddenItems]);

  const [othersExpanded, setOthersExpanded] = useState(false);

  // Drag-and-drop reorder handler
  const handleDragDrop = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setCustomOrder((prev) => {
      const allIds = allItems.map((i) => i.id);
      const ordered = prev.length > 0
        ? [...prev.filter((x) => allIds.includes(x)), ...allIds.filter((x) => !prev.includes(x))]
        : [...allIds];
      const fromIdx = ordered.indexOf(fromId);
      const toIdx = ordered.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...ordered];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      saveOrder(next);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  }, [allItems]);

  const renderNavLink = (item: (typeof allItems)[0]) => {
    const isActive = item.isPlugin
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsOpen(false)}
        title={collapsed ? item.label : undefined}
        className={`
          flex items-center ${collapsed ? "lg:justify-center" : "gap-3"} gap-3
          ${collapsed ? "lg:px-0 lg:py-2 px-3 py-3" : "px-3 py-3"}
          rounded-md text-sm transition-colors
          min-h-[44px]
          touch-manipulation
          ${isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted active:bg-muted/80"}
        `}
      >
        <item.Icon className="h-5 w-5 flex-shrink-0 lg:h-4 lg:w-4" />
        <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
      </Link>
    );
  };

  const renderManageItem = (item: (typeof allItems)[0]) => {
    const isHidden = hiddenItems.includes(item.id);
    const isDragging = dragId === item.id;
    const isDragOver = dragOverId === item.id && dragId !== item.id;
    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => setDragId(item.id)}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => { e.preventDefault(); if (dragId) handleDragDrop(dragId, item.id); }}
        className={`
          flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm cursor-grab active:cursor-grabbing
          transition-all duration-150
          ${isHidden ? "opacity-40" : ""}
          ${isDragging ? "opacity-30 scale-95" : ""}
          ${isDragOver ? "border-t-2 border-primary" : "border-t-2 border-transparent"}
        `}
      >
        {/* Drag handle */}
        <span className="text-muted-foreground/50 text-[10px] shrink-0 select-none">⠿</span>
        {/* Visibility toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleItemVisibility(item.id); }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
          title={isHidden ? "Show" : "Hide"}
        >
          {isHidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-foreground" />}
        </button>
        <item.Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate flex-1 text-xs">{item.label}</span>
      </div>
    );
  };

  return (
    <>
      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsHelp />

      {/* Mobile Hamburger Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-3 left-3 z-50 lg:hidden h-10 w-10 p-0 touch-manipulation"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-30 lg:hidden
          transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        aria-label="Main navigation"
        className={`
          fixed lg:static
          inset-y-0 left-0
          z-40
          ${collapsed ? "lg:w-14" : "lg:w-56"}
          w-64 max-w-[85vw]
          h-dvh
          border-r
          bg-background
          ${collapsed ? "lg:px-2 lg:py-4 px-4 py-4" : "p-4"}
          flex
          flex-col
          transition-all
          duration-300
          ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className={`font-bold text-lg mb-6 flex items-center ${collapsed ? "lg:justify-center" : "justify-between"} gap-2`}>
          {collapsed ? (
            <>
              {/* On mobile when sidebar is open, show full header even if collapsed on desktop */}
              <div className="lg:hidden flex items-center gap-2 min-w-0">
                <span className="text-xl">⚡</span>
                <span className="truncate">Pantheon</span>
              </div>
              <span className="text-xl hidden lg:block" title="Pantheon">⚡</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">⚡</span>
                <span className="truncate">Pantheon</span>
              </div>
              <NotificationBell />
            </>
          )}
        </div>

        {/* Top manage bar — thin strip above nav */}
        <div className={`flex items-center ${collapsed ? "lg:justify-center" : "justify-between"} px-2 pb-2 ${collapsed && !manageSidebar ? "lg:px-0" : ""}`}>
          {!collapsed && (
            <span className="text-[10px] text-muted-foreground">
              {manageSidebar
                ? (locale === "en" ? "Editing" : "编辑中")
                : `${visibleItems.length} / ${allItems.length}`}
            </span>
          )}
          <button
            onClick={() => setManageSidebar((v) => !v)}
            className={`p-1 rounded transition-colors ${
              manageSidebar
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={manageSidebar
              ? (locale === "en" ? "Done" : "完成")
              : (locale === "en" ? "Manage sidebar" : "管理侧边栏")}
          >
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard navigation" className="space-y-1 flex-1 overflow-y-auto min-h-0">
          {manageSidebar ? (
            /* ── Management mode: all items with Eye toggles ── */
            allItems.map((item) => renderManageItem(item))
          ) : (
            /* ── Normal mode: visible items + Others ── */
            <>
              {visibleItems.map(renderNavLink)}

              {/* Others — hidden items in a collapsible section */}
              {othersItems.length > 0 && (
                <>
                  <button
                    onClick={() => setOthersExpanded((v) => !v)}
                    className={`
                      flex items-center ${collapsed ? "lg:justify-center" : "gap-2"} gap-2
                      w-full px-3 py-2 mt-1
                      text-[11px] text-muted-foreground hover:text-foreground
                      transition-colors rounded-md hover:bg-muted/50
                    `}
                    title={collapsed ? (locale === "en" ? "Others" : "更多") : undefined}
                  >
                    {othersExpanded
                      ? <ChevronDown className="h-3 w-3 shrink-0" />
                      : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <span className={`font-medium ${collapsed ? "lg:hidden" : ""}`}>
                      {locale === "en" ? "Others" : "更多"} ({othersItems.length})
                    </span>
                  </button>
                  {othersExpanded && othersItems.map(renderNavLink)}
                </>
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className={`flex items-center ${collapsed ? "lg:flex-col lg:gap-2 gap-2" : "justify-between"} pt-4 border-t`}>
          {collapsed ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 opacity-70 hover:opacity-100 hidden lg:flex touch-manipulation"
                onClick={toggleCollapsed}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 opacity-70 hover:opacity-100 touch-manipulation"
                onClick={toggleLocale}
                title={locale === "en" ? "Switch to Chinese" : "切换到英文"}
              >
                <Globe className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">v4.5.0</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity touch-manipulation"
                  onClick={handleShowHelp}
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 opacity-70 hover:opacity-100 hidden lg:flex touch-manipulation"
                  onClick={toggleCollapsed}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity touch-manipulation"
                  onClick={toggleLocale}
                  title={locale === "en" ? "Switch to Chinese" : "切换到英文"}
                >
                  <Globe className="h-3.5 w-3.5 mr-0.5" />
                  <span className="text-[10px] font-medium">{locale === "en" ? "EN" : "中"}</span>
                </Button>
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
