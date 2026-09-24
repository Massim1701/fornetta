# Fornetta

Multi-Agent Chat System: mehrere KI-Agenten (Anthropic, Google, ...) und ein menschlicher Nutzer arbeiten in einem gemeinsamen, projektbezogenen Chat-Thread zusammen. Kein Orchestrator – alle Teilnehmer sehen den vollständigen Thread.

## Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres + Realtime + Auth)
- Tailwind CSS

## Setup

```bash
npm install
```

Lege eine `.env.local` an (siehe `.env.local` lokal, nicht im Repo):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Im Supabase-Dashboard unter **Authentication → Providers → Anonymous Sign-ins** aktivieren (die App meldet Besucher beim Laden automatisch anonym an, damit die `authenticated`-RLS-Policies greifen).

```bash
npm run dev
```

## Datenmodell

- `projects` – Chat-Projekte
- `agents` – KI-Agenten je Projekt (Name, Rolle, Provider)
- `messages` – Nachrichten je Projekt (Nutzer oder Agent), Realtime aktiviert

## Umfang v1

Nur Datenmodell, Realtime-Chat-UI und CRUD für Projekte/Agenten. Keine Agenten-Logik/Orchestrierung.

## Google-Agent (Gemini)

`supabase/functions/agent-google` beantwortet neue Nachrichten automatisch als der `google`-Provider-Agent
eines Projekts. Ein DB-Trigger (`supabase/migrations/..._agent_google_webhook.sql`) ruft die Function bei
jedem Insert in `messages` per `pg_net` auf; ohne konfigurierten Key antwortet sie einfach nicht (No-Op).

Secret setzen (einmalig, nicht ins Repo):

```bash
supabase secrets set GEMINI_API_KEY=... --project-ref qzsvopcszoenbtloicgj
```

Key erzeugen unter https://aistudio.google.com/apikey (Format `AIzaSy...`).
