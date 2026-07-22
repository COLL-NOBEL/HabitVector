const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const weeksLeftBadge = `
                              <span className="text-slate-300 dark:text-slate-300 text-xs">|</span>
                              <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                {profile.hoursPerDay && profile.daysPerWeek 
                                  ? (item.estimatedMinutes / 60 / (profile.hoursPerDay * profile.daysPerWeek)).toFixed(1) + " Weeks Left"
                                  : (item.estimatedMinutes / 60 / 10).toFixed(1) + " Weeks Left"} 
                                ({(item.estimatedMinutes / 60).toFixed(1)} hrs)
                              </span>
`;

code = code.replace(/<span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 text-\[9px\] font-extrabold uppercase px-2 py-0\.5 rounded border border-slate-200">\s*\{item\.category\}\s*<\/span>/, match => match + weeksLeftBadge);

fs.writeFileSync('src/App.tsx', code);
