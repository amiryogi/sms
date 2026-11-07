import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Library, Upload, FlaskConical } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, FormRow } from '../../components/common/FormElements';
import { PageHeader, Badge, IconButton, Checkbox, DialogActions, toast, confirmDialog } from '../../components/ui';
import { academicService } from '../../api/academicService';
import SubjectImportModal from '../../components/admin/SubjectImportModal';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');

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
      toast.error(error.response?.data?.message || 'Could not load subjects');
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(q));
  }, [subjects, search]);

  const openModal = (subject = null) => {
    setEditingSubject(subject);
    reset(
      subject
        ? {
            name: subject.name,
            code: subject.code,
            description: subject.description,
            creditHours: subject.creditHours,
            hasPractical: subject.hasPractical,
          }
        : { name: '', code: '', description: '', creditHours: 3.0, hasPractical: false },
    );
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
      toast.success(editingSubject ? 'Subject updated' : 'Subject created');
      fetchSubjects();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subject) => {
    const ok = await confirmDialog({
      title: `Delete ${subject.name}?`,
      message: 'Subjects already taught in a class cannot be deleted. Remove them from Class Subjects first.',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await academicService.deleteSubject(subject.id);
      toast.success(`${subject.name} deleted`);
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the subject');
    }
  };

  const columns = [
    {
      header: 'Subject',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Library size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{row.name}</p>
            {row.description && <p className="max-w-xs truncate text-xs text-slate-500">{row.description}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      render: (row) => <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{row.code}</code>,
    },
    { header: 'Credit hours', render: (row) => <span className="tabular-nums">{row.creditHours}</span> },
    {
      header: 'Practical',
      render: (row) =>
        row.hasPractical ? <Badge tone="info" icon={FlaskConical}>Theory + practical</Badge> : <Badge>Theory only</Badge>,
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
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Library}
        title="Subjects"
        description="The master list of subjects. Attach them to classes on the Class Subjects page."
        actions={
          <>
            <Button variant="secondary" icon={Upload} onClick={() => setImportModalOpen(true)}>Import from Excel</Button>
            <Button icon={Plus} onClick={() => openModal()}>Add subject</Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={visible}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or code…"
        emptyMessage={search ? 'No subjects match your search' : 'No subjects yet'}
        emptyDescription={search ? undefined : 'Add subjects one by one or import them from an Excel sheet.'}
        emptyIcon={Library}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingSubject ? 'Edit subject' : 'Add subject'} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input
              label="Subject name"
              name="name"
              placeholder="e.g. Mathematics"
              register={register}
              error={errors.name?.message}
              required
            />
            <Input
              label="Code"
              name="code"
              placeholder="e.g. MATH"
              register={register}
              error={errors.code?.message}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              label="Credit hours"
              name="creditHours"
              type="number"
              step="0.1"
              register={register}
              error={errors.creditHours?.message}
              required
            />
            <div className="mb-4 flex items-end pb-2">
              <Checkbox
                id="hasPractical"
                label="Has a practical part"
                description="Marks are entered for theory and practical separately."
                {...register('hasPractical')}
              />
            </div>
          </FormRow>
          <Input label="Description" name="description" placeholder="Optional" register={register} />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingSubject ? 'Save changes' : 'Create subject'}</Button>
          </DialogActions>
        </form>
      </Modal>

      <SubjectImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} onSuccess={fetchSubjects} />
    </div>
  );
};

export default Subjects;
