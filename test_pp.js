const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        async function runTest() {
          try {
            console.log('Fetching...');
            const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQd4pEzijIBkmSBSFVxaxiLWm_u5ZLY_T8fF1C2BbPWUXfjj4x1oR0lYsNnBasoBJGpWpqM75r_QBgA/pub?gid=321397987&single=true&output=csv', { cache: 'no-store' });
            console.log('Status: ' + res.status);
            const text = await res.text();
            console.log('Response body preview: ' + text.substring(0, 50).replace(/\n/g, '\\n'));
          } catch(e) {
            console.log('FETCH ERROR: ' + e.message);
          }
        }
        runTest();
      </script>
    </body>
    </html>
  `);
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
