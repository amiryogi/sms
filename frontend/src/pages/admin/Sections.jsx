import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Layers, Users } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, FormRow } from '../../components/common/FormElements';
import { PageHeader, IconButton, DialogActions, toast, confirmDialog } from '../../components/ui';
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
      toast.error(error.response?.data?.message || 'Could not load sections');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (section = null) => {
    setEditingSection(section);
    reset(section ? { name: section.name, capacity: section.capacity } : { name: '', capacity: 40 });
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
      toast.success(editingSection ? 'Section updated' : 'Section created');
      fetchData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (section) => {
    const ok = await confirmDialog({
      title: `Delete section ${section.name}?`,
      message: 'Sections that students are enrolled in cannot be deleted.',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await academicService.deleteSection(section.id);
      toast.success(`Section ${section.name} deleted`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the section');
    }
  };

  const columns = [
    {
      header: 'Section',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
            {String(row.name || '').slice(0, 2)}
          </span>
          <span className="font-medium text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Capacity',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <Users size={14} className="text-slate-400" aria-hidden="true" />
          {row.capacity || 40} students
        </span>
      ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: '96px',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label={`Edit section ${row.name}`} onClick={() => openModal(row)} />
          <IconButton icon={Trash2} label={`Delete section ${row.name}`} variant="danger-soft" onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={Layers}
        title="Sections"
        description="Reusable section labels (A, B, Rose, Lotus…) that you attach to classes when enrolling students."
        actions={<Button icon={Plus} onClick={() => openModal()}>Add section</Button>}
      />

      <DataTable
        columns={columns}
        data={sections}
        loading={loading}
        emptyMessage="No sections yet"
        emptyDescription="Create labels such as A and B; every class can use them."
        emptyIcon={Layers}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingSection ? 'Edit section' : 'Add section'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input
              label="Section name"
              name="name"
              placeholder="e.g. A"
              register={register}
              error={errors.name?.message}
              required
            />
            <Input
              label="Capacity"
              name="capacity"
              type="number"
              placeholder="40"
              register={register}
              error={errors.capacity?.message}
              min={1}
            />
          </FormRow>
          <p className="-mt-1 text-xs text-slate-500">Assign sections to classes when you enrol students.</p>
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingSection ? 'Save changes' : 'Create section'}</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default Sections;
