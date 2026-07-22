import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldAlert, BookOpen, Gamepad2, Award } from "lucide-react";
import { UserGoalProfile } from "../types";

interface AIPlannerSetupProps {
  onGenerate: (profile: UserGoalProfile) => Promise<void> | void;
  loading?: boolean;
  initialProfile?: UserGoalProfile;
  mode?: 'setup' | 'edit';
  onCancel?: () => void;
}

export default function AIPlannerSetup({ onGenerate, loading, initialProfile, mode = 'setup', onCancel }: AIPlannerSetupProps) {
  const [profile, setProfile] = useState<UserGoalProfile>(initialProfile || {
    interests: "",
    educationLevel: "",
    hoursPerDay: 4,
    daysPerWeek: 3,
    examDate: "",
    currentProblems: "",
    setupDone: false
  });

  const [currentStep, setCurrentStep] = useState<"welcome" | "configure">(mode === 'edit' ? 'configure' : 'welcome');
  const [loadingStepText, setLoadingStepText] = useState("Initializing Brainstorm Engine...");

  const presets = [
    {
      name: "Frustrated CS Student",
      interests: "Computer engineering student, React web dev, CSS design, building a portfolio.",
      hoursPerDay: 3,
      daysPerWeek: 4,
      currentProblems: "Third year. Waiting until last minute to study. Stressed, has zero portfolio projects, watches hackathon videos but procrastinates entering.",
      icon: ShieldAlert
    },
    {
      name: "Absolute Web Beginner",
      interests: "Learning HTML, CSS, JavaScript basics from scratch, building simple static web tools.",
      hoursPerDay: 2,
      daysPerWeek: 3,
      currentProblems: "Easily overwhelmed by large coding tutorials. Hard to focus for more than 30 minutes, plays a lot of video games but wants daily 1% compounding progress.",
      icon: BookOpen
    },
    {
      name: "Game Dev & Career Changer",
      interests: "Building interactive web games, JavaScript canvas, Vite, and publishing to open source.",
      hoursPerDay: 4,
      daysPerWeek: 3,
      currentProblems: "Enjoys playing video games but struggles to sit down and write the actual code. Wants a balanced timetable with scheduled gaming rewards.",
      icon: Gamepad2
    },
    {
      name: "Hackathon Competitor Mode",
      interests: "Entering developer hackathons, using Google Gemma API & Vertex models, rapid prototyping.",
      hoursPerDay: 5,
      daysPerWeek: 4,
      currentProblems: "Wants to build and monetize a hackathon project quickly, but lacks a rigid structured timetable and is prone to burn-out or giving up.",
      icon: Award
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setProfile(prev => ({
      ...prev,
      interests: preset.interests,
      hoursPerDay: preset.hoursPerDay,
      daysPerWeek: preset.daysPerWeek,
      currentProblems: preset.currentProblems
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profile.hoursPerDay > 14) {
      alert("Refusal: 14+ hours of work a day is too much. Please reduce your daily commitment for a realistic plan.");
      return;
    }
    if (profile.hoursPerDay > 7) {
      const confirm = window.confirm("Warning: More than 7 hours a day is very intensive and risks burnout. Do you want to proceed?");
      if (!confirm) return;
    }

    // Simulate premium visual state transitions during AI load
    const loadingTexts = [
      "Analyzing profile & learning goals...",
      "Designing atomic habits: embedding the 2-minute starting cues...",
      "Structuring daily timetable hours...",
      "Balancing work slots with video game rewards...",
      "Scanning tech opportunities matching your domain...",
      "Assembling your custom Plan!"
    ];

    let textIdx = 0;
    const interval = setInterval(() => {
      if (textIdx < loadingTexts.length) {
        setLoadingStepText(loadingTexts[textIdx]);
        textIdx++;
      }
    }, 2500);

    try {
      await onGenerate({ ...profile, setupDone: true });
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
    }
  };

  if (currentStep === "welcome") {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl text-center" id="welcome-step">
        <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">
          Atomic Habit & Opportunity Planner
        </h1>
        <p className="text-slate-400 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          The 1% better-every-day planner built to defeat tech procrastination. Stop cramming, stop worrying about empty portfolios, and start moving slowly but consistently.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left mb-10">
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
            <span className="text-amber-400 font-mono text-sm block mb-2">01. THE ATOMIC METHOD</span>
            <h3 className="text-white font-semibold mb-1">Micro-Habit Scheduling</h3>
            <p className="text-slate-400 dark:text-slate-400 text-sm">Timetables that start with 2-minute cues to help you sit down and show up without friction.</p>
          </div>
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
            <span className="text-indigo-400 font-mono text-sm block mb-2">02. WORK-PLAY BALANCE</span>
            <h3 className="text-white font-semibold mb-1">Guilt-Free Leisure</h3>
            <p className="text-slate-400 dark:text-slate-400 text-sm">We schedule your game breaks, sleep, and rest. Keep your hobbies while building a stellar tech career.</p>
          </div>
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
            <span className="text-emerald-400 font-mono text-sm block mb-2">03. ACTIVE OPPORTUNITIES</span>
            <h3 className="text-white font-semibold mb-1">Direct Career Sourcing</h3>
            <p className="text-slate-400 dark:text-slate-400 text-sm">Find stipends, GSoC, Outreachy, Google Gemma credits, and hackathons tailored to your tasks.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setCurrentStep("configure")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-2xl shadow-lg transition-all"
            id="btn-get-started"
          >
            Build Your Plan
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={async () => {
              const defaultProfile: UserGoalProfile = {
                interests: "General Learning and Improvement",
                hoursPerDay: 4,
                daysPerWeek: 5,
                examDate: "",
                currentProblems: "Need a solid schedule to follow.",
                setupDone: true
              };
              try {
                await onGenerate(defaultProfile);
              } catch (err) {
                console.error(err);
              }
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 dark:text-slate-300 font-semibold rounded-2xl shadow-lg transition-all"
          >
            {loading ? "Generating..." : "Skip & Use Default"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-8 p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl" id="setup-form">
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">Architecting Your System</h2>
          <p className="text-amber-400 font-mono text-sm max-w-md">{loadingStepText}</p>
        </div>
      ) : (
        <div>
          <div className="mb-8 border-b border-slate-800 pb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Personalize Your Atomic Core</h2>
            <p className="text-slate-400 dark:text-slate-400 text-sm">
              Tell us your actual goals, exam timeline, and typical hurdles. Gemini will build an optimal balanced lifestyle timetable.
            </p>
          </div>

          {/* Presets Selection */}
          <div className="mb-8">
            <label className="block text-slate-400 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Or, Apply a Student Preset
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {presets.map((preset) => {
                const IconComp = preset.icon;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-start p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all text-left group"
                  >
                    <IconComp className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-semibold mb-1">{preset.name}</span>
                    <span className="text-slate-400 dark:text-slate-400 text-xs line-clamp-2">Click to load</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  My Core Interests & Dream Stack
                </label>
                <textarea
                  value={profile.interests}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                  className="w-full h-32 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none resize-none"
                  placeholder="What tech fields or topics do you want to learn? (e.g., HTML, CSS, React, Gemini AI, Node.js)"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  My Struggles, Frustrations & Context
                </label>
                <textarea
                  value={profile.currentProblems}
                  onChange={(e) => setProfile({ ...profile, currentProblems: e.target.value })}
                  className="w-full h-32 px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none resize-none"
                  placeholder="What is stopping you right now? (e.g., waiting for the last minute, spending too much time gaming, no money, no portfolio)"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  Education Level
                </label>
                <input
                  type="text"
                  value={profile.educationLevel}
                  onChange={(e) => setProfile({ ...profile, educationLevel: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none"
                  placeholder="e.g. 3rd Year Uni, Self-taught"
                />
              </div>
              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  Daily Work Target (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={profile.hoursPerDay}
                  onChange={(e) => setProfile({ ...profile, hoursPerDay: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none"
                />
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs mt-1">Recommended: 3-5 hours to avoid burn-out.</p>
              </div>

              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  Days Commitment Per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={profile.daysPerWeek}
                  onChange={(e) => setProfile({ ...profile, daysPerWeek: parseInt(e.target.value) || 3 })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none"
                />
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs mt-1">Recommended: 3-5 days. Leave rest days for games!</p>
              </div>

              <div>
                <label className="block text-slate-300 dark:text-slate-300 text-sm font-medium mb-2">
                  Next Exam or Milestone Date (Optional)
                </label>
                <input
                  type="date"
                  value={profile.examDate}
                  onChange={(e) => setProfile({ ...profile, examDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-sm outline-none"
                />
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-xs mt-1">We will plan milestone alerts and study increments.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              {mode === 'edit' && onCancel && (
                <button type="button" onClick={onCancel} className="px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                {mode === 'edit' ? 'Save & Regenerate Plan' : 'Generate AI Masterplan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
