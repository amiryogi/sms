import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash2, Link as LinkIcon, Pencil } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import { Select, Button, Input } from "../../components/common/FormElements";
import { academicService } from "../../api/academicService";

const ClassSubjects = () => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // holds the row being edited or null
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [filters, setFilters] = useState({ academicYearId: "", classId: "" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

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
      const currentYear = yearsRes.data?.find((y) => y.isCurrent);
      if (currentYear) {
        setFilters((prev) => ({
          ...prev,
          academicYearId: currentYear.id.toString(),
        }));
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.academicYearId)
        params.academicYearId = filters.academicYearId;
      if (filters.classId) params.classId = filters.classId;
      const response = await academicService.getClassSubjects(params);
      setClassSubjects(response.data || []);
    } catch (error) {
      console.error("Error fetching class subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setEditing(null);
    reset({
      academicYearId: filters.academicYearId,
      classId: filters.classId,
      subjectId: "",
      hasTheory: true,
      hasPractical: false,
      theoryMarks: 100,
      practicalMarks: 0,
      creditHours: 3.0,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row);
    reset({
      academicYearId: row.academicYearId?.toString(),
      classId: row.classId?.toString(),
      subjectId: row.subjectId?.toString(),
      hasTheory: row.hasTheory !== false,
      hasPractical: row.hasPractical === true,
      theoryMarks: row.theoryMarks,
      practicalMarks: row.practicalMarks,
      creditHours: row.creditHours,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const theory = parseInt(data.theoryMarks || 100);
      const practical = parseInt(data.practicalMarks || 0);
      const credits = parseFloat(data.creditHours || 3.0);

      if (Number.isNaN(theory) || theory < 0) {
        setStatus({
          type: "error",
          message: "Theory marks must be zero or greater.",
        });
        setSubmitting(false);
        return;
      }
      if (Number.isNaN(practical) || practical < 0) {
        setStatus({
          type: "error",
          message: "Practical marks must be zero or greater.",
        });
        setSubmitting(false);
        return;
      }
      if (Number.isNaN(credits) || credits <= 0) {
        setStatus({
          type: "error",
          message: "Credit hours must be greater than zero.",
        });
        setSubmitting(false);
        return;
      }

      const payload = {
        academicYearId: editing
          ? editing.academicYearId
          : parseInt(data.academicYearId),
        classId: editing ? editing.classId : parseInt(data.classId),
        subjectId: editing ? editing.subjectId : parseInt(data.subjectId),
        hasTheory: data.hasTheory === true || data.hasTheory === "true",
        hasPractical:
          data.hasPractical === true || data.hasPractical === "true",
        theoryMarks: theory,
        practicalMarks: practical,
        creditHours: credits,
      };

      if (editing) {
        await academicService.updateClassSubject(editing.id, payload);
        setStatus({
          type: "success",
          message: "Class subject updated successfully.",
        });
      } else {
        await academicService.assignSubjectToClass(payload);
        setStatus({ type: "success", message: "Subject assigned to class." });
      }
      fetchClassSubjects();
      closeModal();
    } catch (error) {
      console.error("Error assigning subject:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Error assigning subject",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm("Are you sure you want to remove this subject from the class?")
    )
      return;
    try {
      await academicService.removeSubjectFromClass(id);
      fetchClassSubjects();
      setStatus({ type: "success", message: "Subject removed from class." });
    } catch (error) {
      console.error("Error removing subject:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Error removing",
      });
    }
  };

  const getClassName = (classId) =>
    classes.find((c) => c.id === classId)?.name || "Unknown";
  const getSubjectName = (subjectId) =>
    subjects.find((s) => s.id === subjectId)?.name || "Unknown";
  const getYearName = (yearId) =>
    academicYears.find((y) => y.id === yearId)?.name || "Unknown";

  const columns = [
    {
      header: "Academic Year",
      render: (row) => getYearName(row.academicYearId),
    },
    { header: "Class", render: (row) => getClassName(row.classId) },
    { header: "Subject", render: (row) => getSubjectName(row.subjectId) },
    {
      header: "Evaluation",
      render: (row) => (
        <div className="flex gap-1">
          {row.hasTheory !== false && (
            <span className="badge badge-info" title="Has Theory">
              T: {row.theoryMarks}
            </span>
          )}
          {row.hasPractical === true && (
            <span className="badge badge-success" title="Has Practical">
              P: {row.practicalMarks}
            </span>
          )}
          {row.hasTheory === false && row.hasPractical !== true && (
            <span className="badge badge-secondary">No Config</span>
          )}
        </div>
      ),
    },
    { header: "Credit Hours", accessor: "creditHours" },
    {
      header: "Actions",
      width: "80px",
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="btn-icon"
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            className="btn-icon btn-danger"
            onClick={() => handleDelete(row.id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const yearOptions = academicYears.map((y) => ({
    value: y.id.toString(),
    label: y.name,
  }));
  const classOptions = classes.map((c) => ({
    value: c.id.toString(),
    label: c.name,
  }));
  const subjectOptions = subjects.map((s) => ({
    value: s.id.toString(),
    label: s.name,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Class Subjects</h1>
          <p className="text-muted">
            Assign subjects to classes for each academic year
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`alert ${
            status.type === "error" ? "alert-danger" : "alert-success"
          }`}
          role="alert"
        >
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
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                academicYearId: e.target.value,
              }))
            }
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            value={filters.classId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, classId: e.target.value }))
            }
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

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Class Subject" : "Assign Subject to Class"}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            register={register}
            error={errors.academicYearId?.message}
            required
            disabled={!!editing}
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            register={register}
            error={errors.classId?.message}
            required
            disabled={!!editing}
          />
          <Select
            label="Subject"
            name="subjectId"
            options={subjectOptions}
            register={register}
            error={errors.subjectId?.message}
            required
            disabled={!!editing}
          />

          {/* Evaluation Structure Configuration */}
          <div className="form-section">
            <label className="form-label">Evaluation Structure</label>
            <p
              className="form-helper text-muted"
              style={{ marginBottom: "0.75rem" }}
            >
              Configure which components this subject has for this class. This
              determines what mark fields teachers see during marks entry.
            </p>
            <div
              className="checkbox-row"
              style={{ display: "flex", gap: "2rem", marginBottom: "1rem" }}
            >
              <label
                className="checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  {...register("hasTheory")}
                  style={{ width: "18px", height: "18px" }}
                />
                <span>Has Theory Component</span>
              </label>
              <label
                className="checkbox-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  {...register("hasPractical")}
                  style={{ width: "18px", height: "18px" }}
                />
                <span>Has Practical Component</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Theory Full Marks"
              name="theoryMarks"
              type="number"
              defaultValue={100}
              register={register}
            />
            <Input
              label="Practical Full Marks"
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
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={LinkIcon}>
              {editing ? "Save Changes" : "Assign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassSubjects;
