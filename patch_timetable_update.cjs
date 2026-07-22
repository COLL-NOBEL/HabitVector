const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const calcMinutesFunc = `
function calculateMinutesFromTimeRange(timeRange: string): number {
  try {
    const parts = timeRange.split("-").map(s => s.trim());
    if (parts.length !== 2) return 60;
    
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\\d+):(\\d+)\\s*(AM|PM)/i);
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
`;

if (!code.includes('calculateMinutesFromTimeRange')) {
  code = code.replace('// Types for the AI responses', calcMinutesFunc + '\\n// Types for the AI responses');
}

const handleUpdateTimetableItemCode = `
  const handleUpdateTimetableItem = (item: TimetableItem) => {
    const originalItem = timetable.find(i => i.id === item.id);
    
    setTimetable(prev => prev.map(i => {
      if (i.id === item.id) return item;
      if (originalItem && originalItem.timeRange !== item.timeRange && i.taskId === item.taskId && i.taskId !== "custom" && i.taskId !== undefined && i.weekIndex > item.weekIndex && i.day === item.day) {
        return { ...i, timeRange: item.timeRange };
      }
      return i;
    }));

    if (originalItem && item.taskId && item.taskId !== "custom") {
      const statusChangedToCompleted = originalItem.status !== "completed" && item.status === "completed";
      const statusChangedToFailed = originalItem.status !== "failed" && item.status === "failed";
      const statusChangedFromCompleted = originalItem.status === "completed" && item.status !== "completed";
      
      if (statusChangedToCompleted || statusChangedFromCompleted || statusChangedToFailed) {
        const duration = calculateMinutesFromTimeRange(item.timeRange);
        setTodoList(prevTodos => {
          let nextTodos = prevTodos.map(todo => {
            if (todo.id === item.taskId) {
              let newEstimated = todo.estimatedMinutes;
              if (statusChangedToCompleted) {
                newEstimated = Math.max(0, newEstimated - duration);
              } else if (statusChangedFromCompleted) {
                newEstimated += duration;
              }
              return { ...todo, estimatedMinutes: newEstimated, status: newEstimated <= 0 ? "completed" as const : todo.status };
            }
            return todo;
          });

          if (statusChangedToFailed) {
             const todo = prevTodos.find(t => t.id === item.taskId);
             if (todo) {
               const isSimple = todo.estimatedMinutes <= 30 || todo.title.toLowerCase().includes("linkedin") || todo.title.toLowerCase().includes("post");
               if (isSimple) {
                 nextTodos = nextTodos.filter(t => t.id !== item.taskId);
               }
             }
          }
          return nextTodos;
        });
      }
    }
  };
`;

if (!code.includes('handleUpdateTimetableItem = (item')) {
  code = code.replace('const handleModifyTimetable', handleUpdateTimetableItemCode + '\\n  const handleModifyTimetable');
}

const originalOnUpdateItemRegex = /onUpdateItem=\{\(item\)\s*=>\s*\{[\s\S]*?setTimetable\(prev\s*=>\s*\{[\s\S]*?\}\);[\s\S]*?\}\}/;
code = code.replace(originalOnUpdateItemRegex, 'onUpdateItem={handleUpdateTimetableItem}');

fs.writeFileSync('src/App.tsx', code);
