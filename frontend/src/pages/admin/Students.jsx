import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Edit2, Eye, UserPlus } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import {
  Input,
  Select,
  Button,
  FormRow,
  FileUpload,
} from "../../components/common/FormElements";
import { studentService } from "../../api/studentService";
import { academicService } from "../../api/academicService";
import { uploadService } from "../../api/uploadService";

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url
    .replace(/^\\?/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/")}`;
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const enrollForm = useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, search]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, yearsRes] = await Promise.all([
        academicService.getClasses(),
        academicService.getAcademicYears(),
      ]);
      setClasses(classesRes.data || []);
      setAcademicYears(yearsRes.data || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      setStudents(response.data?.students || response.data || []);
      if (response.data?.pagination) {
        setPagination((prev) => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    try {
      const response = await academicService.getSections(classId);
      setSections(response.data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const openModal = (student = null) => {
    setEditingStudent(student);
    if (student) {
      reset({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone || "",
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth?.split("T")[0],
        gender: student.gender,
        bloodGroup: student.bloodGroup || "",
        address: student.address || "",
        emergencyContact: student.emergencyContact || "",
      });
      setAvatarUrl(student.avatarUrl || "");
    } else {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        admissionNumber: "",
        rollNumber: "",
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        address: "",
        emergencyContact: "",
        admissionDate: new Date().toISOString().split("T")[0],
        academicYearId:
          academicYears.find((y) => y.isCurrent)?.id?.toString() || "",
        classId: "",
        sectionId: "",
      });
      setAvatarUrl("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
    setAvatarUrl("");
    reset();
  };

  const openEnrollModal = (student) => {
    setSelectedStudent(student);
    enrollForm.reset({});
    setEnrollModalOpen(true);
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setSelectedStudent(null);
    enrollForm.reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payloadBase = { ...data, avatarUrl: avatarUrl || undefined };
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, payloadBase);
      } else {
        const payload = {
          ...payloadBase,
          academicYearId: parseInt(data.academicYearId),
          classId: parseInt(data.classId),
          sectionId: parseInt(data.sectionId),
          rollNumber: data.rollNumber ? parseInt(data.rollNumber) : undefined,
        };
        await studentService.createStudent(payload);
      }
      fetchStudents();
      closeModal();
    } catch (error) {
      console.error("Error saving student:", error);
      alert(error.response?.data?.message || "Error saving student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (files) => {
    const file = files && files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadService.uploadAvatar(file);
      const url = res?.data?.url || res?.url || res?.data?.data?.url;
      if (url) setAvatarUrl(url);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert(error.response?.data?.message || "Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onEnrollSubmit = async (data) => {
    setSubmitting(true);
    try {
      await studentService.enrollStudent(selectedStudent.id, {
        academicYearId: parseInt(data.academicYearId),
        classId: parseInt(data.classId),
        sectionId: parseInt(data.sectionId),
        rollNumber: data.rollNumber,
      });
      fetchStudents();
      closeEnrollModal();
    } catch (error) {
      console.error("Error enrolling student:", error);
      alert(error.response?.data?.message || "Error enrolling student");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Student",
      render: (row) => (
        <div className="user-cell">
          <span className="user-name">
            {row.firstName} {row.lastName}
          </span>
          <span className="user-email">{row.email}</span>
        </div>
      ),
    },
    { header: "Admission No.", accessor: "admissionNumber" },
    {
      header: "Roll No.",
      accessor: "rollNumber",
      render: (row) => row.rollNumber || "-",
    },
    {
      header: "Gender",
      render: (row) =>
        row.gender
          ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1)
          : "-",
    },
    {
      header: "Enrollment",
      render: (row) => {
        return row.class && row.section ? (
          `${row.class} - ${row.section}`
        ) : (
          <span className="text-muted">Not enrolled</span>
        );
      },
    },
    {
      header: "Actions",
      width: "150px",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="btn-icon"
            onClick={() => openModal(row)}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-primary"
            onClick={() => openEnrollModal(row)}
            title="Enroll"
          >
            <UserPlus size={16} />
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
  const sectionOptions = sections.map((s) => ({
    value: s.id.toString(),
    label: s.name,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p className="text-muted">Manage student records and enrollments</p>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          searchValue={search}
          onSearchChange={setSearch}
          emptyMessage="No students found"
          actions={
            <Button icon={Plus} onClick={() => openModal()}>
              Add Student
            </Button>
          }
        />
      </div>

      {/* Create/Edit Student Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingStudent ? "Edit Student" : "Add Student"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <Input
              label="First Name"
              name="firstName"
              register={register}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              register={register}
              required
            />
          </FormRow>
          <FormRow>
            <Input
              label="Email"
              name="email"
              type="email"
              register={register}
              required
            />
            <Input label="Phone" name="phone" register={register} />
          </FormRow>
          {!editingStudent && (
            <Input
              label="Password"
              name="password"
              type="password"
              register={register}
              required
            />
          )}
          <FormRow>
            <Input
              label="Admission Number"
              name="admissionNumber"
              register={register}
              required
            />
            {!editingStudent && (
              <Input
                label="Roll Number"
                name="rollNumber"
                register={register}
              />
            )}
          </FormRow>

          {/* Extended Profile Info */}
          <FormRow>
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              register={register}
              required
            />
            <Select
              label="Gender"
              name="gender"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              register={register}
              required
            />
          </FormRow>
          <div className="form-group">
            <label>Profile Photo</label>
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={resolveAssetUrl(avatarUrl)}
                  alt="Avatar"
                  className="user-avatar-sm"
                />
              ) : (
                <div className="user-avatar-placeholder-sm">
                  {(editingStudent?.firstName || "N")[0]}
                </div>
              )}
              <FileUpload
                label="Upload Avatar"
                accept="image/*"
                multiple={false}
                onChange={handleAvatarUpload}
              />
            </div>
            {uploadingAvatar && (
              <p className="text-sm text-muted">Uploading...</p>
            )}
          </div>
          <FormRow>
            <Input
              label="Blood Group"
              name="bloodGroup"
              register={register}
              placeholder="e.g. A+"
            />
            <Input
              label="Emergency Contact"
              name="emergencyContact"
              register={register}
            />
          </FormRow>
          <Input label="Address" name="address" register={register} />

          {!editingStudent && (
            <>
              <FormRow>
                <Input
                  label="Admission Date"
                  name="admissionDate"
                  type="date"
                  register={register}
                  required
                />
                <Select
                  label="Academic Year"
                  name="academicYearId"
                  options={yearOptions}
                  register={register}
                  required
                />
              </FormRow>
              <FormRow>
                <Select
                  label="Class"
                  name="classId"
                  options={classOptions}
                  register={register}
                  required
                  onChange={(e) => fetchSectionsForClass(e.target.value)}
                />
                <Select
                  label="Section"
                  name="sectionId"
                  options={sectionOptions}
                  register={register}
                  required
                />
              </FormRow>
            </>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStudent ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={closeEnrollModal}
        title="Enroll Student"
        size="md"
      >
        <form onSubmit={enrollForm.handleSubmit(onEnrollSubmit)}>
          <div className="form-info mb-4 p-3 bg-gray-50 rounded">
            <p>
              <strong>Student:</strong> {selectedStudent?.firstName}{" "}
              {selectedStudent?.lastName}
            </p>
            <p>
              <strong>Admission No:</strong> {selectedStudent?.admissionNumber}
            </p>
            <p>
              <strong>Current Enrollment:</strong>{" "}
              {selectedStudent?.class ? (
                `${selectedStudent.class} - ${selectedStudent.section}`
              ) : (
                <span className="text-muted">Not enrolled</span>
              )}
            </p>
          </div>
          <Select
            label="Academic Year"
            name="academicYearId"
            options={yearOptions}
            register={enrollForm.register}
            required
          />
          <Select
            label="Class"
            name="classId"
            options={classOptions}
            register={enrollForm.register}
            required
            onChange={(e) => fetchSectionsForClass(e.target.value)}
          />
          <Select
            label="Section"
            name="sectionId"
            options={sectionOptions}
            register={enrollForm.register}
            required
          />
          <Input
            label="Roll Number"
            name="rollNumber"
            register={enrollForm.register}
          />
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeEnrollModal}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={UserPlus}>
              Enroll
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
