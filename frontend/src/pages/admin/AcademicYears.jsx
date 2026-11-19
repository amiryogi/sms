import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, CalendarRange } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, DateInput, Button, FormRow } from '../../components/common/FormElements';
import { PageHeader, PageShell, Badge, IconButton, Checkbox, DialogActions, toast, confirmDialog } from '../../components/ui';
import { academicService } from '../../api/academicService';
import { formatDate, toDateInput } from '../../utils/format';

const AcademicYears = () => {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();

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
        startDate: toDateInput(year.startDate),
        endDate: toDateInput(year.endDate),
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
      toast.success(editingYear ? 'Academic year updated' : 'Academic year created');
      fetchYears();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the academic year');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (year) => {
    const ok = await confirmDialog({
      title: `Delete ${year.name}?`,
      message: 'This cannot be undone. Years that already have classes, exams or enrolments cannot be deleted.',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await academicService.deleteAcademicYear(year.id);
      toast.success(`${year.name} deleted`);
      fetchYears();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the academic year');
    }
  };

  const columns = [
    {
      header: 'Academic year',
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    { header: 'Starts', render: (row) => formatDate(row.startDate) },
    { header: 'Ends', render: (row) => formatDate(row.endDate) },
    {
      header: 'Status',
      render: (row) =>
        row.isCurrent ? <Badge tone="success" dot>Current</Badge> : <Badge>Past / upcoming</Badge>,
    },
    {
      header: <span className="sr-only">Actions</span>,
      action: true,
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
    <PageShell>
      <PageHeader
        title="Academic years"
        description="The current year scopes classes, enrolments, exams and fees across the system."
        actions={
          <Button icon={Plus} onClick={() => openModal()} data-guide="academicYears.add">
            Add academic year
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={years}
        loading={loading}
        emptyMessage="No academic years yet"
        emptyDescription="Add the current year to start setting up classes and enrolments."
        emptyIcon={CalendarRange}
      />

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingYear ? 'Edit academic year' : 'Add academic year'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Year name"
            name="name"
            placeholder="e.g., 2024-2025"
            register={register}
            error={errors.name?.message}
            required
          />
          <FormRow>
            <DateInput label="Start date" name="startDate" control={control} error={errors.startDate?.message} required />
            <DateInput label="End date" name="endDate" control={control} error={errors.endDate?.message} required />
          </FormRow>
          <Checkbox
            id="isCurrent"
            label="Make this the current academic year"
            description="Only one year is current. New enrolments, exams and fees use it by default."
            {...register('isCurrent')}
          />
          <DialogActions>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingYear ? 'Save changes' : 'Create year'}
            </Button>
          </DialogActions>
        </form>
      </Modal>
    </PageShell>
  );
};

export default AcademicYears;
