const prisma = require('../config/database');

/**
 * Create an audit log entry for subject changes
 * @param {Object} params
 * @param {number} [params.classSubjectId] - ID of the class subject (if applicable)
 * @param {number} [params.subjectId] - ID of the subject (if applicable)
 * @param {string} params.action - CREATE, UPDATE, LOCK, or DELETE
 * @param {Object} [params.oldValue] - Previous value (for UPDATE)
 * @param {Object} [params.newValue] - New value (for CREATE, UPDATE)
 * @param {number} params.userId - User performing the action
 */
const createSubjectAudit = async ({ classSubjectId, subjectId, action, oldValue, newValue, userId }) => {
  try {
    await prisma.subjectAudit.create({
      data: {
        classSubjectId,
        subjectId,
        action,
        oldValue: oldValue || undefined,
        newValue: newValue || undefined,
        performedByUserId: userId,
      },
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to create subject audit log:', error);
  }
};

/**
 * Check if a class subject is locked
 * @param {number} classSubjectId
 * @returns {Promise<boolean>}
 */
const isClassSubjectLocked = async (classSubjectId) => {
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: classSubjectId },
    select: { isLocked: true },
  });
  return classSubject?.isLocked || false;
};

/**
 * Lock a class subject (typically when exams/marks are created)
 * @param {number} classSubjectId
 * @param {number} userId - User triggering the lock
 */
const lockClassSubject = async (classSubjectId, userId) => {
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: classSubjectId },
  });

  if (!classSubject || classSubject.isLocked) {
    return; // Already locked or doesn't exist
  }

  await prisma.classSubject.update({
    where: { id: classSubjectId },
    data: { isLocked: true },
  });

  // Audit the lock
  await createSubjectAudit({
    classSubjectId,
    action: 'LOCK',
    oldValue: { isLocked: false },
    newValue: { isLocked: true },
    userId,
  });
};

module.exports = {
  createSubjectAudit,
  isClassSubjectLocked,
  lockClassSubject,
};
