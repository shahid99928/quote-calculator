# Lokal utveckling

## Krav

- **Node.js** 18+ (för Vite och Vitest)
- **npm**
- **Supabase CLI** – för lokal DB och integrationstester ([install](https://supabase.com/docs/guides/cli))
- **Docker** – krävs av `supabase start` (lokal Postgres)

## Första gången

```bash
git clone <repo-url>
cd KlaraStäd
npm install
cp .env.example .env
```

Fyll minst i `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Valfritt för captcha lokalt:

```env
VITE_TURNSTILE_SITE_KEY=<cloudflare-site-key>
```

Starta frontend:

```bash
npm run dev
```

Appen anropar då **din konfigurerade Supabase** (ofta molnet). För helt lokal backend, se integration nedan.

## Lokal Supabase (integrationstester)

```bash
supabase start
supabase db reset    # kör alla migrationer + seed där det finns
```

Kör integrationstester (sätter env automatiskt och `DISABLE_OFFER_RATE_LIMIT=1`):

```bash
npm run test:integration:local
```

Manuellt med lokal stack:

```bash
supabase status -o env
# exportera SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_FUNCTIONS_URL
export DISABLE_OFFER_RATE_LIMIT=1
export RUN_DB_TESTS=1
npm run test:integration
```

Deploya functions till lokal instans efter kodändring:

```bash
supabase functions serve calculate-offer --no-verify-jwt
# eller
supabase functions deploy calculate-offer --project-ref <local>
```

## Turnstile lokalt

| Scenario | Beteende |
|----------|----------|
| `VITE_TURNSTILE_SITE_KEY` saknas | Ingen widget; klient kräver inte token |
| Site key satt, `TURNSTILE_SECRET_KEY` **saknas** i Supabase | Edge function **hoppar över** verifiering (endast dev) |
| Båda satta | Full verifiering – lägg till `localhost` i Turnstile hostnames |

## Edge Function secrets (lokal / remote)

Secrets sätts inte via `.env` för functions. Exempel mot linked project:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set BOOKING_PAGE_URL=http://localhost:5173
```

Lista: `supabase secrets list`

## Vanliga problem

### "Supabase är inte konfigurerat"

`VITE_SUPABASE_URL` eller `VITE_SUPABASE_ANON_KEY` saknas i `.env`. Starta om `npm run dev` efter ändring.

### Captcha-fel trots grön ruta

- Token är engångs – efter fel: vänta på ny captcha.
- Undvik dubbel submit (knappen är disabled under `Skickar…`).
- Se [runbook-troubleshooting.md](runbook-troubleshooting.md).

### Integrationstester hoppas över

`RUN_DB_TESTS` måste vara `1`. Använd `npm run test:integration:local` eller exportera variablerna från `supabase status`.

### CORS / 401 mot functions

Anropa med `apikey` + `Authorization: Bearer <anon key>` som i `tests/integration/calculate-offer.test.js`.

## Rekommenderat arbetsflöde

1. Ändra frontend → `npm run dev` + `npm run test:unit`
2. Ändra `calculate-offer` / `booking-offer` → deploy till dev-projekt eller lokal serve + integrationstest
3. Ny migration → `supabase migration new ...` → testa med `supabase db reset` lokalt → `supabase db push` i prod

Se även [testing.md](testing.md) och [deployment.md](deployment.md).
