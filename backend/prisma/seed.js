const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// =====================================================
// SEED DATA
// =====================================================

const permissions = [
  // User Management
  { name: "user.create", module: "users", description: "Create new users" },
  { name: "user.read", module: "users", description: "View user details" },
  {
    name: "user.update",
    module: "users",
    description: "Update user information",
  },
  { name: "user.delete", module: "users", description: "Delete users" },
  { name: "user.list", module: "users", description: "List all users" },

  // Student Management
  {
    name: "student.create",
    module: "students",
    description: "Create new students",
  },
  {
    name: "student.read",
    module: "students",
    description: "View student details",
  },
  {
    name: "student.update",
    module: "students",
    description: "Update student information",
  },
  {
    name: "student.delete",
    module: "students",
    description: "Delete students",
  },
  { name: "student.list", module: "students", description: "List students" },
  {
    name: "student.view_own",
    module: "students",
    description: "View own student profile",
  },

  // Teacher Management
  {
    name: "teacher.create",
    module: "teachers",
    description: "Create new teachers",
  },
  {
    name: "teacher.read",
    module: "teachers",
    description: "View teacher details",
  },
  {
    name: "teacher.update",
    module: "teachers",
    description: "Update teacher information",
  },
  {
    name: "teacher.delete",
    module: "teachers",
    description: "Delete teachers",
  },
  { name: "teacher.list", module: "teachers", description: "List teachers" },

  // Academic Structure
  {
    name: "academic_year.manage",
    module: "academic",
    description: "Manage academic years",
  },
  { name: "class.manage", module: "academic", description: "Manage classes" },
  {
    name: "section.manage",
    module: "academic",
    description: "Manage sections",
  },
  {
    name: "subject.manage",
    module: "academic",
    description: "Manage subjects",
  },
  {
    name: "class_subject.manage",
    module: "academic",
    description: "Manage class-subject assignments",
  },
  {
    name: "teacher_subject.manage",
    module: "academic",
    description: "Manage teacher assignments",
  },

  // Attendance
  {
    name: "attendance.mark",
    module: "attendance",
    description: "Mark attendance",
  },
  {
    name: "attendance.view_all",
    module: "attendance",
    description: "View all attendance records",
  },
  {
    name: "attendance.view_own",
    module: "attendance",
    description: "View own attendance",
  },
  {
    name: "attendance.view_class",
    module: "attendance",
    description: "View class attendance",
  },

  // Exams
  { name: "exam.create", module: "exams", description: "Create exams" },
  { name: "exam.read", module: "exams", description: "View exam details" },
  {
    name: "exam.update",
    module: "exams",
    description: "Update exam information",
  },
  { name: "exam.delete", module: "exams", description: "Delete exams" },
  {
    name: "exam.manage_subjects",
    module: "exams",
    description: "Manage exam subjects",
  },

  // Results
  {
    name: "result.enter",
    module: "results",
    description: "Enter exam results",
  },
  {
    name: "result.view_all",
    module: "results",
    description: "View all results",
  },
  {
    name: "result.view_own",
    module: "results",
    description: "View own results",
  },
  {
    name: "result.view_child",
    module: "results",
    description: "View child results",
  },
  { name: "result.publish", module: "results", description: "Publish results" },

  // Report Cards
  {
    name: "report_card.generate",
    module: "report_cards",
    description: "Generate report cards",
  },
  {
    name: "report_card.view_all",
    module: "report_cards",
    description: "View all report cards",
  },
  {
    name: "report_card.view_own",
    module: "report_cards",
    description: "View own report card",
  },
  {
    name: "report_card.view_child",
    module: "report_cards",
    description: "View child report card",
  },

  // Assignments
  {
    name: "assignment.create",
    module: "assignments",
    description: "Create assignments",
  },
  {
    name: "assignment.read",
    module: "assignments",
    description: "View assignments",
  },
  {
    name: "assignment.update",
    module: "assignments",
    description: "Update assignments",
  },
  {
    name: "assignment.delete",
    module: "assignments",
    description: "Delete assignments",
  },
  {
    name: "assignment.grade",
    module: "assignments",
    description: "Grade submissions",
  },
  {
    name: "assignment.submit",
    module: "assignments",
    description: "Submit assignments",
  },
  {
    name: "assignment.view_own",
    module: "assignments",
    description: "View own assignments",
  },

  // Notices
  { name: "notice.create", module: "notices", description: "Create notices" },
  { name: "notice.read", module: "notices", description: "View notices" },
  { name: "notice.update", module: "notices", description: "Update notices" },
  { name: "notice.delete", module: "notices", description: "Delete notices" },

  // Promotions
  {
    name: "promotion.process",
    module: "promotions",
    description: "Process student promotions",
  },
  {
    name: "promotion.view",
    module: "promotions",
    description: "View promotion history",
  },
];

const roles = [
  { name: "ADMIN", description: "School Administrator" },
  { name: "TEACHER", description: "Teacher" },
  { name: "STUDENT", description: "Student" },
  { name: "PARENT", description: "Parent/Guardian" },
];

// Role-permission mappings
const rolePermissions = {
  ADMIN: [
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "user.list",
    "student.create",
    "student.read",
    "student.update",
    "student.delete",
    "student.list",
    "teacher.create",
    "teacher.read",
    "teacher.update",
    "teacher.delete",
    "teacher.list",
    "academic_year.manage",
    "class.manage",
    "section.manage",
    "subject.manage",
    "class_subject.manage",
    "teacher_subject.manage",
    "attendance.mark",
    "attendance.view_all",
    "attendance.view_class",
    "exam.create",
    "exam.read",
    "exam.update",
    "exam.delete",
    "exam.manage_subjects",
    "result.enter",
    "result.view_all",
    "result.publish",
    "report_card.generate",
    "report_card.view_all",
    "assignment.create",
    "assignment.read",
    "assignment.update",
    "assignment.delete",
    "assignment.grade",
    "notice.create",
    "notice.read",
    "notice.update",
    "notice.delete",
    "promotion.process",
    "promotion.view",
  ],
  TEACHER: [
    "student.read",
    "student.list",
    "attendance.mark",
    "attendance.view_class",
    "exam.read",
    "result.enter",
    "result.view_all",
    "assignment.create",
    "assignment.read",
    "assignment.update",
    "assignment.delete",
    "assignment.grade",
    "notice.read",
    "notice.create",
  ],
  STUDENT: [
    "student.view_own",
    "attendance.view_own",
    "result.view_own",
    "report_card.view_own",
    "assignment.submit",
    "assignment.view_own",
    "notice.read",
  ],
  PARENT: [
    "attendance.view_own",
    "result.view_child",
    "report_card.view_child",
    "assignment.view_own",
    "notice.read",
  ],
};

// Demo subjects
const subjects = [
  {
    name: "English",
    code: "ENG",
    description: "English Language and Literature",
  },
  { name: "Mathematics", code: "MATH", description: "Mathematics" },
  { name: "Science", code: "SCI", description: "General Science" },
  {
    name: "Social Studies",
    code: "SOC",
    description: "Social Studies and History",
  },
  { name: "Nepali", code: "NEP", description: "Nepali Language" },
  {
    name: "Computer Science",
    code: "CS",
    description: "Computer Science and IT",
  },
  {
    name: "Physical Education",
    code: "PE",
    description: "Physical Education",
    isOptional: true,
  },
  { name: "Art", code: "ART", description: "Art and Craft", isOptional: true },
];

// Demo classes (Grade 1-12)
const classes = [
  { name: "Grade 1", gradeLevel: 1, displayOrder: 1 },
  { name: "Grade 2", gradeLevel: 2, displayOrder: 2 },
  { name: "Grade 3", gradeLevel: 3, displayOrder: 3 },
  { name: "Grade 4", gradeLevel: 4, displayOrder: 4 },
  { name: "Grade 5", gradeLevel: 5, displayOrder: 5 },
  { name: "Grade 6", gradeLevel: 6, displayOrder: 6 },
  { name: "Grade 7", gradeLevel: 7, displayOrder: 7 },
  { name: "Grade 8", gradeLevel: 8, displayOrder: 8 },
  { name: "Grade 9", gradeLevel: 9, displayOrder: 9 },
  { name: "Grade 10", gradeLevel: 10, displayOrder: 10 },
  { name: "Grade 11", gradeLevel: 11, displayOrder: 11 },
  { name: "Grade 12", gradeLevel: 12, displayOrder: 12 },
];

// Demo sections
const sections = [
  { name: "A", capacity: 40 },
  { name: "B", capacity: 40 },
  { name: "C", capacity: 35 },
];

// =====================================================
// SEED FUNCTIONS
// =====================================================

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 1. Create Permissions
  console.log("📝 Creating permissions...");
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`   ✓ Created ${permissions.length} permissions\n`);

  // 2. Create Roles
  console.log("👥 Creating roles...");
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`   ✓ Created ${roles.length} roles\n`);

  // 3. Assign Permissions to Roles
  console.log("🔗 Assigning permissions to roles...");
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const permName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  console.log("   ✓ Assigned permissions to roles\n");

  // 4. Create Demo School
  console.log("🏫 Creating demo school...");
  const school = await prisma.school.upsert({
    where: { code: "DEMO001" },
    update: {},
    create: {
      name: "SVI",
      code: "DEMO001",
      address: "Balaju, Kathmandu, Nepal",
      phone: "+977-1-1234567",
      email: "info@svi.edu.np",
      isActive: true,
    },
  });
  console.log(`   ✓ Created school: ${school.name}\n`);

  // 5. Create Academic Year
  console.log("📅 Creating academic year...");
  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2024-2025" } },
    update: {},
    create: {
      schoolId: school.id,
      name: "2024-2025",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isCurrent: true,
    },
  });
  console.log(`   ✓ Created academic year: ${academicYear.name}\n`);

  // 6. Create Sections
  console.log("📚 Creating sections...");
  const createdSections = [];
  for (const section of sections) {
    const created = await prisma.section.upsert({
      where: { schoolId_name: { schoolId: school.id, name: section.name } },
      update: {},
      create: { ...section, schoolId: school.id },
    });
    createdSections.push(created);
  }
  console.log(`   ✓ Created ${createdSections.length} sections\n`);

  // 7. Create Classes
  console.log("🎓 Creating classes...");
  const createdClasses = [];
  for (const classData of classes) {
    const created = await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name: classData.name } },
      update: {},
      create: { ...classData, schoolId: school.id },
    });
    createdClasses.push(created);
  }
  console.log(`   ✓ Created ${createdClasses.length} classes\n`);

  // 8. Create Subjects
  console.log("📖 Creating subjects...");
  const createdSubjects = [];
  for (const subject of subjects) {
    const created = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: subject.code } },
      update: {},
      create: { ...subject, schoolId: school.id },
    });
    createdSubjects.push(created);
  }
  console.log(`   ✓ Created ${createdSubjects.length} subjects\n`);

  // 9. Assign Core Subjects to All Classes
  console.log("🔗 Assigning subjects to classes...");
  const coreSubjectCodes = ["ENG", "MATH", "SCI", "SOC", "NEP"];
  let classSubjectCount = 0;
  for (const cls of createdClasses) {
    for (const subject of createdSubjects.filter((s) =>
      coreSubjectCodes.includes(s.code)
    )) {
      await prisma.classSubject.upsert({
        where: {
          classId_academicYearId_subjectId: {
            classId: cls.id,
            academicYearId: academicYear.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          classId: cls.id,
          academicYearId: academicYear.id,
          subjectId: subject.id,
          fullMarks: 100,
          passMarks: 40,
        },
      });
      classSubjectCount++;
    }
  }
  console.log(`   ✓ Created ${classSubjectCount} class-subject assignments\n`);

  // 10. Create Demo Users
  console.log("👤 Creating demo users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // Admin User
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const adminUser = await prisma.user.upsert({
    where: {
      email_schoolId: {
        email: "admin@svi.edu.np",
        schoolId: school.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      email: "admin@svi.edu.np",
      passwordHash,
      firstName: "Amir",
      lastName: "Shrestha",
      phone: "+977-9861158271",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log(`   ✓ Admin: admin@svi.edu.np / password123`);

  // Teacher User
  const teacherRole = await prisma.role.findUnique({
    where: { name: "TEACHER" },
  });
  const teacherUser = await prisma.user.upsert({
    where: {
      email_schoolId: {
        email: "teacher@svi.edu.np",
        schoolId: school.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      email: "teacher@svi.edu.np",
      passwordHash,
      firstName: "Bimala",
      lastName: "shrestha",
      phone: "+977-9802345678",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: teacherUser.id, roleId: teacherRole.id },
    },
    update: {},
    create: { userId: teacherUser.id, roleId: teacherRole.id },
  });
  console.log(`   ✓ Teacher: teacher@svi.edu.np / password123`);

  // Assign teacher to Grade 10 Section A for Math
  const grade10 = createdClasses.find((c) => c.name === "Grade 10");
  const sectionA = createdSections.find((s) => s.name === "A");
  const mathSubject = createdSubjects.find((s) => s.code === "MATH");

  if (grade10 && sectionA && mathSubject) {
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        classId: grade10.id,
        subjectId: mathSubject.id,
        academicYearId: academicYear.id,
      },
    });
    if (classSubject) {
      await prisma.teacherSubject.upsert({
        where: {
          userId_classSubjectId_sectionId_academicYearId: {
            userId: teacherUser.id,
            classSubjectId: classSubject.id,
            sectionId: sectionA.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          userId: teacherUser.id,
          classSubjectId: classSubject.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          isClassTeacher: true,
        },
      });
    }
  }

  // Student User
  const studentRole = await prisma.role.findUnique({
    where: { name: "STUDENT" },
  });
  const studentUser = await prisma.user.upsert({
    where: {
      email_schoolId: {
        email: "student@svi.edu.np",
        schoolId: school.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      email: "student@svi.edu.np",
      passwordHash,
      firstName: "Bivan",
      lastName: "Shrestha",
      phone: "+977-9803456789",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: studentUser.id, roleId: studentRole.id },
    },
    update: {},
    create: { userId: studentUser.id, roleId: studentRole.id },
  });

  // Create Student Profile
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      schoolId: school.id,
      admissionNumber: "STU2024001",
      dateOfBirth: new Date("2008-05-15"),
      gender: "male",
      bloodGroup: "A+",
      address: "Kathmandu, Nepal",
      emergencyContact: "+977-9801111111",
      admissionDate: new Date("2024-04-01"),
    },
  });

  // Enroll student in Grade 10 Section A
  if (grade10 && sectionA) {
    await prisma.studentClass.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        classId: grade10.id,
        sectionId: sectionA.id,
        academicYearId: academicYear.id,
        schoolId: school.id,
        rollNumber: 1,
        status: "active",
      },
    });
  }
  console.log(`   ✓ Student: student@svi.edu.np / password123`);

  // Parent User
  const parentRole = await prisma.role.findUnique({
    where: { name: "PARENT" },
  });
  const parentUser = await prisma.user.upsert({
    where: {
      email_schoolId: {
        email: "parent@svi.edu.np",
        schoolId: school.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      email: "parent@svi.edu.np",
      passwordHash,
      firstName: "Hari",
      lastName: "Parent",
      phone: "+977-9804567890",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: parentUser.id, roleId: parentRole.id } },
    update: {},
    create: { userId: parentUser.id, roleId: parentRole.id },
  });

  // Create Parent Profile and link to student
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      schoolId: school.id,
      occupation: "Business",
      workplace: "Kathmandu",
      address: "Kathmandu, Nepal",
    },
  });

  await prisma.studentParent.upsert({
    where: {
      studentId_parentId: { studentId: student.id, parentId: parent.id },
    },
    update: {},
    create: {
      studentId: student.id,
      parentId: parent.id,
      relationship: "father",
      isPrimary: true,
      schoolId: school.id,
    },
  });
  console.log(`   ✓ Parent: parent@svi.edu.np / password123\n`);

  // 11. Create Demo Exam
  console.log("📝 Creating demo exam...");
  const existingExam = await prisma.exam.findFirst({
    where: {
      schoolId: school.id,
      name: "First Term Examination",
    },
  });

  const exam = existingExam
    ? existingExam
    : await prisma.exam.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name: "First Term Examination",
          examType: "midterm",
          status: "DRAFT",
          createdBy: adminUser.id,
          startDate: new Date("2024-09-01"),
          endDate: new Date("2024-09-15"),
        },
      });
  console.log(`   ✓ Created exam: ${exam.name}\n`);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Database seeded successfully!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n📋 Demo Credentials:");
  console.log("   ┌─────────────────────────────────────────────────────┐");
  console.log("   │ Role     │ Email                        │ Password │");
  console.log("   ├─────────────────────────────────────────────────────┤");
  console.log("   │ Admin    │ admin@svi.edu.np     │ password123 │");
  console.log("   │ Teacher  │ teacher@svi.edu.np   │ password123 │");
  console.log("   │ Student  │ student@svi.edu.np   │ password123 │");
  console.log("   │ Parent   │ parent@svi.edu.np    │ password123 │");
  console.log("   └─────────────────────────────────────────────────────┘");
  console.log("\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
