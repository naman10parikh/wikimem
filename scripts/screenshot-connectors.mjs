import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto('http://localhost:3456/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1200);
await page.click('#rail-connectors');
await page.waitForTimeout(2500);
// Output folder: WIKIMEM_AUDIT_OUT if set, else screenshots/wikimem-audit under the current folder.
const out = process.env.WIKIMEM_AUDIT_OUT ?? 'screenshots/wikimem-audit';
await page.screenshot({ path: `${out}/connectors-concierge-v2.png`, fullPage: false });
const inputPresent = await page.isVisible('#mcp-server-url');
const btnPresent = await page.isVisible('#mcp-server-connect');
const listPresent = await page.isVisible('#mcp-connected-servers');
console.log(JSON.stringify({ inputPresent, btnPresent, listPresent }));
await browser.close();
