const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, buildSearchQuery } = require('../utils');

/**
 * @desc    Get all programs
 * @route   GET /api/v1/programs
 * @access  Private
 */
const getPrograms = asyncHandler(async (req, res) => {
  const { search, academicYearId, classId, isActive } = req.query;

  const where = { schoolId: req.user.schoolId };

  // Filter by academic year
  if (academicYearId) {
    where.academicYearId = parseInt(academicYearId);
  }

  // Filter by active status
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Search by name
  if (search) {
    const searchQuery = buildSearchQuery(search, ['name', 'description']);
    if (searchQuery) where.OR = searchQuery.OR;
  }

  // Build include for filtering by class through programSubjects
  let include = {
    academicYear: { select: { id: true, name: true } },
    _count: { select: { programSubjects: true, studentPrograms: true } }
  };

  const programs = await prisma.program.findMany({
    where,
    include,
    orderBy: [{ academicYear: { name: 'desc' } }, { name: 'asc' }],
  });

  // If classId filter is provided, filter programs that have subjects for that class
  let filteredPrograms = programs;
  if (classId) {
    const programsWithClass = await prisma.program.findMany({
      where: {
        ...where,
        programSubjects: {
          some: {
            classSubject: {
              classId: parseInt(classId)
            }
          }
        }
      },
      include,
      orderBy: [{ academicYear: { name: 'desc' } }, { name: 'asc' }],
    });
    filteredPrograms = programsWithClass;
  }

  ApiResponse.success(res, filteredPrograms);
});

/**
 * @desc    Get single program with subjects
 * @route   GET /api/v1/programs/:id
 * @access  Private
 */
const getProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      academicYear: { select: { id: true, name: true } },
      programSubjects: {
        include: {
          classSubject: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              class: { select: { id: true, name: true, gradeLevel: true } }
            }
          }
        }
      },
      studentPrograms: {
        include: {
          studentClass: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true } }
                }
              },
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } }
            }
          }
        }
      }
    }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  ApiResponse.success(res, program);
});

/**
 * @desc    Create program
 * @route   POST /api/v1/programs
 * @access  Private/Admin
 */
const createProgram = asyncHandler(async (req, res) => {
  const { name, description, academicYearId, isActive } = req.body;

  // Check if program name already exists for this academic year
  const existingProgram = await prisma.program.findFirst({
    where: {
      schoolId: req.user.schoolId,
      academicYearId: parseInt(academicYearId),
      name: name.trim()
    }
  });

  if (existingProgram) {
    throw ApiError.conflict('A program with this name already exists for this academic year');
  }

  const program = await prisma.program.create({
    data: {
      schoolId: req.user.schoolId,
      academicYearId: parseInt(academicYearId),
      name: name.trim(),
      description: description || null,
      isActive: isActive !== false
    },
    include: {
      academicYear: { select: { id: true, name: true } }
    }
  });

  ApiResponse.created(res, program, 'Program created successfully');
});

/**
 * @desc    Update program
 * @route   PUT /api/v1/programs/:id
 * @access  Private/Admin
 */
const updateProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  // Check name uniqueness if changed
  if (name && name.trim() !== program.name) {
    const existingProgram = await prisma.program.findFirst({
      where: {
        schoolId: req.user.schoolId,
        academicYearId: program.academicYearId,
        name: name.trim(),
        NOT: { id: parseInt(id) }
      }
    });

    if (existingProgram) {
      throw ApiError.conflict('A program with this name already exists for this academic year');
    }
  }

  const updatedProgram = await prisma.program.update({
    where: { id: parseInt(id) },
    data: {
      name: name ? name.trim() : program.name,
      description: description !== undefined ? description : program.description,
      isActive: isActive !== undefined ? isActive : program.isActive
    },
    include: {
      academicYear: { select: { id: true, name: true } }
    }
  });

  ApiResponse.success(res, updatedProgram, 'Program updated successfully');
});

/**
 * @desc    Delete program
 * @route   DELETE /api/v1/programs/:id
 * @access  Private/Admin
 */
const deleteProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: { _count: { select: { studentPrograms: true } } }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  // Check if students are assigned to this program
  if (program._count.studentPrograms > 0) {
    throw ApiError.badRequest(
      `Cannot delete program with ${program._count.studentPrograms} assigned student(s). Remove students first.`
    );
  }

  await prisma.program.delete({
    where: { id: parseInt(id) }
  });

  ApiResponse.success(res, null, 'Program deleted successfully');
});

/**
 * @desc    Assign subjects to program (bulk)
 * @route   PUT /api/v1/programs/:id/subjects
 * @access  Private/Admin
 */
const assignSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { classSubjectIds, isCompulsory = true } = req.body;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  if (!Array.isArray(classSubjectIds) || classSubjectIds.length === 0) {
    throw ApiError.badRequest('classSubjectIds must be a non-empty array');
  }

  // Validate that all class subjects exist and belong to the same academic year
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      id: { in: classSubjectIds.map(id => parseInt(id)) },
      academicYearId: program.academicYearId
    },
    include: {
      class: true
    }
  });

  if (classSubjects.length !== classSubjectIds.length) {
    throw ApiError.badRequest('Some class subjects are invalid or not from the same academic year');
  }

  // Validate that all subjects are for Grade 11 or 12
  const invalidGrades = classSubjects.filter(cs => cs.class.gradeLevel < 11);
  if (invalidGrades.length > 0) {
    throw ApiError.badRequest('Programs can only include subjects for Grade 11 or 12');
  }

  // Delete existing program subjects and create new ones
  await prisma.$transaction([
    prisma.programSubject.deleteMany({
      where: { programId: parseInt(id) }
    }),
    prisma.programSubject.createMany({
      data: classSubjectIds.map(csId => ({
        programId: parseInt(id),
        classSubjectId: parseInt(csId),
        isCompulsory: !!isCompulsory
      }))
    })
  ]);

  // Fetch updated program with subjects
  const updatedProgram = await prisma.program.findFirst({
    where: { id: parseInt(id) },
    include: {
      programSubjects: {
        include: {
          classSubject: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              class: { select: { id: true, name: true, gradeLevel: true } }
            }
          }
        }
      }
    }
  });

  ApiResponse.success(res, updatedProgram, 'Subjects assigned to program successfully');
});

/**
 * @desc    Get students by program
 * @route   GET /api/v1/programs/:id/students
 * @access  Private
 */
const getStudentsByProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  const studentPrograms = await prisma.studentProgram.findMany({
    where: { programId: parseInt(id) },
    include: {
      studentClass: {
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          },
          class: { select: { id: true, name: true, gradeLevel: true } },
          section: { select: { id: true, name: true } }
        }
      }
    }
  });

  ApiResponse.success(res, studentPrograms);
});

/**
 * @desc    Assign student to program
 * @route   POST /api/v1/programs/:id/students
 * @access  Private/Admin
 */
const assignStudentToProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { studentClassId } = req.body;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  // Validate student enrollment
  const studentClass = await prisma.studentClass.findFirst({
    where: {
      id: parseInt(studentClassId),
      academicYearId: program.academicYearId,
      schoolId: req.user.schoolId
    },
    include: {
      class: true,
      student: { include: { user: { select: { firstName: true, lastName: true } } } }
    }
  });

  if (!studentClass) {
    throw ApiError.notFound('Student enrollment not found or not in the same academic year');
  }

  // Validate Grade 11/12
  if (studentClass.class.gradeLevel < 11) {
    throw ApiError.badRequest('Programs can only be assigned to Grade 11 or 12 students');
  }

  // Check if student already has a program assignment
  const existingAssignment = await prisma.studentProgram.findUnique({
    where: { studentClassId: parseInt(studentClassId) }
  });

  if (existingAssignment) {
    // Update existing assignment
    const updated = await prisma.studentProgram.update({
      where: { studentClassId: parseInt(studentClassId) },
      data: { programId: parseInt(id) },
      include: {
        studentClass: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } }
          }
        },
        program: { select: { id: true, name: true } }
      }
    });
    ApiResponse.success(res, updated, 'Student program assignment updated');
  } else {
    // Create new assignment
    const created = await prisma.studentProgram.create({
      data: {
        studentClassId: parseInt(studentClassId),
        programId: parseInt(id)
      },
      include: {
        studentClass: {
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } }
          }
        },
        program: { select: { id: true, name: true } }
      }
    });
    ApiResponse.created(res, created, 'Student assigned to program successfully');
  }
});

/**
 * @desc    Remove student from program
 * @route   DELETE /api/v1/programs/:id/students/:studentClassId
 * @access  Private/Admin
 */
const removeStudentFromProgram = asyncHandler(async (req, res) => {
  const { id, studentClassId } = req.params;

  const program = await prisma.program.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId }
  });

  if (!program) {
    throw ApiError.notFound('Program not found');
  }

  const studentProgram = await prisma.studentProgram.findFirst({
    where: {
      programId: parseInt(id),
      studentClassId: parseInt(studentClassId)
    }
  });

  if (!studentProgram) {
    throw ApiError.notFound('Student is not assigned to this program');
  }

  await prisma.studentProgram.delete({
    where: { id: studentProgram.id }
  });

  ApiResponse.success(res, null, 'Student removed from program successfully');
});

/**
 * @desc    Get programs for a specific class (Grade 11/12 only)
 * @route   GET /api/v1/programs/by-class/:classId
 * @access  Private
 */
const getProgramsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { academicYearId } = req.query;

  // Validate class is grade 11 or 12
  const classData = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId }
  });

  if (!classData) {
    throw ApiError.notFound('Class not found');
  }

  if (classData.gradeLevel < 11) {
    // Return empty array for non-11/12 grades (not an error, just no programs)
    return ApiResponse.success(res, []);
  }

  const where = {
    schoolId: req.user.schoolId,
    isActive: true,
    programSubjects: {
      some: {
        classSubject: {
          classId: parseInt(classId)
        }
      }
    }
  };

  if (academicYearId) {
    where.academicYearId = parseInt(academicYearId);
  }

  const programs = await prisma.program.findMany({
    where,
    include: {
      academicYear: { select: { id: true, name: true } },
      _count: { select: { programSubjects: true } }
    },
    orderBy: { name: 'asc' }
  });

  ApiResponse.success(res, programs);
});

module.exports = {
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  assignSubjects,
  getStudentsByProgram,
  assignStudentToProgram,
  removeStudentFromProgram,
  getProgramsByClass
};
