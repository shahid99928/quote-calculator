/**
 * User-facing copy when the quote was saved but e-post/SMS could not be delivered.
 */
export function getOfferDeliveryWarningMessage(data) {
  if (!data?.deliveryWarning) {
    return "";
  }

  const idPart = data.offertForfraganId
    ? `Ditt ärendenummer är ${data.offertForfraganId}. `
    : "";

  if (data.deliveryIssue === "no_booking_link") {
    return (
      `${idPart}Din offert är sparad hos oss, men bokningslänken kunde inte skapas. ` +
      "Kontakta oss så skickar vi offerten och hjälper dig boka – du behöver inte fylla i formuläret igen."
    );
  }

  const emailOk = Boolean(data.emailDelivered);
  const smsOk = Boolean(data.smsDelivered);

  if (!emailOk && !smsOk) {
    return (
      `${idPart}Din offert är sparad hos oss, men vi kunde inte nå dig via e-post eller SMS. ` +
      "Vi återkommer manuellt – du behöver inte skicka om formuläret."
    );
  }

  if (!emailOk) {
    return (
      `${idPart}Din offert är sparad. E-post kunde inte levereras; vi återkommer via telefon eller manuellt.`
    );
  }

  return (
    `${idPart}Din offert är sparad. SMS kunde inte levereras; kontrollera din e-post eller vänta på att vi hör av oss.`
  );
}
