const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'audit-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const baseUrl = 'http://localhost:8083';
  
  // Wait for dev server to be ready
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  
  const routes = [
    { path: '/', name: 'home' },
    { path: '/topic/java?p=01-Fundamentals/01-Java-Fundamentals', name: 'graphs' },
    { path: '/topic/sql?p=01-Fundamentals/01-Select-Basics', name: 'sql' },
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    
    for (const route of routes) {
      await page.goto(baseUrl + route.path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000); // wait for rendering
      
      const filename = `${route.name}-${viewport.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: true });
      console.log(`Captured ${filename}`);
    }
  }
  
  // Also capture dark mode for guide reader
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl + '/topic/java?p=01-Fundamentals/01-Java-Fundamentals', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'graphs-dark-desktop.png'), fullPage: true });
  console.log('Captured graphs-dark-desktop.png');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl + '/topic/java?p=01-Fundamentals/01-Java-Fundamentals', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'graphs-dark-mobile.png'), fullPage: true });
  console.log('Captured graphs-dark-mobile.png');
  
  await browser.close();
  console.log('All screenshots captured!');
}

captureScreenshots().catch(console.error);
