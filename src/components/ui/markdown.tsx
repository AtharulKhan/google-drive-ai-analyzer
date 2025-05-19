
import React from 'react';

// Define props for the Markdown component
interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * A simple Markdown renderer that formats text with basic styling
 * This is a very basic implementation without using libraries
 */
export function Markdown({ content, className = "" }: MarkdownProps) {
  if (!content) return null;

  // Process content to handle basic markdown
  const formattedContent = React.useMemo(() => {
    // Split content by lines
    return content.split('\n').map((line, index) => {
      // Handle headings
      if (line.match(/^#{1,6}\s/)) {
        const level = line.indexOf(' ');
        const text = line.substring(level + 1);
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return React.createElement(HeadingTag, { key: index, className: 'font-bold my-2' }, text);
      }
      
      // Handle bold text
      let processedLine = line;
      const boldMatches = processedLine.match(/\*\*(.*?)\*\*/g);
      if (boldMatches) {
        boldMatches.forEach((match) => {
          const boldText = match.substring(2, match.length - 2);
          processedLine = processedLine.replace(match, `<strong>${boldText}</strong>`);
        });
      }

      // Handle italic text
      const italicMatches = processedLine.match(/\*(.*?)\*/g);
      if (italicMatches) {
        italicMatches.forEach((match) => {
          const italicText = match.substring(1, match.length - 1);
          processedLine = processedLine.replace(match, `<em>${italicText}</em>`);
        });
      }

      // Handle links
      const linkMatches = processedLine.match(/\[(.*?)\]\((.*?)\)/g);
      if (linkMatches) {
        linkMatches.forEach((match) => {
          const text = match.match(/\[(.*?)\]/)?.[1] || '';
          const url = match.match(/\((.*?)\)/)?.[1] || '';
          processedLine = processedLine.replace(match, `<a href="${url}" class="text-blue-500 hover:underline">${text}</a>`);
        });
      }
      
      // Handle unordered lists
      if (line.match(/^\*\s/) || line.match(/^-\s/)) {
        return <li key={index} className="ml-6 list-disc">{line.substring(2)}</li>;
      }
      
      // Handle ordered lists
      if (line.match(/^\d+\.\s/)) {
        const textContent = line.substring(line.indexOf(' ') + 1);
        return <li key={index} className="ml-6 list-decimal">{textContent}</li>;
      }
      
      // Handle blockquotes
      if (line.match(/^>\s/)) {
        return <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic">{line.substring(2)}</blockquote>;
      }
      
      // Handle code blocks (inline only in this simple version)
      const codeMatches = processedLine.match(/`(.*?)`/g);
      if (codeMatches) {
        codeMatches.forEach((match) => {
          const codeText = match.substring(1, match.length - 1);
          processedLine = processedLine.replace(match, `<code class="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono">${codeText}</code>`);
        });
      }
      
      // Handle horizontal rules
      if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
        return <hr key={index} className="my-4 border-t border-gray-300" />;
      }
      
      // If line is empty, add spacing
      if (!line.trim()) {
        return <br key={index} />;
      }
      
      // Default: regular paragraph
      return <p key={index} className="my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />;
    });
  }, [content]);

  return (
    <div className={`markdown-content ${className}`}>
      {formattedContent}
    </div>
  );
}
