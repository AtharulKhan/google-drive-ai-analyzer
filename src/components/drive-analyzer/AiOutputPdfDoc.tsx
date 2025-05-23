import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { marked } from 'marked'; // For parsing markdown

// Define base styles for PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 10,
  },
  section: {
    marginBottom: 10,
  },
  heading1: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heading2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  heading3: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 6,
    lineHeight: 1.4,
  },
  listItem: {
    marginBottom: 3,
    marginLeft: 10,
  },
  code: {
    fontFamily: 'Courier',
    backgroundColor: '#f0f0f0',
    padding: '1px 2px',
    fontSize: 9,
  },
  pre: {
    fontFamily: 'Courier',
    backgroundColor: '#f0f0f0',
    padding: 8,
    marginBottom: 6,
    fontSize: 9,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginBottom: 10,
    paddingBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
});

interface AiOutputPdfDocProps {
  aiOutput: string;
}

// Helper function to parse markdown and convert to react-pdf elements
const renderMarkdown = (markdown: string) => {
  const tokens = marked.lexer(markdown);

  const renderTokens = (tokenList: marked.Token[]): React.ReactNode[] => {
    return tokenList.map((token, index) => {
      switch (token.type) {
        case 'heading':
          const headingStyle = token.depth === 1 
            ? styles.heading1 
            : token.depth === 2 
              ? styles.heading2 
              : styles.heading3;
          return <Text key={index} style={headingStyle}>{(token as marked.Tokens.Heading).text}</Text>;
          
        case 'paragraph':
          return <Text key={index} style={styles.paragraph}>{renderInlineTokens(token.tokens)}</Text>;
          
        case 'list':
          return (
            <View key={index} style={styles.section}>
              {(token as marked.Tokens.List).items.map((item, itemIndex) => (
                <Text key={itemIndex} style={styles.listItem}>
                  • {renderInlineTokens(item.tokens)}
                </Text>
              ))}
            </View>
          );
          
        case 'code':
          return <Text key={index} style={styles.pre}>{(token as marked.Tokens.Code).text}</Text>;
          
        case 'space':
          return null;
          
        case 'hr':
          return <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: '#cccccc', marginVertical: 10 }} />;
          
        case 'blockquote':
          return (
            <View key={index} style={{ borderLeftWidth: 2, borderLeftColor: '#cccccc', paddingLeft: 10, marginLeft: 5, marginBottom: 6 }}>
              {renderTokens(token.tokens)}
            </View>
          );
          
        case 'table':
          const tableToken = token as marked.Tokens.Table;
          return (
            <View key={index} style={{ marginVertical: 5 }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cccccc', paddingBottom: 3 }}>
                {tableToken.header.map((cell, cellIndex) => (
                  <Text key={cellIndex} style={{ flex: 1, fontWeight: 'bold', fontSize: 9 }}>
                    {renderInlineTokens(cell.tokens)}
                  </Text>
                ))}
              </View>
              {tableToken.rows.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#cccccc', paddingVertical: 3 }}>
                  {row.map((cell, cellIndex) => (
                    <Text key={cellIndex} style={{ flex: 1, fontSize: 9 }}>
                      {renderInlineTokens(cell.tokens)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
          
        default:
          // Fallback for other token types
          return token.raw ? <Text key={index}>{token.raw}</Text> : null;
      }
    });
  };

  // Helper to render inline tokens (like bold, italic, code spans, links)
  const renderInlineTokens = (inlineTokens: marked.Token[] | undefined): React.ReactNode[] => {
    if (!inlineTokens) return [];
    
    return inlineTokens.map((token, index) => {
      switch (token.type) {
        case 'text':
          return (token as marked.Tokens.Text).text;
          
        case 'strong': // Bold
          return <Text key={index} style={{ fontWeight: 'bold' }}>{renderInlineTokens((token as marked.Tokens.Strong).tokens)}</Text>;
          
        case 'em': // Italic
          return <Text key={index} style={{ fontStyle: 'italic' }}>{renderInlineTokens((token as marked.Tokens.Em).tokens)}</Text>;
          
        case 'codespan': // Inline code
          return <Text key={index} style={styles.code}>{(token as marked.Tokens.Codespan).text}</Text>;
          
        case 'link':
          return (
            <Text key={index} style={{ color: 'blue', textDecoration: 'underline' }}>
              {(token as marked.Tokens.Link).text} ({(token as marked.Tokens.Link).href})
            </Text>
          );
          
        case 'br':
          return '\n';
          
        case 'image':
          // Images are not directly supported in react-pdf text components
          return <Text key={index}>[Image: {(token as marked.Tokens.Image).text}]</Text>;
          
        default:
          return token.raw || '';
      }
    });
  };

  return renderTokens(tokens);
};

export const AiOutputPdfDoc: React.FC<AiOutputPdfDocProps> = ({ aiOutput }) => {
  // Split markdown content into chunks to distribute across pages
  // This is a simple approach - each page will contain about 3000 chars
  // For a more sophisticated approach, we could analyze tokens and distribute content based on token types
  const contentChunks: string[] = [];
  const chunkSize = 3000; // Characters per page (approximate)
  
  // If content is very small, keep it on a single page
  if (aiOutput.length < chunkSize) {
    contentChunks.push(aiOutput);
  } else {
    // Split by paragraphs (marked by double newlines)
    const paragraphs = aiOutput.split(/\n\n+/);
    let currentChunk = '';
    
    // Distribute paragraphs across chunks
    paragraphs.forEach(paragraph => {
      if (currentChunk.length + paragraph.length < chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        // If current chunk is not empty, save it and start a new one
        if (currentChunk) {
          contentChunks.push(currentChunk);
        }
        currentChunk = paragraph;
      }
    });
    
    // Add the last chunk if not empty
    if (currentChunk) {
      contentChunks.push(currentChunk);
    }
  }
  
  return (
    <Document>
      {contentChunks.map((chunk, index) => (
        <Page key={index} size="A4" style={styles.page}>
          {index === 0 && (
            <View style={styles.header}>
              <Text style={styles.heading1}>AI Analysis Results</Text>
              <Text style={{ fontSize: 8, color: '#666666' }}>
                Generated on: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          )}
          
          <View style={{ flex: 1 }}>
            {renderMarkdown(chunk)}
          </View>
          
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </Page>
      ))}
    </Document>
  );
};

export default AiOutputPdfDoc;
