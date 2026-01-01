const prisma = require('./src/config/database');

async function fixAssignments() {
  try {
    const updated = await prisma.assignment.updateMany({
      data: { isPublished: true },
    });
    console.log(`Updated ${updated.count} assignments to published.`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fixAssignments();
