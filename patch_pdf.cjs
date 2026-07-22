const fs = require('fs');
let code = fs.readFileSync('src/components/WeeklyTimetable.tsx', 'utf8');

// add imports
if (!code.includes('html2canvas')) {
  code = code.replace(
    'import { TimetableItem } from "../types";',
    'import { TimetableItem } from "../types";\nimport jsPDF from "jspdf";\nimport html2canvas from "html2canvas";'
  );
}

// replace handleExportPDF
const newHandleExportPDF = `const handleExportPDF = async () => {
    const element = document.getElementById("timetable-component");
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Atomic_Timetable.pdf");
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };`;

code = code.replace(
  /const handleExportPDF = \(\) => \{\n\s*\/\/ html2canvas does not support oklch colors used in Tailwind v4\n\s*\/\/ Using native print which supports all modern CSS\n\s*window\.print\(\);\n\s*\};/,
  newHandleExportPDF
);

fs.writeFileSync('src/components/WeeklyTimetable.tsx', code);
