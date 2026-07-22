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

if (!code.includes('function calculateMinutesFromTimeRange')) {
  code = code.replace('export default function App() {', calcMinutesFunc + '\\nexport default function App() {');
}

fs.writeFileSync('src/App.tsx', code);
