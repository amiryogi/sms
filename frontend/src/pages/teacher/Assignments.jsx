import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Upload, FileText, Eye, CheckCircle, XCircle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Select, Textarea, Button, FormRow } from '../../components/common/FormElements';
import { assignmentService } from '../../api/assignmentService';
import { teacherService } from '../../api/teacherService';

const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [grading, setGrading] = useState(null); // { id: submissionId, marks: '', feedback: '' }

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Grading form
  const gradingForm = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, teacherRes] = await Promise.all([
        assignmentService.getAssignments(),
        teacherService.getTeacherAssignments({ userId: user?.id }),
      ]);
      setAssignments(assignmentsRes.data || []);
      setTeacherAssignments(teacherRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (assignment = null) => {
    setEditingAssignment(assignment);
    setFiles([]);
    if (assignment) {
      reset({
        title: assignment.title,
        description: assignment.description,
        classSubjectId: assignment.teacherSubject?.classSubjectId?.toString(),
        sectionId: assignment.teacherSubject?.sectionId?.toString(),
        dueDate: assignment.dueDate?.split('T')[0],
        maxMarks: assignment.totalMarks,
      });
    } else {
      reset({});
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAssignment(null);
    setFiles([]);
    reset();
  };

  const openSubmissionModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setSubmitting(true);
    try {
      const res = await assignmentService.getSubmissionsByAssignment(assignment.id);
      setSubmissions(res.data || []);
      setSubmissionModalOpen(true);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      alert('Failed to load submissions');
    } finally {
      setSubmitting(false);
    }
  };

  const closeSubmissionModal = () => {
    setSubmissionModalOpen(false);
    setSelectedAssignment(null);
    setSubmissions([]);
    setGrading(null);
  };

  const onGradeSubmit = async (data, submissionId) => {
    try {
      await assignmentService.gradeSubmission(submissionId, {
        marksObtained: data.marksObtained,
        feedback: data.feedback
      });
      // Refresh submissions
      const res = await assignmentService.getSubmissionsByAssignment(selectedAssignment.id);
      setSubmissions(res.data || []);
      setGrading(null);
      gradingForm.reset();
    } catch (error) {
      console.error('Error grading:', error);
      alert('Failed to save grade');
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      // Find the teacherSubjectId (primary key) based on selection
      const selectedAssignment = teacherAssignments.find(ta =>
        ta.classSubjectId?.toString() === data.classSubjectId &&
        ta.sectionId?.toString() === data.sectionId
      );

      if (!selectedAssignment) {
        alert('Invalid Class/Section selection. You are not assigned to this class.');
        setSubmitting(false);
        return;
      }

      formData.append('teacherSubjectId', selectedAssignment.id);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      // formData.append('classSubjectId', data.classSubjectId); // Backend needs teacherSubjectId, these are implicitly linked
      // formData.append('sectionId', data.sectionId);
      formData.append('dueDate', data.dueDate);
      if (data.maxMarks) formData.append('totalMarks', data.maxMarks); // Mapper: maxMarks -> totalMarks (backend expects totalMarks)
      formData.append('isPublished', 'true'); // Default to published as there is no UI for draft mode

      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      if (editingAssignment) {
        await assignmentService.updateAssignment(editingAssignment.id, data);
      } else {
        await assignmentService.createAssignment(formData);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert(error.response?.data?.message || 'Error saving assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentService.deleteAssignment(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert(error.response?.data?.message || 'Error deleting');
    }
  };

  const columns = [
    { header: 'Title', accessor: 'title' },
    {
      header: 'Class/Subject',
      render: (row) => `${row.teacherSubject?.classSubject?.class?.name || ''} - ${row.teacherSubject?.classSubject?.subject?.name || ''}`
    },
    { header: 'Section', render: (row) => row.teacherSubject?.section?.name || '-' },
    {
      header: 'Due Date',
      render: (row) => new Date(row.dueDate).toLocaleDateString()
    },
    { header: 'Max Marks', render: (row) => row.totalMarks || '-' },
    {
      header: 'Actions',
      width: '180px',
      render: (row) => (
        <div className="action-buttons">
          <button className="btn-icon btn-info" onClick={() => openSubmissionModal(row)} title="View Submissions">
            <Eye size={16} />
          </button>
          <button className="btn-icon" onClick={() => openModal(row)} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Get unique class-subject-section combinations
  const classSubjectOptions = teacherAssignments.map(ta => ({
    value: ta.classSubjectId?.toString(),
    sectionId: ta.sectionId?.toString(),
    label: `${ta.classSubject?.class?.name} - ${ta.classSubject?.subject?.name} (${ta.section?.name})`,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Assignments</h1>
          <p className="text-muted">Create and manage assignments for your classes</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          emptyMessage="No assignments found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Create Assignment
            </Button>
          }
        />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingAssignment ? 'Edit Assignment' : 'Create Assignment'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Title"
            name="title"
            placeholder="Assignment title"
            register={register}
            required
          />
          <Textarea
            label="Description"
            name="description"
            placeholder="Assignment description and instructions"
            register={register}
          />
          <FormRow>
            <Select
              label="Class & Subject"
              name="classSubjectId"
              options={classSubjectOptions}
              register={register}
              required
            />
            <Select
              label="Section"
              name="sectionId"
              options={[...new Set(teacherAssignments.map(ta => ta.sectionId))].map(id => {
                const ta = teacherAssignments.find(t => t.sectionId === id);
                return { value: id?.toString(), label: ta?.section?.name || 'Section' };
              })}
              register={register}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              label="Due Date"
              name="dueDate"
              type="date"
              register={register}
              required
            />
            <Input
              label="Max Marks"
              name="maxMarks"
              type="number"
              register={register}
            />
          </FormRow>
          <div className="form-group">
            <label>Attachments</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="file-input"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"
              />
              {files.length > 0 && (
                <div className="file-list">
                  {Array.from(files).map((f, i) => (
                    <span key={i} className="file-item">
                      <FileText size={14} /> {f.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Show existing files if editing */}
              {editingAssignment && editingAssignment.assignmentFiles?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-muted mb-1">Current Files:</p>
                  <div className="file-list">
                    {editingAssignment.assignmentFiles.map((f, i) => (
                      <a key={i} href={f.fileUrl} target="_blank" className="file-item text-primary" onClick={e => e.stopPropagation()}>
                        <FileText size={14} /> {f.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={editingAssignment ? null : Upload}>
              {editingAssignment ? 'Update' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Submissions Modal */}
      <Modal isOpen={submissionModalOpen} onClose={closeSubmissionModal} title={`Submissions - ${selectedAssignment?.title}`} size="xl">
        <div className="submissions-list">
          {!submissions.length ? (
            <p className="text-muted text-center py-5">No submissions yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Submitted At</th>
                    <th>Status</th>
                    <th>Files</th>
                    <th>Grade</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => (
                    <tr key={sub.id}>
                      <td>
                        <div className="user-cell">
                          {sub.student.user.avatarUrl ? (
                            <img src={sub.student.user.avatarUrl} alt="" className="user-avatar-sm" />
                          ) : (
                            <div className="user-avatar-placeholder-sm">{sub.student.user.firstName[0]}</div>
                          )}
                          <span>{sub.student.user.firstName} {sub.student.user.lastName}</span>
                        </div>
                      </td>
                      <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${sub.status === 'late' ? 'danger' : sub.status === 'graded' ? 'success' : 'info'}`}>
                          {sub.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {sub.submissionFiles?.map((f, i) => {
                          // Clean up URL and Prepend Base URL if relative
                          const baseUrl = import.meta.env.VITE_API_URL
                            ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
                            : 'http://localhost:5000';

                          const fileUrl = f.fileUrl.startsWith('http')
                            ? f.fileUrl
                            : `${baseUrl}/${f.fileUrl.replace(/\\/g, '/')}`;

                          return (
                            <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer" className="d-block text-sm">
                              <FileText size={12} className="inline-icon" /> {f.fileName}
                            </a>
                          );
                        })}
                      </td>
                      <td>
                        {grading === sub.id ? (
                          <div className="d-flex gap-2">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="Marks"
                              style={{ width: '80px' }}
                              {...gradingForm.register('marksObtained', { required: true })}
                            />
                          </div>
                        ) : (
                          sub.marksObtained !== null ? `${sub.marksObtained} / ${selectedAssignment?.totalMarks}` : '-'
                        )}
                      </td>
                      <td>
                        {grading === sub.id ? (
                          <div className="d-flex gap-2">
                            <Button size="sm" onClick={gradingForm.handleSubmit(data => onGradeSubmit(data, sub.id))}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setGrading(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => {
                            setGrading(sub.id);
                            gradingForm.setValue('marksObtained', sub.marksObtained);
                            gradingForm.setValue('feedback', sub.feedback);
                          }}>
                            {sub.marksObtained ? 'Edit Grade' : 'Grade'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Assignments;
