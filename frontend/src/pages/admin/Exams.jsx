import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Eye, Trash2, Calendar, BookOpen, Edit2, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { Input, Select, Button } from '../../components/common/FormElements';
import { examService } from '../../api/examService';
import { academicService } from '../../api/academicService';

// MultiSelect Component for Classes
const MultiSelectClasses = ({ classes, control, name, label }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        <Controller
            name={name}
            control={control}
            defaultValue={[]}
            render={({ field: { onChange, value } }) => (
                <div className="multi-select-grid">
                    {classes.map((cls) => (
                        <label key={cls.id} className="checkbox-card">
                            <input
                                type="checkbox"
                                value={cls.id}
                                checked={value.includes(cls.id.toString())}
                                onChange={(e) => {
                                    const id = cls.id.toString();
                                    if (e.target.checked) {
                                        onChange([...value, id]);
                                    } else {
                                        onChange(value.filter((v) => v !== id));
                                    }
                                }}
                            />
                            <span>{cls.name}</span>
                        </label>
                    ))}
                </div>
            )}
        />
        <p className="form-helper">
            Selecting classes will automatically link all their subjects to this exam.
        </p>
        <style>{`
      .multi-select-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.5rem;
        margin-top: 0.5rem;
        max-height: 200px;
        overflow-y: auto;
        padding: 4px;
      }
      .checkbox-card {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .checkbox-card:hover {
        background-color: #f8fafc;
        border-color: #cbd5e1;
      }
      .checkbox-card input {
        cursor: pointer;
      }
    `}</style>
    </div>
);

const Exams = () => {
    const [exams, setExams] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [examsRes, distinctYearsRes, classesRes] = await Promise.all([
                examService.getExams(),
                academicService.getAcademicYears(),
                academicService.getClasses(),
            ]);
            setExams(examsRes.data || []);
            setAcademicYears(distinctYearsRes.data || []);
            setClasses(classesRes.data || []);

            // Pre-select current academic year if needed
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // State for editing
    const [editingExam, setEditingExam] = useState(null);

    const openModal = (exam = null) => {
        setEditingExam(exam);
        if (exam) {
            reset({
                name: exam.name,
                examType: exam.examType,
                startDate: exam.startDate ? new Date(exam.startDate).toISOString().split('T')[0] : '',
                endDate: exam.endDate ? new Date(exam.endDate).toISOString().split('T')[0] : '',
                academicYearId: exam.academicYearId?.toString(),
                classIds: [] // We don't support editing linked classes yet, complexity high
            });
        } else {
            reset({
                name: '',
                examType: 'unit_test',
                startDate: '',
                endDate: '',
                academicYearId: academicYears.find(y => y.isCurrent)?.id?.toString() || '',
                classIds: []
            });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingExam(null);
        reset();
    };

    const handlePublish = async (id) => {
        if (!confirm('Are you sure you want to publish this exam? Teachers will be able to enter marks.')) return;
        try {
            await examService.publishExam(id);
            alert('Exam published successfully! Teachers can now enter results.');
            fetchData();
        } catch (error) {
            console.error('Error publishing exam:', error);
            alert(error.response?.data?.message || 'Error publishing exam');
        }
    };

    const handleLock = async (id) => {
        if (!confirm('Are you sure you want to LOCK this exam? Marks will be frozen and cannot be changed.')) return;
        try {
            await examService.lockExam(id);
            alert('Exam LOCKED successfully for all results.');
            fetchData();
        } catch (error) {
            console.error('Error locking exam:', error);
            alert(error.response?.data?.message || 'Error locking exam');
        }
    };

    const onSubmit = async (data) => {
        setSubmitting(true);
        try {
            if (editingExam) {
                await examService.updateExam(editingExam.id, data);
                alert('Exam updated successfully');
            } else {
                await examService.createExam(data);
                alert('Exam created successfully! Subjects have been linked to selected classes.');
            }
            fetchData();
            closeModal();
        } catch (error) {
            console.error('Error saving exam:', error);
            alert(error.response?.data?.message || 'Error saving exam');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to DELETE this exam? This action cannot be undone.')) return;
        try {
            await examService.deleteExam(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting exam:', error);
            alert(error.response?.data?.message || 'Error deleting exam');
        }
    };

    const columns = [
        { header: 'Exam Name', accessor: 'name' },
        {
            header: 'Type',
            accessor: 'examType',
            render: (row) => row.examType.replace('_', ' ').toUpperCase()
        },
        {
            header: 'Dates',
            render: (row) => (
                <span className="text-sm">
                    {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                </span>
            )
        },
        {
            header: 'Academic Year',
            accessor: 'academicYear',
            render: (row) => row.academicYear?.name || '-'
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const statusColors = {
                    DRAFT: 'badge-warning',
                    PUBLISHED: 'badge-success',
                    LOCKED: 'badge-danger'
                };
                return (
                    <span className={`badge ${statusColors[row.status] || 'badge-secondary'}`}>
                        {row.status}
                    </span>
                );
            }
        },
        {
            header: 'Subjects',
            render: (row) => (
                <span className="text-sm text-muted">
                    {row._count?.examSubjects || 0} Linked
                </span>
            )
        },
        {
            header: 'Actions',
            width: '180px',
            render: (row) => (
                <div className="action-buttons">
                    {row.status === 'DRAFT' && (
                        <>
                            <button className="btn-icon" onClick={() => openModal(row)} title="Edit Exam">
                                <Edit2 size={16} />
                            </button>
                            <button className="btn-icon text-success" onClick={() => handlePublish(row.id)} title="Publish Exam">
                                <CheckCircle size={16} />
                            </button>
                        </>
                    )}

                    {row.status === 'PUBLISHED' && (
                        <button className="btn-icon text-danger" onClick={() => handleLock(row.id)} title="Lock Exam">
                            <Lock size={16} />
                        </button>
                    )}

                    {row.status === 'DRAFT' && (
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(row.id)} title="Delete Exam">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const examTypes = [
        { value: 'unit_test', label: 'Unit Test' },
        { value: 'midterm', label: 'Midterm' },
        { value: 'final', label: 'Final' },
        { value: 'board', label: 'Board' },
    ];

    const academicYearOptions = academicYears.map(y => ({
        value: y.id.toString(),
        label: `${y.name} ${y.isCurrent ? '(Current)' : ''}`
    }));

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Exam Management</h1>
                    <p className="text-muted">Create exams and schedule subjects</p>
                </div>
            </div>

            <div className="card">
                <DataTable
                    columns={columns}
                    data={exams}
                    loading={loading}
                    emptyMessage="No exams found. Create one to get started."
                    actions={
                        <Button icon={Plus} onClick={() => openModal()}>
                            Create Exam
                        </Button>
                    }
                />
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingExam ? "Edit Exam" : "Create New Exam"}
                size="lg"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Exam Name"
                            name="name"
                            placeholder="e.g. First Term Examination"
                            register={register}
                            error={errors.name?.message}
                            required
                        />
                        <Select
                            label="Exam Type"
                            name="examType"
                            options={examTypes}
                            register={register}
                            error={errors.examType?.message}
                            required
                        />
                        <Select
                            label="Academic Year"
                            name="academicYearId"
                            options={academicYearOptions}
                            register={register}
                            error={errors.academicYearId?.message}
                            required
                        />
                        <div className="grid grid-cols-2 gap-2">
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
                        </div>
                    </div>

                    {!editingExam && (
                        <div className="mt-4">
                            <MultiSelectClasses
                                classes={classes}
                                control={control}
                                name="classIds"
                                label="Participating Classes (Auto-link Subjects)"
                            />
                        </div>
                    )}

                    <div className="modal-actions mt-6">
                        <Button type="button" variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {editingExam ? "Update Exam" : "Create Exam"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Exams;
