export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim() ?? "";
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY not set; captcha verification skipped (dev only).");
    return { ok: true };
  }

  const responseToken = token?.trim() ?? "";
  if (!responseToken) {
    return { ok: false, reason: "Bekräfta captcha innan du skickar formuläret." };
  }

  const body = new URLSearchParams({
    secret,
    response: responseToken
  });
  const isValidRemoteIp =
    remoteIp &&
    remoteIp !== "unknown" &&
    (/^\d{1,3}(\.\d{1,3}){3}$/.test(remoteIp) || remoteIp.includes(":"));
  if (isValidRemoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const result = await verifyResponse.json();
    if (result?.success === true) {
      return { ok: true };
    }
    console.error("Turnstile verification failed:", result);
    return { ok: false, reason: "Captcha kunde inte verifieras. Försök igen." };
  } catch (error) {
    console.error("Turnstile siteverify error:", error);
    return { ok: false, reason: "Captcha är tillfälligt otillgänglig. Försök igen om en stund." };
  }
}
