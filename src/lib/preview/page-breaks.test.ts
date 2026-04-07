/**
 * Unit tests for page-breaks utilities
 * Tests manual page break marker detection and manipulation
 */

import {
  PAGE_BREAK_HTML,
  isPageBreakMarker,
  isPageBreakElement,
  replacePageBreakMarkers,
  countPageBreaks,
  removePageBreakMarkers,
} from './page-breaks';

describe('page-breaks', () => {
  describe('PAGE_BREAK_HTML constant', () => {
    it('should have correct format', () => {
      expect(PAGE_BREAK_HTML).toContain('hr');
      expect(PAGE_BREAK_HTML).toContain('data-page-break="true"');
    });

    it('should be valid HTML', () => {
      expect(PAGE_BREAK_HTML).toMatch(/^<hr\s+data-page-break="true"\s*\/?>$/);
    });
  });

  describe('isPageBreakMarker', () => {
    it('should identify exact page break marker', () => {
      expect(isPageBreakMarker(PAGE_BREAK_HTML)).toBe(true);
    });

    it('should identify page break with whitespace', () => {
      expect(isPageBreakMarker('  ' + PAGE_BREAK_HTML + '  ')).toBe(true);
    });

    it('should identify page break without self-closing slash', () => {
      expect(isPageBreakMarker('<hr data-page-break="true">')).toBe(true);
    });

    it('should identify page break with extra whitespace in tag', () => {
      expect(isPageBreakMarker('<hr  data-page-break="true" />')).toBe(true);
    });

    it('should be case-insensitive for tag name', () => {
      expect(isPageBreakMarker('<HR data-page-break="true" />')).toBe(true);
    });

    it('should reject page break with wrong attribute value', () => {
      expect(isPageBreakMarker('<hr data-page-break="false" />')).toBe(false);
    });

    it('should reject page break missing attribute', () => {
      expect(isPageBreakMarker('<hr />')).toBe(false);
    });

    it('should reject non-HR elements', () => {
      expect(isPageBreakMarker('<p data-page-break="true"></p>')).toBe(false);
    });

    it('should reject regular HR elements', () => {
      expect(isPageBreakMarker('<hr>')).toBe(false);
    });

    it('should reject page break with additional attributes', () => {
      expect(
        isPageBreakMarker('<hr data-page-break="true" class="test" />'),
      ).toBe(false);
    });
  });

  describe('isPageBreakElement', () => {
    it('should identify page break DOM element', () => {
      const element = document.createElement('hr');
      element.setAttribute('data-page-break', 'true');

      expect(isPageBreakElement(element)).toBe(true);
    });

    it('should reject HR without page break attribute', () => {
      const element = document.createElement('hr');
      expect(isPageBreakElement(element)).toBe(false);
    });

    it('should reject HR with wrong attribute value', () => {
      const element = document.createElement('hr');
      element.setAttribute('data-page-break', 'false');

      expect(isPageBreakElement(element)).toBe(false);
    });

    it('should reject non-HR elements', () => {
      const element = document.createElement('p');
      element.setAttribute('data-page-break', 'true');

      expect(isPageBreakElement(element)).toBe(false);
    });
  });

  describe('replacePageBreakMarkers', () => {
    it('should replace single page break', () => {
      const content = `<p>Before</p>${PAGE_BREAK_HTML}<p>After</p>`;
      const result = replacePageBreakMarkers(content, '<!-- PAGE BREAK -->');

      expect(result).toContain('<!-- PAGE BREAK -->');
      expect(result).not.toContain('data-page-break="true"');
    });

    it('should replace multiple page breaks', () => {
      const content = `
        <p>First</p>
        ${PAGE_BREAK_HTML}
        <p>Second</p>
        ${PAGE_BREAK_HTML}
        <p>Third</p>
      `;
      const result = replacePageBreakMarkers(content, '---');

      // Should have 2 replacements
      expect((result.match(/---/g) || []).length).toBe(2);
    });

    it('should preserve content around page breaks', () => {
      const content = `<p>Before</p>${PAGE_BREAK_HTML}<p>After</p>`;
      const result = replacePageBreakMarkers(content, '<!-- BREAK -->');

      expect(result).toContain('<p>Before</p>');
      expect(result).toContain('<p>After</p>');
      expect(result).toContain('<!-- BREAK -->');
    });

    it('should handle empty replacement string', () => {
      const content = `<p>Before</p>${PAGE_BREAK_HTML}<p>After</p>`;
      const result = replacePageBreakMarkers(content, '');

      expect(result).not.toContain('data-page-break="true"');
      expect(result).toContain('<p>Before</p>');
      expect(result).toContain('<p>After</p>');
    });

    it('should handle content with no page breaks', () => {
      const content = '<p>Just regular content</p>';
      const result = replacePageBreakMarkers(content, '<!-- BREAK -->');

      expect(result).toBe(content);
    });

    it('should replace consecutive page breaks', () => {
      const content = `<p>Start</p>${PAGE_BREAK_HTML}${PAGE_BREAK_HTML}<p>End</p>`;
      const result = replacePageBreakMarkers(content, '|');

      expect((result.match(/\|/g) || []).length).toBe(2);
    });

    it('should replace page break variants (with/without self-closing slash)', () => {
      const variant1 = '<hr data-page-break="true" />';
      const variant2 = '<hr data-page-break="true">';

      const content = `<p>A</p>${variant1}<p>B</p>${variant2}<p>C</p>`;
      const result = replacePageBreakMarkers(content, '>>');

      // Both variants should be replaced
      expect((result.match(/>>/g) || []).length).toBe(2);
    });
  });

  describe('countPageBreaks', () => {
    it('should count zero page breaks', () => {
      const content = '<p>Just content</p>';
      expect(countPageBreaks(content)).toBe(0);
    });

    it('should count single page break', () => {
      const content = `<p>Before</p>${PAGE_BREAK_HTML}<p>After</p>`;
      expect(countPageBreaks(content)).toBe(1);
    });

    it('should count multiple page breaks', () => {
      const content = `
        <p>One</p>${PAGE_BREAK_HTML}
        <p>Two</p>${PAGE_BREAK_HTML}
        <p>Three</p>${PAGE_BREAK_HTML}
        <p>Four</p>
      `;
      expect(countPageBreaks(content)).toBe(3);
    });

    it('should count consecutive page breaks', () => {
      const content = `${PAGE_BREAK_HTML}${PAGE_BREAK_HTML}${PAGE_BREAK_HTML}`;
      expect(countPageBreaks(content)).toBe(3);
    });

    it('should count page break variants', () => {
      const variant1 = '<hr data-page-break="true" />';
      const variant2 = '<hr data-page-break="true">';

      const content = `${variant1}<p>Text</p>${variant2}`;
      expect(countPageBreaks(content)).toBe(2);
    });

    it('should not count false positives', () => {
      const content = `
        <p>Text with data-page-break="true" in it</p>
        <hr/>
        <hr data-something-else="true" />
      `;
      // Should be 0 since the attribute is in a paragraph and other HR doesn't have the attribute
      expect(countPageBreaks(content)).toBe(0);
    });

    it('should return 0 for null/empty content', () => {
      expect(countPageBreaks('')).toBe(0);
      expect(countPageBreaks(null as any)).toBe(0);
    });
  });

  describe('removePageBreakMarkers', () => {
    it('should remove single page break', () => {
      const content = `<p>Before</p>${PAGE_BREAK_HTML}<p>After</p>`;
      const result = removePageBreakMarkers(content);

      expect(result).not.toContain('data-page-break="true"');
      expect(result).toContain('<p>Before</p>');
      expect(result).toContain('<p>After</p>');
    });

    it('should remove multiple page breaks', () => {
      const content = `
        <p>One</p>${PAGE_BREAK_HTML}
        <p>Two</p>${PAGE_BREAK_HTML}
        <p>Three</p>
      `;
      const result = removePageBreakMarkers(content);

      expect(result).not.toContain('data-page-break="true"');
      expect(result).toContain('<p>One</p>');
      expect(result).toContain('<p>Two</p>');
      expect(result).toContain('<p>Three</p>');
    });

    it('should remove all HR variants', () => {
      const variant1 = '<hr data-page-break="true" />';
      const variant2 = '<hr data-page-break="true">';

      const content = `Text${variant1}More${variant2}End`;
      const result = removePageBreakMarkers(content);

      expect(result).not.toContain('data-page-break="true"');
      expect(result).toContain('TextMore');
    });

    it('should not remove regular HR elements', () => {
      const content = '<p>Before</p><hr /><p>After</p>';
      const result = removePageBreakMarkers(content);

      // Regular HR should remain
      expect(result).toContain('<hr />');
    });

    it('should preserve content when removing', () => {
      const content = `<h1>Title</h1>${PAGE_BREAK_HTML}<p>Content</p>`;
      const result = removePageBreakMarkers(content);

      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Content</p>');
    });

    it('should handle empty content', () => {
      expect(removePageBreakMarkers('')).toBe('');
    });

    it('should return unchanged content if no breaks present', () => {
      const content = '<p>Just content</p>';
      expect(removePageBreakMarkers(content)).toBe(content);
    });

    it('should leave consecutive breaks as just spaces', () => {
      const content = `<p>A</p>${PAGE_BREAK_HTML}${PAGE_BREAK_HTML}<p>B</p>`;
      const result = removePageBreakMarkers(content);

      // Breaks removed, but paragraph structure intact
      expect(result).toContain('<p>A</p>');
      expect(result).toContain('<p>B</p>');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle page break in middle of content', () => {
      const content = `
        <h1>Chapter 1</h1>
        <p>Introduction</p>
        <p>Content paragraph 1</p>
        <p>Content paragraph 2</p>
        ${PAGE_BREAK_HTML}
        <h2>Section 2</h2>
        <p>More content</p>
      `;

      // Test count
      expect(countPageBreaks(content)).toBe(1);

      // Test replace
      const replaced = replacePageBreakMarkers(content, '<!-- PAGE BREAK -->');
      expect(replaced).toContain('<!-- PAGE BREAK -->');

      // Test remove
      const removed = removePageBreakMarkers(content);
      expect(removed).not.toContain('data-page-break="true"');
      expect(removed).toContain('<h1>Chapter 1</h1>');
      expect(removed).toContain('<h2>Section 2</h2>');
    });

    it('should work with complex HTML structure', () => {
      const content = `
        <article>
          <section>
            <h1>Title</h1>
            <p>Intro</p>
            ${PAGE_BREAK_HTML}
            <h2>Subsection</h2>
            <p>Content</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            ${PAGE_BREAK_HTML}
            <p>More content</p>
          </section>
        </article>
      `;

      expect(countPageBreaks(content)).toBe(2);

      const removed = removePageBreakMarkers(content);
      expect(removed).toContain('<h1>Title</h1>');
      expect(removed).toContain('<h2>Subsection</h2>');
      expect(removed).toContain('<li>Item 1</li>');
    });
  });
});
