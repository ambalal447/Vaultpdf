import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + pdfjsLib.version + '/pdf.worker.min.js';

async function loadDoc(file) {
  const buf = await file.arrayBuffer();
  return PDFDocument.load(buf, { ignoreEncryption: true });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

export async function getPageThumbnails(file, scale) {
  scale = scale || 0.4;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    out.push({ page: i, url: canvas.toDataURL('image/png'), w: vp.width, h: vp.height });
  }
  return out;
}

export async function mergePDFs(files) {
  const merged = await PDFDocument.create();
  for (var k = 0; k < files.length; k++) {
    var doc = await loadDoc(files[k]);
    var pages = await merged.copyPages(doc, doc.getPageIndices());
    for (var j = 0; j < pages.length; j++) merged.addPage(pages[j]);
  }
  return merged.save();
}

export async function splitPDF(file) {
  const doc = await loadDoc(file);
  const results = [];
  for (let i = 0; i < doc.getPageCount(); i++) {
    const nd = await PDFDocument.create();
    const arr = await nd.copyPages(doc, [i]);
    nd.addPage(arr[0]);
    results.push({ page: i + 1, bytes: await nd.save() });
  }
  return results;
}

export async function compressPDF(file) {
  const doc = await loadDoc(file);
  doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
  doc.setKeywords([]); doc.setProducer(''); doc.setCreator('');
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  return { bytes: bytes, original: file.size, compressed: bytes.length };
}

export async function rotatePDF(file, angle) {
  const doc = await loadDoc(file);
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    var cur = pages[i].getRotation().angle;
    pages[i].setRotation(degrees(cur + angle));
  }
  return doc.save();
}

export async function addWatermark(file, text, opts) {
  opts = opts || {};
  const doc = await loadDoc(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  var size = opts.size || 48;
  var opacity = opts.opacity !== undefined ? opts.opacity : 0.15;
  var rotation = opts.rotation !== undefined ? opts.rotation : -45;
  var pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    var dims = pages[i].getSize();
    var tw = font.widthOfTextAtSize(text, size);
    pages[i].drawText(text, {
      x: (dims.width - tw) / 2,
      y: dims.height / 2,
      size: size,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: opacity,
      rotate: degrees(rotation),
    });
  }
  return doc.save();
}

export async function pdfToImages(file, fmt, quality) {
  fmt = fmt || 'png';
  quality = quality || 0.92;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    var mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    images.push({ page: i, url: canvas.toDataURL(mime, quality) });
  }
  return images;
}

export async function imagesToPDF(files) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const buf = await files[i].arrayBuffer();
    var img;
    if (files[i].type === 'image/png') {
      img = await doc.embedPng(buf);
    } else {
      img = await doc.embedJpg(buf);
    }
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

export async function addPageNumbers(file, opts) {
  opts = opts || {};
  const doc = await loadDoc(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  var pos = opts.pos || 'bottom-center';
  var size = opts.size || 11;
  var start = opts.start || 1;
  var fmt = opts.fmt || '{n} / {total}';
  var color = opts.color || [0, 0, 0];
  var margin = 40;
  var total = doc.getPageCount();
  var pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    var dims = pages[i].getSize();
    var num = start + i;
    var text = fmt.replace('{n}', num).replace('{total}', total);
    var tw = font.widthOfTextAtSize(text, size);
    var x, y;
    if (pos === 'bottom-left') { x = margin; y = margin; }
    else if (pos === 'bottom-right') { x = dims.width - tw - margin; y = margin; }
    else if (pos === 'top-center') { x = (dims.width - tw) / 2; y = dims.height - margin; }
    else if (pos === 'top-right') { x = dims.width - tw - margin; y = dims.height - margin; }
    else { x = (dims.width - tw) / 2; y = margin; }
    pages[i].drawText(text, { x: x, y: y, size: size, font: font, color: rgb(color[0], color[1], color[2]) });
  }
  return doc.save();
}

export async function extractPages(file, indices) {
  const doc = await loadDoc(file);
  const nd = await PDFDocument.create();
  const pages = await nd.copyPages(doc, indices);
  for (let i = 0; i < pages.length; i++) nd.addPage(pages[i]);
  return nd.save();
}

export async function reorderPages(file, order) {
  const doc = await loadDoc(file);
  const nd = await PDFDocument.create();
  const pages = await nd.copyPages(doc, order);
  for (let i = 0; i < pages.length; i++) nd.addPage(pages[i]);
  return nd.save();
}

export async function getMetadata(file) {
  const doc = await loadDoc(file);
  var created = doc.getCreationDate();
  var modified = doc.getModificationDate();
  return {
    'File Name': file.name,
    'File Size': formatBytes(file.size),
    'Pages': doc.getPageCount(),
    'Title': doc.getTitle() || '(none)',
    'Author': doc.getAuthor() || '(none)',
    'Subject': doc.getSubject() || '(none)',
    'Keywords': (doc.getKeywords() || []).join(', ') || '(none)',
    'Creator': doc.getCreator() || '(none)',
    'Producer': doc.getProducer() || '(none)',
    'Created': created ? created.toLocaleString() : '(none)',
    'Modified': modified ? modified.toLocaleString() : '(none)'
  };
}

export async function cleanMetadata(file) {
  const doc = await loadDoc(file);
  doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
  doc.setKeywords([]); doc.setCreator(''); doc.setProducer('');
  return doc.save();
}

export { formatBytes };
                             
