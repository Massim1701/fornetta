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
