export const reportRenderer = (process.env.REPORT_RENDERER ?? "puppeteer").trim().toLowerCase();

export function isPuppeteerReportRenderer() {
  return reportRenderer === "puppeteer";
}
