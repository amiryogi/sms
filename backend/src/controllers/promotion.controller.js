const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, parsePagination } = require('../utils');

/**
 * @desc    Get promotion history
 * @route   GET /api/v1/promotions
 * @access  Private/Admin
 */
const getPromotionHistory = asyncHandler(async (req, res) => {
  const { studentId, fromAcademicYearId, toAcademicYearId, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};

  // Filter by student (must belong to school)
  if (studentId) {
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), schoolId: req.user.schoolId },
    });
    if (!student) {
      throw ApiError.notFound('Student not found');
    }
    where.studentId = parseInt(studentId);
  } else {
    // If no studentId, filter all promotions for students in this school
    where.student = { schoolId: req.user.schoolId };
  }

  if (fromAcademicYearId) {
    where.fromAcademicYearId = parseInt(fromAcademicYearId);
  }
  if (toAcademicYearId) {
    where.toAcademicYearId = parseInt(toAcademicYearId);
  }
  if (status) {
    where.status = status;
  }

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        fromClass: { select: { id: true, name: true, gradeLevel: true } },
        toClass: { select: { id: true, name: true, gradeLevel: true } },
        fromAcademicYear: { select: { id: true, name: true } },
        toAcademicYear: { select: { id: true, name: true } },
        processedByUser: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { processedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.promotion.count({ where }),
  ]);

  ApiResponse.paginated(res, promotions, { page, limit, total });
});

/**
 * @desc    Get eligible students for promotion
 * @route   GET /api/v1/promotions/eligible
 * @access  Private/Admin
 */
const getEligibleStudents = asyncHandler(async (req, res) => {
  const { classId, sectionId, academicYearId } = req.query;

  // Verify class belongs to school
  const classData = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
  });
  if (!classData) {
    throw ApiError.notFound('Class not found');
  }

  // Verify academic year belongs to school
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: parseInt(academicYearId), schoolId: req.user.schoolId },
  });
  if (!academicYear) {
    throw ApiError.notFound('Academic year not found');
  }

  // Build where clause for student class enrollments
  const enrollmentWhere = {
    classId: parseInt(classId),
    academicYearId: parseInt(academicYearId),
    status: 'active',
    student: { schoolId: req.user.schoolId },
  };

  if (sectionId) {
    enrollmentWhere.sectionId = parseInt(sectionId);
  }

  // Get enrolled students who haven't been promoted from this year yet
  const enrollments = await prisma.studentClass.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true, status: true },
          },
          promotions: {
            where: { fromAcademicYearId: parseInt(academicYearId) },
            select: { id: true, status: true, toAcademicYear: { select: { name: true } } },
          },
        },
      },
      class: { select: { id: true, name: true, gradeLevel: true } },
      section: { select: { id: true, name: true } },
    },
    orderBy: [{ section: { name: 'asc' } }, { rollNumber: 'asc' }],
  });

  // Mark students as already promoted or eligible
  const students = enrollments.map((enrollment) => {
    const existingPromotion = enrollment.student.promotions[0];
    return {
      studentId: enrollment.student.id,
      studentClassId: enrollment.id,
      admissionNumber: enrollment.student.admissionNumber,
      firstName: enrollment.student.user.firstName,
      lastName: enrollment.student.user.lastName,
      email: enrollment.student.user.email,
      userStatus: enrollment.student.user.status,
      rollNumber: enrollment.rollNumber,
      class: enrollment.class,
      section: enrollment.section,
      alreadyPromoted: !!existingPromotion,
      existingPromotion: existingPromotion || null,
    };
  });

  // Get next class options for promotion
  const nextClasses = await prisma.class.findMany({
    where: {
      schoolId: req.user.schoolId,
      gradeLevel: { gte: classData.gradeLevel },
    },
    include: {
      sections: { select: { id: true, name: true } },
    },
    orderBy: { gradeLevel: 'asc' },
  });

  // Get available academic years for target
  const academicYears = await prisma.academicYear.findMany({
    where: {
      schoolId: req.user.schoolId,
      startDate: { gte: academicYear.startDate },
    },
    orderBy: { startDate: 'asc' },
  });

  ApiResponse.success(res, {
    currentClass: classData,
    currentAcademicYear: academicYear,
    students,
    nextClasses,
    academicYears,
    eligibleCount: students.filter((s) => !s.alreadyPromoted).length,
    alreadyPromotedCount: students.filter((s) => s.alreadyPromoted).length,
  });
});

/**
 * @desc    Process single student promotion
 * @route   POST /api/v1/promotions
 * @access  Private/Admin
 */
const processPromotion = asyncHandler(async (req, res) => {
  const {
    studentId,
    fromClassId,
    fromAcademicYearId,
    toClassId,
    toSectionId,
    toAcademicYearId,
    status,
    rollNumber,
    remarks,
  } = req.body;

  // Validate student belongs to school
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: req.user.schoolId },
  });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Validate from class and academic year
  const [fromClass, fromAcademicYear] = await Promise.all([
    prisma.class.findFirst({ where: { id: fromClassId, schoolId: req.user.schoolId } }),
    prisma.academicYear.findFirst({ where: { id: fromAcademicYearId, schoolId: req.user.schoolId } }),
  ]);

  if (!fromClass) throw ApiError.notFound('From class not found');
  if (!fromAcademicYear) throw ApiError.notFound('From academic year not found');

  // Validate to academic year
  const toAcademicYear = await prisma.academicYear.findFirst({
    where: { id: toAcademicYearId, schoolId: req.user.schoolId },
  });
  if (!toAcademicYear) throw ApiError.notFound('Target academic year not found');

  // Validate to class (required for promoted/detained, null for graduated)
  let toClass = null;
  let toSection = null;

  if (status !== 'graduated') {
    if (!toClassId) {
      throw ApiError.badRequest('Target class is required for promotion/detention');
    }
    toClass = await prisma.class.findFirst({
      where: { id: toClassId, schoolId: req.user.schoolId },
    });
    if (!toClass) throw ApiError.notFound('Target class not found');

    if (toSectionId) {
      toSection = await prisma.section.findFirst({
        where: { id: toSectionId, classId: toClassId },
      });
      if (!toSection) throw ApiError.notFound('Target section not found');
    }
  }

  // Check if already promoted from this academic year
  const existingPromotion = await prisma.promotion.findFirst({
    where: { studentId, fromAcademicYearId },
  });
  if (existingPromotion) {
    throw ApiError.conflict('Student has already been processed for this academic year');
  }

  // Execute promotion in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create promotion record
    const promotion = await tx.promotion.create({
      data: {
        studentId,
        fromClassId,
        fromAcademicYearId,
        toClassId: toClass?.id || null,
        toAcademicYearId,
        status,
        remarks,
        processedBy: req.user.id,
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        fromClass: { select: { name: true } },
        toClass: { select: { name: true } },
        fromAcademicYear: { select: { name: true } },
        toAcademicYear: { select: { name: true } },
      },
    });

    // If promoted or detained, create new enrollment
    if (status !== 'graduated' && toClass) {
      // Mark old enrollment as inactive
      await tx.studentClass.updateMany({
        where: {
          studentId,
          academicYearId: fromAcademicYearId,
          status: 'active',
        },
        data: { status: 'inactive' },
      });

      // Check if enrollment already exists for target year
      const existingEnrollment = await tx.studentClass.findFirst({
        where: { studentId, academicYearId: toAcademicYearId },
      });

      if (!existingEnrollment) {
        // Get default section if not specified
        let targetSectionId = toSectionId;
        if (!targetSectionId) {
          const defaultSection = await tx.section.findFirst({
            where: { classId: toClass.id },
            orderBy: { name: 'asc' },
          });
          targetSectionId = defaultSection?.id;
        }

        if (targetSectionId) {
          await tx.studentClass.create({
            data: {
              studentId,
              classId: toClass.id,
              sectionId: targetSectionId,
              academicYearId: toAcademicYearId,
              schoolId: req.user.schoolId,
              rollNumber: rollNumber || null,
              status: 'active',
            },
          });
        }
      }
    } else if (status === 'graduated') {
      // Mark student as inactive/graduated
      await tx.studentClass.updateMany({
        where: { studentId, status: 'active' },
        data: { status: 'inactive' },
      });
    }

    return promotion;
  });

  ApiResponse.created(res, result, `Student ${status} successfully`);
});

/**
 * @desc    Bulk promote students
 * @route   POST /api/v1/promotions/bulk
 * @access  Private/Admin
 */
const bulkPromote = asyncHandler(async (req, res) => {
  const {
    fromClassId,
    fromSectionId,
    fromAcademicYearId,
    toClassId,
    toSectionId,
    toAcademicYearId,
    students,
  } = req.body;

  // Validate classes and academic years
  const [fromClass, toClass, fromAcademicYear, toAcademicYear] = await Promise.all([
    prisma.class.findFirst({ where: { id: fromClassId, schoolId: req.user.schoolId } }),
    prisma.class.findFirst({ where: { id: toClassId, schoolId: req.user.schoolId } }),
    prisma.academicYear.findFirst({ where: { id: fromAcademicYearId, schoolId: req.user.schoolId } }),
    prisma.academicYear.findFirst({ where: { id: toAcademicYearId, schoolId: req.user.schoolId } }),
  ]);

  if (!fromClass) throw ApiError.notFound('From class not found');
  if (!toClass) throw ApiError.notFound('To class not found');
  if (!fromAcademicYear) throw ApiError.notFound('From academic year not found');
  if (!toAcademicYear) throw ApiError.notFound('To academic year not found');

  // Get target section
  let targetSectionId = toSectionId;
  if (!targetSectionId) {
    const defaultSection = await prisma.section.findFirst({
      where: { classId: toClassId },
      orderBy: { name: 'asc' },
    });
    targetSectionId = defaultSection?.id;
  }

  if (!targetSectionId) {
    throw ApiError.badRequest('No section available for target class');
  }

  // Validate all students belong to school
  const studentIds = students.map((s) => s.studentId);
  const validStudents = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId: req.user.schoolId },
    select: { id: true },
  });

  if (validStudents.length !== studentIds.length) {
    throw ApiError.badRequest('Some students not found or do not belong to this school');
  }

  // Check for already promoted students
  const alreadyPromoted = await prisma.promotion.findMany({
    where: {
      studentId: { in: studentIds },
      fromAcademicYearId,
    },
    select: { studentId: true },
  });

  if (alreadyPromoted.length > 0) {
    throw ApiError.conflict(
      `${alreadyPromoted.length} student(s) have already been processed for this academic year`
    );
  }

  // Execute bulk promotion in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const promotions = [];
    const errors = [];

    for (const studentData of students) {
      try {
        const { studentId, status, rollNumber, remarks } = studentData;

        // Create promotion record
        const promotion = await tx.promotion.create({
          data: {
            studentId,
            fromClassId,
            fromAcademicYearId,
            toClassId: status === 'graduated' ? null : toClassId,
            toAcademicYearId,
            status,
            remarks,
            processedBy: req.user.id,
          },
        });

        // Mark old enrollment as inactive
        await tx.studentClass.updateMany({
          where: {
            studentId,
            academicYearId: fromAcademicYearId,
            status: 'active',
          },
          data: { status: 'inactive' },
        });

        // Create new enrollment if not graduated
        if (status !== 'graduated') {
          const existingEnrollment = await tx.studentClass.findFirst({
            where: { studentId, academicYearId: toAcademicYearId },
          });

          if (!existingEnrollment) {
            await tx.studentClass.create({
              data: {
                studentId,
                classId: toClassId,
                sectionId: targetSectionId,
                academicYearId: toAcademicYearId,
                schoolId: req.user.schoolId,
                rollNumber: rollNumber || null,
                status: 'active',
              },
            });
          }
        }

        promotions.push({ studentId, status: 'success', promotionId: promotion.id });
      } catch (error) {
        errors.push({ studentId: studentData.studentId, status: 'failed', error: error.message });
      }
    }

    return { promotions, errors };
  });

  ApiResponse.success(res, {
    message: `Processed ${results.promotions.length} promotion(s)`,
    successful: results.promotions.length,
    failed: results.errors.length,
    results: results.promotions,
    errors: results.errors,
  });
});

/**
 * @desc    Get promotion statistics
 * @route   GET /api/v1/promotions/stats
 * @access  Private/Admin
 */
const getPromotionStats = asyncHandler(async (req, res) => {
  const { academicYearId } = req.query;

  const where = {
    student: { schoolId: req.user.schoolId },
  };

  if (academicYearId) {
    where.fromAcademicYearId = parseInt(academicYearId);
  }

  const [promoted, detained, graduated, total] = await Promise.all([
    prisma.promotion.count({ where: { ...where, status: 'promoted' } }),
    prisma.promotion.count({ where: { ...where, status: 'detained' } }),
    prisma.promotion.count({ where: { ...where, status: 'graduated' } }),
    prisma.promotion.count({ where }),
  ]);

  // Get per-class breakdown
  const classBreakdown = await prisma.promotion.groupBy({
    by: ['fromClassId', 'status'],
    where,
    _count: { id: true },
  });

  // Enrich with class names
  const classIds = [...new Set(classBreakdown.map((c) => c.fromClassId))];
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true, gradeLevel: true },
  });

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const enrichedBreakdown = classBreakdown.map((item) => ({
    ...item,
    class: classMap.get(item.fromClassId),
  }));

  ApiResponse.success(res, {
    summary: { promoted, detained, graduated, total },
    byClass: enrichedBreakdown,
  });
});

/**
 * @desc    Undo/Delete a promotion record
 * @route   DELETE /api/v1/promotions/:id
 * @access  Private/Admin
 */
const undoPromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const promotion = await prisma.promotion.findFirst({
    where: { id: parseInt(id) },
    include: {
      student: { select: { schoolId: true } },
    },
  });

  if (!promotion) {
    throw ApiError.notFound('Promotion record not found');
  }

  if (promotion.student.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden('Access denied');
  }

  // Undo in transaction
  await prisma.$transaction(async (tx) => {
    // Delete the new enrollment if it exists
    await tx.studentClass.deleteMany({
      where: {
        studentId: promotion.studentId,
        academicYearId: promotion.toAcademicYearId,
      },
    });

    // Reactivate old enrollment
    await tx.studentClass.updateMany({
      where: {
        studentId: promotion.studentId,
        academicYearId: promotion.fromAcademicYearId,
      },
      data: { status: 'active' },
    });

    // Delete promotion record
    await tx.promotion.delete({ where: { id: parseInt(id) } });
  });

  ApiResponse.success(res, null, 'Promotion undone successfully');
});

module.exports = {
  getPromotionHistory,
  getEligibleStudents,
  processPromotion,
  bulkPromote,
  getPromotionStats,
  undoPromotion,
};
