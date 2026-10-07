async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQd4pEzijIBkmSBSFVxaxiLWm_u5ZLY_T8fF1C2BbPWUXfjj4x1oR0lYsNnBasoBJGpWpqM75r_QBgA/pub?gid=321397987&single=true&output=csv&t=' + Date.now();
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n');
  const coupons = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 2) {
      const code = cols[1].replace(/["\r]/g, '').trim().toLowerCase();
      if (code) coupons.push(code);
    }
  }
  console.log(JSON.stringify(coupons));
}
test();
