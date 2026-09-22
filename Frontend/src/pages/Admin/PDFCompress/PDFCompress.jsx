import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, SlidersHorizontal, CheckCircle, Download, FileArchive, ArrowRight } from 'lucide-react';
import { adminApi } from '../../../services/api';
import '../AdminCommon.css';
import './PDFCompress.css';

const PDFCompress = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Quality options matching backend
  const [pdfQuality, setPdfQuality] = useState('low');
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState(null);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    setError('');
    setCompressionResult(null);
    
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    
    // Max 5GB
    if (file.size > 5368709120) {
      setError('File is too large. Maximum size is 5GB.');
      return;
    }
    
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setCompressionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!selectedFile) return;
    
    setIsCompressing(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('quality', pdfQuality);
      
      const response = await adminApi.compressPdf(formData);
      
      if (response.success) {
        setCompressionResult(response.data);
      } else {
        setError(response.message || 'Failed to compress PDF');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during compression');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = async () => {
    if (!compressionResult || !compressionResult.url) return;
    try {
      setError('');
      const blob = await adminApi.downloadCompressedPdf(compressionResult.url);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = compressionResult.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.message || 'Failed to download compressed PDF');
    }
  };

  return (
    <div className="admin-page pdf-compress-page">
      <div className="admin-page-header mb-8">
        <div>
          <h1 className="admin-page-title" style={{ fontFamily: 'var(--font-display, serif)', fontSize: '2.5rem', color: 'var(--brand-dark)' }}>PDF Compress</h1>
        </div>
      </div>

      <div className="pdf-compress-content">
        <div className="pdf-compress-layout">
          {/* Left Column: Upload */}
          <div className="pdf-compress-main">
            <div className="admin-card">
              
              {!selectedFile ? (
                <div
                  className={`pdf-dropzone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={48} className="pdf-dropzone-icon" />
                  <h3>Click or Drag & Drop PDF here</h3>
                  <p>Maximum file size: 5GB</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept="application/pdf"
                    style={{ display: 'none' }}
                  />
                  <button type="button" className="btn-outline-brand mt-6" style={{ padding: '10px 24px', borderRadius: '8px' }}>
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="pdf-selected-file">
                  <div className="pdf-file-info">
                    <div className="pdf-file-icon">
                      <File size={32} />
                    </div>
                    <div className="pdf-file-details">
                      <h4>{selectedFile.name}</h4>
                      <p>{formatSize(selectedFile.size)}</p>
                    </div>
                    <button type="button" className="pdf-remove-btn" onClick={removeFile} title="Remove File">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="pdf-error-message mt-4">
                  {error}
                </div>
              )}

              {/* Compression Progress / Result Area */}
              {selectedFile && !compressionResult && !error && (
                <div className="pdf-compress-action" style={{ marginTop: '32px' }}>
                  <button
                    type="button"
                    className="btn-brand"
                    onClick={handleCompress}
                    disabled={isCompressing}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isCompressing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="admin-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                        Compressing PDF...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <FileArchive size={20} />
                        Compress PDF
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Result Card */}
            {compressionResult && (
              <div className="admin-card mt-6 pdf-result-card">
                <div className="pdf-result-header">
                  <CheckCircle size={32} className="text-emerald-500" />
                  <h3 className="text-xl font-bold text-emerald-900">Compression Successful</h3>
                </div>
                
                <div className="pdf-stats-grid">
                  <div className="pdf-stat-box">
                    <span className="pdf-stat-label">Original Size</span>
                    <span className="pdf-stat-value text-stone-500 line-through">
                      {formatSize(compressionResult.originalSize)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight size={24} className="text-stone-300" />
                  </div>
                  <div className="pdf-stat-box highlight">
                    <span className="pdf-stat-label">Compressed Size</span>
                    <span className="pdf-stat-value text-brand-dark">
                      {formatSize(compressionResult.compressedSize)}
                    </span>
                  </div>
                </div>

                <div className="pdf-savings-banner mt-4">
                  Saved <strong>{formatSize(compressionResult.spaceSaved)}</strong> ({compressionResult.percentageSaved}%)
                </div>
                
                <div className="mt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn-brand flex-1 flex justify-center items-center gap-2"
                    style={{ padding: '16px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600' }}
                  >
                    <Download size={20} />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="btn-outline-brand"
                    style={{ padding: '16px 32px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '600' }}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings */}
          <div className="pdf-compress-sidebar">
            <div className="catalog-quality-panel" style={{ opacity: selectedFile ? 1 : 0.5, pointerEvents: selectedFile && !isCompressing ? 'auto' : 'none' }}>
              <div className="catalog-section-header mb-4">
                <div className="catalog-section-title">
                  <SlidersHorizontal size={18} />
                  <span>Compression Quality</span>
                </div>
              </div>

              <div className="catalog-quality-stack">
                <div
                  onClick={() => setPdfQuality('print')}
                  className={`catalog-opt-card ${pdfQuality === 'print' ? 'selected' : ''}`}
                >
                  <div className="catalog-opt-header">
                    <div className="catalog-opt-left">
                      <div className="pdf-radio-ring">
                        <div className="pdf-radio-dot" />
                      </div>
                      <span className="catalog-opt-title">Print Quality (600 DPI)</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPdfQuality('high')}
                  className={`catalog-opt-card ${pdfQuality === 'high' ? 'selected' : ''}`}
                >
                  <div className="catalog-opt-header">
                    <div className="catalog-opt-left">
                      <div className="pdf-radio-ring">
                        <div className="pdf-radio-dot" />
                      </div>
                      <span className="catalog-opt-title">High Quality (300 DPI)</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPdfQuality('medium')}
                  className={`catalog-opt-card ${pdfQuality === 'medium' ? 'selected' : ''}`}
                >
                  <div className="catalog-opt-header">
                    <div className="catalog-opt-left">
                      <div className="pdf-radio-ring">
                        <div className="pdf-radio-dot" />
                      </div>
                      <span className="catalog-opt-title">Medium Quality (150 DPI)</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPdfQuality('low')}
                  className={`catalog-opt-card ${pdfQuality === 'low' ? 'selected' : ''}`}
                >
                  <div className="catalog-opt-header">
                    <div className="catalog-opt-left">
                      <div className="pdf-radio-ring">
                        <div className="pdf-radio-dot" />
                      </div>
                      <span className="catalog-opt-title">Low Quality (72 DPI)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFCompress;
