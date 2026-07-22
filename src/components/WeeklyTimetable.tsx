import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Download,
  Gamepad,
  Coffee,
  BookOpen,
  AlertCircle,
  Sparkles,
  Check,
  FileText,
} from "lucide-react";
import { TimetableItem } from "../types";
import { jsPDF } from "jspdf";
import domtoimage from "dom-to-image";

// Helper for Completion Tracking & Locking
const isActivityLocked = (
  renderedDay: string,
  timeRange: string,
  weekOffset: number = 0,
): boolean => {
  if (weekOffset < 0) return true;
  if (weekOffset > 0) return false;
  const map: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };
  const targetDayIdx = map[renderedDay];
  if (targetDayIdx === undefined) return false;

  const now = new Date();
  const jsDay = now.getDay();
  const currentDayIdx = jsDay === 0 ? 6 : jsDay - 1;

  const diff = targetDayIdx - currentDayIdx;

  const parts = timeRange.split("-");
  if (parts.length !== 2) return false;
  const endStr = parts[1].trim();

  const match = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  targetDate.setHours(hours, mins, 0, 0);

  const lockedDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
  return now.getTime() > lockedDate.getTime();
};

interface WeeklyTimetableProps {
  items: TimetableItem[];
  onAddItem: (item: Omit<TimetableItem, "id">) => void;
  onUpdateItem: (item: TimetableItem) => void;
  onDeleteItem: (id: string) => void;
  onModifyTimetable: (prompt: string) => void;
  weekOffset?: number;
}

export default function WeeklyTimetable({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onModifyTimetable,
  weekOffset = 0,
}: WeeklyTimetableProps) {
  const [layoutFormat, setLayoutFormat] = useState<
    "timeline" | "cards" | "grid"
  >("cards");
  const [filterDay, setFilterDay] = useState<string>("All");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);

  // Persisted Completion Tracking
  const [itemStatus, setItemStatus] = useState<
    Record<string, "completed" | "failed" | "pending">
  >(() => {
    try {
      const saved = localStorage.getItem("habitvector_item_status");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("habitvector_item_status", JSON.stringify(itemStatus));
  }, [itemStatus]);

  const handleUpdateStatus = (
    id: string,
    newStatus: "completed" | "failed" | "pending",
  ) => {
    const itemToUpdate = items.find((i) => i.id === id);
    if (itemToUpdate) {
      if (newStatus === "failed") {
        // Just fail it, no pushing forward (simplification)
        onUpdateItem({ ...itemToUpdate, status: "failed" });
      } else {
        onUpdateItem({ ...itemToUpdate, status: newStatus as any });
      }
    }
  };

  const renderStatusButtons = (item: TimetableItem, day: string) => {
    const status = item.status || "pending";
    const locked =
      (isActivityLocked(day, item.timeRange, weekOffset) &&
        status !== "completed") ||
      status === "failed" ||
      weekOffset > 0;

    return (
      <div className="flex flex-wrap items-center justify-center gap-1 mt-auto z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateStatus(item.id, "completed");
          }}
          disabled={locked}
          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            status === "completed"
              ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50"
          }`}
        >
          Done ✔
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateStatus(item.id, "failed");
          }}
          disabled={locked}
          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            status === "failed"
              ? "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50"
          }`}
        >
          Failed ✘
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateStatus(item.id, "pending");
          }}
          disabled={locked}
          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            status === "pending"
              ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50"
          }`}
        >
          Ongoing
        </button>
      </div>
    );
  };

  // State for Add/Edit item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimetableItem | null>(null);

  // Form Fields
  const [formDay, setFormDay] = useState("Monday");
  const [formTime, setFormTime] = useState("09:00 AM - 10:00 AM");
  const [formActivity, setFormActivity] = useState("");
  const [formCategory, setFormCategory] = useState("Study");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("blue");

  const daysOfWeek = [
    "Everyday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const colorPresets = ["blue", "emerald", "amber", "purple", "rose", "indigo"];
  const categories = [
    "Study",
    "Coding Practice",
    "Leisure & Gaming",
    "Rest",
    "Physical/Review",
  ];

  const handleModifyTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !onModifyTimetable) return;

    setIsModifying(true);
    try {
      await onModifyTimetable(aiPrompt);
      setAiPrompt("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsModifying(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormDay("Monday");
    setFormTime("09:00 AM - 10:00 AM");
    setFormActivity("");
    setFormCategory("Study");
    setFormDescription("");
    setFormColor("blue");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TimetableItem) => {
    setEditingItem(item);
    setFormDay(item.day);
    setFormTime(item.timeRange);
    setFormActivity(item.activity);
    setFormCategory(item.category);
    setFormDescription(item.description);
    setFormColor(item.colorPreset);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim()) return;

    const payload = {
      day: formDay,
      timeRange: formTime,
      activity: formActivity,
      category: formCategory,
      description: formDescription,
      colorPreset: formColor,
      weekIndex: weekOffset,
      status: "pending" as any,
    };

    if (editingItem) {
      onUpdateItem({ ...payload, id: editingItem.id });
    } else {
      onAddItem(payload);
    }
    setIsModalOpen(false);
  };

  const addQuickBreak = () => {
    onAddItem({
      day: "Everyday",
      timeRange: "04:00 PM - 05:00 PM",
      activity: "Guilt-Free Video Game Reward",
      category: "Leisure & Gaming",
      description:
        "Scheduled reward block. Play your favorite RPG/shooter completely guilt-free to recharge your brain!",
      colorPreset: "purple",
      weekIndex: weekOffset,
      status: "pending" as any,
    });
  };

  // Helper to color borders/backgrounds based on custom preset
  const getColorClasses = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
      case "amber":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
      case "purple":
        return "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400";
      case "rose":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
      case "indigo":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400";
    }
  };

  // Export as Google Calendar / Standard .ics Format

  const handleExportPDF = async () => {
    const element = document.getElementById("timetable-component");
    if (!element) return;
    try {
      // Create a wrapper or use the element directly
      // dom-to-image uses SVG foreignObject which perfectly supports Tailwind v4 oklch()
      const imgData = await domtoimage.toPng(element, { bgcolor: '#ffffff' });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // We need aspect ratio. Since we only have the data URL, we can load it in an Image to get dimensions
      const img = new Image();
      img.src = imgData;
      img.onload = () => {
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("Atomic_Timetable.pdf");
      };
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };

  const exportToICS = () => {
    let icsContent =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Atomic Planner//NONSGML v1.0//EN\r\n";

    items.forEach((item, index) => {
      // Create a weekly recurring event
      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:atomic-habit-event-${index}-${Date.now()}@atomicplanner.com\r\n`;
      icsContent += `SUMMARY:${item.activity}\r\n`;
      icsContent += `DESCRIPTION:${item.description} (${item.category})\r\n`;

      // Determine Day abbreviation for recurrence rule
      let byDay = "MO";
      if (item.day === "Tuesday") byDay = "TU";
      else if (item.day === "Wednesday") byDay = "WE";
      else if (item.day === "Thursday") byDay = "TH";
      else if (item.day === "Friday") byDay = "FR";
      else if (item.day === "Saturday") byDay = "SA";
      else if (item.day === "Sunday") byDay = "SU";
      else if (item.day === "Everyday") byDay = "MO,TU,WE,TH,FR,SA,SU";

      // Simple pseudo schedule date: start tomorrow at given hour
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1);
      const yearStr = nextDate.getFullYear();
      const monthStr = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dayStr = String(nextDate.getDate()).padStart(2, "0");

      // Parse e.g., '09:00 AM'
      let hourStr = "09";
      let minStr = "00";
      const match = item.timeRange.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1]);
        minStr = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        hourStr = String(hour).padStart(2, "0");
      }

      icsContent += `DTSTART;TZID=UTC:${yearStr}${monthStr}${dayStr}T${hourStr}${minStr}00\r\n`;
      icsContent += `DTEND;TZID=UTC:${yearStr}${monthStr}${dayStr}T${String(parseInt(hourStr) + 1).padStart(2, "0")}${minStr}00\r\n`;
      if (item.day !== "Everyday") {
        icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${byDay}\r\n`;
      } else {
        icsContent += "RRULE:FREQ=DAILY\r\n";
      }
      icsContent += "END:VEVENT\r\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Atomic_Habits_Schedule.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = filterDay === "All" ? items : items.filter((item) => {
    const itemDay = item.day ? item.day.toLowerCase() : "";
    return itemDay === filterDay.toLowerCase() || itemDay === "everyday";
  });

  return (
    <div className="space-y-6" id="timetable-component">
      {/* AI Timetable Modifier Bar */}
      {onModifyTimetable && (
        <form
          onSubmit={handleModifyTimetable}
          className="flex gap-2 w-full print:hidden"
        >
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI to modify timetable (e.g. 'Add 2 hours of Blender on Tuesday', 'Remove study on weekend')"
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white text-sm outline-none transition-all"
              disabled={isModifying}
            />
          </div>
          <button
            type="submit"
            disabled={isModifying || !aiPrompt.trim()}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white dark:text-slate-950 font-bold rounded-xl text-sm transition-all whitespace-nowrap"
          >
            {isModifying ? "Updating..." : "Modify"}
          </button>
        </form>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            My Weekly Habit Timetable
          </h2>
          <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs mt-1">
            Toggle formats to view your days. Stick to the scheduled blocks and
            reward yourself completely afterwards!
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {/* Format Selection Buttons */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setLayoutFormat("timeline")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${layoutFormat === "timeline" ? "bg-amber-500 text-white dark:text-slate-950" : "text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
            >
              Timeline
            </button>
            <button
              onClick={() => setLayoutFormat("cards")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${layoutFormat === "cards" ? "bg-amber-500 text-white dark:text-slate-950" : "text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
            >
              Day Columns
            </button>
            <button
              onClick={() => setLayoutFormat("grid")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${layoutFormat === "grid" ? "bg-amber-500 text-white dark:text-slate-950" : "text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
            >
              Calendar Grid
            </button>
          </div>

          <button
            onClick={addQuickBreak}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 text-xs rounded-lg transition-all"
          >
            <Gamepad className="w-4 h-4" />+ Game Reward Block
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 text-xs rounded-lg transition-all"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={exportToICS}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/30 text-xs rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
            Sync with Google Calendar
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white dark:text-slate-950 hover:bg-amber-600 font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Mission
          </button>
        </div>
      </div>

      {/* Day Filter bar (except for Grid layout) */}
      {layoutFormat !== "grid" && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setFilterDay("All")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${filterDay === "All" ? "bg-amber-500/25 border-amber-500 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
          >
            All Scheduled Days
          </button>
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setFilterDay(day)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${filterDay === day ? "bg-amber-500/25 border-amber-500 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"}`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* FORMAT 1: TIMELINE VIEW */}
      {layoutFormat === "timeline" && (
        <div className="space-y-4" id="timetable-timeline-format">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 text-sm">
                No scheduled missions found for this day. Click 'Add Mission' or
                trigger AI setup.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
              {filteredItems.map((item) => {
                const colors = getColorClasses(item.colorPreset);
                const status = item.status || "pending";
                const locked =
                  (isActivityLocked(item.day, item.timeRange, weekOffset) &&
                    status !== "completed") ||
                  status === "failed" ||
                  weekOffset < 0;
                return (
                  <div key={item.id} className="relative group">
                    {/* Circle Dot Marker */}
                    <span
                      className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-950 ${colors.split(" ")[2]} bg-white dark:bg-slate-900 flex items-center justify-center`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    </span>

                    <div
                      key={item.id}
                      onDoubleClick={() => handleOpenEdit(item)}
                      className={`p-4 rounded-xl border ${colors.split(" ")[0]} ${colors.split(" ")[1]} transition-all hover:bg-slate-900/40 cursor-pointer`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 dark:text-white font-semibold text-base">
                              {item.activity}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 uppercase">
                              {item.category}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                              {item.day}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {item.timeRange}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 dark:text-slate-300 text-sm mt-2 max-w-2xl">
                            {item.description}
                          </p>
                          <div className="mt-3 flex justify-start">
                            {renderStatusButtons(
                              item,
                              item.day === "Everyday"
                                ? filterDay !== "All"
                                  ? filterDay
                                  : "Monday"
                                : item.day,
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-amber-600 dark:text-amber-400 rounded-lg transition-all"
                            title="Edit Mission"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!locked) onDeleteItem(item.id);
                            }}
                            disabled={locked}
                            className={`p-1.5 ${locked ? "opacity-50 cursor-not-allowed" : ""} bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400 rounded-lg transition-all`}
                            title="Delete Mission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FORMAT 2: CARDS GROUPED BY DAY */}
      {layoutFormat === "cards" && (
        <div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          id="timetable-cards-format"
        >
          {daysOfWeek
            .filter((d) =>
              filterDay === "All" ? d !== "Everyday" : d === filterDay,
            )
            .map((day) => {
              const dayItems = items.filter(
                (item) => {
                  const itemDay = item.day ? item.day.toLowerCase() : "";
                  const targetDay = day.toLowerCase();
                  return itemDay === targetDay || itemDay === "everyday";
                }
              );
              return (
                <div
                  key={day}
                  className="bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col h-full"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                    <h3 className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      {day}
                    </h3>
                    <span className="text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs font-mono">
                      {dayItems.length} active slots
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
                    {dayItems.length === 0 ? (
                      <p className="text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs italic py-4 text-center">
                        No active work slots scheduled.
                      </p>
                    ) : (
                      dayItems.map((item) => {
                        const colors = getColorClasses(item.colorPreset);
                        const status = item.status || "pending";
                        const locked =
                          (isActivityLocked(
                            item.day,
                            item.timeRange,
                            weekOffset,
                          ) &&
                            status !== "completed") ||
                          status === "failed" ||
                          weekOffset < 0;
                        return (
                          <div
                            key={item.id}
                            onDoubleClick={() => handleOpenEdit(item)}
                            className={`p-3 rounded-xl border ${colors.split(" ")[0]} ${colors.split(" ")[1]} group relative cursor-pointer`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-slate-900 dark:text-white font-semibold text-xs leading-snug">
                                {item.activity}
                              </h4>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-amber-600 dark:text-amber-400 p-0.5"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (!locked) onDeleteItem(item.id);
                                  }}
                                  disabled={locked}
                                  className={`text-slate-600 ${locked ? "opacity-50 cursor-not-allowed" : ""} dark:text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:text-rose-400 p-0.5`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-1.5">
                              <Clock className="w-3 h-3 text-slate-700 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                              {item.timeRange}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 text-[11px] mt-1.5 leading-normal line-clamp-2">
                              {item.description}
                            </p>
                            <div className="mt-2.5">
                              {renderStatusButtons(item, day)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* FORMAT 3: CALENDAR GRID (School Layout) */}
      {layoutFormat === "grid" && (
        <div
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm"
          id="timetable-grid-format"
        >
          <div className="min-w-[900px]">
            {/* Grid Header days */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center text-sm font-bold text-slate-700 dark:text-slate-700 dark:text-slate-300 dark:text-slate-300">
              <div className="p-3 border-r border-slate-200 dark:border-slate-800">
                Time
              </div>
              {daysOfWeek
                .filter((d) => d !== "Everyday")
                .map((d, i) => (
                  <div
                    key={d}
                    className={`p-3 ${i !== 6 ? "border-r border-slate-200 dark:border-slate-800" : ""}`}
                  >
                    {d}
                  </div>
                ))}
            </div>

            {/* Dynamic Grid rows */}
            {items.length === 0 ? (
              <div className="p-12 text-center border-b border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400 text-sm italic">No active work slots scheduled for this week.</p>
              </div>
            ) : (
              Array.from(new Set(items.map(i => i.timeRange))).sort().map((timeSlot, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 min-h-[100px] items-stretch text-center"
              >
                <div className="p-2 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-medium text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">
                  {timeSlot}
                </div>

                {daysOfWeek
                  .filter((d) => d !== "Everyday")
                  .map((day, dIdx) => {
                    const matched = items.find((item) => {
                      const itemDay = item.day ? item.day.toLowerCase() : "";
                      const targetDay = day.toLowerCase();
                      if (itemDay !== targetDay && itemDay !== "everyday") return false;
                      return item.timeRange === timeSlot;
                    });

                    return (
                      <div
                        key={day}
                        className={`p-2 flex flex-col ${dIdx !== 6 ? "border-r border-slate-200 dark:border-slate-800" : ""}`}
                      >
                        {matched ? (
                          <div
                            onDoubleClick={() => handleOpenEdit(matched)}
                            className={`flex-1 flex flex-col justify-between cursor-pointer group p-2 rounded-lg border ${getColorClasses(matched.colorPreset).split(" ")[0]} ${getColorClasses(matched.colorPreset).split(" ")[1]}`}
                          >
                            <div className="text-slate-900 dark:text-white font-semibold text-xs leading-tight mb-2">
                              {matched.activity}
                              <button
                                onClick={() => handleOpenEdit(matched)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 ml-1 inline-block"
                              >
                                <Edit2 className="w-3 h-3 inline" />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1 mt-auto">
                              {renderStatusButtons(matched, day)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 italic text-xs">
                            -
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )))}
            {/* Completion Rate Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 font-mono text-sm border-t-2 border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                Completion Rate :
              </h4>
              <div className="space-y-1 pl-4 text-slate-600 dark:text-slate-400 dark:text-slate-400">
                {(() => {
                  const allRenderedItems: {
                    id: string;
                    day: string;
                    category: string;
                  }[] = [];
                  items.forEach((i) => {
                    if (i.day === "Everyday") {
                      [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].forEach((d) => {
                        allRenderedItems.push({
                          id: i.id,
                          day: d,
                          category: i.category,
                        });
                      });
                    } else {
                      allRenderedItems.push({
                        id: i.id,
                        day: i.day,
                        category: i.category,
                      });
                    }
                  });

                  const total = allRenderedItems.length || 1; // avoid div by 0
                  const done = allRenderedItems.filter(
                    (i) => itemStatus[`${i.id}-${i.day}`] === "completed",
                  ).length;

                  const studyItems = allRenderedItems.filter(
                    (i) => i.category === "Study",
                  );
                  const studyDone = studyItems.filter(
                    (i) => itemStatus[`${i.id}-${i.day}`] === "completed",
                  ).length;

                  const practiceItems = allRenderedItems.filter(
                    (i) => i.category === "Coding Practice",
                  );
                  const practiceDone = practiceItems.filter(
                    (i) => itemStatus[`${i.id}-${i.day}`] === "completed",
                  ).length;

                  return (
                    <>
                      <div>
                        - Overall Activity : {Math.round((done / total) * 100)}{" "}
                        / 100
                      </div>
                      <div>
                        - Study :{" "}
                        {studyItems.length
                          ? Math.round((studyDone / studyItems.length) * 100)
                          : 0}{" "}
                        / 100
                      </div>
                      <div>
                        - Practice :{" "}
                        {practiceItems.length
                          ? Math.round(
                              (practiceDone / practiceItems.length) * 100,
                            )
                          : 0}{" "}
                        / 100
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? "Edit Timetable Entry" : "Add Timetable Entry"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={formActivity}
                  onChange={(e) => setFormActivity(e.target.value)}
                  placeholder="e.g., Study CSS Grid basics"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg text-slate-900 dark:text-white text-sm outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                    Day of the Week
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg text-slate-900 dark:text-white text-sm outline-none"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                    Time Period
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g., 09:00 AM - 10:30 AM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg text-slate-900 dark:text-white text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg text-slate-900 dark:text-white text-sm outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                    Color Accent
                  </label>
                  <div className="flex gap-2 items-center h-9">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormColor(color)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          color === "blue"
                            ? "bg-blue-500"
                            : color === "emerald"
                              ? "bg-emerald-500"
                              : color === "amber"
                                ? "bg-amber-500"
                                : color === "purple"
                                  ? "bg-purple-500"
                                  : color === "rose"
                                    ? "bg-rose-500"
                                    : "bg-indigo-500"
                        } ${formColor === color ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
                  Short Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Why is this scheduled? What will you study?"
                  className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-lg text-slate-900 dark:text-white text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
