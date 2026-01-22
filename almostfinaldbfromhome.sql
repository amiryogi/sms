CREATE DATABASE  IF NOT EXISTS `school_management` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `school_management`;
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
INSERT INTO `_prisma_migrations` VALUES ('20e1ea03-07eb-47c0-a76f-782648a362a9','e82de23b0c78ce6bba22489fa088cbfd4035946ef00ef1152b1d6f5e7d5d6b7b','2026-01-21 17:04:07.353','20260121170405_add_program_module',NULL,NULL,'2026-01-21 17:04:05.544',1),('6454dfec-ba66-46ee-a272-27021bb286ec','d9e234b529c7569e7f9fe302aaf75b2b4b70c355d6f6439b41be3c39da582c81','2026-01-21 17:03:44.499','20260102160301_audit2',NULL,NULL,'2026-01-21 17:03:44.154',1),('9a1bbd02-92a6-402c-baeb-0b73c4053c59','c8e7d7aac2729778b352a0db2e1978c6aa07da21aa4976921d101998c516d8e6','2026-01-21 17:12:47.505','20260121171247_add_student_subject',NULL,NULL,'2026-01-21 17:12:47.209',1),('b9ac2e71-a8a9-4f41-9f49-c3417aa658cd','af38947bd7449ed577ff3438d93100cc67c1515d8a51bdca72510fd86d4796f4','2026-01-21 17:03:44.151','20260102151945_auditedbygptcodex',NULL,NULL,'2026-01-21 17:03:33.837',1),('c72f9574-4875-42a5-832a-80ecc51268f9','0bc40c06814b7e81dc110b65fe98d09fd099f4d028ff8490cfbe48081c1cc794','2026-01-21 17:30:14.221','20260121173014_add_subject_locking_audit',NULL,NULL,'2026-01-21 17:30:14.076',1),('ecd1d263-7ba5-411d-85d6-04293c5363b1','4212e8ae8aa5f7ebc82d49c38a3b11409ba2a87f9c68117283bd3f27ba5bb753','2026-01-21 17:03:46.353','20260115104310_add_fee_module',NULL,NULL,'2026-01-21 17:03:45.597',1),('f3bc50f3-c8b4-4835-b173-b7ca0cc46ca1','f40d662a885840aed34b6a06a87691ad2fe217d65736d7e25b7ddced80391b5f','2026-01-21 17:03:44.656','20260103144318_add_theory_practical_flags',NULL,NULL,'2026-01-21 17:03:44.502',1),('f9b7e537-07e4-4efa-b8e3-1ee1765fd6d0','7e7a4f05669d568cd4672bc4636ab8305045d1ccf9a4d332070b1458b09a3137','2026-01-21 17:03:45.595','20260105135409_add_notice_feature',NULL,NULL,'2026-01-21 17:03:44.658',1);
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
INSERT INTO `academic_years` VALUES (1,1,'2024-2025','2024-04-01','2025-03-31',1,'2026-01-21 17:04:09.367','2026-01-21 17:04:09.367');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignment_files`
--

LOCK TABLES `assignment_files` WRITE;
/*!40000 ALTER TABLE `assignment_files` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assignments`
--

LOCK TABLES `assignments` WRITE;
/*!40000 ALTER TABLE `assignments` DISABLE KEYS */;
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
  `school_id` int NOT NULL DEFAULT '1',
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
  KEY `attendance_school_id_idx` (`school_id`),
  CONSTRAINT `attendance_marked_by_fkey` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
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
  `theory_marks` int NOT NULL DEFAULT '100',
  `practical_marks` int NOT NULL DEFAULT '0',
  `credit_hours` decimal(3,1) NOT NULL DEFAULT '3.0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `has_practical` tinyint(1) NOT NULL DEFAULT '0',
  `has_theory` tinyint(1) NOT NULL DEFAULT '1',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_subjects_class_id_academic_year_id_subject_id_key` (`class_id`,`academic_year_id`,`subject_id`),
  KEY `class_subjects_class_id_idx` (`class_id`),
  KEY `class_subjects_academic_year_id_idx` (`academic_year_id`),
  KEY `class_subjects_subject_id_idx` (`subject_id`),
  KEY `class_subjects_class_id_academic_year_id_idx` (`class_id`,`academic_year_id`),
  CONSTRAINT `class_subjects_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `class_subjects_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `class_subjects`
--

LOCK TABLES `class_subjects` WRITE;
/*!40000 ALTER TABLE `class_subjects` DISABLE KEYS */;
INSERT INTO `class_subjects` VALUES (1,1,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.465',0,1,0),(2,1,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.472',0,1,0),(3,1,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.476',0,1,0),(4,1,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.481',0,1,0),(5,1,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.485',0,1,0),(6,2,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.490',0,1,0),(7,2,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.494',0,1,0),(8,2,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.498',0,1,0),(9,2,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.502',0,1,0),(10,2,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.507',0,1,0),(11,3,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.511',0,1,0),(12,3,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.515',0,1,0),(13,3,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.520',0,1,0),(14,3,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.524',0,1,0),(15,3,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.528',0,1,0),(16,4,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.533',0,1,0),(17,4,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.538',0,1,0),(18,4,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.542',0,1,0),(19,4,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.545',0,1,0),(20,4,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.548',0,1,0),(21,5,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.551',0,1,0),(22,5,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.556',0,1,0),(23,5,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.560',0,1,0),(24,5,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.563',0,1,0),(25,5,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.567',0,1,0),(26,6,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.572',0,1,0),(27,6,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.575',0,1,0),(28,6,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.578',0,1,0),(29,6,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.581',0,1,0),(30,6,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.584',0,1,0),(31,7,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.588',0,1,0),(32,7,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.592',0,1,0),(33,7,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.595',0,1,0),(34,7,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.599',0,1,0),(35,7,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.602',0,1,0),(36,8,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.606',0,1,0),(37,8,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.609',0,1,0),(38,8,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.613',0,1,0),(39,8,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.617',0,1,0),(40,8,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.621',0,1,0),(41,9,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.625',0,1,0),(42,9,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.627',0,1,0),(43,9,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.630',0,1,0),(44,9,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.633',0,1,0),(45,9,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.637',0,1,0),(46,10,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.640',0,1,0),(47,10,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.643',0,1,0),(48,10,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.646',0,1,0),(49,10,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.649',0,1,0),(50,10,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.653',0,1,0),(51,11,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.657',0,1,0),(52,11,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.659',0,1,0),(53,11,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.662',0,1,0),(54,11,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.664',0,1,0),(55,11,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.668',0,1,0),(56,12,1,1,100,40,100,0,3.0,'2026-01-21 17:04:09.671',0,1,0),(57,12,1,2,100,40,100,0,3.0,'2026-01-21 17:04:09.674',0,1,0),(58,12,1,3,100,40,100,0,3.0,'2026-01-21 17:04:09.676',0,1,0),(59,12,1,4,100,40,100,0,3.0,'2026-01-21 17:04:09.679',0,1,0),(60,12,1,5,100,40,100,0,3.0,'2026-01-21 17:04:09.682',0,1,0),(61,11,1,9,100,40,75,25,4.0,'2026-01-21 17:49:49.840',1,1,0),(62,11,1,10,100,40,75,25,3.0,'2026-01-21 17:49:49.863',1,1,0),(63,11,1,11,100,40,75,25,5.0,'2026-01-21 17:49:49.883',1,1,0),(64,11,1,12,100,40,75,25,5.0,'2026-01-21 17:49:49.899',1,1,0),(65,11,1,13,100,40,75,25,5.0,'2026-01-21 17:49:49.914',1,1,0),(66,11,1,14,100,40,75,25,5.0,'2026-01-21 17:49:49.929',1,1,0),(67,11,1,15,100,40,75,25,5.0,'2026-01-21 17:49:49.947',1,1,0),(68,11,1,16,100,40,50,50,5.0,'2026-01-21 17:49:49.969',1,1,0),(69,11,1,17,100,40,75,25,5.0,'2026-01-21 17:49:49.996',1,1,0),(70,11,1,18,100,40,75,25,5.0,'2026-01-21 17:49:50.014',1,1,0),(71,11,1,19,100,40,50,50,5.0,'2026-01-21 17:49:50.030',1,1,0),(72,12,1,20,100,40,75,25,4.0,'2026-01-21 17:49:50.048',1,1,0),(73,12,1,21,100,40,75,25,3.0,'2026-01-21 17:49:50.068',1,1,0),(74,12,1,22,100,40,75,25,4.0,'2026-01-21 17:49:50.086',1,1,0),(75,12,1,23,100,40,75,25,5.0,'2026-01-21 17:49:50.104',1,1,0),(76,12,1,24,100,40,75,25,5.0,'2026-01-21 17:49:50.122',1,1,0),(77,12,1,25,100,40,75,25,5.0,'2026-01-21 17:49:50.139',1,1,0),(78,12,1,26,100,40,75,25,5.0,'2026-01-21 17:49:50.154',1,1,0),(79,12,1,27,100,40,50,50,5.0,'2026-01-21 17:49:50.174',1,1,0),(80,12,1,28,100,40,75,25,5.0,'2026-01-21 17:49:50.199',1,1,0),(81,12,1,29,100,40,75,25,5.0,'2026-01-21 17:49:50.219',1,1,0),(82,12,1,30,100,40,50,50,5.0,'2026-01-21 17:49:50.239',1,1,0);
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
INSERT INTO `classes` VALUES (1,1,'Grade 1',1,NULL,1,'2026-01-21 17:04:09.385'),(2,1,'Grade 2',2,NULL,2,'2026-01-21 17:04:09.389'),(3,1,'Grade 3',3,NULL,3,'2026-01-21 17:04:09.393'),(4,1,'Grade 4',4,NULL,4,'2026-01-21 17:04:09.397'),(5,1,'Grade 5',5,NULL,5,'2026-01-21 17:04:09.400'),(6,1,'Grade 6',6,NULL,6,'2026-01-21 17:04:09.404'),(7,1,'Grade 7',7,NULL,7,'2026-01-21 17:04:09.408'),(8,1,'Grade 8',8,NULL,8,'2026-01-21 17:04:09.410'),(9,1,'Grade 9',9,NULL,9,'2026-01-21 17:04:09.413'),(10,1,'Grade 10',10,NULL,10,'2026-01-21 17:04:09.416'),(11,1,'Grade 11',11,NULL,11,'2026-01-21 17:04:09.419'),(12,1,'Grade 12',12,NULL,12,'2026-01-21 17:04:09.422');
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
  `student_class_id` int NOT NULL,
  `school_id` int NOT NULL DEFAULT '1',
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `practical_marks` decimal(5,2) DEFAULT '0.00',
  `is_absent` tinyint(1) NOT NULL DEFAULT '0',
  `grade` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `entered_by` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `entered_by_role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEACHER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_results_exam_subject_id_student_id_key` (`exam_subject_id`,`student_id`),
  KEY `exam_results_exam_subject_id_idx` (`exam_subject_id`),
  KEY `exam_results_student_id_idx` (`student_id`),
  KEY `exam_results_student_class_id_idx` (`student_class_id`),
  KEY `exam_results_entered_by_idx` (`entered_by`),
  KEY `exam_results_grade_idx` (`grade`),
  KEY `exam_results_school_id_idx` (`school_id`),
  CONSTRAINT `exam_results_entered_by_fkey` FOREIGN KEY (`entered_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `exam_results_exam_subject_id_fkey` FOREIGN KEY (`exam_subject_id`) REFERENCES `exam_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_results_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_results_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_results_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_results`
--

LOCK TABLES `exam_results` WRITE;
/*!40000 ALTER TABLE `exam_results` DISABLE KEYS */;
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
  `theory_full_marks` int NOT NULL DEFAULT '100',
  `practical_full_marks` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `has_practical` tinyint(1) NOT NULL DEFAULT '0',
  `has_theory` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_subjects_exam_id_class_subject_id_key` (`exam_id`,`class_subject_id`),
  KEY `exam_subjects_exam_id_idx` (`exam_id`),
  KEY `exam_subjects_class_subject_id_idx` (`class_subject_id`),
  KEY `exam_subjects_exam_date_idx` (`exam_date`),
  CONSTRAINT `exam_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exam_subjects_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_subjects`
--

LOCK TABLES `exam_subjects` WRITE;
/*!40000 ALTER TABLE `exam_subjects` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exams`
--

LOCK TABLES `exams` WRITE;
/*!40000 ALTER TABLE `exams` DISABLE KEYS */;
INSERT INTO `exams` VALUES (1,1,1,'First Term Examination','midterm','DRAFT',1,'2024-09-01','2024-09-15',NULL,'2026-01-21 17:04:09.860','2026-01-21 17:04:09.860');
/*!40000 ALTER TABLE `exams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_payments`
--

DROP TABLE IF EXISTS `fee_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `student_class_id` int NOT NULL,
  `fee_structure_id` int NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('pending','partial','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `receipt_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `actor_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `recorded_by_user_id` int DEFAULT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fee_payments_student_class_id_fee_structure_id_key` (`student_class_id`,`fee_structure_id`),
  KEY `fee_payments_school_id_idx` (`school_id`),
  KEY `fee_payments_student_class_id_idx` (`student_class_id`),
  KEY `fee_payments_fee_structure_id_idx` (`fee_structure_id`),
  KEY `fee_payments_status_idx` (`status`),
  KEY `fee_payments_payment_date_idx` (`payment_date`),
  KEY `fee_payments_recorded_by_user_id_idx` (`recorded_by_user_id`),
  KEY `fee_payments_created_by_user_id_fkey` (`created_by_user_id`),
  KEY `fee_payments_updated_by_user_id_fkey` (`updated_by_user_id`),
  CONSTRAINT `fee_payments_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fee_payments_fee_structure_id_fkey` FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_payments_recorded_by_user_id_fkey` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fee_payments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_payments_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_payments_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_payments`
--

LOCK TABLES `fee_payments` WRITE;
/*!40000 ALTER TABLE `fee_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `fee_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_structures`
--

DROP TABLE IF EXISTS `fee_structures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_structures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `fee_type_id` int NOT NULL,
  `class_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `actor_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fee_structures_fee_type_id_class_id_academic_year_id_key` (`fee_type_id`,`class_id`,`academic_year_id`),
  KEY `fee_structures_school_id_idx` (`school_id`),
  KEY `fee_structures_fee_type_id_idx` (`fee_type_id`),
  KEY `fee_structures_class_id_idx` (`class_id`),
  KEY `fee_structures_academic_year_id_idx` (`academic_year_id`),
  KEY `fee_structures_class_id_academic_year_id_idx` (`class_id`,`academic_year_id`),
  KEY `fee_structures_created_by_user_id_idx` (`created_by_user_id`),
  KEY `fee_structures_updated_by_user_id_fkey` (`updated_by_user_id`),
  CONSTRAINT `fee_structures_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_fee_type_id_fkey` FOREIGN KEY (`fee_type_id`) REFERENCES `fee_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_structures`
--

LOCK TABLES `fee_structures` WRITE;
/*!40000 ALTER TABLE `fee_structures` DISABLE KEYS */;
/*!40000 ALTER TABLE `fee_structures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_types`
--

DROP TABLE IF EXISTS `fee_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fee_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `actor_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fee_types_school_id_name_key` (`school_id`,`name`),
  KEY `fee_types_school_id_idx` (`school_id`),
  KEY `fee_types_is_active_idx` (`is_active`),
  KEY `fee_types_created_by_user_id_idx` (`created_by_user_id`),
  KEY `fee_types_updated_by_user_id_fkey` (`updated_by_user_id`),
  CONSTRAINT `fee_types_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fee_types_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_types_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_types`
--

LOCK TABLES `fee_types` WRITE;
/*!40000 ALTER TABLE `fee_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `fee_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notice_attachments`
--

DROP TABLE IF EXISTS `notice_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notice_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notice_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notice_attachments_notice_id_idx` (`notice_id`),
  CONSTRAINT `notice_attachments_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notice_attachments`
--

LOCK TABLES `notice_attachments` WRITE;
/*!40000 ALTER TABLE `notice_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `notice_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notice_class_targets`
--

DROP TABLE IF EXISTS `notice_class_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notice_class_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notice_id` int NOT NULL,
  `class_id` int NOT NULL,
  `section_id` int DEFAULT NULL,
  `academic_year_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_class_targets_notice_id_class_id_section_id_academic__key` (`notice_id`,`class_id`,`section_id`,`academic_year_id`),
  KEY `notice_class_targets_notice_id_idx` (`notice_id`),
  KEY `notice_class_targets_class_id_idx` (`class_id`),
  KEY `notice_class_targets_section_id_idx` (`section_id`),
  KEY `notice_class_targets_academic_year_id_idx` (`academic_year_id`),
  CONSTRAINT `notice_class_targets_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notice_class_targets_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notice_class_targets_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notice_class_targets_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notice_class_targets`
--

LOCK TABLES `notice_class_targets` WRITE;
/*!40000 ALTER TABLE `notice_class_targets` DISABLE KEYS */;
/*!40000 ALTER TABLE `notice_class_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notice_role_targets`
--

DROP TABLE IF EXISTS `notice_role_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notice_role_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notice_id` int NOT NULL,
  `role_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `notice_role_targets_notice_id_role_id_key` (`notice_id`,`role_id`),
  KEY `notice_role_targets_notice_id_idx` (`notice_id`),
  KEY `notice_role_targets_role_id_idx` (`role_id`),
  CONSTRAINT `notice_role_targets_notice_id_fkey` FOREIGN KEY (`notice_id`) REFERENCES `notices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notice_role_targets_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notice_role_targets`
--

LOCK TABLES `notice_role_targets` WRITE;
/*!40000 ALTER TABLE `notice_role_targets` DISABLE KEYS */;
/*!40000 ALTER TABLE `notice_role_targets` ENABLE KEYS */;
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
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `archived_at` datetime(3) DEFAULT NULL,
  `created_by_id` int NOT NULL,
  `publish_from` datetime(3) DEFAULT NULL,
  `publish_to` datetime(3) DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `target_type` enum('GLOBAL','ROLE_SPECIFIC','CLASS_SPECIFIC') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GLOBAL',
  PRIMARY KEY (`id`),
  KEY `notices_school_id_idx` (`school_id`),
  KEY `notices_priority_idx` (`priority`),
  KEY `notices_school_id_status_idx` (`school_id`,`status`),
  KEY `notices_school_id_target_type_idx` (`school_id`,`target_type`),
  KEY `notices_school_id_status_publish_from_publish_to_idx` (`school_id`,`status`,`publish_from`,`publish_to`),
  KEY `notices_created_by_id_idx` (`created_by_id`),
  CONSTRAINT `notices_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
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
  `school_id` int NOT NULL DEFAULT '1',
  `occupation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workplace` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parents_user_id_key` (`user_id`),
  KEY `parents_user_id_idx` (`user_id`),
  KEY `parents_school_id_idx` (`school_id`),
  CONSTRAINT `parents_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `parents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parents`
--

LOCK TABLES `parents` WRITE;
/*!40000 ALTER TABLE `parents` DISABLE KEYS */;
INSERT INTO `parents` VALUES (1,6,1,'Business','Kathmandu','Kathmandu, Nepal','2026-01-21 17:04:09.847','2026-01-21 17:04:09.847');
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
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'user.create','users','Create new users','2026-01-21 17:04:08.692'),(2,'user.read','users','View user details','2026-01-21 17:04:08.700'),(3,'user.update','users','Update user information','2026-01-21 17:04:08.705'),(4,'user.delete','users','Delete users','2026-01-21 17:04:08.708'),(5,'user.list','users','List all users','2026-01-21 17:04:08.711'),(6,'student.create','students','Create new students','2026-01-21 17:04:08.715'),(7,'student.read','students','View student details','2026-01-21 17:04:08.719'),(8,'student.update','students','Update student information','2026-01-21 17:04:08.723'),(9,'student.delete','students','Delete students','2026-01-21 17:04:08.727'),(10,'student.list','students','List students','2026-01-21 17:04:08.731'),(11,'student.view_own','students','View own student profile','2026-01-21 17:04:08.735'),(12,'teacher.create','teachers','Create new teachers','2026-01-21 17:04:08.739'),(13,'teacher.read','teachers','View teacher details','2026-01-21 17:04:08.742'),(14,'teacher.update','teachers','Update teacher information','2026-01-21 17:04:08.746'),(15,'teacher.delete','teachers','Delete teachers','2026-01-21 17:04:08.749'),(16,'teacher.list','teachers','List teachers','2026-01-21 17:04:08.753'),(17,'academic_year.manage','academic','Manage academic years','2026-01-21 17:04:08.757'),(18,'class.manage','academic','Manage classes','2026-01-21 17:04:08.760'),(19,'section.manage','academic','Manage sections','2026-01-21 17:04:08.797'),(20,'subject.manage','academic','Manage subjects','2026-01-21 17:04:08.803'),(21,'class_subject.manage','academic','Manage class-subject assignments','2026-01-21 17:04:08.814'),(22,'teacher_subject.manage','academic','Manage teacher assignments','2026-01-21 17:04:08.823'),(23,'attendance.mark','attendance','Mark attendance','2026-01-21 17:04:08.829'),(24,'attendance.view_all','attendance','View all attendance records','2026-01-21 17:04:08.837'),(25,'attendance.view_own','attendance','View own attendance','2026-01-21 17:04:08.842'),(26,'attendance.view_class','attendance','View class attendance','2026-01-21 17:04:08.846'),(27,'exam.create','exams','Create exams','2026-01-21 17:04:08.850'),(28,'exam.read','exams','View exam details','2026-01-21 17:04:08.855'),(29,'exam.update','exams','Update exam information','2026-01-21 17:04:08.859'),(30,'exam.delete','exams','Delete exams','2026-01-21 17:04:08.863'),(31,'exam.manage_subjects','exams','Manage exam subjects','2026-01-21 17:04:08.868'),(32,'result.enter','results','Enter exam results','2026-01-21 17:04:08.872'),(33,'result.view_all','results','View all results','2026-01-21 17:04:08.876'),(34,'result.view_own','results','View own results','2026-01-21 17:04:08.879'),(35,'result.view_child','results','View child results','2026-01-21 17:04:08.883'),(36,'result.publish','results','Publish results','2026-01-21 17:04:08.888'),(37,'report_card.generate','report_cards','Generate report cards','2026-01-21 17:04:08.892'),(38,'report_card.view_all','report_cards','View all report cards','2026-01-21 17:04:08.895'),(39,'report_card.view_own','report_cards','View own report card','2026-01-21 17:04:08.911'),(40,'report_card.view_child','report_cards','View child report card','2026-01-21 17:04:08.914'),(41,'assignment.create','assignments','Create assignments','2026-01-21 17:04:08.918'),(42,'assignment.read','assignments','View assignments','2026-01-21 17:04:08.922'),(43,'assignment.update','assignments','Update assignments','2026-01-21 17:04:08.925'),(44,'assignment.delete','assignments','Delete assignments','2026-01-21 17:04:08.928'),(45,'assignment.grade','assignments','Grade submissions','2026-01-21 17:04:08.931'),(46,'assignment.submit','assignments','Submit assignments','2026-01-21 17:04:08.933'),(47,'assignment.view_own','assignments','View own assignments','2026-01-21 17:04:08.937'),(48,'notice.create','notices','Create notices','2026-01-21 17:04:08.939'),(49,'notice.read','notices','View notices','2026-01-21 17:04:08.942'),(50,'notice.update','notices','Update notices','2026-01-21 17:04:08.944'),(51,'notice.delete','notices','Delete notices','2026-01-21 17:04:08.946'),(52,'promotion.process','promotions','Process student promotions','2026-01-21 17:04:08.948'),(53,'promotion.view','promotions','View promotion history','2026-01-21 17:04:08.951'),(54,'fee.manage_types','fees','Create/update/delete fee types','2026-01-21 17:04:08.954'),(55,'fee.manage_structures','fees','Create/update/delete fee structures','2026-01-21 17:04:08.957'),(56,'fee.record_payment','fees','Record fee payments','2026-01-21 17:04:08.959'),(57,'fee.view_all','fees','View all fee records and reports','2026-01-21 17:04:08.961'),(58,'fee.generate_invoice','fees','Generate fee invoices for students','2026-01-21 17:04:08.964'),(59,'fee.apply_discount','fees','Apply discounts or fines to fees','2026-01-21 17:04:08.966');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `program_subjects`
--

DROP TABLE IF EXISTS `program_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `program_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `program_id` int NOT NULL,
  `class_subject_id` int NOT NULL,
  `is_compulsory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `program_subjects_program_id_class_subject_id_key` (`program_id`,`class_subject_id`),
  KEY `program_subjects_program_id_idx` (`program_id`),
  KEY `program_subjects_class_subject_id_idx` (`class_subject_id`),
  CONSTRAINT `program_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `program_subjects_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `program_subjects`
--

LOCK TABLES `program_subjects` WRITE;
/*!40000 ALTER TABLE `program_subjects` DISABLE KEYS */;
INSERT INTO `program_subjects` VALUES (1,1,53,1,'2026-01-21 17:52:33.876'),(2,1,58,1,'2026-01-21 17:52:33.882'),(3,1,61,1,'2026-01-21 17:52:33.886'),(4,2,61,1,'2026-01-21 17:52:33.891'),(5,1,62,1,'2026-01-21 17:52:33.896'),(6,2,62,1,'2026-01-21 17:52:33.900'),(7,1,63,1,'2026-01-21 17:52:33.903'),(8,2,63,1,'2026-01-21 17:52:33.907'),(9,1,64,1,'2026-01-21 17:52:33.911'),(10,1,65,1,'2026-01-21 17:52:33.915'),(11,1,66,1,'2026-01-21 17:52:33.919'),(12,1,67,1,'2026-01-21 17:52:33.922'),(13,1,68,1,'2026-01-21 17:52:33.928'),(14,2,68,1,'2026-01-21 17:52:33.933'),(15,2,69,1,'2026-01-21 17:52:33.937'),(16,2,70,1,'2026-01-21 17:52:33.941'),(17,2,71,1,'2026-01-21 17:52:33.944'),(18,1,72,1,'2026-01-21 17:52:33.948'),(19,2,72,1,'2026-01-21 17:52:33.952'),(20,1,73,1,'2026-01-21 17:52:33.955'),(21,2,73,1,'2026-01-21 17:52:33.959'),(22,1,74,1,'2026-01-21 17:52:33.962'),(23,2,74,1,'2026-01-21 17:52:33.966'),(24,1,75,1,'2026-01-21 17:52:33.969'),(25,1,76,1,'2026-01-21 17:52:33.973'),(26,1,77,1,'2026-01-21 17:52:33.976'),(27,1,78,1,'2026-01-21 17:52:33.979'),(28,1,79,1,'2026-01-21 17:52:33.983'),(29,2,80,1,'2026-01-21 17:52:33.986'),(30,2,81,1,'2026-01-21 17:52:33.990'),(31,2,82,1,'2026-01-21 17:52:33.993');
/*!40000 ALTER TABLE `program_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `programs`
--

DROP TABLE IF EXISTS `programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `academic_year_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `programs_school_id_academic_year_id_name_key` (`school_id`,`academic_year_id`,`name`),
  KEY `programs_school_id_idx` (`school_id`),
  KEY `programs_academic_year_id_idx` (`academic_year_id`),
  KEY `programs_is_active_idx` (`is_active`),
  CONSTRAINT `programs_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `programs_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `programs`
--

LOCK TABLES `programs` WRITE;
/*!40000 ALTER TABLE `programs` DISABLE KEYS */;
INSERT INTO `programs` VALUES (1,1,1,'Science','NEB Science Faculty - Physics, Chemistry, Biology, Mathematics',1,'2026-01-21 17:52:33.856','2026-01-21 17:52:33.856'),(2,1,1,'Management','NEB Management Faculty - Accounting, Economics, Business Studies',1,'2026-01-21 17:52:33.864','2026-01-21 17:52:33.864');
/*!40000 ALTER TABLE `programs` ENABLE KEYS */;
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
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `replaced_by_token_id` int DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_tokens_token_key` (`token`),
  KEY `refresh_tokens_user_id_idx` (`user_id`),
  KEY `refresh_tokens_token_idx` (`token`),
  KEY `refresh_tokens_expires_at_idx` (`expires_at`),
  KEY `refresh_tokens_revoked_at_idx` (`revoked_at`),
  CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,1,'2026-01-21 17:04:08.994'),(2,1,2,'2026-01-21 17:04:08.998'),(3,1,3,'2026-01-21 17:04:09.003'),(4,1,4,'2026-01-21 17:04:09.008'),(5,1,5,'2026-01-21 17:04:09.012'),(6,1,6,'2026-01-21 17:04:09.015'),(7,1,7,'2026-01-21 17:04:09.021'),(8,1,8,'2026-01-21 17:04:09.026'),(9,1,9,'2026-01-21 17:04:09.030'),(10,1,10,'2026-01-21 17:04:09.034'),(11,1,12,'2026-01-21 17:04:09.039'),(12,1,13,'2026-01-21 17:04:09.043'),(13,1,14,'2026-01-21 17:04:09.047'),(14,1,15,'2026-01-21 17:04:09.049'),(15,1,16,'2026-01-21 17:04:09.054'),(16,1,17,'2026-01-21 17:04:09.058'),(17,1,18,'2026-01-21 17:04:09.061'),(18,1,19,'2026-01-21 17:04:09.064'),(19,1,20,'2026-01-21 17:04:09.069'),(20,1,21,'2026-01-21 17:04:09.074'),(21,1,22,'2026-01-21 17:04:09.077'),(22,1,23,'2026-01-21 17:04:09.080'),(23,1,24,'2026-01-21 17:04:09.082'),(24,1,26,'2026-01-21 17:04:09.086'),(25,1,27,'2026-01-21 17:04:09.090'),(26,1,28,'2026-01-21 17:04:09.094'),(27,1,29,'2026-01-21 17:04:09.097'),(28,1,30,'2026-01-21 17:04:09.101'),(29,1,31,'2026-01-21 17:04:09.105'),(30,1,32,'2026-01-21 17:04:09.109'),(31,1,33,'2026-01-21 17:04:09.112'),(32,1,36,'2026-01-21 17:04:09.114'),(33,1,37,'2026-01-21 17:04:09.118'),(34,1,38,'2026-01-21 17:04:09.122'),(35,1,41,'2026-01-21 17:04:09.126'),(36,1,42,'2026-01-21 17:04:09.129'),(37,1,43,'2026-01-21 17:04:09.132'),(38,1,44,'2026-01-21 17:04:09.137'),(39,1,45,'2026-01-21 17:04:09.142'),(40,1,48,'2026-01-21 17:04:09.145'),(41,1,49,'2026-01-21 17:04:09.149'),(42,1,50,'2026-01-21 17:04:09.153'),(43,1,51,'2026-01-21 17:04:09.157'),(44,1,52,'2026-01-21 17:04:09.161'),(45,1,53,'2026-01-21 17:04:09.165'),(46,1,54,'2026-01-21 17:04:09.169'),(47,1,55,'2026-01-21 17:04:09.174'),(48,1,56,'2026-01-21 17:04:09.178'),(49,1,57,'2026-01-21 17:04:09.182'),(50,1,58,'2026-01-21 17:04:09.188'),(51,1,59,'2026-01-21 17:04:09.191'),(52,2,7,'2026-01-21 17:04:09.195'),(53,2,10,'2026-01-21 17:04:09.198'),(54,2,23,'2026-01-21 17:04:09.203'),(55,2,26,'2026-01-21 17:04:09.208'),(56,2,28,'2026-01-21 17:04:09.212'),(57,2,32,'2026-01-21 17:04:09.216'),(58,2,33,'2026-01-21 17:04:09.221'),(59,2,41,'2026-01-21 17:04:09.224'),(60,2,42,'2026-01-21 17:04:09.227'),(61,2,43,'2026-01-21 17:04:09.231'),(62,2,44,'2026-01-21 17:04:09.234'),(63,2,45,'2026-01-21 17:04:09.239'),(64,2,49,'2026-01-21 17:04:09.243'),(65,2,48,'2026-01-21 17:04:09.246'),(66,5,11,'2026-01-21 17:04:09.250'),(67,5,25,'2026-01-21 17:04:09.254'),(68,5,34,'2026-01-21 17:04:09.259'),(69,5,39,'2026-01-21 17:04:09.263'),(70,5,46,'2026-01-21 17:04:09.267'),(71,5,47,'2026-01-21 17:04:09.271'),(72,5,49,'2026-01-21 17:04:09.275'),(73,6,25,'2026-01-21 17:04:09.280'),(74,6,35,'2026-01-21 17:04:09.283'),(75,6,40,'2026-01-21 17:04:09.287'),(76,6,47,'2026-01-21 17:04:09.291'),(77,6,49,'2026-01-21 17:04:09.295'),(78,3,7,'2026-01-21 17:04:09.299'),(79,3,10,'2026-01-21 17:04:09.303'),(80,3,28,'2026-01-21 17:04:09.308'),(81,3,32,'2026-01-21 17:04:09.312'),(82,3,33,'2026-01-21 17:04:09.315'),(83,3,49,'2026-01-21 17:04:09.319'),(84,4,7,'2026-01-21 17:04:09.324'),(85,4,10,'2026-01-21 17:04:09.328'),(86,4,54,'2026-01-21 17:04:09.330'),(87,4,55,'2026-01-21 17:04:09.333'),(88,4,56,'2026-01-21 17:04:09.337'),(89,4,57,'2026-01-21 17:04:09.341'),(90,4,58,'2026-01-21 17:04:09.345'),(91,4,59,'2026-01-21 17:04:09.350'),(92,4,49,'2026-01-21 17:04:09.354');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','School Administrator','2026-01-21 17:04:08.970'),(2,'TEACHER','Teacher','2026-01-21 17:04:08.975'),(3,'EXAM_OFFICER','Exam Officer - Can enter marks for any subject','2026-01-21 17:04:08.978'),(4,'ACCOUNTANT','Accountant - Manages fee collection and billing','2026-01-21 17:04:08.982'),(5,'STUDENT','Student','2026-01-21 17:04:08.985'),(6,'PARENT','Parent/Guardian','2026-01-21 17:04:08.988');
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
INSERT INTO `schools` VALUES (1,'SVI','DEMO001','Balaju, Kathmandu, Nepal','+977-1-1234567','info@svi.edu.np',NULL,1,'2026-01-21 17:04:09.359','2026-01-21 17:04:09.359');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sections`
--

LOCK TABLES `sections` WRITE;
/*!40000 ALTER TABLE `sections` DISABLE KEYS */;
INSERT INTO `sections` VALUES (1,1,'A',40,'2026-01-21 17:04:09.374'),(2,1,'B',40,'2026-01-21 17:04:09.379'),(3,1,'C',35,'2026-01-21 17:04:09.382');
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
  `school_id` int NOT NULL DEFAULT '1',
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
  KEY `student_classes_school_id_idx` (`school_id`),
  CONSTRAINT `student_classes_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_classes_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_classes`
--

LOCK TABLES `student_classes` WRITE;
/*!40000 ALTER TABLE `student_classes` DISABLE KEYS */;
INSERT INTO `student_classes` VALUES (1,1,10,1,1,1,1,'active','2026-01-21 17:04:09.831');
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
  `school_id` int NOT NULL DEFAULT '1',
  `relationship` enum('father','mother','guardian') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_parents_student_id_parent_id_key` (`student_id`,`parent_id`),
  KEY `student_parents_student_id_idx` (`student_id`),
  KEY `student_parents_parent_id_idx` (`parent_id`),
  KEY `student_parents_school_id_idx` (`school_id`),
  CONSTRAINT `student_parents_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_parents_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_parents_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_parents`
--

LOCK TABLES `student_parents` WRITE;
/*!40000 ALTER TABLE `student_parents` DISABLE KEYS */;
INSERT INTO `student_parents` VALUES (1,1,1,1,'father',1,'2026-01-21 17:04:09.852');
/*!40000 ALTER TABLE `student_parents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_programs`
--

DROP TABLE IF EXISTS `student_programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_class_id` int NOT NULL,
  `program_id` int NOT NULL,
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_programs_student_class_id_key` (`student_class_id`),
  KEY `student_programs_student_class_id_idx` (`student_class_id`),
  KEY `student_programs_program_id_idx` (`program_id`),
  CONSTRAINT `student_programs_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_programs_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_programs`
--

LOCK TABLES `student_programs` WRITE;
/*!40000 ALTER TABLE `student_programs` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_programs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_subjects`
--

DROP TABLE IF EXISTS `student_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_class_id` int NOT NULL,
  `class_subject_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` enum('ACTIVE','DROPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_subjects_student_class_id_class_subject_id_key` (`student_class_id`,`class_subject_id`),
  KEY `student_subjects_student_class_id_idx` (`student_class_id`),
  KEY `student_subjects_class_subject_id_idx` (`class_subject_id`),
  CONSTRAINT `student_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_subjects_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_subjects`
--

LOCK TABLES `student_subjects` WRITE;
/*!40000 ALTER TABLE `student_subjects` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_subjects` ENABLE KEYS */;
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
  `school_id` int NOT NULL DEFAULT '1',
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
  KEY `students_school_id_idx` (`school_id`),
  CONSTRAINT `students_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,5,1,'STU2024001','2008-05-15','male','A+','Kathmandu, Nepal','+977-9801111111','2024-04-01','2026-01-21 17:04:09.825','2026-01-21 17:04:09.825');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subject_audits`
--

DROP TABLE IF EXISTS `subject_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_audits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_subject_id` int DEFAULT NULL,
  `subject_id` int DEFAULT NULL,
  `action` enum('CREATE','UPDATE','LOCK','DELETE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `performed_by_user_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `subject_audits_class_subject_id_idx` (`class_subject_id`),
  KEY `subject_audits_subject_id_idx` (`subject_id`),
  KEY `subject_audits_performed_by_user_id_idx` (`performed_by_user_id`),
  KEY `subject_audits_action_idx` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subject_audits`
--

LOCK TABLES `subject_audits` WRITE;
/*!40000 ALTER TABLE `subject_audits` DISABLE KEYS */;
/*!40000 ALTER TABLE `subject_audits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subject_components`
--

DROP TABLE IF EXISTS `subject_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject_id` int NOT NULL,
  `class_id` int NOT NULL,
  `type` enum('THEORY','PRACTICAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_marks` int NOT NULL,
  `pass_marks` int NOT NULL,
  `credit_hours` double NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_components_class_id_subject_id_type_key` (`class_id`,`subject_id`,`type`),
  KEY `subject_components_subject_id_idx` (`subject_id`),
  KEY `subject_components_class_id_idx` (`class_id`),
  CONSTRAINT `subject_components_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subject_components_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subject_components`
--

LOCK TABLES `subject_components` WRITE;
/*!40000 ALTER TABLE `subject_components` DISABLE KEYS */;
INSERT INTO `subject_components` VALUES (1,9,11,'THEORY','0031',75,30,3,'2026-01-21 17:49:49.847','2026-01-21 17:49:49.847'),(2,9,11,'PRACTICAL','0032',25,10,1,'2026-01-21 17:49:49.853','2026-01-21 17:49:49.853'),(3,10,11,'THEORY','0011',75,30,2.25,'2026-01-21 17:49:49.868','2026-01-21 17:49:49.868'),(4,10,11,'PRACTICAL','0012',25,10,0.75,'2026-01-21 17:49:49.873','2026-01-21 17:49:49.873'),(5,11,11,'THEORY','0051',75,30,3.75,'2026-01-21 17:49:49.887','2026-01-21 17:49:49.887'),(6,11,11,'PRACTICAL','0052',25,10,1.25,'2026-01-21 17:49:49.891','2026-01-21 17:49:49.891'),(7,12,11,'THEORY','1011',75,30,3.75,'2026-01-21 17:49:49.903','2026-01-21 17:49:49.903'),(8,12,11,'PRACTICAL','1012',25,10,1.25,'2026-01-21 17:49:49.907','2026-01-21 17:49:49.907'),(9,13,11,'THEORY','3011',75,30,3.75,'2026-01-21 17:49:49.917','2026-01-21 17:49:49.917'),(10,13,11,'PRACTICAL','3012',25,10,1.25,'2026-01-21 17:49:49.921','2026-01-21 17:49:49.921'),(11,14,11,'THEORY','1031',75,30,3.75,'2026-01-21 17:49:49.933','2026-01-21 17:49:49.933'),(12,14,11,'PRACTICAL','1032',25,10,1.25,'2026-01-21 17:49:49.937','2026-01-21 17:49:49.937'),(13,15,11,'THEORY','0071',75,30,3.75,'2026-01-21 17:49:49.953','2026-01-21 17:49:49.953'),(14,15,11,'PRACTICAL','0072',25,10,1.25,'2026-01-21 17:49:49.958','2026-01-21 17:49:49.958'),(15,16,11,'THEORY','4271',50,20,2.5,'2026-01-21 17:49:49.975','2026-01-21 17:49:49.975'),(16,16,11,'PRACTICAL','4272',50,20,2.5,'2026-01-21 17:49:49.981','2026-01-21 17:49:49.981'),(17,17,11,'THEORY','3031',75,30,3.75,'2026-01-21 17:49:50.001','2026-01-21 17:49:50.001'),(18,17,11,'PRACTICAL','3032',25,10,1.25,'2026-01-21 17:49:50.006','2026-01-21 17:49:50.006'),(19,18,11,'THEORY','2151',75,30,3.75,'2026-01-21 17:49:50.018','2026-01-21 17:49:50.018'),(20,18,11,'PRACTICAL','2152',25,10,1.25,'2026-01-21 17:49:50.022','2026-01-21 17:49:50.022'),(21,19,11,'THEORY','4391',50,20,2.5,'2026-01-21 17:49:50.034','2026-01-21 17:49:50.034'),(22,19,11,'PRACTICAL','4392',50,20,2.5,'2026-01-21 17:49:50.039','2026-01-21 17:49:50.039'),(23,20,12,'THEORY','0041',75,30,3,'2026-01-21 17:49:50.051','2026-01-21 17:49:50.051'),(24,20,12,'PRACTICAL','0042',25,10,1,'2026-01-21 17:49:50.057','2026-01-21 17:49:50.057'),(25,21,12,'THEORY','0021',75,30,2.25,'2026-01-21 17:49:50.072','2026-01-21 17:49:50.072'),(26,21,12,'PRACTICAL','0022',25,10,0.75,'2026-01-21 17:49:50.077','2026-01-21 17:49:50.077'),(27,22,12,'THEORY','0061',75,30,3,'2026-01-21 17:49:50.091','2026-01-21 17:49:50.091'),(28,22,12,'PRACTICAL','0062',25,10,1,'2026-01-21 17:49:50.096','2026-01-21 17:49:50.096'),(29,23,12,'THEORY','1021',75,30,3.75,'2026-01-21 17:49:50.109','2026-01-21 17:49:50.109'),(30,23,12,'PRACTICAL','1022',25,10,1.25,'2026-01-21 17:49:50.113','2026-01-21 17:49:50.113'),(31,24,12,'THEORY','3012',75,30,3.75,'2026-01-21 17:49:50.126','2026-01-21 17:49:50.126'),(32,24,12,'PRACTICAL','3013',25,10,1.25,'2026-01-21 17:49:50.130','2026-01-21 17:49:50.130'),(33,25,12,'THEORY','1041',75,30,3.75,'2026-01-21 17:49:50.143','2026-01-21 17:49:50.143'),(34,25,12,'PRACTICAL','1042',25,10,1.25,'2026-01-21 17:49:50.146','2026-01-21 17:49:50.146'),(35,26,12,'THEORY','0081',75,30,3.75,'2026-01-21 17:49:50.158','2026-01-21 17:49:50.158'),(36,26,12,'PRACTICAL','0082',25,10,1.25,'2026-01-21 17:49:50.164','2026-01-21 17:49:50.164'),(37,27,12,'THEORY','4281',50,20,2.5,'2026-01-21 17:49:50.179','2026-01-21 17:49:50.179'),(38,27,12,'PRACTICAL','4282',50,20,2.5,'2026-01-21 17:49:50.183','2026-01-21 17:49:50.183'),(39,28,12,'THEORY','3041',75,30,3.75,'2026-01-21 17:49:50.204','2026-01-21 17:49:50.204'),(40,28,12,'PRACTICAL','3042',25,10,1.25,'2026-01-21 17:49:50.209','2026-01-21 17:49:50.209'),(41,29,12,'THEORY','2261',75,30,3.75,'2026-01-21 17:49:50.225','2026-01-21 17:49:50.225'),(42,29,12,'PRACTICAL','2262',25,10,1.25,'2026-01-21 17:49:50.229','2026-01-21 17:49:50.229'),(43,30,12,'THEORY','4401',50,20,2.5,'2026-01-21 17:49:50.244','2026-01-21 17:49:50.244'),(44,30,12,'PRACTICAL','4402',50,20,2.5,'2026-01-21 17:49:50.249','2026-01-21 17:49:50.249');
/*!40000 ALTER TABLE `subject_components` ENABLE KEYS */;
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
  `credit_hours` decimal(3,1) NOT NULL DEFAULT '3.0',
  `has_practical` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_school_id_code_key` (`school_id`,`code`),
  KEY `subjects_school_id_idx` (`school_id`),
  KEY `subjects_code_idx` (`code`),
  CONSTRAINT `subjects_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
INSERT INTO `subjects` VALUES (1,1,'English','ENG','English Language and Literature',0,3.0,0,'2026-01-21 17:04:09.426'),(2,1,'Mathematics','MATH','Mathematics',0,3.0,0,'2026-01-21 17:04:09.433'),(3,1,'Science','SCI','General Science',0,3.0,0,'2026-01-21 17:04:09.439'),(4,1,'Social Studies','SOC','Social Studies and History',0,3.0,0,'2026-01-21 17:04:09.443'),(5,1,'Nepali','NEP','Nepali Language',0,3.0,0,'2026-01-21 17:04:09.447'),(6,1,'Computer Science','CS','Computer Science and IT',0,3.0,0,'2026-01-21 17:04:09.451'),(7,1,'Physical Education','PE','Physical Education',1,3.0,0,'2026-01-21 17:04:09.455'),(8,1,'Art','ART','Art and Craft',1,3.0,0,'2026-01-21 17:04:09.460'),(9,1,'Compulsory English','0031_11','Compulsory subject for Grade 11',0,4.0,1,'2026-01-21 17:49:49.823'),(10,1,'Compulsory Nepali','0011_11','Compulsory subject for Grade 11',0,3.0,1,'2026-01-21 17:49:49.859'),(11,1,'Social Studies & Life Skills','0051_11','OptionalForScienceManagement subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.878'),(12,1,'Physics','1011_11','Science subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.895'),(13,1,'Chemistry','3011_11','Science subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.911'),(14,1,'Biology','1031_11','Science subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.925'),(15,1,'Mathematics','0071_11','Science subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.942'),(16,1,'Computer Science','4271_11','OptionalForScienceManagement subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.963'),(17,1,'Economics','3031_11','Management subject for Grade 11',1,5.0,1,'2026-01-21 17:49:49.991'),(18,1,'Business Studies','2151_11','Management subject for Grade 11',1,5.0,1,'2026-01-21 17:49:50.010'),(19,1,'Hotel Management','4391_11','Management subject for Grade 11',1,5.0,1,'2026-01-21 17:49:50.026'),(20,1,'Compulsory English','0041_12','Compulsory subject for Grade 12',0,4.0,1,'2026-01-21 17:49:50.043'),(21,1,'Compulsory Nepali','0021_12','OptionalForScienceManagement subject for Grade 12',0,3.0,1,'2026-01-21 17:49:50.063'),(22,1,'Social Studies & Life Skills','0061_12','OptionalForScienceManagement subject for Grade 12',0,4.0,1,'2026-01-21 17:49:50.081'),(23,1,'Physics','1021_12','Science subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.099'),(24,1,'Chemistry','3012_12','Science subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.117'),(25,1,'Biology','1041_12','Science subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.134'),(26,1,'Mathematics','0081_12','Science subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.150'),(27,1,'Computer Science','4281_12','Science subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.168'),(28,1,'Economics','3041_12','Management subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.193'),(29,1,'Business Studies','2261_12','Management subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.214'),(30,1,'Hotel Management','4401_12','Management subject for Grade 12',1,5.0,1,'2026-01-21 17:49:50.234');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submission_files`
--

LOCK TABLES `submission_files` WRITE;
/*!40000 ALTER TABLE `submission_files` DISABLE KEYS */;
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
  `student_class_id` int NOT NULL,
  `school_id` int NOT NULL DEFAULT '1',
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
  KEY `submissions_student_class_id_idx` (`student_class_id`),
  KEY `submissions_status_idx` (`status`),
  KEY `submissions_graded_by_idx` (`graded_by`),
  KEY `submissions_school_id_idx` (`school_id`),
  CONSTRAINT `submissions_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `submissions_graded_by_fkey` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `submissions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `submissions_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `submissions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submissions`
--

LOCK TABLES `submissions` WRITE;
/*!40000 ALTER TABLE `submissions` DISABLE KEYS */;
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
  UNIQUE KEY `teacher_subjects_user_id_class_subject_id_section_id_academi_key` (`user_id`,`class_subject_id`,`section_id`,`academic_year_id`),
  KEY `teacher_subjects_user_id_idx` (`user_id`),
  KEY `teacher_subjects_class_subject_id_idx` (`class_subject_id`),
  KEY `teacher_subjects_section_id_idx` (`section_id`),
  KEY `teacher_subjects_academic_year_id_idx` (`academic_year_id`),
  KEY `teacher_subjects_class_subject_id_academic_year_id_idx` (`class_subject_id`,`academic_year_id`),
  CONSTRAINT `teacher_subjects_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_class_subject_id_fkey` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_subjects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_subjects`
--

LOCK TABLES `teacher_subjects` WRITE;
/*!40000 ALTER TABLE `teacher_subjects` DISABLE KEYS */;
INSERT INTO `teacher_subjects` VALUES (1,2,47,1,1,1,'2026-01-21 17:04:09.812');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,1,'2026-01-21 17:04:09.780'),(2,2,2,'2026-01-21 17:04:09.791'),(3,3,3,'2026-01-21 17:04:09.799'),(4,4,4,'2026-01-21 17:04:09.807'),(5,5,5,'2026-01-21 17:04:09.821'),(6,6,6,'2026-01-21 17:04:09.843');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'admin@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Amir','Shrestha','+977-9861158271',NULL,'active',NULL,'2026-01-21 17:04:09.771','2026-01-21 17:04:09.771'),(2,1,'teacher@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Bimala','shrestha','+977-9802345678',NULL,'active',NULL,'2026-01-21 17:04:09.787','2026-01-21 17:04:09.787'),(3,1,'examofficer@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Exam','Officer','+977-9807654321',NULL,'active',NULL,'2026-01-21 17:04:09.795','2026-01-21 17:04:09.795'),(4,1,'accountant@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Accounts','Officer','+977-9806543210',NULL,'active',NULL,'2026-01-21 17:04:09.803','2026-01-21 17:04:09.803'),(5,1,'student@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Bivan','Shrestha','+977-9803456789',NULL,'active',NULL,'2026-01-21 17:04:09.816','2026-01-21 17:04:09.816'),(6,1,'parent@svi.edu.np','$2a$10$TXe9ytRKP3Uj67bumENVv.ujzGVsmsCoHCaRibJHJVw4MFboiwpIu','Hari','Parent','+977-9804567890',NULL,'active',NULL,'2026-01-21 17:04:09.838','2026-01-21 17:04:09.838');
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

-- Dump completed on 2026-01-21 23:43:41
