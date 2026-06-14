import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Layers, Scissors, Minimize2, RotateCw, Type, Image, FileText,
  Hash, ArrowUpDown, Info, Eraser, Shield, Lock, ChevronRight,
  Zap, Globe, Server, Eye, Download
} from 'lucide-react';
import {
  MergePDF, SplitPDF, CompressPDF, RotatePDF, WatermarkPDF,
  PDFToImages, ImagesToPDF, PageNumbers, ExtractPages,
  ReorderPages, PDFInfo, CleanMetadata
} from './Tools';

export var TOOLS = [
  { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into one document', path: '/merge', icon: Layers, color: '#3b82f6' },
  { id: 'split', name: 'Split PDF', desc: 'Split PDF into individual page files', path: '/split', icon: Scissors, color: '#8b5cf6' },
  { id: 'compress', name: 'Compress PDF', desc: 'Reduce PDF file size keeping quality', path: '/compress', icon: Minimize2, color: '#10b981' },
  { id: 'rotate', name: 'Rotate PDF', desc: 'Rotate PDF pages to any angle', path: '/rotate', icon: RotateCw, color: '#f59e0b' },
  { id: 'watermark', name: 'Watermark PDF', desc: 'Add text watermark across all pages', path: '/watermark', icon: Type, color: '#ec4899' },
  { id: 'pdf2img', name: 'PDF to Images', desc: 'Convert each page to high-res PNG or JPG', path: '/pdf-to-images', icon: Image, color: '#06b6d4' },
  { id: 'img2pdf', name: 'Images to PDF', desc: 'Convert JPG and PNG images into a PDF', path: '/images-to-pdf', icon: FileText, color: '#f97316' },
  { id: 'pagenums', name: 'Page Numbers', desc: 'Add custom page numbers to every page', path: '/page-numbers', icon: Hash, color: '#6366f1' },
  { id: 'extract', name: 'Extract Pages', desc: 'Select and extract specific pages', path: '/extract-pages', icon: Scissors, color: '#f43f5e' },
  { id: 'reorder', name: 'Reorder Pages', desc: 'Drag and rearrange page order', path: '/reorder-pages', icon: ArrowUpDown, color: '#14b8a6' },
  { id: 'info', name: 'PDF Info', desc: 'View document metadata and properties', path: '/pdf-info', icon: Info, color: '#94a3b8' },
  { id: 'clean', name: 'Clean Metadata', desc: 'Strip all metadata for maximum privacy', path: '/clean-metadata', icon: Eraser, color: '#22c55e' },
];

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <Shield size={22} /> VaultPDF
      </Link>
      <div className="navbar-links">
        <a href="#tools">Tools</a>
        <a href="#privacy">Privacy</a>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-badge"><Zap size={14} /> 100% Browser-Based Processing</div>
        <h1>Your PDFs, <span className="gradient-text">Your Privacy</span></h1>
        <p>Every tool runs entirely inside your browser. No uploads. No servers. No data collection. Your files never leave your device.</p>
        <div className="hero-stats">
          <div className="stat"><span className="stat-number">{TOOLS.length}+</span><span className="stat-label">PDF Tools</span></div>
          <div className="stat"><span className="stat-number">0</span><span className="stat-label">Bytes Uploaded</span></div>
          <div className="stat"><span className="stat-number">100%</span><span className="stat-label">Private</span></div>
        </div>
      </section>
      <section className="tools-section" id="tools">
        <h2>All Tools</h2>
        <div className="tools-grid">
          {TOOLS.map(function(tool) {
            var Icon = tool.icon;
            return (
              <Link to={tool.path} key={tool.id} className="tool-card">
                <div className="tool-card-icon" style={{ background: tool.color + '15', color: tool.color }}>
                  <Icon size={24} />
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="privacy-section" id="privacy">
        <div className="privacy-grid">
          <div className="privacy-card">
            <div className="privacy-card-icon"><Server size={20} /></div>
            <div><h4>Zero Server Processing</h4><p>All PDF operations happen locally using WebAssembly. Nothing is transmitted.</p></div>
          </div>
          <div className="privacy-card">
            <div className="privacy-card-icon"><Eye size={20} /></div>
            <div><h4>No Tracking or Analytics</h4><p>No cookies, no trackers. Your usage stays completely anonymous.</p></div>
          </div>
          <div className="privacy-card">
            <div className="privacy-card-icon"><Globe size={20} /></div>
            <div><h4>Works Offline</h4><p>After first load, tools work without internet. True offline PDF processing.</p></div>
          </div>
        </div>
      </section>
      <footer className="footer"><span className="footer-brand">VaultPDF</span> — Your files never leave your browser.</footer>
    </>
  );
}

export function Breadcrumb({ name }) {
  return (
    <div className="breadcrumb">
      <Link to="/">Home</Link>
      <ChevronRight size={14} />
      <span style={{ color: 'var(--text)' }}>{name}</span>
    </div>
  );
}

export function ToolHeader({ icon: Icon, name, description, color }) {
  return (
    <div className="tool-header">
      <div className="tool-header-icon" style={{ background: (color || '#3b82f6') + '15', color: color || 'var(--accent-light)' }}>
        <Icon size={28} />
      </div>
      <h1>{name}</h1>
      <p>{description}</p>
      <div className="privacy-badge"><Shield size={13} /> Processed locally — files never leave your browser</div>
    </div>
  );
}

export function StepIndicator({ current }) {
  var labels = ['Upload', 'Configure', 'Download'];
  return (
    <div className="steps">
      {labels.map(function(label, i) {
        return (
          <div key={i} className={'step-item' + (i + 1 === current ? ' active' : '') + (i + 1 < current ? ' done' : '')}>
            <span className="step-num">{i + 1 < current ? '✓' : i + 1}</span>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function ScrollToTop() {
  var loc = useLocation();
  React.useEffect(function() { window.scrollTo(0, 0); }, [loc.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/merge" element={<MergePDF />} />
        <Route path="/split" element={<SplitPDF />} />
        <Route path="/compress" element={<CompressPDF />} />
        <Route path="/rotate" element={<RotatePDF />} />
        <Route path="/watermark" element={<WatermarkPDF />} />
        <Route path="/pdf-to-images" element={<PDFToImages />} />
        <Route path="/images-to-pdf" element={<ImagesToPDF />} />
        <Route path="/page-numbers" element={<PageNumbers />} />
        <Route path="/extract-pages" element={<ExtractPages />} />
        <Route path="/reorder-pages" element={<ReorderPages />} />
        <Route path="/pdf-info" element={<PDFInfo />} />
        <Route path="/clean-metadata" element={<CleanMetadata />} />
      </Routes>
    </>
  );
}
  
