import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Calendar, CheckCircle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, FormRow } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';

const AcademicYears = () => {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setLoading(true);
    try {
      const response = await academicService.getAcademicYears();
      setYears(response.data || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (year = null) => {
    setEditingYear(year);
    if (year) {
      reset({
        name: year.name,
        startDate: year.startDate?.split('T')[0],
        endDate: year.endDate?.split('T')[0],
        isCurrent: year.isCurrent,
      });
    } else {
      reset({ name: '', startDate: '', endDate: '', isCurrent: false });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingYear(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingYear) {
        await academicService.updateAcademicYear(editingYear.id, data);
      } else {
        await academicService.createAcademicYear(data);
      }
      fetchYears();
      closeModal();
    } catch (error) {
      console.error('Error saving academic year:', error);
      alert(error.response?.data?.message || 'Error saving academic year');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return;
    try {
      await academicService.deleteAcademicYear(id);
      fetchYears();
    } catch (error) {
      console.error('Error deleting academic year:', error);
      alert(error.response?.data?.message || 'Error deleting');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Start Date', 
      render: (row) => new Date(row.startDate).toLocaleDateString() 
    },
    { 
      header: 'End Date', 
      render: (row) => new Date(row.endDate).toLocaleDateString() 
    },
    { 
      header: 'Status', 
      render: (row) => (
        <span className={`badge ${row.isCurrent ? 'badge-success' : 'badge-secondary'}`}>
          {row.isCurrent ? 'Current' : 'Inactive'}
        </span>
      )
    },
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
          <h1>Academic Years</h1>
          <p className="text-muted">Manage academic years for your school</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={years}
          loading={loading}
          emptyMessage="No academic years found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Academic Year
            </Button>
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Year Name"
            name="name"
            placeholder="e.g., 2024-2025"
            register={register}
            error={errors.name?.message}
            required
          />
          <FormRow>
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              register={register}
              error={errors.startDate?.message}
              required
            />
            <Input
              label="End Date"
              name="endDate"
              type="date"
              register={register}
              error={errors.endDate?.message}
              required
            />
          </FormRow>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" {...register('isCurrent')} />
              <span>Set as Current Academic Year</span>
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingYear ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicYears;
