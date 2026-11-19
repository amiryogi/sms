---
id: school-settings
title: School settings: profile, branding, grading and report card layout
roles: [ADMIN, SUPER_ADMIN]
modules: [settings, report-cards]
routes: [/admin/school-settings]
guides: []
status: published
aliases: [school settings, school profile, logo, banner, brand colour, color, grade scale, grading, NEB, report card layout, report card design, principal name, विद्यालय सेटिङ, लोगो, ग्रेड, ग्रेडिङ, रिपोर्ट कार्ड डिजाइन, setting]
verifiedAgainst: [frontend/src/pages/admin/SchoolSettings.jsx, frontend/src/components/admin/GradeScaleSettings.jsx, frontend/src/components/admin/ReportCardLayoutSettings.jsx, frontend/src/components/admin/BrandColorSettings.jsx]
verifiedOn: 2026-11-15
---
# School settings

## Purpose
The school's profile, branding, grading and report card.

## Who can use it
Administrators.

## Where to find it
Left menu → **Settings** → **School settings** (`/admin/school-settings`). Tabs:
**School profile**, **Branding**, **Grading**, **Report card**.

## Steps
**School profile**
1. Fill **About the school** (**School name**, **Tagline / motto**, **Principal**,
   **Established**), **Contact** (**Address**, **Mobile number**, **Landline**, **Email**,
   **Website**) and **Social media**.
2. Click **Save changes**.

**Branding**
- Upload the **Logo** (square PNG or JPG, up to 2 MB) and **Banner** (wide, about 4:1, up to 5 MB),
  and choose the app's colour (Indigo, Blue, Teal, Green, Maroon, Orange…).

**Grading**
- **Grade scales**: the NEB 8-band scale is the default. Create a **New grade scale** with
  **From %** / **To %** bands and an optional **Component pass mark (%)**, and **Make default**.
- A scale used by generated report cards can no longer be edited: duplicate it and edit the copy.

**Report card**
- Choose what the printed card shows: **Grades only**, **Marks only** or **Marks and grades**;
  **Theory / practical columns**; **Remark column**; **Class printed as**; **Attendance**
  (**Late counts as present**); **Percentage**; **Class rank**; **Pass / fail result**; grade
  scale table; remarks; subject code and credit hour columns; principal's name; space for the seal.
- Design options set fonts, sizes, logo, row height and margins of the NEB grade sheet.

## What you should see
Changes appear on the sign-in page, sidebar and report cards.

## Common mistakes
- Expecting old report cards to change after a grading change: regenerate them.

## Related pages
Report cards, Calendar settings, AI assistant.
