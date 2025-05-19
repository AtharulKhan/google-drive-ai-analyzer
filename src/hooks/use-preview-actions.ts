
import { useCallback, useState } from "react";

type PreviewType = "summary" | "details";

interface PreviewData {
  description: string;
  image: string;
  link: string;
}

interface UsePreviewActionsOptions {
  data?: any[];
  moduleName?: string;
  columns?: { key: string, header: string }[];
  title?: string;
}

const preview = (data: PreviewData, type: PreviewType) => {
  return {
    type: "preview",
    body: {
      ...data,
      previewType: type,
    },
  };
};

export function usePreviewActions(options: UsePreviewActionsOptions = {}) {
  const { data = [], moduleName = "", columns, title } = options;
  
  // States for preview handling
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  
  const generateSummaryPreview = useCallback((data) => {
    return preview(data, "summary");
  }, []);
  
  // Handle showing preview
  const handleShowPreview = useCallback(() => {
    setIsActionInProgress(true);
    try {
      // In a real implementation, this would generate HTML from the data
      const html = `<div class="preview-container">
        <h1>${title || moduleName}</h1>
        <p>Preview of ${data.length} items</p>
        <table>
          <thead>
            <tr>
              ${columns?.map(col => `<th>${col.header}</th>`).join('') || ''}
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                ${columns?.map(col => `<td>${item[col.key]}</td>`).join('') || ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
      
      setPreviewHTML(html);
      setPreviewOpen(true);
    } finally {
      setIsActionInProgress(false);
    }
  }, [data, columns, title, moduleName]);
  
  // Handle printing
  const handlePrint = useCallback(() => {
    setIsActionInProgress(true);
    try {
      // In a real implementation, this would trigger printing
      console.log("Printing data:", data);
    } finally {
      setIsActionInProgress(false);
    }
  }, [data]);
  
  // Handle PDF export
  const handleExportPDF = useCallback(() => {
    setIsActionInProgress(true);
    try {
      // In a real implementation, this would generate and download a PDF
      console.log("Exporting data to PDF:", data);
    } finally {
      setIsActionInProgress(false);
    }
  }, [data]);
  
  return {
    generateSummaryPreview,
    isActionInProgress,
    previewOpen,
    setPreviewOpen,
    previewHTML,
    handlePrint,
    handleShowPreview,
    handleExportPDF
  };
}
