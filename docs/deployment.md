# Deployment

Projektet har **två deploy-ytor**: Vercel (frontend) och Supabase (databas + Edge Functions). De måste vara synkade (URL:er, secrets, migrationer).

## Checklista vid release

1. [ ] Kod mergad / testad (`npm run test:unit`, ev. integration)
2. [ ] Nya migrationer: `supabase db push` (eller via CI mot prod-projekt)
3. [ ] Edge Functions: `supabase functions deploy calculate-offer` och ev. `booking-offer`
4. [ ] Supabase secrets uppdaterade om nya variabler tillkommit
5. [ ] Vercel: miljövariabler (`VITE_*`) kontrollerade
6. [ ] Vercel: ny production deploy (push till kopplad branch eller manuell redeploy)
7. [ ] Cloudflare Turnstile: hostname för prod-domän finns
8. [ ] Röktest: ett formulärsubmit + ev. bokningslänk

## Supabase

### Länka CLI till projekt

```bash
supabase link --project-ref <project-ref>
```

`project-ref` finns i Dashboard → Project Settings.

### Databas

```bash
supabase db push
```

Kör alla nya filer i `supabase/migrations/` mot remote. **Ta backup** eller kör först mot staging om ni har det.

### Edge Functions

```bash
supabase functions deploy calculate-offer
supabase functions deploy booking-offer
```

Verifiera version i Dashboard → Edge Functions → Logs efter deploy.

### Secrets (Dashboard → Edge Functions → Secrets, eller CLI)

```bash
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set BOOKING_PAGE_URL=https://quote-calculator-teal.vercel.app
supabase secrets set RESEND_API_KEY=...
supabase secrets set RESEND_FROM_EMAIL=...
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_MESSAGING_SERVICE_SID=...
supabase secrets set OFFER_DELIVERY_ALERT_EMAIL=admin@example.com
```

Full lista: [environment-and-secrets.md](environment-and-secrets.md).

## Vercel

### Miljövariabler (Project → Settings → Environment Variables)

| Variabel | Miljö |
|----------|--------|
| `VITE_SUPABASE_URL` | Production (och Preview om ni testar där) |
| `VITE_SUPABASE_ANON_KEY` | Production |
| `VITE_TURNSTILE_SITE_KEY` | Production |
| `VITE_BOOKING_PAGE_URL` | Production (publik app-URL, samma som `BOOKING_PAGE_URL` i Supabase) |

Deploy sker vanligtvis automatiskt vid push till kopplad git-branch.

### `vercel.json`

- SPA: alla routes → `index.html` (stödjer `/boka/{token}`).
- CSP `frame-ancestors` för inbäddning på partnerdomäner (t.ex. valstadat.com).

## Cloudflare Turnstile

I Turnstile-widget → **Hostname management**, lägg till:

- Produktionsdomän (t.ex. `quote-calculator-teal.vercel.app`)
- `localhost` för lokal utveckling
- Ev. `*.vercel.app` för preview-deploys

Site key → Vercel. Secret key → Supabase (aldrig i Vercel).

## Ordning vid större ändringar

| Ändring | Först | Sedan |
|---------|-------|-------|
| Ny migration som functions kräver | `db push` | `functions deploy` |
| Endast function-logik | `functions deploy` | Vercel om frontend också ändrats |
| Endast frontend | Vercel redeploy | — |

## Efter deploy – snabb verifiering

1. Öppna prod-URL, fyll minimiformulär, captcha klart, submit → tack + bokningsnummer.
2. Supabase Logs → `calculate-offer` utan oväntade errors.
3. Vid rate limit-test: se [runbook-troubleshooting.md](runbook-troubleshooting.md).

## Rollback

- **Vercel:** tidigare deployment → Promote to Production.
- **Functions:** deploy tidigare git-commit igen.
- **DB:** migrationer är inte automatiska rollback – planera manuell SQL om nödvändigt.
