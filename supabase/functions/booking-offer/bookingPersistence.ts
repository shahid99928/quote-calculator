import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type KundBokningRow = {
  boknings_id: number;
  kund_offert_id: number;
  onskat_datum: string;
  offert_accepterad: boolean;
  skapad: string;
  uppdaterad: string;
};

const BOOKING_SELECT =
  "boknings_id, kund_offert_id, onskat_datum, offert_accepterad, skapad, uppdaterad";

export type ClaimBookingResult =
  | { kind: "created"; booking: KundBokningRow }
  | { kind: "already_booked"; booking: KundBokningRow }
  | { kind: "rescheduled"; booking: KundBokningRow }
  | { kind: "error"; message: string };

function isSameBooking(booking: KundBokningRow, requestedDate: string): boolean {
  return booking.onskat_datum === requestedDate && booking.offert_accepterad === true;
}

async function fetchBookingByOfferId(
  supabase: SupabaseClient,
  kundOffertId: number
): Promise<{ booking: KundBokningRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("kund_bokningar")
    .select(BOOKING_SELECT)
    .eq("kund_offert_id", kundOffertId)
    .maybeSingle();

  if (error) {
    return { booking: null, error: error.message };
  }
  return { booking: data as KundBokningRow | null, error: null };
}

/**
 * Insert-first booking: parallel requests for the same offer only create one row.
 * Confirmation should be sent only for "created" or "rescheduled", not "already_booked".
 */
export async function claimOrUpdateBooking(
  supabase: SupabaseClient,
  kundOffertId: number,
  requestedDate: string
): Promise<ClaimBookingResult> {
  const { data: inserted, error: insertError } = await supabase
    .from("kund_bokningar")
    .insert({
      kund_offert_id: kundOffertId,
      onskat_datum: requestedDate,
      offert_accepterad: true
    })
    .select(BOOKING_SELECT)
    .maybeSingle();

  if (!insertError && inserted) {
    return { kind: "created", booking: inserted as KundBokningRow };
  }

  if (insertError?.code !== "23505") {
    return {
      kind: "error",
      message: insertError?.message ?? "Could not create booking."
    };
  }

  const { booking: existing, error: fetchError } = await fetchBookingByOfferId(supabase, kundOffertId);
  if (fetchError) {
    return { kind: "error", message: fetchError };
  }
  if (!existing) {
    return { kind: "error", message: "Booking conflict but no existing row found." };
  }

  if (isSameBooking(existing, requestedDate)) {
    return { kind: "already_booked", booking: existing };
  }

  const { data: updated, error: updateError } = await supabase
    .from("kund_bokningar")
    .update({
      onskat_datum: requestedDate,
      offert_accepterad: true,
      uppdaterad: new Date().toISOString()
    })
    .eq("kund_offert_id", kundOffertId)
    .select(BOOKING_SELECT)
    .single();

  if (updateError || !updated) {
    return { kind: "error", message: updateError?.message ?? "Could not update booking." };
  }

  const updatedBooking = updated as KundBokningRow;
  if (isSameBooking(updatedBooking, requestedDate) && !isSameBooking(existing, requestedDate)) {
    return { kind: "rescheduled", booking: updatedBooking };
  }

  if (isSameBooking(updatedBooking, requestedDate)) {
    return { kind: "already_booked", booking: updatedBooking };
  }

  return { kind: "error", message: "Booking state changed during update." };
}
