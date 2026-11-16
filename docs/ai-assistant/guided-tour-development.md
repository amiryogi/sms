# Walkthroughs

A walkthrough highlights the app's real controls one step at a time (driver.js 1.10.2, pinned).
It only highlights and navigates; it never clicks, types or submits.

## Pieces

| File | Holds |
|---|---|
| `backend/src/data/assistant/guides.json` | Id, roles, start page and titles: what the server may offer each role |
| `frontend/src/components/assistant/guides/registry.js` | The steps, text in English and Nepali, `TARGET_PATTERN`, `resolvePath` |
| `frontend/src/components/assistant/guides/GuideRunner.jsx` | Runs one walkthrough; state in `sessionStorage` `sms.assistant.guide` |
| `frontend/src/components/assistant/guides/targets.js` | `findTarget(id)`: the only way an element is found |
| `data-guide="…"` attributes | On the controls themselves, in the pages |

## A step

```js
{
  route: "/teacher/attendance",          // page it is on; "{portal}" = student or parent
  target: "attendance.save",             // a data-guide id, "nav:/path" (menu link), or none
  title: { en: "Save", ne: "सेभ गर्नुहोस्" },
  body:  { en: "Click Save Attendance…", ne: "Save Attendance थिच्नुहोस्…" },
  missing: { en: "Save Attendance appears below the list once a class is chosen.", ne: "…" },
}
```

The runner handles each step like this:
- **`nav:/path`:** highlights the sidebar link. On a phone it highlights the menu button (`nav:menu`)
  first, then the link once the menu is open. When the person reaches the page, the step moves on
  by itself.
- **On another page:** a card "This step is on another page" with **Go to …**.
- **Target not visible within 3 s:** the step is shown centred with `missing` (or a general line).
- **No target:** a centred explanation.

Controls are Next, Back, Pause and × (Esc). Pause shows a Resume pill bottom-left, and it survives
a reload.

## Adding a walkthrough

1. Tag the controls: `data-guide="area.thing"` (letters and dots only). The kit's `Button`,
   `Card` and `Field` pass it through; otherwise wrap the control in a `div`.
2. Add the steps to `registry.js` in both languages, with `missing` for controls that appear
   only after a choice.
3. Add the same id and roles to `guides.json`, and the id to the `guides` of the help document
   that should offer it.
4. Run `npm test` in `frontend/` (registry against the server catalog, `App.jsx`, each role's
   menu and the tagged controls) and `npm test` in `backend/`.
5. Add or extend a case in `e2e/tests/assistant.spec.js`.

## Safety

- Targets must match `TARGET_PATTERN` and are looked up with `CSS.escape`: no selector, script or
  element choice can come from the server or the model.
- Only walkthroughs in the user's bootstrap list (filtered by role on the server) can start; a
  saved walkthrough from another role is dropped.
- driver.js renders popover text as HTML, so step text must stay static text in `registry.js`.
- Popover colours are in the last block of `styles/app.css` (`.sms-guide`).
