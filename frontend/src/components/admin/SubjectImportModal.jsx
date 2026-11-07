import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { Button, Alert, DialogActions } from '../ui';
import { cn } from '../../lib/cn';
import apiClient from '../../api/apiClient';

const COLUMNS = [
  ['Grade', 'Grade level of an existing class, e.g. 9'],
  ['Subject Name', 'e.g. Science & Technology'],
  ['Subject Code', 'Unique, e.g. SCI'],
  ['Component', 'Theory, Practical or Both'],
  ['Credit Hour', 'e.g. 4'],
  ['Full Marks', 'e.g. 100'],
  ['Pass Marks', 'e.g. 35'],
  ['Practical Marks', 'Optional'],
];

/** Excel import: choose file -> preview (server validates each row) -> import. */
const SubjectImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pick = (selected) => {
    if (!selected) return;
    setFile(selected);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const send = async (path) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.data;
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      setPreview(await send('/subjects/import/preview'));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not read the file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      setResult(await send('/subjects/import'));
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not import the subjects');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setImporting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import subjects from Excel" size="lg">
      <div className="space-y-5">
        {!result && (
          <div>
            <p className="mb-2 text-sm text-slate-600">The first sheet needs these column headings:</p>
            <div className="grid gap-x-6 gap-y-1.5 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              {COLUMNS.map(([name, hint]) => (
                <div key={name} className="flex items-baseline gap-2">
                  <span className="font-medium text-slate-800">{name}</span>
                  <span className="truncate text-xs text-slate-500">{hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && (
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-colors',
              file ? 'border-brand-300 bg-brand-50/50' : 'border-slate-300 hover:border-brand-300 hover:bg-brand-50/30',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">{file ? file.name : 'Choose an Excel file'}</span>
              <span className="block text-xs text-slate-500">.xlsx or .xls</span>
            </span>
            <span className="text-sm font-semibold text-brand-700">{file ? 'Change' : 'Browse'}</span>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
          </label>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        {preview && !result && (
          <div>
            <div className="mb-2 flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-800">Preview</span>
              <span className="text-emerald-700">{preview.valid} ready</span>
              {preview.invalid > 0 && <span className="text-red-600">{preview.invalid} with problems</span>}
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    {['Row', 'Grade', 'Subject', 'Code', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.preview.map((row) => (
                    <tr key={row.row} className={row.valid ? '' : 'bg-red-50/60'}>
                      <td className="px-3 py-2 text-slate-500 tabular-nums">{row.row}</td>
                      <td className="px-3 py-2">{row.grade}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.subjectName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.subjectCode}</td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={14} aria-hidden="true" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-red-600">
                            <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {row.errors.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <Alert tone="success" title="Import complete">
            Imported {result.imported} of {result.total} subjects.
            {result.errors?.length > 0 && ` ${result.errors.length} rows had problems and were skipped.`}
          </Alert>
        )}
      </div>

      <DialogActions>
        <Button variant="secondary" onClick={handleClose}>{result ? 'Done' : 'Cancel'}</Button>
        {file && !preview && !result && (
          <Button onClick={handlePreview} loading={loading}>Check file</Button>
        )}
        {preview && !result && (
          <Button onClick={handleImport} loading={importing} icon={Upload} disabled={!preview.valid}>
            Import {preview.valid} subject{preview.valid === 1 ? '' : 's'}
          </Button>
        )}
      </DialogActions>
    </Modal>
  );
};

export default SubjectImportModal;
