---
id: assistant-settings
title: AI assistant settings and usage
roles: [ADMIN, SUPER_ADMIN]
modules: [assistant]
routes: [/admin/assistant]
guides: []
status: published
aliases: [AI assistant, assistant settings, chatbot, help assistant, provider, model, Claude, Gemini, NVIDIA, OpenAI, fallback, test connection, language default, usage, cost, tokens, feedback, एआई, सहायक, च्याटबोट]
verifiedAgainst: [frontend/src/pages/admin/AssistantSettings.jsx, backend/src/controllers/assistant.controller.js, backend/src/utils/assistantConfig.js]
verifiedOn: 2026-11-16
---
# AI assistant settings

## Purpose
Control the help assistant: whether it is on, who may use it, which AI provider and model
answer, the default language, limits, and how much it is used.

## Who can use it
Administrators and super administrators.

## Where to find it
Left menu → **Settings** → **AI assistant** (`/admin/assistant`). Tabs: **Assistant**,
**AI provider**, **Usage**.

## Steps
**Assistant** tab
1. **Help assistant is on**: switch it off to hide the help button for everyone.
2. **Roles**: tick the roles that may use it.
3. **Default answer language**: Auto (the language of the question), English or नेपाली. Each
   person can still choose for themselves in the help panel.
4. **Keep conversations for (days)**: older conversations are deleted automatically.
5. **Questions per person per day** and **Tokens per month for the school** limit the cost.
6. Click **Save settings**.

**AI provider** tab
1. Choose the **Provider**. Only providers whose API key is installed on the server can be
   chosen; the others say "no API key on the server".
2. Choose the **Model**, or **Another model id…** to type one.
3. Click **Test connection**. It asks the provider for one word and shows the time it took.
4. Optionally switch on **Use a fallback provider** and choose its provider and model. The
   fallback answers only when the main provider fails before answering.
5. **Timeout (seconds)**, **Longest answer (tokens)** and **Temperature** tune the answers.
6. Click **Save settings**.

**Usage** tab
- Choose the **Period**. You see questions, tokens, an estimated cost, questions per day,
  provider health (last answer, last error), questions by role and language, errors, and the
  comments people sent with a thumbs up or down (without names).

## Good to know
- API keys are never typed into the app. The server's technical maintainer installs them, and
  the **API keys on this server** box only says whether each one is installed.
- The assistant only explains how to use the system. It cannot change any record, and it
  answers from the school's help documents, not from student records.
- On Google's free Gemini tier, prompts may be used to improve Google's products.

## Troubleshooting
- **"No API key is installed on the server for …"** when saving: choose a provider whose key
  is installed, or ask the maintainer to add the key.
- **Test connection fails with "key rejected"**: the key is wrong or expired.
- **"Provider busy (rate limit)" errors in Usage**: switch on the fallback provider.

## Related pages
School settings.
