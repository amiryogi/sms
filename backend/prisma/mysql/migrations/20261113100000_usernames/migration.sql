-- Sign in with a username (email becomes optional), and a flag that makes a
-- user choose a new password after an admin set or reset it.
--
-- Backfill, so every existing user can sign in by username at once:
--   students -> their admission number            (stu20240001)
--   parents  -> "p." + their first child's number (p.stu20240001)
--   others   -> the part of the email before "@"  (teacher1)
-- lower case, only a-z 0-9 . _ - kept, at most 45 characters; when two users of
-- a school get the same name, the second becomes name.2, the third name.3.
-- Everyone keeps signing in by email too.

-- AlterTable
ALTER TABLE `users` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `username` VARCHAR(50) NULL,
    MODIFY `email` VARCHAR(255) NULL;

-- Backfill
UPDATE `users` u
JOIN (
  SELECT b.id, b.base, ROW_NUMBER() OVER (PARTITION BY b.school_id, b.base ORDER BY b.id) AS rn
  FROM (
    SELECT u2.id, u2.school_id,
      COALESCE(
        NULLIF(LEFT(REGEXP_REPLACE(LOWER(COALESCE(
          s.admission_number,
          CONCAT('p.', (
            SELECT s2.admission_number
            FROM `student_parents` sp
            JOIN `students` s2 ON s2.id = sp.student_id
            WHERE sp.parent_id = p.id
            ORDER BY sp.is_primary DESC, sp.id
            LIMIT 1
          )),
          SUBSTRING_INDEX(u2.email, '@', 1)
        )), '[^a-z0-9._-]', ''), 45), ''),
        CONCAT('user', u2.id)
      ) AS base
    FROM `users` u2
    LEFT JOIN `students` s ON s.user_id = u2.id
    LEFT JOIN `parents` p ON p.user_id = u2.id
  ) b
) x ON x.id = u.id
SET u.username = IF(x.rn = 1, x.base, CONCAT(x.base, '.', x.rn));

-- Safety net: a generated "name.2" that equals someone's own base gets the user id instead.
UPDATE `users` u
JOIN (
  SELECT d.school_id, d.username
  FROM (SELECT school_id, username FROM `users` GROUP BY school_id, username HAVING COUNT(*) > 1) d
) dup ON dup.school_id = u.school_id AND dup.username = u.username
SET u.username = CONCAT(LEFT(u.username, 38), '.u', u.id);

-- CreateIndex
CREATE UNIQUE INDEX `users_username_school_id_key` ON `users`(`username`, `school_id`);
