/**
 * Audit / backfill ExamResult.grade
 *
 * Until recently, marks saved through POST /api/v1/results were graded by an
 * inline table in result.controller.js that:
 *   - omitted the D band entirely (35-39% was graded "F"),
 *   - emitted "F", which is not a grade in the NEB scale,
 *   - ignored the per-component 35% rule, so a strong practical could mask a
 *     failed theory paper, and
 *   - divided by ExamSubject.fullMarks rather than theory + practical full marks.
 *
 * That path now uses gradeCalculator.calculateSubjectGrade, the same function the
 * report card uses. This script finds rows whose stored grade disagrees with that
 * function and optionally rewrites them.
 *
 * Each row is graded on its school's current default grade scale, which is what
 * saving the marks again would store. Run it after changing a school's default
 * scale if you want stored grades to follow.
 *
 * Run from backend/:
 *   node scripts/audit-exam-grades.js           # report only
 *   node scripts/audit-exam-grades.js --apply   # write corrections
 *
 * Take a database backup before --apply.
 */
const prisma = require('../src/config/database');
const gradeCalculator = require('../src/utils/gradeCalculator');
const { getDefaultScale } = require('../src/services/gradeScale.service');

const APPLY = process.argv.includes('--apply');

(async () => {
  const rows = await prisma.examResult.findMany({
    include: {
      examSubject: { include: { classSubject: { include: { subject: true } } } },
    },
  });

  console.log(
    `exam results examined: ${rows.length} ${APPLY ? '(APPLY MODE)' : '(read-only)'}`
  );

  const scales = new Map();
  const scaleFor = async (schoolId) => {
    if (!scales.has(schoolId)) scales.set(schoolId, await getDefaultScale(schoolId));
    return scales.get(schoolId);
  };

  const mismatches = [];
  for (const r of rows) {
    const es = r.examSubject;
    const correct = gradeCalculator.calculateSubjectGrade(
      {
        theoryMarks: Number(r.marksObtained || 0),
        theoryFullMarks: es.theoryFullMarks || es.fullMarks || 100,
        practicalMarks: Number(r.practicalMarks || 0),
        practicalFullMarks: es.practicalFullMarks || 0,
        hasPractical: Boolean(es.hasPractical),
        isAbsent: Boolean(r.isAbsent),
      },
      await scaleFor(r.schoolId),
    ).finalGrade;

    if (r.grade !== correct) {
      mismatches.push({
        id: r.id,
        subject: es.classSubject?.subject?.name || '?',
        marks:
          `${r.marksObtained}/${es.theoryFullMarks || es.fullMarks}` +
          (es.hasPractical ? ` + ${r.practicalMarks}/${es.practicalFullMarks}` : ''),
        stored: r.grade === null ? '(null)' : r.grade,
        correct,
      });
    }
  }

  console.log(`mismatched: ${mismatches.length}`);

  const byPair = {};
  mismatches.forEach((m) => {
    const k = `${m.stored} -> ${m.correct}`;
    byPair[k] = (byPair[k] || 0) + 1;
  });
  Object.entries(byPair)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`   ${k.padEnd(18)} ${v}`));

  if (mismatches.length) {
    console.log('\nsamples:');
    mismatches.slice(0, 10).forEach((m) =>
      console.log(
        `   id ${String(m.id).padStart(5)}  ${m.subject.padEnd(26)}` +
          `${m.marks.padEnd(24)}${m.stored.padEnd(8)} -> ${m.correct}`
      )
    );
  }

  const storedF = mismatches.filter((m) => m.stored === 'F').length;
  console.log(`\nrows storing the non-NEB grade "F": ${storedF}`);

  if (APPLY && mismatches.length) {
    let n = 0;
    for (const m of mismatches) {
      await prisma.examResult.update({
        where: { id: m.id },
        data: { grade: m.correct },
      });
      n++;
    }
    console.log(`\nupdated ${n} rows`);
  } else if (mismatches.length) {
    console.log('\nre-run with --apply to write these corrections');
  }
})()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
