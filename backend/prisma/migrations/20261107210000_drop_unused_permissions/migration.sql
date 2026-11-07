-- Roles, not permissions, decide access everywhere except the attendance,
-- result and report-card routes (CLAUDE.md §5). Remove the 48 permissions no
-- route ever checked. Their role grants go with them (role_permissions has
-- ON DELETE CASCADE). On a fresh database this deletes nothing; the seed then
-- creates only the 11 below.
DELETE FROM `permissions`
WHERE `name` NOT IN (
  'attendance.mark',
  'attendance.view_all',
  'attendance.view_own',
  'attendance.view_class',
  'result.enter',
  'result.view_all',
  'result.view_own',
  'result.view_child',
  'report_card.view_all',
  'report_card.view_own',
  'report_card.view_child'
);
