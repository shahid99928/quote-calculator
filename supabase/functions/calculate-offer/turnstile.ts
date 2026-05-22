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
    return { ok: false, reason: "Captcha verification is required." };
  }

  const body = new URLSearchParams({
    secret,
    response: responseToken
  });
  if (remoteIp) {
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
    return { ok: false, reason: "Captcha verification failed." };
  } catch (error) {
    console.error("Turnstile siteverify error:", error);
    return { ok: false, reason: "Captcha verification unavailable." };
  }
}
