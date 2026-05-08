import { Client } from "@shablon-eu/client";

export async function POST(req: Request) {
  const { to, tripName, tripUrl, senderName } = await req.json();

  if (!to || typeof to !== "string") {
    return Response.json({ error: "Recipient email is required" }, { status: 400 });
  }

  if (!tripName || !tripUrl || !senderName) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.SHABLON_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  const client = new Client({
    apiKey,
    from: process.env.SHABLON_FROM_EMAIL,
    environment: process.env.SHABLON_ENVIRONMENT,
  });

  try {
    const { id, status } = await client.send({
      to,
      template: "share-trip",
      parameters: {
        tripName,
        tripUrl,
        senderName,
      },
    });

    return Response.json({ id, status });
  } catch (error: unknown) {
    console.error("Failed to send share-trip email:", { to, tripName, error });
    const message = error instanceof Error ? error.message : "Failed to send email";
    return Response.json({ error: message }, { status: 500 });
  }
}
