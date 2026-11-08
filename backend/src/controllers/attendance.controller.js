const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const { normalizeLayout } = require("../utils/reportCardLayout");
const { tally, rateOf, byBsMonth } = require("../utils/attendanceRate");

const isAdminUser = (user) =>
  user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN");

const getCurrentAcademicYear = (schoolId) =>
  prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  });

/**
 * @desc    Get attendance for a class-section on a specific date
 * @route   GET /api/v1/attendance
 * @access  Private/Admin/Teacher
 */
const getAttendance = asyncHandler(async (req, res) => {
  const { classId, sectionId, date, academicYearId } = req.query;

  if (!classId || !sectionId || !date) {
    throw ApiError.badRequest("Class ID, Section ID, and Date are required");
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Validate class and section belong to school
  const classRecord = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
  });
  if (!classRecord) {
    throw ApiError.notFound(
      "Class not found or does not belong to your school"
    );
  }

  const sectionRecord = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
  });
  if (!sectionRecord) {
    throw ApiError.notFound(
      "Section not found or does not belong to your school"
    );
  }

  // Build where clause for students in this class/section/year
  const studentWhere = {
    classId: parseInt(classId),
    sectionId: parseInt(sectionId),
    academicYearId: academicYearId ? parseInt(academicYearId) : undefined,
    status: "active",
    student: {
      user: {
        schoolId: req.user.schoolId, // School-level isolation
      },
    },
  };

  if (!academicYearId) {
    studentWhere.academicYear = {
      isCurrent: true,
      schoolId: req.user.schoolId, // Ensure academic year belongs to school
    };
  } else {
    // Validate academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: parseInt(academicYearId), schoolId: req.user.schoolId },
    });
    if (!academicYear) {
      throw ApiError.notFound(
        "Academic year not found or does not belong to your school"
      );
    }
  }

  // Get all students enrolled in this section
  const enrollments = await prisma.studentClass.findMany({
    where: studentWhere,
    include: {
      student: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      attendances: {
        where: { attendanceDate },
      },
    },
    orderBy: { rollNumber: "asc" },
  });

  const formattedAttendance = enrollments.map((e) => ({
    studentClassId: e.id,
    studentId: e.studentId,
    rollNumber: e.rollNumber,
    firstName: e.student.user.firstName,
    lastName: e.student.user.lastName,
    status: e.attendances[0]?.status || null,
    remarks: e.attendances[0]?.remarks || "",
    attendanceId: e.attendances[0]?.id || null,
  }));

  ApiResponse.success(res, formattedAttendance);
});

/**
 * @desc    Bulk mark/update attendance for a class-section
 * @route   POST /api/v1/attendance
 * @access  Private/Admin/Teacher (Teacher must be assigned)
 */
const markAttendance = asyncHandler(async (req, res) => {
  const { classId, sectionId, date, attendanceRecords } = req.body;

  if (!classId || !sectionId || !date || !Array.isArray(attendanceRecords)) {
    throw ApiError.badRequest(
      "Missing required fields or invalid records format"
    );
  }

  // Validate class and section belong to school
  const classRecord = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
  });
  if (!classRecord) {
    throw ApiError.notFound(
      "Class not found or does not belong to your school"
    );
  }

  const sectionRecord = await prisma.section.findFirst({
    where: { id: parseInt(sectionId), schoolId: req.user.schoolId },
  });
  if (!sectionRecord) {
    throw ApiError.notFound(
      "Section not found or does not belong to your school"
    );
  }

  // Attendance is always marked against the current academic year's enrollment
  const currentYear = await getCurrentAcademicYear(req.user.schoolId);
  if (!currentYear) {
    throw ApiError.badRequest("No current academic year is set for your school");
  }

  // Defense-in-depth: Verify teacher is assigned to this class/section this year (if teacher role)
  if (req.user.roles.includes("TEACHER") && !isAdminUser(req.user)) {
    const teacherAssignment = await prisma.teacherSubject.findFirst({
      where: {
        userId: req.user.id,
        academicYearId: currentYear.id,
        sectionId: parseInt(sectionId),
        classSubject: {
          classId: parseInt(classId),
        },
      },
    });

    if (!teacherAssignment) {
      throw ApiError.forbidden(
        "You are not assigned to this class/section. Cannot mark attendance."
      );
    }
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Start transaction for bulk marking
  const results = await prisma.$transaction(async (tx) => {
    const records = [];

    for (const record of attendanceRecords) {
      const { studentId, studentClassId, status, remarks } = record;

      // Build where clause
      const whereInput = {
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        sectionId: parseInt(sectionId),
        academicYearId: currentYear.id,
        student: {
          user: {
            schoolId: req.user.schoolId,
          },
        },
      };

      if (studentClassId && !isNaN(parseInt(studentClassId))) {
        whereInput.id = parseInt(studentClassId);
      }

      // Validate student belongs to school and is in the correct class/section
      const studentClass = await tx.studentClass.findFirst({
        where: whereInput,
      });

      if (!studentClass) {
        throw ApiError.badRequest(
          `Student ${studentId} not found in class ${classId} section ${sectionId} or does not belong to your school`
        );
      }

      // Upsert attendance record
      const attendance = await tx.attendance.upsert({
        where: {
          studentId_studentClassId_attendanceDate: {
            studentId: parseInt(studentId),
            studentClassId: studentClass.id,
            attendanceDate,
          },
        },
        update: {
          status,
          remarks: remarks || null,
          markedBy: req.user.id,
          studentClassId: studentClass.id,
          schoolId: req.user.schoolId,
        },
        create: {
          studentId: parseInt(studentId),
          studentClassId: studentClass.id,
          schoolId: req.user.schoolId,
          attendanceDate,
          status,
          remarks: remarks || null,
          markedBy: req.user.id,
        },
      });
      records.push(attendance);
    }
    return records;
  });

  ApiResponse.success(res, results, "Attendance marked successfully");
});

/**
 * @desc    Get attendance summary for a student
 * @route   GET /api/v1/attendance/student/:studentId
 * @access  Private/Admin/Teacher/Student/Parent
 */
const getStudentAttendanceSummary = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { academicYearId } = req.query;

  // Validate student belongs to school
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      user: {
        schoolId: req.user.schoolId, // School-level isolation
      },
    },
  });

  if (!student) {
    throw ApiError.notFound(
      "Student not found or does not belong to your school"
    );
  }

  // Teachers: canAccessAttendance only checks the classId/sectionId in the query,
  // not that :studentId is in that class. Require that the student is actively
  // enrolled this year in a class+section the teacher is assigned to this year.
  // A teacher who is also this student (or a linked parent) keeps that access.
  if (req.user.roles.includes("TEACHER") && !isAdminUser(req.user)) {
    const isSelf =
      req.user.roles.includes("STUDENT") && req.user.studentId === studentId;
    const isLinkedParent =
      req.user.roles.includes("PARENT") &&
      req.user.parentId &&
      (await prisma.studentParent.findFirst({
        where: { parentId: req.user.parentId, studentId },
        select: { id: true },
      }));

    if (!isSelf && !isLinkedParent) {
      const currentYear = await getCurrentAcademicYear(req.user.schoolId);
      const enrollment = currentYear
        ? await prisma.studentClass.findFirst({
            where: {
              studentId,
              academicYearId: currentYear.id,
              status: "active",
            },
            select: { classId: true, sectionId: true },
          })
        : null;

      const teachesStudent =
        enrollment &&
        (await prisma.teacherSubject.findFirst({
          where: {
            userId: req.user.id,
            academicYearId: currentYear.id,
            sectionId: enrollment.sectionId,
            classSubject: {
              classId: enrollment.classId,
              class: { schoolId: req.user.schoolId },
            },
          },
          select: { id: true },
        }));

      if (!teachesStudent) {
        throw ApiError.forbidden(
          "You are not assigned to this student's class/section"
        );
      }
    }
  }

  const where = {
    studentId,
    studentClass: {
      student: {
        user: {
          schoolId: req.user.schoolId, // Additional school filter
        },
      },
    },
  };

  if (academicYearId) {
    where.studentClass.academicYearId = parseInt(academicYearId);
    where.studentClass.academicYear = {
      schoolId: req.user.schoolId, // Ensure academic year belongs to school
    };
  } else {
    where.studentClass.academicYear = {
      isCurrent: true,
      schoolId: req.user.schoolId, // Ensure academic year belongs to school
    };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    orderBy: { attendanceDate: "desc" },
  });

  // The same "late counts as present" rule as the school's report cards, so
  // the % here matches the printed card.
  const school = await prisma.school.findUnique({ where: { id: req.user.schoolId }, select: { reportCardConfig: true } });
  const rule = { countLateAsPresent: normalizeLayout(school?.reportCardConfig).countLateAsPresent !== false };
  const counts = tally(attendances);
  const { attended, percentage } = rateOf(counts, rule);
  const summary = { ...counts, attended, percentage: percentage.toFixed(2), countLateAsPresent: rule.countLateAsPresent };

  ApiResponse.success(res, { summary, byMonth: byBsMonth(attendances, rule), attendances });
});

module.exports = {
  getAttendance,
  markAttendance,
  getStudentAttendanceSummary,
};
