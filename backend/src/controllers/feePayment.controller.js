const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const { getFeeManagementRole } = require("../middleware");

/**
 * @desc    Get all fee payments (with filters)
 * @route   GET /api/v1/fees/payments
 * @access  Private (Admin sees all, Student/Parent sees own)
 */
const getFeePayments = asyncHandler(async (req, res) => {
  const { studentId, classId, academicYearId, status } = req.query;
  const schoolId = req.user.schoolId;
  const userRoles = req.user.roles || [];

  const where = { schoolId };

  // Role-based filtering
  if (userRoles.includes("STUDENT")) {
    // Students can only see their own fees
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
    });
    if (!student) {
      throw ApiError.forbidden("Student profile not found");
    }
    where.studentClass = { studentId: student.id };
  } else if (userRoles.includes("PARENT")) {
    // Parents can see their children's fees
    const parent = await prisma.parent.findFirst({
      where: { userId: req.user.id },
      include: {
        studentParents: { select: { studentId: true } },
      },
    });
    if (!parent) {
      throw ApiError.forbidden("Parent profile not found");
    }
    const childIds = parent.studentParents.map((sp) => sp.studentId);
    where.studentClass = { studentId: { in: childIds } };
  } else if (studentId) {
    // Admin filtering by specific student
    where.studentClass = { studentId: parseInt(studentId) };
  }

  // Additional filters
  if (classId) {
    where.studentClass = { ...where.studentClass, classId: parseInt(classId) };
  }
  if (academicYearId) {
    where.studentClass = {
      ...where.studentClass,
      academicYearId: parseInt(academicYearId),
    };
  }
  if (status) {
    where.status = status;
  }

  const feePayments = await prisma.feePayment.findMany({
    where,
    include: {
      studentClass: {
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
      },
      feeStructure: {
        include: {
          feeType: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { studentClass: { academicYear: { name: "desc" } } },
      { createdAt: "desc" },
    ],
  });

  ApiResponse.success(res, feePayments);
});

/**
 * @desc    Get fee summary for a student
 * @route   GET /api/v1/fees/payments/student/:studentId
 * @access  Private (Admin, or own Student/Parent)
 */
const getStudentFeeSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { academicYearId } = req.query;
  const schoolId = req.user.schoolId;
  const userRoles = req.user.roles || [];

  // Authorization check
  if (userRoles.includes("STUDENT")) {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
    });
    if (!student || student.id !== parseInt(studentId)) {
      throw ApiError.forbidden("You can only view your own fees");
    }
  } else if (userRoles.includes("PARENT")) {
    const parent = await prisma.parent.findFirst({
      where: { userId: req.user.id },
      include: { studentParents: { select: { studentId: true } } },
    });
    const childIds = parent?.studentParents.map((sp) => sp.studentId) || [];
    if (!childIds.includes(parseInt(studentId))) {
      throw ApiError.forbidden("You can only view your children's fees");
    }
  }

  // Get student's enrollment
  const studentClassWhere = {
    studentId: parseInt(studentId),
    school: { id: schoolId },
  };
  if (academicYearId) {
    studentClassWhere.academicYearId = parseInt(academicYearId);
  }

  const studentClasses = await prisma.studentClass.findMany({
    where: studentClassWhere,
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      feePayments: {
        include: {
          feeStructure: {
            include: {
              feeType: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { academicYear: { name: "desc" } },
  });

  // Calculate summary per enrollment
  const summary = studentClasses.map((sc) => {
    const totalDue = sc.feePayments.reduce(
      (sum, fp) => sum + parseFloat(fp.amountDue),
      0
    );
    const totalPaid = sc.feePayments.reduce(
      (sum, fp) => sum + parseFloat(fp.amountPaid),
      0
    );
    const balance = totalDue - totalPaid;

    return {
      studentClass: {
        id: sc.id,
        class: sc.class,
        section: sc.section,
        academicYear: sc.academicYear,
        rollNumber: sc.rollNumber,
      },
      student: {
        id: sc.student.id,
        name: `${sc.student.user.firstName} ${sc.student.user.lastName}`,
      },
      fees: sc.feePayments.map((fp) => ({
        id: fp.id,
        feeType: fp.feeStructure.feeType,
        amountDue: parseFloat(fp.amountDue),
        amountPaid: parseFloat(fp.amountPaid),
        balance: parseFloat(fp.amountDue) - parseFloat(fp.amountPaid),
        status: fp.status,
        paymentDate: fp.paymentDate,
        receiptNumber: fp.receiptNumber,
      })),
      totalDue,
      totalPaid,
      balance,
      status: balance <= 0 ? "paid" : totalPaid > 0 ? "partial" : "pending",
    };
  });

  ApiResponse.success(res, summary);
});

/**
 * @desc    Record a fee payment
 * @route   POST /api/v1/fees/payments/:feePaymentId/pay
 * @access  Private/Admin or Accountant
 */
const recordPayment = asyncHandler(async (req, res) => {
  const { feePaymentId } = req.params;
  const { amountPaid, paymentDate, paymentMethod, remarks } = req.body;
  const schoolId = req.user.schoolId;
  const actorRole = getFeeManagementRole(req.user);

  const feePayment = await prisma.feePayment.findFirst({
    where: { id: parseInt(feePaymentId), schoolId },
    include: {
      feeStructure: { include: { feeType: true } },
      studentClass: {
        include: {
          student: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });

  if (!feePayment) {
    throw ApiError.notFound("Fee payment record not found");
  }

  const currentPaid = parseFloat(feePayment.amountPaid);
  const amountDue = parseFloat(feePayment.amountDue);
  const newPayment = parseFloat(amountPaid);
  const newTotalPaid = currentPaid + newPayment;

  if (newTotalPaid > amountDue) {
    throw ApiError.badRequest(
      `Payment exceeds balance. Amount due: ${amountDue}, Already paid: ${currentPaid}, Max payable: ${
        amountDue - currentPaid
      }`
    );
  }

  // Determine new status
  let newStatus = "partial";
  if (newTotalPaid >= amountDue) {
    newStatus = "paid";
  } else if (newTotalPaid === 0) {
    newStatus = "pending";
  }

  // Generate receipt number
  const receiptNumber = `RCP-${Date.now()}-${feePayment.id}`;

  const updatedPayment = await prisma.feePayment.update({
    where: { id: parseInt(feePaymentId) },
    data: {
      amountPaid: newTotalPaid,
      status: newStatus,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || feePayment.paymentMethod,
      receiptNumber,
      remarks: remarks || feePayment.remarks,
      updatedByUserId: req.user.id,
      recordedByUserId: req.user.id,
      actorRole,
    },
    include: {
      feeStructure: { include: { feeType: { select: { name: true } } } },
      studentClass: {
        include: {
          student: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          class: { select: { name: true } },
          academicYear: { select: { name: true } },
        },
      },
    },
  });

  ApiResponse.success(
    res,
    updatedPayment,
    `Payment of ${newPayment} recorded successfully. Receipt: ${receiptNumber}`
  );
});

/**
 * @desc    Generate fee records for a student's enrollment
 * @route   POST /api/v1/fees/payments/generate/:studentClassId
 * @access  Private/Admin or Accountant
 */
const generateStudentFees = asyncHandler(async (req, res) => {
  const { studentClassId } = req.params;
  const schoolId = req.user.schoolId;
  const actorRole = getFeeManagementRole(req.user);

  // Get student enrollment
  const studentClass = await prisma.studentClass.findFirst({
    where: { id: parseInt(studentClassId), schoolId },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      class: true,
      academicYear: true,
    },
  });

  if (!studentClass) {
    throw ApiError.notFound("Student enrollment not found");
  }

  // Get fee structures for this class and year
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      classId: studentClass.classId,
      academicYearId: studentClass.academicYearId,
    },
    include: { feeType: true },
  });

  if (feeStructures.length === 0) {
    throw ApiError.badRequest(
      `No fee structures defined for ${studentClass.class.name} in ${studentClass.academicYear.name}`
    );
  }

  // Check for existing fee records
  const existingPayments = await prisma.feePayment.findMany({
    where: { studentClassId: parseInt(studentClassId) },
  });

  const existingStructureIds = existingPayments.map((p) => p.feeStructureId);
  const newStructures = feeStructures.filter(
    (fs) => !existingStructureIds.includes(fs.id)
  );

  if (newStructures.length === 0) {
    throw ApiError.conflict("Fee records already exist for this enrollment");
  }

  // Create fee payment records
  const createdPayments = await prisma.$transaction(
    newStructures.map((fs) =>
      prisma.feePayment.create({
        data: {
          schoolId,
          studentClassId: parseInt(studentClassId),
          feeStructureId: fs.id,
          amountDue: fs.amount,
          amountPaid: 0,
          status: "pending",
          createdByUserId: req.user.id,
          updatedByUserId: req.user.id,
          actorRole,
        },
      })
    )
  );

  const studentName = `${studentClass.student.user.firstName} ${studentClass.student.user.lastName}`;
  ApiResponse.created(
    res,
    createdPayments,
    `${createdPayments.length} fee records generated for ${studentName}`
  );
});

/**
 * @desc    Bulk generate fees for all students in a class
 * @route   POST /api/v1/fees/payments/generate-bulk
 * @access  Private/Admin or Accountant
 */
const bulkGenerateFees = asyncHandler(async (req, res) => {
  const { classId, academicYearId } = req.body;
  const schoolId = req.user.schoolId;
  const actorRole = getFeeManagementRole(req.user);

  // Get all active students in the class for this year
  const studentClasses = await prisma.studentClass.findMany({
    where: {
      schoolId,
      classId: parseInt(classId),
      academicYearId: parseInt(academicYearId),
      status: "active",
    },
  });

  if (studentClasses.length === 0) {
    throw ApiError.badRequest(
      "No active students found in this class for the selected year"
    );
  }

  // Get fee structures
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      classId: parseInt(classId),
      academicYearId: parseInt(academicYearId),
    },
  });

  if (feeStructures.length === 0) {
    throw ApiError.badRequest(
      "No fee structures defined for this class and year"
    );
  }

  // Get existing payments to avoid duplicates
  const studentClassIds = studentClasses.map((sc) => sc.id);
  const existingPayments = await prisma.feePayment.findMany({
    where: { studentClassId: { in: studentClassIds } },
    select: { studentClassId: true, feeStructureId: true },
  });

  const existingKey = (scId, fsId) => `${scId}-${fsId}`;
  const existingSet = new Set(
    existingPayments.map((p) => existingKey(p.studentClassId, p.feeStructureId))
  );

  // Build list of new payment records
  const newPayments = [];
  for (const sc of studentClasses) {
    for (const fs of feeStructures) {
      if (!existingSet.has(existingKey(sc.id, fs.id))) {
        newPayments.push({
          schoolId,
          studentClassId: sc.id,
          feeStructureId: fs.id,
          amountDue: fs.amount,
          amountPaid: 0,
          status: "pending",
          createdByUserId: req.user.id,
          updatedByUserId: req.user.id,
          actorRole,
        });
      }
    }
  }

  if (newPayments.length === 0) {
    throw ApiError.conflict("Fee records already exist for all students");
  }

  // Bulk create
  const result = await prisma.feePayment.createMany({
    data: newPayments,
  });

  ApiResponse.created(
    res,
    { count: result.count },
    `${result.count} fee records generated for ${studentClasses.length} students`
  );
});

module.exports = {
  getFeePayments,
  getStudentFeeSummary,
  recordPayment,
  generateStudentFees,
  bulkGenerateFees,
};
