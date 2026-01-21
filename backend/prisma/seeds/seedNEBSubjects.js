/**
 * Seed script to import NEB Grade 11/12 subjects from the Excel data
 * Run with: node prisma/seeds/seedNEBSubjects.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data extracted from subjects11_12.xlsx
const subjectsData = [
  { id: 1, subject_name: "Compulsory English", theory_code: "0031", practical_code: "0032", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3, practical_credit_hour: 1, total_credit_hour: 4, class_level: 11, faculty: "Compulsory", is_compulsory: 1 },
  { id: 2, subject_name: "Compulsory Nepali", theory_code: "0011", practical_code: "0012", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 2.25, practical_credit_hour: 0.75, total_credit_hour: 3, class_level: 11, faculty: "Compulsory", is_compulsory: 1 },
  { id: 3, subject_name: "Social Studies & Life Skills", theory_code: "0051", practical_code: "0052", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "OptionalForScienceManagement", is_compulsory: 0 },
  { id: 4, subject_name: "Physics", theory_code: "1011", practical_code: "1012", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Science", is_compulsory: 0 },
  { id: 5, subject_name: "Chemistry", theory_code: "3011", practical_code: "3012", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Science", is_compulsory: 0 },
  { id: 6, subject_name: "Biology", theory_code: "1031", practical_code: "1032", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Science", is_compulsory: 0 },
  { id: 7, subject_name: "Mathematics", theory_code: "0071", practical_code: "0072", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Science", is_compulsory: 0 },
  { id: 8, subject_name: "Computer Science", theory_code: "4271", practical_code: "4272", theory_full_marks: 50, practical_full_marks: 50, theory_credit_hour: 2.5, practical_credit_hour: 2.5, total_credit_hour: 5, class_level: 11, faculty: "OptionalForScienceManagement", is_compulsory: 0 },
  { id: 9, subject_name: "Accounting", theory_code: "1031", practical_code: "1032", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Management", is_compulsory: 0 },
  { id: 10, subject_name: "Economics", theory_code: "3031", practical_code: "3032", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Management", is_compulsory: 0 },
  { id: 11, subject_name: "Business Studies", theory_code: "2151", practical_code: "2152", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 11, faculty: "Management", is_compulsory: 0 },
  { id: 12, subject_name: "Hotel Management", theory_code: "4391", practical_code: "4392", theory_full_marks: 50, practical_full_marks: 50, theory_credit_hour: 2.5, practical_credit_hour: 2.5, total_credit_hour: 5, class_level: 11, faculty: "Management", is_compulsory: 0 },
  { id: 13, subject_name: "Compulsory English", theory_code: "0041", practical_code: "0042", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3, practical_credit_hour: 1, total_credit_hour: 4, class_level: 12, faculty: "Compulsory", is_compulsory: 1 },
  { id: 14, subject_name: "Compulsory Nepali", theory_code: "0021", practical_code: "0022", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 2.25, practical_credit_hour: 0.75, total_credit_hour: 3, class_level: 12, faculty: "OptionalForScienceManagement", is_compulsory: 1 },
  { id: 15, subject_name: "Social Studies & Life Skills", theory_code: "0061", practical_code: "0062", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3, practical_credit_hour: 1, total_credit_hour: 4, class_level: 12, faculty: "OptionalForScienceManagement", is_compulsory: 1 },
  { id: 16, subject_name: "Physics", theory_code: "1021", practical_code: "1022", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Science", is_compulsory: 0 },
  { id: 17, subject_name: "Chemistry", theory_code: "3012", practical_code: "3013", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Science", is_compulsory: 0 },
  { id: 18, subject_name: "Biology", theory_code: "1041", practical_code: "1042", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Science", is_compulsory: 0 },
  { id: 19, subject_name: "Mathematics", theory_code: "0081", practical_code: "0082", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Science", is_compulsory: 0 },
  { id: 20, subject_name: "Computer Science", theory_code: "4281", practical_code: "4282", theory_full_marks: 50, practical_full_marks: 50, theory_credit_hour: 2.5, practical_credit_hour: 2.5, total_credit_hour: 5, class_level: 12, faculty: "Science", is_compulsory: 0 },
  { id: 21, subject_name: "Accounting", theory_code: "1041", practical_code: "1042", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Management", is_compulsory: 0 },
  { id: 22, subject_name: "Economics", theory_code: "3041", practical_code: "3042", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Management", is_compulsory: 0 },
  { id: 23, subject_name: "Business Studies", theory_code: "2261", practical_code: "2262", theory_full_marks: 75, practical_full_marks: 25, theory_credit_hour: 3.75, practical_credit_hour: 1.25, total_credit_hour: 5, class_level: 12, faculty: "Management", is_compulsory: 0 },
  { id: 24, subject_name: "Hotel Management", theory_code: "4401", practical_code: "4402", theory_full_marks: 50, practical_full_marks: 50, theory_credit_hour: 2.5, practical_credit_hour: 2.5, total_credit_hour: 5, class_level: 12, faculty: "Management", is_compulsory: 0 },
];

async function main() {
  console.log('🚀 Starting NEB Subjects import...\n');

  // Get school (assuming first school for seeding)
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error('❌ No school found. Please create a school first.');
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

  // Get Grade 11 and Grade 12 classes
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, gradeLevel: { in: [11, 12] } }
  });
  
  const classMap = {};
  for (const cls of classes) {
    classMap[cls.gradeLevel] = cls;
  }
  
  if (!classMap[11] || !classMap[12]) {
    console.error('❌ Grade 11 or Grade 12 class not found. Please create them first.');
    console.log('   Found classes:', classes.map(c => `${c.name} (Grade ${c.gradeLevel})`).join(', '));
    return;
  }
  console.log(`🏫 Grade 11 Class: ${classMap[11].name} (ID: ${classMap[11].id})`);
  console.log(`🏫 Grade 12 Class: ${classMap[12].name} (ID: ${classMap[12].id})`);

  let createdSubjects = 0;
  let createdClassSubjects = 0;
  let createdComponents = 0;

  // Process each subject from Excel
  for (const row of subjectsData) {
    const gradeClass = classMap[row.class_level];
    if (!gradeClass) continue;

    // Generate unique subject code: {theory_code}_{class_level}
    const subjectCode = `${row.theory_code}_${row.class_level}`;
    
    // Check if subject already exists
    let subject = await prisma.subject.findFirst({
      where: { schoolId: school.id, code: subjectCode }
    });

    if (!subject) {
      // Create Subject (master entry)
      subject = await prisma.subject.create({
        data: {
          schoolId: school.id,
          name: row.subject_name,
          code: subjectCode,
          description: `${row.faculty} subject for Grade ${row.class_level}`,
          isOptional: row.is_compulsory === 0,
          creditHours: row.total_credit_hour,
          hasPractical: row.practical_full_marks > 0,
        }
      });
      createdSubjects++;
      console.log(`✅ Created Subject: ${subject.name} (${subject.code})`);
    } else {
      console.log(`⏭️  Subject exists: ${subject.name} (${subject.code})`);
    }

    // Check if ClassSubject already exists
    let classSubject = await prisma.classSubject.findFirst({
      where: {
        classId: gradeClass.id,
        academicYearId: academicYear.id,
        subjectId: subject.id
      }
    });

    if (!classSubject) {
      // Create ClassSubject (links subject to class for this year)
      const fullMarks = row.theory_full_marks + row.practical_full_marks;
      const passMarks = Math.ceil(fullMarks * 0.4); // 40% pass

      classSubject = await prisma.classSubject.create({
        data: {
          classId: gradeClass.id,
          academicYearId: academicYear.id,
          subjectId: subject.id,
          hasTheory: row.theory_full_marks > 0,
          hasPractical: row.practical_full_marks > 0,
          theoryMarks: row.theory_full_marks,
          practicalMarks: row.practical_full_marks,
          fullMarks: fullMarks,
          passMarks: passMarks,
          creditHours: row.total_credit_hour,
        }
      });
      createdClassSubjects++;
      console.log(`   ✅ Created ClassSubject for ${gradeClass.name}`);
    }

    // Create SubjectComponent for Theory
    const existingTheory = await prisma.subjectComponent.findFirst({
      where: { subjectId: subject.id, classId: gradeClass.id, type: 'THEORY' }
    });
    if (!existingTheory && row.theory_full_marks > 0) {
      await prisma.subjectComponent.create({
        data: {
          subjectId: subject.id,
          classId: gradeClass.id,
          type: 'THEORY',
          subjectCode: String(row.theory_code),
          fullMarks: row.theory_full_marks,
          passMarks: Math.ceil(row.theory_full_marks * 0.4),
          creditHours: row.theory_credit_hour,
        }
      });
      createdComponents++;
      console.log(`   📖 Created THEORY component (${row.theory_code})`);
    }

    // Create SubjectComponent for Practical
    const existingPractical = await prisma.subjectComponent.findFirst({
      where: { subjectId: subject.id, classId: gradeClass.id, type: 'PRACTICAL' }
    });
    if (!existingPractical && row.practical_full_marks > 0) {
      await prisma.subjectComponent.create({
        data: {
          subjectId: subject.id,
          classId: gradeClass.id,
          type: 'PRACTICAL',
          subjectCode: String(row.practical_code),
          fullMarks: row.practical_full_marks,
          passMarks: Math.ceil(row.practical_full_marks * 0.4),
          creditHours: row.practical_credit_hour,
        }
      });
      createdComponents++;
      console.log(`   🔬 Created PRACTICAL component (${row.practical_code})`);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   Subjects created: ${createdSubjects}`);
  console.log(`   ClassSubjects created: ${createdClassSubjects}`);
  console.log(`   SubjectComponents created: ${createdComponents}`);
  console.log('\n✅ NEB Subjects import completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
