import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/FormElements";
import {
  Save,
  GraduationCap,
  Layers,
  BookOpen,
  Users,
  AlertCircle,
} from "lucide-react";
import { examService } from "../../api/examService";
import { teacherService } from "../../api/teacherService";
import { programService } from "../../api/programService";

/**
 * Marks Entry Component - RBAC-Aware
 *
 * TWO DISTINCT FLOWS based on role:
 *
 * 1. TEACHER FLOW:
 *    - Shows ONLY their assigned subjects (from teacher_subjects table)
 *    - Exam → [Their Class-Section-Subject] → Students
 *    - Cannot access subjects not assigned to them
 *
 * 2. EXAM_OFFICER/ADMIN FLOW:
 *    - Can access ANY subject in the exam
 *    - Exam → Class → Section → Subject → Program (Grade 11-12) → Students
 */
const MarksEntry = () => {
  const { user, hasRole } = useAuth();

  // ==================== ROLE DETECTION ====================
  const isTeacher = hasRole("TEACHER");
  const isExamOfficer = hasRole("EXAM_OFFICER");
  const isAdmin = hasRole("ADMIN") || hasRole("SUPER_ADMIN");

  // TEACHER role uses their assignments; EXAM_OFFICER/ADMIN can access all
  const useTeacherFlow = isTeacher && !isExamOfficer && !isAdmin;

  // ==================== DATA STATES ====================
  const [exams, setExams] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]); // For TEACHER
  const [programs, setPrograms] = useState([]);
  const [marksData, setMarksData] = useState([]);

  // Loading states
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==================== FILTER STATES ====================
  // For TEACHER: examId + assignmentId (combined class-section-subject)
  // For EXAM_OFFICER/ADMIN: examId + classId + sectionId + subjectId + programId
  const [filters, setFilters] = useState({
    examId: "",
    // Teacher-specific
    assignmentId: "", // Teacher's assignment ID (classSubjectId-sectionId)
    // Exam Officer/Admin-specific
    classId: "",
    sectionId: "",
    subjectId: "", // examSubjectId
    programId: "", // For Grade 11-12
  });

  // ==================== INITIAL DATA FETCH ====================
  useEffect(() => {
    fetchExams();
    if (useTeacherFlow) {
      fetchTeacherAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTeacherFlow]);

  // Fetch programs when Grade 11-12 class is selected (EXAM_OFFICER/ADMIN flow)
  useEffect(() => {
    if (useTeacherFlow) return; // Teachers don't need this
    if (!filters.examId || !filters.classId) return;

    const exam = exams.find((e) => e.id?.toString() === filters.examId);
    const classData = exam?.examSubjects?.find(
      (es) => es.classSubject?.classId?.toString() === filters.classId,
    )?.classSubject?.class;

    if (classData && classData.gradeLevel >= 11) {
      fetchPrograms(classData.id);
    } else {
      setPrograms([]);
    }
  }, [filters.classId, filters.examId, exams, useTeacherFlow]);

  // Fetch students when filters are complete
  useEffect(() => {
    if (useTeacherFlow) {
      // TEACHER: Need examId and assignmentId
      if (!filters.examId || !filters.assignmentId) {
        setMarksData([]);
        return;
      }
      fetchStudentsForTeacher();
    } else {
      // EXAM_OFFICER/ADMIN: Need all filters
      if (
        !filters.examId ||
        !filters.classId ||
        !filters.sectionId ||
        !filters.subjectId
      ) {
        setMarksData([]);
        return;
      }
      // Check if NEB class needs program
      const exam = exams.find((e) => e.id?.toString() === filters.examId);
      const classData = exam?.examSubjects?.find(
        (es) => es.classSubject?.classId?.toString() === filters.classId,
      )?.classSubject?.class;
      const isNEB = classData && classData.gradeLevel >= 11;

      if (isNEB && !filters.programId) {
        setMarksData([]);
        return;
      }
      fetchStudentsForExamOfficer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.examId,
    filters.assignmentId,
    filters.classId,
    filters.sectionId,
    filters.subjectId,
    filters.programId,
    useTeacherFlow,
    exams,
  ]);

  // ==================== API CALLS ====================
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const res = await examService.getExamsForMarksEntry();
      const publishedExams = (res.data || []).filter(
        (e) => e.status === "PUBLISHED",
      );
      setExams(publishedExams);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchTeacherAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await teacherService.getTeacherAssignments({
        userId: user?.id,
      });
      setTeacherAssignments(res.data || []);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchPrograms = async (classId) => {
    setLoadingPrograms(true);
    try {
      const res = await programService.getProgramsByClass(classId);
      setPrograms(res.data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
      setPrograms([]);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // TEACHER FLOW: Fetch students using their assignment
  const fetchStudentsForTeacher = async () => {
    setLoadingStudents(true);
    try {
      // Parse assignment: "classSubjectId-sectionId"
      const [classSubjectId, sectionId] = filters.assignmentId.split("-");

      // Find the examSubject that matches this classSubject
      const exam = exams.find((e) => e.id?.toString() === filters.examId);
      const examSubject = exam?.examSubjects?.find(
        (es) => es.classSubjectId?.toString() === classSubjectId,
      );

      if (!examSubject) {
        console.error("No exam subject found for this assignment");
        setMarksData([]);
        setLoadingStudents(false);
        return;
      }

      let marks = [];

      // Try to fetch existing results first
      try {
        const resultsRes = await examService.getResultsBySubject(
          examSubject.id,
          sectionId,
        );
        const { results } = resultsRes.data;

        if (results && results.length > 0) {
          marks = results.map((r) => ({
            studentId: r.student.id,
            studentClassId: r.studentClassId,
            rollNumber: r.student.studentClasses?.[0]?.rollNumber || null,
            studentName: `${r.student.user?.firstName} ${r.student.user?.lastName}`,
            marksObtained: r.isAbsent ? "" : (r.marksObtained ?? ""),
            practicalMarks: r.isAbsent ? "" : (r.practicalMarks ?? ""),
            isAbsent: r.isAbsent || false,
            remarks: r.remarks || "",
          }));
        }
      } catch {
        // No existing results
      }

      // If no existing marks, fetch student list
      if (marks.length === 0) {
        // For teachers, use standard endpoint (backend validates their assignment)
        const studentsRes = await examService.getStudentsForMarksEntry(
          examSubject.id,
          sectionId,
        );
        const studentList = studentsRes.data?.students || [];

        marks = studentList.map((s) => ({
          studentId: s.studentId,
          studentClassId: s.studentClassId,
          rollNumber: s.rollNumber,
          studentName: `${s.firstName} ${s.lastName}`,
          programName: s.programName || null,
          marksObtained: "",
          practicalMarks: "",
          isAbsent: false,
          remarks: "",
        }));
      }

      marks.sort((a, b) => (a.rollNumber || 999) - (b.rollNumber || 999));
      setMarksData(marks);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMarksData([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // EXAM_OFFICER/ADMIN FLOW: Fetch students with full filter control
  const fetchStudentsForExamOfficer = async () => {
    setLoadingStudents(true);
    try {
      const examSubjectId = filters.subjectId;
      const sectionId = filters.sectionId;

      // Check if NEB class
      const exam = exams.find((e) => e.id?.toString() === filters.examId);
      const classData = exam?.examSubjects?.find(
        (es) => es.classSubject?.classId?.toString() === filters.classId,
      )?.classSubject?.class;
      const isNEB = classData && classData.gradeLevel >= 11;

      let marks = [];

      // Try to fetch existing results first
      try {
        const resultsRes = await examService.getResultsBySubject(
          examSubjectId,
          sectionId,
        );
        const { results } = resultsRes.data;

        if (results && results.length > 0) {
          marks = results.map((r) => ({
            studentId: r.student.id,
            studentClassId: r.studentClassId,
            rollNumber: r.student.studentClasses?.[0]?.rollNumber || null,
            studentName: `${r.student.user?.firstName} ${r.student.user?.lastName}`,
            marksObtained: r.isAbsent ? "" : (r.marksObtained ?? ""),
            practicalMarks: r.isAbsent ? "" : (r.practicalMarks ?? ""),
            isAbsent: r.isAbsent || false,
            remarks: r.remarks || "",
          }));
        }
      } catch {
        // No existing results
      }

      // If no existing marks, fetch student list
      if (marks.length === 0) {
        let studentsRes;

        if (isNEB && filters.programId) {
          studentsRes = await examService.getStudentsByProgram(
            examSubjectId,
            sectionId,
            filters.programId,
          );
        } else {
          studentsRes = await examService.getStudentsForMarksEntry(
            examSubjectId,
            sectionId,
          );
        }

        const studentList = studentsRes.data?.students || [];

        marks = studentList.map((s) => ({
          studentId: s.studentId,
          studentClassId: s.studentClassId,
          rollNumber: s.rollNumber,
          studentName: `${s.firstName} ${s.lastName}`,
          programName: s.programName || null,
          marksObtained: "",
          practicalMarks: "",
          isAbsent: false,
          remarks: "",
        }));
      }

      marks.sort((a, b) => (a.rollNumber || 999) - (b.rollNumber || 999));
      setMarksData(marks);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMarksData([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // ==================== DERIVED DATA ====================

  // Selected exam object
  const selectedExam = useMemo(() => {
    return exams.find((e) => e.id?.toString() === filters.examId);
  }, [exams, filters.examId]);

  // TEACHER: Get assignments that match subjects in selected exam
  const teacherAssignmentOptions = useMemo(() => {
    if (!useTeacherFlow || !selectedExam?.examSubjects) return [];

    // Get classSubjectIds from this exam (ensure numeric comparison)
    const examClassSubjectIds = new Set(
      selectedExam.examSubjects.map((es) => Number(es.classSubjectId)),
    );

    // Filter teacher's assignments to only those in this exam
    return teacherAssignments
      .filter((ta) => examClassSubjectIds.has(Number(ta.classSubjectId)))
      .map((ta) => ({
        value: `${ta.classSubjectId}-${ta.sectionId}`,
        label: `${ta.classSubject?.class?.name} ${ta.section?.name} - ${ta.classSubject?.subject?.name}`,
        classSubjectId: ta.classSubjectId,
        sectionId: ta.sectionId,
        className: ta.classSubject?.class?.name,
        sectionName: ta.section?.name,
        subjectName: ta.classSubject?.subject?.name,
        gradeLevel: ta.classSubject?.class?.gradeLevel,
      }));
  }, [useTeacherFlow, selectedExam, teacherAssignments]);

  // Get current exam subject info (for marks structure)
  const currentExamSubject = useMemo(() => {
    if (!selectedExam?.examSubjects) return null;

    if (useTeacherFlow && filters.assignmentId) {
      const [classSubjectId] = filters.assignmentId.split("-");
      return selectedExam.examSubjects.find(
        (es) => es.classSubjectId?.toString() === classSubjectId,
      );
    } else if (filters.subjectId) {
      return selectedExam.examSubjects.find(
        (es) => es.id?.toString() === filters.subjectId,
      );
    }
    return null;
  }, [selectedExam, filters.assignmentId, filters.subjectId, useTeacherFlow]);

  // EXAM_OFFICER/ADMIN: Available classes from exam
  const availableClasses = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects) return [];

    const classMap = new Map();
    selectedExam.examSubjects.forEach((es) => {
      const cls = es.classSubject?.class;
      if (cls && !classMap.has(cls.id)) {
        classMap.set(cls.id, {
          id: cls.id,
          name: cls.name,
          gradeLevel: cls.gradeLevel,
        });
      }
    });

    return Array.from(classMap.values()).sort(
      (a, b) => a.gradeLevel - b.gradeLevel,
    );
  }, [selectedExam, useTeacherFlow]);

  // EXAM_OFFICER/ADMIN: Available sections for selected class
  const availableSections = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects || !filters.classId)
      return [];

    const sectionMap = new Map();
    selectedExam.examSubjects.forEach((es) => {
      if (es.classSubject?.classId?.toString() === filters.classId) {
        (es.sections || []).forEach((sec) => {
          if (!sectionMap.has(sec.id)) {
            sectionMap.set(sec.id, { id: sec.id, name: sec.name });
          }
        });
      }
    });

    return Array.from(sectionMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [selectedExam, filters.classId, useTeacherFlow]);

  // EXAM_OFFICER/ADMIN: Available subjects for selected class
  const availableSubjects = useMemo(() => {
    if (useTeacherFlow || !selectedExam?.examSubjects || !filters.classId)
      return [];

    return selectedExam.examSubjects
      .filter((es) => es.classSubject?.classId?.toString() === filters.classId)
      .map((es) => ({
        examSubjectId: es.id,
        subjectName: es.classSubject?.subject?.name,
        hasPractical: es.hasPractical === true,
        theoryFullMarks: es.theoryFullMarks || es.fullMarks || 100,
        practicalFullMarks: es.practicalFullMarks || 0,
      }))
      .sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
  }, [selectedExam, filters.classId, useTeacherFlow]);

  // Check if current class is NEB (Grade 11-12)
  const isNEBClass = useMemo(() => {
    if (useTeacherFlow && filters.assignmentId) {
      const assignment = teacherAssignmentOptions.find(
        (a) => a.value === filters.assignmentId,
      );
      return assignment && assignment.gradeLevel >= 11;
    } else if (!useTeacherFlow && filters.classId) {
      const cls = availableClasses.find(
        (c) => c.id?.toString() === filters.classId,
      );
      return cls && cls.gradeLevel >= 11;
    }
    return false;
  }, [
    useTeacherFlow,
    filters.assignmentId,
    filters.classId,
    teacherAssignmentOptions,
    availableClasses,
  ]);

  // Marks structure
  const hasTheory = currentExamSubject?.hasTheory !== false;
  const hasPractical = currentExamSubject?.hasPractical === true;
  const theoryMax =
    currentExamSubject?.theoryFullMarks || currentExamSubject?.fullMarks || 100;
  const practicalMax = currentExamSubject?.practicalFullMarks || 0;

  // ==================== HANDLERS ====================

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [field]: value };

      // Reset dependent fields
      if (field === "examId") {
        newFilters.assignmentId = "";
        newFilters.classId = "";
        newFilters.sectionId = "";
        newFilters.subjectId = "";
        newFilters.programId = "";
      } else if (field === "classId") {
        newFilters.sectionId = "";
        newFilters.subjectId = "";
        newFilters.programId = "";
      } else if (field === "sectionId" || field === "subjectId") {
        newFilters.programId = "";
      }

      return newFilters;
    });
  };

  const updateMarks = (studentId, field, value) => {
    setMarksData((prev) =>
      prev.map((m) =>
        m.studentId === studentId ? { ...m, [field]: value } : m,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine examSubjectId based on flow
      let examSubjectId, sectionId;

      if (useTeacherFlow) {
        const [classSubjectId, secId] = filters.assignmentId.split("-");
        sectionId = secId;
        // Find examSubject from classSubjectId
        const examSubject = selectedExam?.examSubjects?.find(
          (es) => es.classSubjectId?.toString() === classSubjectId,
        );
        if (!examSubject) {
          alert("Exam subject not found for your assignment.");
          setSaving(false);
          return;
        }
        examSubjectId = examSubject.id;
      } else {
        examSubjectId = parseInt(filters.subjectId);
        sectionId = filters.sectionId;
      }

      const resultsToSave = marksData
        .filter((m) => m.marksObtained !== "" || m.isAbsent)
        .map((m) => ({
          studentId: m.studentId,
          marksObtained: m.isAbsent ? 0 : parseFloat(m.marksObtained) || 0,
          practicalMarks: m.isAbsent ? 0 : parseFloat(m.practicalMarks) || 0,
          isAbsent: m.isAbsent,
          remarks: m.remarks || "",
        }));

      if (resultsToSave.length === 0) {
        alert("Please enter marks for at least one student before saving.");
        setSaving(false);
        return;
      }

      await examService.saveResults({
        examSubjectId,
        sectionId: parseInt(sectionId),
        results: resultsToSave,
      });

      alert("Marks saved successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      alert(error.response?.data?.message || "Error saving marks");
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER ====================

  // Check if user has any valid role for this page
  if (!isTeacher && !isExamOfficer && !isAdmin) {
    return (
      <div className="page-container">
        <div
          className="card text-center"
          style={{ padding: "2rem", color: "#dc2626" }}
        >
          <AlertCircle size={32} style={{ marginBottom: "0.5rem" }} />
          <p>You do not have permission to access marks entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Marks Entry</h1>
          <p className="text-muted">
            {useTeacherFlow
              ? "Enter marks for your assigned subjects"
              : "Enter exam marks for any subject (Exam Officer/Admin)"}
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card filter-card">
        <div
          className="filter-row"
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
        >
          {/* 1. Exam Selection (Both flows) */}
          <div className="form-group" style={{ minWidth: "200px", flex: 1 }}>
            <label>
              <BookOpen size={14} style={{ marginRight: "4px" }} />
              Exam
            </label>
            <select
              value={filters.examId}
              onChange={(e) => handleFilterChange("examId", e.target.value)}
              disabled={loadingExams}
            >
              <option value="">
                {loadingExams ? "Loading..." : "Select Exam"}
              </option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* TEACHER FLOW: Single dropdown for their assignments */}
          {useTeacherFlow && (
            <div className="form-group" style={{ minWidth: "300px", flex: 2 }}>
              <label>Your Class - Section - Subject</label>
              <select
                value={filters.assignmentId}
                onChange={(e) =>
                  handleFilterChange("assignmentId", e.target.value)
                }
                disabled={!filters.examId || loadingAssignments}
              >
                <option value="">
                  {loadingAssignments ? "Loading..." : "Select your assignment"}
                </option>
                {teacherAssignmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {filters.examId &&
                teacherAssignmentOptions.length === 0 &&
                !loadingAssignments && (
                  <small
                    style={{
                      color: "#dc2626",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    No subjects assigned to you for this exam
                  </small>
                )}
            </div>
          )}

          {/* EXAM_OFFICER/ADMIN FLOW: Cascading dropdowns */}
          {!useTeacherFlow && (
            <>
              {/* 2. Class Selection */}
              <div
                className="form-group"
                style={{ minWidth: "150px", flex: 1 }}
              >
                <label>Class</label>
                <select
                  value={filters.classId}
                  onChange={(e) =>
                    handleFilterChange("classId", e.target.value)
                  }
                  disabled={!filters.examId || availableClasses.length === 0}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gradeLevel >= 11 ? "(NEB)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Section Selection */}
              <div
                className="form-group"
                style={{ minWidth: "120px", flex: 1 }}
              >
                <label>Section</label>
                <select
                  value={filters.sectionId}
                  onChange={(e) =>
                    handleFilterChange("sectionId", e.target.value)
                  }
                  disabled={!filters.classId || availableSections.length === 0}
                >
                  <option value="">Select Section</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Subject Selection */}
              <div
                className="form-group"
                style={{ minWidth: "200px", flex: 1 }}
              >
                <label>Subject</label>
                <select
                  value={filters.subjectId}
                  onChange={(e) =>
                    handleFilterChange("subjectId", e.target.value)
                  }
                  disabled={!filters.classId || availableSubjects.length === 0}
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((s) => (
                    <option key={s.examSubjectId} value={s.examSubjectId}>
                      {s.subjectName} {s.hasPractical ? "(Th+Pr)" : "(Th)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Program Selection - Only for NEB */}
              {isNEBClass && filters.subjectId && (
                <div
                  className="form-group"
                  style={{ minWidth: "180px", flex: 1 }}
                >
                  <label>
                    <Layers size={14} style={{ marginRight: "4px" }} />
                    Program
                  </label>
                  <select
                    value={filters.programId}
                    onChange={(e) =>
                      handleFilterChange("programId", e.target.value)
                    }
                    disabled={loadingPrograms}
                  >
                    <option value="">
                      {loadingPrograms ? "Loading..." : "Select Program"}
                    </option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* NEB Info Banner */}
        {isNEBClass && (
          <div
            style={{
              marginTop: "1rem",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <GraduationCap size={18} style={{ color: "#92400e" }} />
            <span style={{ color: "#92400e", fontSize: "0.9em" }}>
              <strong>NEB Grade 11-12:</strong> Only students enrolled in this
              specific subject will appear.
            </span>
          </div>
        )}
      </div>

      {/* Students & Marks Entry Card */}
      {((useTeacherFlow && filters.assignmentId) ||
        (!useTeacherFlow &&
          filters.subjectId &&
          (!isNEBClass || filters.programId))) && (
        <div className="card">
          {/* Subject Info Header */}
          {currentExamSubject && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {currentExamSubject.classSubject?.subject?.name}
              </span>
              {hasTheory && (
                <span className="badge badge-info">
                  Theory: {theoryMax} marks
                </span>
              )}
              {hasPractical && (
                <span className="badge badge-success">
                  Practical: {practicalMax} marks
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  color: "#6b7280",
                  fontSize: "0.9em",
                }}
              >
                <Users size={14} style={{ marginRight: "4px" }} />
                {marksData.length} students
              </span>
            </div>
          )}

          {/* Loading/Empty States */}
          {loadingStudents ? (
            <div className="text-center" style={{ padding: "2rem" }}>
              Loading students...
            </div>
          ) : marksData.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: "2rem" }}>
              No students found for this selection.
              {isNEBClass && " Ensure students are enrolled in this subject."}
            </div>
          ) : (
            <>
              {/* Marks Table Header */}
              <div className="marks-header">
                <span className="col-roll">Roll</span>
                <span className="col-name">Student Name</span>
                {hasTheory && <span className="col-marks">Theory</span>}
                {hasPractical && <span className="col-marks">Practical</span>}
                <span className="col-absent">Absent</span>
                <span className="col-remarks">Remarks</span>
              </div>

              {/* Marks List */}
              <div className="marks-list">
                {marksData.map((record) => (
                  <div key={record.studentId} className="marks-row">
                    <span className="col-roll">{record.rollNumber || "-"}</span>
                    <span className="col-name">{record.studentName}</span>
                    {hasTheory && (
                      <input
                        type="number"
                        value={record.marksObtained}
                        onChange={(e) =>
                          updateMarks(
                            record.studentId,
                            "marksObtained",
                            e.target.value,
                          )
                        }
                        min="0"
                        max={theoryMax}
                        className="marks-input"
                        disabled={record.isAbsent}
                        placeholder={`/${theoryMax}`}
                      />
                    )}
                    {hasPractical && (
                      <input
                        type="number"
                        value={record.practicalMarks}
                        onChange={(e) =>
                          updateMarks(
                            record.studentId,
                            "practicalMarks",
                            e.target.value,
                          )
                        }
                        min="0"
                        max={practicalMax}
                        className="marks-input"
                        disabled={record.isAbsent}
                        placeholder={`/${practicalMax}`}
                      />
                    )}
                    <label className="col-absent checkbox-inline">
                      <input
                        type="checkbox"
                        checked={record.isAbsent}
                        onChange={(e) =>
                          updateMarks(
                            record.studentId,
                            "isAbsent",
                            e.target.checked,
                          )
                        }
                      />{" "}
                      Abs
                    </label>
                    <input
                      type="text"
                      value={record.remarks}
                      onChange={(e) =>
                        updateMarks(record.studentId, "remarks", e.target.value)
                      }
                      placeholder="Remarks"
                      className="col-remarks remarks-input"
                    />
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="marks-actions" style={{ marginTop: "1rem" }}>
                <Button icon={Save} loading={saving} onClick={handleSave}>
                  Save Marks
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Prompt messages */}
      {filters.examId &&
        useTeacherFlow &&
        !filters.assignmentId &&
        teacherAssignmentOptions.length > 0 && (
          <div
            className="card text-center"
            style={{ padding: "2rem", color: "#6b7280" }}
          >
            <BookOpen
              size={32}
              style={{ marginBottom: "0.5rem", opacity: 0.5 }}
            />
            <p>Select your class-section-subject assignment to enter marks</p>
          </div>
        )}

      {!useTeacherFlow && filters.examId && !filters.subjectId && (
        <div
          className="card text-center"
          style={{ padding: "2rem", color: "#6b7280" }}
        >
          <BookOpen
            size={32}
            style={{ marginBottom: "0.5rem", opacity: 0.5 }}
          />
          <p>Select Class, Section, and Subject to begin marks entry</p>
        </div>
      )}

      {!useTeacherFlow &&
        isNEBClass &&
        filters.subjectId &&
        !filters.programId && (
          <div
            className="card text-center"
            style={{ padding: "2rem", color: "#92400e", background: "#fef3c7" }}
          >
            <Layers size={32} style={{ marginBottom: "0.5rem" }} />
            <p>
              <strong>Select a Program</strong> to view students for Grade 11-12
            </p>
          </div>
        )}
    </div>
  );
};

export default MarksEntry;
