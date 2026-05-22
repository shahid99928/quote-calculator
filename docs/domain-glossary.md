# Domänglossary

Projektet använder **svenska tabell- och kolumnnamn** i databasen. API-fält mot frontend är ofta **engelska** (`serviceType`, `numRooms`) och mappas vid insert.

## Affärsflöde

| Term | Betydelse |
|------|-----------|
| **Offertförfrågan** | Kundens inskickade formulär – sparas i `offert_förfrågan` |
| **Offert** | Beräknat pris (kr) som kunden erbjuds – `kund_offert.offert` |
| **Auto-offert** | Pris beräknat av kalkylatorn, `kund_offert` skapas, e-post/SMS skickas |
| **Manuell offert** | För stor kvm/rum/antal fönster – förfrågan sparas, ingen automatisk `kund_offert` |
| **Boknings-token** | Hemlig sträng i URL `/boka/{token}` – kopplad till `kund_offert.boknings_token` |
| **Bokning** | Kund accepterar offert och väljer datum – `kund_bokningar` |

## Tabeller

### `offert_förfrågan`

Alla inkommande förfrågningar (auto och manuell).

| Kolumn (urval) | Kommentar |
|----------------|-----------|
| `id` | Bokningsnummer som visas för kund ("Ditt bokningsnummer är …") |
| `status` | `auto` = kalkylatorn skapade offert, `manuell` = väntar manuell hantering |
| `tjanst_typ` | Tjänst (svenska värden i DB, se `formConfig`) |
| `boendetyp`, `antal_rum`, `kvadratmeter` | Bostadsrelaterat |
| `stadfrekvens` | Städfrekvens (hemstädning, företag) |
| `epost`, `telefon`, `stad` | Kontakt |

### `kund_offert`

Genererad offert efter auto-flöde.

| Kolumn (urval) | Kommentar |
|----------------|-----------|
| `offert` | Slutpris (kr) efter moms/RUT där det gäller |
| `boknings_token` | Token för bokningssidan |
| `boknings_token_galler_till` | Utgångstid (TTL från `BOOKING_TOKEN_TTL_DAYS`) |
| `offert_forfragan_id` | FK till förfrågan |

### `kund_bokningar`

| Kolumn | Kommentar |
|--------|-----------|
| `kund_offert_id` | Unik per offert (insert-first vid parallella `book`) |
| `onskat_datum` | `YYYY-MM-DD`, inte i det förflutna (Stockholm) |
| `offert_accepterad` | Ska vara true vid bokning |

### Pris-tabeller (urval)

| Tabell | Används för |
|--------|-------------|
| `bostads_priser` | Flytt-, hem-, stor-, bygg-, visningsstäd (lägenhet/radhus/villa, rum, kvm, frekvens) |
| `företags_priser` | Företagsstädning (kvm-intervall) |
| `kontors_arbetsplats_priser` | Arbetsplatser inom företag |
| `fönsterputs_priser` | Fönsterputs |
| RPC `berakna_trapp_pris` | Trappstädning BRF |

### `offer_rate_limit_events`

Loggar IP + normaliserad e-post per lyckad förfrågan (rate limit). Ingen direkt kundåtkomst.

## API ↔ domän (calculate-offer)

| Request-fält | DB / domän |
|--------------|------------|
| `serviceType` | `tjanst_typ` |
| `propertyType` | `boendetyp` (`lagenhet`, `radhus`, `villa`) |
| `numRooms` | `antal_rum` |
| `squareMeters` | `kvadratmeter` |
| `frequency` | `stadfrekvens` |
| `consent` | Samtycke (måste vara `true`) |
| `turnstileToken` | Verifieras, sparas inte |

## Tjänstetyper (`serviceType`)

| Värde (API) | Etikett i UI |
|-------------|--------------|
| `Flyttstadning` | Flyttstädning |
| `Visningsstadning` | Visningsstädning |
| `Fonsterputs` | Fönsterputs |
| `Hemstadning` | Hemstädning |
| `Storstadning` | Storstädning |
| `Trappstadning BRFer` | Trappstädning BRF:er |
| `Byggstadning` | Byggstädning |
| `Foretagsstadning` | Företagsstädning |

## Prisbegrepp

| Term | Betydelse |
|------|-----------|
| **Arbetskostnad** | Underlag före moms |
| **MOMS** | 25 % på arbetskostnad (bostad/fönster där det gäller) |
| **RUT-avdrag** | 50 % på belopp inkl. moms (bostad/fönster) |
| **Offert (slutpris)** | Vad kunden ser i kronor |

Trappstädning använder annan modell (pris via RPC, utan RUT i samma sätt som hemstäd).

## Filer att läsa vid domänfrågor

- `src/formConfig.js` – UI och gränser
- `supabase/functions/calculate-offer/manualQuote.ts` – när manuell offert triggas
- [pricing-and-business-rules.md](pricing-and-business-rules.md)
