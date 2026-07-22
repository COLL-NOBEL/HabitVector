const fs = require('fs');
let code = fs.readFileSync('src/components/WeeklyTimetable.tsx', 'utf8');

code = code.replace(
  'import { TimetableItem } from "../types";',
  'import { TimetableItem } from "../types";\nimport { jsPDF } from "jspdf";\nimport html2canvas from "html2canvas";'
);

fs.writeFileSync('src/components/WeeklyTimetable.tsx', code);
