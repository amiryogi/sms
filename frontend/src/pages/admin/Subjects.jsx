import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, BookOpen, Upload } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';
import SubjectImportModal from '../../components/admin/SubjectImportModal';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await academicService.getSubjects();
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (subject = null) => {
    setEditingSubject(subject);
    if (subject) {
      reset({
        name: subject.name,
        code: subject.code,
        description: subject.description,
        creditHours: subject.creditHours,
        hasPractical: subject.hasPractical
      });
    } else {
      reset({ name: '', code: '', description: '', creditHours: 3.0, hasPractical: false });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSubject(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingSubject) {
        await academicService.updateSubject(editingSubject.id, data);
      } else {
        await academicService.createSubject(data);
      }
      fetchSubjects();
      closeModal();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert(error.response?.data?.message || 'Error saving subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await academicService.deleteSubject(id);
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert(error.response?.data?.message || 'Error deleting');
    }
  };

  const columns = [
    {
      header: 'Subject',
      render: (row) => (
        <div className="subject-cell">
          <BookOpen size={16} />
          <span>{row.name}</span>
        </div>
      )
    },
    { header: 'Code', accessor: 'code' },
    { header: 'Credit Hours', accessor: 'creditHours', width: '120px' },
    {
      header: 'Practical',
      width: '100px',
      render: (row) => (
        <span className={`badge ${row.hasPractical ? 'badge-success' : 'badge-secondary'}`}>
          {row.hasPractical ? 'Yes' : 'No'}
        </span>
      )
    },
    { header: 'Description', render: (row) => row.description || '-' },
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Subjects</h1>
          <p className="text-muted">Manage the master list of subjects</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={subjects}
          loading={loading}
          emptyMessage="No subjects found"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" icon={Upload} onClick={() => setImportModalOpen(true)}>
                Import Excel
              </Button>
              <Button icon={Plus} onClick={() => openModal()}>
                Add Subject
              </Button>
            </div>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Subject Name"
            name="name"
            placeholder="e.g., Mathematics, English"
            register={register}
            error={errors.name?.message}
            required
          />
          <Input
            label="Subject Code"
            name="code"
            placeholder="e.g., MATH, ENG"
            register={register}
            error={errors.code?.message}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Credit Hours"
              name="creditHours"
              type="number"
              step="0.1"
              register={register}
              error={errors.creditHours?.message}
              required
            />
            <div className="form-group" style={{ marginTop: '30px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('hasPractical')}
                  style={{ marginRight: '8px' }}
                />
                Has Practical?
              </label>
            </div>
          </div>
          <Input
            label="Description (Optional)"
            name="description"
            placeholder="Brief description"
            register={register}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSubject ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <SubjectImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchSubjects}
      />
    </div>
  );
};

export default Subjects;
