import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { Button } from '../../components/common/FormElements';
import { assignmentService } from '../../api/assignmentService';

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await assignmentService.getAssignments();
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setFiles([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAssignment(null);
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert('Please select at least one file to submit.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('assignmentId', selectedAssignment.id);
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      await assignmentService.submitAssignment(formData);
      alert('Assignment submitted successfully!');
      fetchAssignments();
      closeModal();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(error.response?.data?.message || 'Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (assignment) => {
    const submission = assignment.submissions?.[0];
    const isPastDue = new Date(assignment.dueDate) < new Date();

    if (submission) {
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} /> Submitted
        </span>
      );
    }
    if (isPastDue) {
      return (
        <span className="badge badge-danger">
          <AlertCircle size={12} /> Overdue
        </span>
      );
    }
    return (
      <span className="badge badge-warning">
        <Clock size={12} /> Pending
      </span>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Assignments</h1>
          <p className="text-muted">View and submit your assignments</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-muted text-center">No assignments found.</div>
        ) : (
          <div className="assignments-grid">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <h4>{assignment.title}</h4>
                  {getStatusBadge(assignment)}
                </div>
                <p className="assignment-subject">
                  {assignment.classSubject?.subject?.name} | {assignment.classSubject?.class?.name}
                </p>
                <p className="assignment-description">
                  {assignment.description?.substring(0, 100)}
                  {assignment.description?.length > 100 ? '...' : ''}
                </p>
                <div className="assignment-meta">
                  <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  {assignment.maxMarks && <span>Max Marks: {assignment.maxMarks}</span>}
                </div>
                {assignment.files?.length > 0 && (
                  <div className="assignment-files">
                    {assignment.files.map((file, i) => (
                      <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="file-link">
                        <FileText size={14} /> {file.name || 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
                <div className="assignment-actions">
                  {!assignment.submissions?.[0] && (
                    <Button onClick={() => openSubmitModal(assignment)} icon={Upload}>
                      Submit
                    </Button>
                  )}
                  {assignment.submissions?.[0] && (
                    <div className="submission-info">
                      <span className="text-success">
                        Submitted on {new Date(assignment.submissions[0].submittedAt).toLocaleDateString()}
                      </span>
                      {assignment.submissions[0].marksObtained && (
                        <span className="grade">Score: {assignment.submissions[0].marksObtained}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Submit Assignment" size="md">
        {selectedAssignment && (
          <>
            <p><strong>{selectedAssignment.title}</strong></p>
            <p className="text-muted">{selectedAssignment.classSubject?.subject?.name}</p>
            
            <div className="form-group">
              <label>Upload Your Work</label>
              <div className="file-upload-area">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  accept=".pdf,.doc,.docx,.jpg,.png,.zip"
                />
                {files.length > 0 && (
                  <div className="selected-files">
                    {Array.from(files).map((f, i) => (
                      <span key={i} className="file-item">
                        <FileText size={14} /> {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSubmit} loading={submitting} icon={Upload}>
                Submit Assignment
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Assignments;
