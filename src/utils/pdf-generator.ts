
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

/**
 * Converts markdown text to HTML
 */
export const markdownToHtml = (markdown: string): string => {
  // Use marked.parse synchronously
  return marked.parse(markdown) as string;
};

/**
 * Downloads content as PDF with proper pagination
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
    
    // Apply styling to the container for proper rendering
    container.style.width = '750px';
    container.style.padding = '40px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#000';
    container.style.backgroundColor = '#fff';
    
    // Add styling for better formatting
    const style = document.createElement('style');
    style.textContent = `
      .markdown-pdf-container h1 { font-size: 24px; margin-top: 20px; margin-bottom: 12px; }
      .markdown-pdf-container h2 { font-size: 20px; margin-top: 16px; margin-bottom: 10px; }
      .markdown-pdf-container h3 { font-size: 18px; margin-top: 14px; margin-bottom: 8px; }
      .markdown-pdf-container p { margin-bottom: 12px; line-height: 1.5; }
      .markdown-pdf-container ul, .markdown-pdf-container ol { margin-bottom: 15px; padding-left: 20px; }
      .markdown-pdf-container li { margin-bottom: 8px; }
      .markdown-pdf-container code { background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
      .markdown-pdf-container pre { background-color: #f0f0f0; padding: 10px; border-radius: 3px; margin-bottom: 15px; white-space: pre-wrap; }
      .markdown-pdf-container img { max-width: 100%; }
      .markdown-pdf-container table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      .markdown-pdf-container th, .markdown-pdf-container td { border: 1px solid #ddd; padding: 8px; }
      .markdown-pdf-container th { background-color: #f2f2f2; }
    `;
    
    document.head.appendChild(style);
    
    // Temporarily append to document for rendering
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    // Setup PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Get total height to determine how many pages we need
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;
    
    // Define page dimensions in pixels (considering DPI)
    const pageHeight = 287 * 2; // A4 height in mm * 2 (for better resolution)
    const pageWidth = 210 * 2;  // A4 width in mm * 2
    
    const scale = Math.min(pageWidth / containerWidth, 2); // Limit scale to 2x for better quality
    
    // Calculate number of pages needed
    const totalPages = Math.ceil(containerHeight / (pageHeight / scale));
    
    // Create a temporary canvas for each page section
    for (let page = 0; page < totalPages; page++) {
      // If not the first page, add a new page to the PDF
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate which part of the container to render for this page
      const yPosition = page * (pageHeight / scale);
      
      // Clone the container for this page segment
      const pageContainer = container.cloneNode(true) as HTMLElement;
      pageContainer.style.position = 'absolute';
      pageContainer.style.top = `-${yPosition}px`;
      pageContainer.style.height = `${containerHeight}px`;
      pageContainer.style.overflow = 'hidden';
      document.body.appendChild(pageContainer);
      
      // Create canvas for this page section
      const canvas = await html2canvas(pageContainer, {
        scale: scale,
        logging: false,
        useCORS: true,
        windowHeight: containerHeight,
        y: yPosition,
        height: pageHeight / scale
      });
      
      // Add page number at the bottom
      const context = canvas.getContext('2d');
      if (context) {
        context.font = '12px Arial';
        context.fillStyle = '#666';
        context.fillText(`Page ${page + 1} of ${totalPages}`, 20, (pageHeight / scale) - 20);
      }
      
      // Add the image to the PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      
      // Clean up
      document.body.removeChild(pageContainer);
    }
    
    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
    // Clean up
    document.body.removeChild(container);
    document.head.removeChild(style);
    
    return;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
