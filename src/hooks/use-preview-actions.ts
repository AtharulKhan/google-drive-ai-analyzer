import { useCallback } from "react";

type PreviewType = "summary" | "details";

interface PreviewData {
  description: string;
  image: string;
  link: string;
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

export function usePreviewActions() {
  const generateSummaryPreview = useCallback((data) => {
    return preview(data, "summary");
  }, []);

  return {
    generateSummaryPreview,
  };
}
