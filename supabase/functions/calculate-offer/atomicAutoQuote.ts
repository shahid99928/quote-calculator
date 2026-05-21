import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { OffertForfraganInsert } from "./offertForfraganInsert.ts";
import type { PublicCalculateOfferQuote } from "./publicQuoteResponse.ts";

export type KundOffertInsertPayload = {
  tjanst_typ: string;
  offert: number;
  stad: string;
  telefon: string;
  epost: string;
  boknings_token: string;
  boknings_token_galler_till: string;
};

export type AtomicAutoQuoteResult =
  | {
      ok: true;
      offertForfraganId: number;
      kundOffert: PublicCalculateOfferQuote;
      bokningsToken: string;
    }
  | { ok: false; error: string };

export async function saveAutoQuoteAtomic(
  supabase: SupabaseClient,
  offertForfragan: OffertForfraganInsert,
  kundOffert: KundOffertInsertPayload
): Promise<AtomicAutoQuoteResult> {
  const { data, error } = await supabase.rpc("spara_auto_offert_atomic", {
    p_offert_forfragan: offertForfragan,
    p_kund_offert: kundOffert
  });

  if (error) {
    console.error("spara_auto_offert_atomic failed:", error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as {
    offert_forfragan_id?: number;
    kund_offert?: PublicCalculateOfferQuote;
  } | null;

  const offertForfraganId = payload?.offert_forfragan_id;
  const kundRow = payload?.kund_offert;

  if (
    !Number.isFinite(offertForfraganId) ||
    !kundRow ||
    !Number.isFinite(kundRow.id) ||
    !Number.isFinite(kundRow.offert)
  ) {
    return { ok: false, error: "Unexpected response from spara_auto_offert_atomic." };
  }

  return {
    ok: true,
    offertForfraganId: Number(offertForfraganId),
    kundOffert: {
      id: Number(kundRow.id),
      tjanst_typ: String(kundRow.tjanst_typ ?? ""),
      offert: Number(kundRow.offert),
      stad: String(kundRow.stad ?? ""),
      skapad: String(kundRow.skapad ?? ""),
      offert_forfragan_id: kundRow.offert_forfragan_id ?? Number(offertForfraganId)
    },
    bokningsToken: kundOffert.boknings_token
  };
}
