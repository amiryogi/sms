import { designStyle, esc, remarkForGrade } from "@/features/report-cards/html/common";
import { reportCardHtml } from "@/features/report-cards/html/document";
import { makeReportCard, subject } from "../fixtures/reportCard";

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("escaping", () => {
  it("escapes every value from the API", () => {
    expect(esc(`<img src=x onerror="alert(1)">&'`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
    const card = makeReportCard({
      school: { ...makeReportCard().school, name: "<script>alert(1)</script>" },
      remarks: { teacher: "<b>bold</b>", principal: null },
    });
    const html = reportCardHtml(card, { logoSrc: null });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });
});

describe("NEB grade sheet", () => {
  it("prints a TH row for every subject and an IN row only where there is a practical", () => {
    const html = reportCardHtml(makeReportCard(), { logoSrc: null });
    expect(html).toContain("Science (TH)");
    expect(html).toContain("Science (IN)");
    expect(html).toContain("Nepali (TH)");
    expect(html).not.toContain("Nepali (IN)");
    expect(html).toContain('rowspan="2"');
  });

  it("shows grades and GPA as the API sent them, with remarks from the card's own scale", () => {
    const html = reportCardHtml(makeReportCard(), { logoSrc: null });
    expect(html).toContain("GRADE POINT AVERAGE (GPA): 3.60");
    expect(html).toContain("EXCELLENT");
    expect(html).toContain("61 / 70");
    expect(html).toContain("Keep it up");
    expect(html).toContain("8.00"); // credit hours 3 + 1 + 4 + 0
  });

  it("prints AB for an absent subject", () => {
    const card = makeReportCard({ subjects: [subject({ isAbsent: true, finalGrade: "AB" })] });
    const html = reportCardHtml(card, { logoSrc: null });
    expect(html).toContain("ABSENT");
    expect(count(html, ">AB<")).toBeGreaterThanOrEqual(3);
  });

  it("follows the school's layout: title, signatures, footer, hidden sections", () => {
    const card = makeReportCard(
      {},
      {
        title: "PROGRESS REPORT",
        signatures: ["Teacher", "Head"],
        footerText: "Collect from the office",
        showAttendance: false,
        showSummaryGrid: false,
        showTeacherRemarks: false,
        showGradeLegend: true,
      },
    );
    const html = reportCardHtml(card, { logoSrc: null });
    expect(html).toContain("PROGRESS REPORT");
    expect(html).toContain(">Teacher<");
    expect(html).toContain(">Head<");
    expect(html).not.toContain("EXAM CO-ORDINATOR");
    expect(html).toContain("Collect from the office");
    expect(html).not.toContain('class="attendance-section"');
    expect(html).not.toContain('class="summary-section"');
    expect(html).not.toContain("Keep it up");
    expect(html).toContain('class="rc-grade-legend"');
  });

  it("prints the logo only when there is one", () => {
    expect(reportCardHtml(makeReportCard(), { logoSrc: null })).not.toContain('class="school-logo"');
    expect(reportCardHtml(makeReportCard(), { logoSrc: "data:image/png;base64,AAA" })).toContain('src="data:image/png;base64,AAA"');
  });

  it("includes the web's stylesheet and A4 page rules", () => {
    const html = reportCardHtml(makeReportCard(), { logoSrc: null });
    expect(html).toContain(".report-card-a4");
    expect(html).toContain("size: A4");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
});

describe("Performance Report", () => {
  const perf = (layout = {}) =>
    reportCardHtml(
      makeReportCard(
        {},
        {
          template: "performanceReport",
          title: "Performance Report",
          showCreditHours: false,
          remarkColumn: "blank",
          minTableRows: 10,
          signatures: ["Class Teacher", "Principal"],
          showSeal: true,
          classNameStyle: "wordAndNumeral",
          ...layout,
        },
      ),
      { logoSrc: null },
    );

  it("uses its own template and stylesheet", () => {
    const html = perf();
    expect(html).toContain('class="perf-sheet"');
    expect(html).not.toContain('class="report-card-a4"');
    expect(html).toContain("Five (5)");
    expect(html).toContain("[STU20240001]");
    expect(html).toContain('class="perf-seal"');
    expect(html).toContain("2083/07/27");
  });

  it("splits theory and practical when a subject has a practical (auto)", () => {
    expect(perf()).toContain("<th>THEORY</th><th>PRACTICAL</th>");
    const noPractical = reportCardHtml(
      makeReportCard({ subjects: [subject({ hasPractical: false })] }, { template: "performanceReport", theoryPracticalSplit: "auto" }),
      { logoSrc: null },
    );
    expect(noPractical).not.toContain("<th>THEORY</th>");
  });

  it("shows marks columns only in marks or both mode", () => {
    expect(perf()).not.toContain("FULL<br />MARKS");
    expect(perf({ mode: "both" })).toContain("FULL<br />MARKS");
  });

  it("fills short tables up to the minimum rows", () => {
    expect(perf()).toContain('class="perf-filler"');
    expect(perf({ minTableRows: 0 })).not.toContain('class="perf-filler"');
  });
});

describe("helpers", () => {
  it("maps a design to CSS variables and ignores invalid values", () => {
    const style = designStyle({
      marginTop: 12,
      schoolNameSize: 20,
      titleAlign: "left",
      fontFamily: "times",
      logoPosition: "right",
      bogus: 1,
      marksAlign: "diagonal",
    });
    expect(style).toContain("--rc-margin-top: 12mm");
    expect(style).toContain("--rc-school-name-size: 20pt");
    expect(style).toContain("--rc-title-align: left");
    expect(style).toContain('"Times New Roman"');
    expect(style).toContain("--rc-header-direction: row-reverse");
    expect(style).not.toContain("diagonal");
    expect(designStyle(null)).toBe("");
  });

  it("words a grade from the given scale", () => {
    expect(remarkForGrade("A+")).toBe("OUTSTANDING");
    expect(remarkForGrade("AB")).toBe("ABSENT");
    expect(remarkForGrade("E", [{ grade: "E", min: 20, max: 30, gpa: 0.8, description: "Insufficient" }])).toBe("INSUFFICIENT");
    expect(remarkForGrade("Z")).toBe("");
  });
});
