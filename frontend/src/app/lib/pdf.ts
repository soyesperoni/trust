import puppeteer from "puppeteer";

type RenderPdfOptions = {
  html: string;
};

export async function renderPdfFromHtml({ html }: RenderPdfOptions): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    await page.emulateMediaType("screen");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "16px",
        right: "16px",
        bottom: "16px",
        left: "16px",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
