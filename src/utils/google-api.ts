// Utility functions for interacting with Google APIs

/**
 * Fetch the text content from a Google Document
 */
export async function fetchDocumentContent(
  fileId: string,
  accessToken: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${fileId}?suggestionsViewMode=PREVIEW_WITHOUT_SUGGESTIONS&includeTabsContent=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }

    const data = await response.json();
    return extractDocumentText(data);
  } catch (error) {
    console.error(`Error fetching Google Doc ${fileId}:`, error);
    return `Error extracting text from Google Doc: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * Extract text from Google Doc JSON structure, including all tabs
 */
function extractDocumentText(docData: any): string {
  // Check if the document has tabs
  if (docData.tabs && docData.tabs.length > 0) {
    return extractTextFromAllTabs(docData);
  } else if (docData.body && docData.body.content) {
    // Legacy format or single tab document
    return extractTextFromContent(docData.body.content);
  }

  return "(No content found in document)";
}

/**
 * Extract text from all tabs in a document, handling nested tab hierarchies
 */
function extractTextFromAllTabs(docData: any): string {
  const allTabs = getAllTabs(docData);
  if (!allTabs || allTabs.length === 0) {
    return "(No tabs found in document)";
  }

  let text = "";

  // Process each tab
  allTabs.forEach((tab: any, index: number) => {
    const tabTitle = tab.tabProperties?.title || `Tab ${index + 1}`;
    const documentTab = tab.documentTab;

    text += `=== TAB: ${tabTitle} ===\n\n`;

    if (documentTab && documentTab.body && documentTab.body.content) {
      text += extractTextFromContent(documentTab.body.content);
    } else {
      text += "(No content in this tab)\n";
    }

    text += "\n\n";
  });

  return text;
}

/**
 * Get a flat list of all tabs in the document, including nested child tabs
 */
function getAllTabs(docData: any): any[] {
  const allTabs: any[] = [];

  if (!docData.tabs) return allTabs;

  // Recursive function to add tab and all its child tabs
  function addCurrentAndChildTabs(tab: any) {
    allTabs.push(tab);

    if (tab.childTabs && tab.childTabs.length > 0) {
      tab.childTabs.forEach((childTab: any) => {
        addCurrentAndChildTabs(childTab);
      });
    }
  }

  // Process all top-level tabs and their children
  docData.tabs.forEach((tab: any) => {
    addCurrentAndChildTabs(tab);
  });

  return allTabs;
}

/**
 * Extract text from document content structure (common for both tabs and legacy format)
 */
function extractTextFromContent(elements: any[]): string {
  if (!elements) return "";

  let result = "";
  elements.forEach((element) => {
    if (element.paragraph) {
      const paragraphText = element.paragraph.elements
        .map((pe: any) => {
          if (pe.textRun && pe.textRun.content) {
            return pe.textRun.content;
          } else if (pe.horizontalRule) {
            return "\n---\n";
          }
          return "";
        })
        .join("");
      result += paragraphText;
    } else if (element.table) {
      element.table.tableRows.forEach((row: any) => {
        const rowContent = row.tableCells
          .map((cell: any) => {
            return extractTextFromContent(cell.content);
          })
          .join(" | ");
        result += rowContent + "\n";
      });
    } else if (element.sectionBreak) {
      result += "\n\n";
    }
  });

  return result;
}

/**
 * Fetch the text content from a Google Sheet
 */
export async function fetchSheetContent(
  fileId: string,
  accessToken: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values:batchGet?ranges=*&majorDimension=ROWS`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`);
    }

    const data = await response.json();
    return extractSheetText(data);
  } catch (error) {
    console.error(`Error fetching Google Sheet ${fileId}:`, error);
    return `Error extracting text from Google Sheet: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * Extract text from Google Sheets API response
 */
function extractSheetText(sheetsData: any): string {
  if (!sheetsData.valueRanges || sheetsData.valueRanges.length === 0) {
    return "(No data found in spreadsheet)";
  }

  let text = "";

  sheetsData.valueRanges.forEach((range: any, index: number) => {
    if (range.values && range.values.length > 0) {
      text += `--- Sheet ${index + 1} ---\n`;
      range.values.forEach((row: any[]) => {
        text += row.join("\t") + "\n";
      });
      text += "\n";
    }
  });

  return text.trim();
}

/**
 * Fetch the text content from Google Slides
 */
export async function fetchSlidesContent(
  fileId: string,
  accessToken: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch presentation: ${response.status}`);
    }

    const data = await response.json();
    return extractSlidesText(data);
  } catch (error) {
    console.error(`Error fetching Google Slides ${fileId}:`, error);
    return `Error extracting text from Google Slides: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * Extract text from Google Slides API response
 */
function extractSlidesText(slidesData: any): string {
  if (!slidesData.slides || slidesData.slides.length === 0) {
    return "(No slides found in presentation)";
  }

  let text = "";

  slidesData.slides.forEach((slide: any, index: number) => {
    text += `--- Slide ${index + 1} ---\n`;

    // Extract text from shape elements in the slide
    if (slide.pageElements) {
      slide.pageElements.forEach((element: any) => {
        if (element.shape && element.shape.text) {
          element.shape.text.textElements?.forEach((textElement: any) => {
            if (textElement.textRun && textElement.textRun.content) {
              text += textElement.textRun.content;
            }
          });
        } else if (element.table) {
          // Handle table elements
          element.table.tableRows?.forEach((row: any) => {
            const rowTexts: string[] = [];
            row.tableCells?.forEach((cell: any) => {
              let cellText = "";
              if (cell.text && cell.text.textElements) {
                cell.text.textElements.forEach((textElement: any) => {
                  if (textElement.textRun && textElement.textRun.content) {
                    cellText += textElement.textRun.content;
                  }
                });
              }
              rowTexts.push(cellText.trim());
            });
            text += rowTexts.join(" | ") + "\n";
          });
        }
      });
    }

    // Add notes if available
    if (slide.slideProperties && slide.slideProperties.notesPage) {
      text += "\n(Notes: ";
      text += extractNotesText(slide.slideProperties.notesPage);
      text += ")\n";
    }

    text += "\n";
  });

  return text.trim();
}

/**
 * Extract text from slide notes
 */
function extractNotesText(notesPage: any): string {
  let notesText = "";

  if (notesPage.pageElements) {
    notesPage.pageElements.forEach((element: any) => {
      if (element.shape && element.shape.text) {
        element.shape.text.textElements?.forEach((textElement: any) => {
          if (textElement.textRun && textElement.textRun.content) {
            notesText += textElement.textRun.content;
          }
        });
      }
    });
  }

  return notesText.trim();
}

/**
 * Fetch the text content from a PDF file
 */
export async function fetchPdfContent(
  fileId: string,
  accessToken: string
): Promise<string> {
  try {
    // For PDFs in Drive, we can use the export API to get text
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF text: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching PDF ${fileId}:`, error);
    return `Error extracting text from PDF: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * List files in a Google Drive folder with more robust handling
 */
export async function listFolderContents(
  folderId: string,
  accessToken: string,
  includeSubfolders: boolean = false,
  maxResults: number = 100
): Promise<any[]> {
  try {
    // First, build the query to find files in the specified folder
    let query = `'${folderId}' in parents and trashed = false`;
    
    // Build query for specific file types we want to retrieve
    const supportedMimeTypes = [
      "application/vnd.google-apps.document",
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.google-apps.presentation",
      "application/pdf"
    ];
    
    // Add mime type filters to query
    const mimeTypesQuery = supportedMimeTypes
      .map(type => `mimeType='${type}'`)
      .join(" or ");
    
    // Combine folder and mime type queries
    query = `${query} and (${mimeTypesQuery})`;
    
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.append("q", query);
    url.searchParams.append("pageSize", maxResults.toString());
    url.searchParams.append("fields", "files(id,name,mimeType,iconUrl,description,parents,modifiedTime)");
    url.searchParams.append("orderBy", "modifiedTime desc"); // Get newest files first
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch folder contents: ${response.status}`);
    }

    const data = await response.json();
    
    // Get the files from the primary folder
    let allFiles = data.files || [];
    
    // If we need to include subfolders and have less than maxResults, fetch from subfolders too
    if (includeSubfolders && allFiles.length < maxResults) {
      // Find subfolders in the parent folder
      const subfoldersQuery = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`;
      
      const subfoldersUrl = new URL("https://www.googleapis.com/drive/v3/files");
      subfoldersUrl.searchParams.append("q", subfoldersQuery);
      subfoldersUrl.searchParams.append("fields", "files(id,name)");
      
      const subfoldersResponse = await fetch(subfoldersUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (subfoldersResponse.ok) {
        const subfoldersData = await subfoldersResponse.json();
        const subfolders = subfoldersData.files || [];
        
        // Process each subfolder up to a reasonable limit
        const folderProcessLimit = Math.min(subfolders.length, 5); // Limit to 5 subfolders max
        
        for (let i = 0; i < folderProcessLimit && allFiles.length < maxResults; i++) {
          const subfolder = subfolders[i];
          try {
            // Recursively call the same function for each subfolder
            const subfolderFiles = await listFolderContents(
              subfolder.id, 
              accessToken,
              false, // Don't go deeper than one level
              maxResults - allFiles.length // Only fetch what we still need
            );
            
            // Add each file with its subfolder info
            subfolderFiles.forEach(file => {
              file.subfolderName = subfolder.name; // Add subfolder name for display
              allFiles.push(file);
            });
          } catch (error) {
            console.error(`Error listing subfolder ${subfolder.name}:`, error);
            // Continue with other subfolders
          }
          
          // If we've reached the limit, stop processing more subfolders
          if (allFiles.length >= maxResults) break;
        }
      }
    }
    
    // Limit the results to maxResults
    return allFiles.slice(0, maxResults);
  } catch (error) {
    console.error(`Error listing folder contents ${folderId}:`, error);
    throw error;
  }
}

/**
 * Fetch file content based on MIME type
 */
export async function fetchFileContent(
  file: { id: string; mimeType: string; name: string },
  accessToken: string
): Promise<string> {
  switch (file.mimeType) {
    case "application/vnd.google-apps.document":
      return fetchDocumentContent(file.id, accessToken);
    case "application/vnd.google-apps.spreadsheet":
      return fetchSheetContent(file.id, accessToken);
    case "application/vnd.google-apps.presentation":
      return fetchSlidesContent(file.id, accessToken);
    case "application/pdf":
      return fetchPdfContent(file.id, accessToken);
    default:
      return `(File type ${file.mimeType} not supported for text extraction)`;
  }
}
