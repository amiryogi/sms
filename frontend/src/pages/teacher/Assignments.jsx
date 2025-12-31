import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Upload, FileText } from 'lucide-react';
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
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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
        classSubjectId: assignment.classSubjectId?.toString(),
        sectionId: assignment.sectionId?.toString(),
        dueDate: assignment.dueDate?.split('T')[0],
        maxMarks: assignment.maxMarks,
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

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('classSubjectId', data.classSubjectId);
      formData.append('sectionId', data.sectionId);
      formData.append('dueDate', data.dueDate);
      if (data.maxMarks) formData.append('maxMarks', data.maxMarks);
      
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
      render: (row) => `${row.classSubject?.class?.name || ''} - ${row.classSubject?.subject?.name || ''}` 
    },
    { header: 'Section', render: (row) => row.section?.name || '-' },
    { 
      header: 'Due Date', 
      render: (row) => new Date(row.dueDate).toLocaleDateString() 
    },
    { header: 'Max Marks', render: (row) => row.maxMarks || '-' },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <div className="action-buttons">
          <button className="btn-icon" onClick={() => openModal(row)}>
            <Edit2 size={16} />
          </button>
          <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)}>
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
          {!editingAssignment && (
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
              </div>
            </div>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={editingAssignment ? null : Upload}>
              {editingAssignment ? 'Update' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Assignments;
