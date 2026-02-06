import { NextResponse } from "next/server";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? process.env.IDOS_RESEND_API_KEY;
const resend = new Resend(apiKey);

export async function POST(request: Request) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured. Add RESEND_API_KEY or IDOS_RESEND_API_KEY to .env" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { to, subject, text, fromName } = body as {
      to?: string;
      subject?: string;
      text?: string;
      fromName?: string;
    };

    if (!to || typeof to !== "string" || !to.trim()) {
      return NextResponse.json(
        { error: "Recipient (to) is required" },
        { status: 400 }
      );
    }

    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const fromDisplay = fromName?.trim()
      ? `${fromName.trim()} <${from}>`
      : from;

    const { data, error } = await resend.emails.send({
      from: fromDisplay,
      to: to.trim(),
      subject: typeof subject === "string" ? subject.trim() || "(No subject)" : "(No subject)",
      text: typeof text === "string" ? text.trim() || "" : "",
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: data?.id, ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
