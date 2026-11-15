---
id: publishing-notices
title: Writing and publishing notices
roles: [ADMIN, SUPER_ADMIN]
modules: [notices]
routes: [/admin/notices]
guides: [admin.notice]
status: published
aliases: [notice, new notice, publish notice, announcement, circular, archive notice, सूचना, सूचना प्रकाशन, जानकारी, suchana]
verifiedAgainst: [frontend/src/pages/admin/Notices.jsx, backend/src/services/notice.service.js]
verifiedOn: 2026-11-15
---
# Writing and publishing notices

## Purpose
Announcements for the whole school, particular roles or particular classes.

## Who can use it
Administrators. Everyone else only reads notices.

## Where to find it
Left menu → **Communication** → **Notices** (`/admin/notices`).

## Steps
1. Click **New Notice**.
2. Type the **Title** and **Message**; choose the **Priority** (**Normal**, **High**, **Urgent**).
3. Choose the **Audience**:
   - **Everyone:** all staff, students and parents;
   - **Specific roles:** choose at least one role;
   - **Specific classes:** **Add a whole class** or **Add one section** (students and parents
     of those classes).
4. Optionally set **Show from** and **Show until** dates. (Notices cannot carry file
   attachments in the web app.)
5. Save. It is saved as a **Draft** ("Publish it when it's ready").
6. Click **Publish** and confirm. "It becomes visible to its audience straight away."

## What you should see
The notice is **Published**. App users in the audience get a notification.

## Common mistakes
- Saving and forgetting to publish: drafts are not shown to anyone.

## Troubleshooting
- **Archive** hides a published notice from everyone; **Delete** cannot be undone.
- "Show until" ends at the start of that day.

## Related pages
Calendar (published notices appear there).
