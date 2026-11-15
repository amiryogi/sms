---
id: assistant-settings
title: AI Assistant settings and usage
roles: [ADMIN, SUPER_ADMIN]
modules: [assistant]
routes: [/admin/assistant]
guides: []
status: draft
aliases: [AI assistant, assistant settings, chatbot, provider, model, Claude, Gemini, OpenAI, language default, usage, cost, एआई, सहायक, च्याटबोट]
verifiedAgainst: [frontend/src/pages/admin/AssistantSettings.jsx, backend/src/controllers/assistant.controller.js]
verifiedOn: 2026-11-15
---
# AI Assistant settings

## Purpose
Control the help assistant: whether it is on, who may use it, which AI provider and model answer,
the default language, limits, and how much it is used.

## Who can use it
Administrators and super administrators.

## Where to find it
Left menu → **Settings** → **AI Assistant** (`/admin/assistant`).

## Steps
1. **Provider** tab: choose the provider (only providers whose key is installed on the server
   can be chosen) and the model; optionally turn on a fallback provider; click
   **Test connection**.
2. **Assistant** tab: switch the assistant on or off, choose which roles may use it, the default
   language (Auto, English, नेपाली), how long conversations are kept, and daily limits.
3. **Usage** tab: requests, tokens, estimated cost, errors and feedback.
4. Save.

## Good to know
- API keys are never typed into the app. The server's technical maintainer installs them.
- The assistant only explains how to use the system. It cannot change any record.
- Answers come from the school's help documents, not from student records.

## Related pages
School Settings.
