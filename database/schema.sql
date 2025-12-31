-- =====================================================
-- K-12 SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- MySQL 8.0+
-- =====================================================

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS school_management;
CREATE DATABASE school_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_management;

-- =====================================================
-- 1. CORE: SCHOOLS TABLE (Multi-school Ready)
-- =====================================================

CREATE TABLE schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_schools_code (code),
    INDEX idx_schools_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- 2. RBAC: ROLES TABLE
-- =====================================================

CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_roles_name (name)
) ENGINE=InnoDB;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Super Administrator - Multi-school owner'),
('ADMIN', 'School Administrator'),
('TEACHER', 'Teacher'),
('STUDENT', 'Student'),
('PARENT', 'Parent/Guardian');

-- =====================================================
-- 3. RBAC: PERMISSIONS TABLE
-- =====================================================

CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_permissions_name (name),
    INDEX idx_permissions_module (module)
) ENGINE=InnoDB;

-- Insert default permissions
INSERT INTO permissions (name, module, description) VALUES
-- User Management
('user.create', 'users', 'Create new users'),
('user.read', 'users', 'View user details'),
('user.update', 'users', 'Update user information'),
('user.delete', 'users', 'Delete users'),
('user.list', 'users', 'List all users'),

-- Student Management
('student.create', 'students', 'Create new students'),
('student.read', 'students', 'View student details'),
('student.update', 'students', 'Update student information'),
('student.delete', 'students', 'Delete students'),
('student.list', 'students', 'List students'),
('student.view_own', 'students', 'View own student profile'),

-- Teacher Management
('teacher.create', 'teachers', 'Create new teachers'),
('teacher.read', 'teachers', 'View teacher details'),
('teacher.update', 'teachers', 'Update teacher information'),
('teacher.delete', 'teachers', 'Delete teachers'),
('teacher.list', 'teachers', 'List teachers'),

-- Academic Structure
('academic_year.manage', 'academic', 'Manage academic years'),
('class.manage', 'academic', 'Manage classes'),
('section.manage', 'academic', 'Manage sections'),
('subject.manage', 'academic', 'Manage subjects'),
('class_subject.manage', 'academic', 'Manage class-subject assignments'),
('teacher_subject.manage', 'academic', 'Manage teacher assignments'),

-- Attendance
('attendance.mark', 'attendance', 'Mark attendance'),
('attendance.view_all', 'attendance', 'View all attendance records'),
('attendance.view_own', 'attendance', 'View own attendance'),
('attendance.view_class', 'attendance', 'View class attendance'),

-- Exams
('exam.create', 'exams', 'Create exams'),
('exam.read', 'exams', 'View exam details'),
('exam.update', 'exams', 'Update exam information'),
('exam.delete', 'exams', 'Delete exams'),
('exam.manage_subjects', 'exams', 'Manage exam subjects'),

-- Results
('result.enter', 'results', 'Enter exam results'),
('result.view_all', 'results', 'View all results'),
('result.view_own', 'results', 'View own results'),
('result.view_child', 'results', 'View child results'),
('result.publish', 'results', 'Publish results'),

-- Report Cards
('report_card.generate', 'report_cards', 'Generate report cards'),
('report_card.view_all', 'report_cards', 'View all report cards'),
('report_card.view_own', 'report_cards', 'View own report card'),
('report_card.view_child', 'report_cards', 'View child report card'),

-- Assignments
('assignment.create', 'assignments', 'Create assignments'),
('assignment.read', 'assignments', 'View assignments'),
('assignment.update', 'assignments', 'Update assignments'),
('assignment.delete', 'assignments', 'Delete assignments'),
('assignment.grade', 'assignments', 'Grade submissions'),
('assignment.submit', 'assignments', 'Submit assignments'),
('assignment.view_own', 'assignments', 'View own assignments'),

-- Notices
('notice.create', 'notices', 'Create notices'),
('notice.read', 'notices', 'View notices'),
('notice.update', 'notices', 'Update notices'),
('notice.delete', 'notices', 'Delete notices'),

-- Promotions
('promotion.process', 'promotions', 'Process student promotions'),
('promotion.view', 'promotions', 'View promotion history');

-- =====================================================
-- 4. RBAC: ROLE_PERMISSIONS TABLE
-- =====================================================

CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    
    INDEX idx_role_permissions_role (role_id),
    INDEX idx_role_permissions_permission (permission_id)
) ENGINE=InnoDB;

-- Assign permissions to roles
-- ADMIN gets most permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    id
FROM permissions
WHERE name NOT IN ('student.view_own', 'attendance.view_own', 'result.view_own', 
                   'result.view_child', 'report_card.view_own', 'report_card.view_child',
                   'assignment.submit', 'assignment.view_own');

-- TEACHER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'TEACHER'),
    id
FROM permissions
WHERE name IN ('student.read', 'student.list', 'attendance.mark', 'attendance.view_class',
               'exam.read', 'result.enter', 'result.view_all', 'assignment.create', 
               'assignment.read', 'assignment.update', 'assignment.delete', 'assignment.grade',
               'notice.read', 'notice.create');

-- STUDENT permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'STUDENT'),
    id
FROM permissions
WHERE name IN ('student.view_own', 'attendance.view_own', 'result.view_own', 
               'report_card.view_own', 'assignment.submit', 'assignment.view_own', 
               'notice.read');

-- PARENT permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'PARENT'),
    id
FROM permissions
WHERE name IN ('attendance.view_own', 'result.view_child', 'report_card.view_child', 
               'assignment.view_own', 'notice.read');

-- =====================================================
-- 5. USERS TABLE
-- =====================================================

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_user_email_school (email, school_id),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    INDEX idx_users_school (school_id),
    INDEX idx_users_email (email),
    INDEX idx_users_status (status),
    INDEX idx_users_name (first_name, last_name)
) ENGINE=InnoDB;

-- =====================================================
-- 6. USER_ROLES TABLE (Many-to-Many)
-- =====================================================

CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id)
) ENGINE=InnoDB;

-- =====================================================
-- 7. ACADEMIC_YEARS TABLE
-- =====================================================

CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_academic_year_school (school_id, name),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    INDEX idx_academic_years_school (school_id),
    INDEX idx_academic_years_current (is_current),
    INDEX idx_academic_years_dates (start_date, end_date)
) ENGINE=InnoDB;

-- =====================================================
-- 8. CLASSES TABLE
-- =====================================================

CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    grade_level INT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_class_school (school_id, name),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    INDEX idx_classes_school (school_id),
    INDEX idx_classes_grade (grade_level)
) ENGINE=InnoDB;

-- =====================================================
-- 9. SECTIONS TABLE
-- =====================================================

CREATE TABLE sections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(10) NOT NULL,
    capacity INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_section_school (school_id, name),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    INDEX idx_sections_school (school_id)
) ENGINE=InnoDB;

-- =====================================================
-- 10. SUBJECTS TABLE (Master List)
-- =====================================================

CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_subject_code_school (school_id, code),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    
    INDEX idx_subjects_school (school_id),
    INDEX idx_subjects_code (code)
) ENGINE=InnoDB;

-- =====================================================
-- 11. CLASS_SUBJECTS TABLE (Dynamic Subjects per Class per Year)
-- =====================================================

CREATE TABLE class_subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    subject_id INT NOT NULL,
    full_marks INT DEFAULT 100,
    pass_marks INT DEFAULT 40,
    credit_hours DECIMAL(3,1) DEFAULT 3.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_class_subject_year (class_id, academic_year_id, subject_id),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    INDEX idx_class_subjects_class (class_id),
    INDEX idx_class_subjects_year (academic_year_id),
    INDEX idx_class_subjects_subject (subject_id),
    INDEX idx_class_subjects_class_year (class_id, academic_year_id)
) ENGINE=InnoDB;

-- =====================================================
-- 12. TEACHER_SUBJECTS TABLE (Teacher Assignments)
-- =====================================================

CREATE TABLE teacher_subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_subject_id INT NOT NULL,
    section_id INT NOT NULL,
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_teacher_class_subject_section (user_id, class_subject_id, section_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    
    INDEX idx_teacher_subjects_user (user_id),
    INDEX idx_teacher_subjects_class_subject (class_subject_id),
    INDEX idx_teacher_subjects_section (section_id)
) ENGINE=InnoDB;

-- =====================================================
-- 13. STUDENTS TABLE (Extended Profile)
-- =====================================================

CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    admission_number VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact VARCHAR(20),
    admission_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_students_user (user_id),
    INDEX idx_students_admission_number (admission_number),
    INDEX idx_students_dob (date_of_birth)
) ENGINE=InnoDB;

-- Add unique constraint for admission_number per school (via user)
-- This is enforced at application level since admission_number should be unique per school

-- =====================================================
-- 14. STUDENT_CLASSES TABLE (Enrollment per Academic Year)
-- =====================================================

CREATE TABLE student_classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    roll_number INT,
    status ENUM('active', 'transferred', 'graduated', 'dropped') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_student_class_year (student_id, academic_year_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    
    INDEX idx_student_classes_student (student_id),
    INDEX idx_student_classes_class (class_id),
    INDEX idx_student_classes_section (section_id),
    INDEX idx_student_classes_year (academic_year_id),
    INDEX idx_student_classes_status (status),
    INDEX idx_student_classes_class_section_year (class_id, section_id, academic_year_id)
) ENGINE=InnoDB;

-- =====================================================
-- 15. PARENTS TABLE (Extended Profile)
-- =====================================================

CREATE TABLE parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    occupation VARCHAR(100),
    workplace VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_parents_user (user_id)
) ENGINE=InnoDB;

-- =====================================================
-- 16. STUDENT_PARENTS TABLE (Many-to-Many Relationship)
-- =====================================================

CREATE TABLE student_parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    parent_id INT NOT NULL,
    relationship ENUM('father', 'mother', 'guardian') NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_student_parent (student_id, parent_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
    
    INDEX idx_student_parents_student (student_id),
    INDEX idx_student_parents_parent (parent_id)
) ENGINE=InnoDB;

-- =====================================================
-- 17. ATTENDANCE TABLE
-- =====================================================

CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_class_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    remarks TEXT,
    marked_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_attendance_student_date (student_id, attendance_date),
    FOREIGN KEY (student_class_id) REFERENCES student_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_attendance_student_class (student_class_id),
    INDEX idx_attendance_student (student_id),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_status (status),
    INDEX idx_attendance_marked_by (marked_by),
    INDEX idx_attendance_student_date_range (student_id, attendance_date)
) ENGINE=InnoDB;

-- =====================================================
-- 18. EXAMS TABLE
-- =====================================================

CREATE TABLE exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    exam_type ENUM('unit_test', 'midterm', 'final', 'board') NOT NULL,
    start_date DATE,
    end_date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    
    INDEX idx_exams_school (school_id),
    INDEX idx_exams_year (academic_year_id),
    INDEX idx_exams_type (exam_type),
    INDEX idx_exams_published (is_published),
    INDEX idx_exams_dates (start_date, end_date)
) ENGINE=InnoDB;

-- =====================================================
-- 19. EXAM_SUBJECTS TABLE
-- =====================================================

CREATE TABLE exam_subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    class_subject_id INT NOT NULL,
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    full_marks INT NOT NULL,
    pass_marks INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_exam_class_subject (exam_id, class_subject_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id) ON DELETE CASCADE,
    
    INDEX idx_exam_subjects_exam (exam_id),
    INDEX idx_exam_subjects_class_subject (class_subject_id),
    INDEX idx_exam_subjects_date (exam_date)
) ENGINE=InnoDB;

-- =====================================================
-- 20. EXAM_RESULTS TABLE
-- =====================================================

CREATE TABLE exam_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_subject_id INT NOT NULL,
    student_id INT NOT NULL,
    marks_obtained DECIMAL(5,2),
    practical_marks DECIMAL(5,2) DEFAULT 0,
    grade VARCHAR(5),
    remarks TEXT,
    entered_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_result_exam_student (exam_subject_id, student_id),
    FOREIGN KEY (exam_subject_id) REFERENCES exam_subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_exam_results_exam_subject (exam_subject_id),
    INDEX idx_exam_results_student (student_id),
    INDEX idx_exam_results_entered_by (entered_by),
    INDEX idx_exam_results_grade (grade)
) ENGINE=InnoDB;

-- =====================================================
-- 21. REPORT_CARDS TABLE
-- =====================================================

CREATE TABLE report_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    student_class_id INT NOT NULL,
    total_marks DECIMAL(7,2),
    percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    rank INT,
    teacher_remarks TEXT,
    principal_remarks TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_report_card_student_exam (student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_class_id) REFERENCES student_classes(id) ON DELETE CASCADE,
    
    INDEX idx_report_cards_student (student_id),
    INDEX idx_report_cards_exam (exam_id),
    INDEX idx_report_cards_class (student_class_id),
    INDEX idx_report_cards_published (is_published),
    INDEX idx_report_cards_rank (rank)
) ENGINE=InnoDB;

-- =====================================================
-- 22. ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_subject_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    total_marks INT DEFAULT 100,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (teacher_subject_id) REFERENCES teacher_subjects(id) ON DELETE CASCADE,
    
    INDEX idx_assignments_teacher_subject (teacher_subject_id),
    INDEX idx_assignments_due_date (due_date),
    INDEX idx_assignments_published (is_published)
) ENGINE=InnoDB;

-- =====================================================
-- 23. ASSIGNMENT_FILES TABLE
-- =====================================================

CREATE TABLE assignment_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    
    INDEX idx_assignment_files_assignment (assignment_id)
) ENGINE=InnoDB;

-- =====================================================
-- 24. SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    content TEXT,
    status ENUM('submitted', 'late', 'graded', 'returned') DEFAULT 'submitted',
    marks_obtained DECIMAL(5,2),
    feedback TEXT,
    graded_by INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_submission_assignment_student (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_submissions_assignment (assignment_id),
    INDEX idx_submissions_student (student_id),
    INDEX idx_submissions_status (status),
    INDEX idx_submissions_graded_by (graded_by)
) ENGINE=InnoDB;

-- =====================================================
-- 25. SUBMISSION_FILES TABLE
-- =====================================================

CREATE TABLE submission_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    
    INDEX idx_submission_files_submission (submission_id)
) ENGINE=InnoDB;

-- =====================================================
-- 26. NOTICES TABLE
-- =====================================================

CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    created_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience ENUM('all', 'students', 'parents', 'teachers') DEFAULT 'all',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_published BOOLEAN DEFAULT FALSE,
    publish_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_notices_school (school_id),
    INDEX idx_notices_created_by (created_by),
    INDEX idx_notices_target (target_audience),
    INDEX idx_notices_priority (priority),
    INDEX idx_notices_published (is_published),
    INDEX idx_notices_dates (publish_date, expiry_date)
) ENGINE=InnoDB;

-- =====================================================
-- 27. PROMOTIONS TABLE
-- =====================================================

CREATE TABLE promotions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    from_class_id INT NOT NULL,
    from_academic_year_id INT NOT NULL,
    to_class_id INT,
    to_academic_year_id INT NOT NULL,
    status ENUM('promoted', 'detained', 'graduated') NOT NULL,
    remarks TEXT,
    processed_by INT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (from_class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_promotions_student (student_id),
    INDEX idx_promotions_from_year (from_academic_year_id),
    INDEX idx_promotions_to_year (to_academic_year_id),
    INDEX idx_promotions_status (status),
    INDEX idx_promotions_processed_by (processed_by)
) ENGINE=InnoDB;

-- =====================================================
-- 28. REFRESH_TOKENS TABLE (For JWT Auth)
-- =====================================================

CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_token (token(255)),
    INDEX idx_refresh_tokens_expires (expires_at)
) ENGINE=InnoDB;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Teacher's assigned classes with details
CREATE VIEW v_teacher_assignments AS
SELECT 
    ts.id AS assignment_id,
    u.id AS teacher_id,
    CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
    c.id AS class_id,
    c.name AS class_name,
    sec.id AS section_id,
    sec.name AS section_name,
    sub.id AS subject_id,
    sub.name AS subject_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year,
    ts.is_class_teacher
FROM teacher_subjects ts
JOIN users u ON ts.user_id = u.id
JOIN class_subjects cs ON ts.class_subject_id = cs.id
JOIN classes c ON cs.class_id = c.id
JOIN sections sec ON ts.section_id = sec.id
JOIN subjects sub ON cs.subject_id = sub.id
JOIN academic_years ay ON cs.academic_year_id = ay.id;

-- View: Student enrollment with full details
CREATE VIEW v_student_enrollment AS
SELECT 
    s.id AS student_id,
    u.id AS user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS student_name,
    s.admission_number,
    c.id AS class_id,
    c.name AS class_name,
    sec.id AS section_id,
    sec.name AS section_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year,
    sc.roll_number,
    sc.status
FROM students s
JOIN users u ON s.user_id = u.id
JOIN student_classes sc ON s.id = sc.student_id
JOIN classes c ON sc.class_id = c.id
JOIN sections sec ON sc.section_id = sec.id
JOIN academic_years ay ON sc.academic_year_id = ay.id;

-- View: Class subjects with full details
CREATE VIEW v_class_subjects AS
SELECT 
    cs.id AS class_subject_id,
    c.id AS class_id,
    c.name AS class_name,
    ay.id AS academic_year_id,
    ay.name AS academic_year,
    sub.id AS subject_id,
    sub.name AS subject_name,
    sub.code AS subject_code,
    cs.full_marks,
    cs.pass_marks,
    cs.credit_hours
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN academic_years ay ON cs.academic_year_id = ay.id
JOIN subjects sub ON cs.subject_id = sub.id;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert a sample school
INSERT INTO schools (name, code, address, phone, email) VALUES
('Demo School', 'DEMO001', '123 Education Street, Learning City', '+977-1-1234567', 'info@demoschool.edu.np');

-- Insert a sample admin user (password: Admin@123)
INSERT INTO users (school_id, email, password_hash, first_name, last_name, phone, status) VALUES
(1, 'admin@demoschool.edu.np', '$2b$10$rOzJj9qKQP.K6Qx7ZxKjKuVJJnZ5JZJXJZJXJZJXJZJXJZJXJZJX', 'System', 'Admin', '+977-9800000000', 'active');

-- Assign admin role
INSERT INTO user_roles (user_id, role_id) VALUES
(1, (SELECT id FROM roles WHERE name = 'ADMIN'));

-- Insert sample academic year
INSERT INTO academic_years (school_id, name, start_date, end_date, is_current) VALUES
(1, '2024-2025', '2024-04-01', '2025-03-31', TRUE);

-- Insert sample classes (Grade 1-12)
INSERT INTO classes (school_id, name, grade_level, display_order) VALUES
(1, 'Grade 1', 1, 1),
(1, 'Grade 2', 2, 2),
(1, 'Grade 3', 3, 3),
(1, 'Grade 4', 4, 4),
(1, 'Grade 5', 5, 5),
(1, 'Grade 6', 6, 6),
(1, 'Grade 7', 7, 7),
(1, 'Grade 8', 8, 8),
(1, 'Grade 9', 9, 9),
(1, 'Grade 10', 10, 10),
(1, 'Grade 11', 11, 11),
(1, 'Grade 12', 12, 12);

-- Insert sample sections
INSERT INTO sections (school_id, name, capacity) VALUES
(1, 'A', 40),
(1, 'B', 40),
(1, 'C', 40);

-- Insert sample subjects
INSERT INTO subjects (school_id, name, code, is_optional) VALUES
(1, 'English', 'ENG', FALSE),
(1, 'Mathematics', 'MATH', FALSE),
(1, 'Science', 'SCI', FALSE),
(1, 'Social Studies', 'SOC', FALSE),
(1, 'Nepali', 'NEP', FALSE),
(1, 'Computer Science', 'CS', TRUE),
(1, 'Physical Education', 'PE', FALSE),
(1, 'Moral Education', 'ME', FALSE);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
