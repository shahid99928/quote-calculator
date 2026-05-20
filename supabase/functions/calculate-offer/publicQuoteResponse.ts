/** Fields safe to return from calculate-offer (no token, phone, or email). */
export type PublicCalculateOfferQuote = {
  id: number;
  tjanst_typ: string;
  offert: number;
  stad: string;
  skapad: string;
  offert_forfragan_id: number | null;
};

export function toPublicCalculateOfferQuote(row: {
  id: number;
  tjanst_typ?: string | null;
  offert: number;
  stad: string;
  skapad: string;
  offert_forfragan_id?: number | null;
}): PublicCalculateOfferQuote {
  return {
    id: row.id,
    tjanst_typ: String(row.tjanst_typ ?? ""),
    offert: row.offert,
    stad: row.stad,
    skapad: row.skapad,
    offert_forfragan_id: row.offert_forfragan_id ?? null
  };
}
