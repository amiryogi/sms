# School calendar: guide for administrators

How to set up and run the school calendar. Everything here is under **Calendar** in the left
menu when you are signed in as an administrator.

## Dates in the system

Dates are shown in Bikram Sambat (B.S.) by default, for example `1 Baisakh 2083`.

- **Every date field opens a B.S. calendar.** Click a day, or type the date in the box at the
  bottom as year-month-day (`2083-01-15`; Nepali digits work too) and press **Set**.
- Inside the calendar you can switch to **A.D.**, to **Nepali** month and weekday names, and to
  **Nepali numerals**. The small number in each cell is the same day in the other calendar.
- **Each person can choose how dates are shown to them:** click your name at the top right and
  pick **B.S. only**, **A.D. only** or **B.S. with A.D.** This is remembered on that browser.

The system supports dates from 1975 to 2100 B.S. (1918 to 2044 A.D.).

## First-time setup

Do these once, in this order.

### 1. Set the weekly holidays

**Calendar → Calendar Settings**

1. Under **Weekly holidays**, click the days your school is closed. Saturday is set to begin
   with. Choose Friday and Saturday, Saturday and Sunday, or whatever your school follows.
2. Leave **No attendance on holidays** on unless your school sometimes holds classes on a
   holiday (see [Attendance](#attendance-and-holidays)).
3. Under **How dates are shown**, choose the school's default calendar, language and numerals.
4. Click **Save settings**.

### 2. Import the public holidays

**Calendar → Holidays → Import holidays**

1. Choose the B.S. year. The list built in is the Government of Nepal's notice of public
   holidays for 2083 (Nepal Gazette, Ministry of Home Affairs).
2. Click **Preview**. Nothing is saved yet. Each row shows the date **as published in B.S.**, the
   **A.D. date** worked out from it, the weekday, and who the notice says it applies to.
3. **Tick the holidays your school observes.** Nationwide holidays are ticked for you. Holidays
   the notice limits to one community, region or group (Gai Jatra, Teej, Indra Jatra, Fagu
   Purnima by district, and others) are listed but **not** ticked: the government list is for
   offices, and your school decides which of these it keeps.
4. Click **Add … holidays to the calendar**.

Things to know:

- **Importing twice is safe.** A holiday already on your calendar is marked "Already imported"
  and cannot be ticked. A holiday you renamed or switched off is left as you made it.
- **Some holidays have no date in the notice** (Eid, Bakar Eid and a few others are announced
  nearer the time). The preview lists them at the bottom. Add each by hand when the date is
  known.
- **For another year, or a local list,** use **Paste a list**: give the year and the source, then
  one holiday per line as `B.S. date, name, who it applies to`:

  ```
  2084-01-01, Nepali New Year
  2084-02-10, Local fair, Ward 4 only
  ```

  It goes through the same preview. A date that does not exist in that month is flagged.

### 3. Add your school's own holidays

**Calendar → Holidays → Add holiday**

Use this for winter vacation, the school's foundation day, a closure the municipality announces.

- **Category:** *School holiday*, *Local holiday* or *Public holiday*. All three close the
  school on that day.
- **Starts / Ends:** the same day for a one-day holiday, or a range.
- **Who is it for?** *Everyone* closes the whole school. *Certain classes* closes only those
  classes (a rest day after a class trip, for example).
- **Repeats:** *Every year, same B.S. date* suits a fixed anniversary.
- **The school observes this holiday:** switch off to keep a holiday on record without closing
  the school.

### 4. Add events

**Calendar → Events → Add event** (or **Add event** on the calendar itself)

Choose a category (parent-teacher meeting, sports event, admission deadline, staff meeting and
so on), the dates, and optionally a time.

**Who is it for?**

| Choice | Who sees it |
| --- | --- |
| Everyone in the school | all staff, students and parents |
| Certain roles | only those roles, e.g. a staff meeting for teachers |
| Certain classes | students of those classes, their parents, and the teachers who teach them |

**Shown to people:** *Draft* keeps it visible to administrators only until you publish it.

**Send a notification to their phones** sends one short notice in the mobile app to the people
the event is for.

## What appears on the calendar by itself

You do not enter these again. They come from where you already manage them:

| On the calendar | Managed in |
| --- | --- |
| Exams | Exams (give the exam its start and end dates) |
| Assignment deadlines | the teacher's Assignments page |
| Fee deadlines | Fee Structures → installment plan |
| Notices | Notices (the "show from" date, or the day it was published) |
| Academic year start and end | Academic Years |

Change the date there and the calendar follows. Clicking such an item on the calendar takes you
to its page.

## The calendar pages

| Page | What it is for |
| --- | --- |
| **Calendar** | Today in both calendars; upcoming holidays, exams and events; month, week or list view. Click a day to see what is on and both its dates |
| **Events** | List, add, edit and delete events, one B.S. year at a time |
| **Holidays** | The same for holidays, plus the import |
| **Exam Schedule** | Exam dates for the year |
| **Academic Calendar** | The whole B.S. year on one page: holidays in red, a dot where something else is on |
| **Calendar Settings** | Weekly holidays and date defaults |

Holidays and weekly holidays are red everywhere. Use the **B.S. / A.D.** switch above the
calendar to see the same month in the other calendar.

## Printing

Every calendar page has a print button. All printouts are A4 with the school's name and logo.

| Printout | Where |
| --- | --- |
| Monthly calendar (landscape) | Calendar → **Print month** |
| Academic calendar for the year | Academic Calendar → **Print year** |
| List of holidays | Holidays → **Print list** |
| Examination calendar | Exam Schedule → **Print** |
| List of events | Events → **Print list** |

A printout contains what the person printing is allowed to see.

## Attendance and holidays

With **No attendance on holidays** on (the default):

- a teacher cannot save the register on a weekly holiday or on a holiday that applies to the
  class; the page says which holiday it is;
- weekly holidays cannot be picked in the attendance date field.

Attendance already saved is never changed, whatever you add to the calendar later.

If your school holds a class on a holiday, either switch the rule off in Calendar Settings, or
edit that holiday and switch off **The school observes this holiday**.

## Who can do what

| | Administrator | Teacher | Exam officer, accountant | Student, parent |
| --- | --- | --- | --- | --- |
| See the calendar | everything | events for everyone, for teachers, and for classes they teach | events for everyone and for their role | events for everyone, for their role, and for their class (parents: their children's) |
| Add events | any | for the class sections they teach | no | no |
| Add or import holidays | yes | no | no | no |
| Change settings | yes | no | no | no |

Teachers find their own events under **Calendar → My Class Events**. They cannot add holidays or
school-wide events, and can change only what they added.

## Each year

1. When the government publishes next year's holidays, import them (step 2). If the built-in
   list for that year is not there yet, paste the list.
2. Add the dated-later holidays as they are announced.
3. Add the school's own holidays and events for the year.
4. Print the academic calendar.

## Known limits

- **Reminders:** a notification is sent when you publish an event and tick the box. The system
  cannot send a reminder a day before by itself.
- **Exam papers:** the calendar shows a paper's date where one is recorded, but there is no
  screen yet to enter per-subject exam dates.
- **Your personal date choice** is remembered on the browser, not on your account.
- **The mobile app** does not show the school calendar yet.
- **Receipts and attendance registers** print a B.S. date made by an older part of the system,
  which can be one day off in some months (see the implementation audit, section 6). The dates
  the calendar and the date fields show are correct.
