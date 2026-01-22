/**
 * Cleanup script to remove duplicate/generic subjects from Grade 11/12
 * Run with: node prisma/seeds/cleanupGrade11_12Subjects.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup of Grade 11/12 generic subjects...\n');

  const school = await prisma.school.findFirst();
  if (!school) {
    console.error('❌ No school found.');
    return;
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true }
  });

  // Get Grade 11 and 12 classes
  const grade11 = await prisma.class.findFirst({ where: { schoolId: school.id, gradeLevel: 11 } });
  const grade12 = await prisma.class.findFirst({ where: { schoolId: school.id, gradeLevel: 12 } });

  if (!grade11 || !grade12) {
    console.error('❌ Grade 11 or 12 not found.');
    return;
  }

  // Generic subject codes from seed.js that should NOT be in Grade 11/12
  const genericCodes = ['ENG', 'MATH', 'SCI', 'SOC', 'NEP', 'CS', 'PE', 'ART'];

  // Find generic subjects
  const genericSubjects = await prisma.subject.findMany({
    where: { schoolId: school.id, code: { in: genericCodes } }
  });

  const genericSubjectIds = genericSubjects.map(s => s.id);
  console.log(`📋 Found ${genericSubjects.length} generic subjects to check`);

  // Find ClassSubjects for Grade 11/12 with these generic subjects
  const toDelete = await prisma.classSubject.findMany({
    where: {
      academicYearId: academicYear.id,
      classId: { in: [grade11.id, grade12.id] },
      subjectId: { in: genericSubjectIds }
    },
    include: { subject: true, class: true }
  });

  console.log(`\n🗑️  Found ${toDelete.length} generic ClassSubject assignments to remove:\n`);
  
  for (const cs of toDelete) {
    console.log(`   - ${cs.subject.name} (${cs.subject.code}) from ${cs.class.name}`);
  }

  if (toDelete.length > 0) {
    // First delete related ProgramSubject links
    await prisma.programSubject.deleteMany({
      where: { classSubjectId: { in: toDelete.map(cs => cs.id) } }
    });
    console.log('\n   ✓ Removed ProgramSubject links');

    // Then delete ClassSubjects
    await prisma.classSubject.deleteMany({
      where: { id: { in: toDelete.map(cs => cs.id) } }
    });
    console.log('   ✓ Removed ClassSubject assignments');
  }

  console.log('\n✅ Cleanup completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
