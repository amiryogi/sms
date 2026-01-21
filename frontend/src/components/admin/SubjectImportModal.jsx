import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { Button } from '../common/FormElements';
import apiClient from '../../api/apiClient';

const SubjectImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/subjects/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error previewing file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/subjects/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error importing subjects');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setImporting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Grade 11-12 Subjects"
      size="lg"
    >
      <div className="p-4">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <h4 className="font-medium text-blue-800 mb-2">Excel Format Required:</h4>
          <ul className="text-sm text-blue-700 list-disc list-inside">
            <li>Grade (11 or 12)</li>
            <li>Subject Name</li>
            <li>Subject Code</li>
            <li>Component (Theory / Practical / Both)</li>
            <li>Credit Hour</li>
            <li>Full Marks</li>
            <li>Pass Marks</li>
            <li>Practical Marks (optional)</li>
          </ul>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Select Excel File</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 border rounded cursor-pointer hover:bg-gray-200">
              <FileSpreadsheet size={18} />
              <span>{file ? file.name : 'Choose file...'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && !preview && !result && (
              <Button onClick={handlePreview} loading={loading}>
                Preview
              </Button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded p-3 mb-4 text-red-700 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Preview Table */}
        {preview && !result && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Preview ({preview.valid} valid, {preview.invalid} invalid)</h4>
            </div>
            <div className="max-h-60 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Grade</th>
                    <th className="p-2 text-left">Subject</th>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row) => (
                    <tr key={row.row} className={row.valid ? '' : 'bg-red-50'}>
                      <td className="p-2">{row.row}</td>
                      <td className="p-2">{row.grade}</td>
                      <td className="p-2">{row.subjectName}</td>
                      <td className="p-2">{row.subjectCode}</td>
                      <td className="p-2">
                        {row.valid ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle size={14} /> Valid
                          </span>
                        ) : (
                          <span className="text-red-600">{row.errors.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-300 rounded p-4 mb-4">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <CheckCircle size={20} />
              Import Complete
            </div>
            <p>Successfully imported {result.imported} of {result.total} subjects.</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                {result.errors.length} rows had errors and were skipped.
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={handleClose}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {preview && !result && (
            <Button onClick={handleImport} loading={importing} icon={Upload}>
              Import {preview.valid} Subjects
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SubjectImportModal;
