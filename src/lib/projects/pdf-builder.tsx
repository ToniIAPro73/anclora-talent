import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ProjectRecord } from './types';

// Register safe system fonts
Font.register({
  family: 'Georgia',
  src: 'https://fonts.gstatic.com/s/crimsontext/v19/wlp2gwHKFkZgtmSR3NB0oRJvaAJSA_JN3Q.woff2',
});

const PALETTE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  obsidian: { bg: '#0b133f', text: '#f2e3b3', accent: '#d4af37' },
  teal: { bg: '#124a50', text: '#f2e3b3', accent: '#4fd1c5' },
  sand: { bg: '#f2e3b3', text: '#0b313f', accent: '#d4af37' },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildProjectPdf(project: ProjectRecord) {
  const { document, cover } = project;
  const palette = PALETTE_COLORS[cover.palette] ?? PALETTE_COLORS.obsidian;
  const multiChapter = document.chapters.length > 1;

  const styles = StyleSheet.create({
    page: {
      paddingTop: 72,
      paddingBottom: 72,
      paddingLeft: 72,
      paddingRight: 72,
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
    },
    coverPage: {
      paddingTop: 96,
      paddingBottom: 72,
      paddingLeft: 72,
      paddingRight: 72,
      backgroundColor: palette.bg,
    },
    accentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: palette.accent,
    },
    eyebrow: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: palette.accent,
      marginBottom: 16,
    },
    coverTitle: {
      fontSize: 32,
      fontFamily: 'Helvetica-Bold',
      color: palette.text,
      marginBottom: 12,
      lineHeight: 1.15,
    },
    coverSubtitle: {
      fontSize: 13,
      color: palette.text,
      opacity: 0.75,
      lineHeight: 1.6,
    },
    chapterHeading: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: '#111',
      marginBottom: 8,
      marginTop: 24,
    },
    heading: {
      fontSize: 15,
      fontFamily: 'Helvetica-Bold',
      color: '#111',
      marginBottom: 6,
      marginTop: 16,
    },
    paragraph: {
      fontSize: 11,
      color: '#333',
      lineHeight: 1.7,
      marginBottom: 10,
    },
    quote: {
      fontSize: 11,
      color: '#555',
      fontFamily: 'Helvetica-Oblique',
      lineHeight: 1.7,
      marginBottom: 10,
      marginLeft: 16,
      paddingLeft: 12,
      borderLeftWidth: 3,
      borderLeftColor: cover.accentColor ?? '#d4af37',
      borderLeftStyle: 'solid',
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
      borderBottomStyle: 'solid',
      marginVertical: 20,
    },
  });

  return (
    <Document
      title={cover.title || document.title}
      author="Anclora Talent"
      subject={cover.subtitle || document.subtitle}
    >
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.accentBar} />
        <Text style={styles.eyebrow}>Anclora Talent</Text>
        <Text style={styles.coverTitle}>{cover.title || document.title}</Text>
        <Text style={styles.coverSubtitle}>{cover.subtitle || document.subtitle}</Text>
      </Page>

      {/* Content pages */}
      <Page size="A4" style={styles.page}>
        {document.chapters.map((chapter, chIdx) => (
          <View key={chapter.id}>
            {multiChapter && (
              <Text style={styles.chapterHeading}>{chapter.title}</Text>
            )}
            {chIdx > 0 && <View style={styles.divider} />}
            {chapter.blocks.map((block) => {
              const text = block.content.trimStart().startsWith('<')
                ? stripHtml(block.content)
                : block.content;

              if (block.type === 'heading') {
                return <Text key={block.id} style={styles.heading}>{text}</Text>;
              }
              if (block.type === 'quote') {
                return <Text key={block.id} style={styles.quote}>{text}</Text>;
              }
              return <Text key={block.id} style={styles.paragraph}>{text}</Text>;
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}
