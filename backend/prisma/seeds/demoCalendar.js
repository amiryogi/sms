/**
 * Demo school-calendar events, so the calendar is not empty after a seed.
 *
 * Added only when the school has no calendar events yet. None of them is a
 * holiday: a seeded holiday would close the register on that day (attendance
 * is refused on non-working days). Holidays come from the admin's own import
 * (Calendar -> Holidays -> Import).
 */
const { todayAd, addDays, weekdayOf, bsToAd, adToBs } = require("../../src/utils/calendar/bsDateAdapter");
const { parseDateOnly } = require("../../src/utils/calendar/dateValidation");

/** The first day on or after `iso` that is not a Saturday. */
const schoolDay = (iso) => (weekdayOf(iso) === 6 ? addDays(iso, 1) : iso);

async function seedDemoCalendar(prisma, { school, academicYear, adminUser }) {
  const existing = await prisma.calendarEvent.count({ where: { schoolId: school.id } });
  if (existing > 0) {
    console.log("   ⏭  Calendar events already exist: demo calendar skipped\n");
    return;
  }

  const today = todayAd();
  const bsToday = adToBs(today);
  const teacherRole = await prisma.role.findFirst({ where: { name: "TEACHER" }, select: { id: true } });
  const firstClass = await prisma.class.findFirst({ where: { schoolId: school.id }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }], select: { id: true } });

  const events = [
    { title: "Parent-teacher meeting", category: "PARENT_TEACHER_MEETING", start: schoolDay(addDays(today, 6)), time: ["10:00", "13:00"], description: "Parents meet the class teachers. Report cards are discussed." },
    { title: "Annual sports day", category: "SPORTS_EVENT", start: schoolDay(addDays(today, 13)), days: 2, description: "Track and field events on the school ground." },
    { title: "Staff meeting", category: "STAFF_MEETING", start: schoolDay(addDays(today, 3)), time: ["15:30", "16:30"], roleId: teacherRole?.id },
    { title: "Admission forms close", category: "ADMISSION_DEADLINE", start: schoolDay(addDays(today, 24)) },
    { title: "Science exhibition", category: "ACADEMIC_ACTIVITY", start: schoolDay(addDays(today, 18)), classId: firstClass?.id },
    // The same BS day every year, to show a repeating event.
    { title: "School anniversary", category: "SCHOOL_EVENT", start: bsToAd({ year: bsToday.year - 1, month: 11, day: 15 }), recurrence: "YEARLY_BS" },
  ];

  for (const e of events) {
    const audiences = e.roleId ? [{ roleId: e.roleId }] : e.classId ? [{ classId: e.classId }] : [];
    await prisma.calendarEvent.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        title: e.title,
        description: e.description ?? null,
        category: e.category,
        startDate: parseDateOnly(e.start),
        endDate: parseDateOnly(addDays(e.start, (e.days ?? 1) - 1)),
        isAllDay: !e.time,
        startTime: e.time?.[0] ?? null,
        endTime: e.time?.[1] ?? null,
        recurrence: e.recurrence ?? "NONE",
        audienceType: e.roleId ? "ROLE" : e.classId ? "CLASS" : "ALL",
        status: "PUBLISHED",
        createdById: adminUser.id,
        audiences: { create: audiences },
      },
    });
  }
  console.log(`   ✓ Created ${events.length} calendar events\n`);
}

module.exports = { seedDemoCalendar };
