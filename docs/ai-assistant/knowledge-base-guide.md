# Help documents

The assistant answers only from the documents in
`backend/src/data/assistant/knowledge/<folder>/*.md`. They ship with the backend (like
`data/holidays/`), so a change goes live with the next backend deploy. The folder is only for
people; who may read a document is set by its `roles`.

## Front matter

```yaml
---
id: teacher-attendance            # unique, used in sources and tests
title: Taking the daily attendance register
roles: [TEACHER]                  # who may retrieve it; SUPER_ADMIN also reads ADMIN documents
modules: [attendance]             # page areas, for a small ranking boost
routes: [/teacher/attendance]     # pages it describes (must exist in routeCatalog.js)
guides: [teacher.attendance]      # walkthroughs offered with an answer from it
status: published                 # draft documents are never used
aliases: [attendance, register, हाजिरी, hajiri]   # extra search words, Nepali welcome
verifiedAgainst: [frontend/src/pages/teacher/Attendance.jsx]  # files it was checked against
verifiedOn: 2026-11-15
---
```

## Body

Use `## ` sections, in this order where they apply: Purpose, Who can use it, Where to find it,
Before you start, Steps, What you should see, Common mistakes, Troubleshooting, Related pages.

Rules:
- **Describe only what the code does.** Read the page and its controller first, and copy menu
  names, buttons and field labels exactly, in bold.
- Say plainly what a role cannot do and who can ("Only administrators create exams").
- A feature that does not exist goes in `shared/not-available.md`, never in a how-to.
- Keep a document short (the prompt carries at most about 12,000 characters of documents).

## Checks that run with `npm test`

`services/__tests__/assistant.knowledge.test.js` fails when:
- ids repeat, roles are unknown, or a field is missing;
- a route is not a page in the catalog, or none of the document's roles can open it;
- a `verifiedAgainst` file does not exist;
- a walkthrough does not exist or shares no role with the document;
- a suggested question no longer finds its document;
- a student or parent could retrieve an administrator's document.

It also holds retrieval cases in English, Nepali and romanized Nepali: add one when you add a
document.

## Changing the app

When a page changes (a renamed button, a new step), update its document in the same commit and
bump `verifiedOn`. Then:
- if a page is added, also add it to `services/assistant/routeCatalog.js` (the drift test against
  `App.jsx` fails otherwise);
- if a control a walkthrough points at is renamed or moved, keep its `data-guide` attribute.

## Suggested questions

`data/assistant/suggestions.json` lists four to six questions per role in English and Nepali,
each naming the document that answers it. Keep them to tasks the role really does.
