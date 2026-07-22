const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update activeTab state type
code = code.replace(/useState<"dashboard" \| "timetable" \| "todo" \| "opportunities" \| "habits" \| "settings">/, 'useState<"dashboard" | "timetable" | "todo" | "history" | "opportunities" | "habits" | "settings">');

// Add history tab to nav
const historyNav = `
          <button
            onClick={() => setActiveTab("history")}
            className={\`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-all duration-300 \${
              activeTab === "history"
                ? "bg-blue-600 text-slate-900 dark:text-white shadow-md shadow-blue-600/15"
                : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
            }\`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden md:inline">History</span>
          </button>
`;

if (!code.includes('activeTab === "history"')) {
  code = code.replace(/<button[^>]*onClick=\{\(\) => setActiveTab\("todo"\)\}[^>]*>[\s\S]*?<\/button>/, match => match + historyNav);
}

// Add History title
code = code.replace(/\{activeTab === "timetable" && "AI-Generated Lifestyle Timetable"\}/, 
  '{activeTab === "timetable" && "AI-Generated Lifestyle Timetable"}\n              {activeTab === "history" && "Timetable History & Future"}');

// Add History view
const historyView = `
          {activeTab === "history" && (
            <div className="space-y-6" id="view-history">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">Time Travel</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">View past weeks or plan ahead for the next week.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-semibold">Prev Week</button>
                    <div className="px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-bold">Week {currentWeekOffset}</div>
                    <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-semibold">Next Week</button>
                  </div>
                </div>
                <div className="pt-6">
                  <WeeklyTimetable 
                    items={timetable.filter(t => t.weekIndex === currentWeekOffset)}
                    onAddItem={(item) => setTimetable(prev => [...prev, { ...item, id: \`time-\${Date.now()}\`, weekIndex: currentWeekOffset }])}
                    onUpdateItem={handleUpdateTimetableItem}
                    onDeleteItem={handleDeleteTime}
                    onModifyTimetable={handleModifyTimetable}
                    weekOffset={currentWeekOffset}
                  />
                </div>
              </div>
            </div>
          )}
`;

if (!code.includes('id="view-history"')) {
  code = code.replace(/\{\/\* 3\. TO-DO TAB \*\/\}/, historyView + '\n          {/* 3. TO-DO TAB */}');
}

fs.writeFileSync('src/App.tsx', code);
