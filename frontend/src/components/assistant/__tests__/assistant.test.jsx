/**
 * The help assistant's browser pieces that need no server: the stream parser (including
 * Nepali text split across network chunks), the per-person settings, the widget's text,
 * and the safe Markdown renderer.
 *   npm test
 */
import { describe, test, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createSseParser } from "../../../api/assistantStream";
import { getAssistantPrefs, setAssistantLanguage, setAssistantSession, getAssistantSession, clearAssistantSession } from "../../../lib/assistantPrefs";
import { stringsFor, errorText } from "../strings";
import AssistantMarkdown from "../AssistantMarkdown";

const encode = (s) => new TextEncoder().encode(s);

describe("SSE parser", () => {
  test("parses events and ignores comments", () => {
    const events = [];
    const p = createSseParser((e) => events.push(e));
    p.push(encode(`: ${" ".repeat(20)}\n\nevent: meta\ndata: {"conversationId":7}\n\n: ping\n\nevent: delta\ndata: {"text":"Hi"}\n\n`));
    p.end();
    expect(events).toEqual([
      { event: "meta", data: { conversationId: 7 } },
      { event: "delta", data: { text: "Hi" } },
    ]);
  });

  test("keeps a Nepali character whose bytes are split across chunks", () => {
    const events = [];
    const p = createSseParser((e) => events.push(e));
    const bytes = encode(`event: delta\ndata: ${JSON.stringify({ text: "हाजिरी लिनुहोस्" })}\n\n`);
    // Cut inside the 3-byte UTF-8 sequence of "ह" and again later.
    const cutA = bytes.indexOf(0xe0) + 1;
    p.push(bytes.slice(0, cutA));
    p.push(bytes.slice(cutA, cutA + 7));
    p.push(bytes.slice(cutA + 7));
    p.end();
    expect(events).toEqual([{ event: "delta", data: { text: "हाजिरी लिनुहोस्" } }]);
  });

  test("handles events split between chunks, CRLF line ends and a missing final blank line", () => {
    const events = [];
    const p = createSseParser((e) => events.push(e));
    p.push(encode("event: delta\r\ndata: {\"te"));
    p.push(encode("xt\":\"a\"}\r\n\r\nevent: done\r\ndata: {\"messageId\":3}"));
    p.end();
    expect(events.map((e) => e.event)).toEqual(["delta", "done"]);
    expect(events[1].data.messageId).toBe(3);
  });

  test("skips blocks that are not JSON", () => {
    const events = [];
    const p = createSseParser((e) => events.push(e));
    p.push(encode("event: delta\ndata: not json\n\nevent: done\ndata: {}\n\n"));
    expect(events).toEqual([{ event: "done", data: {} }]);
  });
});

describe("assistant settings on this browser", () => {
  test("language choice is remembered and only valid values are kept", () => {
    setAssistantLanguage("ne");
    expect(getAssistantPrefs().language).toBe("ne");
    setAssistantLanguage("fr");
    expect(getAssistantPrefs().language).toBe("ne");
    setAssistantLanguage("auto");
    expect(getAssistantPrefs().language).toBe("auto");
  });

  test("the open conversation is kept for the tab", () => {
    setAssistantSession({ conversationId: 12, open: true });
    expect(getAssistantSession()).toMatchObject({ conversationId: 12, open: true });
    clearAssistantSession();
    expect(getAssistantSession()).toEqual({});
  });
});

describe("widget text", () => {
  test("English and Nepali have the same keys", () => {
    const keys = (o) => Object.keys(o).sort();
    const en = stringsFor("en");
    const ne = stringsFor("ne");
    expect(keys(ne)).toEqual(keys(en));
    expect(keys(ne.errors)).toEqual(keys(en.errors));
    expect(keys(ne.unavailable)).toEqual(keys(en.unavailable));
    expect(ne.greeting).toMatch(/[ऀ-ॿ]/);
    expect(stringsFor("auto")).toBe(en);
  });

  test("error text falls back to the server's message, then a general one", () => {
    const t = stringsFor("ne");
    expect(errorText(t, "rate_limited")).toMatch(/व्यस्त/);
    expect(errorText(t, "SOMETHING_NEW", "Server says")).toBe("Server says");
    expect(errorText(t, undefined)).toBe(t.errors.unknown);
  });
});

describe("answer rendering", () => {
  const render = (text, allowed = ["/teacher/attendance"]) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <AssistantMarkdown text={text} allowedPaths={new Set(allowed)} onNavigate={() => {}} />
      </MemoryRouter>
    );

  test("renders steps, bold labels and Nepali text", () => {
    const html = render("हाजिरी लिन:\n\n1. **Attendance** खोल्नुहोस्\n2. **Save Attendance** थिच्नुहोस्");
    expect(html).toContain("<ol");
    expect(html).toContain("<strong");
    expect(html).toContain("Save Attendance");
    expect(html).toContain("हाजिरी लिन");
  });

  test("links only to pages the user may open; external links become text", () => {
    const html = render("Open [Attendance](/teacher/attendance), not [Exams](/admin/exams) or [this](https://evil.example) or `/teacher/attendance`.");
    expect(html.match(/href="\/teacher\/attendance"/g)).toHaveLength(2);
    expect(html).not.toContain("/admin/exams\"");
    expect(html).not.toContain("evil.example\"");
    expect(html).toContain("Exams");
  });

  test("drops raw HTML, scripts and images", () => {
    const html = render('Hi <script>alert(1)</script><img src=x onerror=alert(1)> ![x](https://evil.example/x.png) [js](javascript:alert(1))');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
  });
});
