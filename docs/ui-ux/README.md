# UI and UX docs

**The design system lives in [`frontend/DESIGN.md`](../../frontend/DESIGN.md).** That is
the source of truth for colour, typography, spacing, radius, elevation, surfaces,
components and the accessibility floor. Read it before changing anything visual, and
update it in the same change if a rule moves.

**Work in progress:** [plans/visual-identity-redesign.md](../plans/visual-identity-redesign.md)
— waves 0–2 are done, waves 3 (data-dense screens) and 4 (the long tail) are next.

The files here are the record of how the design got to where it is:

| File | What it is |
|---|---|
| [tailwind-design-system-audit.md](tailwind-design-system-audit.md) | 2026-11-11 audit. Asked "is the design system *complete*?" and correctly answered yes. It did not ask whether the UI had any visual character — that is what `DESIGN.md` answers. |
| [redesign-final-report.md](redesign-final-report.md) | 2026-11-12 summary of the report-card redesign, the React-admin pilot and the Playwright suite. |
| [report-card-audit.md](report-card-audit.md) | Audit of the printed report card. |
| [report-card-design-proposal.md](report-card-design-proposal.md) | The proposal that became the current NEB grade sheet. |

Note that the printed report card and the fee slips are **deliberately outside** the
design system — they have their own unlayered CSS so that A4 page counts stay stable.
`DESIGN.md` says so explicitly; do not "fix" them to match the app.
