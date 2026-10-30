'use strict';
// Minimal dependency-free PDF text extractor + simple PDF writer.
// LIMITS (be honest in the UI): handles text-based PDFs with Flate or uncompressed streams and standard
// text operators. Scanned/image PDFs and CID-font PDFs need OCR / a full parser (e.g. pdf.js, pdfminer).
const zlib = require('zlib');

function unescapePdf(s) {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => {
    if (c.length > 1 || /\d/.test(c)) return String.fromCharCode(parseInt(c, 8));
    return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c];
  });
}
function readLiteral(src, i) { // src[i] === '('
  let depth = 0, out = '';
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\') { out += ch + src[i + 1]; i++; continue; }
    if (ch === '(') { depth++; if (depth === 1) continue; }
    if (ch === ')') { depth--; if (depth === 0) return { text: unescapePdf(out), end: i }; }
    out += ch;
  }
  return { text: unescapePdf(out), end: src.length };
}
function textFromContent(c) {
  let out = '', i = 0;
  while (i < c.length) {
    const ch = c[i];
    if (ch === '(') { const r = readLiteral(c, i); out += r.text; i = r.end + 1; continue; }
    if (ch === '[') { // TJ array: large negative kerning ~ word space
      i++; while (i < c.length && c[i] !== ']') {
        if (c[i] === '(') { const r = readLiteral(c, i); out += r.text; i = r.end + 1; }
        else { const m = /^-?\d+(\.\d+)?/.exec(c.slice(i, i + 12)); if (m) { if (parseFloat(m[0]) < -200) out += ' '; i += m[0].length; } else i++; }
      } i++; continue;
    }
    if (c.startsWith('T*', i) || c.startsWith('ET', i) || /^[\d.\-]+\s+[\d.\-]+\s+T[dD]/.test(c.slice(i, i + 24))) {
      if (!out.endsWith('\n')) out += '\n';
    }
    i++;
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}
function extractPdf(buf) {
  const raw = buf.toString('latin1'); const pages = []; let encryptedHint = /\/Encrypt\b/.test(raw);
  const re = /(<<(?:[^>]|>(?!>))*?>>)\s*stream\r?\n/g; let m;
  while ((m = re.exec(raw))) {
    const start = re.lastIndex; const end = raw.indexOf('endstream', start); if (end < 0) break;
    let data = Buffer.from(raw.slice(start, end), 'latin1'); re.lastIndex = end;
    if (/\/FlateDecode/.test(m[1])) { try { data = zlib.inflateSync(data); } catch { try { data = zlib.inflateSync(data.slice(0, -1)); } catch { continue; } } }
    else if (/\/(DCTDecode|JPXDecode|CCITTFax|LZWDecode|ASCII85Decode)/.test(m[1])) continue;
    const s = data.toString('latin1');
    if (!/\bBT\b/.test(s)) continue;
    const t = textFromContent(s).trim(); if (t.length > 1) pages.push(t);
  }
  if (!pages.length) {
    const why = encryptedHint ? 'The PDF is encrypted.' : 'No extractable text found (scanned image or unsupported font encoding). OCR would be needed.';
    return { ok: false, error: why };
  }
  return { ok: true, pages };
}

// Writes a valid, uncompressed PDF (Helvetica). Used for downloadable sample PDFs.
function buildPdf(pages) {
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  const objs = []; const add = (s) => objs.push(s) && objs.length;
  add('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((text) => {
    const lines = [];
    String(text).split('\n').forEach((para) => {
      const words = para.split(/\s+/); let line = '';
      for (const w of words) { if ((line + ' ' + w).length > 90) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; }
      lines.push(line);
    });
    const body = 'BT /F1 11 Tf 14 TL 50 780 Td\n' + lines.map((l) => `(${esc(l)}) Tj T*`).join('\n') + '\nET';
    const pageNo = objs.length + 1;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageNo + 1} 0 R >>`);
    add(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
  });
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

module.exports = { extractPdf, buildPdf };
