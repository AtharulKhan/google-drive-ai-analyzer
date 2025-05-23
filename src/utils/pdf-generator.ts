import { pdf } from '@react-pdf/renderer';
import AiOutputPdfDoc from '@/components/drive-analyzer/AiOutputPdfDoc';

/**
 * Downloads content as PDF using react-pdf.
 */
export const downloadAsPdf = async (
  content: string,
  filename: string = 'drive-analysis-result'
): Promise<void> => {
  try {
    // 1. Create the PDF document instance with the AI output
    const doc = <AiOutputPdfDoc aiOutput={content} />;

    // 2. Generate the PDF blob
    const blob = await pdf(doc).toBlob();

    // 3. Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // 4. Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`; // Set the desired filename

    // 5. Append to the document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 6. Revoke the object URL to free up resources
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error generating PDF with react-pdf:', error);
    // Keep the error message format consistent with the old one for now
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
