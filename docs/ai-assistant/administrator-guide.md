# The help assistant: a guide for school administrators

## What it is

A help button at the bottom-right of every page after signing in. Anyone the school allows can
ask how to do something, in English or Nepali, and get step-by-step instructions for the pages
their role can use. Under many answers there is a **Start walkthrough** button that highlights
the real buttons on the screen one at a time.

It only explains. It cannot see students, marks, attendance or fees, and it cannot change
anything. If someone asks it to "mark everyone present", it explains how they can do it
themselves.

## Settings: Settings → AI Assistant

### Assistant tab
- **Help assistant is on:** switch off to hide the help button for everyone in the school.
- **Roles:** untick a role to hide the assistant from it.
- **Default answer language:** Auto answers in the language of the question. People can still
  choose Auto, English or नेपाली themselves in the help panel.
- **Keep conversations for (days):** older conversations are deleted automatically.
- **Questions per person per day** and **Tokens per month for the school:** limits that keep
  costs predictable. A question uses about 2,000 to 4,000 tokens.

### AI provider tab
- **Provider and Model:** which AI service writes the answers. Only services whose key is
  installed on the server can be chosen. **Test connection** checks it in a few seconds.
- **Fallback:** a second service used only when the first is busy or unreachable. Turning it on
  is recommended with free services, which are sometimes busy.
- **Timeout**, **Longest answer**, **Temperature:** the defaults suit most schools.
- **API keys on this server:** shows only whether each key is installed. Keys are added by the
  person who maintains the server, never on this page.

### Usage tab
- Questions, tokens, estimated cost (free services are shown as $0), questions per day, answer
  speed and errors per service, questions by role and language.
- **Comments from users:** what people wrote with a thumbs up or down. Names are not shown; people
  are told admins will see their comment.

## Good practice
- Read the comments now and then. A thumbs down usually means a help page needs a clearer step:
  tell the system's maintainer which page.
- On a free service, tell staff not to type students' personal details into questions. The
  assistant also masks phone numbers and email addresses before sending.
- If people report "The assistant is busy", turn on the fallback.

## What the assistant will say it cannot do
It answers that a feature does not exist for: timetable, CAS or formative assessment, a teacher's
student-progress view, an administrator attendance report, registering another school, library,
transport, hostel, payroll, certificates, SMS or email, and grades 11–12.
