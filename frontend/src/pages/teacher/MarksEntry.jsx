import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Select, Button } from "../../components/common/FormElements";
import { Save, GraduationCap, AlertCircle } from "lucide-react";
import { examService } from "../../api/examService";
import { teacherService } from "../../api/teacherService";

const MarksEntry = () => {
  const { user, hasRole } = useAuth();
  const [exams, setExams] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    examId: "",
    classSubjectId: "",
    sectionId: "",
  });

  // Check if user is EXAM_OFFICER (not TEACHER or ADMIN)
  const isExamOfficer =
    hasRole("EXAM_OFFICER") && !hasRole("TEACHER") && !hasRole("ADMIN");
  const isTeacher = hasRole("TEACHER");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.examId && filters.classSubjectId && filters.sectionId) {
      fetchStudentsAndMarks();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      // Use unified endpoint that works for all roles (Teacher, EXAM_OFFICER, Admin)
      const examsRes = await examService.getExamsForMarksEntry();

      // Filter out only PUBLISHED exams (backend should handle this, but safety first)
      const publishedExams = (examsRes.data || []).filter(
        (e) => e.status === "PUBLISHED",
      );
      setExams(publishedExams);

      // For TEACHER role, also fetch their assignments for filtering
      // EXAM_OFFICER doesn't need assignments - they can access all subjects
      if (isTeacher) {
        const assignmentsRes = await teacherService.getTeacherAssignments({
          userId: user?.id,
        });
        setTeacherAssignments(assignmentsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      // Find exam subject ID
      const exam = exams.find((e) => e.id?.toString() === filters.examId);
      const examSubject = exam?.examSubjects?.find(
        (es) => es.classSubjectId?.toString() === filters.classSubjectId,
      );

      if (examSubject) {
        // Get existing results or student list for entry
        let marks = [];

        try {
          // Try fetching existing results first
          const resultsRes = await examService.getResultsBySubject(
            examSubject.id,
            filters.sectionId,
          );
          const { results } = resultsRes.data;

          if (results && results.length > 0) {
            marks = results.map((r) => ({
              studentId: r.student.id,
              studentName: `${r.student.user?.firstName} ${r.student.user?.lastName}`,
              marksObtained: r.isAbsent ? "" : r.marksObtained || "",
              practicalMarks: r.isAbsent ? "" : r.practicalMarks || "",
              isAbsent: r.isAbsent || false,
              remarks: r.remarks || "",
            }));
          }
        } catch (err) {
          // If 404 or no results, we'll fetch student list next
        }

        // If no existing marks, fetch students for initial entry
        if (marks.length === 0) {
          const studentsRes = await examService.getStudentsForMarksEntry(
            examSubject.id,
            filters.sectionId,
          );
          const studentList = studentsRes.data?.students || [];

          marks = studentList.map((s) => ({
            studentId: s.studentId,
            studentName: `${s.firstName} ${s.lastName}`,
            marksObtained: "",
            practicalMarks: "",
            isAbsent: false,
            remarks: "",
          }));
        }

        setMarksData(marks);
      }
    } catch (error) {
      console.error("Error fetching marks data:", error);
      setMarksData([]);
    } finally {
      setLoading(false);
    }
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
      const exam = exams.find((e) => e.id?.toString() === filters.examId);
      const examSubject = exam?.examSubjects?.find(
        (es) => es.classSubjectId?.toString() === filters.classSubjectId,
      );

      if (!examSubject) {
        alert(
          "Exam subject not found. Please ensure the exam includes this subject.",
        );
        return;
      }

      const resultsToSave = marksData
        .filter((m) => m.marksObtained !== "" || m.isAbsent) // Send only entered data
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
        examSubjectId: examSubject.id,
        sectionId: parseInt(filters.sectionId),
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

  const examOptions = exams.map((e) => ({
    value: e.id.toString(),
    label: e.name,
  }));

  // Build class/subject/section options based on role
  // TEACHER: Use their assignments
  // EXAM_OFFICER/ADMIN: Use exam subjects directly from selected exam
  const getClassSubjectSectionOptions = () => {
    if (isTeacher && teacherAssignments.length > 0) {
      // For teachers, filter by their assignments
      return teacherAssignments.map((ta) => ({
        value: `${ta.classSubjectId}-${ta.sectionId}`,
        label: `${ta.classSubject?.class?.name} ${ta.section?.name} - ${ta.classSubject?.subject?.name}`,
      }));
    }

    // For EXAM_OFFICER/ADMIN: Build options from the selected exam's subjects
    if (!filters.examId) return [];

    const selectedExamForOptions = exams.find(
      (e) => e.id?.toString() === filters.examId,
    );
    if (!selectedExamForOptions?.examSubjects) return [];

    const options = [];
    selectedExamForOptions.examSubjects.forEach((es) => {
      // Get sections from the exam subject (backend provides assignedSectionIds or sections)
      const sectionIds =
        es.assignedSectionIds || es.sections?.map((s) => s.id) || [];
      const sections = es.sections || [];

      sectionIds.forEach((sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        const sectionName = section?.name || `Section ${sectionId}`;
        options.push({
          value: `${es.classSubjectId}-${sectionId}`,
          label: `${es.classSubject?.class?.name} ${sectionName} - ${es.classSubject?.subject?.name}`,
        });
      });
    });

    return options;
  };

  const classSubjectSectionOptions = getClassSubjectSectionOptions();

  const selectedExam = exams.find((e) => e.id?.toString() === filters.examId);
  /* Find the specific exam subject to get max marks config */
  const currentExamSubject = selectedExam?.examSubjects?.find(
    (es) => es.classSubjectId?.toString() === filters.classSubjectId,
  );

  // Check if this is NEB class (Grade 11-12) with component data
  const isNEBClass = currentExamSubject?.isNEBClass || false;
  const nebComponents = currentExamSubject?.nebComponents || [];
  const theoryComponent = nebComponents.find((c) => c.type === "THEORY");
  const practicalComponent = nebComponents.find((c) => c.type === "PRACTICAL");

  // Use ExamSubject flags as single source of truth for evaluation structure
  // For NEB classes, use SubjectComponent data if available
  const hasPractical =
    isNEBClass && nebComponents.length > 0
      ? !!practicalComponent
      : currentExamSubject?.hasPractical === true ||
        (currentExamSubject?.practicalFullMarks ?? 0) > 0;
  const hasTheory =
    isNEBClass && nebComponents.length > 0
      ? !!theoryComponent
      : currentExamSubject?.hasTheory !== false;

  // For NEB classes, use SubjectComponent marks; otherwise use ExamSubject marks
  const theoryMax =
    isNEBClass && theoryComponent
      ? theoryComponent.fullMarks
      : hasTheory
        ? currentExamSubject?.theoryFullMarks || 100
        : 0;
  const practicalMax =
    isNEBClass && practicalComponent
      ? practicalComponent.fullMarks
      : hasPractical
        ? currentExamSubject?.practicalFullMarks || 0
        : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Marks Entry</h1>
          <p className="text-muted">
            {isExamOfficer
              ? "Enter exam marks for any subject (Exam Officer)"
              : "Enter exam marks for your assigned subjects"}
          </p>
        </div>
      </div>

      <div className="card filter-card">
        <div className="filter-row">
          <Select
            label="Exam"
            name="examId"
            options={examOptions}
            value={filters.examId}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                examId: e.target.value,
                // Reset class/subject/section when exam changes (for EXAM_OFFICER)
                classSubjectId: isExamOfficer ? "" : prev.classSubjectId,
                sectionId: isExamOfficer ? "" : prev.sectionId,
              }))
            }
            placeholder="Select Exam"
          />
          <div className="form-group">
            <label>Class - Section - Subject</label>
            <select
              value={
                filters.classSubjectId
                  ? `${filters.classSubjectId}-${filters.sectionId}`
                  : ""
              }
              onChange={(e) => {
                const [classSubjectId, sectionId] = e.target.value.split("-");
                setFilters((prev) => ({ ...prev, classSubjectId, sectionId }));
              }}
            >
              <option value="">Select...</option>
              {classSubjectSectionOptions.map((opt, i) => (
                <option key={i} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filters.examId && filters.classSubjectId && (
        <div className="card">
          {loading ? (
            <div className="text-center">Loading students...</div>
          ) : marksData.length === 0 ? (
            <div className="text-muted text-center">No students found.</div>
          ) : (
            <>
              {/* NEB Info Banner for Grade 11-12 */}
              {isNEBClass && nebComponents.length > 0 && (
                <div
                  className="neb-info"
                  style={{
                    background: "#fef3c7",
                    border: "1px solid #fcd34d",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <GraduationCap size={18} style={{ color: "#92400e" }} />
                  <span style={{ fontWeight: 500, color: "#92400e" }}>
                    NEB Class (Grade 11-12)
                  </span>
                  <span style={{ color: "#78350f", fontSize: "0.9em" }}>
                    Using NEB subject component structure with credit-weighted
                    GPA
                  </span>
                </div>
              )}

              {/* Evaluation Structure Info Banner */}
              <div
                className="eval-info"
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
                <span style={{ fontWeight: 500 }}>Evaluation Structure:</span>
                {hasTheory && (
                  <span className="badge badge-info">
                    Theory: {theoryMax} marks
                    {isNEBClass && theoryComponent && (
                      <span style={{ marginLeft: "6px", opacity: 0.8 }}>
                        ({theoryComponent.subjectCode} •{" "}
                        {theoryComponent.creditHours} cr)
                      </span>
                    )}
                  </span>
                )}
                {hasPractical && (
                  <span className="badge badge-success">
                    Practical: {practicalMax} marks
                    {isNEBClass && practicalComponent && (
                      <span style={{ marginLeft: "6px", opacity: 0.8 }}>
                        ({practicalComponent.subjectCode} •{" "}
                        {practicalComponent.creditHours} cr)
                      </span>
                    )}
                  </span>
                )}
                {!hasTheory && !hasPractical && (
                  <span className="badge badge-warning">
                    No evaluation configured
                  </span>
                )}
              </div>

              <div className="marks-header">
                <span>Student</span>
                {hasTheory && <span>Theory (Max: {theoryMax})</span>}
                {hasPractical && <span>Practical (Max: {practicalMax})</span>}
                <span>Absent</span>
                <span>Remarks</span>
              </div>
              <div className="marks-list">
                {marksData.map((record) => (
                  <div key={record.studentId} className="marks-row">
                    <span className="student-name">{record.studentName}</span>
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
                        placeholder="Theory"
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
                        placeholder="Prac."
                      />
                    )}
                    <label className="checkbox-inline">
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
                      Absent
                    </label>
                    <input
                      type="text"
                      value={record.remarks}
                      onChange={(e) =>
                        updateMarks(record.studentId, "remarks", e.target.value)
                      }
                      placeholder="Remarks"
                      className="remarks-input"
                    />
                  </div>
                ))}
              </div>
              <div className="marks-actions">
                <Button icon={Save} loading={saving} onClick={handleSave}>
                  Save Marks
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MarksEntry;
