# Demo – setup och kundvisning

Guide för en utvecklare (eller produktägare) som ska **sätta upp projektet**, **testa formuläret** och **visa en live-demo** för kunder. Det här är inte samma sak som [deployment.md](deployment.md) (prod-release).

---

## Välj demo-läge

| Läge | När | Fördel | Nackdel |
|------|-----|--------|---------|
| **A – Produktion** | Kunddemo, sälj, stakeholder | Inget lokalt krav; riktig captcha, mail/SMS | Skapar riktiga rader i DB; rate limit 10/timme |
| **B – Lokal frontend + molnsupabase** | Utvecklardemo, felsök UI | `npm run dev` på laptop | Samma backend som prod om `.env` pekar dit |
| **C – Helt lokalt** | Offline / integration | Full kontroll | Docker, `supabase start`, function serve – mer setup |

**Rekommendation för kunddemo:** **läge A** (prod-URL). För “jag ska bara förstå koden”: **läge B**.

---

## Del 1 – Setup (för utvecklaren)

### Läge A: Demo mot produktion (minst arbete)

1. Bekräfta att prod-appen fungerar (t.ex. `https://quote-calculator-teal.vercel.app`).
2. Ha **egen e-post** du får mail till (eller förklara att mail kan vara avstängt i test).
3. Inget repo krävs för själva kundvisningen.

Valfritt – klona repo för att läsa kod/docs:

```bash
git clone <repo-url>
cd KlaraStäd
npm install
cp .env.example .env
# Fyll VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY om du vill köra lokalt senare
```

### Läge B: Lokal app mot Supabase (dev-demo)

```bash
git clone <repo-url>
cd KlaraStäd
npm install
cp .env.example .env
```

Fyll i `.env` (värden från Supabase Dashboard → Project Settings → API):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_TURNSTILE_SITE_KEY=<site-key>   # samma som prod om full captcha
VITE_BOOKING_PAGE_URL=http://localhost:5173
```

Starta:

```bash
npm run dev
```

Öppna URL i terminalen (ofta `http://localhost:5173`).

**Supabase secrets för lokal bokningslänk i mail:**

```bash
supabase secrets set BOOKING_PAGE_URL=http://localhost:5173
```

Mer detalj: [local-development.md](local-development.md).

### Läge C: Helt lokal stack

Endast om du behöver demo **utan** molndata:

```bash
supabase start
supabase db reset
# Deploy/serve functions – se local-development.md
export DISABLE_OFFER_RATE_LIMIT=1   # endast dev Supabase secrets
npm run dev
```

---

## Del 2 – Förberedelse före kunddemo (checklista)

- [ ] **Webbläsare:** Chrome/Edge, ett fönster, inga 10+ testsubmits samma timme med samma e-post (rate limit).
- [ ] **Nätverk:** Stabilt wifi; captcha (Cloudflare) kräver internet.
- [ ] **E-post:** Använd **din** adress eller en demo-adress ni äger – kunden kan få riktig offertmail.
- [ ] **Telefon:** Riktigt mobilnummer om ni vill visa SMS (valfritt).
- [ ] **Skärmdelning:** Zoom/Teams – dela hela fliken, inte bara fönster (captcha syns tydligt).
- [ ] **Inbäddning:** Om formuläret visas i iframe på kundens sajt – testa den vyn en gång innan (CSP i [security.md](security.md)).
- [ ] **Backup-plan:** Om captcha strular → hård refresh (Ctrl+Shift+R), vänta på **Klart!**, ett klick på submit.

---

## Del 3 – Vad du visar kunden (storyline, ~10–15 min)

### 1. Intro (30 sek)

> “Det här är vår offertkalkylator. Kunden väljer tjänst och boende, får ett pris direkt eller en bekräftelse att vi återkommer vid större uppdrag. Offerten kan bokas via länk i e-post.”

### 2. Standard-demo – automatisk offert (5 min)

**Rekommenderat exempel** (ger tydligt pris, som i tester):

| Fält | Värde |
|------|--------|
| Typ av tjänst | **Flyttstädning** |
| Boendetyp | **Lägenhet** |
| Antal rum | **3** |
| Kvadratmeter | **70** |
| Stad | **Stockholm** |
| Telefon | Eget nummer, t.ex. `0701234567` |
| E-post | **Din demo-adress** |
| Samtycke | Kryssa i |

**Captcha:** Vänta tills rutan visar **Klart!** → klicka **Beräkna mitt pris** **en gång**.

**Förväntat resultat:**

- Grön text: *Tack för din förfrågan!*
- *Ditt bokningsnummer är …* (ID från `offert_förfrågan`)
- E-post/SMS med offert och bokningslänk (om Resend/Twilio är konfigurerat)

**Säg till kunden:**

> “Systemet sparar förfrågan, räknar pris utifrån vår prislista, och skickar offert med länk för att boka städdatum.”

### 3. Valfritt – andra tjänster (kort)

| Tjänst | Extra fält att nämna |
|--------|----------------------|
| **Hemstädning** | Frekvens (vecka/månad) |
| **Fönsterputs** | Antal fönster, typ, balkong |
| **Trappstädning BRF** | Trapphus, våningar, hiss, frekvens |
| **Företagsstädning** | Lokaltyp (kontor/butik/industri), kvm, ev. arbetsplatser |

Byt tjänst i dropdown – formuläret visar bara relevanta fält.

### 4. Manuell offert (2 min) – om kunden frågar om “stora jobb”

Fyll t.ex. **8 rum** i lägenhet (över auto-gräns 7, under 10):

- Inget automatiskt slutpris i samma flöde
- Meddelande om att ni återkommer med skräddarsydd offert
- Förfrågan sparas med status **manuell** i databasen

> “Större eller ovanliga uppdrag går till manuell hantering i stället för felaktigt lågt maskinpris.”

### 5. Bokningsflöde (5 min) – om tid och mail fungerar

1. Öppna offertmail på projektorn (eller klistra in bokningslänk).
2. URL ska vara **`/boka/{token}`** (inte `?bookingToken=` i query).
3. Ange **samma e-post** som i formuläret.
4. Välj datum (idag eller framåt) → bekräfta bokning.
5. Visa bekräftelse i UI och ev. bekräftelsemail.

> “Bara den som har länken och rätt e-post kan boka – token går ut efter 30 dagar.”

Se [security.md](security.md) för token och e-postkrav.

---

## Del 4 – Manus: vad du *inte* behöver förklara tekniskt

Fokusera på **värde**, inte implementation:

- Supabase, Vercel, Edge Functions – endast om IT-frågar
- Turnstile – säg “robot-skydd” om captcha syns
- Rate limit – “max antal förfrågningar per timme mot missbruk” om ni råkar trigga det

---

## Del 5 – Vanliga demo-problem

| Problem | Lösning |
|---------|---------|
| Captcha-fel trots “Klart!” | Hård refresh → ny captcha → **ett** submit. Se [runbook-troubleshooting.md](runbook-troubleshooting.md). |
| “Gräns nådd” efter många tester | Vänta 1 timme eller byt e-post/IP; inte ett kundscenario om ni förberett. |
| Inget mail | Offerten sparas ändå; visa bokningsnummer i UI. Kolla Resend secrets / skräppost. |
| Gul varning efter submit | Offert sparad, men SMS/mail till kund misslyckades – admin får alert. |
| Supabase inte konfigurerat (lokal) | `.env` saknas – se Del 1 läge B. |

---

## Del 6 – Efter demon (utvecklare)

| Uppgift | Var |
|---------|-----|
| Verifiera rad i DB | Supabase → Table Editor → `offert_förfrågan`, `kund_offert` |
| Rensa testdata | Teamets policy – ev. radera testrader manuellt |
| Loggar vid fel | Edge Functions → `calculate-offer` / `booking-offer` → Logs |

---

## Del 7 – Snabbreferens kommandon

```bash
# Lokal app
npm run dev

# Verifiera att kodbasen är ok före demo-utveckling
npm run test:unit

# Prod-URL (uppdatera om er deployment heter något annat)
open https://quote-calculator-teal.vercel.app
```

---

## Relaterad dokumentation

| Dokument | Användning |
|----------|------------|
| [local-development.md](local-development.md) | Full lokal setup |
| [deployment.md](deployment.md) | Prod-release, inte demo |
| [environment-and-secrets.md](environment-and-secrets.md) | Nycklar för mail/captcha |
| [pricing-and-business-rules.md](pricing-and-business-rules.md) | Varför vissa priser/manuell offert |
| [domain-glossary.md](domain-glossary.md) | Bokningsnummer, tabeller |
| [security.md](security.md) | Captcha, rate limit, bokningstoken |

---

## En sida – demo-cheat sheet (skriv ut / ha bredvid)

```
1. Öppna prod-URL (eller localhost:5173)
2. Flyttstädning → Lägenhet → 3 rum → 70 kvm → Stockholm
3. Din e-post + telefon + samtycke
4. Captcha Klart! → Ett klick Beräkna mitt pris
5. Visa tack + bokningsnummer
6. (Valfritt) Öppna mail → /boka/... → samma e-post → boka datum
```

**Undvik under live-demo:** 10+ submits samma e-post, dubbelklick submit, submit utan ny captcha efter fel.
