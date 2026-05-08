import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json({ error: "query is required" }, { status: 400 });
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

    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC4&first=1`;
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await page
      .waitForSelector("img.mimg", { timeout: 10000 })
      .catch(() => {});

    const images = await page.evaluate(() => {
      const urls: string[] = [];
      const seen = new Set<string>();

      document.querySelectorAll("a.iusc").forEach((a) => {
        try {
          const m = a.getAttribute("m");
          if (!m) return;
          const data = JSON.parse(m);
          const url: string = data.murl;
          if (
            url &&
            /\.(jpg|jpeg|png|webp)/i.test(url) &&
            !seen.has(url)
          ) {
            seen.add(url);
            urls.push(url);
          }
        } catch {
          // ignore parse errors
        }
      });

      return urls;
    });

    return Response.json({ images: images.slice(0, 20) });
  } catch (e) {
    return Response.json(
      {
        error: `Failed to search images: ${e instanceof Error ? e.message : "unknown error"}`,
      },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}
