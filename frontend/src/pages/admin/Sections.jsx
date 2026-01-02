import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';

const Sections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await academicService.getSections();
      setSections(response.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (section = null) => {
    setEditingSection(section);
    if (section) {
      reset({ name: section.name, capacity: section.capacity });
    } else {
      reset({ name: '', capacity: 40 });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSection(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data, capacity: parseInt(data.capacity) || 40 };
      if (editingSection) {
        await academicService.updateSection(editingSection.id, payload);
      } else {
        await academicService.createSection(payload);
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error('Error saving section:', error);
      alert(error.response?.data?.message || 'Error saving section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await academicService.deleteSection(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
      alert(error.response?.data?.message || 'Error deleting');
    }
  };

  const columns = [
    { header: 'Section Name', accessor: 'name' },
    { header: 'Capacity', accessor: 'capacity', render: (row) => row.capacity || 40 },
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
          <h1>Sections</h1>
          <p className="text-muted">Manage global section labels (e.g. A, B, C)</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={sections}
          loading={loading}
          emptyMessage="No sections found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Section
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingSection ? 'Edit Section' : 'Add Section'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Section Name"
            name="name"
            placeholder="e.g., A, B, Rose, Lotus"
            register={register}
            error={errors.name?.message}
            required
            helperText="Create reusable section labels here. You will assign them to classes later."
          />
          <Input
            label="Capacity"
            name="capacity"
            type="number"
            placeholder="Default 40"
            register={register}
            error={errors.capacity?.message}
            min={1}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSection ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Sections;
