import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, BookOpen, GraduationCap, FileText, Beaker } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Button, Select } from '../../components/common/FormElements';
import { nebService } from '../../api/nebService';
import { academicService } from '../../api/academicService';

const NEBCurriculum = () => {
  // State for data
  const [nebClasses, setNebClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [components, setComponents] = useState([]);
  
  // State for filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const watchType = watch('type');

  // Fetch NEB classes and subjects on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          nebService.getNEBClasses(),
          academicService.getSubjects(),
        ]);
        setNebClasses(classesRes.data || []);
        setSubjects(subjectsRes.data || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch components when class filter changes
  useEffect(() => {
    if (selectedClassId) {
      fetchComponents();
    } else {
      setComponents([]);
    }
  }, [selectedClassId, selectedSubjectId]);

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const params = { classId: selectedClassId };
      if (selectedSubjectId) {
        params.subjectId = selectedSubjectId;
      }
      const response = await nebService.getSubjectComponents(params);
      setComponents(response.data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (component = null) => {
    setEditingComponent(component);
    if (component) {
      reset({
        subjectId: component.subjectId,
        classId: component.classId,
        type: component.type,
        subjectCode: component.subjectCode,
        fullMarks: component.fullMarks,
        passMarks: component.passMarks,
        creditHours: component.creditHours,
      });
    } else {
      reset({
        subjectId: selectedSubjectId || '',
        classId: selectedClassId || '',
        type: 'THEORY',
        subjectCode: '',
        fullMarks: 100,
        passMarks: 40,
        creditHours: 3.0,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingComponent(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        subjectId: parseInt(data.subjectId),
        classId: parseInt(data.classId),
        fullMarks: parseInt(data.fullMarks),
        passMarks: parseInt(data.passMarks),
        creditHours: parseFloat(data.creditHours),
      };

      if (editingComponent) {
        await nebService.updateSubjectComponent(editingComponent.id, payload);
      } else {
        await nebService.createSubjectComponent(payload);
      }
      fetchComponents();
      closeModal();
    } catch (error) {
      console.error('Error saving component:', error);
      alert(error.response?.data?.message || 'Error saving subject component');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subject component?')) return;
    try {
      await nebService.deleteSubjectComponent(id);
      fetchComponents();
    } catch (error) {
      console.error('Error deleting component:', error);
      alert(error.response?.data?.message || 'Error deleting component');
    }
  };

  const columns = [
    {
      header: 'Subject',
      render: (row) => (
        <div className="subject-cell">
          <BookOpen size={16} />
          <span>{row.subject?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      width: '120px',
      render: (row) => (
        <span className={`badge ${row.type === 'THEORY' ? 'badge-primary' : 'badge-warning'}`}>
          {row.type === 'THEORY' ? (
            <><FileText size={12} style={{ marginRight: '4px' }} /> Theory</>
          ) : (
            <><Beaker size={12} style={{ marginRight: '4px' }} /> Practical</>
          )}
        </span>
      ),
    },
    { header: 'Subject Code', accessor: 'subjectCode', width: '130px' },
    { header: 'Full Marks', accessor: 'fullMarks', width: '100px' },
    { header: 'Pass Marks', accessor: 'passMarks', width: '100px' },
    { header: 'Credit Hours', accessor: 'creditHours', width: '120px' },
    {
      header: 'Class',
      width: '100px',
      render: (row) => (
        <span className="badge badge-secondary">
          Grade {row.class?.gradeLevel}
        </span>
      ),
    },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <div className="action-buttons">
          <button className="btn-icon" onClick={() => openModal(row)} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Subject options for dropdown
  const subjectOptions = subjects.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.code})`,
  }));

  // Class options for dropdown (only NEB classes)
  const classOptions = nebClasses.map((c) => ({
    value: c.id,
    label: `${c.name} (Grade ${c.gradeLevel})`,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <GraduationCap size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            NEB Curriculum
          </h1>
          <p className="text-muted">
            Manage subject components for Grade 11-12 (Nepal Education Board)
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <strong>NEB Structure:</strong> Each subject in Grade 11-12 has separate Theory and Practical 
        components with their own subject codes, marks, and credit hours.
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3>Filter Components</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Select Grade</label>
              <select
                className="form-control"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSubjectId('');
                }}
              >
                <option value="">-- Select Grade --</option>
                {nebClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Grade {c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Filter by Subject (Optional)</label>
              <select
                className="form-control"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
              >
                <option value="">-- All Subjects --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        {!selectedClassId ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <GraduationCap size={48} className="text-muted" />
            <h3>Select a Grade to View Components</h3>
            <p className="text-muted">
              Choose Grade 11 or Grade 12 from the dropdown above to manage subject components.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={components}
            loading={loading}
            emptyMessage="No subject components found for this grade"
            actions={
              <Button icon={Plus} onClick={() => openModal()}>
                Add Component
              </Button>
            }
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingComponent ? 'Edit Subject Component' : 'Add Subject Component'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Grade *</label>
              <select
                className={`form-control ${errors.classId ? 'is-invalid' : ''}`}
                {...register('classId', { required: 'Grade is required' })}
                disabled={!!editingComponent}
              >
                <option value="">-- Select Grade --</option>
                {nebClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Grade {c.gradeLevel})
                  </option>
                ))}
              </select>
              {errors.classId && <span className="error-text">{errors.classId.message}</span>}
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <select
                className={`form-control ${errors.subjectId ? 'is-invalid' : ''}`}
                {...register('subjectId', { required: 'Subject is required' })}
                disabled={!!editingComponent}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              {errors.subjectId && <span className="error-text">{errors.subjectId.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Component Type *</label>
              <select
                className={`form-control ${errors.type ? 'is-invalid' : ''}`}
                {...register('type', { required: 'Type is required' })}
                disabled={!!editingComponent}
              >
                <option value="THEORY">Theory</option>
                <option value="PRACTICAL">Practical</option>
              </select>
              {errors.type && <span className="error-text">{errors.type.message}</span>}
            </div>
            <Input
              label="Subject Code *"
              name="subjectCode"
              placeholder="e.g., PHY-401"
              register={register}
              rules={{ required: 'Subject code is required' }}
              error={errors.subjectCode?.message}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Full Marks *"
              name="fullMarks"
              type="number"
              min="1"
              register={register}
              rules={{ 
                required: 'Full marks required',
                min: { value: 1, message: 'Must be at least 1' }
              }}
              error={errors.fullMarks?.message}
            />
            <Input
              label="Pass Marks *"
              name="passMarks"
              type="number"
              min="0"
              register={register}
              rules={{ 
                required: 'Pass marks required',
                min: { value: 0, message: 'Cannot be negative' }
              }}
              error={errors.passMarks?.message}
            />
            <Input
              label="Credit Hours *"
              name="creditHours"
              type="number"
              step="0.1"
              min="0.1"
              register={register}
              rules={{ 
                required: 'Credit hours required',
                min: { value: 0.1, message: 'Must be greater than 0' }
              }}
              error={errors.creditHours?.message}
            />
          </div>

          {/* Type-specific hints */}
          <div className="alert alert-secondary" style={{ marginTop: '10px' }}>
            {watchType === 'PRACTICAL' ? (
              <><Beaker size={16} /> <strong>Practical:</strong> Failure in practical = subject failure</>
            ) : (
              <><FileText size={16} /> <strong>Theory:</strong> Main examination component</>
            )}
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingComponent ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NEBCurriculum;
