import { Client, ValidationError } from "@shablon-eu/client";
import { verifyTripAccess } from "@/lib/trip-auth";

export async function POST(req: Request) {
  const { to, tripName, tripUrl, senderName, slug, userId } = await req.json();

  const denied = await verifyTripAccess(slug, userId);
  if (denied) return denied;

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
    const origin = new URL(tripUrl).origin;
    const logoUrl = `${origin}/icon.svg`;

    const { id, status } = await client.send({
      to: [to],
      template: "share-trip",
      parameters: {
        tripName,
        tripUrl,
        senderName,
        logoUrl,
      },
    });

    return Response.json({ id, status });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error("Failed to send share-trip email:", { to, tripName, issues: error.issues ?? [] });
    } else {
      console.error("Failed to send share-trip email:", { to, tripName, error });
    }
    const message = error instanceof Error ? error.message : "Failed to send email";
    return Response.json({ error: message }, { status: 500 });
  }
}
