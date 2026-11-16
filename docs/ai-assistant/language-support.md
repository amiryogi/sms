# English and Nepali

## Who decides the language

| Setting | Where | Effect |
|---|---|---|
| The person's choice: Auto, English, नेपाली | The switch in the help panel; kept in the browser (`localStorage` `sms.assistant.prefs`) and sent with each question | English or Nepali always wins |
| School default: Auto, English or Nepali | AI Assistant → Assistant tab | Used for people who never chose |
| Detect the question's language | AI Assistant → Assistant tab | On Auto, the question decides; off, Auto means the school default (English if that is Auto too) |

No database column holds a personal language: the choice belongs to the browser, like the BS/AD
date choice.

## Detection (`services/assistant/languageResolver.js`)

| Question | Answer |
|---|---|
| Any real share of Devanagari (at least 10% of the letters): "विद्यार्थीको हाजिरी कसरी गर्ने?" | Nepali |
| Mixed: "CAS assessment कसरी enter गर्ने?" | Nepali |
| Nepali in Latin letters: "hajiri kasari garne?", "mero chora ko hajiri kasari herne" | Nepali (in Devanagari) |
| Everything else | English |

Romanized Nepali is recognized from a list of common words ("kasari", "garne", "herne",
"kaha"…). Words that also appear in English ("ma", "ko", "ra"…) never count on their own.

## How answers keep the app's labels

The Nepali instruction in the prompt says: natural, simple Nepali; menu names, page titles,
buttons and fields exactly as written in English, in bold (**Save Attendance**); a short Nepali
explanation may follow in brackets; numbers and paths unchanged.

## Finding the right help in Nepali

The help documents are written in English with Nepali words in their `aliases`, and search
expands Nepali and romanized words to English ones (`SYNONYMS` in `knowledge.js`: हाजिरी →
attendance, शुल्क → fee, नतिजा → result, bida → holiday…). Add a synonym there when a common
word does not find its document.

## Streaming Nepali safely

Devanagari letters take three bytes in UTF-8, and a network chunk can end in the middle of one.
`api/assistantStream.js` decodes with `TextDecoder("utf-8")` in streaming mode, so a split letter
waits for its remaining bytes. A vitest case cuts "ह" in the middle to prove it.

## The widget's own text

`components/assistant/strings.js` holds every label of the panel and the walkthroughs in both
languages (a test checks the two have the same keys). The widget shows Nepali when the person
chose Nepali, or when they never chose and the school default is Nepali.
