# AI help assistant

A help assistant inside the web app. It explains, in English or Nepali, how to use the pages
each role can open, and walks people through tasks by highlighting the real controls. It is
read-only: it never sees school records and cannot change anything.

| Read this | For |
|---|---|
| [implementation-audit.md](implementation-audit.md) | What the app had before, and where the code differs from the original specification |
| [architecture.md](architecture.md) | How the pieces fit together, request by request |
| [provider-integration.md](provider-integration.md) | The AI providers, models, fallback, and how to add a provider |
| [language-support.md](language-support.md) | English, Nepali, mixed and romanized questions |
| [knowledge-base-guide.md](knowledge-base-guide.md) | Writing and changing the help documents |
| [role-permission-matrix.md](role-permission-matrix.md) | Which role gets which help, walkthroughs and settings |
| [guided-tour-development.md](guided-tour-development.md) | Adding or changing a walkthrough |
| [security-and-privacy.md](security-and-privacy.md) | What leaves the server, isolation, injection, keys |
| [api-reference.md](api-reference.md) | The `/api/v1/assistant` endpoints |
| [deployment-guide.md](deployment-guide.md) | Keys, migration, settings, streaming behind cPanel |
| [administrator-guide.md](administrator-guide.md) | For school administrators: the AI Assistant settings page |
| [testing-guide.md](testing-guide.md) | Unit, integration, browser and live provider tests |
