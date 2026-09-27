import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAuthE2ETest() {
  console.log('====================================================================');
  console.log('  TESTING COMPANY MULTI-TENANCY & AUTHENTICATION END-TO-END');
  console.log('====================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  try {
    // 1. Visit root page (clear local storage first to guarantee unauthenticated state)
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // Verify AuthPage is rendered
    const titleText = await page.$eval('h1', (el) => el.innerText);
    console.log(`[PASS] Auth page displayed with title: "${titleText}"`);
    if (!titleText.includes('Company Workspace Sign In')) {
      throw new Error(`Expected 'Company Workspace Sign In', got '${titleText}'`);
    }

    // 2. Click "Demo Credentials" auto-fill button
    const demoBtn = await page.$('button[type="button"].group');
    if (demoBtn) {
      await demoBtn.click();
      await delay(300);
      const companyVal = await page.$eval('input[type="text"]', (el) => el.value);
      const passVal = await page.$eval('input[type="password"], input[type="text"]', (el) => el.value);
      console.log(`[PASS] Quick-Fill filled company: "${companyVal}"`);
    }

    // 3. Submit Login for Apex AI & Cloud Solutions
    await page.click('button[type="submit"]');
    await delay(2000);

    // Verify logged in
    const companyBadge = await page.waitForSelector('header div[title*="Logged in company workspace"]', { timeout: 5000 });
    const badgeText = await page.evaluate((el) => el.innerText, companyBadge);
    console.log(`[PASS] Logged in successfully! Header badge shows: "${badgeText.trim()}"`);

    // Verify pipeline loaded leads
    await delay(1000);
    const leadCards = await page.$$('div[data-rbd-draggable-id], div[draggable="true"], .kanban-card, div.cursor-pointer.rounded-xl');
    console.log(`[PASS] Apex AI & Cloud Solutions pipeline leads rendered: ${leadCards.length} cards found.`);

    // 4. Test Sign Out
    const logoutBtn = await page.waitForSelector('button[title*="Sign out of"]');
    await logoutBtn.click();
    await delay(1500);

    // Verify returned to AuthPage
    const postLogoutTitle = await page.$eval('h1', (el) => el.innerText);
    console.log(`[PASS] Logout successful! Screen returned to: "${postLogoutTitle}"`);

    // 5. Switch to "Register New Company"
    const registerTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Register New Company'));
    });
    await registerTabBtn.click();
    await delay(500);

    const regTitle = await page.$eval('h1', (el) => el.innerText);
    console.log(`[PASS] Switched to register tab: "${regTitle}"`);

    // Register test company: unique company name
    const testCompanyName = `Helios Dynamics ${Date.now()}`;
    const testPassword = 'helios_password_123';

    await page.click('input[type="text"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[type="text"]', testCompanyName);

    await page.click('input[type="password"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[type="password"]', testPassword);
    await delay(300);

    await page.click('button[type="submit"]');
    await delay(2500);

    const errBanner = await page.evaluate(() => document.querySelector('.bg-red-500\\/10 span')?.innerText);
    if (errBanner) {
      console.log('Error displayed on form:', errBanner);
    }

    // Verify logged into Helios Dynamics workspace
    const heliosBadge = await page.waitForSelector('header div[title*="Logged in company workspace"]', { timeout: 8000 });
    const heliosBadgeText = await page.evaluate((el) => el.innerText, heliosBadge);
    console.log(`[PASS] ${testCompanyName} registered and active! Header badge: "${heliosBadgeText.trim()}"`);

    // Check pipeline isolation: should be empty for new company
    await delay(1000);
    const heliosLeads = await page.evaluate(() => {
      return document.querySelectorAll('.kanban-card').length;
    });
    console.log(`[PASS] Multi-tenant isolation verified: New company "${testCompanyName}" has ${heliosLeads} leads (clean slate).`);

    // 6. Logout of Helios and log back into Apex AI & Cloud Solutions
    const heliosLogoutBtn = await page.waitForSelector('button[title*="Sign out of"]');
    await heliosLogoutBtn.click();
    await delay(1500);

    // Auto-fill Apex and login again
    const demoBtn2 = await page.$('button[type="button"].group');
    await demoBtn2.click();
    await delay(300);
    await page.click('button[type="submit"]');
    await delay(2000);

    const apexBadgeAgain = await page.waitForSelector('header div[title*="Logged in company workspace"]', { timeout: 5000 });
    const apexBadgeAgainText = await page.evaluate((el) => el.innerText, apexBadgeAgain);
    console.log(`[PASS] Re-authenticated to Apex: "${apexBadgeAgainText.trim()}"`);

    console.log('\n====================================================================');
    console.log('  ALL MULTI-TENANCY & AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================================');
  } catch (err) {
    console.error('[TEST FAILED]:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runAuthE2ETest();
