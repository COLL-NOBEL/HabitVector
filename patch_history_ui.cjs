const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newHistoryView = `
          {activeTab === "history" && (
            <div className="space-y-6" id="view-history">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wider mb-1">Time Travel</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">View past weeks or plan ahead for the next week.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentWeekOffset(-1)} className={\`px-3 py-1.5 rounded-lg text-sm font-semibold \${currentWeekOffset < 1 ? "bg-amber-500 text-slate-900" : "bg-slate-200 dark:bg-slate-800"}\`}>Past Weeks</button>
                    <button onClick={() => setCurrentWeekOffset(1)} className={\`px-3 py-1.5 rounded-lg text-sm font-semibold \${currentWeekOffset === 1 ? "bg-amber-500 text-slate-900" : "bg-slate-200 dark:bg-slate-800"}\`}>Next Week</button>
                  </div>
                </div>
                <div className="pt-6">
                  {currentWeekOffset < 1 ? (
                    <div className="space-y-6">
                      {Array.from(new Set([0, ...timetable.map(t => t.weekIndex)])).filter(w => w <= 0).sort((a,b) => b - a).map(weekIdx => {
                        const weekItems = timetable.filter(t => t.weekIndex === weekIdx);
                        return (
                          <div key={weekIdx} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                              <h4 className="font-bold text-slate-900 dark:text-white">Week {weekIdx === 0 ? "0 (Current Week)" : weekIdx}</h4>
                              <span className="text-xs font-semibold text-slate-500">{weekItems.length} Missions</span>
                            </div>
                            <div className="p-4">
                              {weekItems.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">No missions scheduled for this week.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {weekItems.map(item => (
                                    <div key={item.id} className="flex flex-col p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{item.day}</span>
                                        <span className={\`text-[10px] font-bold px-2 py-0.5 rounded \${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}\`}>
                                          {item.status || "pending"}
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{item.activity}</span>
                                      <span className="text-xs text-slate-500 font-mono">{item.timeRange}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <WeeklyTimetable 
                      items={timetable.filter(t => t.weekIndex === currentWeekOffset)}
                      onAddItem={(item) => setTimetable(prev => [...prev, { ...item, id: \`time-\${Date.now()}\`, weekIndex: currentWeekOffset }])}
                      onUpdateItem={handleUpdateTimetableItem}
                      onDeleteItem={handleDeleteTime}
                      onModifyTimetable={handleModifyTimetable}
                      weekOffset={currentWeekOffset}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
`;

const startIndex = code.indexOf('{activeTab === "history" && (');
if (startIndex !== -1) {
  const endIndex = code.indexOf('{/* 3. TO-DO TAB */}');
  code = code.substring(0, startIndex) + newHistoryView + '\n          ' + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
}
