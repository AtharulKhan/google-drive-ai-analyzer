
export interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export const templates: Template[] = [
  {
    id: "summarize-document",
    title: "Summarize Document",
    content: `# Document Summary

Please provide a comprehensive summary of the uploaded documents including:

## Key Points
- Main topics and themes
- Important findings or conclusions
- Critical data or statistics

## Structure
- Executive summary (2-3 sentences)
- Detailed breakdown by section
- Action items or recommendations (if applicable)

Format the response in clear, professional markdown.`,
    category: "Analysis",
    tags: ["summary", "analysis", "overview"]
  },
  {
    id: "extract-data",
    title: "Extract Data Points",
    content: `# Data Extraction

Extract and organize the following data points from the documents:

## Required Information
- Names, dates, and locations
- Numerical data and statistics
- Key decisions or outcomes
- Contact information
- Important deadlines

## Output Format
Present the extracted data in a structured table format with appropriate headers and clear categorization.`,
    category: "Data",
    tags: ["extraction", "data", "table", "structured"]
  },
  {
    id: "compare-documents",
    title: "Compare Documents",
    content: `# Document Comparison

Compare the uploaded documents and provide:

## Similarities
- Common themes and topics
- Shared data points
- Consistent conclusions

## Differences
- Conflicting information
- Unique content in each document
- Different perspectives or approaches

## Analysis
- Recommendations for reconciling differences
- Areas requiring further investigation
- Overall assessment of document consistency`,
    category: "Analysis",
    tags: ["compare", "analysis", "differences", "similarities"]
  },
  {
    id: "action-items",
    title: "Generate Action Items",
    content: `# Action Items & Next Steps

Based on the content provided, identify and organize:

## Immediate Actions (0-7 days)
- [ ] Task 1
- [ ] Task 2

## Short-term Goals (1-4 weeks)
- [ ] Goal 1
- [ ] Goal 2

## Long-term Objectives (1+ months)
- [ ] Objective 1
- [ ] Objective 2

For each item, include:
- **Priority Level**: High/Medium/Low
- **Responsible Party**: Who should handle this
- **Resources Needed**: What's required to complete
- **Success Criteria**: How to measure completion`,
    category: "Planning",
    tags: ["action", "tasks", "planning", "checklist"]
  },
  {
    id: "technical-analysis",
    title: "Technical Analysis",
    content: `# Technical Analysis Report

Analyze the technical content and provide:

## Technical Overview
- System architecture and components
- Technologies and frameworks used
- Integration points and dependencies

## Assessment
- Strengths and advantages
- Potential issues or risks
- Performance considerations
- Security implications

## Recommendations
- Optimization opportunities
- Best practices to implement
- Alternative approaches to consider
- Future enhancement possibilities`,
    category: "Technical",
    tags: ["technical", "analysis", "architecture", "recommendations"]
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes Summary",
    content: `# Meeting Notes Summary

Process the meeting content and organize into:

## Meeting Details
- **Date**: [Extract from content]
- **Attendees**: [List participants]
- **Duration**: [If available]
- **Purpose**: [Meeting objective]

## Key Discussions
- Main topics covered
- Important points raised
- Decisions made

## Action Items
- Tasks assigned
- Deadlines mentioned
- Follow-up required

## Next Steps
- Upcoming meetings
- Deliverables expected
- Timeline for completion`,
    category: "Meetings",
    tags: ["meeting", "notes", "summary", "action-items"]
  }
];

export const getTemplatesByCategory = () => {
  const categories = [...new Set(templates.map(t => t.category))];
  return categories.reduce((acc, category) => {
    acc[category] = templates.filter(t => t.category === category);
    return acc;
  }, {} as Record<string, Template[]>);
};

export const searchTemplates = (query: string): Template[] => {
  if (!query.trim()) return templates;
  
  const lowercaseQuery = query.toLowerCase();
  return templates.filter(template => 
    template.title.toLowerCase().includes(lowercaseQuery) ||
    template.content.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    template.category.toLowerCase().includes(lowercaseQuery)
  );
};
