# KlaraStäd – offertkalkylator och bokning

Webbapp för **prisuppskattning** (offertförfrågan) och **bokning** utifrån skickad offert. Frontend är React (Vite), backend är Supabase (Postgres + Edge Functions). Drift: Vercel + Supabase Cloud.

## Vad systemet gör

1. **Offertformulär** – kund fyller i tjänst, boende, kvm, kontaktuppgifter → `calculate-offer` beräknar pris eller flaggar manuell offert → sparar rader och kan skicka e-post/SMS med bokningslänk.
2. **Bokning** – kund öppnar `/boka/{token}`, verifierar e-post → väljer datum → `booking-offer` sparar bokning och skickar bekräftelse.

## Tech stack

| Del | Teknik |
|-----|--------|
| Frontend | React 18, Vite 5 |
| Backend | Supabase Edge Functions (Deno) |
| Databas | PostgreSQL (migrationer i `supabase/migrations/`) |
| Captcha | Cloudflare Turnstile |
| E-post / SMS | Resend, Twilio |
| Tester | Vitest (unit/integration), Playwright (e2e) |
| Hosting | Vercel (app), Supabase (API + DB) |

## Snabbstart (lokal utveckling)

```bash
npm install
cp .env.example .env   # fyll i VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY
npm run dev
```

Öppna URL som Vite visar (vanligt `http://localhost:5173`). För integrationstester mot lokal Supabase, se [docs/local-development.md](docs/local-development.md).

## NPM-skript

| Kommando | Syfte |
|----------|--------|
| `npm run dev` | Utvecklingsserver |
| `npm run build` | Produktionsbuild |
| `npm run test:unit` | Enhetstester (frontend + delar av edge-logik) |
| `npm run test:integration` | Integration mot konfigurerad Supabase |
| `npm run test:integration:local` | Startar lokal Supabase, reset DB, kör integration |
| `npm run test:e2e` | Playwright (mockar `calculate-offer`) |

## Projektstruktur

```
src/                    React-app (formulär, bokning, validering)
supabase/
  functions/
    calculate-offer/    Offertberäkning, captcha, rate limit, leverans
    booking-offer/      Hämta offert + skapa bokning via token
  migrations/           SQL-schema och prisdata
tests/
  unit/                 Pris- och regeltester
  integration/          Edge functions mot DB
  e2e/                  Playwright
docs/                   Dokumentation (se nedan)
```

## Dokumentation

| Dokument | Innehåll |
|----------|----------|
| [docs/architecture.md](docs/architecture.md) | Systemöversikt och flöden |
| [docs/local-development.md](docs/local-development.md) | Lokal setup och vanliga problem |
| [docs/deployment.md](docs/deployment.md) | Deploy Vercel + Supabase |
| [docs/environment-and-secrets.md](docs/environment-and-secrets.md) | Miljövariabler och secrets |
| [docs/domain-glossary.md](docs/domain-glossary.md) | Svenska domäntermer och tabeller |
| [docs/pricing-and-business-rules.md](docs/pricing-and-business-rules.md) | Prislogik och manuell offert |
| [docs/edge-functions.md](docs/edge-functions.md) | API för Edge Functions |
| [docs/testing.md](docs/testing.md) | Teststrategi och kommandon |
| [docs/runbook-troubleshooting.md](docs/runbook-troubleshooting.md) | Drift och felsökning |
| [docs/security.md](docs/security.md) | Säkerhetsåtgärder (Turnstile, RLS, tokens, rate limit) |
| [docs/demo.md](docs/demo.md) | Setup + kunddemo (formulär, bokning, manus) |

Konfigurationsmall: [.env.example](.env.example).

## Produktion (referens)

Uppdatera vid behov om URL:er ändras:

- **App:** t.ex. `https://quote-calculator-teal.vercel.app`
- **Supabase:** projekt i Dashboard (Edge Functions `calculate-offer`, `booking-offer`)

Vid ändringar: deploy enligt [docs/deployment.md](docs/deployment.md).
