import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Upload,
  History,
  Boxes,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Calendar,
  Download,
  Database,
  X,
  Layers,
  Trash2
} from 'lucide-react';
import { adminApi, sharedApi } from '../../../services/api';
import AdminConfirmModal from '../components/AdminConfirmModal';
import './ExcelStockManagement.css';
import { formatDateIST, formatTimeIST } from '../../../utils/dateUtils';
import CustomSelect from '../../../components/common/CustomSelect.jsx';
const ExcelStockManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Live Dynamic Excel Stock state
  const [stockList, setStockList] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [pageSize, setPageSize] = useState(25);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPagination, setStockPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [latestImportInfo, setLatestImportInfo] = useState(null);

  // Delete state
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Custom UI Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isLoading: false,
    onConfirm: null
  });

  const fileInputRef = useRef(null);



  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await adminApi.getExcelHistory({ page: historyPagination.page, limit: 10 });
      if (res.success) {
        setHistory(res.history);
        setHistoryPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load upload history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLiveStock = async (pageOverride) => {
    const currentPage = pageOverride !== undefined ? pageOverride : stockPagination.page;
    try {
      setStockLoading(true);
      const res = await adminApi.getLiveStock({
        search,
        page: currentPage,
        limit: pageSize
      });
      if (res.success) {
        setStockList(res.rows || res.styles || []);
        setStockPagination(res.pagination || { page: currentPage, total: 0, pages: 1 });
        setDynamicColumns(Array.isArray(res.columns) ? res.columns : []);
        if (res.latestImport) {
          setLatestImportInfo(res.latestImport);
        }
      }
    } catch (err) {
      console.error('Failed to load stock list:', err);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'live') {
      fetchLiveStock();
    }
  }, [activeTab, historyPagination.page, stockPagination.page, search, pageSize]);

  // Single Row Delete with Custom Modal
  const handleDeleteSingleRow = (rowId, rowLabel) => {
    setConfirmModal({
      open: true,
      title: 'Delete Stock Record',
      subtitle: 'Stock Inventory',
      description: 'Are you sure you want to permanently delete this stock record from the active spreadsheet?',
      itemName: rowLabel ? `Item: ${rowLabel}` : 'Stock Row',
      warning: 'The corresponding Style Code and any empty Category will also be permanently deleted.',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setDeletingRowId(rowId);
          const res = await adminApi.deleteStockRow(rowId, { importId: latestImportInfo?._id });
          if (res.success) {
            setStockList((prev) => prev.filter((r) => r._id !== rowId));
            setStockPagination((prev) => {
              const newTotal = res.totalRows !== undefined ? res.totalRows : Math.max(0, prev.total - 1);
              return {
                ...prev,
                total: newTotal,
                pages: Math.ceil(newTotal / pageSize)
              };
            });
            setFeedbackNotice({ type: 'success', message: 'Stock record and corresponding Style/Category updated successfully.' });
            fetchLiveStock();
          }
        } catch (err) {
          setFeedbackNotice({ type: 'error', message: err.message || 'Failed to delete stock row.' });
          throw err;
        } finally {
          setDeletingRowId(null);
        }
      }
    });
  };



  // Clear All Stock Records with Custom Modal
  const handleClearAllStock = () => {
    const count = stockPagination.total || stockList.length;
    setConfirmModal({
      open: true,
      title: 'Clear Entire Stock Inventory',
      subtitle: 'Permanent Reset',
      description: `You are about to permanently erase all ${count.toLocaleString()} stock records from the active spreadsheet.`,
      itemName: `${count.toLocaleString()} Active Stock Rows`,
      warning: 'This will completely clear the spreadsheet and permanently remove corresponding Style Codes, Categories, and Category Groups.',
      confirmText: 'Yes, Clear All Stock',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setIsClearingAll(true);
          const res = await adminApi.clearAllStock({ importId: latestImportInfo?._id });
          if (res.success) {
            setStockList([]);
            setStockPagination((prev) => ({ ...prev, total: 0, pages: 1, page: 1 }));
            setFeedbackNotice({ type: 'success', message: 'All Excel stock records, corresponding styles, categories, and category groups have been deleted.' });
            await fetchLiveStock(1);
          }
        } catch (err) {
          setFeedbackNotice({ type: 'error', message: err.message || 'Failed to clear stock data.' });
          throw err;
        } finally {
          setIsClearingAll(false);
        }
      }
    });
  };

  // Delete History Log with Custom Modal
  const handleDeleteHistory = (id, fileName) => {
    const isCurrentActive = latestImportInfo?._id === id;
    setConfirmModal({
      open: true,
      title: 'Delete Upload History Log',
      subtitle: isCurrentActive ? 'Active Spreadsheet Log' : 'History Log Removal',
      description: isCurrentActive
        ? 'This file is the CURRENTLY ACTIVE spreadsheet. Deleting this log will also clear active stock records and associated categories.'
        : 'Are you sure you want to permanently delete this upload history record?',
      itemName: fileName || 'Spreadsheet Upload Log',
      warning: isCurrentActive
        ? 'Deleting the active file log also clears active stock, Style Codes, Categories, and Category Groups.'
        : 'This action cannot be undone. Associated import logs will be removed.',
      confirmText: 'Delete Log',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setDeletingHistoryId(id);
          const res = await adminApi.deleteExcelHistory(id);
          if (res.success) {
            setFeedbackNotice({ type: 'success', message: `Upload log "${fileName}" and all associated data deleted successfully.` });
            fetchHistory();
            if (isCurrentActive) {
              fetchLiveStock(1);
            }
          }
        } catch (err) {
          setFeedbackNotice({ type: 'error', message: err.message || 'Failed to delete upload log.' });
          throw err;
        } finally {
          setDeletingHistoryId(null);
        }
      }
    });
  };



  // Direct file selection and automatic upload
  const handleFileSelectAndUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError('');
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await adminApi.uploadExcelStock(formData);
      if (res.success) {
        setUploadResult(res);
        if (Array.isArray(res.detectedColumns)) {
          setDynamicColumns(res.detectedColumns);
        }
        // Refresh live data immediately from first page
        setStockPagination((prev) => ({ ...prev, page: 1 }));
        await fetchLiveStock(1);
        setActiveTab('live');
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to process Excel stock upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export current table data to CSV using the exact dynamic columns
  const handleExportCsv = () => {
    if (!stockList || stockList.length === 0 || !dynamicColumns || dynamicColumns.length === 0) return;

    const headers = dynamicColumns.map((c) => `"${String(c).replace(/"/g, '""')}"`);
    const rows = [headers.join(',')];

    stockList.forEach((row) => {
      const values = dynamicColumns.map((col) => {
        const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      rows.push(values.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const cleanFileName = latestImportInfo?.fileName?.replace(/\.[^/.]+$/, '') || 'Excel_Stock';
    link.setAttribute('download', `${cleanFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="excel-stock-page">
      {/* Hidden File Input for Direct Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls, .csv"
        className="hidden"
        style={{ display: 'none' }}
        onChange={handleFileSelectAndUpload}
      />

      {/* Top Action & Spreadsheet Info Bar */}
      <div className="excel-hero-bar">
        <div className="excel-hero-left">
          <div className="excel-hero-icon-badge">
            <FileSpreadsheet size={24} />
          </div>
          <div className="excel-hero-titles">
            <div className="excel-hero-title-row">
              <h1 className="excel-hero-title">Excel Stock Sync</h1>
            </div>
            <div className="excel-hero-subtitle">
              {latestImportInfo ? (
                <>
                  <Clock size={12} />
                  <span className="excel-hero-file-pill">{latestImportInfo.fileName}</span>
                  <span style={{ fontSize: '0.65rem' }}>
                    {formatTimeIST(latestImportInfo.uploadDateTime, { hour: '2-digit', minute: '2-digit' })} • {formatDateIST(latestImportInfo.uploadDateTime)}
                  </span>
                </>
              ) : (
                <span>No active spreadsheet uploaded</span>
              )}
            </div>
          </div>
        </div>

        <div className="excel-hero-actions">
          {stockList.length > 0 && dynamicColumns.length > 0 && (
            <button onClick={handleExportCsv} className="excel-btn-export" title="Export Current Dynamic Stock to CSV">
              <Download size={15} /> Export CSV
            </button>
          )}
          {stockPagination.total > 0 && (
            <button
              type="button"
              onClick={handleClearAllStock}
              disabled={isClearingAll || uploading}
              className="excel-btn-clear"
              title="Clear all stock records from active spreadsheet"
            >
              {isClearingAll ? (
                <><RefreshCw size={15} className="animate-spin" /> Clearing...</>
              ) : (
                <><Trash2 size={15} /> Clear All Stock</>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="excel-btn-upload"
            title="Upload an Excel spreadsheet to dynamically synchronize stock data"
          >
            {uploading ? (
              <><RefreshCw size={15} className="animate-spin" /> Processing...</>
            ) : (
              <><Upload size={15} /> Upload Excel</>
            )}
          </button>
        </div>
      </div>




      {/* Uploading In-Progress Banner */}
      {uploading && (
        <div className="admin-card border-brand-primary/40 bg-brand-subtle/80 p-4 sm:p-5 mb-6 flex items-center gap-3">
          <RefreshCw size={20} className="animate-spin text-brand-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm sm:text-base">
              Uploading &amp; Analyzing Excel Spreadsheet...
            </h3>
            <p className="text-xs text-text-muted">
              Detecting dynamic sheet structure, mapping columns, and loading records. Please wait...
            </p>
          </div>
        </div>
      )}

      {/* Action Feedback Banner */}
      {feedbackNotice && (
        <div
          className={`admin-card p-3.5 mb-5 flex items-center justify-between gap-3 text-xs ${
            feedbackNotice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackNotice.type === 'error' ? (
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            )}
            <span className="font-medium">{feedbackNotice.message}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity font-semibold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="admin-card border-red-200 bg-red-50 p-4 sm:p-5 mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 text-sm sm:text-base">
                Failed to Process Excel File
              </h3>
              <p className="text-xs text-red-700">{uploadError}</p>
            </div>
          </div>
          <button
            onClick={() => setUploadError('')}
            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Success Banner */}
      {uploadResult && (
        <div className="admin-card border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm sm:text-base">
                  Excel Spreadsheet Synchronized Dynamically!
                </h3>
                <p className="text-xs text-text-muted">
                  Loaded <strong>{uploadResult.stats?.totalRows || 0} rows</strong> across{' '}
                  <strong>{uploadResult.detectedColumns?.length || 0} columns</strong>. The DataTable has automatically configured to this structure.
                </p>
              </div>
            </div>

            <button
              onClick={() => setUploadResult(null)}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
            >
              Dismiss
            </button>
          </div>

          {uploadResult.detectedColumns && uploadResult.detectedColumns.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers size={12} />
                <span>Detected Sheet Columns ({uploadResult.detectedColumns.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {uploadResult.detectedColumns.map((col) => (
                  <span
                    key={col}
                    className="inline-block bg-white text-text-primary text-xs px-2 py-0.5 rounded border border-border-subtle font-mono"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Page Tabs */}
      <div className="excel-tabs-bar mb-5">
        <button
          className={`excel-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Boxes size={15} />
          <span>Stock DataTable</span>
          <span className="excel-tab-badge">{stockPagination.total || 0}</span>
        </button>
        <button
          className={`excel-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={15} />
          <span>Upload History</span>
        </button>
      </div>

      {/* TAB 1: Dynamic Excel Stock DataTable */}
      {activeTab === 'live' && (
        <>
          {/* Action / Filter Bar */}
          <div className="excel-control-bar mb-4">
            <div className="excel-search-box">
              <Search size={16} className="text-text-muted flex-shrink-0" />
              <input
                type="text"
                className="excel-search-input"
                placeholder="Search across all columns in the sheet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="excel-search-clear-btn"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="excel-controls-right">
              <span className="excel-scroll-hint hidden md:flex"><RefreshCw size={12}/> Auto-sync</span>
              <div className="excel-page-size-wrap">
                <span>Rows:</span>
                <CustomSelect
                  className="excel-page-size-select"
                  value={pageSize}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setStockPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  options={[
                    { value: 15, label: '15' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                  style={{ minWidth: '70px', padding: '4px 10px', fontSize: '0.8rem', marginLeft: '6px' }}
                />
              </div>
              <button
                onClick={() => fetchLiveStock()}
                className="excel-refresh-btn"
                title="Refresh Table Data"
              >
                <RefreshCw size={16} className={stockLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Fully Dynamic Table */}
          <div className="excel-table-card">
            <div className="excel-table-scroll-container">
              <table className="excel-data-table">
                <thead>
                  <tr>
                    {dynamicColumns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockLoading ? (
                    <tr>
                      <td colSpan={Math.max(1, dynamicColumns.length + 1)} className="text-center py-12 text-[#587d74]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={18} className="animate-spin text-[#13392e]" />
                          <span>Loading spreadsheet data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : dynamicColumns.length > 0 && stockList.length > 0 ? (
                    stockList.map((row, rowIdx) => {
                      return (
                        <tr key={row._id || rowIdx}>
                          {/* Dynamic Cell Values */}
                          {dynamicColumns.map((col) => {
                            const cellVal = row[col];
                            const hasVal =
                              cellVal !== undefined &&
                              cellVal !== null &&
                              String(cellVal).trim() !== '';

                            // Detect if this column is a Qty/Stock column
                            const colNorm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const isQtyCol = /^(qty|quantity|stock|available|pcs|nos|pieces|units|availableqty|stockqty|availablestock)$/.test(colNorm);
                            
                            // Detect if this is a Code/Identifier
                            const isCodeCol = /^(stylecode|itemcode|designno|code|barcode)$/.test(colNorm);
                            
                            // Detect Purity
                            const isPurityCol = /^(kt|purity|karat)$/.test(colNorm);

                            if (isQtyCol && hasVal) {
                              const numVal = parseInt(String(cellVal), 10) || 0;
                              let badgeClass = '';
                              let badgeLabel = '';

                              if (numVal === 0) {
                                badgeClass = 'out-stock';
                                badgeLabel = 'Out of Stock';
                              } else if (numVal <= 5) {
                                badgeClass = 'low-stock';
                                badgeLabel = `${numVal} left`;
                              } else {
                                badgeClass = 'in-stock';
                                badgeLabel = `${numVal} in stock`;
                              }

                              return (
                                <td key={col}>
                                  <span className={`excel-stock-badge ${badgeClass}`}>
                                    <span className="excel-stock-dot" />
                                    {badgeLabel}
                                  </span>
                                </td>
                              );
                            }

                            if (isCodeCol && hasVal) {
                              return <td key={col} className="excel-code-cell">{String(cellVal)}</td>;
                            }
                            
                            if (isPurityCol && hasVal) {
                              return (
                                <td key={col}>
                                  <span className="excel-kt-badge">{String(cellVal)}</span>
                                </td>
                              );
                            }

                            return (
                              <td key={col} className={hasVal ? '' : 'excel-empty-dash'}>
                                {hasVal ? String(cellVal) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={Math.max(1, dynamicColumns.length + 1)} className="text-center py-16 text-[#587d74]">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[#EAF2F0] text-[#13392e] flex items-center justify-center mx-auto">
                            <FileSpreadsheet size={24} />
                          </div>
                          <h4 className="text-sm font-semibold text-[#13392e]">
                            {search ? 'No matching rows found' : 'No Excel Stock Data Uploaded'}
                          </h4>
                          <p className="text-xs text-[#587d74]">
                            {search
                              ? `No spreadsheet rows match "${search}". Try adjusting your search query.`
                              : 'Upload any Excel spreadsheet (.xlsx, .xls, .csv). The table will dynamically render the exact columns and records present in your file.'}
                          </p>
                          {!search && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="excel-btn-upload text-xs mx-auto mt-2"
                            >
                              <Upload size={14} />
                              <span>Upload Excel File</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Bar */}
            {dynamicColumns.length > 0 && stockPagination.total > 0 && (
              <div className="excel-pagination-bar">
                <span className="excel-pagination-info">
                  Showing {(stockPagination.page - 1) * pageSize + 1} -{' '}
                  {Math.min(stockPagination.page * pageSize, stockPagination.total)} of{' '}
                  {stockPagination.total} rows
                </span>
                <div className="excel-pagination-actions">
                  <button
                    disabled={stockPagination.page <= 1}
                    onClick={() => setStockPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="excel-page-nav-btn"
                  >
                    ← Prev
                  </button>
                  <span className="excel-page-indicator">
                    {stockPagination.page} / {stockPagination.pages || 1}
                  </span>
                  <button
                    disabled={stockPagination.page >= stockPagination.pages}
                    onClick={() => setStockPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="excel-page-nav-btn"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: Upload History Logs */}
      {activeTab === 'history' && (
        <div className="excel-history-card">
          <div className="excel-table-scroll-container">
            <table className="excel-data-table">
              <thead>
                <tr>
                  <th className="excel-col-freeze">Spreadsheet File</th>
                  <th>Upload Date &amp; Time</th>
                  <th>Uploaded By</th>
                  <th>Columns Count</th>
                  <th>Total Rows</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#587d74]">
                      Loading upload logs...
                    </td>
                  </tr>
                ) : history.length > 0 ? (
                  history.map((log) => (
                    <tr key={log._id}>
                      <td className="excel-col-freeze">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={15} className="text-[#13392e] flex-shrink-0" />
                          <strong
                            className="text-[#13392e] font-semibold text-xs truncate max-w-[150px]"
                            title={log.fileName}
                          >
                            {log.fileName}
                          </strong>
                          {latestImportInfo?._id === log._id && (
                            <span className="excel-history-active-badge">Active</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="excel-date-cell">
                          <Calendar size={13} />
                          <span>{formatDateIST(log.uploadDateTime)}</span>
                          <span className="excel-date-time">
                            {formatTimeIST(log.uploadDateTime, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-[#587d74]">{log.uploadedBy?.name || 'Administrator'}</span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-[#587d74]">
                          {log.detectedColumns?.length || 0} cols
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-[#13392e] text-xs">{log.totalRows}</span>
                      </td>
                      <td>
                        <span
                          className={`excel-stock-badge ${
                            log.status === 'Completed' ? 'in-stock' : 'out-stock'
                          }`}
                        >
                          <span className="excel-stock-dot" />
                          {log.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(log._id, log.fileName)}
                          disabled={deletingHistoryId === log._id}
                          className="p-1.5 hover:bg-red-50 rounded text-[#7a9c95] hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Delete upload history log"
                        >
                          {deletingHistoryId === log._id ? (
                            <RefreshCw size={14} className="animate-spin text-red-500" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#587d74]">
                      No Excel upload history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Compact Pagination for History */}
          <div className="excel-pagination-bar">
            <span className="excel-pagination-info">
              Showing {historyPagination.total > 0 ? (historyPagination.page - 1) * 10 + 1 : 0} -{' '}
              {Math.min(historyPagination.page * 10, historyPagination.total)} of {historyPagination.total} logs
            </span>
            <div className="excel-pagination-actions">
              <button
                disabled={historyPagination.page <= 1}
                onClick={() => setHistoryPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="excel-page-nav-btn"
              >
                ← Prev
              </button>
              <span className="excel-page-indicator">
                {historyPagination.page} / {historyPagination.pages || 1}
              </span>
              <button
                disabled={historyPagination.page >= historyPagination.pages}
                onClick={() => setHistoryPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="excel-page-nav-btn"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Luxury Confirmation Popup Modal */}
      <AdminConfirmModal
        isOpen={confirmModal.open}
        onClose={() => {
          if (!confirmModal.isLoading) {
            setConfirmModal((prev) => ({ ...prev, open: false }));
          }
        }}
        onConfirm={async () => {
          if (confirmModal.onConfirm) {
            setConfirmModal((prev) => ({ ...prev, isLoading: true }));
            try {
              await confirmModal.onConfirm();
              setConfirmModal((prev) => ({ ...prev, open: false, isLoading: false }));
            } catch (e) {
              setConfirmModal((prev) => ({ ...prev, isLoading: false }));
            }
          }
        }}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle || 'Permanent Removal'}
        description={confirmModal.description}
        itemName={confirmModal.itemName}
        details={confirmModal.details}
        warning={confirmModal.warning}
        confirmText={confirmModal.confirmText || 'Confirm Delete'}
        cancelText={confirmModal.cancelText || 'Cancel'}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
};

export default ExcelStockManagement;
