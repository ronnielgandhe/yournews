// Test script to verify frontend functionality
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📍 Navigating to http://localhost:4321...');
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle2' });
  
  console.log('📝 Page title:', await page.title());
  
  // Listen to console messages
  page.on('console', msg => {
    console.log('🖥️  BROWSER CONSOLE:', msg.text());
  });
  
  // Wait a bit for React to hydrate
  await page.waitForTimeout(2000);
  
  console.log('🔍 Looking for input field...');
  const input = await page.$('input[type="text"]');
  
  if (!input) {
    console.error('❌ Input field not found!');
    await browser.close();
    return;
  }
  
  console.log('✅ Input field found');
  console.log('⌨️  Typing "trump"...');
  await input.type('trump');
  
  await page.waitForTimeout(500);
  
  console.log('↩️  Pressing Enter...');
  await input.press('Enter');
  
  // Wait and observe
  await page.waitForTimeout(5000);
  
  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: '/Users/ronniel/yournews/screenshot.png' });
  
  console.log('✅ Test complete - check console output above');
  
  // Don't close so we can see what happened
  // await browser.close();
})();
