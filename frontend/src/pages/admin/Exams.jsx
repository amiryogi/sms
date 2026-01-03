import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Plus,
  Eye,
  Trash2,
  Calendar,
  BookOpen,
  Edit2,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Input, Select, Button } from "../../components/common/FormElements";
import { examService } from "../../api/examService";
import { academicService } from "../../api/academicService";
import apiClient from "../../api/apiClient";

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
  const [classSubjects, setClassSubjects] = useState([]); // All class subjects for adding
  const [loading, setLoading] = useState(true);
  const [viewingExam, setViewingExam] = useState(null); // For viewing exam details
  const [addingSubjects, setAddingSubjects] = useState(false); // Loading state for adding
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm();

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
      console.error("Error fetching data:", error);
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
        startDate: exam.startDate
          ? new Date(exam.startDate).toISOString().split("T")[0]
          : "",
        endDate: exam.endDate
          ? new Date(exam.endDate).toISOString().split("T")[0]
          : "",
        academicYearId: exam.academicYearId?.toString(),
        classIds: [], // We don't support editing linked classes yet, complexity high
      });
    } else {
      reset({
        name: "",
        examType: "unit_test",
        startDate: "",
        endDate: "",
        academicYearId:
          academicYears.find((y) => y.isCurrent)?.id?.toString() || "",
        classIds: [],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExam(null);
    reset();
  };

  // View exam details with subject evaluation structure
  const openViewModal = async (examId) => {
    try {
      const response = await examService.getExam(examId);
      setViewingExam(response.data);

      // Fetch class subjects for the exam's academic year (for adding new classes)
      if (response.data.academicYearId) {
        const csRes = await academicService.getClassSubjects({
          academicYearId: response.data.academicYearId,
        });
        setClassSubjects(csRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching exam details:", error);
      alert("Error loading exam details");
    }
  };

  const closeViewModal = () => {
    setViewingExam(null);
    setClassSubjects([]);
  };

  // Add a class's subjects to the exam
  const handleAddClassToExam = async (classId) => {
    if (!viewingExam) return;

    // Find all class subjects for this class that aren't already in the exam
    const existingClassSubjectIds =
      viewingExam.examSubjects?.map((es) => es.classSubjectId) || [];
    const subjectsToAdd = classSubjects.filter(
      (cs) =>
        cs.classId === parseInt(classId) &&
        !existingClassSubjectIds.includes(cs.id)
    );

    if (subjectsToAdd.length === 0) {
      alert("All subjects from this class are already linked to the exam.");
      return;
    }

    if (
      !confirm(
        `Add ${subjectsToAdd.length} subject(s) from this class to the exam?`
      )
    )
      return;

    setAddingSubjects(true);
    try {
      // Use the updateExamSubjects API to add subjects
      await examService.updateExamSubjects(
        viewingExam.id,
        subjectsToAdd.map((cs) => ({
          classSubjectId: cs.id,
          theoryFullMarks: cs.theoryMarks,
          practicalFullMarks: cs.practicalMarks,
          fullMarks: cs.fullMarks,
          passMarks: cs.passMarks,
        }))
      );

      alert(`${subjectsToAdd.length} subject(s) added successfully!`);

      // Refresh the exam details
      const response = await examService.getExam(viewingExam.id);
      setViewingExam(response.data);
      fetchData(); // Refresh exam list too
    } catch (error) {
      console.error("Error adding subjects:", error);
      alert(error.response?.data?.message || "Error adding subjects to exam");
    } finally {
      setAddingSubjects(false);
    }
  };

  // Remove an exam subject
  const handleRemoveExamSubject = async (examSubjectId) => {
    if (!confirm("Remove this subject from the exam?")) return;

    try {
      await apiClient.delete(
        `/exams/${viewingExam.id}/subjects/${examSubjectId}`
      );

      // Refresh the exam details
      const response = await examService.getExam(viewingExam.id);
      setViewingExam(response.data);
      fetchData();
    } catch (error) {
      console.error("Error removing subject:", error);
      alert(error.response?.data?.message || "Error removing subject");
    }
  };

  const handlePublish = async (id) => {
    if (
      !confirm(
        "Are you sure you want to publish this exam? Teachers will be able to enter marks."
      )
    )
      return;
    try {
      await examService.publishExam(id);
      alert("Exam published successfully! Teachers can now enter results.");
      fetchData();
    } catch (error) {
      console.error("Error publishing exam:", error);
      alert(error.response?.data?.message || "Error publishing exam");
    }
  };

  const handleLock = async (id) => {
    if (
      !confirm(
        "Are you sure you want to LOCK this exam? Marks will be frozen and cannot be changed."
      )
    )
      return;
    try {
      await examService.lockExam(id);
      alert("Exam LOCKED successfully for all results.");
      fetchData();
    } catch (error) {
      console.error("Error locking exam:", error);
      alert(error.response?.data?.message || "Error locking exam");
    }
  };

  const handleUnlock = async (id) => {
    if (!confirm("Unlock this exam? Marks will become editable again.")) return;
    try {
      await examService.unlockExam(id);
      alert("Exam unlocked. Marks entry reopened.");
      fetchData();
    } catch (error) {
      console.error("Error unlocking exam:", error);
      alert(error.response?.data?.message || "Error unlocking exam");
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingExam) {
        await examService.updateExam(editingExam.id, data);
        alert("Exam updated successfully");
      } else {
        await examService.createExam(data);
        alert(
          "Exam created successfully! Subjects have been linked to selected classes."
        );
      }
      fetchData();
      closeModal();
    } catch (error) {
      console.error("Error saving exam:", error);
      alert(error.response?.data?.message || "Error saving exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Are you sure you want to DELETE this exam? This action cannot be undone."
      )
    )
      return;
    try {
      await examService.deleteExam(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting exam:", error);
      alert(error.response?.data?.message || "Error deleting exam");
    }
  };

  const columns = [
    { header: "Exam Name", accessor: "name" },
    {
      header: "Type",
      accessor: "examType",
      render: (row) => row.examType.replace("_", " ").toUpperCase(),
    },
    {
      header: "Dates",
      render: (row) => (
        <span className="text-sm">
          {new Date(row.startDate).toLocaleDateString()} -{" "}
          {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Academic Year",
      accessor: "academicYear",
      render: (row) => row.academicYear?.name || "-",
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const statusColors = {
          DRAFT: "badge-warning",
          PUBLISHED: "badge-success",
          LOCKED: "badge-danger",
        };
        return (
          <span
            className={`badge ${statusColors[row.status] || "badge-secondary"}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      header: "Subjects",
      render: (row) => (
        <button
          className="btn-link text-sm"
          onClick={() => openViewModal(row.id)}
          title="View Subjects"
          style={{
            textDecoration: "underline",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
            color: "#3b82f6",
          }}
        >
          {row._count?.examSubjects || 0} Linked
        </button>
      ),
    },
    {
      header: "Actions",
      width: "200px",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            onClick={() => openViewModal(row.id)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {row.status === "DRAFT" && (
            <>
              <button
                className="btn-icon"
                onClick={() => openModal(row)}
                title="Edit Exam"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="btn-icon text-success"
                onClick={() => handlePublish(row.id)}
                title="Publish Exam"
              >
                <CheckCircle size={16} />
              </button>
            </>
          )}

          {row.status === "PUBLISHED" && (
            <button
              className="btn-icon text-danger"
              onClick={() => handleLock(row.id)}
              title="Lock Exam"
            >
              <Lock size={16} />
            </button>
          )}

          {row.status === "LOCKED" && (
            <button
              className="btn-icon text-warning"
              onClick={() => handleUnlock(row.id)}
              title="Unlock / Republish Exam"
            >
              <Unlock size={16} />
            </button>
          )}

          {row.status === "DRAFT" && (
            <button
              className="btn-icon btn-danger"
              onClick={() => handleDelete(row.id)}
              title="Delete Exam"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const examTypes = [
    { value: "unit_test", label: "Unit Test" },
    { value: "midterm", label: "Midterm" },
    { value: "final", label: "Final" },
    { value: "board", label: "Board" },
  ];

  const academicYearOptions = academicYears.map((y) => ({
    value: y.id.toString(),
    label: `${y.name} ${y.isCurrent ? "(Current)" : ""}`,
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

      {/* View Exam Details Modal */}
      <Modal
        isOpen={!!viewingExam}
        onClose={closeViewModal}
        title={viewingExam ? `${viewingExam.name} - Subjects` : "Exam Details"}
        size="lg"
      >
        {viewingExam && (
          <div className="exam-details">
            <div
              className="exam-info-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#f8fafc",
                borderRadius: "8px",
              }}
            >
              <div>
                <span className="text-muted text-sm">Status</span>
                <div>
                  <span
                    className={`badge ${
                      viewingExam.status === "PUBLISHED"
                        ? "badge-success"
                        : viewingExam.status === "LOCKED"
                        ? "badge-danger"
                        : "badge-warning"
                    }`}
                  >
                    {viewingExam.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted text-sm">Type</span>
                <div className="font-medium">
                  {viewingExam.examType?.replace("_", " ").toUpperCase()}
                </div>
              </div>
              <div>
                <span className="text-muted text-sm">Dates</span>
                <div className="font-medium text-sm">
                  {viewingExam.startDate &&
                    new Date(viewingExam.startDate).toLocaleDateString()}{" "}
                  -{" "}
                  {viewingExam.endDate &&
                    new Date(viewingExam.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <h4 style={{ marginBottom: "1rem" }}>
              Linked Subjects ({viewingExam.examSubjects?.length || 0})
            </h4>

            {/* Add Class Section - Only for DRAFT exams */}
            {viewingExam.status === "DRAFT" && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Add Class Subjects
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {(() => {
                    // Get classes that have subjects for this academic year
                    const existingClassIds = [
                      ...new Set(
                        viewingExam.examSubjects?.map(
                          (es) => es.classSubject?.class?.id
                        ) || []
                      ),
                    ];
                    const availableClasses = [
                      ...new Set(classSubjects.map((cs) => cs.classId)),
                    ]
                      .map((classId) => {
                        const cs = classSubjects.find(
                          (c) => c.classId === classId
                        );
                        return cs
                          ? {
                              id: classId,
                              name: cs.class?.name || `Class ${classId}`,
                            }
                          : null;
                      })
                      .filter(Boolean)
                      .sort((a, b) => a.name.localeCompare(b.name));

                    return availableClasses.map((cls) => {
                      const isAlreadyAdded = existingClassIds.includes(cls.id);
                      const subjectCount = classSubjects.filter(
                        (cs) => cs.classId === cls.id
                      ).length;
                      const addedCount =
                        viewingExam.examSubjects?.filter(
                          (es) => es.classSubject?.class?.id === cls.id
                        ).length || 0;

                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleAddClassToExam(cls.id)}
                          disabled={
                            addingSubjects || addedCount === subjectCount
                          }
                          style={{
                            padding: "0.5rem 1rem",
                            border: "1px solid #16a34a",
                            borderRadius: "6px",
                            background:
                              addedCount === subjectCount
                                ? "#e2e8f0"
                                : "#ffffff",
                            color:
                              addedCount === subjectCount
                                ? "#64748b"
                                : "#16a34a",
                            cursor:
                              addedCount === subjectCount
                                ? "not-allowed"
                                : "pointer",
                            fontSize: "0.875rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title={
                            addedCount === subjectCount
                              ? "All subjects already added"
                              : `Add ${subjectCount - addedCount} subject(s)`
                          }
                        >
                          <Plus size={14} />
                          {cls.name}
                          {addedCount > 0 && (
                            <span style={{ fontSize: "0.75rem" }}>
                              ({addedCount}/{subjectCount})
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: "0.5rem",
                  }}
                >
                  Click a class to add all its subjects (with their
                  theory/practical configuration) to this exam.
                </p>
              </div>
            )}

            {viewingExam.examSubjects?.length > 0 ? (
              <div
                className="subjects-table"
                style={{ maxHeight: "400px", overflowY: "auto" }}
              >
                <table
                  className="table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                      <th
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Class
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Subject
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Evaluation
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Full Marks
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Pass Marks
                      </th>
                      {viewingExam.status === "DRAFT" && (
                        <th
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #e2e8f0",
                            width: "80px",
                            textAlign: "center",
                          }}
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingExam.examSubjects.map((es) => (
                      <tr
                        key={es.id}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "0.75rem" }}>
                          {es.classSubject?.class?.name || "N/A"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {es.classSubject?.subject?.name || "N/A"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div
                            className="flex gap-1"
                            style={{ display: "flex", gap: "0.25rem" }}
                          >
                            {es.hasTheory !== false && (
                              <span
                                className="badge badge-info"
                                style={{ fontSize: "0.75rem" }}
                              >
                                Theory: {es.theoryFullMarks || 0}
                              </span>
                            )}
                            {es.hasPractical === true && (
                              <span
                                className="badge badge-success"
                                style={{ fontSize: "0.75rem" }}
                              >
                                Practical: {es.practicalFullMarks || 0}
                              </span>
                            )}
                            {es.hasTheory === false &&
                              es.hasPractical !== true && (
                                <span
                                  className="badge badge-secondary"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  No Eval Config
                                </span>
                              )}
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem" }}>{es.fullMarks}</td>
                        <td style={{ padding: "0.75rem" }}>{es.passMarks}</td>
                        {viewingExam.status === "DRAFT" && (
                          <td
                            style={{ padding: "0.75rem", textAlign: "center" }}
                          >
                            <button
                              onClick={() => handleRemoveExamSubject(es.id)}
                              disabled={addingSubjects}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: addingSubjects
                                  ? "not-allowed"
                                  : "pointer",
                                color: "#ef4444",
                                padding: "0.25rem",
                              }}
                              title="Remove from exam"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No subjects linked to this exam.</p>
            )}

            <div className="modal-actions mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={closeViewModal}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Exams;
