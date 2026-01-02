import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await academicService.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (cls = null) => {
    setEditingClass(cls);
    if (cls) {
      reset({ name: cls.name, gradeLevel: cls.gradeLevel, description: cls.description });
    } else {
      reset({ name: '', gradeLevel: '', description: '' });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingClass(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data, gradeLevel: parseInt(data.gradeLevel) };
      if (editingClass) {
        await academicService.updateClass(editingClass.id, payload);
      } else {
        await academicService.createClass(payload);
      }
      fetchClasses();
      closeModal();
    } catch (error) {
      console.error('Error saving class:', error);
      alert(error.response?.data?.message || 'Error saving class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await academicService.deleteClass(id);
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      alert(error.response?.data?.message || 'Error deleting');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Grade', accessor: 'gradeLevel' },
    { header: 'Description', accessor: 'description', render: (row) => row.description || '-' },
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
          <h1>Classes</h1>
          <p className="text-muted">Manage classes/grades for your school</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={classes}
          loading={loading}
          emptyMessage="No classes found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Class
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingClass ? 'Edit Class' : 'Add Class'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Class Name"
            name="name"
            placeholder="e.g., Grade 1, Class 10"
            register={register}
            error={errors.name?.message}
            required
          />
          <Input
            label="Grade Number"
            name="gradeLevel"
            type="number"
            placeholder="1-12"
            register={register}
            error={errors.gradeLevel?.message}
            required
            min={1}
            max={12}
          />
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
              {editingClass ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Classes;
