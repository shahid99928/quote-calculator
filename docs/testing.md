# Testning

## Översikt

| Nivå | Verktyg | Mapp | Vad som testas |
|------|---------|------|----------------|
| Unit | Vitest | `src/**/*.test.js`, `tests/unit/`, `supabase/functions/**/*.test.ts` | Validering, prisformler, URL:er, felmeddelanden |
| Integration | Vitest + fetch | `tests/integration/` | Edge functions mot riktig Postgres |
| E2E | Playwright | `tests/e2e/` | Formulärflöden i browser (mockad API) |

Kör allt:

```bash
npm test
```

## Unit-tester

```bash
npm run test:unit
```

### Viktiga suites

| Fil | Innehåll |
|-----|----------|
| `tests/unit/allServicesOffer.test.js` | Förväntade priser per tjänst (fixtures) |
| `tests/fixtures/bostadsPriserCatalog.js` | Prisdata för tester |
| `tests/unit/housingLaborCost.test.js` | Bostadsarbetskostnad |
| `tests/unit/stairLaborCost.test.js` | Trapp |
| `src/formValidation.test.js` | Formvalidering |
| `src/offerSubmitErrors.test.js` | Kundfel (captcha, rate limit) |
| `src/bookingPath.test.js` | `/boka/{token}` |
| `supabase/functions/calculate-offer/*.test.ts` | Regler, booking URL, delivery |

Kör en fil:

```bash
npx vitest run tests/unit/allServicesOffer.test.js
```

## Integrationstester

Kräver Supabase med DB och deployade (eller served) functions.

### Lokalt (rekommenderat)

```bash
npm run test:integration:local
```

Detta:

1. `supabase start`
2. `supabase db reset`
3. Sätter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_FUNCTIONS_URL`
4. `DISABLE_OFFER_RATE_LIMIT=1`
5. `RUN_DB_TESTS=1`
6. Kör `tests/integration/`

### Mot remote dev/prod

```bash
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_FUNCTIONS_URL=.../functions/v1
export RUN_DB_TESTS=1
export DISABLE_OFFER_RATE_LIMIT=1   # rekommenderat för upprepade anrop
npm run test:integration
```

### Filer

| Fil | Fokus |
|-----|-------|
| `tests/integration/calculate-offer.test.js` | Flyttstäd, consent, publikt quote-svar |
| `tests/integration/calculate-offer-all-services.test.js` | Alla tjänstetyper |
| (ev. fler) | Se `tests/integration/` |

Utan `RUN_DB_TESTS=1` hoppas integrationssuiter över (`describe.skip`).

**OBS:** Integration skickar oftast **ingen** Turnstile-token – fungerar när `TURNSTILE_SECRET_KEY` saknas lokalt eller rate limit är avstängd.

## E2E (Playwright)

```bash
npm run test:e2e
```

- Mockar `**/functions/v1/calculate-offer` – testar **inte** riktig backend
- Verifierar att formulärfält och submit-UX fungerar per tjänst

Konfiguration: `playwright.config` (om finns) eller standard Playwright-setup.

## Manuell testning i produktion

### Lyckad offert

1. Fyll formulär, captcha **Klart!**, en submit  
2. Tack + bokningsnummer  
3. Supabase: rad i `offert_förfrågan` + `kund_offert`

### Rate limit (10/timme)

1. Tio **lyckade** submits (samma e-post eller IP)  
2. Elfte med ny captcha → gränstext (429)  
3. SQL:

```sql
SELECT count(*) FROM offer_rate_limit_events
WHERE email_normalized = 'test@example.com'
  AND created_at > now() - interval '1 hour';
```

### Captcha

- Efter deploy av invoke-fix: ingen `timeout-or-duplicate` vid enkel submit  
- Loggar: Supabase → `calculate-offer` → Errors

### Bokning

1. Öppna länk från mail `/boka/{token}`  
2. Verifiera e-post, boka datum  
3. Parallell dubbel-submit ska inte ge dubbel bekräftelse

## CI-förslag (om ni inför pipeline)

```yaml
- run: npm run test:unit
# integration: separat job med supabase/service container
```

## När ska vilken test köras?

| Ändring i | Kör minst |
|-----------|-----------|
| `src/` validering/UI | `test:unit` + ev. `test:e2e` |
| Prislogik / `calculate-offer` | `test:unit` + `test:integration:local` |
| Migration prisdata | integration + manuell spot-check |
| `booking-offer` | unit i mappen + manuell bokning |
| Endast copy/CSS | `test:e2e` valfritt |

Se [runbook-troubleshooting.md](runbook-troubleshooting.md) vid fel i prod.
