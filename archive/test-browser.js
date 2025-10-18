// Test script to check if React is hydrating
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting browser test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen to console logs from the browser
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🚀') || text.includes('⌨️') || text.includes('🔑')) {
      console.log('📱 Browser console:', text);
    }
  });
  
  console.log('📍 Navigating to http://localhost:4321...');
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle2' });
  
  console.log('⏳ Waiting 2 seconds for React to hydrate...');
  await page.waitForTimeout(2000);
  
  // Check if test button exists
  console.log('🔍 Looking for Test button...');
  const testButton = await page.$('button:has-text("Test:")');
  
  if (testButton) {
    console.log('✅ Test button found! Clicking it...');
    const beforeText = await testButton.innerText();
    console.log('   Before click:', beforeText);
    
    await testButton.click();
    await page.waitForTimeout(500);
    
    const afterText = await testButton.innerText();
    console.log('   After click:', afterText);
    
    if (beforeText !== afterText) {
      console.log('✅✅✅ REACT IS WORKING! Button text changed!');
    } else {
      console.log('❌❌❌ REACT NOT WORKING! Button text did not change!');
    }
  } else {
    console.log('❌ Test button not found');
  }
  
  // Try typing in the input
  console.log('🔍 Looking for terminal input...');
  const input = await page.$('input[type="text"]');
  
  if (input) {
    console.log('✅ Input found! Typing "trump"...');
    await input.type('trump');
    await page.waitForTimeout(500);
    
    console.log('⌨️ Pressing Enter...');
    await input.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check if any windows appeared
    const windows = await page.$$('[class*="fixed"][class*="bg-black"]');
    console.log(`   Found ${windows.length} draggable windows`);
    
    if (windows.length > 0) {
      console.log('✅✅✅ SEARCH IS WORKING! Windows appeared!');
    } else {
      console.log('❌ No windows appeared after search');
    }
  } else {
    console.log('❌ Input not found');
  }
  
  console.log('\n📸 Taking screenshot...');
  await page.screenshot({ path: '/Users/ronniel/yournews/test-screenshot.png', fullPage: true });
  console.log('   Saved to: /Users/ronniel/yournews/test-screenshot.png');
  
  console.log('\n⏸️ Keeping browser open for 10 seconds so you can inspect...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('✅ Test complete!');
})().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
