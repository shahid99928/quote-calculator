# Edge Functions

Bas-URL:

```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

Anrop: `POST`, JSON-body, headers:

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_ANON_KEY>
```

CORS: `OPTIONS` stöds. Frontend anropar via `supabase.functions.invoke` i `src/App.jsx` (`invokeEdgeFunction`).

---

## `calculate-offer`

**Fil:** `supabase/functions/calculate-offer/index.ts`

### Syfte

Validera förfrågan, beräkna offert (eller manuell väg), spara i DB, skicka kundkommunikation.

### Bearbetningsordning

1. Parse JSON → `QuoteRequest`
2. Validera tjänst, samtycke (`consent === true`), e-post
3. **Turnstile** – `verifyTurnstileToken` (400 vid fel)
4. **Rate limit** – `assertOfferRateLimit` (429 vid gräns)
5. `recordOfferRateLimitEvent` (efter godkänd gräns)
6. Fältvalidering (rum, kvm, fönster, trapp, …)
7. Manuell offert? → spara `offert_förfrågan`, returnera `manualReview`
8. Annars: prisberäkning från tabeller/RPC
9. `saveAutoQuoteAtomic` → `kund_offert` + länk
10. `deliverOfferToCustomer` + ev. admin-alert

### Request (urval)

| Fält | Typ | Obligatorisk | Kommentar |
|------|-----|--------------|-----------|
| `serviceType` | string | Ja | Se `supportedServices` i `index.ts` |
| `propertyType` | string | Bostad | `lagenhet`, `radhus`, `villa` |
| `numRooms` | number | Bostad | |
| `squareMeters` | number | Ofta | Heltal enligt tjänst |
| `frequency` | string | Hem/företag | |
| `city`, `phone`, `email` | string | Ja | |
| `consent` | boolean | Ja | Måste vara `true` |
| `turnstileToken` | string | Prod | Krävs när `TURNSTILE_SECRET_KEY` satt |
| `bookingPageUrl` | string | Nej | Skickas från frontend (`getBookingPageBaseUrl`) |
| Trapp/fönster/företag | … | Per tjänst | Se `QuoteRequest` i `index.ts` |

### Svar – auto (200)

```json
{
  "quote": {
    "id": 1,
    "tjanst_typ": "Flyttstadning",
    "offert": 2510,
    "stad": "Stockholm",
    "skapad": "2026-05-22T...",
    "offert_forfragan_id": 166
  },
  "offertForfraganId": 166,
  "pricing": { },
  "deliveryWarning": false,
  "deliveryIssue": "none",
  "emailDelivered": true,
  "smsDelivered": true
}
```

`quote` innehåller **inte** token, telefon eller e-post (`publicQuoteResponse.ts`).

### Svar – manuell (200)

```json
{
  "manualReview": true,
  "offertForfraganId": 167,
  "message": "Tack för din förfrågan! För större boenden …"
}
```

### Fel

| Status | Exempel |
|--------|---------|
| 400 | Validering, captcha, saknad prisrad |
| 429 | Rate limit (svensk `error`-text) |
| 500 | Saknade env vars, atomic save-fel |

Response-body: `{ "error": "<meddelande>" }`.

### Moduler (underhåll)

| Modul | Roll |
|-------|------|
| `turnstile.ts` | Cloudflare siteverify |
| `offerRateLimit.ts` | IP + e-post per timme |
| `housingLaborCost.ts` | Bostadspris |
| `stairLaborCost.ts` | Trapp |
| `manualQuote.ts` | Manuell väg |
| `atomicAutoQuote.ts` | Transaktionell sparning |
| `offerDelivery.ts` | Resend/Twilio |
| `bookingUrl.ts` | Bygga `/boka/{token}` |

---

## `booking-offer`

**Fil:** `supabase/functions/booking-offer/index.ts`

### Syfte

Hämta offertdata för bokningssida och skapa/uppdatera bokning.

### Request

```json
{
  "action": "get" | "book",
  "token": "<boknings_token>",
  "email": "kund@example.com",
  "requestedDate": "2026-06-01",
  "acceptedOffer": true
}
```

- `get`: endast `token` + `email`
- `book`: kräver `acceptedOffer: true`, giltigt `requestedDate` (ISO-datum, inte före idag i Stockholm)

### Svar – `get` (200)

```json
{
  "offer": { },
  "booking": null
}
```

eller befintlig `booking`.

### Svar – `book` (200)

```json
{
  "success": true,
  "booking": { },
  "rescheduled": true
}
```

eller `alreadyBooked: true` (ingen ny bekräftelse skickas).

### Fel

| Status | Orsak |
|--------|--------|
| 400 | Ogiltig action, datum, saknad accept |
| 404 | Ogiltig token/e-post (`BOOKING_ACCESS_ERROR`) |
| 500 | DB-fel |

### Idempotens

`claimOrUpdateBooking` (`bookingPersistence.ts`):

- Insert-first på `kund_bokningar`
- Parallella `book` → en rad, en bekräftelse
- Samma datum igen → `already_booked`

---

## Deploy

```bash
supabase functions deploy calculate-offer
supabase functions deploy booking-offer
```

Secrets: [environment-and-secrets.md](environment-and-secrets.md).
