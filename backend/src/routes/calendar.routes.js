const express = require("express");
const router = express.Router();
const calendar = require("../controllers/calendar.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { isAdmin, requireRole } = require("../middleware/authorize.middleware");

/**
 * School calendar routes (/api/v1/calendar), scoped to req.user.schoolId.
 *
 *  - Reading the calendar: any signed-in user. What each person gets back is
 *    decided in services/calendar (audience and per-module visibility rules).
 *  - Events: admins manage all; a teacher may add class events for the
 *    sections they teach and change their own (checked in the service).
 *  - Settings and holiday import: admins only.
 *
 * Input is checked in utils/calendar (eventInput, calendarConfig, holidayRows),
 * which is unit-tested, instead of express-validator rule arrays.
 */

const staff = requireRole("ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT");
const writers = requireRole("ADMIN", "TEACHER");

router.get("/feed", authenticate, calendar.getFeed);
router.get("/overview", authenticate, calendar.getOverview);
router.get("/meta", authenticate, calendar.getMeta);
router.get("/working-day", authenticate, staff, calendar.getWorkingDay);

router.get("/settings", authenticate, calendar.getSettings);
router.put("/settings", authenticate, isAdmin, calendar.updateSettings);
router.delete("/settings", authenticate, isAdmin, calendar.resetSettings);

router.get("/holidays/sources", authenticate, isAdmin, calendar.getHolidaySources);
router.post("/holidays/import/preview", authenticate, isAdmin, calendar.previewHolidayImport);
router.post("/holidays/import", authenticate, isAdmin, calendar.importHolidays);

router.get("/events", authenticate, writers, calendar.listEvents);
router.post("/events", authenticate, writers, calendar.createEvent);
router.get("/events/:id", authenticate, calendar.getEvent);
router.put("/events/:id", authenticate, writers, calendar.updateEvent);
router.delete("/events/:id", authenticate, writers, calendar.deleteEvent);

module.exports = router;
