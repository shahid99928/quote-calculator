# Prislogik och affärsregler

Pris beräknas i **`calculate-offer`**. Regler finns i TypeScript-moduler och **bör speglas i tester** – behandla testerna som levande specifikation.

## Tjänstegrupper

| Grupp | Tjänster | Priskälla |
|-------|----------|-----------|
| Bostad + boendetyp | Flytt-, hem-, stor-, bygg-, visningsstäd | `bostads_priser` + `housingLaborCost.ts` |
| Företag | `Foretagsstadning` | `företags_priser`, `kontors_arbetsplats_priser` |
| Fönster | `Fonsterputs` | `fönsterputs_priser` |
| Trapp | `Trappstadning BRFer` | RPC `berakna_trapp_pris` (`stairLaborCost.ts`) |

Konfiguration i UI: `src/formConfig.js`. Beräkning: `supabase/functions/calculate-offer/index.ts`.

## Moms och RUT (bostad / fönster)

- **MOMS:** 25 % på arbetskostnad (`VAT_RATE = 0.25`)
- **RUT:** 50 % avslag på pris inkl. moms (`RUT_DEDUCTION_RATE = 0.5`)
- **Slutpris:** `offert = prisInklMoms - rutAvdrag`

Se `calculateHousingOfferBreakdown` i `housingLaborCost.ts`.

## Bostadspriser (`bostads_priser`)

Rader filtreras på:

- `tjanst_typ` (matchar vald tjänst)
- `boendetyp` (`lagenhet`, `radhus`, `villa`)
- `stadfrekvens` (för hemstädning; engång för flytt m.fl.)

**Arbetskostnad** (`calculateHousingLaborCost`):

- Inom kvm-intervall för rum: `grundavgift + kvm × pris_per_kvm`
- Över `kvm_till`: extra kvm till nästa rums rad

## Rum (`roomCountRules.ts` / `formConfig.js`)

| Boendetyp | Min rum | Auto-pris max rum | Formulär max |
|-----------|---------|-------------------|--------------|
| Lägenhet | 1 | 7 | 10 |
| Radhus | 1 | 7 | 10 |
| Villa | **3** | 7 | 10 |

- **8–10 rum:** manuell offert (`isManualHomeRoomQuote`)
- Villa med &lt; 3 rum: valideringsfel

## Kvadratmeter (`squareMetersRules.ts`)

| Kontext | Min | Max i formulär | Auto-pris typiskt till |
|---------|-----|----------------|------------------------|
| Bostadstjänster | 20 | 500 | 500 (lägenhet 200 / radhus 300 / villa 500 i prislista) |
| Trappstäd | 50 | 500 | 500 |
| Företag | 50 | 10000 | 500 |

Kvm **över prislistans högsta intervall** men inom formulärmax → **manuell offert** (`isManualSquareMetersQuote`).

## Manuell offert (`requiresManualQuote`)

Ingen `kund_offert` skapas. Svar innehåller ungefär:

```json
{
  "manualReview": true,
  "offertForfraganId": 123,
  "message": "Tack för din förfrågan! För större boenden …"
}
```

Triggas när:

1. Bostad: rum &gt; `pricedMax` (7) och ≤ 10  
2. Bostad/företag: kvm över prislistans tak men inom formulärmax  
3. Fönsterputs: för många fönster (`windowCountRules.ts`)

`offert_förfrågan.status` = `manuell`.

## Fönsterputs

- Egna fält: `windowCount`, `windowType`, `glazedBalcony`, `balconyWindowCount`
- `squareMeters` nullable i DB för denna tjänst
- Högt antal fönster → manuell offert

## Företagsstädning

- `businessLocalType`: Kontor, Butik, Industri  
- `workstations` för kontor  
- `frequency` obligatorisk (samma lista som hemstäd)

## Trappstädning BRF

- Fält: `stairwells`, `floors`, `elevators`, `stairFrequency`  
- Pris via `berakna_trapp_pris` – fel mappas till `badRequest` i `mapTrappRpcError`

## Auto-offert – sparning och leverans

1. `saveAutoQuoteAtomic` – `offert_förfrågan` + `kund_offert` atomiskt  
2. `status` = `auto`  
3. Boknings-token + utgångsdatum  
4. `deliverOfferToCustomer` – Resend + Twilio  
5. Om leverans misslyckas: admin-alert (`OFFER_DELIVERY_ALERT_EMAIL`), frontend visar gul varning (`deliveryWarning`)

## Tester att köra vid prisändringar

```bash
npm run test:unit
# särskilt:
# tests/unit/allServicesOffer.test.js
# tests/fixtures/bostadsPriserCatalog.js
# supabase/functions/calculate-offer/*.test.ts
npm run test:integration:local   # kräver lokal Supabase
```

## Ändra priser i produktion

1. Uppdatera data via migration eller admin-SQL i `bostads_priser` / andra tabeller  
2. Kör `supabase db push`  
3. Verifiera med unit/integrationstester  
4. Ingen function-deploy krävs om endast DB-data ändrats

## Kända begränsningar / förbättringsområden

- Diskrepans mellan rum och kvm kan ge ovanliga priser (diskuteras i produkt/backlog).  
- Rate limit räknar endast **lyckade** förfrågningar som passerat captcha.

Se [edge-functions.md](edge-functions.md) för request/response.
