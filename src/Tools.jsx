import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { Upload, FileText, X, Download, CheckCircle2, AlertCircle, Shield, Settings, RotateCw, Layers } from 'lucide-react';
import { Breadcrumb, ToolHeader, StepIndicator, TOOLS } from './App';
import { mergePDFs, splitPDF, compressPDF, rotatePDF, addWatermark, pdfToImages, imagesToPDF, addPageNumbers, extractPages, reorderPages, getMetadata, cleanMetadata, getPageThumbnails, formatBytes } from './pdfEngine';

function useTool() {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onDrop = useCallback(function(acc) { setFiles(function(p) { return p.concat(acc); }); setStep(2); setError(''); }, []);
  const removeFile = function(i) { setFiles(function(p) { var n = p.filter(function(_, idx) { return idx !== i; }); if (n.length === 0) { setStep(1); setResult(null); } return n; }); };
  const reset = function() { setFiles([]); setStep(1); setResult(null); setError(''); setBusy(false); };
  return { files: files, setFiles: setFiles, step: step, setStep: setStep, result: result, setResult: setResult, error: error, setError: setError, busy: busy, setBusy: setBusy, onDrop: onDrop, removeFile: removeFile, reset: reset };
}

function saveFile(bytes, filename) {
  var blob = new Blob([bytes], { type: 'application/pdf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DropZone(props) {
  var dz = useDropzone({ onDrop: props.onDrop, accept: props.accept || { 'application/pdf': ['.pdf'] }, multiple: props.multiple !== false });
  return (
    <div {...dz.getRootProps()} className={'dropzone' + (dz.isDragActive ? ' active' : '')}>
      <input {...dz.getInputProps()} />
      <div className="dropzone-icon"><Upload size={44} /></div>
      <h3>{dz.isDragActive ? 'Drop files here' : 'Tap to select files'}</h3>
      <p>Choose files from your device</p>
    </div>
  );
}

function FileList(props) {
  return (
    <div className="file-list">
      {props.files.map(function(f, i) {
        return (
          <div key={i} className="file-item">
            <FileText size={20} className="file-item-icon" />
            <div className="file-item-info">
              <div className="file-item-name">{f.name}</div>
              <div className="file-item-meta">{formatBytes(f.size)}</div>
            </div>
            <button className="file-item-remove" onClick={function() { props.onRemove(i); }}><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}

function Err(props) { if (!props.msg) return null; return (<div className="error-banner"><AlertCircle size={18} /><span>{props.msg}</span></div>); }

function ResultBox(props) { return (<div className="result-section"><div className="result-icon"><CheckCircle2 size={36} /></div>{props.children}</div>); }

function td(id) { return TOOLS.find(function(t) { return t.id === id; }) || {}; }

// MERGE
export function MergePDF() {
  var t = td('merge'); var h = useTool();
  var go = async function() {
    if (h.files.length < 2) { h.setError('Add at least 2 PDFs.'); return; }
    h.setBusy(true); h.setError('');
    try { var bytes = await mergePDFs(h.files); h.setResult({ bytes: bytes, name: 'merged.pdf' }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length >= 2 && <div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Merging…</> : <><Layers size={18} /> Merge {h.files.length} PDFs</>}</button></div>}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Merged Successfully!</h3><p className="result-meta">{h.files.length} files combined</p><div className="btn-group"><button className="btn btn-success" onClick={function() { saveFile(h.result.bytes, h.result.name); }}><Download size={18} /> Download PDF</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// SPLIT
export function SplitPDF() {
  var t = td('split'); var h = useTool();
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add exactly 1 PDF.'); return; }
    h.setBusy(true); h.setError('');
    try { var pages = await splitPDF(h.files[0]); h.setResult({ pages: pages, baseName: h.files[0].name.replace('.pdf', '') }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  var dlZip = async function() {
    var zip = new JSZip();
    h.result.pages.forEach(function(p) { zip.file(h.result.baseName + '_page' + p.page + '.pdf', p.bytes); });
    var blob = await zip.generateAsync({ type: 'blob' });
    saveBlob(blob, h.result.baseName + '_split.zip');
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && <div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Splitting…</> : 'Split into Pages'}</button></div>}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Split Complete!</h3><p className="result-meta">{h.result.pages.length} pages extracted</p><div className="btn-group"><button className="btn btn-success" onClick={dlZip}><Download size={18} /> Download ZIP</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// COMPRESS
export function CompressPDF() {
  var t = td('compress'); var h = useTool();
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add exactly 1 PDF.'); return; }
    h.setBusy(true); h.setError('');
    try { var res = await compressPDF(h.files[0]); res.name = h.files[0].name.replace('.pdf', '_compressed.pdf'); h.setResult(res); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  var reduction = h.result ? ((1 - h.result.compressed / h.result.original) * 100).toFixed(1) : 0;
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && <div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Compressing…</> : 'Compress PDF'}</button></div>}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Compression Complete!</h3><div className="compression-stats"><div className="compression-stat blue"><div className="value">{formatBytes(h.result.original)}</div><div className="label">Original</div></div><div className="compression-stat green"><div className="value">{formatBytes(h.result.compressed)}</div><div className="label">Compressed</div></div><div className="compression-stat green"><div className="value">{reduction > 0 ? '-' + reduction + '%' : 'Optimized'}</div><div className="label">Reduction</div></div></div><div className="btn-group"><button className="btn btn-success" onClick={function() { saveFile(h.result.bytes, h.result.name); }}><Download size={18} /> Download</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// ROTATE
export function RotatePDF() {
  var t = td('rotate'); var h = useTool(); var [angle, setAngle] = useState(90);
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add 1 PDF.'); return; }
    h.setBusy(true); h.setError('');
    try { var bytes = await rotatePDF(h.files[0], angle); h.setResult({ bytes: bytes, name: h.files[0].name.replace('.pdf', '_rotated.pdf') }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && (<><div className="options-panel"><h3><Settings size={16} /> Rotation</h3><div className="option-row"><span className="option-label">Angle</span><select value={angle} onChange={function(e) { setAngle(Number(e.target.value)); }}><option value={90}>90° Clockwise</option><option value={180}>180°</option><option value={270}>90° Counter-clockwise</option></select></div></div><div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Rotating…</> : <><RotateCw size={18} /> Rotate PDF</>}</button></div></>)}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Rotation Complete!</h3><p className="result-meta">All pages rotated {angle}°</p><div className="btn-group"><button className="btn btn-success" onClick={function() { saveFile(h.result.bytes, h.result.name); }}><Download size={18} /> Download</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// WATERMARK
export function WatermarkPDF() {
  var t = td('watermark'); var h = useTool();
  var [text, setText] = useState('CONFIDENTIAL'); var [size, setSize] = useState(48); var [opacity, setOpacity] = useState(15); var [rot, setRot] = useState(-45);
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add 1 PDF.'); return; }
    if (!text.trim()) { h.setError('Enter watermark text.'); return; }
    h.setBusy(true); h.setError('');
    try { var bytes = await addWatermark(h.files[0], text, { size: size, opacity: opacity / 100, rotation: rot }); h.setResult({ bytes: bytes, name: h.files[0].name.replace('.pdf', '_watermarked.pdf') }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && (<><div className="options-panel"><h3><Settings size={16} /> Watermark Options</h3><div className="option-row"><span className="option-label">Text</span><input type="text" value={text} onChange={function(e) { setText(e.target.value); }} /></div><div className="option-row"><span className="option-label">Size</span><input type="range" min="16" max="120" value={size} onChange={function(e) { setSize(+e.target.value); }} /><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--text-muted)' }}>{size}px</span></div><div className="option-row"><span className="option-label">Opacity</span><input type="range" min="5" max="80" value={opacity} onChange={function(e) { setOpacity(+e.target.value); }} /><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--text-muted)' }}>{opacity}%</span></div><div className="option-row"><span className="option-label">Rotation</span><input type="range" min="-90" max="90" value={rot} onChange={function(e) { setRot(+e.target.value); }} /><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--text-muted)' }}>{rot}°</span></div></div><div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Applying…</> : 'Add Watermark'}</button></div></>)}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Watermark Applied!</h3><p className="result-meta">"{text}" on every page</p><div className="btn-group"><button className="btn btn-success" onClick={function() { saveFile(h.result.bytes, h.result.name); }}><Download size={18} /> Download</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// PDF TO IMAGES
export function PDFToImages() {
  var t = td('pdf2img'); var h = useTool(); var [format, setFormat] = useState('png');
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add 1 PDF.'); return; }
    h.setBusy(true); h.setError('');
    try { var images = await pdfToImages(h.files[0], format); h.setResult({ images: images, baseName: h.files[0].name.replace('.pdf', '') }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  var dlAll = async function() {
    var zip = new JSZip();
    for (var i = 0; i < h.result.images.length; i++) {
      var b64 = h.result.images[i].url.split(',')[1];
      zip.file(h.result.baseName + '_page' + h.result.images[i].page + '.' + format, b64, { base64: true });
    }
    var blob = await zip.generateAsync({ type: 'blob' });
    saveBlob(blob, h.result.baseName + '_images.zip');
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && (<><div className="options-panel"><h3><Settings size={16} /> Output Format</h3><div className="option-row"><span className="option-label">Format</span><select value={format} onChange={function(e) { setFormat(e.target.value); }}><option value="png">PNG (Lossless)</option><option value="jpg">JPG (Smaller)</option></select></div></div><div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Converting…</> : 'Convert to Images'}</button></div></>)}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Conversion Complete!</h3><p className="result-meta">{h.result.images.length} pages → {format.toUpperCase()}</p><div className="btn-group"><button className="btn btn-success" onClick={dlAll}><Download size={18} /> Download ZIP</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// IMAGES TO PDF
export function ImagesToPDF() {
  var t = td('img2pdf'); var h = useTool();
  var go = async function() {
    if (h.files.length === 0) { h.setError('Add at least 1 image.'); return; }
    h.setBusy(true); h.setError('');
    try { var bytes = await imagesToPDF(h.files); h.setResult({ bytes: bytes, name: 'images.pdf' }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} accept={{ 'image/*': ['.jpg','.jpeg','.png'] }} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length > 0 && <div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Creating…</> : <><FileText size={18} /> Create PDF ({h.files.length} images)</>}</button></div>}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>PDF Created!</h3><p className="result-meta">{h.files.length} images combined</p><div className="btn-group"><button className="btn btn-success" onClick={function() { saveFile(h.result.bytes, h.result.name); }}><Download size={18} /> Download PDF</button><button className="btn btn-secondary" onClick={h.reset}>Process Another</button></div></ResultBox>)}
    </div>
  );
}

// PAGE NUMBERS
export function PageNumbers() {
  var t = td('pagenums'); var h = useTool();
  var [pos, setPos] = useState('bottom-center'); var [fontSize, setFontSize] = useState(11); var [start, setStart] = useState(1); var [fmt, setFmt] = useState('{n} / {total}');
  var go = async function() {
    if (h.files.length !== 1) { h.setError('Add 1 PDF.'); return; }
    h.setBusy(true); h.setError('');
    try { var bytes = await addPageNumbers(h.files[0], { pos: pos, size: fontSize, start: start, fmt: fmt }); h.setResult({ bytes: bytes, name: h.files[0].name.replace('.pdf', '_numbered.pdf') }); h.setStep(3); } catch(e) { h.setError(e.message); }
    h.setBusy(false);
  };
  return (
    <div className="tool-page">
      <Breadcrumb name={t.name} /><ToolHeader icon={t.icon} name={t.name} description={t.desc} color={t.color} /><StepIndicator current={h.step} />
      {h.error && <Err msg={h.error} />}
      {h.step <= 2 && (<><DropZone onDrop={h.onDrop} multiple={false} />{h.files.length > 0 && <FileList files={h.files} onRemove={h.removeFile} />}{h.files.length === 1 && (<><div className="options-panel"><h3><Settings size={16} /> Page Number Options</h3><div className="option-row"><span className="option-label">Position</span><select value={pos} onChange={function(e) { setPos(e.target.value); }}><option value="bottom-center">Bottom Center</option><option value="bottom-left">Bottom Left</option><option value="bottom-right">Bottom Right</option><option value="top-center">Top Center</option><option value="top-right">Top Right</option></select></div><div className="option-row"><span className="option-label">Font Size</span><input type="number" min="6" max="36" value={fontSize} onChange={function(e) { setFontSize(+e.target.value); }} style={{ width: 80 }} /></div><div className="option-row"><span className="option-label">Start At</span><input type="number" min="1" value={start} onChange={function(e) { setStart(+e.target.value); }} style={{ width: 80 }} /></div><div className="option-row"><span className="option-label">Format</span><input type="text" value={fmt} onChange={function(e) { setFmt(e.target.value); }} style={{ width: 180 }} /></div></div><div className="btn-group"><button className={'btn btn-primary' + (h.busy ? ' processing' : '')} onClick={go} disabled={h.busy}>{h.busy ? <><div className="spinner" /> Adding…</> : 'Add Page Numbers'}</button></div></>)}</>)}
      {h.step === 3 && h.result && (<ResultBox><h3>Page Numbers Added!</h3><div className="btn-group"><button className="btn btn-success" onClick=
