import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Select, Button } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';

const Sections = () => {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
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
      const [sectionsRes, classesRes] = await Promise.all([
        academicService.getSections(),
        academicService.getClasses(),
      ]);
      setSections(sectionsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (section = null) => {
    setEditingSection(section);
    if (section) {
      reset({ name: section.name, classId: section.classId?.toString() });
    } else {
      reset({ name: '', classId: '' });
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
      const payload = { ...data, classId: parseInt(data.classId) };
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

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'Unknown';
  };

  const columns = [
    { header: 'Section Name', accessor: 'name' },
    { header: 'Class', render: (row) => getClassName(row.classId) },
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

  const classOptions = classes.map(c => ({ value: c.id.toString(), label: c.name }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Sections</h1>
          <p className="text-muted">Manage sections for each class</p>
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
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            register={register}
            error={errors.classId?.message}
            required
          />
          <Input
            label="Section Name"
            name="name"
            placeholder="e.g., A, B, C"
            register={register}
            error={errors.name?.message}
            required
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
