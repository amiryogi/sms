/**
 * Seed script to create Science and Management programs and link subjects
 * Run with: node prisma/seeds/seedPrograms.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Programs seed...\n');

  // Get school
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error('❌ No school found.');
    return;
  }
  console.log(`📚 Using school: ${school.name} (ID: ${school.id})`);

  // Get current academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true }
  });
  if (!academicYear) {
    console.error('❌ No current academic year found.');
    return;
  }
  console.log(`📅 Using academic year: ${academicYear.name} (ID: ${academicYear.id})`);

  // Get Grade 11 and 12 classes
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, gradeLevel: { in: [11, 12] } }
  });
  const classMap = {};
  classes.forEach(c => { classMap[c.gradeLevel] = c; });

  if (!classMap[11] || !classMap[12]) {
    console.error('❌ Grade 11 or 12 class not found.');
    return;
  }

  // ============ CREATE PROGRAMS ============

  // Science Program
  let scienceProgram = await prisma.program.findFirst({
    where: { schoolId: school.id, academicYearId: academicYear.id, name: 'Science' }
  });
  if (!scienceProgram) {
    scienceProgram = await prisma.program.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: 'Science',
        description: 'NEB Science Faculty - Physics, Chemistry, Biology, Mathematics',
        isActive: true,
      }
    });
    console.log('✅ Created Program: Science');
  } else {
    console.log('⏭️  Program exists: Science');
  }

  // Management Program
  let managementProgram = await prisma.program.findFirst({
    where: { schoolId: school.id, academicYearId: academicYear.id, name: 'Management' }
  });
  if (!managementProgram) {
    managementProgram = await prisma.program.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: 'Management',
        description: 'NEB Management Faculty - Accounting, Economics, Business Studies',
        isActive: true,
      }
    });
    console.log('✅ Created Program: Management');
  } else {
    console.log('⏭️  Program exists: Management');
  }

  // ============ LINK SUBJECTS TO PROGRAMS ============

  // Get all class subjects for the current academic year with Grade 11 and 12
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      classId: { in: [classMap[11].id, classMap[12].id] }
    },
    include: {
      subject: true,
      class: true
    }
  });

  console.log(`\n📋 Found ${classSubjects.length} class subjects for Grade 11/12\n`);

  let scienceLinked = 0;
  let managementLinked = 0;

  for (const cs of classSubjects) {
    const subjectName = cs.subject.name;
    const subjectDesc = cs.subject.description || '';
    
    // Determine which programs this subject belongs to based on faculty in description
    const isCompulsory = subjectDesc.includes('Compulsory');
    const isScience = subjectDesc.includes('Science');
    const isManagement = subjectDesc.includes('Management');
    const isOptional = subjectDesc.includes('OptionalForScienceManagement');

    // Science Program subjects
    if (isCompulsory || isScience || isOptional) {
      const exists = await prisma.programSubject.findFirst({
        where: { programId: scienceProgram.id, classSubjectId: cs.id }
      });
      if (!exists) {
        await prisma.programSubject.create({
          data: {
            programId: scienceProgram.id,
            classSubjectId: cs.id
          }
        });
        scienceLinked++;
        console.log(`   🔬 Science ← ${subjectName} (Grade ${cs.class.gradeLevel})`);
      }
    }

    // Management Program subjects
    if (isCompulsory || isManagement || isOptional) {
      const exists = await prisma.programSubject.findFirst({
        where: { programId: managementProgram.id, classSubjectId: cs.id }
      });
      if (!exists) {
        await prisma.programSubject.create({
          data: {
            programId: managementProgram.id,
            classSubjectId: cs.id
          }
        });
        managementLinked++;
        console.log(`   💼 Management ← ${subjectName} (Grade ${cs.class.gradeLevel})`);
      }
    }
  }

  console.log('\n📊 Link Summary:');
  console.log(`   Science subjects linked: ${scienceLinked}`);
  console.log(`   Management subjects linked: ${managementLinked}`);
  console.log('\n✅ Programs seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
