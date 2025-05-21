
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

/**
 * Converts markdown text to HTML
 */
export const markdownToHtml = (markdown: string): string => {
  return marked.parse(markdown);
};

/**
 * Downloads content as PDF
 */
export const downloadAsPdf = async (
  content: string,
  filename: string = 'analysis-result'
): Promise<void> => {
  try {
    // Create a container for rendering markdown as HTML
    const container = document.createElement('div');
    container.className = 'markdown-pdf-container';
    container.innerHTML = markdownToHtml(content);
    container.style.width = '800px';
    container.style.padding = '20px';
    container.style.backgroundColor = '#fff';
    container.style.color = '#000';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Add styling to container
    const style = document.createElement('style');
    style.textContent = `
      .markdown-pdf-container h1 { font-size: 24px; margin-bottom: 12px; }
      .markdown-pdf-container h2 { font-size: 20px; margin-bottom: 10px; }
      .markdown-pdf-container h3 { font-size: 18px; margin-bottom: 8px; }
      .markdown-pdf-container p { margin-bottom: 10px; }
      .markdown-pdf-container ul, .markdown-pdf-container ol { margin-bottom: 10px; padding-left: 20px; }
      .markdown-pdf-container li { margin-bottom: 5px; }
      .markdown-pdf-container code { background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
      .markdown-pdf-container pre { background-color: #f0f0f0; padding: 10px; border-radius: 3px; margin-bottom: 10px; overflow-x: auto; }
    `;
    document.head.appendChild(style);
    
    // Temporarily append to document for rendering
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
      hotfixes: ['px_scaling']
    });
    
    // Capture HTML content
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      useCORS: true,
    });
    
    // Calculate page height
    const imgWidth = 550;
    const pageHeight = 842;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    
    // Convert canvas to PNG image
    const imgData = canvas.toDataURL('image/png');
    
    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
    
    let position = 20 + imgHeight; // Initial position for next page
    heightLeft -= pageHeight;
    
    // Add new pages if content overflows
    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 20, -(position - 20), imgWidth, imgHeight);
      position += pageHeight;
      heightLeft -= pageHeight;
    }
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
    // Clean up
    document.body.removeChild(container);
    document.head.removeChild(style);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
