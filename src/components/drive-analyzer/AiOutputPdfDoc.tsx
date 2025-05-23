import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { marked } from 'marked'; // We'll use marked to parse markdown

// Register a default font that supports a wide range of characters.
// Noto Sans is a good open-source option. Let's assume it's available or use a common one.
// For simplicity in this step, we'll rely on default fonts if specific font registration becomes complex.
// Font.register({
//   family: 'Noto Sans',
//   src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr5TRA.ttf' // Example URL
// });

// Define base styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    // fontFamily: 'Noto Sans', // Apply registered font
    fontSize: 10, // Reduced font size for better fit
  },
  section: {
    marginBottom: 10,
  },
  heading1: {
    fontSize: 18, // Reduced from 24
    fontWeight: 'bold',
    marginBottom: 8, // Reduced from 12
  },
  heading2: {
    fontSize: 16, // Reduced from 20
    fontWeight: 'bold',
    marginBottom: 6, // Reduced from 10
  },
  heading3: {
    fontSize: 14, // Reduced from 18
    fontWeight: 'bold',
    marginBottom: 4, // Reduced from 8
  },
  paragraph: {
    marginBottom: 6, // Reduced from 10
    lineHeight: 1.4, // Added for better readability
  },
  listItem: {
    marginBottom: 3, // Reduced from 5
    marginLeft: 10, // Indent list items
  },
  code: {
    fontFamily: 'Courier', // Monospaced font for code
    backgroundColor: '#f0f0f0',
    padding: '1px 2px', // Minimal padding for inline code
    fontSize: 9,
  },
  pre: {
    fontFamily: 'Courier',
    backgroundColor: '#f0f0f0',
    padding: 8, // Reduced from 10
    marginBottom: 6, // Reduced from 10
    fontSize: 9,
    whiteSpace: 'pre-wrap', // Ensure wrapping for long lines in code blocks
    wordBreak: 'break-all', // Break long words if necessary
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
          const Tag = token.depth === 1 ? styles.heading1 : token.depth === 2 ? styles.heading2 : styles.heading3;
          return <Text key={index} style={Tag}>{(token as marked.Tokens.Heading).text}</Text>;
        case 'paragraph':
          // For paragraphs, we need to recursively render inline tokens
          return <Text key={index} style={styles.paragraph}>{renderInlineTokens(token.tokens)}</Text>;
        case 'list':
          return (
            <View key={index} style={styles.section}>
              {(token as marked.Tokens.List).items.map((item, itemIndex) => (
                // Each list item's text might contain further inline tokens
                <Text key={itemIndex} style={styles.listItem}>
                  • {renderInlineTokens(item.tokens)}
                </Text>
              ))}
            </View>
          );
        case 'code': // For fenced code blocks
          return <Text key={index} style={styles.pre}>{(token as marked.Tokens.Code).text}</Text>;
        case 'space':
          return null; // Or handle as a line break if needed: <Text key={index}>
</Text>
        case 'hr':
            return <View key={index} style={{ borderBottomWidth: 1, borderBottomColor: '#cccccc', marginVertical: 10 }} />;
        case 'blockquote':
            return (
                <View key={index} style={{ borderLeftWidth: 2, borderLeftColor: '#cccccc', paddingLeft: 10, marginLeft: 5, marginBottom: 6 }}>
                    {renderTokens(token.tokens)}
                </View>
            );
        default:
          console.warn('Unsupported token type:', token.type, token);
          // Fallback for other token types (e.g., if raw HTML is mixed in, or other complex types)
          // For now, we'll render the raw text if available, or an empty string.
          return token.raw ? <Text key={index}>{token.raw}</Text> : null;
      }
    });
  };

  // Helper to render inline tokens (like bold, italic, code spans, links within a paragraph)
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
          return <Text key={index} style={{ color: 'blue', textDecoration: 'underline' }}>{(token as marked.Tokens.Link).text} ({(token as marked.Tokens.Link).href})</Text>; // Simple link display
        case 'br':
            return '
';
        default:
          console.warn('Unsupported inline token type:', token.type, token);
          return token.raw || '';
      }
    });
  };

  return renderTokens(tokens);
};


export const AiOutputPdfDoc: React.FC<AiOutputPdfDocProps> = ({ aiOutput }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          {renderMarkdown(aiOutput)}
        </View>
      </Page>
    </Document>
  );
};

export default AiOutputPdfDoc;
