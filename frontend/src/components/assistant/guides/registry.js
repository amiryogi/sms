/**
 * Guided walkthroughs. The only things a walkthrough can point at are the `data-guide`
 * attributes on the app's own controls, listed here; nothing comes from the server or the AI.
 * The runner (GuideRunner.jsx) only highlights and navigates: it never clicks, types or
 * submits anything.
 *
 * Step fields:
 *   target  "nav:/path" (a sidebar link; on a phone, the menu button first), or a data-guide id
 *           on a page, or omitted for a step that only explains.
 *   route   the page the target is on ("{portal}" = student or parent, from the user's role).
 *   title / body / missing   { en, ne }. `missing` is shown when the target is not on the page
 *           yet (for example before a class is chosen).
 * Guide ids and roles must match backend/src/data/assistant/guides.json (a test checks).
 * Text is shown as HTML by driver.js, so it is plain static text only.
 */

export const TARGET_PATTERN = /^(nav:(menu|\/[a-z0-9/{}-]*)|[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)+)$/;

const nav = (path, en, ne) => ({
  target: `nav:${path}`,
  title: { en: `Open ${en}`, ne: `${en} खोल्नुहोस्` },
  body: { en: `In the menu on the left, click ${en}.`, ne: `बायाँको मेनुमा ${en} थिच्नुहोस्।${ne ? ` (${ne})` : ""}` },
});

export const GUIDES = {
  "teacher.attendance": {
    roles: ["TEACHER"],
    title: { en: "Take the attendance register", ne: "हाजिरी लिने" },
    steps: [
      nav("/teacher/attendance", "Attendance", "हाजिरी"),
      {
        route: "/teacher/attendance",
        target: "attendance.class",
        title: { en: "Choose the class", ne: "कक्षा छान्नुहोस्" },
        body: { en: "Pick one of your classes under Class and section. Only sections you are assigned to are listed.", ne: "Class and section मा आफ्नो कक्षा छान्नुहोस्। तपाईंलाई तोकिएका कक्षा मात्र देखिन्छन्।" },
      },
      {
        route: "/teacher/attendance",
        target: "attendance.date",
        title: { en: "Check the date", ne: "मिति जाँच्नुहोस्" },
        body: { en: "Today is chosen for you. Weekly holidays and school holidays cannot be used.", ne: "आजको मिति आफैं छानिएको हुन्छ। साप्ताहिक बिदा र विद्यालयको बिदामा हाजिरी लिन मिल्दैन।" },
      },
      {
        route: "/teacher/attendance",
        target: "attendance.allPresent",
        title: { en: "Mark the students", ne: "विद्यार्थीको हाजिरी जनाउनुहोस्" },
        body: { en: "Mark each student P (Present), A (Absent), L (Late) or E (Excused). All present marks everyone present; then change the few who are not.", ne: "प्रत्येक विद्यार्थीलाई P (Present), A (Absent), L (Late) वा E (Excused) जनाउनुहोस्। All present ले सबैलाई उपस्थित बनाउँछ, त्यसपछि अनुपस्थितलाई मात्र बदल्नुहोस्।" },
        missing: { en: "Choose a class first: the student list appears once a class is chosen.", ne: "पहिले कक्षा छान्नुहोस्: कक्षा छानेपछि विद्यार्थीको सूची देखिन्छ।" },
      },
      {
        route: "/teacher/attendance",
        target: "attendance.save",
        title: { en: "Save", ne: "सेभ गर्नुहोस्" },
        body: { en: "Click Save attendance. The day then shows as Taken. You can open the same day again to correct it.", ne: "Save attendance थिच्नुहोस्। त्यसपछि त्यो दिन Taken देखिन्छ। सच्याउन सोही दिन फेरि खोल्न सकिन्छ।" },
        missing: { en: "Save attendance appears below the student list once a class is chosen.", ne: "कक्षा छानेपछि विद्यार्थी सूचीको तल Save attendance देखिन्छ।" },
      },
    ],
  },

  "teacher.assignment": {
    roles: ["TEACHER"],
    title: { en: "Set an assignment", ne: "गृहकार्य दिने" },
    steps: [
      nav("/teacher/assignments", "Assignments", "गृहकार्य"),
      {
        route: "/teacher/assignments",
        target: "assignments.create",
        title: { en: "Create the assignment", ne: "गृहकार्य बनाउनुहोस्" },
        body: { en: "Click Create assignment, choose the Class and subject, then fill in Title, Instructions, Due date and Total marks. Files are optional.", ne: "Create assignment थिच्नुहोस्, Class and subject छान्नुहोस्, अनि Title, Instructions, Due date र Total marks भर्नुहोस्। फाइल राख्नु ऐच्छिक हो।" },
      },
      {
        title: { en: "Published straight away", ne: "तुरुन्तै प्रकाशित" },
        body: { en: "When you click Create assignment in the form, students of that section see it at once. Their work appears under the assignment's Submissions, where you grade it.", ne: "फारममा Create assignment थिचेपछि सो सेक्सनका विद्यार्थीले तुरुन्तै देख्छन्। बुझाइएका काम Submissions मा आउँछन्, त्यहीँ अंक दिनुहोस्।" },
      },
    ],
  },

  "marks.entry": {
    roles: ["TEACHER", "EXAM_OFFICER", "ADMIN"],
    title: { en: "Enter exam marks", ne: "परीक्षाको अंक हाल्ने" },
    steps: [
      nav("/teacher/marks", "Marks entry", "अंक प्रविष्टि"),
      {
        route: "/teacher/marks",
        target: "marks.exam",
        title: { en: "Choose the exam", ne: "परीक्षा छान्नुहोस्" },
        body: { en: "Only published exams are listed. Draft exams are not open yet; locked exams can no longer change.", ne: "प्रकाशित परीक्षा मात्र देखिन्छन्। Draft परीक्षा खुलेका हुँदैनन्; Locked परीक्षाका अंक बदल्न मिल्दैन।" },
      },
      {
        route: "/teacher/marks",
        target: "marks.subject",
        title: { en: "Choose class and subject", ne: "कक्षा र विषय छान्नुहोस्" },
        body: { en: "Pick the class, section and subject whose marks you are entering.", ne: "अंक हाल्ने कक्षा, सेक्सन र विषय छान्नुहोस्।" },
      },
      {
        route: "/teacher/marks",
        target: "marks.table",
        title: { en: "Type the marks", ne: "अंक टाइप गर्नुहोस्" },
        body: { en: "Type Theory and, where there is one, Practical marks. Enter or ↓ moves down a row. Mark Absent for students who missed the exam.", ne: "Theory र भए Practical अंक टाइप गर्नुहोस्। Enter वा ↓ ले तलको पङ्क्तिमा लैजान्छ। परीक्षा नदिनेलाई Absent जनाउनुहोस्।" },
        missing: { en: "The marks table appears after you choose the exam, class and subject.", ne: "परीक्षा, कक्षा र विषय छानेपछि अंकको तालिका देखिन्छ।" },
      },
      {
        route: "/teacher/marks",
        target: "marks.save",
        title: { en: "Save", ne: "सेभ गर्नुहोस्" },
        body: { en: "Click Save marks. Grades are worked out from the school's grade scale when report cards are generated.", ne: "Save marks थिच्नुहोस्। रिपोर्ट कार्ड बनाउँदा विद्यालयको ग्रेड स्केलबाट ग्रेड निकालिन्छ।" },
        missing: { en: "Save marks appears under the marks table.", ne: "Save marks अंकको तालिकाको तल देखिन्छ।" },
      },
    ],
  },

  "admin.academicYear": {
    roles: ["ADMIN"],
    title: { en: "Create an academic year", ne: "शैक्षिक वर्ष बनाउने" },
    steps: [
      nav("/admin/academic-years", "Academic years", "शैक्षिक वर्ष"),
      {
        route: "/admin/academic-years",
        target: "academicYears.add",
        title: { en: "Add the year", ne: "वर्ष थप्नुहोस्" },
        body: { en: "Click Add academic year, type the Year name, pick the Start date and End date, and tick Make this the current academic year when the school moves to it.", ne: "Add academic year थिच्नुहोस्, Year name लेख्नुहोस्, Start date र End date छान्नुहोस्, र विद्यालय नयाँ वर्षमा सर्दा Make this the current academic year मा टिक लगाउनुहोस्।" },
      },
      {
        title: { en: "Then for the new year", ne: "त्यसपछि नयाँ वर्षका लागि" },
        body: { en: "Set up Class subjects, Teacher assignment, Promotions and Fee structures for the new year: they are kept per year.", ne: "नयाँ वर्षका लागि Class subjects, Teacher assignment, Promotions र Fee structures मिलाउनुहोस्: यी वर्षअनुसार छुट्टै रहन्छन्।" },
      },
    ],
  },

  "admin.student": {
    roles: ["ADMIN"],
    title: { en: "Add a student", ne: "विद्यार्थी थप्ने" },
    steps: [
      nav("/admin/students", "Students", "विद्यार्थी"),
      {
        route: "/admin/students",
        target: "students.add",
        title: { en: "Add the student", ne: "विद्यार्थी थप्नुहोस्" },
        body: { en: "Click Add student and fill in the personal details, the class and section, and the sign-in. Leave the admission number empty to generate one. The password is shown once: copy it or print the login slip.", ne: "Add student थिचेर व्यक्तिगत विवरण, कक्षा र सेक्सन, र लगइन भर्नुहोस्। भर्ना नम्बर खाली छाडे आफैं बन्छ। पासवर्ड एकपटक मात्र देखिन्छ: कपी गर्नुहोस् वा लगइन स्लिप प्रिन्ट गर्नुहोस्।" },
      },
      {
        route: "/admin/students",
        target: "students.classLogins",
        title: { en: "Logins for a whole class", ne: "पूरै कक्षाका लगइन" },
        body: { en: "Class logins creates passwords for a whole class and prints the login slips.", ne: "Class logins ले पूरै कक्षाका पासवर्ड बनाएर लगइन स्लिप प्रिन्ट गर्छ।" },
      },
    ],
  },

  "admin.exam": {
    roles: ["ADMIN"],
    title: { en: "Create and publish an exam", ne: "परीक्षा बनाउने र प्रकाशित गर्ने" },
    steps: [
      nav("/admin/exams", "Exams", "परीक्षा"),
      {
        route: "/admin/exams",
        target: "exams.create",
        title: { en: "Create the exam", ne: "परीक्षा बनाउनुहोस्" },
        body: { en: "Click Create exam: give the Exam name, Type, Academic year, Starts and Ends dates, and tick the Classes sitting this exam. Each class's subjects and marks are copied in.", ne: "Create exam थिच्नुहोस्: Exam name, Type, Academic year, Starts र Ends मिति दिनुहोस्, र Classes sitting this exam मा कक्षा टिक लगाउनुहोस्। हरेक कक्षाका विषय र अंक आफैं थपिन्छन्।" },
      },
      {
        title: { en: "Draft, Published, Locked", ne: "Draft, Published, Locked" },
        body: { en: "On the exam's row: Publish opens marks entry for teachers. Lock freezes the marks before report cards. Unlock reopens marks entry. Subjects can only change while the exam is a Draft.", ne: "परीक्षाको पङ्क्तिमा: Publish ले शिक्षकलाई अंक हाल्न खोल्छ। Lock ले रिपोर्ट कार्ड अघि अंक स्थिर गर्छ। Unlock ले फेरि खोल्छ। विषय Draft अवस्थामा मात्र बदल्न मिल्छ।" },
      },
    ],
  },

  "admin.reportCards": {
    roles: ["ADMIN"],
    title: { en: "Generate, publish and print report cards", ne: "रिपोर्ट कार्ड बनाउने, प्रकाशित र प्रिन्ट गर्ने" },
    steps: [
      nav("/admin/report-cards", "Report cards", "रिपोर्ट कार्ड"),
      {
        route: "/admin/report-cards",
        target: "reportCards.filters",
        title: { en: "Choose exam, class and section", ne: "परीक्षा, कक्षा र सेक्सन छान्नुहोस्" },
        body: { en: "Only published or locked exams are listed. Locking the exam first is recommended.", ne: "प्रकाशित वा Locked परीक्षा मात्र देखिन्छन्। पहिले परीक्षा Lock गर्नु राम्रो हुन्छ।" },
      },
      {
        route: "/admin/report-cards",
        target: "reportCards.generate",
        title: { en: "Generate", ne: "बनाउनुहोस्" },
        body: { en: "Click Generate report cards. Check them with View on a student's row.", ne: "Generate report cards थिच्नुहोस्। विद्यार्थीको पङ्क्तिमा View थिचेर जाँच्नुहोस्।" },
        missing: { en: "The buttons appear after you choose an exam, class and section.", ne: "परीक्षा, कक्षा र सेक्सन छानेपछि बटनहरू देखिन्छन्।" },
      },
      {
        route: "/admin/report-cards",
        target: "reportCards.publish",
        title: { en: "Publish", ne: "प्रकाशित गर्नुहोस्" },
        body: { en: "Publish All lets students and parents see the report cards. Unpublish all hides them again.", ne: "Publish All ले विद्यार्थी र अभिभावकलाई रिपोर्ट कार्ड देखाउँछ। Unpublish all ले फेरि लुकाउँछ।" },
        missing: { en: "Publish All appears once every report card in the section is generated.", ne: "सेक्सनका सबै रिपोर्ट कार्ड बनेपछि Publish All देखिन्छ।" },
      },
      {
        route: "/admin/report-cards",
        target: "reportCards.printAll",
        title: { en: "Print the whole section", ne: "पूरै सेक्सन प्रिन्ट" },
        body: { en: "Print all opens every card, one A4 page each, for the browser's print dialog.", ne: "Print all ले हरेक कार्ड A4 पानामा एक-एक गरी प्रिन्टका लागि खोल्छ।" },
        missing: { en: "Print all appears once the report cards are generated.", ne: "रिपोर्ट कार्ड बनेपछि Print all देखिन्छ।" },
      },
    ],
  },

  "admin.notice": {
    roles: ["ADMIN"],
    title: { en: "Publish a notice", ne: "सूचना प्रकाशित गर्ने" },
    steps: [
      nav("/admin/notices", "Notices", "सूचना"),
      {
        route: "/admin/notices",
        target: "notices.new",
        title: { en: "Write the notice", ne: "सूचना लेख्नुहोस्" },
        body: { en: "Click New notice: Title, Message, Priority and the Audience (Everyone, Specific roles or Specific classes). It is saved as a draft.", ne: "New notice थिच्नुहोस्: Title, Message, Priority र Audience (Everyone, Specific roles वा Specific classes)। यो Draft का रूपमा सेभ हुन्छ।" },
      },
      {
        title: { en: "Publish it", ne: "प्रकाशित गर्नुहोस्" },
        body: { en: "Click Publish on the notice: its audience sees it straight away.", ne: "सूचनामा Publish थिच्नुहोस्: सम्बन्धित व्यक्तिले तुरुन्तै देख्छन्।" },
      },
    ],
  },

  "calendar.holidays": {
    roles: ["ADMIN"],
    title: { en: "Import public holidays", ne: "सार्वजनिक बिदा आयात गर्ने" },
    steps: [
      nav("/calendar/holidays", "Holidays", "बिदा"),
      {
        route: "/calendar/holidays",
        target: "holidays.import",
        title: { en: "Import holidays", ne: "Import holidays" },
        body: { en: "Choose the B.S. year and click Preview: nothing is saved yet. Tick the holidays the school keeps, then add them. Importing twice is safe.", ne: "B.S. वर्ष छानेर Preview थिच्नुहोस्: अहिले केही सेभ हुँदैन। विद्यालयले मान्ने बिदामा टिक लगाएर थप्नुहोस्। दुईपटक आयात गर्दा पनि समस्या हुँदैन।" },
      },
      {
        route: "/calendar/holidays",
        target: "holidays.add",
        title: { en: "The school's own holidays", ne: "विद्यालयका आफ्नै बिदा" },
        body: { en: "Add holiday is for winter vacation, foundation day and other school closures.", ne: "जाडो बिदा, स्थापना दिवस जस्ता विद्यालयका बिदाका लागि Add holiday प्रयोग गर्नुहोस्।" },
      },
    ],
  },

  "calendar.event": {
    roles: ["ADMIN", "TEACHER"],
    title: { en: "Add a calendar event", ne: "पात्रोमा कार्यक्रम थप्ने" },
    steps: [
      { ...nav("/calendar/events", "Events / My class events", "कार्यक्रम"), target: "nav:/calendar/events" },
      {
        route: "/calendar/events",
        target: "events.add",
        title: { en: "Add the event", ne: "कार्यक्रम थप्नुहोस्" },
        body: { en: "Click Add event: category, title, dates, and who it is for. Draft keeps it hidden until you publish it. Teachers can add events for their own classes only.", ne: "Add event थिच्नुहोस्: प्रकार, शीर्षक, मिति र कसका लागि हो छान्नुहोस्। Draft राखे प्रकाशित नगरेसम्म लुक्छ। शिक्षकले आफ्ना कक्षाका लागि मात्र थप्न सक्छन्।" },
      },
    ],
  },

  "finance.collect": {
    roles: ["ACCOUNTANT", "ADMIN"],
    title: { en: "Collect a fee payment", ne: "शुल्क संकलन गर्ने" },
    steps: [
      nav("/finance/collect", "Collect fees", "शुल्क संकलन"),
      {
        route: "/finance/collect",
        target: "collect.picker",
        title: { en: "Find the student", ne: "विद्यार्थी खोज्नुहोस्" },
        body: { en: "Type a name, admission number or roll number and choose the student. Their fees for this year appear.", ne: "नाम, भर्ना नम्बर वा रोल नम्बर टाइप गरेर विद्यार्थी छान्नुहोस्। यस वर्षको शुल्क देखिन्छ।" },
      },
      {
        route: "/finance/collect",
        target: "collect.record",
        title: { en: "Record the payment", ne: "भुक्तानी रेकर्ड गर्नुहोस्" },
        body: { en: "Click Record payment: amount, method (Cash, Bank transfer, Mobile wallet…), date, and a reference for non-cash payments. A payment can never be more than what is owed.", ne: "Record payment थिच्नुहोस्: रकम, तरिका (Cash, Bank transfer, Mobile wallet…), मिति, र नगदबाहेकमा reference। भुक्तानी बाँकीभन्दा बढी हुन सक्दैन।" },
        missing: { en: "Record payment appears after you choose a student.", ne: "विद्यार्थी छानेपछि Record payment देखिन्छ।" },
      },
      {
        route: "/finance/collect",
        target: "collect.receipts",
        title: { en: "Print the receipt", ne: "रसिद प्रिन्ट गर्नुहोस्" },
        body: { en: "The new receipt is listed under Recent receipts, ready to print. A wrong payment is undone by a reversal, never deleted.", ne: "नयाँ रसिद Recent receipts मा प्रिन्टका लागि देखिन्छ। गलत भुक्तानी मेटिँदैन, reversal ले सच्याइन्छ।" },
        missing: { en: "Recent receipts appear after you choose a student.", ne: "विद्यार्थी छानेपछि Recent receipts देखिन्छ।" },
      },
    ],
  },

  "finance.reports": {
    roles: ["ACCOUNTANT", "ADMIN"],
    title: { en: "Produce a financial report", ne: "आर्थिक प्रतिवेदन निकाल्ने" },
    steps: [
      nav("/finance/reports", "Reports", "प्रतिवेदन"),
      {
        route: "/finance/reports",
        target: "reports.export",
        title: { en: "Choose, filter, export", ne: "छान्नुहोस्, फिल्टर गर्नुहोस्, निकाल्नुहोस्" },
        body: { en: "Pick Collections, Outstanding, Discounts or Reversals at the top, set the filters, then Print or download a CSV.", ne: "माथिबाट Collections, Outstanding, Discounts वा Reversals छान्नुहोस्, फिल्टर मिलाउनुहोस्, अनि Print गर्नुहोस् वा CSV डाउनलोड गर्नुहोस्।" },
        missing: { en: "The Print and Download CSV buttons appear when the report has rows.", ne: "प्रतिवेदनमा विवरण भएपछि Print र CSV बटन देखिन्छन्।" },
      },
    ],
  },

  "portal.results": {
    roles: ["STUDENT", "PARENT"],
    title: { en: "See exam results", ne: "परीक्षाको नतिजा हेर्ने" },
    steps: [
      nav("/{portal}/results", "Results", "नतिजा"),
      {
        route: "/{portal}/results",
        target: "results.exam",
        title: { en: "Choose the exam", ne: "परीक्षा छान्नुहोस्" },
        body: { en: "You see the GPA, percentage, class rank and each subject's marks and grade. Results appear once the school publishes the report cards.", ne: "GPA, प्रतिशत, कक्षाको स्थान र हरेक विषयको अंक र ग्रेड देखिन्छ। विद्यालयले रिपोर्ट कार्ड प्रकाशित गरेपछि नतिजा आउँछ।" },
        missing: { en: "No published results yet: they appear once the school publishes the report cards.", ne: "अहिलेसम्म नतिजा प्रकाशित भएको छैन: विद्यालयले रिपोर्ट कार्ड प्रकाशित गरेपछि देखिन्छ।" },
      },
      nav("/{portal}/report-card", "Report card", "रिपोर्ट कार्ड"),
      {
        route: "/{portal}/report-card",
        target: "reportCard.print",
        title: { en: "Print or save", ne: "प्रिन्ट वा सेभ" },
        body: { en: "Choose the exam and click Print or save as PDF.", ne: "परीक्षा छानेर Print or save as PDF थिच्नुहोस्।" },
      },
    ],
  },

  "parent.fees": {
    roles: ["PARENT"],
    title: { en: "Check your child's fees", ne: "बच्चाको शुल्क हेर्ने" },
    steps: [
      nav("/parent/fees", "Fees", "शुल्क"),
      {
        route: "/parent/fees",
        target: "children.switcher",
        title: { en: "Choose the child", ne: "बच्चा छान्नुहोस्" },
        body: { en: "With more than one child at the school, pick the one you want to see.", ne: "विद्यालयमा एकभन्दा बढी बच्चा भए हेर्न चाहेको बच्चा छान्नुहोस्।" },
        missing: { en: "Only one child is linked to your account, so there is nothing to choose.", ne: "तपाईंको खातामा एउटै बच्चा जोडिएको छ, त्यसैले छान्नुपर्दैन।" },
      },
      {
        route: "/parent/fees",
        target: "fees.printBill",
        title: { en: "What is due", ne: "कति बाँकी छ" },
        body: { en: "Each fee and installment shows its due date and status. Print bill prints a bill; the statement lists everything.", ne: "हरेक शुल्क र किस्ताको बुझाउने मिति र अवस्था देखिन्छ। Print bill ले बिल प्रिन्ट गर्छ; statement मा सबै विवरण हुन्छ।" },
        missing: { en: "The school has not set up fees for this year yet.", ne: "विद्यालयले यस वर्षको शुल्क अझै मिलाएको छैन।" },
      },
      {
        route: "/parent/fees",
        target: "fees.receipts",
        title: { en: "Receipts", ne: "रसिद" },
        body: { en: "Every payment's receipt is listed here with a print button. Fees are paid at the school office.", ne: "हरेक भुक्तानीको रसिद यहाँ प्रिन्ट बटनसहित देखिन्छ। शुल्क विद्यालयको कार्यालयमा तिरिन्छ।" },
        missing: { en: "No payments yet.", ne: "अहिलेसम्म भुक्तानी छैन।" },
      },
    ],
  },
};

/** Fill "{portal}" for this user (students and parents have their own pages). */
export const resolvePath = (path, roles) => (path ? path.replace("{portal}", roles.includes("PARENT") && !roles.includes("STUDENT") ? "parent" : "student") : path);
