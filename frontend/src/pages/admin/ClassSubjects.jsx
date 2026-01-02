import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Select, Button, Input } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';

const ClassSubjects = () => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ academicYearId: '', classId: '' });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.academicYearId || filters.classId) {
      fetchClassSubjects();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, subjectsRes, yearsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getSubjects(),
        academicService.getAcademicYears(),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAcademicYears(yearsRes.data || []);

      // Set default filter to current year
      const currentYear = yearsRes.data?.find(y => y.isCurrent);
      if (currentYear) {
        setFilters(prev => ({ ...prev, academicYearId: currentYear.id.toString() }));
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.academicYearId) params.academicYearId = filters.academicYearId;
      if (filters.classId) params.classId = filters.classId;
      const response = await academicService.getClassSubjects(params);
      setClassSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    reset({
      academicYearId: filters.academicYearId,
      classId: filters.classId,
      subjectId: ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await academicService.assignSubjectToClass({
        academicYearId: parseInt(data.academicYearId),
        classId: parseInt(data.classId),
        subjectId: parseInt(data.subjectId),
        theoryMarks: parseInt(data.theoryMarks || 100),
        practicalMarks: parseInt(data.practicalMarks || 0),
        creditHours: parseFloat(data.creditHours || 3.0),
      });
      fetchClassSubjects();
      closeModal();
    } catch (error) {
      console.error('Error assigning subject:', error);
      alert(error.response?.data?.message || 'Error assigning subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this subject from the class?')) return;
    try {
      await academicService.removeSubjectFromClass(id);
      fetchClassSubjects();
    } catch (error) {
      console.error('Error removing subject:', error);
      alert(error.response?.data?.message || 'Error removing');
    }
  };

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || 'Unknown';
  const getSubjectName = (subjectId) => subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  const getYearName = (yearId) => academicYears.find(y => y.id === yearId)?.name || 'Unknown';

  const columns = [
    { header: 'Academic Year', render: (row) => getYearName(row.academicYearId) },
    { header: 'Class', render: (row) => getClassName(row.classId) },
    { header: 'Subject', render: (row) => getSubjectName(row.subjectId) },
    { header: 'Theory', accessor: 'theoryMarks' },
    { header: 'Practical', accessor: 'practicalMarks' },
    { header: 'Credit Hours', accessor: 'creditHours' },
    {
      header: 'Actions',
      width: '80px',
      render: (row) => (
        <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)}>
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  const yearOptions = academicYears.map(y => ({ value: y.id.toString(), label: y.name }));
  const classOptions = classes.map(c => ({ value: c.id.toString(), label: c.name }));
  const subjectOptions = subjects.map(s => ({ value: s.id.toString(), label: s.name }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Class Subjects</h1>
          <p className="text-muted">Assign subjects to classes for each academic year</p>
        </div>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            value={filters.academicYearId}
            onChange={(e) => setFilters(prev => ({ ...prev, academicYearId: e.target.value }))}
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            placeholder="All Classes"
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={classSubjects}
          loading={loading}
          emptyMessage="No subjects assigned. Select filters and add subjects."
          actions={
            <Button icon={Plus} onClick={openModal}>
              Assign Subject
            </Button>
          }
        />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Assign Subject to Class" size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            register={register}
            error={errors.academicYearId?.message}
            required
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            register={register}
            error={errors.classId?.message}
            required
          />
          <Select
            label="Subject"
            name="subjectId"
            options={subjectOptions}
            register={register}
            error={errors.subjectId?.message}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Theory Marks"
              name="theoryMarks"
              type="number"
              defaultValue={100}
              register={register}
            />
            <Input
              label="Practical Marks"
              name="practicalMarks"
              type="number"
              defaultValue={0}
              register={register}
            />
          </div>
          <Input
            label="Credit Hours"
            name="creditHours"
            type="number"
            step="0.1"
            defaultValue={3.0}
            register={register}
          />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={LinkIcon}>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassSubjects;
