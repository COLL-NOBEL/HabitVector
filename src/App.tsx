import React, { useState, useEffect } from "react";
import {
    Settings,
    Sparkles,
    Calendar,
    CheckSquare,
    Award,
    Flame,
    Search,
    Briefcase,
    BookOpen,
    Clock,
    ArrowRight,
    Plus,
    Trash2,
    ExternalLink,
    TrendingUp,
    Compass,
    HelpCircle,
    Download,
    RefreshCw,
    AlertCircle,
    Lightbulb,
    Check,
    Code,
    Share2,
    DollarSign,
} from "lucide-react";
import AIPlannerSetup from "./components/AIPlannerSetup";
import WeeklyTimetable from "./components/WeeklyTimetable";
import {
    TimetableItem,
    TodoItem,
    CoachingTip,
    Opportunity,
    OpportunitySource,
    HabitRecommendation,
    UserGoalProfile,
    Plan,
} from "./types";

function calculateMinutesFromTimeRange(timeRange: string): number {
    try {
        const parts = timeRange.split("-").map((s) => s.trim());
        if (parts.length !== 2) return 60;

        const parseTime = (timeStr: string) => {
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let hour = parseInt(match[1]);
            const min = parseInt(match[2]);
            const period = match[3].toUpperCase();
            if (period === "PM" && hour < 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;
            return hour * 60 + min;
        };

        let start = parseTime(parts[0]);
        let end = parseTime(parts[1]);
        if (end < start) end += 24 * 60;
        return end - start || 60;
    } catch {
        return 60;
    }
}
export default function App() {
    const [profile, setProfile] = useState<UserGoalProfile>({
        interests:
            "Computer engineering student, React web dev, CSS design, building a portfolio.",
        hoursPerDay: 4,
        daysPerWeek: 3,
        examDate: "",
        currentProblems:
            "Third year. Waiting until last minute to study. Stressed, has zero portfolio projects, watches hackathon videos but procrastinates entering.",
        setupDone: false,
    });

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<
        | "dashboard"
        | "timetable"
        | "todo"
        | "history"
        | "opportunities"
        | "habits"
        | "settings"
    >("dashboard");
    const [streak, setStreak] = useState(12);
    const [customApiKey, setCustomApiKey] = useState(
        () => localStorage.getItem("customApiKey") || "",
    );

    const handleSaveApiKey = (key: string) => {
        setCustomApiKey(key);
        localStorage.setItem("customApiKey", key);
    };

    // Plans management
    const [plans, setPlans] = useState<Plan[]>(() => {
        const saved = localStorage.getItem("habitvector_plans");
        return saved ? JSON.parse(saved) : [];
    });
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(() => {
        return localStorage.getItem("habitvector_current_plan");
    });

    // Save plans to local storage whenever they change
    useEffect(() => {
        localStorage.setItem("habitvector_plans", JSON.stringify(plans));
    }, [plans]);

    useEffect(() => {
        if (currentPlanId) {
            localStorage.setItem("habitvector_current_plan", currentPlanId);
        } else {
            localStorage.removeItem("habitvector_current_plan");
        }
    }, [currentPlanId]);

    // AI-generated state variables (current active plan)
    const [timetable, setTimetable] = useState<TimetableItem[]>([]);
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [todoList, setTodoList] = useState<TodoItem[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [coachingTips, setCoachingTips] = useState<CoachingTip[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [sources, setSources] = useState<OpportunitySource[]>([]);
    const [habitRecommendations, setHabitRecommendations] = useState<
        HabitRecommendation[]
    >([]);

    // Theme toggle
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Apply dark mode class to document
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    // Loading statuses
    const [oppsLoading, setOppsLoading] = useState(false);
    const [habitsLoading, setHabitsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Input fields for manual item addition
    const [newTodoTitle, setNewTodoTitle] = useState("");
    const [newTodoCategory, setNewTodoCategory] = useState("Web Dev");
    const [newTodoPriority, setNewTodoPriority] = useState("Medium");
    const [newTodoAtomic, setNewTodoAtomic] = useState("");

    const [newTimeDay, setNewTimeDay] = useState("Monday");
    const [newTimeRange, setNewTimeRange] = useState("09:00 AM - 10:00 AM");
    const [newTimeActivity, setNewTimeActivity] = useState("");
    const [newTimeCategory, setNewTimeCategory] = useState("Study");
    const [newTimeDesc, setNewTimeDesc] = useState("");

    // Restore current plan data from loaded plans array on mount
    useEffect(() => {
        // We only load initial plan automatically if profile setup is supposedly done
        if (plans.length > 0) {
            const planToLoad = currentPlanId
                ? plans.find((p) => p.id === currentPlanId) || plans[0]
                : plans[0];

            setCurrentPlanId(planToLoad.id);
            setProfile(planToLoad.profile);
            setTimetable(planToLoad.timetable);
            setTodoList(planToLoad.todoList);
            setCoachingTips(planToLoad.coachingTips);
            fetchOpportunities(planToLoad.objective);
            fetchHabitRecommendations(planToLoad.objective);
        }
    }, []); // Run once on mount

    // Generate initial master plan from Server Endpoint
    const handleGeneratePlan = async (userProfile: UserGoalProfile) => {
        setLoading(true);
        try {
            const response = await fetch("/api/generate-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey
                        ? { "x-gemini-api-key": customApiKey }
                        : {}),
                },
                body: JSON.stringify(userProfile),
            });
            const data = await response.json();
            if (response.ok) {
                // Map server results to standard UI format (adding ids where missing)
                const formattedTimetable = (data.timetable || []).map(
                    (item: any, idx: number) => ({
                        ...item,
                        id: `time-${Date.now()}-${idx}`,
                    }),
                );
                const formattedTodoList = (data.todoList || []).map(
                    (item: any, idx: number) => ({
                        ...item,
                        id: `todo-${Date.now()}-${idx}`,
                        status: "pending",
                    }),
                );

                setTimetable(formattedTimetable);
                setTodoList(formattedTodoList);
                setCoachingTips(data.coachingTips || []);
                setProfile(userProfile);

                // Trigger background queries for Opportunities and Habit recommendations
                fetchOpportunities(userProfile.interests);
                fetchHabitRecommendations(userProfile.interests);

                // Save as a new plan
                const newPlanId = `plan-${Date.now()}`;
                const newPlan: Plan = {
                    id: newPlanId,
                    name: `Plan ${plans.length + 1}`,
                    objective: userProfile.interests,
                    profile: userProfile,
                    timetable: formattedTimetable,
                    todoList: formattedTodoList,
                    coachingTips: data.coachingTips || [],
                };

                const updatedPlans = [...plans, newPlan].slice(-3); // Keep max 3 plans
                setPlans(updatedPlans);
                setCurrentPlanId(newPlanId);
            } else {
                setApiError(data.error || "Failed to generate plan.");
            }
        } catch (err) {
            console.error(err);
            setApiError(
                "Error connecting to server. Make sure your GEMINI_API_KEY is configured.",
            );
        } finally {
            setLoading(false);
        }
    };

    // Handle AI Timetable Modification

    const handleUpdateTimetableItem = (item: TimetableItem) => {
        const originalItem = timetable.find((i) => i.id === item.id);

        setTimetable((prev) =>
            prev.map((i) => {
                if (i.id === item.id) return item;
                if (
                    originalItem &&
                    originalItem.timeRange !== item.timeRange &&
                    i.taskId === item.taskId &&
                    i.taskId !== "custom" &&
                    i.taskId !== undefined &&
                    i.weekIndex > item.weekIndex &&
                    i.day === item.day
                ) {
                    return { ...i, timeRange: item.timeRange };
                }
                return i;
            }),
        );

        if (originalItem && item.taskId && item.taskId !== "custom") {
            const statusChangedToCompleted =
                originalItem.status !== "completed" &&
                item.status === "completed";
            const statusChangedToFailed =
                originalItem.status !== "failed" && item.status === "failed";
            const statusChangedFromCompleted =
                originalItem.status === "completed" &&
                item.status !== "completed";

            if (
                statusChangedToCompleted ||
                statusChangedFromCompleted ||
                statusChangedToFailed
            ) {
                const duration = calculateMinutesFromTimeRange(item.timeRange);
                setTodoList((prevTodos) => {
                    let nextTodos = prevTodos.map((todo) => {
                        if (todo.id === item.taskId) {
                            let newEstimated = todo.estimatedMinutes;
                            if (statusChangedToCompleted) {
                                newEstimated = Math.max(
                                    0,
                                    newEstimated - duration,
                                );
                            } else if (statusChangedFromCompleted) {
                                newEstimated += duration;
                            }
                            return {
                                ...todo,
                                estimatedMinutes: newEstimated,
                                status:
                                    newEstimated <= 0
                                        ? ("completed" as const)
                                        : todo.status,
                            };
                        }
                        return todo;
                    });

                    if (statusChangedToFailed) {
                        const todo = prevTodos.find(
                            (t) => t.id === item.taskId,
                        );
                        if (todo) {
                            const isSimple =
                                todo.estimatedMinutes <= 30 ||
                                todo.title.toLowerCase().includes("linkedin") ||
                                todo.title.toLowerCase().includes("post");
                            if (isSimple) {
                                nextTodos = nextTodos.filter(
                                    (t) => t.id !== item.taskId,
                                );
                            }
                        }
                    }
                    return nextTodos;
                });
            }
        }
    };
    const handleModifyTimetable = async (prompt: string) => {
        try {
            const response = await fetch("/api/modify-timetable", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey
                        ? { "x-gemini-api-key": customApiKey }
                        : {}),
                },
                body: JSON.stringify({
                    prompt,
                    currentTimetable: timetable,
                    userProfile: profile,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                const formattedTimetable = (data.timetable || []).map(
                    (item: any, idx: number) => ({
                        ...item,
                        id: item.id || `time-mod-${Date.now()}-${idx}`,
                    }),
                );
                setTimetable(formattedTimetable);

                // Update the current plan
                if (currentPlanId) {
                    setPlans((prev) =>
                        prev.map((p) =>
                            p.id === currentPlanId
                                ? { ...p, timetable: formattedTimetable }
                                : p,
                        ),
                    );
                }
            } else {
                setApiError(data.error || "Failed to modify timetable.");
            }
        } catch (err) {
            console.error(err);
            setApiError("Error connecting to server to modify timetable.");
        }
    };

    const handleSwitchPlan = (planId: string) => {
        const plan = plans.find((p) => p.id === planId);
        if (plan) {
            setCurrentPlanId(planId);
            setProfile(plan.profile);
            setTimetable(plan.timetable);
            setTodoList(plan.todoList);
            setCoachingTips(plan.coachingTips);
            // Re-fetch context based on this plan's objective
            fetchOpportunities(plan.objective);
            fetchHabitRecommendations(plan.objective);
        }
    };

    // Discover Tech Opportunities via Google Search Grounding API
    const fetchOpportunities = async (
        interestsTerm: string,
        customQuery?: string,
    ) => {
        setOppsLoading(true);
        try {
            const response = await fetch("/api/discover-opportunities", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey
                        ? { "x-gemini-api-key": customApiKey }
                        : {}),
                },
                body: JSON.stringify({
                    interests: interestsTerm,
                    query: customQuery,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setOpportunities(data.opportunities || []);
                setSources(data.sources || []);
            } else {
                if (data.error && data.error.includes("Rate limit")) {
                    setApiError(data.error);
                } else {
                    setApiError(data.error || "Failed to fetch opportunities.");
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setOppsLoading(false);
        }
    };

    // Discover customized Habit Recommendations from Server
    const fetchHabitRecommendations = async (interestsTerm: string) => {
        setHabitsLoading(true);
        try {
            const response = await fetch("/api/propose-habits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey
                        ? { "x-gemini-api-key": customApiKey }
                        : {}),
                },
                body: JSON.stringify({ interests: interestsTerm }),
            });
            const data = await response.json();
            if (response.ok) {
                setHabitRecommendations(data.recommendations || []);
            } else {
                if (data.error && data.error.includes("Rate limit")) {
                    setApiError(data.error);
                } else {
                    setApiError(data.error || "Failed to fetch habits.");
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setHabitsLoading(false);
        }
    };

    // Export timetable events directly to standard .ics file for Google Calendar / Apple Calendar
    const handleExportICS = () => {
        if (timetable.length === 0) {
            alert("No events found in your timetable to export.");
            return;
        }

        let icsContent =
            "BEGIN:VCALENDARVERSION:2.0PRODID:-//HabitPulse//NONSGML v1.0//ENCALSCALE:GREGORIANMETHOD:PUBLISH";

        timetable.forEach((item) => {
            // Simulate real recurring/timed calendar event
            const cleanTitle = item.activity.replace(/[,;]/g, "");
            const cleanDesc =
                `${item.description} - Focus Rule: 1% compounding effort. Category: ${item.category}`.replace(
                    /[,;]/g,
                    "",
                );
            icsContent += "BEGIN:VEVENT";
            icsContent += `SUMMARY:HabitPulse: ${cleanTitle}`;
            icsContent += `DESCRIPTION:${cleanDesc}`;
            icsContent += `CATEGORIES:${item.category}`;
            icsContent += `DTSTART;VALUE=DATE:${new Date().toISOString().split("T")[0].replace(/-/g, "")}`;
            icsContent += `DTEND;VALUE=DATE:${new Date().toISOString().split("T")[0].replace(/-/g, "")}`;
            icsContent += "END:VEVENT";
        });

        icsContent += "END:VCALENDAR";

        const blob = new Blob([icsContent], {
            type: "text/calendar;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "habitpulse_schedule.ics");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Toggle checklist status
    const handleToggleTodo = (id: string) => {
        setTodoList((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const nextStatus =
                        item.status === "completed" ? "pending" : "completed";
                    // Boost streak if a task is completed!
                    if (nextStatus === "completed") {
                        setStreak((s) => s + 1);
                        setTimetable((tt) =>
                            tt.filter(
                                (t) =>
                                    !(
                                        t.taskId === id &&
                                        t.weekIndex > currentWeekOffset
                                    ),
                            ),
                        );
                    } else {
                        setStreak((s) => Math.max(0, s - 1));
                    }
                    return { ...item, status: nextStatus };
                }
                return item;
            }),
        );
    };

    // Add customized tasks manually
    const handleAddManualTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodoTitle.trim()) return;

        const newItem: TodoItem = {
            id: `todo-${Date.now()}`,
            title: newTodoTitle,
            category: newTodoCategory,
            priority: newTodoPriority,
            estimatedMinutes: 30,
            atomicActionStep:
                newTodoAtomic || "Open editor for 2 minutes and sit down.",
            resources: ["Official Documentation"],
            status: "pending",
            period: "Anytime",
        };

        setTodoList([newItem, ...todoList]);
        setNewTodoTitle("");
        setNewTodoAtomic("");
    };

    // Add customized timetable events manually
    const handleAddManualTime = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTimeActivity.trim()) return;

        const newItem: TimetableItem = {
            id: `time-${Date.now()}`,
            day: newTimeDay,
            timeRange: newTimeRange,
            activity: newTimeActivity,
            category: newTimeCategory,
            description:
                newTimeDesc ||
                "Manually scheduled compounding deep work block.",
            colorPreset: "amber",
            weekIndex: currentWeekOffset,
            status: "pending",
        };

        setTimetable([...timetable, newItem]);
        setNewTimeActivity("");
        setNewTimeDesc("");
    };

    // Delete event or task
    const handleDeleteTodo = (id: string) => {
        setTodoList((prev) => prev.filter((item) => item.id !== id));
    };

    const handleDeleteTime = (id: string) => {
        setTimetable((prev) => prev.filter((item) => item.id !== id));
    };

    // Connect Opportunity / Recommended Habit directly into the active checklist
    const handleImportOpportunityToTodo = (opp: Opportunity) => {
        const newItem: TodoItem = {
            id: `todo-${Date.now()}`,
            title: `Apply/Explore: ${opp.title}`,
            category: opp.badge || "Opportunity",
            priority: "High",
            estimatedMinutes: 45,
            atomicActionStep: `Visit ${opp.provider} website and read requirements for 2 minutes.`,
            resources: [opp.actionLink],
            status: "pending",
            period: "Anytime",
        };
        setTodoList([newItem, ...todoList]);
        alert(
            `"${opp.title}" has been successfully added to your prioritised To-Do List!`,
        );
    };

    const handleImportHabitToTodo = (rec: HabitRecommendation) => {
        const newItem: TodoItem = {
            id: `todo-${Date.now()}`,
            title: rec.title,
            category: rec.category,
            priority: "Medium",
            estimatedMinutes: rec.estimatedMinutes,
            atomicActionStep: `Atomic Trigger: ${rec.habitPrinciple} - Start immediately!`,
            resources: ["Core Practice Guidelines"],
            status: "pending",
            period: "Anytime",
        };
        setTodoList([newItem, ...todoList]);
        alert(
            `"${rec.title}" habit challenge added directly to your To-Do list!`,
        );
    };

    const handleUpdateTodoDate = (
        id: string,
        field: "startDate" | "endDate",
        value: string,
    ) => {
        setTodoList((prev) => {
            const next = prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item,
            );
            if (currentPlanId) {
                setPlans((plansPrev) =>
                    plansPrev.map((p) =>
                        p.id === currentPlanId ? { ...p, todoList: next } : p,
                    ),
                );
            }
            return next;
        });
    };

    const handleGenerateTimetableFromTasks = async () => {
        if (todoList.length === 0) {
            setApiError("No tasks in your list.");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch("/api/generate-timetable-from-tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey
                        ? { "x-gemini-api-key": customApiKey }
                        : {}),
                },
                body: JSON.stringify({ todoList }),
            });
            const data = await response.json();
            if (response.ok) {
                const newMissions = (data.timetable || []).map(
                    (item: any, idx: number) => ({
                        ...item,
                        id: `time-${Date.now()}-${idx}`,
                        status: "pending",
                    }),
                );

                // Merge into current timetable
                const nextTimetable = [...timetable, ...newMissions];
                setTimetable(nextTimetable);

                if (currentPlanId) {
                    setPlans((plansPrev) =>
                        plansPrev.map((p) =>
                            p.id === currentPlanId
                                ? { ...p, timetable: nextTimetable }
                                : p,
                        ),
                    );
                }
                setActiveTab("timetable");
            } else {
                setApiError(
                    data.error || "Failed to generate timetable missions.",
                );
            }
        } catch (err) {
            console.error(err);
            setApiError("Network error while generating timetable missions.");
        } finally {
            setLoading(false);
        }
    };

    // Default setup initial load
    useEffect(() => {
        if (profile.setupDone && timetable.length === 0) {
            handleGeneratePlan(profile);
        }
    }, [profile.setupDone]);

    if (!profile.setupDone) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                {apiError && (
                    <div className="max-w-4xl w-full mx-auto mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-2xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-start shadow-sm">
                        <div>
                            <p className="flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {apiError}
                            </p>
                            {apiError.includes("429") ||
                            apiError.includes("quota") ||
                            apiError.includes("Rate limit") ? (
                                <p className="mt-2 text-xs text-rose-500 font-medium bg-rose-500/10 p-2 rounded-lg inline-block">
                                    Tip: It looks like the AI rate limit was
                                    exceeded. Please wait a minute and try
                                    again.
                                </p>
                            ) : null}
                        </div>
                        <button
                            onClick={() => setApiError(null)}
                            className="text-rose-400 hover:text-rose-600 self-start mt-1 p-1"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <AIPlannerSetup
                    onGenerate={handleGeneratePlan}
                    loading={loading}
                />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 antialiased transition-colors print:bg-white dark:bg-slate-900 print:text-black"
            id="main-container"
        >
            {/* Sidebar Navigation - Styled with Professional Polish Deep Theme */}
            <aside
                className="w-full md:w-64 bg-white dark:bg-slate-900 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 print:hidden"
                id="sidebar-nav"
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Flame className="text-white w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight uppercase">
                                HabitVector
                            </h1>
                            <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider block">
                                Custom Plan Builder
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 transition-colors"
                        title="Toggle Light/Dark Mode"
                    >
                        <Lightbulb className="w-4 h-4" />
                    </button>
                </div>

                {/* User Stats / Streak Widget */}
                <div className="p-4 bg-slate-950/60 m-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">
                                Compounding Streak
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    {streak}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                    Days 1% Better
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saved Plans Selector */}
                {plans.length > 0 && (
                    <div className="px-4 mb-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider ml-1">
                                Saved Plans
                            </label>
                            <button
                                onClick={() =>
                                    setProfile((p) => ({
                                        ...p,
                                        setupDone: false,
                                    }))
                                }
                                className="text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase transition-colors"
                            >
                                + New / Edit
                            </button>
                        </div>
                        <div className="space-y-1">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => handleSwitchPlan(plan.id)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        currentPlanId === plan.id
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-700"
                                            : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/50"
                                    }`}
                                >
                                    {plan.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Side Nav list */}
                <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "dashboard"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Compass className="w-4 h-4" />
                        <span>Daily Overview</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("timetable")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "timetable"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span>Time Table</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("todo")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "todo"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        <span>To-Do List</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-all duration-300 ${
                            activeTab === "history"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden md:inline">History</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("opportunities")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "opportunities"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Award className="w-4 h-4" />
                        <span>Opportunities</span>
                        {opportunities.length > 0 && (
                            <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-md">
                                {opportunities.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("habits")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "habits"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Lightbulb className="w-4 h-4" />
                        <span>Habit Booster</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "settings"
                                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                    </button>
                </nav>

                {/* Monetization / Sponsorship Showcase - Crucial for Hackathon Evaluation */}
                <div className="p-4 m-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="bg-amber-400/15 text-amber-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full block w-fit mb-1">
                        PREMIUM PLACEMENT
                    </span>
                    <h4 className="text-slate-900 dark:text-white text-xs font-bold">
                        Google Gemma Free Credits
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">
                        Get up to $300 cloud credits. Connect your account
                        today.
                    </p>
                    <button
                        onClick={() => {
                            alert(
                                "Feature Demonstration: In production, sponsors like Google pay to feature credits directly here based on user learning topics!",
                            );
                        }}
                        className="w-full mt-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white text-[10px] py-1.5 rounded font-bold transition-all"
                    >
                        Claim Credits
                    </button>
                </div>

                {/* Setup configuration Reset option */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
                    <button
                        onClick={() =>
                            setProfile((p) => ({ ...p, setupDone: false }))
                        }
                        className="w-full flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white text-xs py-2 border border-slate-200 dark:border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Configure Profile
                    </button>
                </div>
            </aside>

            {/* Main Panel Content */}
            <main
                className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-w-0"
                id="main-content"
            >
                {/* Header - Styled with Professional Polish Top bar */}
                <header
                    className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10"
                    id="header-bar"
                >
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            {activeTab === "dashboard" &&
                                "My Atomic Habits Dashboard"}
                            {activeTab === "timetable" &&
                                "AI-Generated Lifestyle Timetable"}
                            {activeTab === "history" &&
                                "Timetable History & Future"}
                            {activeTab === "todo" && "Compounding Checklist"}
                            {activeTab === "opportunities" &&
                                "Live Sourced Sponsoring & Tech Opportunities"}
                            {apiError && (
                                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-center w-full">
                                    <div>
                                        <p>{apiError}</p>
                                        {apiError.includes("429") ||
                                        apiError.includes("quota") ||
                                        apiError.includes("Rate limit") ? (
                                            <p className="mt-1 text-xs text-rose-500 font-medium">
                                                Tip: Add your own Gemini API Key
                                                in the Settings tab to avoid
                                                rate limits.
                                            </p>
                                        ) : null}
                                    </div>
                                    <button
                                        onClick={() => setApiError(null)}
                                        className="text-rose-400 hover:text-rose-600 self-start mt-1"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            {activeTab === "habits" &&
                                "Habit-Stacking Booster Recommendations"}
                        </h2>
                        <span className="hidden sm:inline-flex bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                            Gemini-3.5-Flash Grounded
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleGeneratePlan(profile)}
                            className="text-xs font-semibold flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300 rounded-lg transition-colors border border-slate-200"
                            title="Force AI to regenerate based on profile"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Regenerate Planner</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <div
                                onClick={() => setIsProfileModalOpen(true)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 flex items-center justify-center cursor-pointer hover:ring-2 ring-amber-500 transition-all"
                                title="Edit Profile"
                            >
                                <span className="text-slate-700 dark:text-slate-300 dark:text-slate-300 font-bold text-xs uppercase">
                                    {profile.interests.charAt(0) || "U"}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab/Content Areas */}
                <div
                    className="flex-1 p-6 overflow-y-auto"
                    id="content-scroller"
                >
                    {/* Active Banner warning if there are no items */}
                    {timetable.length === 0 && !loading && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">
                                    System Empty
                                </h4>
                                <p className="text-xs">
                                    No planner is active. Click "Regenerate
                                    Planner" above to brainstorm elements for
                                    your exact goals!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 1. DASHBOARD VIEW (Combines Timetable, Checklist, and Opportunities in a 3-column Bento Grid) */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-6" id="view-dashboard">
                            {/* Coaching & Motivation Banner inspired by James Clear */}
                            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="relative z-10 max-w-3xl">
                                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest block w-fit mb-3">
                                        Daily Blueprint
                                    </span>
                                    <h3 className="text-xl md:text-2xl font-black mb-2">
                                        "Every action you take is a vote for the
                                        type of person you wish to become."
                                    </h3>
                                    <p className="text-slate-300 dark:text-slate-300 text-sm italic">
                                        — Atomic Habits by James Clear. Your
                                        blueprint is structured with{" "}
                                        {profile.hoursPerDay} hours of study per
                                        day, leaving you plenty of guilt-free
                                        time for gaming and resting.
                                    </p>
                                </div>
                            </div>

                            {/* Coaching Tips */}
                            {coachingTips.length > 0 && (
                                <div className="grid md:grid-cols-3 gap-4">
                                    {coachingTips.map((tip, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                                                        Rule: {tip.rule}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-4">
                                                    {tip.explanation}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-bold uppercase block">
                                                    Action Challenge:
                                                </span>
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {tip.actionableChallenge}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Bento Grid */}
                            <div className="grid lg:grid-cols-12 gap-6">
                                {/* Dashboard Col 1: Current Timetable */}
                                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-[520px]">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                                        <div>
                                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                                Deep Work Timetable
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Week {currentWeekOffset} | Your
                                                planned micro-habits
                                            </p>
                                        </div>
                                        <div className="flex gap-2 print:hidden">
                                            <button
                                                onClick={() =>
                                                    setCurrentWeekOffset(
                                                        (prev) => prev - 1,
                                                    )
                                                }
                                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs"
                                            >
                                                Prev
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentWeekOffset(0)
                                                }
                                                className="px-2 py-1 bg-amber-500 text-slate-900 rounded text-xs font-bold"
                                            >
                                                Current
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentWeekOffset(
                                                        (prev) =>
                                                            Math.min(
                                                                1,
                                                                prev + 1,
                                                            ),
                                                    )
                                                }
                                                disabled={
                                                    currentWeekOffset >= 1
                                                }
                                                className={`px-2 py-1 rounded text-xs ${currentWeekOffset >= 1 ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-slate-200 dark:bg-slate-700"}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setActiveTab("timetable")
                                            }
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            View All
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                                        {timetable.slice(0, 5).map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex gap-3"
                                            >
                                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 dark:text-slate-400 w-12 shrink-0 pt-1">
                                                    {
                                                        item.timeRange.split(
                                                            "-",
                                                        )[0]
                                                    }
                                                </span>
                                                <div
                                                    className={`flex-1 p-3 rounded-xl border-l-4 border-y border-r border-slate-150 ${
                                                        item.colorPreset ===
                                                        "blue"
                                                            ? "bg-blue-50/50 border-l-blue-500"
                                                            : item.colorPreset ===
                                                                "emerald"
                                                              ? "bg-emerald-50/50 border-l-emerald-500"
                                                              : item.colorPreset ===
                                                                  "amber"
                                                                ? "bg-amber-50/50 border-l-amber-500"
                                                                : item.colorPreset ===
                                                                    "purple"
                                                                  ? "bg-purple-50/50 border-l-purple-500"
                                                                  : item.colorPreset ===
                                                                      "rose"
                                                                    ? "bg-rose-50/50 border-l-rose-500"
                                                                    : "bg-indigo-50/50 border-l-indigo-500"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                            {item.activity}
                                                        </h4>
                                                        <span className="text-[9px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {item.day}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-1 line-clamp-1">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {timetable.length > 5 && (
                                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 italic pt-2">
                                                + {timetable.length - 5} more
                                                items. Check "Time Table" tab.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Dashboard Col 2: Task Checklist */}
                                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-[520px]">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                                        <div>
                                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                                My Priorities
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                Atomic Habits action checklist
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab("todo")}
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            Manage To-Do
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                                        {todoList.slice(0, 6).map((item) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 border rounded-xl hover:border-blue-200 transition-colors ${
                                                    item.status === "completed"
                                                        ? "bg-slate-50 dark:bg-slate-900/50 opacity-60"
                                                        : "bg-white dark:bg-slate-900"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        item.status ===
                                                        "completed"
                                                    }
                                                    onChange={() =>
                                                        handleToggleTodo(
                                                            item.id,
                                                        )
                                                    }
                                                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={`text-xs font-bold text-slate-900 dark:text-white ${item.status === "completed" ? "line-through text-slate-500 dark:text-slate-400 dark:text-slate-400" : ""}`}
                                                    >
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span
                                                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                                                                item.priority ===
                                                                "High"
                                                                    ? "bg-rose-50 text-rose-600"
                                                                    : item.priority ===
                                                                        "Medium"
                                                                      ? "bg-amber-50 text-amber-600"
                                                                      : "bg-blue-50 text-blue-600"
                                                            }`}
                                                        >
                                                            {item.priority}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                            •
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    {item.atomicActionStep && (
                                                        <div className="mt-1.5 text-[10px] bg-amber-500/5 text-amber-700 p-1.5 rounded-lg border border-amber-500/10 font-mono">
                                                            <span className="font-bold">
                                                                2-Min Trigger:
                                                            </span>{" "}
                                                            {
                                                                item.atomicActionStep
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {todoList.length > 6 && (
                                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 italic pt-2">
                                                + {todoList.length - 6} more
                                                pending tasks.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Dashboard Col 3: Live Grounded Opportunities Scout */}
                                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-[520px]">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                                        <div>
                                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                                Opportunity Feed
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                Scholarships, Hackathons, Free
                                                Tools
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setActiveTab("opportunities")
                                            }
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            Search All
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                                        {oppsLoading ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                    Scouting latest
                                                    opportunities...
                                                </p>
                                            </div>
                                        ) : (
                                            opportunities
                                                .slice(0, 3)
                                                .map((opp, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl relative overflow-hidden"
                                                    >
                                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wide">
                                                            {opp.badge}
                                                        </span>
                                                        <h4 className="text-xs font-extrabold mt-1 text-slate-900 dark:text-white">
                                                            {opp.title}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-300 dark:text-slate-300 mt-1 line-clamp-2">
                                                            {opp.description}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                                                            <span className="text-[9px] text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                                {opp.provider}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    handleImportOpportunityToTodo(
                                                                        opp,
                                                                    )
                                                                }
                                                                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-2 py-1 rounded font-bold transition-all"
                                                            >
                                                                Add to Checklist
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. TIMETABLE TAB */}
                    {activeTab === "timetable" && (
                        <div className="space-y-6">
                            {currentWeekOffset < 0 ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                        <div>
                                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                                                Past Weeks History
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Review your past performance and
                                                completed missions.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    setCurrentWeekOffset(
                                                        (prev) => prev - 1,
                                                    )
                                                }
                                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-semibold"
                                            >
                                                Older
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setCurrentWeekOffset(0)
                                                }
                                                className="px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-bold"
                                            >
                                                Back to Current
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-6 space-y-6">
                                        {Array.from<number>(
                                            new Set(
                                                timetable.map(
                                                    (t) => t.weekIndex,
                                                ),
                                            ),
                                        )
                                            .filter((w) => w < 0)
                                            .sort((a, b) => b - a)
                                            .map((weekIdx) => {
                                                const weekItems =
                                                    timetable.filter(
                                                        (t) =>
                                                            t.weekIndex ===
                                                            weekIdx,
                                                    );
                                                return (
                                                    <div
                                                        key={weekIdx}
                                                        className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                                                    >
                                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                                Week {weekIdx}
                                                            </h4>
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                {
                                                                    weekItems.length
                                                                }{" "}
                                                                Missions
                                                            </span>
                                                        </div>
                                                        <div className="p-4">
                                                            {weekItems.length ===
                                                            0 ? (
                                                                <p className="text-sm text-slate-500 italic">
                                                                    No missions
                                                                    scheduled
                                                                    for this
                                                                    week.
                                                                </p>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {weekItems.map(
                                                                        (
                                                                            item,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                                className="flex flex-col p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                                                        {
                                                                                            item.day
                                                                                        }
                                                                                    </span>
                                                                                    <span
                                                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === "completed" ? "bg-emerald-100 text-emerald-700" : item.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}
                                                                                    >
                                                                                        {item.status ||
                                                                                            "pending"}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                                                                    {
                                                                                        item.activity
                                                                                    }
                                                                                </span>
                                                                                <span className="text-xs text-slate-500 font-mono">
                                                                                    {
                                                                                        item.timeRange
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                <WeeklyTimetable
                                    items={timetable.filter(
                                        (t) =>
                                            t.weekIndex === currentWeekOffset,
                                    )}
                                    onAddItem={(item) =>
                                        setTimetable((prev) => [
                                            ...prev,
                                            {
                                                ...item,
                                                id: `time-${Date.now()}`,
                                                weekIndex: currentWeekOffset,
                                            },
                                        ])
                                    }
                                    onUpdateItem={handleUpdateTimetableItem}
                                    onDeleteItem={handleDeleteTime}
                                    onModifyTimetable={handleModifyTimetable}
                                    weekOffset={currentWeekOffset}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === "history" && (
                        <div className="space-y-6" id="view-history">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                    <div>
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                                            Time Travel
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            View past weeks or plan ahead for
                                            the next week.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                setCurrentWeekOffset(-1)
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${currentWeekOffset < 1 ? "bg-amber-500 text-slate-900" : "bg-slate-200 dark:bg-slate-800"}`}
                                        >
                                            Prev Week
                                        </button>
                                        <button
                                            onClick={() =>
                                                setCurrentWeekOffset(1)
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${currentWeekOffset === 1 ? "bg-amber-500 text-slate-900" : "bg-slate-200 dark:bg-slate-800"}`}
                                        >
                                            Next Week
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    {currentWeekOffset < 1 ? (
                                        <div className="space-y-6">
                                            {Array.from<number>(
                                                new Set([
                                                    0,
                                                    ...timetable.map(
                                                        (t) => t.weekIndex,
                                                    ),
                                                ]),
                                            )
                                                .filter((w) => w <= 0)
                                                .sort((a, b) => b - a)
                                                .map((weekIdx) => {
                                                    const weekItems =
                                                        timetable.filter(
                                                            (t) =>
                                                                t.weekIndex ===
                                                                weekIdx,
                                                        );
                                                    return (
                                                        <div
                                                            key={weekIdx}
                                                            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                                                        >
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                                                <h4 className="font-bold text-slate-900 dark:text-white">
                                                                    Week{" "}
                                                                    {weekIdx ===
                                                                    0
                                                                        ? "0 (Current Week)"
                                                                        : weekIdx}
                                                                </h4>
                                                                <span className="text-xs font-semibold text-slate-500">
                                                                    {
                                                                        weekItems.length
                                                                    }{" "}
                                                                    Missions
                                                                </span>
                                                            </div>
                                                            <div className="p-4">
                                                                {weekItems.length ===
                                                                0 ? (
                                                                    <p className="text-sm text-slate-500 italic">
                                                                        No
                                                                        missions
                                                                        scheduled
                                                                        for this
                                                                        week.
                                                                    </p>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {weekItems.map(
                                                                            (
                                                                                item,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        item.id
                                                                                    }
                                                                                    className="flex flex-col p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
                                                                                >
                                                                                    <div className="flex justify-between items-start mb-2">
                                                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                                                            {
                                                                                                item.day
                                                                                            }
                                                                                        </span>
                                                                                        <span
                                                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === "completed" ? "bg-emerald-100 text-emerald-700" : item.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}
                                                                                        >
                                                                                            {item.status ||
                                                                                                "pending"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                                                                        {
                                                                                            item.activity
                                                                                        }
                                                                                    </span>
                                                                                    <span className="text-xs text-slate-500 font-mono">
                                                                                        {
                                                                                            item.timeRange
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ) : (
                                        <WeeklyTimetable
                                            items={timetable.filter(
                                                (t) =>
                                                    t.weekIndex ===
                                                    currentWeekOffset,
                                            )}
                                            onAddItem={(item) =>
                                                setTimetable((prev) => [
                                                    ...prev,
                                                    {
                                                        ...item,
                                                        id: `time-${Date.now()}`,
                                                        weekIndex:
                                                            currentWeekOffset,
                                                    },
                                                ])
                                            }
                                            onUpdateItem={
                                                handleUpdateTimetableItem
                                            }
                                            onDeleteItem={handleDeleteTime}
                                            onModifyTimetable={
                                                handleModifyTimetable
                                            }
                                            weekOffset={currentWeekOffset}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. TO-DO TAB */}
                    {activeTab === "todo" && (
                        <div className="space-y-6" id="view-todo">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                                {/* Manual To-Do Form */}
                                <div className="pb-6 border-b border-slate-100">
                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                        Create New Task
                                    </h3>
                                    <form
                                        onSubmit={handleAddManualTodo}
                                        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                                    >
                                        <div className="md:col-span-2">
                                            <label className="block text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[10px] uppercase font-bold mb-1.5">
                                                Task Description / Goal
                                            </label>
                                            <input
                                                type="text"
                                                value={newTodoTitle}
                                                onChange={(e) =>
                                                    setNewTodoTitle(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none"
                                                placeholder="e.g. Master React useState hook"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[10px] uppercase font-bold mb-1.5">
                                                Priority
                                            </label>
                                            <select
                                                value={newTodoPriority}
                                                onChange={(e) =>
                                                    setNewTodoPriority(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none"
                                            >
                                                {["High", "Medium", "Low"].map(
                                                    (p) => (
                                                        <option
                                                            key={p}
                                                            value={p}
                                                        >
                                                            {p}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Task
                                        </button>
                                    </form>
                                </div>

                                {/* Checklist Output */}
                                <div className="py-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                            My Compounding List
                                        </h4>
                                        <button
                                            onClick={
                                                handleGenerateTimetableFromTasks
                                            }
                                            className="text-xs font-bold px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded flex items-center gap-1.5 transition-colors"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />{" "}
                                            Generate Missions from Tasks
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {todoList.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-start justify-between p-4 border rounded-2xl transition-all ${
                                                    item.status === "completed"
                                                        ? "bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60"
                                                        : "bg-white dark:bg-slate-900 border-slate-200/80 hover:border-slate-300 shadow-sm"
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            item.status ===
                                                            "completed"
                                                        }
                                                        onChange={() =>
                                                            handleToggleTodo(
                                                                item.id,
                                                            )
                                                        }
                                                        className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
                                                    />
                                                    <div>
                                                        <p
                                                            className={`text-sm font-extrabold text-slate-900 dark:text-white ${item.status === "completed" ? "line-through text-slate-500 dark:text-slate-400 dark:text-slate-400" : ""}`}
                                                        >
                                                            {item.title}
                                                        </p>

                                                        {/* Date Pickers */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex flex-col">
                                                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                                                    Start Date
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={
                                                                        item.startDate ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleUpdateTodoDate(
                                                                            item.id,
                                                                            "startDate",
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[9px] font-bold text-slate-500 uppercase">
                                                                    End Date
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={
                                                                        item.endDate ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleUpdateTodoDate(
                                                                            item.id,
                                                                            "endDate",
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Badges */}
                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                            <span
                                                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                                                    item.priority ===
                                                                    "High"
                                                                        ? "bg-rose-50 text-rose-600 border border-rose-100"
                                                                        : item.priority ===
                                                                            "Medium"
                                                                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                                                                          : "bg-blue-50 text-blue-600 border border-blue-100"
                                                                }`}
                                                            >
                                                                Priority:{" "}
                                                                {item.priority}
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-300 text-xs">
                                                                |
                                                            </span>
                                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-slate-200">
                                                                {item.category}
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-300 text-xs">
                                                                |
                                                            </span>
                                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                                                {profile.hoursPerDay &&
                                                                profile.daysPerWeek
                                                                    ? (
                                                                          item.estimatedMinutes /
                                                                          60 /
                                                                          (profile.hoursPerDay *
                                                                              profile.daysPerWeek)
                                                                      ).toFixed(
                                                                          1,
                                                                      ) +
                                                                      " Weeks Left"
                                                                    : (
                                                                          item.estimatedMinutes /
                                                                          60 /
                                                                          10
                                                                      ).toFixed(
                                                                          1,
                                                                      ) +
                                                                      " Weeks Left"}
                                                                (
                                                                {(
                                                                    item.estimatedMinutes /
                                                                    60
                                                                ).toFixed(
                                                                    1,
                                                                )}{" "}
                                                                hrs)
                                                            </span>
                                                        </div>

                                                        {/* James Clear Atomic Starting Action trigger */}
                                                        {item.atomicActionStep && (
                                                            <div className="mt-3 bg-amber-500/5 text-amber-800 p-2.5 rounded-xl border border-amber-500/10 font-mono text-[11px] max-w-xl">
                                                                <span className="font-bold">
                                                                    ⚡ 2-Minute
                                                                    Habit
                                                                    Starter Cue:
                                                                </span>{" "}
                                                                {
                                                                    item.atomicActionStep
                                                                }
                                                            </div>
                                                        )}

                                                        {/* Resource Links */}
                                                        {item.resources &&
                                                            item.resources
                                                                .length > 0 && (
                                                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-bold uppercase">
                                                                        FREE
                                                                        SOURCES:
                                                                    </span>
                                                                    {item.resources.map(
                                                                        (
                                                                            linkStr,
                                                                            idx,
                                                                        ) => (
                                                                            <a
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                href={
                                                                                    linkStr.startsWith(
                                                                                        "http",
                                                                                    )
                                                                                        ? linkStr
                                                                                        : `https://www.google.com/search?q=${encodeURIComponent(linkStr)}`
                                                                                }
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline"
                                                                            >
                                                                                <span>
                                                                                    {linkStr.length >
                                                                                    30
                                                                                        ? "Resource Link"
                                                                                        : linkStr}
                                                                                </span>
                                                                                <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        handleDeleteTodo(
                                                            item.id,
                                                        )
                                                    }
                                                    className="text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {todoList.length === 0 && (
                                            <div className="py-12 text-center">
                                                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                    All habits and targets
                                                    completed! Add some more
                                                    above.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. OPPORTUNITIES TAB */}
                    {activeTab === "opportunities" && (
                        <div className="space-y-6" id="view-opportunities">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                                {/* Grounding Search Bar */}
                                <div className="pb-6 border-b border-slate-100">
                                    <div className="max-w-2xl">
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                                            Search the Grounded Web
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-4">
                                            Enter customized domains or
                                            categories (e.g. "free nodejs
                                            databases", "Web dev hackathons
                                            summer 2026", "Outreachy remote
                                            internship criteria"). Gemini will
                                            query the live web utilizing Google
                                            Search Grounding to find verified
                                            active entries.
                                        </p>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Search for sponsorships, credits, free hosting tiers..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white dark:bg-slate-900 transition-colors"
                                                />
                                                <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-400 absolute left-3.5 top-3" />
                                            </div>
                                            <button
                                                onClick={() =>
                                                    fetchOpportunities(
                                                        profile.interests,
                                                        searchQuery,
                                                    )
                                                }
                                                disabled={oppsLoading}
                                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {oppsLoading ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <Search className="w-3.5 h-3.5" />
                                                )}
                                                <span>Find Sourced Info</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sourced Elements Grid */}
                                <div className="py-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                            {searchQuery
                                                ? `Verified Search Results for "${searchQuery}"`
                                                : "Tailored Dev Opportunities"}
                                        </h4>
                                        {oppsLoading && (
                                            <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 animate-pulse">
                                                Consulting live database...
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {opportunities.map((opp, idx) => (
                                            <div
                                                key={idx}
                                                className="p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="bg-amber-400/15 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                            {opp.badge}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-mono">
                                                            {opp.type}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">
                                                        {opp.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-300 dark:text-slate-300 mb-4">
                                                        {opp.description}
                                                    </p>

                                                    {/* Benefits & criteria */}
                                                    <div className="space-y-2 mb-4">
                                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                                                            <span className="text-blue-400 font-bold block">
                                                                Benefit /
                                                                Support Package:
                                                            </span>
                                                            <p className="text-slate-300 dark:text-slate-300 mt-0.5">
                                                                {opp.benefits}
                                                            </p>
                                                        </div>
                                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                                                            <span className="text-emerald-400 font-bold block">
                                                                Requirements:
                                                            </span>
                                                            <p className="text-slate-300 dark:text-slate-300 mt-0.5">
                                                                {
                                                                    opp.requirements
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-bold">
                                                        Provider: {opp.provider}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={
                                                                opp.actionLink.startsWith(
                                                                    "http",
                                                                )
                                                                    ? opp.actionLink
                                                                    : `https://www.google.com/search?q=${encodeURIComponent(opp.actionLink)}`
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                        >
                                                            <span>Website</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        <button
                                                            onClick={() =>
                                                                handleImportOpportunityToTodo(
                                                                    opp,
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            Add To-Do
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sourced Citations / Grounding verification URLs */}
                                    {sources.length > 0 && (
                                        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl">
                                            <h5 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wide mb-2">
                                                Google Grounding References
                                            </h5>
                                            <div className="flex flex-wrap gap-3">
                                                {sources.map((source, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={source.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200"
                                                    >
                                                        <span>
                                                            {source.title ||
                                                                "Search Reference"}
                                                        </span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. HABIT BOOSTER TAB */}
                    {activeTab === "habits" && (
                        <div className="space-y-6" id="view-habits">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="pb-6 border-b border-slate-100">
                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                                        Habit-Stacking Core Recommendations
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                        Proven incremental growth workflows
                                        modeled directly on compounding career
                                        progress. Click to import them straight
                                        to your task schedule.
                                    </p>
                                </div>

                                <div className="py-6">
                                    {habitsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                                Loading daily compounding habit
                                                options...
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {habitRecommendations.map(
                                                (rec, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-5 bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl hover:border-blue-300 transition-colors shadow-sm flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                    {
                                                                        rec.category
                                                                    }
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-mono">
                                                                    Est:{" "}
                                                                    {
                                                                        rec.estimatedMinutes
                                                                    }{" "}
                                                                    mins
                                                                </span>
                                                            </div>

                                                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                                                                {rec.title}
                                                            </h4>
                                                            <span className="text-[10px] text-amber-600 font-bold block mb-3">
                                                                Principle:{" "}
                                                                {
                                                                    rec.habitPrinciple
                                                                }
                                                            </span>

                                                            <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-4">
                                                                {
                                                                    rec.description
                                                                }
                                                            </p>

                                                            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 rounded-2xl text-xs mb-4">
                                                                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                                                                    Step-By-Step
                                                                    / Trigger
                                                                    Workflow:
                                                                </span>
                                                                <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 italic">
                                                                    {
                                                                        rec.actionSteps
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                                                            <button
                                                                onClick={() =>
                                                                    handleImportHabitToTodo(
                                                                        rec,
                                                                    )
                                                                }
                                                                className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Add Habit
                                                                Challenge
                                                            </button>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. SETTINGS TAB */}
                    {activeTab === "settings" && (
                        <div className="space-y-6" id="view-settings">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                                        App Settings
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Configure your preferences, API keys,
                                        and custom settings.
                                    </p>
                                </div>

                                <div className="py-6">
                                    <div className="max-w-xl space-y-4">
                                        <div>
                                            <label className="block text-slate-900 dark:text-white text-sm font-bold mb-2">
                                                Gemini API Key
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                Provide your own Gemini API key
                                                to avoid rate limits and use
                                                your own quota. If left empty,
                                                the app will use its default
                                                rate-limited key.
                                            </p>
                                            <input
                                                type="password"
                                                value={customApiKey}
                                                onChange={(e) =>
                                                    handleSaveApiKey(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="AIzaSy..."
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {selectedTaskId && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">
                                Task Plan (All Weeks)
                            </h3>
                            <button
                                onClick={() => setSelectedTaskId(null)}
                                className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            {timetable
                                .filter((t) => t.taskId === selectedTaskId)
                                .sort((a, b) => a.weekIndex - b.weekIndex)
                                .map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg flex justify-between items-center"
                                    >
                                        <div>
                                            <span className="text-xs font-bold bg-amber-500 px-2 py-1 rounded text-slate-900">
                                                Week {t.weekIndex}
                                            </span>
                                            <span className="text-xs font-bold bg-blue-500 px-2 py-1 rounded text-white ml-2">
                                                {t.day} {t.timeRange}
                                            </span>
                                            <p className="text-sm font-semibold dark:text-white mt-1">
                                                {t.activity}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                                            {t.status}
                                        </span>
                                    </div>
                                ))}
                            {timetable.filter(
                                (t) => t.taskId === selectedTaskId,
                            ).length === 0 && (
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    No missions assigned to this task.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl">
                        <AIPlannerSetup
                            onGenerate={async (p) => {
                                await handleGeneratePlan(p);
                                setIsProfileModalOpen(false);
                            }}
                            loading={loading}
                            initialProfile={profile}
                            mode="edit"
                            onCancel={() => setIsProfileModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
