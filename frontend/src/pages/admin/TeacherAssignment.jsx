import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, UserCheck, Edit2 } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Select, Button } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';
import { teacherService } from '../../api/teacherService';

const TeacherAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [filters, setFilters] = useState({ academicYearId: '' });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const watchedClassId = watch('classId');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.academicYearId) {
      fetchAssignments();
      fetchClassSubjectsForYear();
    }
  }, [filters.academicYearId]);

  useEffect(() => {
    if (watchedClassId) {
      fetchSectionsForClass(watchedClassId);
    }
  }, [watchedClassId]);

  const fetchInitialData = async () => {
    try {
      const [teachersRes, classesRes, yearsRes] = await Promise.all([
        teacherService.getTeachers(),
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setTeachers(teachersRes.data?.teachers || teachersRes.data || []);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);

      const currentYear = yearsRes.data?.find(y => y.isCurrent);
      if (currentYear) {
        setFilters({ academicYearId: currentYear.id.toString() });
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await teacherService.getTeacherAssignments({
        academicYearId: filters.academicYearId
      });
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjectsForYear = async () => {
    try {
      const response = await academicService.getClassSubjects({
        academicYearId: filters.academicYearId
      });
      setClassSubjects(response.data || []);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    try {
      const response = await academicService.getSections(classId);
      setSections(response.data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const openModal = (assignment = null) => {
    setEditingAssignment(assignment);
    if (assignment) {
      reset({
        userId: assignment.userId.toString(),
        classId: assignment.classSubject?.class?.id.toString(), // Derived from relation
        sectionId: assignment.sectionId.toString(),
        classSubjectId: assignment.classSubjectId.toString(),
        isClassTeacher: assignment.isClassTeacher,
      });
    } else {
      reset({ userId: '', classId: '', sectionId: '', classSubjectId: '', isClassTeacher: false });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAssignment(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        userId: parseInt(data.userId),
        classSubjectId: parseInt(data.classSubjectId),
        sectionId: parseInt(data.sectionId),
        isClassTeacher: data.isClassTeacher === true || data.isClassTeacher === 'true',
      };

      if (editingAssignment) {
        await teacherService.updateAssignment(editingAssignment.id, payload);
      } else {
        await teacherService.assignTeacher(payload);
      }

      fetchAssignments();
      closeModal();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert(error.response?.data?.message || 'Error saving assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await teacherService.removeAssignment(id);
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert(error.response?.data?.message || 'Error removing');
    }
  };

  const columns = [
    {
      header: 'Teacher',
      render: (row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`
    },
    { header: 'Class', render: (row) => row.classSubject?.class?.name || 'N/A' },
    { header: 'Section', render: (row) => row.section?.name || 'N/A' },
    { header: 'Subject', render: (row) => row.classSubject?.subject?.name || 'N/A' },
    {
      header: 'Class Teacher',
      render: (row) => (
        <span className={`badge ${row.isClassTeacher ? 'badge-success' : 'badge-secondary'}`}>
          {row.isClassTeacher ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '100px', // Increased width
      render: (row) => (
        <div className="action-buttons">
          <button className="btn-icon" onClick={() => openModal(row)} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="Remove">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const yearOptions = academicYears.map(y => ({ value: y.id.toString(), label: y.name }));
  const teacherOptions = teachers.map(t => ({
    value: t.userId?.toString() || t.id?.toString(),
    label: `${t.user?.firstName || t.firstName} ${t.user?.lastName || t.lastName}`
  }));
  const classOptions = classes.map(c => ({ value: c.id.toString(), label: c.name }));
  const sectionOptions = sections.map(s => ({ value: s.id.toString(), label: s.name }));

  const filteredClassSubjects = classSubjects.filter(cs =>
    !watchedClassId || cs.classId?.toString() === watchedClassId
  );
  const classSubjectOptions = filteredClassSubjects.map(cs => ({
    value: cs.id.toString(),
    label: `${cs.subject?.name || 'Subject'} (${cs.class?.name || 'Class'})`,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Teacher Assignment</h1>
          <p className="text-muted">Assign teachers to class sections and subjects</p>
        </div>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            value={filters.academicYearId}
            onChange={(e) => setFilters({ academicYearId: e.target.value })}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          emptyMessage="No teacher assignments found."
          actions={
            <Button icon={Plus} onClick={openModal}>
              Assign Teacher
            </Button>
          }
        />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingAssignment ? "Edit Assignment" : "Assign Teacher"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Teacher"
            name="userId"
            options={teacherOptions}
            register={register}
            required
          />
          <div className="form-row">
            <Select
              label="Class"
              name="classId"
              options={classOptions}
              register={register}
              required
            />
            <Select
              label="Section"
              name="sectionId"
              options={sectionOptions}
              register={register}
              required
            />
          </div>
          <Select
            label="Subject"
            name="classSubjectId"
            options={classSubjectOptions}
            register={register}
            required
            placeholder="Select class first..."
          />
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" {...register('isClassTeacher')} />
              <span>Assign as Class Teacher</span>
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={UserCheck}>
              {editingAssignment ? "Update" : "Assign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherAssignment;
