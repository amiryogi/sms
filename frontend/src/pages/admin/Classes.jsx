import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, FormRow } from '../../components/common/FormElements';
import { PageHeader, Badge, IconButton, DialogActions, toast, confirmDialog } from '../../components/ui';
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
      toast.error(error.response?.data?.message || 'Could not load classes');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (cls = null) => {
    setEditingClass(cls);
    reset(cls ? { name: cls.name, gradeLevel: cls.gradeLevel, description: cls.description } : { name: '', gradeLevel: '', description: '' });
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
      toast.success(editingClass ? 'Class updated' : 'Class created');
      fetchClasses();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cls) => {
    const ok = await confirmDialog({
      title: `Delete ${cls.name}?`,
      message: 'Classes that already have subjects, students or exams cannot be deleted.',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await academicService.deleteClass(cls.id);
      toast.success(`${cls.name} deleted`);
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the class');
    }
  };

  const columns = [
    {
      header: 'Class',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
            {row.gradeLevel ?? '–'}
          </span>
          <span className="font-medium text-slate-900">{row.name}</span>
        </div>
      ),
    },
    { header: 'Grade level', render: (row) => <Badge>Grade {row.gradeLevel}</Badge> },
    {
      header: 'Description',
      render: (row) => <span className="text-slate-500">{row.description || '—'}</span>,
    },
    {
      header: <span className="sr-only">Actions</span>,
      width: '96px',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label={`Edit ${row.name}`} onClick={() => openModal(row)} />
          <IconButton icon={Trash2} label={`Delete ${row.name}`} variant="danger-soft" onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={BookOpen}
        title="Classes"
        description="Grades taught at your school. Sections and subjects are attached to these."
        actions={<Button icon={Plus} onClick={() => openModal()}>Add class</Button>}
      />

      <DataTable
        columns={columns}
        data={classes}
        loading={loading}
        emptyMessage="No classes yet"
        emptyDescription="Add the grades your school teaches, from nursery to Grade 10."
        emptyIcon={BookOpen}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingClass ? 'Edit class' : 'Add class'} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input
              label="Class name"
              name="name"
              placeholder="e.g. Grade 1"
              register={register}
              error={errors.name?.message}
              required
            />
            <Input
              label="Grade number"
              name="gradeLevel"
              type="number"
              placeholder="1–12"
              register={register}
              error={errors.gradeLevel?.message}
              required
              min={1}
              max={12}
            />
          </FormRow>
          <Input label="Description" name="description" placeholder="Optional" register={register} />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingClass ? 'Save changes' : 'Create class'}</Button>
          </DialogActions>
        </form>
      </Modal>
    </div>
  );
};

export default Classes;
