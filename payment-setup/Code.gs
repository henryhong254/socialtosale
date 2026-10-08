const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
const PAID = 'Đã thanh toán';
const ACCOUNT = PropertiesService.getScriptProperties().getProperty('BANK_ACCOUNT');
const HEADERS = ['Thời gian','Mã','Họ tên','SĐT','Email','Gói','Trạng thái','Số tiền cần trả','ID giao dịch SePay','Số tiền nhận','Thời gian xác nhận'];
const REFERRALS = ['baobao','trucle','myphuong','mymy','tony','camtu','quynhanh','kimngan','maianh','anhquoc','tuyettrinh','hungvu','thuydung'];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function sheet_(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!sh.getLastRow()) sh.appendRow(headers);
  else if (name === 'Đăng ký') sh.getRange(1, 8, 1, 4).setValues([HEADERS.slice(7)]);
  return sh;
}
function text_(value) {
  const s = String(value || '').trim().slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function newCode_(rows) {
  let code;
  do { code = 'STS' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
  while (rows.some(row => String(row[1]) === code));
  return code;
}
function price_(p) {
  // Matches the site's currently enabled Early Bird prices.
  const kind = p.packageId;
  if (!['standard', 'premium', 'private'].includes(kind)) throw new Error('invalid packageId');
  let amount = kind === 'standard' ? 6800000 : kind === 'premium' ? 11390000 : 0;
  const coupon = String(p.coupon || '').trim().toLowerCase();
  if (coupon === 'nguoinha') amount *= kind === 'standard' ? 0.6 : 0.7;
  else if (coupon) {
    let valid = REFERRALS.includes(coupon);
    if (!valid) {
      const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQd4pEzijIBkmSBSFVxaxiLWm_u5ZLY_T8fF1C2BbPWUXfjj4x1oR0lYsNnBasoBJGpWpqM75r_QBgA/pub?gid=321397987&single=true&output=csv';
      const response = UrlFetchApp.fetch(url);
      valid = Utilities.parseCsv(response.getContentText()).slice(1).some(row => String(row[1] || '').trim().toLowerCase() === coupon);
    }
    if (!valid) throw new Error('invalid coupon');
    amount *= 0.9;
  }
  return { amount: Math.round(amount), label: kind + (coupon ? ' / ' + coupon : '') };
}
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'register';
  try {
    if (action === 'health') return json_({ok: true, version: 'sts-v1'});
    if (action === 'check') {
      const rows = sheet_('Đăng ký', HEADERS).getDataRange().getValues();
      const row = rows.slice(1).find(row => String(row[1]) === String(p.code));
      return json_({paid: !!row && row[6] === PAID});
    }
    if (!['register','waitlist'].includes(action)) throw new Error('unknown action');
    if (String(p.name || '').trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) throw new Error('invalid contact');
    if (!/^(0|\+84)[0-9]{8,10}$/.test(String(p.phone || '').replace(/[\s-]/g, ''))) throw new Error('invalid phone');
    const quote = action === 'register' ? price_(p) : null;
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (action === 'waitlist') {
        sheet_('Waitlist', ['Thời gian','Họ tên','SĐT','Email']).appendRow([new Date(),text_(p.name),"'" + p.phone,text_(p.email)]);
        return json_({ok: true});
      }
      const sh = sheet_('Đăng ký', HEADERS);
      const code = newCode_(sh.getDataRange().getValues());
      sh.appendRow([new Date(),code,text_(p.name),"'" + p.phone,text_(p.email),quote.label,quote.amount ? 'Chờ thanh toán' : 'Chờ tư vấn',quote.amount,'','','']);
      return json_({ok: true, code: code, amount: quote.amount, version: 'sts-v1'});
    } finally { lock.releaseLock(); }
  } catch (err) { return json_({ok: false, error: String(err.message || err)}); }
}

// Run once in the editor. The secret stays in Script Properties, never in Git or the website.
function setupWebhook() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID') || !props.getProperty('BANK_ACCOUNT')) throw new Error('Set SHEET_ID and BANK_ACCOUNT in Script Properties first.');
  if (!props.getProperty('WEBHOOK_SECRET')) props.setProperty('WEBHOOK_SECRET', Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,''));
  const url = ScriptApp.getService().getUrl();
  if (!url) throw new Error('Deploy as Web app first.');
  console.log('Private SePay webhook URL: ' + url + '?key=' + props.getProperty('WEBHOOK_SECRET'));
}

function doPost(e) {
  try {
    // Apps Script does not expose Authorization headers: authenticate via a private URL token.
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!secret || !e || !e.parameter || e.parameter.key !== secret) throw new Error('unauthorized');
    const body = JSON.parse(e.postData.contents);
    if (body.transferType !== 'in' || String(body.accountNumber) !== ACCOUNT || !/^(MB|MBBANK)$/i.test(String(body.gateway))) throw new Error('wrong bank, account or direction');
    if (!Number.isSafeInteger(Number(body.id)) || Number(body.id) <= 0) throw new Error('invalid transaction id');
    const amount = Number(body.transferAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('invalid amount');
    const content = String(body.content || body.description || '').toUpperCase();
    const matches = [...content.matchAll(/(?:^|[^A-Z0-9])(STS[A-F0-9]{8})(?![A-Z0-9])/g)].map(m => m[1]);
    const codes = [...new Set(matches)];
    if (codes.length !== 1) throw new Error('missing or ambiguous STS code');
    const code = codes[0];
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = sheet_('Đăng ký', HEADERS);
      const rows = sh.getDataRange().getValues();
      const previous = rows.slice(1).find(row => String(row[8]) === String(body.id));
      if (previous) {
        if (previous[1] === code && previous[6] === PAID) return json_({success: true});
        throw new Error('transaction already assigned');
      }
      const index = rows.findIndex((row, i) => i > 0 && row[1] === code);
      if (index < 0) throw new Error('code not found');
      const row = rows[index];
      if (row[6] === PAID) throw new Error('order already paid by another transaction');
      if (!(Number(row[7]) > 0) || amount !== Number(row[7])) throw new Error('amount mismatch; manual review required');
      sh.getRange(index + 1, 7, 1, 5).setValues([[PAID,Number(row[7]),String(body.id),amount,new Date()]]);
      SpreadsheetApp.flush();
      return json_({success: true});
    } finally { lock.releaseLock(); }
  } catch (err) { return json_({success: false, error: String(err.message || err)}); }
}
