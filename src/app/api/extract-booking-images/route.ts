import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  if (
    !url.includes("booking.com") &&
    !url.includes("bstatic.com")
  ) {
    return Response.json(
      { error: "Only booking.com URLs are supported" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch page: ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const images = new Set<string>();

    // Extract og:image
    const ogMatches = html.matchAll(
      /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/g,
    );
    for (const m of ogMatches) {
      images.add(upgradeBookingImageUrl(m[1]));
    }

    // Extract images from bstatic.com CDN (booking.com's image host)
    const bstaticMatches = html.matchAll(
      /https?:\/\/cf\.bstatic\.com\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi,
    );
    for (const m of bstaticMatches) {
      const url = m[0];
      // Skip tiny icons and sprites
      if (url.includes("/static/") || url.includes("/icon")) continue;
      images.add(upgradeBookingImageUrl(url));
    }

    // Extract from JSON-LD structured data
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const m of jsonLdMatches) {
      try {
        const data = JSON.parse(m[1]);
        extractImagesFromJsonLd(data, images);
      } catch {
        // ignore invalid JSON-LD
      }
    }

    const uniqueImages = [...images].filter(
      (u) => u.includes("bstatic.com") || u.includes("booking.com"),
    );

    return Response.json({ images: uniqueImages.slice(0, 20) });
  } catch (e) {
    return Response.json(
      { error: `Failed to extract images: ${e instanceof Error ? e.message : "unknown error"}` },
      { status: 500 },
    );
  }
}

function upgradeBookingImageUrl(url: string): string {
  // Upgrade small booking.com images to larger versions
  return url
    .replace(/\/square\d+\//, "/max1280x900/")
    .replace(/\/max\d+x\d+\//, "/max1280x900/");
}

function extractImagesFromJsonLd(data: unknown, images: Set<string>) {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    for (const item of data) extractImagesFromJsonLd(item, images);
    return;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.image === "string") images.add(upgradeBookingImageUrl(obj.image));
  if (Array.isArray(obj.image)) {
    for (const img of obj.image) {
      if (typeof img === "string") images.add(upgradeBookingImageUrl(img));
      if (typeof img === "object" && img && typeof (img as Record<string, unknown>).url === "string") {
        images.add(upgradeBookingImageUrl((img as Record<string, unknown>).url as string));
      }
    }
  }
  if (Array.isArray(obj.photo)) {
    for (const p of obj.photo) extractImagesFromJsonLd(p, images);
  }
  if (typeof obj.url === "string" && /\.(jpg|jpeg|png|webp)/i.test(obj.url)) {
    images.add(upgradeBookingImageUrl(obj.url));
  }
}
