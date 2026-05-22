# Miljövariabler och secrets

Konfigurationsmall: [.env.example](../.env.example). **Committa aldrig** `.env` med riktiga nycklar.

## Översikt

| Var | Vad |
|-----|-----|
| **Vercel** | `VITE_*` – exponeras i browser-bundle (publika värden) |
| **Supabase Edge secrets** | API-nycklar, Turnstile secret, boknings-URL, rate limit, admin-e-post |
| **Lokal `.env`** | Samma `VITE_*` för `npm run dev` |
| **`SUPABASE_DB_PASSWORD`** | Endast för CLI/psql (`db pull`), inte för appen |

## Frontend (Vercel / `.env`)

| Variabel | Obligatorisk | Beskrivning |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | Ja | Supabase project URL, t.ex. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Ja | Anon/public key för `supabase-js` |
| `VITE_TURNSTILE_SITE_KEY` | Prod: ja | Cloudflare Turnstile **site key** (publik) |
| `VITE_BOOKING_PAGE_URL` | Rekommenderad | Publik bas-URL för bokningslänkar i e-post, t.ex. `https://quote-calculator-teal.vercel.app`. Utan den används `window.location.origin` |

## Supabase Edge Function secrets

Sätts i Dashboard → **Edge Functions** → **Secrets** eller `supabase secrets set KEY=value`.

### Säkerhet och captcha

| Secret | Function | Beskrivning |
|--------|----------|-------------|
| `TURNSTILE_SECRET_KEY` | `calculate-offer` | Cloudflare Turnstile secret. Om saknas: verifiering **hoppas över** (endast för dev) |
| `OFFER_RATE_LIMIT_MAX_PER_HOUR` | `calculate-offer` | Standard **10** |
| `DISABLE_OFFER_RATE_LIMIT` | `calculate-offer` | Sätt `1` för lokala integrationstester |

### Bokning och länkar

| Secret | Function | Beskrivning |
|--------|----------|-------------|
| `BOOKING_PAGE_URL` | `calculate-offer` | Bas-URL för `/boka/{token}` i kundmail/SMS. Ska matcha prod-app |
| `BOOKING_PAGE_ALLOWED_HOSTS` | `calculate-offer` | Valfri kommaseparerad lista extra tillåtna hosts i `bookingUrl.ts` |
| `BOOKING_TOKEN_TTL_DAYS` | `calculate-offer` | Giltighetstid för boknings-token (standard **30** dagar) |

### Kundleverans (offert + bokningsbekräftelse)

| Secret | Function | Beskrivning |
|--------|----------|-------------|
| `RESEND_API_KEY` | `calculate-offer`, `booking-offer` | Resend API |
| `RESEND_FROM_EMAIL` | båda | Avsändaradress (måste vara verifierad i Resend) |
| `TWILIO_ACCOUNT_SID` | båda | Twilio |
| `TWILIO_AUTH_TOKEN` | båda | Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | båda | SMS via Messaging Service |
| `OFFER_DELIVERY_ALERT_EMAIL` | `calculate-offer` | En eller flera admin-adresser (kommaseparerade) vid misslyckad e-post/SMS till kund |

### Automatiskt i runtime

Supabase injicerar `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` till Edge Functions – sätt inte manuellt om inte dokumentationen för er setup kräver det.

## Parning Turnstile

1. Skapa widget i [Cloudflare Turnstile](https://dash.cloudflare.com).
2. **Site key** → `VITE_TURNSTILE_SITE_KEY` (Vercel).
3. **Secret key** → `TURNSTILE_SECRET_KEY` (Supabase).
4. Hostnames: prod-domän + `localhost`.

## Parning boknings-URL

`VITE_BOOKING_PAGE_URL` (frontend vid submit) och `BOOKING_PAGE_URL` (backend i mail) ska peka på samma publika app:

```
https://<er-app>/boka/<token>
```

## Lokal utveckling vs produktion

| | Lokal | Produktion |
|---|-------|------------|
| Supabase | Ofta remote dev-projekt eller `supabase start` | Prod project ref |
| Turnstile | Test keys eller skip secret | Prod keys + hostnames |
| Resend/Twilio | Kan utelämnas – leverans `skipped` / failed, offert sparas ändå | Måste vara korrekt för kundleverans |

## Säkerhet

- Lägg **aldrig** `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Resend eller Twilio i Vercel `VITE_*`.
- Rotera nycklar i Cloudflare/Resend/Twilio om de läckt.
- `offer_rate_limit_events` har ingen åtkomst för `anon`/`authenticated` (endast service role via functions).
