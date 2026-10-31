// Why chunk? An embedding squeezes a whole text into one vector, so a 50-page PDF
// as a single vector would be a blurry average of everything. Small chunks give
// precise vectors, and we only send the few relevant chunks to the LLM.
//
// Overlap keeps a sentence that straddles a boundary present in both chunks.

const SEPARATORS = ['\n\n', '\n', '. ', ' '];

export function chunkText(text, { chunkSize = 800, overlap = 150 } = {}) {
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      end = start + findBreak(clean.slice(start, end), chunkSize / 2);
    }

    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

// Cut at the most natural boundary (paragraph > line > sentence > word),
// as long as it doesn't make the chunk shorter than `minLength`.
function findBreak(window, minLength) {
  for (const sep of SEPARATORS) {
    const i = window.lastIndexOf(sep);
    if (i !== -1 && i + sep.length >= minLength) return i + sep.length;
  }
  return window.length;
}
