-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: school_management
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('2e4c65a1-8ff7-4ac3-95b4-042e6de9292d','41c5617f02fe2cb9068d3272be7e89e04f55dd76660a2f14dbc25fc57a0345bc','2026-01-02 08:32:05.701','20260102083205_add_subject_credits_practical',NULL,NULL,'2026-01-02 08:32:05.636',1),('37efe474-070d-457c-b41f-1de0912e0518','52ff3c244a4ee2739a363fb6196176be9354a1ce7dc76072a8fb56335075f98e','2026-01-02 06:56:33.045','20260102065617_add_exam_status_and_fields',NULL,NULL,'2026-01-02 06:56:29.051',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `academic_years`
--

DROP TABLE IF EXISTS `academic_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_years` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `academic_years_school_id_name_key` (`school_id`,`name`),
  KEY `academic_years_school_id_idx` (`school_id`),
  KEY `academic_years_is_current_idx` (`is_current`),
  KEY `academic_years_start_date_end_date_idx` (`start_date`,`end_date`),
  CONSTRAINT `academic_years_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_years`
--

LOCK TABLES `academic_years` WRITE;
/*!40000 ALTER TABLE `academic_years` DISABLE KEYS */;
INSERT INTO `academic_years` VALUES (1,1,'2024-2025','2024-04-01','2025-03-31',1,'2026-01-02 07:14:22.094','2026-01-02 07:14:22.094');
/*!40000 ALTER TABLE `academic_years` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assignment_files`
--

DROP TABLE IF EXISTS `assignment_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignment_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `assignment_files_assignment_id_idx` (`assignment_id`),
  CONSTRAINT `assignment_files_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignment_files`
--

LOCK TABLES `assignment_files` WRITE;
/*!40000 ALTER TABLE `assignment_files` DISABLE KEYS */;
INSERT INTO `assignment_files` VALUES (1,1,'titaura.jpg','uploads\\files-1767341803651-689804262.jpg','image/jpeg',168690,'2026-01-02 08:16:43.658');
/*!40000 ALTER TABLE `assignment_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assignments`
--

DROP TABLE IF EXISTS `assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_subject_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date NOT NULL,
  `total_marks` int NOT NULL DEFAULT '100',
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assignments_teacher_subject_id_idx` (`teacher_subject_id`),
  KEY `assignments_due_date_idx` (`due_date`),
  KEY `assignments_is_published_idx` (`is_published`),
  CONSTRAINT `assignments_teacher_subject_id_fkey` FOREIGN KEY (`teacher_subject_id`) REFERENCES `teacher_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignments`
--

LOCK TABLES `assignments` WRITE;
/*!40000 ALTER TABLE `assignments` DISABLE KEYS */;
INSERT INTO `assignments` VALUES (1,3,'First HW','Please complete the hw during winter vacation','2026-01-16',10,1,'2026-01-02 08:16:43.658','2026-01-02 08:16:43.658');
/*!40000 ALTER TABLE `assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_class_id` int NOT NULL,
  `student_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent','late','excused') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `marked_by` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_student_id_student_class_id_attendance_date_key` (`student_id`,`student_class_id`,`attendance_date`),
  KEY `attendance_student_class_id_idx` (`student_class_id`),
  KEY `attendance_student_id_idx` (`student_id`),
  KEY `attendance_attendance_date_idx` (`attendance_date`),
  KEY `attendance_status_idx` (`status`),
  KEY `attendance_marked_by_idx` (`marked_by`),
  KEY `attendance_student_id_attendance_date_idx` (`student_id`,`attendance_date`),
  CONSTRAINT `attendance_marked_by_fkey` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (1,3,3,'2026-01-01','absent',NULL,7,'2026-01-02 08:22:50.094','2026-01-02 08:22:50.094'),(2,2,2,'2026-01-01','present',NULL,7,'2026-01-02 08:22:50.097','2026-01-02 08:22:50.097');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `class_subjects`
--

DROP TABLE IF EXISTS `class_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `full_marks` int NOT NULL DEFAULT '100',
  `pass_marks` int NOT NULL DEFAULT '40',
  `credit_hours` decimal(3,1) NOT NULL DEFAULT '3.0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `practical_marks` int NOT NULL DEFAULT '0',
  `theory_marks` int NOT NULL DEFAULT '100',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_subjects_class_id_academic_year_id_subject_id_key` (`class_id`,`academic_year_id`,`subject_id`),
  KEY `class_subjects_class_id_idx` (`class_id`),
  KEY `class_subjects_academic_year_id_idx` (`academic_year_id`),
  KEY `class_subjects_subject_id_idx` (`subject_id`),
  KEY `class_subjects_class_id_academic_year_id_idx` (`class_id`,`academic_year_id`),
  CONSTRAINT `class_subjects_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_subjects`
--

LOCK TABLES `class_subjects` WRITE;
/*!40000 ALTER TABLE `class_subjects` DISABLE KEYS */;
INSERT INTO `class_subjects` VALUES (1,1,1,1,100,40,3.0,'2026-01-02 07:14:22.186',0,100),(2,1,1,2,100,40,3.0,'2026-01-02 07:14:22.194',0,100),(3,1,1,3,100,40,3.0,'2026-01-02 07:14:22.196',0,100),(4,1,1,4,100,40,3.0,'2026-01-02 07:14:22.200',0,100),(5,1,1,5,100,40,3.0,'2026-01-02 07:14:22.204',0,100),(6,2,1,1,100,40,3.0,'2026-01-02 07:14:22.207',0,100),(7,2,1,2,100,40,3.0,'2026-01-02 07:14:22.210',0,100),(8,2,1,3,100,40,3.0,'2026-01-02 07:14:22.213',0,100),(9,2,1,4,100,40,3.0,'2026-01-02 07:14:22.217',0,100),(10,2,1,5,100,40,3.0,'2026-01-02 07:14:22.220',0,100),(11,3,1,1,100,40,3.0,'2026-01-02 07:14:22.224',0,100),(12,3,1,2,100,40,3.0,'2026-01-02 07:14:22.227',0,100),(13,3,1,3,100,40,3.0,'2026-01-02 07:14:22.229',0,100),(14,3,1,4,100,40,3.0,'2026-01-02 07:14:22.233',0,100),(15,3,1,5,100,40,3.0,'2026-01-02 07:14:22.237',0,100),(16,4,1,1,100,40,3.0,'2026-01-02 07:14:22.240',0,100),(17,4,1,2,100,40,3.0,'2026-01-02 07:14:22.243',0,100),(18,4,1,3,100,40,3.0,'2026-01-02 07:14:22.246',0,100),(19,4,1,4,100,40,3.0,'2026-01-02 07:14:22.250',0,100),(20,4,1,5,100,40,3.0,'2026-01-02 07:14:22.255',0,100),(21,5,1,1,100,40,3.0,'2026-01-02 07:14:22.258',0,100),(22,5,1,2,100,40,3.0,'2026-01-02 07:14:22.262',0,100),(23,5,1,3,100,40,3.0,'2026-01-02 07:14:22.265',0,100),(24,5,1,4,100,40,3.0,'2026-01-02 07:14:22.269',0,100),(25,5,1,5,100,40,3.0,'2026-01-02 07:14:22.273',0,100),(26,6,1,1,100,40,3.0,'2026-01-02 07:14:22.276',0,100),(27,6,1,2,100,40,3.0,'2026-01-02 07:14:22.279',0,100),(28,6,1,3,100,40,3.0,'2026-01-02 07:14:22.282',0,100),(29,6,1,4,100,40,3.0,'2026-01-02 07:14:22.286',0,100),(30,6,1,5,100,40,3.0,'2026-01-02 07:14:22.289',0,100),(31,7,1,1,100,40,3.0,'2026-01-02 07:14:22.292',0,100),(32,7,1,2,100,40,3.0,'2026-01-02 07:14:22.295',0,100),(33,7,1,3,100,40,3.0,'2026-01-02 07:14:22.297',0,100),(34,7,1,4,100,40,3.0,'2026-01-02 07:14:22.301',0,100),(35,7,1,5,100,40,3.0,'2026-01-02 07:14:22.304',0,100),(36,8,1,1,100,40,3.0,'2026-01-02 07:14:22.307',0,100),(37,8,1,2,100,40,3.0,'2026-01-02 07:14:22.310',0,100),(38,8,1,3,100,40,3.0,'2026-01-02 07:14:22.313',0,100),(39,8,1,4,100,40,3.0,'2026-01-02 07:14:22.316',0,100),(40,8,1,5,100,40,3.0,'2026-01-02 07:14:22.319',0,100),(41,9,1,1,100,40,3.0,'2026-01-02 07:14:22.324',0,100),(42,9,1,2,100,40,3.0,'2026-01-02 07:14:22.327',0,100),(43,9,1,3,100,40,3.0,'2026-01-02 07:14:22.330',0,100),(44,9,1,4,100,40,3.0,'2026-01-02 07:14:22.334',0,100),(45,9,1,5,100,40,3.0,'2026-01-02 07:14:22.338',0,100),(46,10,1,1,100,40,3.0,'2026-01-02 07:14:22.341',0,100),(47,10,1,2,100,40,3.0,'2026-01-02 07:14:22.344',0,100),(48,10,1,3,100,40,3.0,'2026-01-02 07:14:22.347',0,100),(49,10,1,4,100,40,3.0,'2026-01-02 07:14:22.350',0,100),(50,10,1,5,100,40,3.0,'2026-01-02 07:14:22.353',0,100),(51,11,1,1,100,40,3.0,'2026-01-02 07:14:22.357',0,100),(52,11,1,2,100,40,3.0,'2026-01-02 07:14:22.360',0,100),(53,11,1,3,100,40,3.0,'2026-01-02 07:14:22.363',0,100),(54,11,1,4,100,40,3.0,'2026-01-02 07:14:22.366',0,100),(55,11,1,5,100,40,3.0,'2026-01-02 07:14:22.370',0,100),(56,12,1,1,100,40,3.0,'2026-01-02 07:14:22.373',0,100),(57,12,1,2,100,40,3.0,'2026-01-02 07:14:22.376',0,100),(58,12,1,3,100,40,3.0,'2026-01-02 07:14:22.379',0,100),(59,12,1,4,100,40,3.0,'2026-01-02 07:14:22.382',0,100),(60,12,1,5,100,40,3.0,'2026-01-02 07:14:22.386',0,100);
/*!40000 ALTER TABLE `class_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `classes`
--

DROP TABLE IF EXISTS `classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade_level` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `classes_school_id_name_key` (`school_id`,`name`),
  KEY `classes_school_id_idx` (`school_id`),
  KEY `classes_grade_level_idx` (`grade_level`),
  CONSTRAINT `classes_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `classes`
--

LOCK TABLES `classes` WRITE;
/*!40000 ALTER TABLE `classes` DISABLE KEYS */;
INSERT INTO `classes` VALUES (1,1,'Grade 1',1,NULL,1,'2026-01-02 07:14:22.112'),(2,1,'Grade 2',2,NULL,2,'2026-01-02 07:14:22.117'),(3,1,'Grade 3',3,NULL,3,'2026-01-02 07:14:22.122'),(4,1,'Grade 4',4,NULL,4,'2026-01-02 07:14:22.125'),(5,1,'Grade 5',5,NULL,5,'2026-01-02 07:14:22.128'),(6,1,'Grade 6',6,NULL,6,'2026-01-02 07:14:22.131'),(7,1,'Grade 7',7,NULL,7,'2026-01-02 07:14:22.135'),(8,1,'Grade 8',8,NULL,8,'2026-01-02 07:14:22.139'),(9,1,'Grade 9',9,NULL,9,'2026-01-02 07:14:22.143'),(10,1,'Grade 10',10,NULL,10,'2026-01-02 07:14:22.146'),(11,1,'Grade 11',11,NULL,11,'2026-01-02 07:14:22.150'),(12,1,'Grade 12',12,NULL,12,'2026-01-02 07:14:22.154');
/*!40000 ALTER TABLE `classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_results`
--

DROP TABLE IF EXISTS `exam_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_subject_id` int NOT NULL,
  `student_id` int NOT NULL,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `practical_marks` decimal(5,2) DEFAULT '0.00',
  `is_absent` tinyint(1) NOT NULL DEFAULT '0',
  `grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `entered_by` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_results_exam_subject_id_student_id_key` (`exam_subject_id`,`student_id`),
  KEY `exam_results_exam_subject_id_idx` (`exam_subject_id`),
  KEY `exam_results_student_id_idx` (`student_id`),
  KEY `exam_results_entered_by_idx` (`entered_by`),
  KEY `exam_results_grade_idx` (`grade`),
  CONSTRAINT `exam_results_entered_by_fkey` FOREIGN KEY (`entered_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `exam_results_exam_subject_id_fkey` FOREIGN KEY (`exam_subject_id`) REFERENCES `exam_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_results_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_results`
--

LOCK TABLES `exam_results` WRITE;
/*!40000 ALTER TABLE `exam_results` DISABLE KEYS */;
INSERT INTO `exam_results` VALUES (1,2,2,90.00,NULL,0,NULL,NULL,7,'2026-01-02 08:13:49.995','2026-01-02 08:13:49.995'),(2,2,3,80.00,NULL,0,NULL,NULL,7,'2026-01-02 08:13:49.998','2026-01-02 08:13:49.998');
/*!40000 ALTER TABLE `exam_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_subjects`
--

DROP TABLE IF EXISTS `exam_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `class_subject_id` int NOT NULL,
  `exam_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `full_marks` int NOT NULL,
  `pass_marks` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `practical_full_marks` int NOT NULL DEFAULT '0',
  `theory_full_marks` int NOT NULL DEFAULT '100',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_subjects_exam_id_class_subject_id_key` (`exam_id`,`class_subject_id`),
  KEY `exam_subjects_exam_id_idx` (`exam_id`),
  KEY `exam_subjects_class_subject_id_idx` (`class_subject_id`),
  KEY `exam_subjects_exam_date_idx` (`exam_date`),
  CONSTRAINT `exam_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_subjects_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_subjects`
--

LOCK TABLES `exam_subjects` WRITE;
/*!40000 ALTER TABLE `exam_subjects` DISABLE KEYS */;
INSERT INTO `exam_subjects` VALUES (1,2,46,NULL,NULL,NULL,100,40,'2026-01-02 07:21:56.573',0,100),(2,2,47,NULL,NULL,NULL,100,40,'2026-01-02 07:21:56.573',0,100),(3,2,48,NULL,NULL,NULL,100,40,'2026-01-02 07:21:56.573',0,100),(4,2,49,NULL,NULL,NULL,100,40,'2026-01-02 07:21:56.573',0,100),(5,2,50,NULL,NULL,NULL,100,40,'2026-01-02 07:21:56.573',0,100);
/*!40000 ALTER TABLE `exam_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exams`
--

DROP TABLE IF EXISTS `exams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exam_type` enum('unit_test','midterm','final','board') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('DRAFT','PUBLISHED','LOCKED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_by` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `exams_school_id_idx` (`school_id`),
  KEY `exams_academic_year_id_idx` (`academic_year_id`),
  KEY `exams_exam_type_idx` (`exam_type`),
  KEY `exams_status_idx` (`status`),
  KEY `exams_created_by_idx` (`created_by`),
  KEY `exams_start_date_end_date_idx` (`start_date`,`end_date`),
  CONSTRAINT `exams_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exams_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `exams_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exams`
--

LOCK TABLES `exams` WRITE;
/*!40000 ALTER TABLE `exams` DISABLE KEYS */;
INSERT INTO `exams` VALUES (2,1,1,'First Term 2082','unit_test','PUBLISHED',1,'2025-12-18','2025-12-27','2026-01-02 07:22:04.792','2026-01-02 07:21:56.565','2026-01-02 07:22:04.794');
/*!40000 ALTER TABLE `exams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notices`
--

DROP TABLE IF EXISTS `notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_audience` enum('all','students','parents','teachers') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `publish_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notices_school_id_idx` (`school_id`),
  KEY `notices_created_by_idx` (`created_by`),
  KEY `notices_target_audience_idx` (`target_audience`),
  KEY `notices_priority_idx` (`priority`),
  KEY `notices_is_published_idx` (`is_published`),
  KEY `notices_publish_date_expiry_date_idx` (`publish_date`,`expiry_date`),
  CONSTRAINT `notices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `notices_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notices`
--

LOCK TABLES `notices` WRITE;
/*!40000 ALTER TABLE `notices` DISABLE KEYS */;
/*!40000 ALTER TABLE `notices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parents`
--

DROP TABLE IF EXISTS `parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `occupation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workplace` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parents_user_id_key` (`user_id`),
  KEY `parents_user_id_idx` (`user_id`),
  CONSTRAINT `parents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parents`
--

LOCK TABLES `parents` WRITE;
/*!40000 ALTER TABLE `parents` DISABLE KEYS */;
INSERT INTO `parents` VALUES (1,4,'Business','Kathmandu','Kathmandu, Nepal','2026-01-02 07:14:22.513','2026-01-02 07:14:22.513');
/*!40000 ALTER TABLE `parents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_key` (`name`),
  KEY `permissions_name_idx` (`name`),
  KEY `permissions_module_idx` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'user.create','users','Create new users','2026-01-02 07:14:21.562'),(2,'user.read','users','View user details','2026-01-02 07:14:21.582'),(3,'user.update','users','Update user information','2026-01-02 07:14:21.586'),(4,'user.delete','users','Delete users','2026-01-02 07:14:21.589'),(5,'user.list','users','List all users','2026-01-02 07:14:21.593'),(6,'student.create','students','Create new students','2026-01-02 07:14:21.596'),(7,'student.read','students','View student details','2026-01-02 07:14:21.600'),(8,'student.update','students','Update student information','2026-01-02 07:14:21.604'),(9,'student.delete','students','Delete students','2026-01-02 07:14:21.607'),(10,'student.list','students','List students','2026-01-02 07:14:21.611'),(11,'student.view_own','students','View own student profile','2026-01-02 07:14:21.614'),(12,'teacher.create','teachers','Create new teachers','2026-01-02 07:14:21.620'),(13,'teacher.read','teachers','View teacher details','2026-01-02 07:14:21.624'),(14,'teacher.update','teachers','Update teacher information','2026-01-02 07:14:21.629'),(15,'teacher.delete','teachers','Delete teachers','2026-01-02 07:14:21.633'),(16,'teacher.list','teachers','List teachers','2026-01-02 07:14:21.637'),(17,'academic_year.manage','academic','Manage academic years','2026-01-02 07:14:21.640'),(18,'class.manage','academic','Manage classes','2026-01-02 07:14:21.643'),(19,'section.manage','academic','Manage sections','2026-01-02 07:14:21.646'),(20,'subject.manage','academic','Manage subjects','2026-01-02 07:14:21.650'),(21,'class_subject.manage','academic','Manage class-subject assignments','2026-01-02 07:14:21.654'),(22,'teacher_subject.manage','academic','Manage teacher assignments','2026-01-02 07:14:21.657'),(23,'attendance.mark','attendance','Mark attendance','2026-01-02 07:14:21.660'),(24,'attendance.view_all','attendance','View all attendance records','2026-01-02 07:14:21.663'),(25,'attendance.view_own','attendance','View own attendance','2026-01-02 07:14:21.667'),(26,'attendance.view_class','attendance','View class attendance','2026-01-02 07:14:21.671'),(27,'exam.create','exams','Create exams','2026-01-02 07:14:21.674'),(28,'exam.read','exams','View exam details','2026-01-02 07:14:21.677'),(29,'exam.update','exams','Update exam information','2026-01-02 07:14:21.679'),(30,'exam.delete','exams','Delete exams','2026-01-02 07:14:21.682'),(31,'exam.manage_subjects','exams','Manage exam subjects','2026-01-02 07:14:21.686'),(32,'result.enter','results','Enter exam results','2026-01-02 07:14:21.689'),(33,'result.view_all','results','View all results','2026-01-02 07:14:21.692'),(34,'result.view_own','results','View own results','2026-01-02 07:14:21.695'),(35,'result.view_child','results','View child results','2026-01-02 07:14:21.699'),(36,'result.publish','results','Publish results','2026-01-02 07:14:21.702'),(37,'report_card.generate','report_cards','Generate report cards','2026-01-02 07:14:21.705'),(38,'report_card.view_all','report_cards','View all report cards','2026-01-02 07:14:21.708'),(39,'report_card.view_own','report_cards','View own report card','2026-01-02 07:14:21.710'),(40,'report_card.view_child','report_cards','View child report card','2026-01-02 07:14:21.713'),(41,'assignment.create','assignments','Create assignments','2026-01-02 07:14:21.716'),(42,'assignment.read','assignments','View assignments','2026-01-02 07:14:21.720'),(43,'assignment.update','assignments','Update assignments','2026-01-02 07:14:21.723'),(44,'assignment.delete','assignments','Delete assignments','2026-01-02 07:14:21.725'),(45,'assignment.grade','assignments','Grade submissions','2026-01-02 07:14:21.728'),(46,'assignment.submit','assignments','Submit assignments','2026-01-02 07:14:21.731'),(47,'assignment.view_own','assignments','View own assignments','2026-01-02 07:14:21.734'),(48,'notice.create','notices','Create notices','2026-01-02 07:14:21.738'),(49,'notice.read','notices','View notices','2026-01-02 07:14:21.740'),(50,'notice.update','notices','Update notices','2026-01-02 07:14:21.743'),(51,'notice.delete','notices','Delete notices','2026-01-02 07:14:21.746'),(52,'promotion.process','promotions','Process student promotions','2026-01-02 07:14:21.749'),(53,'promotion.view','promotions','View promotion history','2026-01-02 07:14:21.752');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `from_class_id` int NOT NULL,
  `from_academic_year_id` int NOT NULL,
  `to_class_id` int DEFAULT NULL,
  `to_academic_year_id` int NOT NULL,
  `status` enum('promoted','detained','graduated') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `processed_by` int NOT NULL,
  `processed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `promotions_student_id_idx` (`student_id`),
  KEY `promotions_from_academic_year_id_idx` (`from_academic_year_id`),
  KEY `promotions_to_academic_year_id_idx` (`to_academic_year_id`),
  KEY `promotions_status_idx` (`status`),
  KEY `promotions_processed_by_idx` (`processed_by`),
  KEY `promotions_from_class_id_fkey` (`from_class_id`),
  KEY `promotions_to_class_id_fkey` (`to_class_id`),
  CONSTRAINT `promotions_from_academic_year_id_fkey` FOREIGN KEY (`from_academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `promotions_from_class_id_fkey` FOREIGN KEY (`from_class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `promotions_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `promotions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `promotions_to_academic_year_id_fkey` FOREIGN KEY (`to_academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `promotions_to_class_id_fkey` FOREIGN KEY (`to_class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `refresh_tokens_user_id_idx` (`user_id`),
  KEY `refresh_tokens_token_idx` (`token`),
  KEY `refresh_tokens_expires_at_idx` (`expires_at`),
  CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (4,6,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsInRva2VuSWQiOiIyOWI0MGYyZC1lZjNlLTQ0OTQtYjQ0NC04NWZiZTg5MmE2YzEiLCJpYXQiOjE3NjczNDExNjcsImV4cCI6MTc2Nzk0NTk2N30.mzWJ-0VvQGR3MbIMltt-uYiKlfqdMGauflvuPNSHbs0','2026-01-09 08:06:07.024','2026-01-02 08:06:07.025'),(5,7,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjcsInRva2VuSWQiOiI4ZGYxNDI5MS01NTZjLTQ2MDktYTEwNS1lYzFkN2QzZjkyN2QiLCJpYXQiOjE3NjczNDE0NjUsImV4cCI6MTc2Nzk0NjI2NX0.sonLekODAzNrT5GUzwED1g2Qr3B-RjY5TLg0kdDUPc4','2026-01-09 08:11:05.050','2026-01-02 08:11:05.052');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_cards`
--

DROP TABLE IF EXISTS `report_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `student_class_id` int NOT NULL,
  `total_marks` decimal(7,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `overall_grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_rank` int DEFAULT NULL,
  `teacher_remarks` text COLLATE utf8mb4_unicode_ci,
  `principal_remarks` text COLLATE utf8mb4_unicode_ci,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `generated_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_cards_student_id_exam_id_key` (`student_id`,`exam_id`),
  KEY `report_cards_student_id_idx` (`student_id`),
  KEY `report_cards_exam_id_idx` (`exam_id`),
  KEY `report_cards_student_class_id_idx` (`student_class_id`),
  KEY `report_cards_is_published_idx` (`is_published`),
  KEY `report_cards_class_rank_idx` (`class_rank`),
  CONSTRAINT `report_cards_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `report_cards_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `report_cards_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_cards`
--

LOCK TABLES `report_cards` WRITE;
/*!40000 ALTER TABLE `report_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `report_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_id_permission_id_key` (`role_id`,`permission_id`),
  KEY `role_permissions_role_id_idx` (`role_id`),
  KEY `role_permissions_permission_id_idx` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,2,1,'2026-01-02 07:14:21.778'),(2,2,2,'2026-01-02 07:14:21.785'),(3,2,3,'2026-01-02 07:14:21.789'),(4,2,4,'2026-01-02 07:14:21.794'),(5,2,5,'2026-01-02 07:14:21.798'),(6,2,6,'2026-01-02 07:14:21.803'),(7,2,7,'2026-01-02 07:14:21.807'),(8,2,8,'2026-01-02 07:14:21.810'),(9,2,9,'2026-01-02 07:14:21.814'),(10,2,10,'2026-01-02 07:14:21.818'),(11,2,12,'2026-01-02 07:14:21.823'),(12,2,13,'2026-01-02 07:14:21.826'),(13,2,14,'2026-01-02 07:14:21.829'),(14,2,15,'2026-01-02 07:14:21.834'),(15,2,16,'2026-01-02 07:14:21.838'),(16,2,17,'2026-01-02 07:14:21.842'),(17,2,18,'2026-01-02 07:14:21.845'),(18,2,19,'2026-01-02 07:14:21.849'),(19,2,20,'2026-01-02 07:14:21.853'),(20,2,21,'2026-01-02 07:14:21.856'),(21,2,22,'2026-01-02 07:14:21.860'),(22,2,23,'2026-01-02 07:14:21.863'),(23,2,24,'2026-01-02 07:14:21.868'),(24,2,26,'2026-01-02 07:14:21.872'),(25,2,27,'2026-01-02 07:14:21.876'),(26,2,28,'2026-01-02 07:14:21.880'),(27,2,29,'2026-01-02 07:14:21.884'),(28,2,30,'2026-01-02 07:14:21.888'),(29,2,31,'2026-01-02 07:14:21.892'),(30,2,32,'2026-01-02 07:14:21.896'),(31,2,33,'2026-01-02 07:14:21.900'),(32,2,36,'2026-01-02 07:14:21.904'),(33,2,37,'2026-01-02 07:14:21.908'),(34,2,38,'2026-01-02 07:14:21.911'),(35,2,41,'2026-01-02 07:14:21.915'),(36,2,42,'2026-01-02 07:14:21.919'),(37,2,43,'2026-01-02 07:14:21.923'),(38,2,44,'2026-01-02 07:14:21.926'),(39,2,45,'2026-01-02 07:14:21.929'),(40,2,48,'2026-01-02 07:14:21.934'),(41,2,49,'2026-01-02 07:14:21.939'),(42,2,50,'2026-01-02 07:14:21.942'),(43,2,51,'2026-01-02 07:14:21.946'),(44,2,52,'2026-01-02 07:14:21.951'),(45,2,53,'2026-01-02 07:14:21.958'),(46,3,7,'2026-01-02 07:14:21.965'),(47,3,10,'2026-01-02 07:14:21.971'),(48,3,23,'2026-01-02 07:14:21.977'),(49,3,26,'2026-01-02 07:14:21.983'),(50,3,28,'2026-01-02 07:14:21.988'),(51,3,32,'2026-01-02 07:14:21.998'),(52,3,33,'2026-01-02 07:14:22.006'),(53,3,41,'2026-01-02 07:14:22.013'),(54,3,42,'2026-01-02 07:14:22.018'),(55,3,43,'2026-01-02 07:14:22.021'),(56,3,44,'2026-01-02 07:14:22.026'),(57,3,45,'2026-01-02 07:14:22.029'),(58,3,49,'2026-01-02 07:14:22.033'),(59,3,48,'2026-01-02 07:14:22.038'),(60,4,11,'2026-01-02 07:14:22.043'),(61,4,25,'2026-01-02 07:14:22.046'),(62,4,34,'2026-01-02 07:14:22.050'),(63,4,39,'2026-01-02 07:14:22.054'),(64,4,46,'2026-01-02 07:14:22.058'),(65,4,47,'2026-01-02 07:14:22.061'),(66,4,49,'2026-01-02 07:14:22.065'),(67,5,25,'2026-01-02 07:14:22.070'),(68,5,35,'2026-01-02 07:14:22.073'),(69,5,40,'2026-01-02 07:14:22.076'),(70,5,47,'2026-01-02 07:14:22.079'),(71,5,49,'2026-01-02 07:14:22.083');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_key` (`name`),
  KEY `roles_name_idx` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPER_ADMIN','Super Administrator - Multi-school owner','2026-01-02 07:14:21.756'),(2,'ADMIN','School Administrator','2026-01-02 07:14:21.761'),(3,'TEACHER','Teacher','2026-01-02 07:14:21.764'),(4,'STUDENT','Student','2026-01-02 07:14:21.768'),(5,'PARENT','Parent/Guardian','2026-01-02 07:14:21.772');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schools_code_key` (`code`),
  KEY `schools_code_idx` (`code`),
  KEY `schools_is_active_idx` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schools`
--

LOCK TABLES `schools` WRITE;
/*!40000 ALTER TABLE `schools` DISABLE KEYS */;
INSERT INTO `schools` VALUES (1,'Demo K-12 School','DEMO001','123 Education Street, Kathmandu, Nepal','+977-1-1234567','info@demo-school.edu.np',NULL,1,'2026-01-02 07:14:22.088','2026-01-02 07:14:22.088');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sections`
--

DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` int NOT NULL DEFAULT '40',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sections_school_id_name_key` (`school_id`,`name`),
  KEY `sections_school_id_idx` (`school_id`),
  CONSTRAINT `sections_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sections`
--

LOCK TABLES `sections` WRITE;
/*!40000 ALTER TABLE `sections` DISABLE KEYS */;
INSERT INTO `sections` VALUES (1,1,'A',40,'2026-01-02 07:14:22.100'),(2,1,'B',40,'2026-01-02 07:14:22.105'),(3,1,'C',35,'2026-01-02 07:14:22.108'),(4,1,'D',40,'2026-01-02 08:23:44.284'),(5,1,'E',40,'2026-01-02 08:23:49.040'),(6,1,'F',40,'2026-01-02 08:23:52.996');
/*!40000 ALTER TABLE `sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_classes`
--

DROP TABLE IF EXISTS `student_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `class_id` int NOT NULL,
  `section_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `roll_number` int DEFAULT NULL,
  `status` enum('active','transferred','graduated','dropped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_classes_student_id_academic_year_id_key` (`student_id`,`academic_year_id`),
  KEY `student_classes_student_id_idx` (`student_id`),
  KEY `student_classes_class_id_idx` (`class_id`),
  KEY `student_classes_section_id_idx` (`section_id`),
  KEY `student_classes_academic_year_id_idx` (`academic_year_id`),
  KEY `student_classes_status_idx` (`status`),
  KEY `student_classes_class_id_section_id_academic_year_id_idx` (`class_id`,`section_id`,`academic_year_id`),
  CONSTRAINT `student_classes_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_classes`
--

LOCK TABLES `student_classes` WRITE;
/*!40000 ALTER TABLE `student_classes` DISABLE KEYS */;
INSERT INTO `student_classes` VALUES (1,1,10,1,1,1,'active','2026-01-02 07:14:22.500'),(2,2,10,3,1,1,'active','2026-01-02 07:30:22.465'),(3,3,10,3,1,102,'active','2026-01-02 08:13:03.112');
/*!40000 ALTER TABLE `student_classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_parents`
--

DROP TABLE IF EXISTS `student_parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_parents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `parent_id` int NOT NULL,
  `relationship` enum('father','mother','guardian') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_parents_student_id_parent_id_key` (`student_id`,`parent_id`),
  KEY `student_parents_student_id_idx` (`student_id`),
  KEY `student_parents_parent_id_idx` (`parent_id`),
  CONSTRAINT `student_parents_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_parents_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_parents`
--

LOCK TABLES `student_parents` WRITE;
/*!40000 ALTER TABLE `student_parents` DISABLE KEYS */;
INSERT INTO `student_parents` VALUES (1,1,1,'father',1,'2026-01-02 07:14:22.517');
/*!40000 ALTER TABLE `student_parents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `admission_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date NOT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_group` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `emergency_contact` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admission_date` date NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_user_id_key` (`user_id`),
  KEY `students_user_id_idx` (`user_id`),
  KEY `students_admission_number_idx` (`admission_number`),
  KEY `students_date_of_birth_idx` (`date_of_birth`),
  CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,3,'STU2024001','2008-05-15','male','A+','Kathmandu, Nepal','+977-9801111111','2024-04-01','2026-01-02 07:14:22.495','2026-01-02 07:14:22.495'),(2,6,'1001','2005-05-12','male','A+','Panauti','9861158272','2025-01-02','2026-01-02 07:30:22.463','2026-01-02 07:30:22.463'),(3,8,'1002','2002-05-01','female','B','Panauti Rd','9861158271','2025-06-19','2026-01-02 08:13:03.110','2026-01-02 08:13:03.110');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_optional` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `credit_hours` decimal(3,1) NOT NULL DEFAULT '3.0',
  `has_practical` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_school_id_code_key` (`school_id`,`code`),
  KEY `subjects_school_id_idx` (`school_id`),
  KEY `subjects_code_idx` (`code`),
  CONSTRAINT `subjects_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
INSERT INTO `subjects` VALUES (1,1,'English','ENG','English Language and Literature',0,'2026-01-02 07:14:22.159',3.0,0),(2,1,'Mathematics','MATH','Mathematics',0,'2026-01-02 07:14:22.163',3.0,0),(3,1,'Science','SCI','General Science',0,'2026-01-02 07:14:22.167',3.0,0),(4,1,'Social Studies','SOC','Social Studies and History',0,'2026-01-02 07:14:22.170',3.0,0),(5,1,'Nepali','NEP','Nepali Language',0,'2026-01-02 07:14:22.173',3.0,0),(6,1,'Computer Science','CS','Computer Science and IT',0,'2026-01-02 07:14:22.176',3.0,0),(7,1,'Physical Education','PE','Physical Education',1,'2026-01-02 07:14:22.179',3.0,0),(8,1,'Art','ART','Art and Craft',1,'2026-01-02 07:14:22.182',3.0,0);
/*!40000 ALTER TABLE `subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `submission_files`
--

DROP TABLE IF EXISTS `submission_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submission_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `submission_files_submission_id_idx` (`submission_id`),
  CONSTRAINT `submission_files_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submission_files`
--

LOCK TABLES `submission_files` WRITE;
/*!40000 ALTER TABLE `submission_files` DISABLE KEYS */;
INSERT INTO `submission_files` VALUES (1,1,'cake.jpg','uploads/files-1767341823034-659021431.jpg','image/jpeg',137399,'2026-01-02 08:17:03.039');
/*!40000 ALTER TABLE `submission_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `submissions`
--

DROP TABLE IF EXISTS `submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `student_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `status` enum('submitted','late','graded','returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `graded_by` int DEFAULT NULL,
  `submitted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `graded_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `submissions_assignment_id_student_id_key` (`assignment_id`,`student_id`),
  KEY `submissions_assignment_id_idx` (`assignment_id`),
  KEY `submissions_student_id_idx` (`student_id`),
  KEY `submissions_status_idx` (`status`),
  KEY `submissions_graded_by_idx` (`graded_by`),
  CONSTRAINT `submissions_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `submissions_graded_by_fkey` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `submissions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submissions`
--

LOCK TABLES `submissions` WRITE;
/*!40000 ALTER TABLE `submissions` DISABLE KEYS */;
INSERT INTO `submissions` VALUES (1,1,2,NULL,'submitted',NULL,NULL,NULL,'2026-01-02 08:17:03.039',NULL,'2026-01-02 08:17:03.039');
/*!40000 ALTER TABLE `submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_subjects`
--

DROP TABLE IF EXISTS `teacher_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `class_subject_id` int NOT NULL,
  `section_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `is_class_teacher` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_subjects_user_id_class_subject_id_section_id_key` (`user_id`,`class_subject_id`,`section_id`),
  KEY `teacher_subjects_user_id_idx` (`user_id`),
  KEY `teacher_subjects_class_subject_id_idx` (`class_subject_id`),
  KEY `teacher_subjects_section_id_idx` (`section_id`),
  KEY `teacher_subjects_academic_year_id_idx` (`academic_year_id`),
  CONSTRAINT `teacher_subjects_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_subjects`
--

LOCK TABLES `teacher_subjects` WRITE;
/*!40000 ALTER TABLE `teacher_subjects` DISABLE KEYS */;
INSERT INTO `teacher_subjects` VALUES (1,2,47,1,1,1,'2026-01-02 07:14:22.481'),(2,5,50,3,1,1,'2026-01-02 07:24:59.411'),(3,7,47,3,1,1,'2026-01-02 08:10:51.635'),(4,7,42,3,1,0,'2026-01-02 08:17:53.821');
/*!40000 ALTER TABLE `teacher_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_id_key` (`user_id`,`role_id`),
  KEY `user_roles_user_id_idx` (`user_id`),
  KEY `user_roles_role_id_idx` (`role_id`),
  CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,2,'2026-01-02 07:14:22.468'),(2,2,3,'2026-01-02 07:14:22.477'),(3,3,4,'2026-01-02 07:14:22.492'),(4,4,5,'2026-01-02 07:14:22.510'),(5,5,3,'2026-01-02 07:23:43.851'),(6,6,4,'2026-01-02 07:30:22.461'),(7,7,3,'2026-01-02 08:10:21.574'),(8,8,4,'2026-01-02 08:13:03.108');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_login` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_school_id_key` (`email`,`school_id`),
  KEY `users_school_id_idx` (`school_id`),
  KEY `users_email_idx` (`email`),
  KEY `users_status_idx` (`status`),
  KEY `users_first_name_last_name_idx` (`first_name`,`last_name`),
  CONSTRAINT `users_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'admin@demo-school.edu.np','$2a$10$8eZwjz6FBI/5HsHjVLDKIu5FaxUVvav5L9J7Ot01.pWjJ3Wh/wJ8C','School','Admin','+977-9801234567',NULL,'active','2026-01-02 07:20:58.050','2026-01-02 07:14:22.464','2026-01-02 07:20:58.052'),(2,1,'teacher@demo-school.edu.np','$2a$10$8eZwjz6FBI/5HsHjVLDKIu5FaxUVvav5L9J7Ot01.pWjJ3Wh/wJ8C','John','Teacher','+977-9802345678',NULL,'active',NULL,'2026-01-02 07:14:22.473','2026-01-02 07:14:22.473'),(3,1,'student@demo-school.edu.np','$2a$10$8eZwjz6FBI/5HsHjVLDKIu5FaxUVvav5L9J7Ot01.pWjJ3Wh/wJ8C','Ram','Student','+977-9803456789',NULL,'active',NULL,'2026-01-02 07:14:22.488','2026-01-02 07:14:22.488'),(4,1,'parent@demo-school.edu.np','$2a$10$8eZwjz6FBI/5HsHjVLDKIu5FaxUVvav5L9J7Ot01.pWjJ3Wh/wJ8C','Hari','Parent','+977-9804567890',NULL,'active',NULL,'2026-01-02 07:14:22.506','2026-01-02 07:14:22.506'),(5,1,'rishi@gmail.com','$2a$10$KfMAH4jZOXMSHYI/RwnuEuA9Gx/ihUrCzI.nqt321YEbwIhl68/hi','Rishi','Upadhyaya','9861158271',NULL,'active',NULL,'2026-01-02 07:23:43.851','2026-01-02 07:23:43.851'),(6,1,'bivan@gmail.com','$2a$10$l3fA7EN4uBfjMp4MQpyCoen1N1rhIxVNkt/oPDrO/mJH0a8tX.6f2','Bivan','Shrestha','9818141818',NULL,'active','2026-01-02 08:06:07.028','2026-01-02 07:30:22.461','2026-01-02 08:06:07.030'),(7,1,'jagdip@gmail.com','$2a$10$h8vpQh9eGLxDd5UKCZqXgevOjJ0eOEFJhSXYqnxEDCeaYlXkFojWm','jagdip','shrestha','9861158271',NULL,'active','2026-01-02 08:11:05.054','2026-01-02 08:10:21.574','2026-01-02 08:11:05.055'),(8,1,'amira@gmail.com','$2a$10$j/AVfvVeVENdwusgmDLUvOtugc2/Um/EJ.cauSHI5CfayJv.qxtN.','amira','shrestha','9861158271',NULL,'active',NULL,'2026-01-02 08:13:03.108','2026-01-02 08:13:03.108');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-02 15:12:47
