import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  if (!url.includes("booking.com") && !url.includes("bstatic.com")) {
    return Response.json(
      { error: "Only booking.com URLs are supported" },
      { status: 400 },
    );
  }

  let browser;
  try {
    const isLocal = !!process.env.CHROMIUM_PATH;
    browser = await puppeteer.launch({
      args: isLocal ? ["--no-sandbox"] : chromium.args,
      executablePath: isLocal
        ? process.env.CHROMIUM_PATH
        : await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    );

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    await page
      .waitForSelector('img[src*="bstatic.com"]', { timeout: 10000 })
      .catch(() => {});

    const images = await page.evaluate(() => {
      const urls = new Set<string>();

      document.querySelectorAll("img").forEach((img) => {
        for (const src of [
          img.src,
          img.dataset.src,
          img.dataset.lazySrc,
          img.getAttribute("data-highres"),
        ]) {
          if (
            src &&
            (src.includes("bstatic.com") || src.includes("booking.com")) &&
            /\.(jpg|jpeg|png|webp)/i.test(src)
          ) {
            urls.add(src);
          }
        }
      });

      document.querySelectorAll("[srcset]").forEach((el) => {
        const srcset = el.getAttribute("srcset") || "";
        const matches = srcset.match(
          /https?:\/\/[^\s,]+bstatic\.com[^\s,]+/g,
        );
        if (matches) matches.forEach((u) => urls.add(u));
      });

      document
        .querySelectorAll('[style*="background"]')
        .forEach((el) => {
          const style = el.getAttribute("style") || "";
          const match = style.match(
            /url\(['"]?(https?:\/\/[^'")\s]+bstatic\.com[^'")\s]+)['"]?\)/,
          );
          if (match) urls.add(match[1]);
        });

      document
        .querySelectorAll('a[data-photo-url], [data-photo-url]')
        .forEach((el) => {
          const photoUrl = el.getAttribute("data-photo-url");
          if (photoUrl && photoUrl.includes("bstatic.com")) {
            urls.add(photoUrl);
          }
        });

      document
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((script) => {
          try {
            const data = JSON.parse(script.textContent || "");
            const extract = (obj: unknown): void => {
              if (!obj || typeof obj !== "object") return;
              if (Array.isArray(obj)) {
                obj.forEach(extract);
                return;
              }
              const rec = obj as Record<string, unknown>;
              if (typeof rec.image === "string") urls.add(rec.image);
              if (Array.isArray(rec.image))
                rec.image.forEach((i: unknown) => {
                  if (typeof i === "string") urls.add(i);
                  if (
                    i &&
                    typeof i === "object" &&
                    typeof (i as Record<string, unknown>).url === "string"
                  )
                    urls.add((i as Record<string, unknown>).url as string);
                });
              if (Array.isArray(rec.photo)) rec.photo.forEach(extract);
              if (
                typeof rec.url === "string" &&
                /\.(jpg|jpeg|png|webp)/i.test(rec.url)
              )
                urls.add(rec.url);
            };
            extract(data);
          } catch {
            // ignore invalid JSON-LD
          }
        });

      return [...urls];
    });

    const filtered = images
      .filter((u) => u.includes("/xdata/images/hotel/"))
      .map(upgradeBookingImageUrl);

    const seen = new Set<string>();
    const uniqueImages = filtered.filter((u) => {
      const id = u.match(/\/(\d+\.(?:jpg|jpeg|png|webp))/i)?.[1];
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return Response.json({ images: uniqueImages.slice(0, 20) });
  } catch (e) {
    return Response.json(
      {
        error: `Failed to extract images: ${e instanceof Error ? e.message : "unknown error"}`,
      },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}

function upgradeBookingImageUrl(url: string): string {
  return url
    .replace(/\/square\d+\//, "/max1280x900/")
    .replace(/\/max\d+(?:x\d+)?\//, "/max1280x900/");
}
