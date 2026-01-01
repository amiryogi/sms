const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

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

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Start transaction for bulk marking
  const results = await prisma.$transaction(async (tx) => {
    const records = [];

    for (const record of attendanceRecords) {
      const { studentId, studentClassId, status, remarks } = record;

      // Validate student belongs to school and is in the correct class/section
      const studentClass = await tx.studentClass.findFirst({
        where: {
          id: parseInt(studentClassId),
          studentId: parseInt(studentId),
          classId: parseInt(classId),
          sectionId: parseInt(sectionId),
          student: {
            user: {
              schoolId: req.user.schoolId, // School-level isolation
            },
          },
        },
      });

      if (!studentClass) {
        throw ApiError.badRequest(
          `Student ${studentId} not found in class ${classId} section ${sectionId} or does not belong to your school`
        );
      }

      // Upsert attendance record
      const attendance = await tx.attendance.upsert({
        where: {
          studentId_attendanceDate: {
            studentId: parseInt(studentId),
            attendanceDate,
          },
        },
        update: {
          status,
          remarks: remarks || null,
          markedBy: req.user.id,
          studentClassId: parseInt(studentClassId),
        },
        create: {
          studentId: parseInt(studentId),
          studentClassId: parseInt(studentClassId),
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

  const summary = attendances.reduce(
    (acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
  );

  summary.percentage =
    summary.total > 0
      ? ((summary.present / summary.total) * 100).toFixed(2)
      : 0;

  ApiResponse.success(res, { summary, attendances });
});

module.exports = {
  getAttendance,
  markAttendance,
  getStudentAttendanceSummary,
};
