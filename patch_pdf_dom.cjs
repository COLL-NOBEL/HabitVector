const fs = require('fs');
let code = fs.readFileSync('src/components/WeeklyTimetable.tsx', 'utf8');

// remove html2canvas, add dom-to-image
code = code.replace(
  'import html2canvas from "html2canvas";',
  'import domtoimage from "dom-to-image";'
);

const newHandleExportPDF = `const handleExportPDF = async () => {
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
  };`;

code = code.replace(
  /const handleExportPDF = async \(\) => \{[\s\S]*?\} catch \(err\) \{\n\s*console\.error\("Failed to generate PDF", err\);\n\s*\}\n\s*\};/,
  newHandleExportPDF
);

fs.writeFileSync('src/components/WeeklyTimetable.tsx', code);
