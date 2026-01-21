import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, BookOpen, Layers } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, Select } from '../../components/common/FormElements';
import { academicService } from '../../api/academicService';
import { programService } from '../../api/programService';

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  
  const [editingProgram, setEditingProgram] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [filters, setFilters] = useState({ academicYearId: '' });

  // For Subject Assignment Modal
  const [classes, setClasses] = useState([]); // All classes to lookup names
  const [availableClassSubjects, setAvailableClassSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.academicYearId) {
      fetchPrograms();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [yearsRes, classesRes] = await Promise.all([
        academicService.getAcademicYears(),
        academicService.getClasses() // Needed for subject modal class names
      ]);
      setAcademicYears(yearsRes.data || []);
      setClasses(classesRes.data || []);

      const currentYear = yearsRes.data?.find(y => y.isCurrent);
      if (currentYear) {
        setFilters(prev => ({ ...prev, academicYearId: currentYear.id.toString() }));
      } else if (yearsRes.data?.length > 0) {
        setFilters(prev => ({ ...prev, academicYearId: yearsRes.data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const response = await programService.getPrograms({
        academicYearId: filters.academicYearId
      });
      setPrograms(response.data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setStatus({ type: 'error', message: 'Error fetching programs' });
    } finally {
      setLoading(false);
    }
  };

  // --- Program CRUD ---

  const openModal = (program = null) => {
    setEditingProgram(program);
    if (program) {
      reset({
        name: program.name,
        description: program.description,
        isActive: program.isActive
      });
    } else {
      reset({ name: '', description: '', isActive: true });
    }
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setStatus(null);
    try {
      const payload = {
        ...data,
        academicYearId: parseInt(filters.academicYearId)
      };

      if (editingProgram) {
        await programService.updateProgram(editingProgram.id, payload);
        setStatus({ type: 'success', message: 'Program updated successfully' });
      } else {
        await programService.createProgram(payload);
        setStatus({ type: 'success', message: 'Program created successfully' });
      }
      fetchPrograms();
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving program:', error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error saving program' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      await programService.deleteProgram(id);
      fetchPrograms();
      setStatus({ type: 'success', message: 'Program deleted successfully' });
    } catch (error) {
      console.error('Error deleting program:', error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error deleting program' 
      });
    }
  };

  // --- Subject Assignment ---

  const openSubjectModal = async (program) => {
    setEditingProgram(program);
    setSubjectModalOpen(true);
    setLoadingSubjects(true);
    setStatus(null);
    try {
      // 1. Fetch full program details to get currently assigned subjects
      const programDetails = await programService.getProgram(program.id);
      const currentSubjectIds = new Set(
        programDetails.data.programSubjects.map(ps => ps.classSubjectId)
      );
      setSelectedSubjectIds(currentSubjectIds);

      // 2. Fetch all class subjects for this academic year
      const subjectsRes = await academicService.getClassSubjects({
        academicYearId: filters.academicYearId
      });
      
      // 3. Filter for Grade 11/12 only
      const validSubjects = subjectsRes.data.filter(cs => {
        // Need to find class grade level. 
        // getClassSubjects returns object with classId but maybe not full class object
        // Actually the backend response includes 'class' relation usually.
        // If not, we map using the `classes` state.
        const cls = classes.find(c => c.id === cs.classId);
        return cls && cls.gradeLevel >= 11;
      });

      setAvailableClassSubjects(validSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setStatus({ type: 'error', message: 'Error loading subjects' });
      setSubjectModalOpen(false);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const toggleSubject = (id) => {
    const newSelected = new Set(selectedSubjectIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubjectIds(newSelected);
  };

  const saveSubjects = async () => {
    if (!editingProgram) return;
    setSubmitting(true);
    try {
      await programService.assignSubjects(
        editingProgram.id, 
        Array.from(selectedSubjectIds)
      );
      setStatus({ type: 'success', message: 'Subjects assigned successfully' });
      setSubjectModalOpen(false);
      fetchPrograms(); // Refresh counts
    } catch (error) {
      console.error('Error assigning subjects:', error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error assigning subjects' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Helpers ---
  
  const yearOptions = academicYears.map(y => ({ value: y.id.toString(), label: y.name }));

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || 'Unknown';
  const getSubjectName = (subject) => subject?.subject?.name || 'Unknown Subject'; // depends on API shape

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { 
      header: 'Subjects', 
      render: (row) => (
        <span className="badge badge-info">{row._count?.programSubjects || 0}</span>
      )
    },
    { 
      header: 'Students', 
      render: (row) => (
        <span className="badge badge-secondary">{row._count?.studentPrograms || 0}</span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${row.isActive ? 'badge-success' : 'badge-danger'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '150px',
      render: (row) => (
        <div className="flex gap-2">
           <button 
            className="btn-icon" 
            onClick={() => openSubjectModal(row)}
            title="Manage Subjects"
          >
            <BookOpen size={16} />
          </button>
          <button 
            className="btn-icon" 
            onClick={() => openModal(row)}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="btn-icon btn-danger" 
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // Group class subjects by Class Name for the modal
  const groupedSubjects = availableClassSubjects.reduce((acc, item) => {
    const className = getClassName(item.classId);
    if (!acc[className]) acc[className] = [];
    acc[className].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Programs / Faculties</h1>
          <p className="text-muted">Manage NEB Grade 11/12 programs (Science, Management, etc.)</p>
        </div>
      </div>

      {status && (
        <div className={`alert ${status.type === 'error' ? 'alert-danger' : 'alert-success'}`} role="alert">
          {status.message}
        </div>
      )}

      <div className="card filter-card">
        <div className="filter-row">
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            value={filters.academicYearId}
            onChange={(e) => setFilters(prev => ({ ...prev, academicYearId: e.target.value }))}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={programs}
          loading={loading}
          emptyMessage="No programs found. Create one to get started."
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Create Program
            </Button>
          }
        />
      </div>

      {/* Create/Edit Program Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProgram ? 'Edit Program' : 'Create Program'}
        size="md"
      >
         <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Program Name"
            name="name"
            placeholder="e.g., Science, Management"
            register={register}
            error={errors.name?.message}
            required
          />
          <Input
            label="Description"
            name="description"
            register={register}
            error={errors.description?.message}
          />
          <div className="form-group" style={{ marginTop: '20px' }}>
             <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  defaultChecked={true}
                  style={{ marginRight: '8px' }}
                />
                Is Active
              </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingProgram ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Subjects Modal */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={`Manage Subjects: ${editingProgram?.name || ''}`}
        size="lg"
      >
        <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loadingSubjects ? (
            <p>Loading subjects...</p>
          ) : Object.keys(groupedSubjects).length === 0 ? (
            <p className="text-muted">No Grade 11/12 subjects found for this academic year.</p>
          ) : (
            Object.keys(groupedSubjects).sort().map(className => (
              <div key={className} className="mb-6">
                <h4 className="text-md font-semibold mb-3 border-b pb-1">{className}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupedSubjects[className].map(subject => (
                    <div 
                      key={subject.id} 
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedSubjectIds.has(subject.id) 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.has(subject.id)}
                          onChange={() => {}} // handled by div click
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium">
                            {/* ClassSubject usually expands subject relation */}
                            {subject.subject?.name || 'Unknown Subject'}
                          </div>
                          <div className="text-xs text-muted">
                            Code: {subject.subject?.code} | Credit: {subject.creditHours}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-actions border-t mt-4 pt-4">
             <Button type="button" variant="secondary" onClick={() => setSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSubjects} loading={submitting} icon={Layers}>
              Save Assignments
            </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Programs;
