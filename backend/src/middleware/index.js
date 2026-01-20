const { errorHandler, notFound } = require('./error.middleware');
const { authenticate, optionalAuth } = require('./auth.middleware');
const {
  authorize,
  requireRole,
  isAdmin,
  isTeacher,
  isStudent,
  isParent,
  isExamOfficer,
  canEnterMarks,
  getMarksEntryRole,
  schoolScope,
} = require('./authorize.middleware');
const validate = require('./validate.middleware');
const {
  isOwner,
  isAssignedTeacher,
  canAccessSubject,
  isOwnStudent,
  isParentOfStudent,
  canAccessAttendance,
  canAccessResults,
  canAccessAssignment,
  checkOwnership,
} = require('./ownership.middleware');
const {
  loadTeacherContext,
  loadStudentContext,
  loadParentContext,
  loadUserContext,
} = require('./context.middleware');

module.exports = {
  // Error handling
  errorHandler,
  notFound,
  
  // Authentication
  authenticate,
  optionalAuth,
  
  // Authorization
  authorize,
  requireRole,
  isAdmin,
  isTeacher,
  isStudent,
  isParent,
  isExamOfficer,
  canEnterMarks,
  getMarksEntryRole,
  schoolScope,
  
  // Validation
  validate,
  
  // Ownership checks
  isOwner,
  isAssignedTeacher,
  canAccessSubject,
  isOwnStudent,
  isParentOfStudent,
  canAccessAttendance,
  canAccessResults,
  canAccessAssignment,
  checkOwnership,
  
  // Context loaders
  loadTeacherContext,
  loadStudentContext,
  loadParentContext,
  loadUserContext,
};

