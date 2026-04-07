/**
 * Unit tests for content-paginator
 * Tests pagination logic for splitting HTML content into pages
 */

import { paginateContent } from './content-paginator';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import { PAGE_BREAK_HTML } from './page-breaks';

describe('content-paginator', () => {
  describe('paginateContent', () => {
    it('should return empty content placeholder for null input', () => {
      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent('', config);

      expect(pages).toHaveLength(1);
      expect(pages[0].type).toBe('content');
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].html).toContain('No hay contenido disponible');
    });

    it('should return empty content placeholder for whitespace-only input', () => {
      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent('   \n\n  ', config);

      expect(pages).toHaveLength(1);
      expect(pages[0].type).toBe('content');
      expect(pages[0].html).toContain('No hay contenido disponible');
    });

    it('should handle simple paragraph content', () => {
      const content = '<p>This is a simple paragraph.</p>';
      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      expect(pages.length).toBeGreaterThan(0);
      expect(pages[0].type).toBe('content');
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].html).toContain('This is a simple paragraph');
    });

    it('should respect manual page breaks', () => {
      const content = `
        <p>First page content</p>
        ${PAGE_BREAK_HTML}
        <p>Second page content</p>
        ${PAGE_BREAK_HTML}
        <p>Third page content</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Should have at least 3 pages (breaks force separate pages)
      expect(pages.length).toBeGreaterThanOrEqual(3);

      // Check that page breaks are not in the output
      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).not.toContain('data-page-break="true"');

      // Verify content is preserved in different pages
      const firstPageHtml = pages[0].html;
      const lastPageHtml = pages[pages.length - 1].html;

      expect(firstPageHtml).toContain('First page content');
      expect(lastPageHtml).toContain('Third page content');
    });

    it('should assign correct page numbers', () => {
      const content = `
        <p>${'Lorem ipsum dolor sit amet. '.repeat(100)}</p>
        <p>${'Additional paragraph. '.repeat(100)}</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Check page numbers are sequential
      for (let i = 0; i < pages.length; i++) {
        expect(pages[i].pageNumber).toBe(i + 1);
      }
    });

    it('should handle headings as chapter markers', () => {
      const content = `
        <h1>Chapter One</h1>
        <p>Chapter one content</p>
        <h2>Chapter Two</h2>
        <p>Chapter two content</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Headings should be preserved in content
      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('Chapter One');
      expect(fullHtml).toContain('Chapter Two');

      // Check chapter titles in pages
      const chapterPages = pages.filter(p => p.chapterTitle);
      expect(chapterPages.length).toBeGreaterThan(0);
    });

    it('should handle blockquotes', () => {
      const content = `
        <p>Regular paragraph</p>
        <blockquote>
          <p>This is a quote</p>
        </blockquote>
        <p>More content</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('This is a quote');
    });

    it('should handle lists', () => {
      const content = `
        <p>Introduction</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
        <p>Conclusion</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('Item 1');
      expect(fullHtml).toContain('Item 2');
      expect(fullHtml).toContain('Item 3');
    });

    it('should handle different device formats with varying page counts', () => {
      const content = '<p>' + 'Lorem ipsum dolor sit amet. '.repeat(150) + '</p>';

      const mobilePages = paginateContent(content, DEVICE_PAGINATION_CONFIGS.mobile);
      const tabletPages = paginateContent(content, DEVICE_PAGINATION_CONFIGS.tablet);
      const laptopPages = paginateContent(content, DEVICE_PAGINATION_CONFIGS.laptop);

      // Mobile (narrow) should have more pages than laptop (wide)
      expect(mobilePages.length).toBeGreaterThanOrEqual(tabletPages.length);
      expect(tabletPages.length).toBeGreaterThanOrEqual(laptopPages.length);
    });

    it('should handle images with estimated height', () => {
      const content = `
        <p>Before image</p>
        <img src="test.jpg" alt="test" />
        <p>After image</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Should not crash and should have content
      expect(pages.length).toBeGreaterThan(0);
      expect(pages[0].html).toBeTruthy();
    });

    it('should handle pre/code blocks', () => {
      const content = `
        <p>Here is some code:</p>
        <pre><code>function hello() {
  console.log("Hello World");
}</code></pre>
        <p>That was code</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('console.log');
    });

    it('should preserve formatting tags', () => {
      const content = `
        <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('<strong>');
      expect(fullHtml).toContain('<em>');
    });

    it('should handle empty nodes correctly', () => {
      const content = `
        <p>Content before</p>
        <p></p>
        <p>Content after</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Should not crash
      expect(pages.length).toBeGreaterThan(0);
      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('Content before');
      expect(fullHtml).toContain('Content after');
    });

    it('should maintain all content - no loss during pagination', () => {
      const content = `
        <h1>Chapter</h1>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <blockquote>Quote</blockquote>
        <ul><li>Item</li></ul>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      const fullHtml = pages.map(p => p.html).join('');

      // All content should be present
      expect(fullHtml).toContain('Chapter');
      expect(fullHtml).toContain('Paragraph 1');
      expect(fullHtml).toContain('Paragraph 2');
      expect(fullHtml).toContain('Quote');
      expect(fullHtml).toContain('Item');
    });

    it('should handle consecutive page breaks', () => {
      const content = `
        <p>Content 1</p>
        ${PAGE_BREAK_HTML}
        ${PAGE_BREAK_HTML}
        <p>Content 2</p>
      `;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;
      const pages = paginateContent(content, config);

      // Should not crash with consecutive breaks
      expect(pages.length).toBeGreaterThan(0);

      const fullHtml = pages.map(p => p.html).join('');
      expect(fullHtml).toContain('Content 1');
      expect(fullHtml).toContain('Content 2');
    });

    it('should handle page break at start/end', () => {
      const contentStart = `${PAGE_BREAK_HTML}<p>Content</p>`;
      const contentEnd = `<p>Content</p>${PAGE_BREAK_HTML}`;

      const config = DEVICE_PAGINATION_CONFIGS.laptop;

      const pagesStart = paginateContent(contentStart, config);
      const pagesEnd = paginateContent(contentEnd, config);

      // Should not crash
      expect(pagesStart.length).toBeGreaterThan(0);
      expect(pagesEnd.length).toBeGreaterThan(0);
      expect(pagesStart[0].html).toContain('Content');
      expect(pagesEnd[0].html).toContain('Content');
    });
  });
});
