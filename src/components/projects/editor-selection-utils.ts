const WORD_CHAR_RE = /[\p{L}\p{N}\p{M}_'-]/u;
const WORD_BASE_RE = /[\p{L}\p{N}]/u;

function isWordChar(char: string) {
  return WORD_CHAR_RE.test(char);
}

function getCodePointAt(text: string, index: number) {
  const codePoint = text.codePointAt(index);
  if (codePoint === undefined) return null;

  const char = String.fromCodePoint(codePoint);
  const length = codePoint > 0xffff ? 2 : 1;

  return { char, length };
}

function getCodePointBefore(text: string, index: number) {
  if (index <= 0) return null;

  const lastIndex = index - 1;
  const lastCodeUnit = text.charCodeAt(lastIndex);

  if (lastCodeUnit >= 0xdc00 && lastCodeUnit <= 0xdfff && lastIndex > 0) {
    const highCodeUnit = text.charCodeAt(lastIndex - 1);
    if (highCodeUnit >= 0xd800 && highCodeUnit <= 0xdbff) {
      return getCodePointAt(text, lastIndex - 1);
    }
  }

  return getCodePointAt(text, lastIndex);
}

export function findWordRange(text: string, cursorIndex: number) {
  if (!text || cursorIndex < 0 || cursorIndex > text.length) return null;

  const current = getCodePointAt(text, cursorIndex);
  const previous = getCodePointBefore(text, cursorIndex);

  let anchorIndex: number;
  let anchorLength: number;

  if (current && isWordChar(current.char)) {
    anchorIndex = cursorIndex;
    anchorLength = current.length;
  } else {
    if (cursorIndex === 0) return null;
    if (!previous || !isWordChar(previous.char)) return null;
    anchorIndex = cursorIndex - previous.length;
    anchorLength = previous.length;
  }

  let from = anchorIndex;
  let to = anchorIndex + anchorLength;

  while (from > 0) {
    const previous = getCodePointBefore(text, from);
    if (!previous || !isWordChar(previous.char)) break;
    from -= previous.length;
  }

  while (to < text.length) {
    const next = getCodePointAt(text, to);
    if (!next || !isWordChar(next.char)) break;
    to += next.length;
  }

  const token = text.slice(from, to);
  if (!WORD_BASE_RE.test(token)) return null;

  if (from === to) return null;

  return { from, to };
}

export function hasUsableWordAtCursor(text: string, cursorIndex: number) {
  return findWordRange(text, cursorIndex) !== null;
}

export function hasUsableParagraphAtCursor(text: string) {
  return text.trim().length > 0;
}
