"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  Clock3,
  Command,
  Download,
  FileText,
  Flag,
  FolderKanban,
  Gauge,
  Github,
  Inbox,
  ListTodo,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  X,
  Zap,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { recommendTasks, scoreTask } from "@/lib/planner";
import type {
  AppData,
  DailyPlan,
  Note,
  Priority,
  Project,
  Release,
  Stage,
  Task,
  TaskStatus,
} from "@/lib/types";

type View =
  | "today"
  | "inbox"
  | "projects"
  | "tasks"
  | "calendar"
  | "releases"
  | "memory"
  | "insights"
  | "settings";
const VIEW_HISTORY_KEY = "__devpilot_view";
const isView = (value: unknown): value is View =>
  typeof value === "string" &&
  [
    "today",
    "inbox",
    "projects",
    "tasks",
    "calendar",
    "releases",
    "memory",
    "insights",
    "settings",
  ].includes(value);
const today = () => new Date().toISOString().slice(0, 10);
const id = (prefix = "item") =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
const fmtDate = (s: string) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "No date";
const mins = (n: number) =>
  n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ""}` : `${n}m`;
const statusLabel: Record<TaskStatus, string> = {
  inbox: "Inbox",
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};
const priorityLabel: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
const stageLabel: Record<Stage, string> = {
  planning: "Planning",
  development: "Development",
  testing: "Testing",
  release: "Release",
  maintenance: "Maintenance",
};
const viewMeta: Record<
  View,
  { title: string; subtitle: string; icon: typeof Target }
> = {
  today: {
    title: "Today",
    subtitle: "A realistic plan beats a perfect backlog.",
    icon: Target,
  },
  inbox: {
    title: "Inbox",
    subtitle: "Capture now. Organise when you have the headspace.",
    icon: Inbox,
  },
  projects: {
    title: "Projects",
    subtitle: "Every project, its status, and the next move.",
    icon: FolderKanban,
  },
  tasks: {
    title: "All tasks",
    subtitle: "One searchable view across your entire workload.",
    icon: ListTodo,
  },
  calendar: {
    title: "Calendar",
    subtitle: "Deadlines and effort, without the surprises.",
    icon: CalendarDays,
  },
  releases: {
    title: "Releases",
    subtitle: "Make testing and launch follow-through repeatable.",
    icon: Rocket,
  },
  memory: {
    title: "Project memory",
    subtitle: "Leave yourself a trail back to where you stopped.",
    icon: BookOpen,
  },
  insights: {
    title: "Insights",
    subtitle: "See workload patterns, not just task counts.",
    icon: TrendingUp,
  },
  settings: {
    title: "Settings",
    subtitle: "Make DevPilot work the way you work.",
    icon: Settings,
  },
};
function cx(...s: (string | false | undefined | null)[]) {
  return s.filter(Boolean).join(" ");
}
function emptyWorkspace(): AppData {
  return {
    projects: [],
    tasks: [],
    sessions: [],
    notes: [],
    releases: [],
    plans: {},
    preferences: { availableHours: 4, bufferMinutes: 30 },
  };
}
function getInitialData(): AppData {
  return emptyWorkspace();
}

export default function DevPilot() {
  const [data, setData] = useState<AppData>(getInitialData);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("today");
  const routeHistoryReadyRef = useRef(false);
  const skipRoutePushRef = useRef(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureProject, setCaptureProject] = useState("");
  const [captureStatus, setCaptureStatus] = useState<TaskStatus>("inbox");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(true);
  const [availableHours, setAvailableHours] = useState(4);
  const [bufferMinutes, setBufferMinutes] = useState(30);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [authRecovery, setAuthRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudState, setCloudState] = useState<
    "loading" | "saving" | "synced" | "error" | "conflict"
  >("loading");
  const cloudRevisionRef = useRef<number | null>(null);
  const skipNextAutosaveRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const syncBlockedRef = useRef(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [undoData, setUndoData] = useState<AppData | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState({
    name: "",
    description: "",
    color: "#0F766E",
  });
  const [releaseDraft, setReleaseDraft] = useState({
    projectId: "",
    version: "",
    targetDate: today(),
  });
  const [noteDraft, setNoteDraft] = useState({
    projectId: "",
    title: "",
    content: "",
  });
  const [sessionNote, setSessionNote] = useState("");

  useEffect(() => {
    try {
      // Remove the legacy browser-only workspace and preference keys from the previous build.
      localStorage.removeItem("devpilot-workspace-v1");
      localStorage.removeItem("devpilot-hours");
      localStorage.removeItem("devpilot-buffer");
      // Workspace data is cloud-only. Never hydrate tasks/projects from browser storage.
      const theme = localStorage.getItem("devpilot-theme");
      if (theme) setDark(theme === "dark");
    } catch {
      /* Browser preferences are optional; cloud workspace data is not cached here. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      localStorage.setItem("devpilot-theme", dark ? "dark" : "light");
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    }
  }, [dark, ready]);
  // Keep in-app views in browser history. On mobile/PWA, otherwise the OS Back
  // action can leave the app because view changes only update React state.
  useEffect(() => {
    if (!ready) return;

    const currentState = window.history.state ?? {};
    if (!routeHistoryReadyRef.current) {
      window.history.replaceState(
        { ...currentState, [VIEW_HISTORY_KEY]: view },
        "",
        window.location.href,
      );
      routeHistoryReadyRef.current = true;
      return;
    }

    if (skipRoutePushRef.current) {
      skipRoutePushRef.current = false;
      return;
    }

    if (currentState[VIEW_HISTORY_KEY] !== view) {
      window.history.pushState(
        { ...currentState, [VIEW_HISTORY_KEY]: view },
        "",
        window.location.href,
      );
    }
  }, [view, ready]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const previousView = event.state?.[VIEW_HISTORY_KEY];
      if (!isView(previousView)) return;
      if (previousView === view) return;
      skipRoutePushRef.current = true;
      setView(previousView);
      setMobileNav(false);
      setQuery("");
      setShowSearch(false);
      setAvatarMenuOpen(false);
      setShowCapture(false);
      setShowProjectForm(false);
      setShowReleaseForm(false);
      setShowReview(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [view]);
  useEffect(() => {
    if (!ready || !cloudReady) return;
    setData((d) => {
      const current = d.preferences ?? { availableHours: 4, bufferMinutes: 30 };
      if (
        current.availableHours === availableHours &&
        current.bufferMinutes === bufferMinutes
      )
        return d;
      return { ...d, preferences: { availableHours, bufferMinutes } };
    });
  }, [availableHours, bufferMinutes, ready, cloudReady]);
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      )
        setAvatarMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAvatarMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [avatarMenuOpen]);
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    let alive = true;
    // Read the persisted browser session first. getUser() makes a network
    // request; getSession() avoids an unnecessary round trip during startup.
    // Supabase RLS and the snapshot RPC remain responsible for authorization.
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!alive) return;
        if (error) {
          setUserEmail(null);
          setAuthMessage(
            "Your session could not be loaded. Please sign in again.",
          );
        } else
          setUserEmail(
            session?.user
              ? (session.user.email ?? "Authenticated account")
              : null,
          );
        setAuthChecked(true);
      })
      .catch(() => {
        if (alive) {
          setUserEmail(null);
          setAuthChecked(true);
          setAuthMessage(
            "Unable to verify your session. Check your connection and sign in again.",
          );
        }
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserEmail(
          session?.user
            ? (session.user.email ?? "Authenticated account")
            : null,
        );
        setAuthChecked(true);
        if (event === "PASSWORD_RECOVERY") setAuthRecovery(true);
        if (event === "SIGNED_IN") setCloudReady(false);
        if (!session) {
          setCloudReady(false);
          setData(emptyWorkspace());
          setAuthRecovery(false);
        }
      },
    );
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!ready || !supabase || !userEmail) {
      setCloudReady(false);
      setCloudState("loading");
      return;
    }
    let cancelled = false;
    setCloudReady(false);
    setCloudState("loading");
    syncBlockedRef.current = false;
    skipNextAutosaveRef.current = false;
    cloudRevisionRef.current = null;
    (async () => {
      try {
        // Use the locally persisted session to identify the workspace. The
        // query is still protected by workspace_snapshots RLS, so this is not
        // a substitute for server-side authorization.
        const {
          data: { session },
          error: sessionError,
        } = await supabase!.auth.getSession();
        if (sessionError) throw sessionError;
        const user = session?.user;
        if (!user) throw new Error("No authenticated session. Please sign in again.");
        const { data: snapshot, error } = await supabase!
          .from("workspace_snapshots")
          .select("data,revision")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (snapshot?.data && typeof snapshot.data === "object") {
          const saved = snapshot.data as Partial<AppData>;
          cloudRevisionRef.current = snapshot.revision;
          if (!cancelled) {
            const loaded = {
              ...emptyWorkspace(),
              ...saved,
              projects: saved.projects ?? [],
              tasks: saved.tasks ?? [],
              sessions: saved.sessions ?? [],
              notes: saved.notes ?? [],
              releases: saved.releases ?? [],
              plans: saved.plans ?? {},
              preferences: saved.preferences ?? {
                availableHours: 4,
                bufferMinutes: 30,
              },
            };
            setData(loaded);
            setAvailableHours(loaded.preferences.availableHours);
            setBufferMinutes(loaded.preferences.bufferMinutes);
          }
        } else {
          // A new account starts cleanly; never seed it from another account's browser cache.
          if (!cancelled) {
            setData(emptyWorkspace());
            setAvailableHours(4);
            setBufferMinutes(30);
          }
          const { data: created, error: saveError } = await supabase!.rpc(
            "save_workspace_snapshot",
            { p_data: emptyWorkspace(), p_expected_revision: null },
          );
          if (saveError) throw saveError;
          const createdRow = Array.isArray(created) ? created[0] : created;
          if (!createdRow || typeof createdRow.revision !== "number")
            throw new Error(
              "The initial cloud workspace was saved but its revision could not be confirmed. Reload and try again.",
            );
          cloudRevisionRef.current = createdRow.revision;
        }
        if (!cancelled) {
          // Hydrating the cloud snapshot is not a user edit. Do not immediately
          // write the same workspace back just because loading finished.
          skipNextAutosaveRef.current = true;
          setCloudReady(true);
          setCloudState("synced");
        }
      } catch (error) {
        if (!cancelled) {
          setCloudState("error");
          setAuthMessage(
            error instanceof Error
              ? `Cloud sync issue: ${error.message}`
              : "Cloud sync issue. Check your Supabase setup.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load once for each signed-in account. data is intentionally not a dependency here.
  }, [ready, userEmail]);
  useEffect(() => {
    if (
      !ready ||
      !cloudReady ||
      !supabase ||
      !userEmail ||
      syncBlockedRef.current
    )
      return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    let cancelled = false;
    const snapshotToSave = data;
    const timer = window.setTimeout(() => {
      if (!cancelled) setCloudState("saving");
      // Serialize writes and read the latest revision only when each write reaches the queue.
      // This prevents two quick local edits from racing each other with the same revision.
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (syncBlockedRef.current) return;
          try {
            // The RPC derives the owner from auth.uid() and validates the
            // current token. Avoid a separate getUser() network request for
            // every autosave; the database remains the authorization boundary.
            const { data: result, error } = await supabase!.rpc(
              "save_workspace_snapshot",
              {
                p_data: snapshotToSave,
                p_expected_revision: cloudRevisionRef.current,
              },
            );
            if (error) {
              if (
                error.message.includes("WORKSPACE_CONFLICT") ||
                error.code === "40001"
              ) {
                syncBlockedRef.current = true;
                setCloudState("conflict");
                setAuthMessage(
                  "A newer cloud version exists. Sync has paused to protect your changes. Export a backup, then reload the latest cloud version before continuing.",
                );
                return;
              }
              throw error;
            }
            const row = Array.isArray(result) ? result[0] : result;
            if (!row || typeof row.revision !== "number")
              throw new Error(
                "Cloud save returned no revision. Apply migration 0002 and reload.",
              );
            cloudRevisionRef.current = row.revision;
            if (!cancelled) setCloudState("synced");
          } catch (error) {
            syncBlockedRef.current = true;
            if (!cancelled) {
              setCloudState("error");
              setAuthMessage(
                error instanceof Error
                  ? `Cloud save failed: ${error.message}. Export a backup before reloading.`
                  : "Cloud save failed. Export a backup before reloading.",
              );
            }
          }
        });
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [data, ready, cloudReady, userEmail]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowCapture(true);
      } else if (e.key === "Escape") {
        setShowCapture(false);
        setShowProjectForm(false);
        setShowReleaseForm(false);
        setShowReview(false);
        setShowSearch(false);
        setSelectedTask(null);
      } else if (!typing && e.key.toLowerCase() === "n") setShowCapture(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(""), 3200);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  const plan: DailyPlan = useMemo(() => {
    const date = today();
    return (
      data.plans[date] ?? {
        date,
        availableMinutes: availableHours * 60,
        bufferMinutes,
        taskIds: [],
        estimates: {},
      }
    );
  }, [availableHours, bufferMinutes, data.plans]);
  const recs = useMemo(() => recommendTasks(data, plan), [data, plan]);
  const activeSession = data.sessions.find((s) => !s.endedAt);
  const selected = data.tasks.find((t) => t.id === selectedTask) ?? null;
  const getProject = useCallback(
    (projectId: string | null) => data.projects.find((p) => p.id === projectId),
    [data.projects],
  );
  const updateTask = (taskId: string, patch: Partial<Task>) =>
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
  const moveTask = (taskId: string, status: TaskStatus, beforeTaskId?: string) => {
    setUndoData(data);
    setData((current) => {
      const moving = current.tasks.find((task) => task.id === taskId);
      if (!moving) return current;
      const remaining = current.tasks.filter((task) => task.id !== taskId);
      const moved = { ...moving, status, completedAt: status === "done" ? (moving.completedAt ?? new Date().toISOString()) : undefined };
      const targetIndex = beforeTaskId ? remaining.findIndex((task) => task.id === beforeTaskId && task.status === status) : -1;
      if (targetIndex >= 0) remaining.splice(targetIndex, 0, moved);
      else {
        const lastInColumn = remaining.reduce((last, task, index) => task.status === status ? index + 1 : last, -1);
        remaining.splice(lastInColumn < 0 ? remaining.length : lastInColumn, 0, moved);
      }
      return { ...current, tasks: remaining };
    });
    notify("Task moved · cloud save queued");
  };
  const undoLastChange = () => {
    if (!undoData) return;
    setData(undoData);
    setUndoData(null);
    notify("Last task move undone");
  };
  const updateProject = (projectId: string, patch: Partial<Project>) =>
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch } : p,
      ),
    }));
  const notify = (message: string) => setToast(message);
  const updatePlan = (patch: Partial<DailyPlan>) =>
    setData((d) => ({
      ...d,
      plans: {
        ...d.plans,
        [today()]: { ...(d.plans[today()] ?? plan), ...patch },
      },
    }));
  const addTask = (
    title: string,
    projectId: string | null,
    extra: Partial<Task> = {},
  ) => {
    const task: Task = {
      id: id("task"),
      title: title.trim(),
      description: "",
      projectId,
      parentId: null,
      status: "todo",
      priority: "normal",
      stage: "development",
      dueDate: "",
      estimate: 30,
      impact: 3,
      nextAction: "Define the next concrete action.",
      checklist: [],
      dependsOn: [],
      createdAt: new Date().toISOString(),
      ...extra,
    };
    setData((d) => ({ ...d, tasks: [task, ...d.tasks] }));
    return task;
  };
  const capture = () => {
    if (!captureTitle.trim()) return;
    const t = addTask(captureTitle, captureProject || null, {
      status: captureStatus,
    });
    setCaptureTitle("");
    setCaptureProject("");
    setCaptureStatus("inbox");
    setShowCapture(false);
    notify(captureStatus === "inbox" ? "Added to your inbox" : "Task created");
    if (view === "tasks") setSelectedTask(t.id);
  };
  const addProject = () => {
    if (!projectDraft.name.trim()) return;
    const p: Project = {
      id: id("project"),
      name: projectDraft.name.trim(),
      description: projectDraft.description,
      color: projectDraft.color,
      status: "active",
      lastAction: "Project created",
      nextAction: "Add the first concrete task.",
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, projects: [p, ...d.projects] }));
    setProjectDraft({ name: "", description: "", color: "#0F766E" });
    setShowProjectForm(false);
    setView("projects");
    notify("Project created");
  };
  const addRelease = () => {
    if (!releaseDraft.projectId || !releaseDraft.version.trim()) return;
    const r: Release = {
      id: id("release"),
      projectId: releaseDraft.projectId,
      version: releaseDraft.version.trim(),
      status: "planning",
      targetDate: releaseDraft.targetDate,
      notes: "",
      checklist: [
        { id: id("check"), title: "Confirm scope and version", done: false },
        { id: id("check"), title: "Run automated tests", done: false },
        { id: id("check"), title: "Build and smoke-test release", done: false },
        { id: id("check"), title: "Deploy and verify", done: false },
      ],
    };
    setData((d) => ({ ...d, releases: [r, ...d.releases] }));
    setShowReleaseForm(false);
    setReleaseDraft({ projectId: "", version: "", targetDate: today() });
    notify("Release checklist created");
  };
  const toggleChecklist = (taskId: string, checkId: string) =>
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) =>
                c.id === checkId ? { ...c, done: !c.done } : c,
              ),
            }
          : t,
      ),
    }));
  const toggleReleaseCheck = (releaseId: string, checkId: string) =>
    setData((d) => ({
      ...d,
      releases: d.releases.map((r) =>
        r.id === releaseId
          ? {
              ...r,
              checklist: r.checklist.map((c) =>
                c.id === checkId ? { ...c, done: !c.done } : c,
              ),
            }
          : r,
      ),
    }));
  const startSession = (taskId: string) => {
    if (activeSession) {
      notify("Finish the current focus session first.");
      return;
    }
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === taskId ? { ...t, status: "in_progress" } : t,
      ),
      sessions: [
        {
          id: id("session"),
          taskId,
          startedAt: new Date().toISOString(),
          notes: "",
        },
        ...d.sessions,
      ],
    }));
    setSelectedTask(taskId);
    notify("Focus session started");
  };
  const stopSession = () => {
    if (!activeSession) return;
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) =>
        s.id === activeSession.id
          ? { ...s, endedAt: new Date().toISOString(), notes: sessionNote }
          : s,
      ),
      projects: d.projects.map((p) =>
        p.id === d.tasks.find((t) => t.id === activeSession.taskId)?.projectId
          ? {
              ...p,
              lastAction: `Worked on ${d.tasks.find((t) => t.id === activeSession.taskId)?.title}`,
              nextAction:
                sessionNote ||
                d.tasks.find((t) => t.id === activeSession.taskId)
                  ?.nextAction ||
                "Resume this task",
            }
          : p,
      ),
    }));
    setSessionNote("");
    notify("Session saved. Your context is preserved.");
  };
  const completeTask = (task: Task) => {
    updateTask(task.id, {
      status: "done",
      completedAt: new Date().toISOString(),
    });
    updatePlan({ taskIds: plan.taskIds.filter((x) => x !== task.id) });
    if (selectedTask === task.id) setSelectedTask(null);
    notify("Task completed");
  };
  const addToday = (taskId: string) => {
    if (plan.taskIds.includes(taskId)) return;
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const estimate = task.estimate || 30;
    const used = plan.taskIds.reduce(
      (n, id) =>
        n +
        (plan.estimates[id] ??
          data.tasks.find((t) => t.id === id)?.estimate ??
          30),
      0,
    );
    if (used + estimate > plan.availableMinutes - plan.bufferMinutes) {
      notify(
        "That would exceed your available capacity. Adjust the plan first.",
      );
      return;
    }
    updatePlan({
      taskIds: [...plan.taskIds, taskId],
      estimates: { ...plan.estimates, [taskId]: estimate },
    });
    notify("Added to today");
  };
  const generatePlan = () => {
    const result = recommendTasks(data, {
      ...plan,
      taskIds: [],
      estimates: {},
    });
    updatePlan({
      taskIds: result.tasks.map((t) => t.id),
      estimates: Object.fromEntries(
        result.tasks.map((t) => [t.id, t.estimate || 30]),
      ),
    });
    notify(`Built a ${result.tasks.length}-task plan`);
  };
  const saveNote = () => {
    if (
      !noteDraft.projectId ||
      !noteDraft.title.trim() ||
      !noteDraft.content.trim()
    )
      return;
    const n: Note = {
      id: id("note"),
      projectId: noteDraft.projectId,
      title: noteDraft.title.trim(),
      content: noteDraft.content.trim(),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, notes: [n, ...d.notes] }));
    setNoteDraft({ projectId: "", title: "", content: "" });
    notify("Project note saved");
  };
  const doAuth = async () => {
    if (!supabase) {
      setAuthMessage(
        "Supabase is not configured. Add the project URL and publishable/anon key to .env.local.",
      );
      return;
    }
    if (!authEmail.trim() || !/^\S+@\S+\.\S+$/.test(authEmail.trim())) {
      setAuthMessage("Enter a valid email address.");
      return;
    }
    if (forgotPassword) {
      setAuthBusy(true);
      setAuthMessage("");
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          authEmail.trim(),
          { redirectTo: `${window.location.origin}/` },
        );
        if (error) throw error;
        setAuthMessage(
          "If an account exists for that email, a password reset link will be sent. Check your inbox.",
        );
      } catch (e) {
        setAuthMessage(
          e instanceof Error
            ? e.message
            : "Could not request a password reset.",
        );
      } finally {
        setAuthBusy(false);
      }
      return;
    }
    if (authPassword.length < 8) {
      setAuthMessage("Use a password with at least 8 characters.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const email = authEmail.trim().toLowerCase();
      const result =
        authMode === "signup"
          ? await supabase.auth.signUp({
              email,
              password: authPassword,
              options: { emailRedirectTo: `${window.location.origin}/` },
            })
          : await supabase.auth.signInWithPassword({
              email,
              password: authPassword,
            });
      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session)
        setAuthMessage(
          "Account created. Confirm your email using the link we sent, then return here to sign in.",
        );
      else {
        setAuthMessage("");
        setUserEmail(
          result.data.user
            ? (result.data.user.email ?? "Authenticated account")
            : null,
        );
      }
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  };
  const signInWithGitHub = async () => {
    if (!supabase) {
      setAuthMessage(
        "Supabase is not configured. Add the project URL and publishable/anon key to .env.local.",
      );
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "Could not start GitHub sign-in.",
      );
      setAuthBusy(false);
    }
  };
  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthMessage(`Sign out failed: ${error.message}`);
        return;
      }
    }
    setCloudReady(false);
    syncBlockedRef.current = false;
    cloudRevisionRef.current = null;
    setCloudState("loading");
    setUserEmail(null);
    setData(emptyWorkspace());
    setAuthChecked(true);
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("You have been signed out.");
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devpilot-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup exported");
  };
  const importData = (file: File | null) => {
    if (!file) return;
    if (
      isSupabaseConfigured &&
      userEmail &&
      !window.confirm(
        "Importing replaces this account’s current cloud workspace and will sync that replacement. Export the current workspace first. Continue?",
      )
    )
      return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        if (
          !parsed ||
          !Array.isArray(parsed.projects) ||
          !Array.isArray(parsed.tasks)
        )
          throw new Error("This does not look like a DevPilot backup.");
        setData({
          ...emptyWorkspace(),
          ...parsed,
          projects: parsed.projects,
          tasks: parsed.tasks,
          sessions: parsed.sessions ?? [],
          notes: parsed.notes ?? [],
          releases: parsed.releases ?? [],
          plans: parsed.plans ?? {},
          preferences: parsed.preferences ?? {
            availableHours: 4,
            bufferMinutes: 30,
          },
        });
        setAvailableHours(parsed.preferences?.availableHours ?? 4);
        setBufferMinutes(parsed.preferences?.bufferMinutes ?? 30);
        notify("Backup imported");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Import failed");
      }
    };
    reader.readAsText(file);
  };
  const visibleTasks = useMemo(
    () =>
      data.tasks.filter((t) => {
        const p = getProject(t.projectId);
        const matchesProject =
          selectedProject === "all" || t.projectId === selectedProject;
        const q = query.toLowerCase();
        const matchesQuery =
          !q ||
          [t.title, t.description, t.nextAction, p?.name ?? ""].some((s) =>
            s.toLowerCase().includes(q),
          );
        const matchesView =
          view === "inbox"
            ? t.status === "inbox"
            : view === "tasks"
              ? t.status !== "cancelled"
              : true;
        return matchesProject && matchesQuery && matchesView;
      }),
    [data.tasks, selectedProject, query, view, getProject],
  );
  const projectTaskCounts = (projectId: string) => ({
    open: data.tasks.filter(
      (t) =>
        t.projectId === projectId && !["done", "cancelled"].includes(t.status),
    ).length,
    done: data.tasks.filter(
      (t) => t.projectId === projectId && t.status === "done",
    ).length,
  });
  const overdue = data.tasks.filter(
    (t) =>
      !["done", "cancelled"].includes(t.status) &&
      t.dueDate &&
      t.dueDate < today(),
  );
  const plannedMinutes = plan.taskIds.reduce(
    (n, tid) =>
      n +
      (plan.estimates[tid] ??
        data.tasks.find((t) => t.id === tid)?.estimate ??
        30),
    0,
  );
  const capacity = Math.max(0, plan.availableMinutes - plan.bufferMinutes);
  const setViewAndClose = (v: View) => {
    setView(v);
    setMobileNav(false);
    setQuery("");
  };

  if (!isSupabaseConfigured || !supabase)
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card">
          <div className="auth-brand-lockup">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
            <div>
              <span className="auth-brand">DEVPILOT</span>
              <span className="auth-brand-sub">CLOUD WORKSPACE REQUIRED</span>
            </div>
          </div>
          <div className="auth-intro">
            <h1>Connect your workspace</h1>
            <p>
              DevPilot requires a configured Supabase project. The
              unauthenticated fallback is disabled; no workspace data will be
              loaded or saved in this browser.
            </p>
          </div>
          <div className="alert alert-warning">
            <ShieldCheck size={17} />
            <div>
              <strong>Supabase configuration missing</strong>
              <p>
                Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
                in .env.local, then restart the development server. Never use a
                service-role key in the browser.
              </p>
            </div>
          </div>
        </section>
      </main>
    );

  if (isSupabaseConfigured && authRecovery && userEmail)
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card">
          <div className="auth-brand-lockup">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
            <div>
              <span className="auth-brand">DEVPILOT</span>
              <span className="auth-brand-sub">ACCOUNT SECURITY</span>
            </div>
          </div>
          <div className="auth-intro">
            <span className="auth-eyebrow">
              <ShieldCheck size={14} /> PASSWORD RECOVERY
            </span>
            <h1>Choose a new password</h1>
            <p>
              Use a unique password of at least 8 characters to secure your
              workspace.
            </p>
          </div>
          <form
            className="auth-form auth-gate-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase || recoveryPassword.length < 8) return;
              setAuthBusy(true);
              setAuthMessage("");
              try {
                const { error } = await supabase.auth.updateUser({
                  password: recoveryPassword,
                });
                if (error) throw error;
                setAuthRecovery(false);
                setRecoveryPassword("");
                setAuthMessage("Password updated successfully.");
              } catch (err) {
                setAuthMessage(
                  err instanceof Error
                    ? err.message
                    : "Could not update your password.",
                );
              } finally {
                setAuthBusy(false);
              }
            }}
          >
            <label>
              New password
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={authBusy || recoveryPassword.length < 8}
            >
              {authBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ShieldCheck size={16} />
              )}{" "}
              {authBusy ? "Updating…" : "Update password"}
            </button>
            {authMessage && (
              <p className="form-message" role="status">
                {authMessage}
              </p>
            )}
          </form>
          <div className="auth-security-note">
            <ShieldCheck size={15} />
            <span>
              You&apos;re changing the password for the authenticated account shown
              by the recovery link.
            </span>
          </div>
        </section>
      </main>
    );

  if (isSupabaseConfigured && !authChecked)
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card auth-loading">
          <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
          <span className="auth-brand">DEVPILOT</span>
          <LoaderCircle size={22} className="spin" />
          <p>Verifying your session securely…</p>
        </section>
      </main>
    );
  if (
    isSupabaseConfigured &&
    userEmail &&
    !cloudReady &&
    cloudState !== "error"
  )
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card auth-loading">
          <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
          <span className="auth-brand">DEVPILOT</span>
          <LoaderCircle size={22} className="spin" />
          <h2>Loading your private workspace…</h2>
          <p>
            Your account is verified. We’re retrieving its saved workspace
            before showing any project data.
          </p>
        </section>
      </main>
    );
  if (
    isSupabaseConfigured &&
    userEmail &&
    !cloudReady &&
    cloudState === "error"
  )
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card">
          <div className="auth-brand-lockup">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
            <div>
              <span className="auth-brand">DEVPILOT</span>
              <span className="auth-brand-sub">PRIVATE WORKSPACE</span>
            </div>
          </div>
          <div className="auth-intro">
            <h1>Workspace unavailable</h1>
            <p>
              Your account is authenticated, but DevPilot could not load its
              cloud workspace. We have kept the workspace hidden rather than
              risk showing stale browser data.
            </p>
          </div>
          <p className="form-message" role="alert">
            {authMessage ||
              "Check your connection, Supabase configuration and workspace_snapshots RLS policies."}
          </p>
          <button
            className="btn btn-primary auth-submit"
            onClick={() => void signOut()}
          >
            <LogOut size={16} /> Sign out and try again
          </button>
        </section>
      </main>
    );

  if (isSupabaseConfigured && !userEmail)
    return (
      <main className={cx("auth-shell", dark ? "theme-dark" : "theme-light")}>
        <section className="auth-card">
          <div className="auth-brand-lockup">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} className="auth-logo" />
            <div>
              <span className="auth-brand">DEVPILOT</span>
              <span className="auth-brand-sub">PERSONAL COMMAND CENTRE</span>
            </div>
          </div>
          <div className="auth-intro">
            <span className="auth-eyebrow">
              <ShieldCheck size={14} /> PRIVATE WORKSPACE
            </span>
            <h1>
              {forgotPassword
                ? "Reset your password"
                : authMode === "signin"
                  ? "Welcome back"
                  : "Create your account"}
            </h1>
            <p>
              {forgotPassword
                ? "We’ll send a secure password-reset link to your email."
                : authMode === "signin"
                  ? "Sign in to access your projects, plans and saved work."
                  : "Create your secure account to keep your workspace connected across devices."}
            </p>
          </div>
          <form
            className="auth-form auth-gate-form"
            onSubmit={(e) => {
              e.preventDefault();
              void doAuth();
            }}
          >
            <label>
              Email address
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {!forgotPassword && (
              <label>
                Password
                <input
                  className="field"
                  type="password"
                  autoComplete={
                    authMode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={8}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
            )}
            {!forgotPassword && authMode === "signin" && (
              <button
                type="button"
                className="text-button auth-forgot"
                onClick={() => {
                  setForgotPassword(true);
                  setAuthMessage("");
                }}
              >
                Forgot password?
              </button>
            )}
            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={
                authBusy ||
                !authEmail.trim() ||
                (!forgotPassword && authPassword.length < 8)
              }
            >
              {authBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : forgotPassword ? (
                <ShieldCheck size={16} />
              ) : (
                <LogIn size={16} />
              )}{" "}
              {authBusy
                ? "Please wait…"
                : forgotPassword
                  ? "Send reset link"
                  : authMode === "signin"
                    ? "Sign in securely"
                    : "Create account"}
            </button>
            {!forgotPassword && (
              <>
                <button
                  type="button"
                  className="btn btn-github auth-submit"
                  onClick={() => void signInWithGitHub()}
                  disabled={authBusy}
                >
                  {authBusy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Github size={17} />
                  )}{" "}
                  Continue with GitHub
                </button>
                <div className="auth-divider">
                  <span>OR</span>
                </div>
              </>
            )}
            <button
              type="button"
              className="auth-mode-toggle"
              onClick={() => {
                setForgotPassword(false);
                setAuthMode((v) => (v === "signin" ? "signup" : "signin"));
                setAuthMessage("");
                setAuthPassword("");
              }}
            >
              {forgotPassword
                ? "Back to sign in"
                : authMode === "signin"
                  ? "New to DevPilot? Create an account"
                  : "Already have an account? Sign in"}
            </button>
            {authMessage && (
              <p
                className={cx(
                  "form-message",
                  authMessage.toLowerCase().includes("sent") ||
                    authMessage.toLowerCase().includes("created")
                    ? "success"
                    : "",
                )}
                role="status"
              >
                {authMessage}
              </p>
            )}
          </form>
          <div className="auth-security-note">
            <ShieldCheck size={15} />
           <span>
  Your DevPilot workspace, priorities, and projects are securely accessible
  only when you sign in.
</span>
          </div>
        </section>
        <p className="auth-copyright">DEVPILOT · BUILT FOR FOCUSED WORK</p>
      </main>
    );

  return (
    <main className={cx("app-shell", dark ? "theme-dark" : "theme-light")}>
      <aside className={cx("sidebar", mobileNav && "sidebar-open")}>
        <div className="brand-row">
          <div className="brand-mark brand-logo">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} />
          </div>
          <div className="brand-copy">
            <strong>DevPilot</strong>
            <span>WORKSPACE</span>
          </div>
          <button
            className="icon-btn sidebar-collapse"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="capture-button" onClick={() => setShowCapture(true)}>
          <Plus size={17} />
          <span>Quick capture</span>
          <kbd>⌘ N</kbd>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {(["today", "inbox", "projects", "tasks", "calendar"] as View[]).map(
            (v) => {
              const Icon = viewMeta[v].icon;
              const count =
                v === "inbox"
                  ? data.tasks.filter((t) => t.status === "inbox").length
                  : v === "today"
                    ? plan.taskIds.length
                    : 0;
              return (
                <button
                  key={v}
                  className={cx("nav-item", view === v && "active")}
                  onClick={() => {
                    if (v === "projects") setSelectedProject("all");
                    setViewAndClose(v);
                  }}
                >
                  <Icon size={17} />
                  <span>{viewMeta[v].title}</span>
                  {count > 0 && <span className="nav-count">{count}</span>}
                </button>
              );
            },
          )}
        </nav>
        <div className="nav-label nav-label-row">
          <span>YOUR PROJECTS</span>
          <button
            className="tiny-icon"
            onClick={() => setShowProjectForm(true)}
            aria-label="Add project"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="project-nav">
          {data.projects
            .filter((p) => p.status !== "archived")
            .slice(0, 7)
            .map((p) => (
              <button
                key={p.id}
                className={cx(
                  "project-nav-item",
                  selectedProject === p.id && view === "projects" && "active",
                )}
                onClick={() => {
                  setSelectedProject(p.id);
                  setViewAndClose("projects");
                }}
              >
                <span className="project-dot" style={{ background: p.color }} />
                <span>{p.name}</span>
                <span className="project-mini-count">
                  {projectTaskCounts(p.id).open}
                </span>
              </button>
            ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="nav-label">MANAGE</div>
        <nav className="main-nav">
          {(["releases", "memory", "insights", "settings"] as View[]).map(
            (v) => {
              const Icon = viewMeta[v].icon;
              return (
                <button
                  key={v}
                  className={cx("nav-item", view === v && "active")}
                  onClick={() => {
                    if (v === "projects") setSelectedProject("all");
                    setViewAndClose(v);
                  }}
                >
                  <Icon size={17} />
                  <span>{viewMeta[v].title}</span>
                </button>
              );
            },
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-status">
            <span
              className={cx(
                "status-dot",
                cloudState === "error" || cloudState === "conflict"
                  ? "offline"
                  : "online",
              )}
            />
            <span>
              {cloudState === "loading"
                ? "Loading workspace…"
                : cloudState === "saving"
                  ? "Saving changes…"
                  : cloudState === "error"
                    ? "Sync paused"
                    : cloudState === "conflict"
                      ? "Cloud conflict"
                      : cloudState === "synced"
                        ? "Cloud synced"
                        : "Cloud connected"}
            </span>
          </div>
          <button
            className="profile-row"
            onClick={() => setViewAndClose("settings")}
          >
            <div className="avatar">{userEmail?.[0]?.toUpperCase() ?? "J"}</div>
            <div className="profile-text">
              <strong>{userEmail ?? "Joel’s workspace"}</strong>
              <span>
                {userEmail ? "Connected account" : "Personal workspace"}
              </span>
            </div>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div className="mobile-brand">
              <Image src="/HG.png" alt="" width={1254} height={1254} />
              <strong>DevPilot</strong>
            </div>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{viewMeta[view].title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setShowSearch(true)}
              aria-label="Search anything"
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-btn theme-toggle"
              onClick={() => setDark((v) => !v)}
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="icon-btn notification-btn"
              onClick={() => setShowReview(true)}
              aria-label="Review alerts"
            >
              <Bell size={17} />
              {overdue.length > 0 && <i />}
            </button>
            <div className="avatar-menu-wrap" ref={avatarMenuRef}>
              <button
                className="top-avatar avatar-trigger"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                aria-label="Open account and quick navigation"
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
              >
                {userEmail?.[0]?.toUpperCase() ?? "J"}
              </button>
              {avatarMenuOpen && (
                <div className="avatar-menu" role="menu">
                  <div className="avatar-menu-account">
                    <div className="avatar">
                      {userEmail?.[0]?.toUpperCase() ?? "J"}
                    </div>
                    <div>
                      <strong>{userEmail ?? "Personal workspace"}</strong>
                      <span>Signed-in account</span>
                    </div>
                  </div>
                  <div className="avatar-menu-divider" />
                  <span className="avatar-menu-label">QUICK NAVIGATION</span>
                  {(
                    [
                      { id: "today", label: "Today", icon: Target },
                      { id: "inbox", label: "Inbox", icon: Inbox },
                      { id: "projects", label: "Projects", icon: FolderKanban },
                      { id: "tasks", label: "All tasks", icon: ListTodo },
                      { id: "calendar", label: "Calendar", icon: CalendarDays },
                      { id: "releases", label: "Releases", icon: Rocket },
                      { id: "insights", label: "Insights", icon: TrendingUp },
                      { id: "memory", label: "Project memory", icon: BookOpen },
                      {
                        id: "settings",
                        label: "Settings & account",
                        icon: Settings,
                      },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        role="menuitem"
                        className="avatar-menu-item"
                        onClick={() => {
                          if (item.id === "projects") setSelectedProject("all");
                          setViewAndClose(item.id);
                          setAvatarMenuOpen(false);
                        }}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                        {view === item.id && <Check size={14} />}
                      </button>
                    );
                  })}
                  {userEmail && (
                    <>
                      <div className="avatar-menu-divider" />
                      <button
                        role="menuitem"
                        className="avatar-menu-item avatar-menu-signout"
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          void signOut();
                        }}
                      >
                        <LogOut size={15} />
                        <span>Sign out</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === "today"
                  ? new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "YOUR WORKSPACE"}
              </div>
              <h1>{viewMeta[view].title}</h1>
              <p>{viewMeta[view].subtitle}</p>
            </div>
            <div className="heading-actions">
              {view === "projects" && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowProjectForm(true)}
                >
                  <Plus size={16} /> New project
                </button>
              )}
              {view === "releases" && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowReleaseForm(true)}
                >
                  <Plus size={16} /> New release
                </button>
              )}
              {view === "today" && (
                <button className="btn btn-primary" onClick={generatePlan}>
                  <Sparkles size={16} /> Build my day
                </button>
              )}
              {view === "memory" && (
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    setNoteDraft((n) => ({
                      ...n,
                      projectId: n.projectId || data.projects[0]?.id || "",
                    }))
                  }
                >
                  <Plus size={16} /> New note
                </button>
              )}
            </div>
          </div>
          {view === "today" && (
            <>
              <div className="greeting-banner">
                <div className="greeting-icon">
                  <Sparkles size={20} />
                </div>
                <div className="greeting-copy">
                  <h2>
                    {new Date().getHours() < 12
                      ? "Good morning"
                      : new Date().getHours() < 17
                        ? "Good afternoon"
                        : "Good evening"}
                    , Joel.
                  </h2>
                  <p>
                    Small, focused progress. Let’s keep the mental load
                    manageable.
                  </p>
                </div>
                <div className="greeting-date">
                  <span>FOCUS DATE</span>
                  <strong>
                    {new Date().toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </strong>
                </div>
              </div>
              <div className="stat-grid">
                <StatCard
                  icon={Target}
                  label="Today's plan"
                  value={`${plan.taskIds.length}`}
                  sub="tasks scheduled"
                  tone="teal"
                />
                <StatCard
                  icon={Clock3}
                  label="Planned effort"
                  value={mins(plannedMinutes)}
                  sub={`${mins(capacity)} usable capacity`}
                  tone="blue"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Needs attention"
                  value={`${overdue.length}`}
                  sub="overdue tasks"
                  tone={overdue.length ? "amber" : "green"}
                />
                <StatCard
                  icon={FolderKanban}
                  label="Active projects"
                  value={`${data.projects.filter((p) => p.status === "active").length}`}
                  sub="across your workspace"
                  tone="violet"
                />
              </div>
              {plannedMinutes > capacity && (
                <div className="alert alert-danger">
                  <AlertTriangle size={17} />
                  <div>
                    <strong>Your day is overloaded.</strong>
                    <p>
                      {mins(plannedMinutes - capacity)} over your available
                      time. Remove a task or adjust capacity.
                    </p>
                  </div>
                  <button
                    className="alert-action"
                    onClick={() => setView("calendar")}
                  >
                    Adjust plan <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
              {recs.warnings.length > 0 && (
                <div className="notice-strip">
                  <AlertTriangle size={16} />
                  <div>
                    {recs.warnings.map((w, i) => (
                      <span key={i}>
                        {w}
                        {i < recs.warnings.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setShowReview(true)}>Review</button>
                </div>
              )}
              <div className="today-grid">
                <div className="panel plan-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Your focus plan</h2>
                      <p>Protect the important work first.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("calendar")}
                    >
                      Plan day <ArrowUpRight size={14} />
                    </button>
                  </div>
                  {plan.taskIds.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-illustration">
                        <Target size={25} />
                      </div>
                      <h3>Your day is still open</h3>
                      <p>
                        Let DevPilot suggest a realistic plan from your backlog.
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={generatePlan}
                      >
                        <Sparkles size={15} /> Suggest priorities
                      </button>
                      <button
                        className="text-button centered"
                        onClick={() => setView("tasks")}
                      >
                        Browse all tasks
                      </button>
                    </div>
                  ) : (
                    <div className="plan-list">
                      {plan.taskIds.map((tid, index) => {
                        const task = data.tasks.find((t) => t.id === tid);
                        if (!task) return null;
                        return (
                          <TaskRow
                            key={tid}
                            task={task}
                            project={getProject(task.projectId)}
                            index={index + 1}
                            estimate={plan.estimates[tid] ?? task.estimate}
                            onOpen={() => setSelectedTask(tid)}
                            onComplete={() => completeTask(task)}
                            onStart={() => startSession(tid)}
                            onRemove={() =>
                              updatePlan({
                                taskIds: plan.taskIds.filter((x) => x !== tid),
                              })
                            }
                            active={activeSession?.taskId === tid}
                          />
                        );
                      })}
                    </div>
                  )}
                  <div className="capacity-footer">
                    <div className="capacity-label">
                      <span>Daily capacity</span>
                      <strong>
                        {mins(plannedMinutes)} <span>/ {mins(capacity)}</span>
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={cx(
                          "progress-fill",
                          plannedMinutes > capacity && "over",
                        )}
                        style={{
                          width: `${Math.min(100, capacity ? (plannedMinutes / capacity) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                    <div className="capacity-meta">
                      <span>
                        {Math.max(0, capacity - plannedMinutes)} min remaining
                      </span>
                      <span>{bufferMinutes} min buffer protected</span>
                    </div>
                  </div>
                </div>
                <div className="right-stack">
                  <div className="panel recommendations-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Suggested next</h2>
                        <p>Ranked for impact and urgency.</p>
                      </div>
                      <Sparkles size={17} className="muted-icon" />
                    </div>
                    {recs.tasks
                      .filter((t) => !plan.taskIds.includes(t.id))
                      .slice(0, 3)
                      .map((t) => {
                        const rank = scoreTask(t, data.tasks);
                        return (
                          <button
                            className="suggestion-row"
                            key={t.id}
                            onClick={() => addToday(t.id)}
                          >
                            <div className="suggestion-plus">
                              <Plus size={15} />
                            </div>
                            <div className="suggestion-body">
                              <strong>{t.title}</strong>
                              <span>
                                {getProject(t.projectId)?.name ?? "Personal"} ·{" "}
                                {mins(t.estimate)}
                              </span>
                              <small>{rank.reasons[0]}</small>
                            </div>
                            <span className="score-pill">{rank.score}</span>
                          </button>
                        );
                      })}
                    {recs.tasks.filter((t) => !plan.taskIds.includes(t.id))
                      .length === 0 && (
                      <div className="small-empty">
                        No ready tasks to suggest. Capture something or review
                        your backlog.
                      </div>
                    )}
                    <button
                      className="panel-bottom-link"
                      onClick={() => setView("tasks")}
                    >
                      View backlog <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="panel focus-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Focus session</h2>
                        <p>
                          {activeSession
                            ? "Timer is running"
                            : "One thing at a time."}
                        </p>
                      </div>
                      <div
                        className={cx(
                          "focus-status",
                          activeSession && "running",
                        )}
                      >
                        {activeSession ? <span /> : <Pause size={13} />}{" "}
                        {activeSession ? "ACTIVE" : "READY"}
                      </div>
                    </div>
                    {activeSession ? (
                      <>
                        <div className="active-task-title">
                          {data.tasks.find((t) => t.id === activeSession.taskId)
                            ?.title ?? "Current task"}
                        </div>
                        <SessionClock startedAt={activeSession.startedAt} />
                        <textarea
                          className="field session-notes"
                          placeholder="What did you do? What should happen next?"
                          value={sessionNote}
                          onChange={(e) => setSessionNote(e.target.value)}
                        />
                        <button
                          className="btn btn-primary btn-full"
                          onClick={stopSession}
                        >
                          <Pause size={15} /> Stop & save context
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="focus-empty">
                          <div className="focus-orb">
                            <Timer size={24} />
                          </div>
                          <p>
                            Start a session from any task to capture time and
                            preserve your stopping point.
                          </p>
                        </div>
                        <button
                          className="btn btn-secondary btn-full"
                          onClick={() => setView("tasks")}
                        >
                          Choose a task <ArrowUpRight size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="bottom-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Project pulse</h2>
                      <p>Know which projects need a nudge.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("projects")}
                    >
                      All projects <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="project-pulse-list">
                    {data.projects
                      .filter((p) => p.status === "active")
                      .slice(0, 5)
                      .map((p) => {
                        const c = projectTaskCounts(p.id);
                        const total = c.open + c.done;
                        return (
                          <button
                            key={p.id}
                            className="pulse-row"
                            onClick={() => {
                              setSelectedProject(p.id);
                              setView("projects");
                            }}
                          >
                            <span
                              className="project-dot big"
                              style={{ background: p.color }}
                            />
                            <span className="pulse-name">
                              <strong>{p.name}</strong>
                              <small>
                                {p.nextAction || "No next action set"}
                              </small>
                            </span>
                            <span className="pulse-progress">
                              <span className="progress-track">
                                <span
                                  className="progress-fill"
                                  style={{
                                    width: `${total ? (c.done / total) * 100 : 0}%`,
                                    background: p.color,
                                  }}
                                />
                              </span>
                              <small>{c.open} open</small>
                            </span>
                            <ChevronRight size={15} className="muted-icon" />
                          </button>
                        );
                      })}
                  </div>
                </div>
                <div className="panel review-card">
                  <div className="review-icon">
                    <CheckCheck size={20} />
                  </div>
                  <h2>Close the loop</h2>
                  <p>
                    Give your future self a clean handover. Review what moved,
                    what didn&apos;t, and what comes next.
                  </p>
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={() => setShowReview(true)}
                  >
                    Open daily review <ArrowUpRight size={15} />
                  </button>
                  <div className="review-foot">
                    <ShieldCheck size={14} /> Your progress stays in your
                    workspace
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "inbox" && (
            <>
              <div className="toolbar">
                <div className="inline-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search inbox..."
                  />
                </div>
                <span className="result-count">
                  {visibleTasks.length} items
                </span>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCapture(true)}
                >
                  <Plus size={15} /> Capture task
                </button>
              </div>
              <div className="panel table-panel">
                <div className="table-heading">
                  <span>CAPTURED TASK</span>
                  <span>PROJECT</span>
                  <span>ADDED</span>
                  <span>ACTION</span>
                </div>
                {visibleTasks.length ? (
                  visibleTasks.map((t) => (
                    <div className="table-row" key={t.id}>
                      <button
                        className="task-title-button"
                        onClick={() => setSelectedTask(t.id)}
                      >
                        <span className="task-unchecked">
                          <Circle size={17} />
                        </span>
                        <span>
                          <strong>{t.title}</strong>
                          <small>{t.description || "Needs sorting"}</small>
                        </span>
                      </button>
                      <span className="table-project">
                        {getProject(t.projectId)?.name ?? (
                          <span className="muted-text">Unassigned</span>
                        )}
                      </span>
                      <span className="table-date">
                        {fmtDate(t.createdAt.slice(0, 10))}
                      </span>
                      <div className="row-actions">
                        <button
                          className="icon-btn small"
                          title="Organise task"
                          onClick={() => {
                            setSelectedTask(t.id);
                          }}
                        >
                          <ArrowUpRight size={15} />
                        </button>
                        <button
                          className="icon-btn small"
                          title="Add to today"
                          onClick={() => {
                            updateTask(t.id, { status: "todo" });
                            addToday(t.id);
                          }}
                        >
                          {" "}
                          <Target size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title="Your inbox is clear"
                    text="Capture a thought before it slips away."
                    action="Capture a task"
                    onAction={() => setShowCapture(true)}
                  />
                )}
              </div>
            </>
          )}

          {view === "projects" && (
            <>
              <div className="toolbar">
                <div className="inline-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a project..."
                  />
                </div>
                <select
                  className="select-field compact"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">All projects</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowProjectForm(true)}
                >
                  <Plus size={15} /> New project
                </button>
              </div>
              <div className="project-grid">
                {data.projects
                  .filter(
                    (p) =>
                      (selectedProject === "all" || p.id === selectedProject) &&
                      (p.name.toLowerCase().includes(query.toLowerCase()) ||
                        p.description
                          .toLowerCase()
                          .includes(query.toLowerCase())) &&
                      p.status !== "archived",
                  )
                  .map((p) => {
                    const c = projectTaskCounts(p.id);
                    const tasks = data.tasks.filter(
                      (t) => t.projectId === p.id,
                    );
                    const completion =
                      c.open + c.done
                        ? Math.round((c.done / (c.open + c.done)) * 100)
                        : 0;
                    return (
                      <article className="project-card" key={p.id}>
                        <div className="project-card-top">
                          <div
                            className="project-symbol"
                            style={{
                              background: `${p.color}20`,
                              color: p.color,
                            }}
                          >
                            <FolderKanban size={21} />
                          </div>
                          <button
                            className="icon-btn small"
                            onClick={() =>
                              updateProject(p.id, {
                                status:
                                  p.status === "active" ? "paused" : "active",
                              })
                            }
                            title={
                              p.status === "active"
                                ? "Pause project"
                                : "Resume project"
                            }
                          >
                            {p.status === "active" ? (
                              <Pause size={15} />
                            ) : (
                              <Play size={15} />
                            )}
                          </button>
                        </div>
                        <div className="project-card-title">
                          <h3>{p.name}</h3>
                          <span className={cx("project-status", p.status)}>
                            <i />
                            {p.status}
                          </span>
                        </div>
                        <p className="project-description">
                          {p.description || "No description added yet."}
                        </p>
                        <div className="project-card-stats">
                          <span>
                            <ListTodo size={14} />
                            {c.open} open
                          </span>
                          <span>
                            <CheckCircle2 size={14} />
                            {c.done} done
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${completion}%`,
                              background: p.color,
                            }}
                          />
                        </div>
                        <div className="project-next">
                          <span>NEXT ACTION</span>
                          <p>
                            {p.nextAction || "Choose the next concrete action."}
                          </p>
                        </div>
                        <div className="project-card-footer">
                          <span className="project-updated">
                            {tasks.length} tracked tasks
                          </span>
                          <button
                            className="text-button"
                            onClick={() => {
                              setSelectedProject(p.id);
                              setView("tasks");
                            }}
                          >
                            Open project <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                {data.projects.filter((p) => p.status !== "archived").length ===
                  0 && (
                  <EmptyState
                    icon={FolderKanban}
                    title="No projects yet"
                    text="Create a project to organise your work."
                    action="Create project"
                    onAction={() => setShowProjectForm(true)}
                  />
                )}
              </div>
            </>
          )}

          {view === "tasks" && (
            <>
              <div className="toolbar task-toolbar">
                <div className="inline-search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tasks, notes, projects..."
                  />
                </div>
                <select
                  className="select-field compact"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">All projects</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setCaptureStatus("todo");
                    setCaptureProject(
                      selectedProject === "all" ? "" : selectedProject,
                    );
                    setShowCapture(true);
                  }}
                >
                  <Plus size={15} /> New task
                </button>
              </div>
              <div className="task-board">
                {(
                  [
                    "inbox",
                    "todo",
                    "in_progress",
                    "blocked",
                    "done",
                  ] as TaskStatus[]
                ).map((status) => {
                  const tasks = visibleTasks.filter((t) => t.status === status);
                  return (
                    <div className="task-column" key={status}>
                      <div className="column-heading">
                        <span className={cx("column-status-dot", status)} />
                        <strong>{statusLabel[status]}</strong>
                        <span className="column-count">{tasks.length}</span>
                        <button
                          className="tiny-icon"
                          onClick={() => {
                            setCaptureStatus(status);
                            setCaptureProject(
                              selectedProject === "all" ? "" : selectedProject,
                            );
                            setShowCapture(true);
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div
                        className="column-cards"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const movingId = dragTaskId || event.dataTransfer.getData("text/plain");
                          if (movingId) moveTask(movingId, status);
                          setDragTaskId(null);
                        }}
                      >
                        {tasks.map((t) => (
                          <button
                            className={cx("kanban-card", dragTaskId === t.id && "is-dragging")}
                            key={t.id}
                            draggable
                            onDragStart={(event) => {
                              setDragTaskId(t.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", t.id);
                            }}
                            onDragEnd={() => setDragTaskId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const movingId = dragTaskId || event.dataTransfer.getData("text/plain");
                              if (movingId && movingId !== t.id) moveTask(movingId, status, t.id);
                              setDragTaskId(null);
                            }}
                            onClick={() => setSelectedTask(t.id)}
                          >
                            <div className="kanban-card-top">
                              <span className={cx("priority-mark", t.priority)}>
                                {t.priority === "urgent" ? (
                                  <Zap size={13} />
                                ) : t.priority === "high" ? (
                                  <ArrowUpRight size={13} />
                                ) : (
                                  <Flag size={12} />
                                )}{" "}
                                {priorityLabel[t.priority]}
                              </span>
                              {t.dueDate && (
                                <span
                                  className={cx(
                                    "due-chip",
                                    t.dueDate < today() &&
                                      t.status !== "done" &&
                                      "overdue",
                                  )}
                                >
                                  {fmtDate(t.dueDate)}
                                </span>
                              )}
                            </div>
                            <strong>{t.title}</strong>
                            <span className="kanban-project">
                              <span
                                className="project-dot"
                                style={{
                                  background:
                                    getProject(t.projectId)?.color ?? "#64748b",
                                }}
                              />
                              {getProject(t.projectId)?.name ?? "Personal"}
                            </span>
                            <div className="kanban-card-bottom">
                              <span>
                                <Clock3 size={12} />
                                {mins(t.estimate)}
                              </span>
                              {t.checklist.length > 0 && (
                                <span>
                                  <CheckCheck size={12} />
                                  {t.checklist.filter((c) => c.done).length}/
                                  {t.checklist.length}
                                </span>
                              )}
                              <span className="card-open">
                                <ArrowUpRight size={13} />
                              </span>
                            </div>
                          </button>
                        ))}
                        {tasks.length === 0 && (
                          <div className="column-empty">No tasks here</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {view === "calendar" && (
            <>
              <div className="calendar-config panel">
                <div>
                  <h2>Plan your capacity</h2>
                  <p>Tell DevPilot how much focused time you really have.</p>
                </div>
                <div className="capacity-controls">
                  <label>
                    Available hours
                    <select
                      className="select-field"
                      value={availableHours}
                      onChange={(e) => {
                        setAvailableHours(Number(e.target.value));
                        updatePlan({
                          availableMinutes: Number(e.target.value) * 60,
                        });
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option value={n} key={n}>
                          {n} hours
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Daily buffer
                    <select
                      className="select-field"
                      value={bufferMinutes}
                      onChange={(e) => {
                        setBufferMinutes(Number(e.target.value));
                        updatePlan({ bufferMinutes: Number(e.target.value) });
                      }}
                    >
                      {[0, 15, 30, 45, 60, 90].map((n) => (
                        <option value={n} key={n}>
                          {n} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-primary" onClick={generatePlan}>
                    <Sparkles size={15} /> Rebuild plan
                  </button>
                </div>
              </div>
              <div className="calendar-summary-grid">
                <StatCard
                  icon={Clock3}
                  label="Usable capacity"
                  value={mins(capacity)}
                  sub="After your buffer"
                  tone="teal"
                />
                <StatCard
                  icon={Target}
                  label="Allocated"
                  value={mins(plannedMinutes)}
                  sub="Tasks in today's plan"
                  tone={plannedMinutes > capacity ? "amber" : "blue"}
                />
                <StatCard
                  icon={Gauge}
                  label="Remaining"
                  value={mins(Math.max(0, capacity - plannedMinutes))}
                  sub={
                    plannedMinutes > capacity
                      ? "Over capacity"
                      : "Available focus time"
                  }
                  tone="green"
                />
              </div>
              <div className="panel calendar-list">
                <div className="panel-heading">
                  <div>
                    <h2>Upcoming deadlines</h2>
                    <p>Open work with a date attached.</p>
                  </div>
                  <CalendarDays size={18} className="muted-icon" />
                </div>
                {data.tasks
                  .filter(
                    (t) =>
                      t.dueDate && !["done", "cancelled"].includes(t.status),
                  )
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .slice(0, 15)
                  .map((t) => (
                    <div className="deadline-row" key={t.id}>
                      <div
                        className={cx(
                          "deadline-date",
                          t.dueDate < today() && "late",
                        )}
                      >
                        <strong>
                          {new Date(`${t.dueDate}T12:00:00`).getDate()}
                        </strong>
                        <span>
                          {new Date(`${t.dueDate}T12:00:00`).toLocaleDateString(
                            undefined,
                            { month: "short" },
                          )}
                        </span>
                      </div>
                      <div className="deadline-content">
                        <strong>{t.title}</strong>
                        <span>
                          {getProject(t.projectId)?.name ?? "Personal"} ·{" "}
                          {stageLabel[t.stage]}
                        </span>
                      </div>
                      <PriorityPill priority={t.priority} />
                      <button
                        className="icon-btn small"
                        onClick={() => setSelectedTask(t.id)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                {data.tasks.every(
                  (t) => !t.dueDate || ["done", "cancelled"].includes(t.status),
                ) && (
                  <EmptyState
                    icon={CalendarDays}
                    title="No upcoming deadlines"
                    text="Add due dates to tasks you need to keep on track."
                    action="Browse tasks"
                    onAction={() => setView("tasks")}
                  />
                )}
              </div>
            </>
          )}

          {view === "releases" && (
            <>
              <div className="release-intro">
                <div className="release-intro-icon">
                  <Rocket size={22} />
                </div>
                <div>
                  <h2>Ship without the forgotten steps.</h2>
                  <p>
                    Each release gets its own checklist, target date and
                    verification notes.
                  </p>
                </div>
              </div>
              <div className="release-grid">
                {data.releases.map((r) => {
                  const p = getProject(r.projectId);
                  const done = r.checklist.filter((c) => c.done).length;
                  return (
                    <article className="release-card" key={r.id}>
                      <div className="release-card-top">
                        <span className="release-version">{r.version}</span>
                        <span className={cx("release-status", r.status)}>
                          {r.status}
                        </span>
                      </div>
                      <h3>{p?.name ?? "Project"}</h3>
                      <p className="release-target">
                        <CalendarDays size={14} /> Target{" "}
                        {fmtDate(r.targetDate)}
                      </p>
                      <div className="release-progress">
                        <div className="capacity-label">
                          <span>Release checklist</span>
                          <strong>
                            {done}/{r.checklist.length}
                          </strong>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${r.checklist.length ? (done / r.checklist.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="release-checklist">
                        {r.checklist.map((c) => (
                          <label
                            key={c.id}
                            className={cx("check-row", c.done && "checked")}
                          >
                            <input
                              type="checkbox"
                              checked={c.done}
                              onChange={() => toggleReleaseCheck(r.id, c.id)}
                            />
                            <span>{c.title}</span>
                          </label>
                        ))}
                      </div>
                      <div className="release-card-footer">
                        <select
                          className="select-field compact"
                          value={r.status}
                          onChange={(e) =>
                            setData((d) => ({
                              ...d,
                              releases: d.releases.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      status: e.target
                                        .value as Release["status"],
                                    }
                                  : x,
                              ),
                            }))
                          }
                        >
                          <option value="planning">Planning</option>
                          <option value="testing">Testing</option>
                          <option value="ready">Ready</option>
                          <option value="deployed">Deployed</option>
                        </select>
                        <button
                          className="text-button"
                          onClick={() =>
                            setData((d) => ({
                              ...d,
                              releases: d.releases.filter((x) => x.id !== r.id),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
                {data.releases.length === 0 && (
                  <EmptyState
                    icon={Rocket}
                    title="No releases tracked"
                    text="Create a release checklist before your next deployment."
                    action="Create release"
                    onAction={() => setShowReleaseForm(true)}
                  />
                )}
              </div>
            </>
          )}

          {view === "memory" && (
            <>
              <div className="memory-layout">
                <div className="panel memory-form">
                  <div className="panel-heading">
                    <div>
                      <h2>Save a thought</h2>
                      <p>Decisions, commands, blockers, handover notes.</p>
                    </div>
                    <BookOpen size={18} className="muted-icon" />
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveNote();
                    }}
                    className="form-stack"
                  >
                    <label>
                      Project
                      <select
                        className="select-field"
                        value={noteDraft.projectId}
                        onChange={(e) =>
                          setNoteDraft((n) => ({
                            ...n,
                            projectId: e.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Choose a project</option>
                        {data.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title
                      <input
                        className="field"
                        value={noteDraft.title}
                        onChange={(e) =>
                          setNoteDraft((n) => ({ ...n, title: e.target.value }))
                        }
                        placeholder="e.g. How auth callback works"
                        required
                      />
                    </label>
                    <label>
                      Note
                      <textarea
                        className="field note-textarea"
                        value={noteDraft.content}
                        onChange={(e) =>
                          setNoteDraft((n) => ({
                            ...n,
                            content: e.target.value,
                          }))
                        }
                        placeholder="What should future-you know? Add relevant commands, paths, decisions, or the exact next step..."
                        required
                      />
                    </label>
                    <button className="btn btn-primary" type="submit">
                      <Plus size={15} /> Save note
                    </button>
                  </form>
                </div>
                <div className="memory-list">
                  {data.projects.map((p) => {
                    const notes = data.notes.filter(
                      (n) => n.projectId === p.id,
                    );
                    return (
                      <div className="panel memory-project" key={p.id}>
                        <div className="memory-project-heading">
                          <span
                            className="project-dot big"
                            style={{ background: p.color }}
                          />
                          <div>
                            <h3>{p.name}</h3>
                            <p>{p.nextAction || "No next action set"}</p>
                          </div>
                          <span className="note-count">
                            {notes.length} notes
                          </span>
                        </div>
                        {notes.map((n) => (
                          <article className="note-item" key={n.id}>
                            <div className="note-icon">
                              <FileText size={16} />
                            </div>
                            <div className="note-body">
                              <strong>{n.title}</strong>
                              <p>{n.content}</p>
                              <span>{fmtDate(n.createdAt.slice(0, 10))}</span>
                            </div>
                            <button
                              className="icon-btn small"
                              onClick={() =>
                                setData((d) => ({
                                  ...d,
                                  notes: d.notes.filter((x) => x.id !== n.id),
                                }))
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </article>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {view === "insights" && (
            <>
              <div className="stat-grid">
                <StatCard
                  icon={ListTodo}
                  label="Open tasks"
                  value={`${data.tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length}`}
                  sub="Across all projects"
                  tone="blue"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed"
                  value={`${data.tasks.filter((t) => t.status === "done").length}`}
                  sub="Tasks finished"
                  tone="green"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Overdue"
                  value={`${overdue.length}`}
                  sub="Need review"
                  tone={overdue.length ? "amber" : "green"}
                />
                <StatCard
                  icon={Activity}
                  label="Focus sessions"
                  value={`${data.sessions.length}`}
                  sub="Saved work sessions"
                  tone="violet"
                />
              </div>
              <div className="insights-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Workload by project</h2>
                      <p>Open tasks, not vanity percentages.</p>
                    </div>
                    <Gauge size={18} className="muted-icon" />
                  </div>
                  {data.projects.map((p) => {
                    const c = projectTaskCounts(p.id);
                    const max = Math.max(
                      1,
                      ...data.projects.map((x) => projectTaskCounts(x.id).open),
                    );
                    return (
                      <div className="workload-row" key={p.id}>
                        <div className="workload-label">
                          <span
                            className="project-dot"
                            style={{ background: p.color }}
                          />
                          <strong>{p.name}</strong>
                          <span>{c.open}</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(c.open / max) * 100}%`,
                              background: p.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Needs attention</h2>
                      <p>Fix the friction before adding more work.</p>
                    </div>
                    <AlertTriangle size={18} className="muted-icon" />
                  </div>
                  {overdue.slice(0, 6).map((t) => (
                    <button
                      className="attention-row"
                      key={t.id}
                      onClick={() => setSelectedTask(t.id)}
                    >
                      <span className="attention-icon">
                        <AlertTriangle size={15} />
                      </span>
                      <span>
                        <strong>{t.title}</strong>
                        <small>
                          {getProject(t.projectId)?.name} · Due{" "}
                          {fmtDate(t.dueDate)}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {overdue.length === 0 && (
                    <div className="positive-state">
                      <CheckCircle2 size={21} />
                      <strong>No overdue tasks</strong>
                      <span>Nice. Keep your commitments realistic.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent focus sessions</h2>
                    <p>Where your attention has gone.</p>
                  </div>
                  <Clock3 size={18} className="muted-icon" />
                </div>
                {data.sessions
                  .filter((s) => s.endedAt)
                  .slice(0, 8)
                  .map((s) => (
                    <div className="session-history-row" key={s.id}>
                      <div className="session-history-icon">
                        <Timer size={16} />
                      </div>
                      <div>
                        <strong>
                          {data.tasks.find((t) => t.id === s.taskId)?.title ??
                            "Deleted task"}
                        </strong>
                        <span>
                          {new Date(s.startedAt).toLocaleString()}{" "}
                          {s.notes ? `· ${s.notes}` : ""}
                        </span>
                      </div>
                      <span>
                        {s.endedAt
                          ? mins(
                              Math.round(
                                (new Date(s.endedAt).getTime() -
                                  new Date(s.startedAt).getTime()) /
                                  60000,
                              ),
                            )
                          : "In progress"}
                      </span>
                    </div>
                  ))}
                {data.sessions.length === 0 && (
                  <div className="small-empty">
                    No sessions yet. Start a focus session from a task.
                  </div>
                )}
              </div>
            </>
          )}

          {view === "settings" && (
            <div className="settings-layout">
              <div className="panel settings-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Workspace & appearance</h2>
                    <p>Keep your workspace comfortable.</p>
                  </div>
                  <Settings size={18} className="muted-icon" />
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Appearance</strong>
                    <p>Switch between dark and light mode.</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDark((v) => !v)}
                  >
                    {dark ? <Sun size={15} /> : <Moon size={15} />}{" "}
                    {dark ? "Light mode" : "Dark mode"}
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Daily capacity</strong>
                    <p>Focused work hours available on a typical day.</p>
                  </div>
                  <select
                    className="select-field"
                    value={availableHours}
                    onChange={(e) => {
                      setAvailableHours(Number(e.target.value));
                      updatePlan({
                        availableMinutes: Number(e.target.value) * 60,
                      });
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} hours
                      </option>
                    ))}
                  </select>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Protected buffer</strong>
                    <p>Keep space for interruptions and unexpected work.</p>
                  </div>
                  <select
                    className="select-field"
                    value={bufferMinutes}
                    onChange={(e) => {
                      setBufferMinutes(Number(e.target.value));
                      updatePlan({ bufferMinutes: Number(e.target.value) });
                    }}
                  >
                    {[0, 15, 30, 45, 60, 90].map((n) => (
                      <option key={n} value={n}>
                        {n} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="panel settings-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Account & sync</h2>
                    <p>Your account and workspace are connected to Supabase.</p>
                  </div>
                  <ShieldCheck size={18} className="muted-icon" />
                </div>
                {(cloudState === "conflict" || cloudState === "error") && (
                  <div className="alert alert-warning">
                    <AlertTriangle size={17} />
                    <div>
                      <strong>
                        {cloudState === "conflict"
                          ? "Cloud version conflict"
                          : "Cloud sync paused"}
                      </strong>
                      <p>
                        {authMessage ||
                          "Cloud writes are paused to protect your workspace. Export a backup before reloading."}
                      </p>
                      <div className="setting-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={exportData}
                        >
                          <Download size={15} /> Export backup first
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Reload the latest cloud workspace? Any unsynced changes in this tab will be discarded. Export a backup first if needed.",
                              )
                            )
                              window.location.reload();
                          }}
                        >
                          Reload cloud version
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {userEmail ? (
                  <>
                    <div className="auth-form">
                      <p className="form-message success">
                        Signed in as <strong>{userEmail}</strong>. Your
                        workspace is linked to this Supabase account.
                      </p>
                    </div>
                    <div className="setting-row account-signout-row">
                      <div>
                        <strong>Sign out of DevPilot</strong>
                        <p>End this session on this device.</p>
                      </div>
                      <button
                        className="btn btn-danger"
                        onClick={() => void signOut()}
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="auth-form">
                    <p className="form-message">
                      Sign-in is required before the workspace can open.
                    </p>
                  </div>
                )}
              </div>
              <div className="panel settings-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Data portability</h2>
                    <p>Back up or move your workspace.</p>
                  </div>
                  <Download size={18} className="muted-icon" />
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Export workspace</strong>
                    <p>
                      Download projects, tasks, plans, notes and sessions as
                      JSON.
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={exportData}>
                    <Download size={15} /> Export JSON
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Import workspace</strong>
                    <p>Restore a DevPilot JSON backup in this browser.</p>
                  </div>
                  <label className="btn btn-secondary upload-label">
                    <Plus size={15} /> Import JSON
                    <input
                      type="file"
                      accept="application/json,.json"
                      hidden
                      onChange={(e) => importData(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Clear workspace</strong>
                    <p>
                      Permanently remove all projects, tasks, plans, notes,
                      releases and focus history from your cloud workspace.
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    disabled={!cloudReady || cloudState !== "synced"}
                    onClick={() => {
                      const confirmation = window.prompt(
                        "This permanently clears your cloud workspace. Export a backup first if needed. Type CLEAR to confirm.",
                      );
                      if (confirmation !== "CLEAR") return;
                      syncBlockedRef.current = false;
                      setData(emptyWorkspace());
                      setSelectedTask(null);
                      setSelectedProject("all");
                      setView("today");
                      notify(
                        "Workspace cleared. Saving the empty workspace to Supabase…",
                      );
                    }}
                  >
                    <Trash2 size={15} /> Clear workspace
                  </button>
                </div>
              </div>
              <div className="about-footer">
                <div className="brand-mark small-mark brand-logo">
                  <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} />
                </div>
                <span>DevPilot</span>
                <span>·</span>
                <span>Personal command centre</span>
                <span className="version-pill">v0.2.0</span>
              </div>
            </div>
          )}
        </div>
        <footer className="app-footer">
          <span>
            <span
              className={cx(
                "status-dot",
                cloudState === "error" || cloudState === "conflict"
                  ? "offline"
                  : "online",
              )}
            />
            {cloudState === "synced"
              ? "Cloud synced"
              : cloudState === "loading"
                ? "Loading…"
                : cloudState === "saving"
                  ? "Saving…"
                  : cloudState === "conflict"
                    ? "Cloud conflict"
                    : cloudState === "error"
                      ? "Sync paused"
                      : "Cloud connected"}
          </span>
          <span>
            Made for focused work <span className="footer-heart">✳</span>
          </span>
          <button onClick={exportData}>Export backup</button>
        </footer>
      </section>

      {undoData && (
        <div className="undo-toast" role="status">
          <span>Task move saved locally · undo available</span>
          <button onClick={undoLastChange}>Undo <span>↶</span></button>
          <button className="undo-dismiss" aria-label="Dismiss undo" onClick={() => setUndoData(null)}><X size={14}/></button>
        </div>
      )}
      {selected && (
        <div
          className="drawer-scrim"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedTask(null);
          }}
        >
          <aside className="task-drawer">
            <div className="drawer-top">
              <span className="drawer-eyebrow">
                TASK DETAILS <span>·</span>{" "}
                {selected.id.slice(0, 12).toUpperCase()}
              </span>
              <button
                className="icon-btn"
                onClick={() => setSelectedTask(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-title-row">
              <button
                className={cx(
                  "task-complete-circle",
                  selected.status === "done" && "completed",
                )}
                onClick={() =>
                  selected.status === "done"
                    ? updateTask(selected.id, {
                        status: "todo",
                        completedAt: undefined,
                      })
                    : completeTask(selected)
                }
              >
                {selected.status === "done" ? (
                  <Check size={16} />
                ) : (
                  <Circle size={19} />
                )}
              </button>
              <textarea
                className="title-edit"
                value={selected.title}
                onChange={(e) =>
                  updateTask(selected.id, { title: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="drawer-actions">
              <button
                className="btn btn-primary"
                onClick={() =>
                  activeSession?.taskId === selected.id
                    ? stopSession()
                    : startSession(selected.id)
                }
              >
                {activeSession?.taskId === selected.id ? (
                  <>
                    <Pause size={15} /> Stop session
                  </>
                ) : (
                  <>
                    <Play size={15} /> Start focus
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addToday(selected.id)}
              >
                <Target size={15} /> Add to today
              </button>
              <button
                className="icon-btn"
                title="Delete task"
                onClick={() => {
                  if (window.confirm("Delete this task?")) {
                    setData((d) => ({
                      ...d,
                      tasks: d.tasks.filter((t) => t.id !== selected.id),
                    }));
                    setSelectedTask(null);
                    notify("Task deleted");
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="drawer-fields">
              <label>
                Project
                <select
                  className="select-field"
                  value={selected.projectId ?? ""}
                  onChange={(e) =>
                    updateTask(selected.id, {
                      projectId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Unassigned / personal</option>
                  {data.projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-grid">
                <label>
                  Status
                  <select
                    className="select-field"
                    value={selected.status}
                    onChange={(e) =>
                      updateTask(selected.id, {
                        status: e.target.value as TaskStatus,
                      })
                    }
                  >
                    {Object.entries(statusLabel).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    className="select-field"
                    value={selected.priority}
                    onChange={(e) =>
                      updateTask(selected.id, {
                        priority: e.target.value as Priority,
                      })
                    }
                  >
                    {Object.entries(priorityLabel).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    className="field"
                    type="date"
                    value={selected.dueDate}
                    onChange={(e) =>
                      updateTask(selected.id, { dueDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  Estimate (min)
                  <input
                    className="field"
                    type="number"
                    min="5"
                    step="5"
                    value={selected.estimate}
                    onChange={(e) =>
                      updateTask(selected.id, {
                        estimate: Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </label>
                <label>
                  Impact
                  <select
                    className="select-field"
                    value={selected.impact}
                    onChange={(e) =>
                      updateTask(selected.id, {
                        impact: Number(e.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option value={n} key={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Lifecycle stage
                  <select
                    className="select-field"
                    value={selected.stage}
                    onChange={(e) =>
                      updateTask(selected.id, {
                        stage: e.target.value as Stage,
                      })
                    }
                  >
                    {Object.entries(stageLabel).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Description
                <textarea
                  className="field drawer-textarea"
                  value={selected.description}
                  onChange={(e) =>
                    updateTask(selected.id, { description: e.target.value })
                  }
                  placeholder="What does done look like?"
                />
              </label>
              <label>
                Next action
                <input
                  className="field"
                  value={selected.nextAction}
                  onChange={(e) =>
                    updateTask(selected.id, { nextAction: e.target.value })
                  }
                  placeholder="What is the next concrete step?"
                />
              </label>
              <label>
                Depends on
                <select
                  className="select-field"
                  multiple
                  value={selected.dependsOn}
                  onChange={(e) =>
                    updateTask(selected.id, {
                      dependsOn: Array.from(e.target.selectedOptions)
                        .map((o) => o.value)
                        .filter((x) => x !== selected.id),
                    })
                  }
                >
                  {data.tasks
                    .filter(
                      (t) => t.id !== selected.id && t.status !== "cancelled",
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
                <small className="field-help">
                  Use Ctrl/Cmd to select multiple prerequisites. Finish these
                  before this task can be recommended.
                </small>
              </label>
              <div className="drawer-section">
                <div className="drawer-section-heading">
                  <h3>Checklist</h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      const title = window.prompt("Checklist item");
                      if (title?.trim())
                        updateTask(selected.id, {
                          checklist: [
                            ...selected.checklist,
                            {
                              id: id("check"),
                              title: title.trim(),
                              done: false,
                            },
                          ],
                        });
                    }}
                  >
                    <Plus size={14} /> Add item
                  </button>
                </div>
                {selected.checklist.map((c) => (
                  <label
                    className={cx("check-row", c.done && "checked")}
                    key={c.id}
                  >
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() => toggleChecklist(selected.id, c.id)}
                    />
                    <span>{c.title}</span>
                    <button
                      type="button"
                      className="tiny-icon"
                      onClick={(e) => {
                        e.preventDefault();
                        updateTask(selected.id, {
                          checklist: selected.checklist.filter(
                            (x) => x.id !== c.id,
                          ),
                        });
                      }}
                    >
                      <X size={13} />
                    </button>
                  </label>
                ))}
                {selected.checklist.length === 0 && (
                  <p className="field-help">
                    Break the task into small steps if it feels heavy.
                  </p>
                )}
              </div>
              <div className="drawer-section">
                <div className="drawer-section-heading">
                  <h3>Priority reasoning</h3>
                  <span className="score-pill">
                    {scoreTask(selected, data.tasks).score}
                  </span>
                </div>
                <p className="drawer-reason">
                  {scoreTask(selected, data.tasks).reasons.join(" · ")}
                </p>
              </div>
              <div className="drawer-section">
                <h3>Task history</h3>
                <p className="field-help">
                  Created {new Date(selected.createdAt).toLocaleString()}
                </p>
                {data.sessions
                  .filter((s) => s.taskId === selected.id)
                  .map((s) => (
                    <div className="mini-session" key={s.id}>
                      <Clock3 size={14} />
                      <span>{new Date(s.startedAt).toLocaleString()}</span>
                      <strong>
                        {s.endedAt
                          ? mins(
                              Math.round(
                                (new Date(s.endedAt).getTime() -
                                  new Date(s.startedAt).getTime()) /
                                  60000,
                              ),
                            )
                          : "Active"}
                      </strong>
                      {s.notes && <p>{s.notes}</p>}
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {showCapture && (
        <Modal
          title="Capture a task"
          subtitle="Get it out of your head. You can organise it later."
          onClose={() => setShowCapture(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              capture();
            }}
          >
            <label>
              What&apos;s on your mind?
              <input
                className="field large-field"
                autoFocus
                value={captureTitle}
                onChange={(e) => setCaptureTitle(e.target.value)}
                placeholder="e.g. Check payment webhook retry handling"
                required
              />
            </label>
            <label>
              Project (optional)
              <select
                className="select-field"
                value={captureProject}
                onChange={(e) => setCaptureProject(e.target.value)}
              >
                <option value="">Leave in inbox / decide later</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-footer">
              <span className="field-help">
                <Command size={12} /> Quick capture keeps momentum.
              </span>
              <button className="btn btn-primary" type="submit">
                <Plus size={15} /> Add to inbox
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showProjectForm && (
        <Modal
          title="Create a project"
          subtitle="Give this work a home and a clear next action."
          onClose={() => setShowProjectForm(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              addProject();
            }}
          >
            <label>
              Project name
              <input
                className="field"
                autoFocus
                value={projectDraft.name}
                onChange={(e) =>
                  setProjectDraft((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Client portal"
                required
              />
            </label>
            <label>
              Description
              <textarea
                className="field"
                value={projectDraft.description}
                onChange={(e) =>
                  setProjectDraft((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="What does this project exist to accomplish?"
              />
            </label>
            <label>
              Project colour
              <div className="color-picker">
                {[
                  "#0F766E",
                  "#2563EB",
                  "#7C3AED",
                  "#DB2777",
                  "#D97706",
                  "#64748B",
                  "#16A34A",
                ].map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={cx(
                      "color-swatch",
                      projectDraft.color === c && "selected",
                    )}
                    style={{ background: c }}
                    onClick={() => setProjectDraft((p) => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </label>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowProjectForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Plus size={15} /> Create project
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showReleaseForm && (
        <Modal
          title="Create a release"
          subtitle="Start with a repeatable checklist. Refine the scope as you go."
          onClose={() => setShowReleaseForm(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              addRelease();
            }}
          >
            <label>
              Project
              <select
                className="select-field"
                value={releaseDraft.projectId}
                onChange={(e) =>
                  setReleaseDraft((r) => ({ ...r, projectId: e.target.value }))
                }
                required
              >
                <option value="">Select project</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Version or release name
              <input
                className="field"
                value={releaseDraft.version}
                onChange={(e) =>
                  setReleaseDraft((r) => ({ ...r, version: e.target.value }))
                }
                placeholder="e.g. v1.2.0 or October patch"
                required
              />
            </label>
            <label>
              Target date
              <input
                className="field"
                type="date"
                value={releaseDraft.targetDate}
                onChange={(e) =>
                  setReleaseDraft((r) => ({ ...r, targetDate: e.target.value }))
                }
              />
            </label>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowReleaseForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Rocket size={15} /> Create checklist
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showReview && (
        <Modal
          title="Daily review"
          subtitle="Close the loop. You don't have to finish everything to finish the day well."
          onClose={() => setShowReview(false)}
        >
          <div className="review-modal-content">
            <div className="review-stat-row">
              <div>
                <strong>
                  {
                    data.tasks.filter(
                      (t) =>
                        t.status === "done" &&
                        t.completedAt?.slice(0, 10) === today(),
                    ).length
                  }
                </strong>
                <span>completed today</span>
              </div>
              <div>
                <strong>{plan.taskIds.length}</strong>
                <span>planned today</span>
              </div>
              <div>
                <strong>{overdue.length}</strong>
                <span>overdue now</span>
              </div>
            </div>
            <h3>Unfinished planned tasks</h3>
            {plan.taskIds
              .map((tid) => data.tasks.find((t) => t.id === tid))

              .filter((t): t is Task => t !== undefined && t.status !== "done")

              .map((t) => (
                <div className="review-task" key={t.id}>
                  <span>
                    <strong>{t.title}</strong>
                    <small>{getProject(t.projectId)?.name ?? "Personal"}</small>
                  </span>
                  <select
                    className="select-field compact"
                    value={t.status}
                    onChange={(e) =>
                      updateTask(t.id, { status: e.target.value as TaskStatus })
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                  <button
                    className="icon-btn small"
                    onClick={() =>
                      updatePlan({
                        taskIds: plan.taskIds.filter((x) => x !== t.id),
                      })
                    }
                    title="Remove from today's plan"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            <label className="review-reflection">
              What should future-you know?
              <textarea
                className="field"
                placeholder="What moved forward? What's blocked? What's the first move tomorrow?"
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
              />
            </label>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const projectId =
                    noteDraft.projectId || data.projects[0]?.id || "";
                  if (projectId) {
                    const note: Note = {
                      id: id("note"),
                      projectId,
                      title: `Daily handover — ${today()}`,
                      content: sessionNote.trim() || "No reflection added.",
                      createdAt: new Date().toISOString(),
                    };
                    setData((d) => ({ ...d, notes: [note, ...d.notes] }));
                    notify("Daily handover saved to project memory");
                  } else notify("Create a project first to save a handover.");
                  setView("memory");
                  setShowReview(false);
                  setSessionNote("");
                }}
              >
                Save as project note
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowReview(false);
                  notify("Review closed. Keep tomorrow small and clear.");
                }}
              >
                Finish review <Check size={15} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showSearch && (
        <div
          className="search-scrim"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowSearch(false);
          }}
        >
          <div className="command-modal">
            <div className="command-search">
              <Search size={18} />
              <input
                autoFocus
                placeholder="Search tasks and projects..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-results">
              <div className="command-label">QUICK ACTIONS</div>
              {[
                { label: "Go to Daily Mission Control", icon: Target, action: () => setView("today") },
                { label: "Open Kanban board", icon: FolderKanban, action: () => setView("tasks") },
                { label: "View insights", icon: TrendingUp, action: () => setView("insights") },
                { label: "Create a task", icon: Plus, action: () => { setCaptureStatus("todo"); setShowCapture(true); } },
                { label: "Create a project", icon: FolderKanban, action: () => setShowProjectForm(true) },
              ].filter((item) => !query || item.label.toLowerCase().includes(query.toLowerCase())).map((item) => {
                const Icon = item.icon;
                return <button key={item.label} className="command-result command-action-result" onClick={() => { item.action(); setShowSearch(false); setQuery(""); }}><Icon size={16}/><span>{item.label}</span><small>Action</small><ChevronRight size={14}/></button>;
              })}
              <div className="command-label">TASKS</div>
              {data.tasks
                .filter(
                  (t) =>
                    !query ||
                    t.title.toLowerCase().includes(query.toLowerCase()),
                )
                .slice(0, 7)
                .map((t) => (
                  <button
                    key={t.id}
                    className="command-result"
                    onClick={() => {
                      setSelectedTask(t.id);
                      setShowSearch(false);
                    }}
                  >
                    <ListTodo size={16} />
                    <span>{t.title}</span>
                    <small>{getProject(t.projectId)?.name ?? "Personal"}</small>
                    <ChevronRight size={14} />
                  </button>
                ))}
              <div className="command-label">PROJECTS</div>
              {data.projects
                .filter(
                  (p) =>
                    !query ||
                    p.name.toLowerCase().includes(query.toLowerCase()),
                )
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p.id}
                    className="command-result"
                    onClick={() => {
                      setSelectedProject(p.id);
                      setView("projects");
                      setShowSearch(false);
                    }}
                  >
                    <span
                      className="project-dot"
                      style={{ background: p.color }}
                    />
                    <span>{p.name}</span>
                    <small>Project</small>
                    <ChevronRight size={14} />
                  </button>
                ))}
              {data.tasks.filter(
                (t) =>
                  !query || t.title.toLowerCase().includes(query.toLowerCase()),
              ).length === 0 &&
                data.projects.filter(
                  (p) =>
                    !query ||
                    p.name.toLowerCase().includes(query.toLowerCase()),
                ).length === 0 && (
                  <div className="small-empty">
                    No matches. Try another search.
                  </div>
                )}
            </div>
            <div className="command-footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> Navigate
              </span>
              <span>
                <kbd>↵</kbd> Open
              </span>
              <span>
                <kbd>ESC</kbd> Close
              </span>
            </div>
          </div>
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {(
          [
            { id: "today", label: "Today", icon: Target },
            { id: "inbox", label: "Inbox", icon: Inbox },
            { id: "projects", label: "Projects", icon: FolderKanban },
            { id: "tasks", label: "Tasks", icon: ListTodo },
            { id: "settings", label: "Settings", icon: Settings },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={cx("mobile-bottom-item", view === item.id && "active")}
              onClick={() => {
                if (item.id === "projects") setSelectedProject("all");
                setViewAndClose(item.id);
              }}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {item.id === "inbox" &&
                data.tasks.some((t) => t.status === "inbox") && <i />}
            </button>
          );
        })}
      </nav>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {!ready && (
        <div className="loading-cover">
          <div className="brand-mark brand-logo">
            <Image src="/HG.png" alt="Hempon Group" width={1254} height={1254} />
          </div>
          <LoaderCircle size={20} className="spin" /> Preparing your workspace…
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <div className={`stat-icon ${tone}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
function TaskRow({
  task,
  project,
  index,
  estimate,
  onOpen,
  onComplete,
  onStart,
  onRemove,
  active,
}: {
  task: Task;
  project?: Project;
  index: number;
  estimate: number;
  onOpen: () => void;
  onComplete: () => void;
  onStart: () => void;
  onRemove: () => void;
  active: boolean;
}) {
  return (
    <div className={cx("plan-task-row", active && "task-active")}>
      <button className="task-number" onClick={onOpen}>
        {String(index).padStart(2, "0")}
      </button>
      <button
        className={cx(
          "task-complete-circle",
          task.status === "done" && "completed",
        )}
        onClick={onComplete}
        aria-label="Complete task"
      >
        {task.status === "done" ? <Check size={14} /> : <Circle size={18} />}
      </button>
      <button className="plan-task-content" onClick={onOpen}>
        <strong>{task.title}</strong>
        <span>
          <span
            className="project-dot"
            style={{ background: project?.color ?? "#64748b" }}
          />
          {project?.name ?? "Personal"}
          <span>·</span>
          {mins(estimate)}
        </span>
      </button>
      <PriorityPill priority={task.priority} />
      <button
        className="icon-btn small task-start"
        onClick={onStart}
        title={active ? "Current session" : "Start focus"}
      >
        {active ? <span className="live-dot" /> : <Play size={14} />}
      </button>
      <button
        className="tiny-icon remove-plan"
        onClick={onRemove}
        title="Remove from today's plan"
      >
        <X size={14} />
      </button>
    </div>
  );
}
function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={cx("priority-pill", priority)}>
      <i />
      {priorityLabel[priority]}
    </span>
  );
}
function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: typeof Target;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state generic-empty">
      <div className="empty-illustration">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="btn btn-secondary" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal-card">
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function SessionClock({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
        ),
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return (
    <div className="session-clock">
      <span>{h}</span>
      <i>:</i>
      <span>{m}</span>
      <i>:</i>
      <span>{s}</span>
    </div>
  );
}
