# Runbook – felsökning

Snabbguide för drift i produktion. Loggar: **Supabase Dashboard → Edge Functions → Logs** (`calculate-offer`, `booking-offer`). Frontend: **Vercel** deploy-loggar.

---

## Captcha: "Vi kunde inte verifiera captcha…"

### Symptom

Kund ser captcha-fel; Turnstile kan visa **Klart!**

### `timeout-or-duplicate` i loggar

**Orsak:** Samma Turnstile-token verifierades två gånger (token är engångs).

**Vanliga källor:**

1. ~~Dubbel HTTP-request från frontend (invoke + fetch fallback)~~ – fixat: ingen retry med `turnstileToken`
2. Dubbelklick / två flikar
3. Submit med gammal token efter tidigare fel utan ny captcha

**Åtgärd:**

- Deploya senaste frontend (Vercel)
- Instruera: hård refresh → ny captcha → **ett** klick
- Kontrollera att ingen annan klient återanvänder samma token

### `invalid-input-secret`

Fel `TURNSTILE_SECRET_KEY` i Supabase eller fel widget-par.

### `hostname-mismatch`

Lägg till prod-domän i Cloudflare Turnstile hostnames.

### Tom token

`Bekräfta captcha innan du skickar` – kund skickade innan callback satt token.

---

## Rate limit: gräns 10/timme

### Symptom

*"Du har nått gränsen för hur många offertförfrågningar…"*

### Kontroll

```sql
SELECT count(*), max(created_at)
FROM offer_rate_limit_events
WHERE email_normalized = lower(trim('kund@example.com'))
  AND created_at > now() - interval '1 hour';
```

Samma för IP om misstänkt:

```sql
SELECT * FROM offer_rate_limit_events
WHERE client_ip = '<ip>'
ORDER BY created_at DESC
LIMIT 20;
```

### Viktigt

- Endast **lyckade** förfrågningar (captcha OK, under gräns) loggas
- Misslyckade captcha-försök räknas **inte**

### Tillfällig relief (dev/stöd)

Sätt högre `OFFER_RATE_LIMIT_MAX_PER_HOUR` eller rensa gamla rader (endast med produktägares godkännande):

```sql
DELETE FROM offer_rate_limit_events
WHERE email_normalized = '...';
```

---

## Offert sparad men kund fick inget mail/SMS

### Symptom

Gul varning i UI; admin får mail till `OFFER_DELIVERY_ALERT_EMAIL`.

### Kontrollera

| Secret | |
|--------|--|
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | |
| `TWILIO_*` | |
| `BOOKING_PAGE_URL` | Saknas → leveransvarning, ingen bokningslänk |

Loggar i `calculate-offer` efter `deliverOfferToCustomer` / Resend/Twilio-fel.

Förfrågan och offert finns ändå i `offert_förfrågan` / `kund_offert` – hantera manuellt.

---

## Ingen bokningslänk i e-post

`BOOKING_PAGE_URL` (Supabase) och `VITE_BOOKING_PAGE_URL` (Vercel) ska vara samma publika app-URL.

Logg: *"Offer email will not include a booking link"*.

---

## Bokning: 404 / "ogiltig länk"

- Token utgången: `boknings_token_galler_till` på `kund_offert`
- E-post matchar inte `kund_offert.epost`
- Fel token i URL – ska vara `/boka/{token}`, inte läckt query (legacy migreras i frontend)

---

## Dubbel bokningsbekräftelse

Ska **inte** ske efter `bookingPersistence` insert-first. Om det ändå händer: kolla om bekräftelse skickas utanför `claimResult.kind === "created" | "rescheduled"` i `booking-offer/index.ts`.

---

## Pris "fel" / oväntat lågt

1. Jämför med `tests/unit/allServicesOffer.test.js`
2. Kontrollera rad i `bostads_priser` (tjänst, boende, frekvens, rum, kvm-intervall)
3. Rum vs kvm-diskrepans – känd produktfråga, se [pricing-and-business-rules.md](pricing-and-business-rules.md)

---

## Edge function 500

| Meddelande | Åtgärd |
|------------|--------|
| Missing Supabase env vars | Platform-issue / deploy |
| Atomic save-fel | DB constraint, migration saknas |
| No matching price row | Saknad prisdata för kombination |

Kör `supabase db push` om migration saknas i prod.

---

## Deploy-ordning vid incident

1. Identifiera i loggar (function + timestamp)
2. DB-fix/migration om data
3. `supabase functions deploy <name>`
4. Vercel redeploy om frontend
5. Verifiera med en end-to-end submit

---

## Kontakt och eskalering

Dokumentera i ert team:

- Supabase project ref
- Vercel-projekt
- Cloudflare Turnstile-konto
- Resend/Twilio-inlogg

Relaterat: [deployment.md](deployment.md), [environment-and-secrets.md](environment-and-secrets.md).
