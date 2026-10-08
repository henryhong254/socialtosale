const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let rows;
let uuidCounter = 0;
const sh = {
  getLastRow: () => rows.length,
  appendRow: row => rows.push(row),
  getDataRange: () => ({getValues: () => rows.map(row => row.slice())}),
  getRange: (r,c) => ({setValues: values => values.forEach((row, i) => row.forEach((v,j) => { rows[r - 1 + i][c - 1 + j] = v; }))})
};
const context = vm.createContext({
  console, ContentService: {MimeType: {JSON:'json'}, createTextOutput: x => ({setMimeType: () => JSON.parse(x)})},
  SpreadsheetApp: {openById: () => ({getSheetByName: () => sh}), flush() {}},
  PropertiesService: {getScriptProperties: () => ({getProperty: key => ({WEBHOOK_SECRET:'test-secret',BANK_ACCOUNT:'0123456789',SHEET_ID:'test-sheet'})[key]})},
  LockService: {getScriptLock: () => ({waitLock() {},releaseLock() {}})},
  Utilities: {getUuid: () => (++uuidCounter).toString(16).padStart(8,'0') + '-1234-1234-1234-123456789012'},
  UrlFetchApp: {fetch() { throw Error('Coupon service unavailable'); }}
});
vm.runInContext(readFileSync(require('node:path').join(__dirname,'Code.gs'),'utf8'),context);
function reset() {rows = [['Time','Code','Name','Phone','Email','Package','Status','Amount','Transaction','Received','At']];}
function register(extra = {}) {return context.doGet({parameter: {name:'Test User',phone:'0901234567',email:'test@example.com',packageId:'standard',...extra}});}
function event(code, extra = {}, key = 'test-secret') {
  return {parameter:{key},postData:{contents:JSON.stringify({id:123,gateway:'MBBank',accountNumber:'0123456789',transferType:'in',transferAmount:6800000,content:code,...extra})}};
}
reset();
let order = register();
assert.match(order.code,/^STS[A-F0-9]{8}$/);
assert.equal(order.amount,6800000);
assert.equal(context.doGet({parameter:{action:'check',code:order.code}}).paid,false);
for (const e of [event(order.code,{},'wrong'),event(order.code,{transferAmount:1}),event(order.code,{transferType:'out'}),event(order.code,{accountNumber:'other'}),event(order.code,{gateway:'Other'}),event(order.code,{id:0}),event(order.code,{content:order.code+'A'}),event(order.code,{content:order.code+' STSFFFFFFFF'})]) {
  assert.equal(context.doPost(e).success,false);
  assert.equal(rows[1][6],'Chờ thanh toán');
}
assert.equal(context.doPost(event(order.code)).success,true);
assert.equal(context.doPost(event(order.code)).success,true);
assert.equal(context.doGet({parameter:{action:'check',code:order.code}}).paid,true);
const second = register();
assert.equal(context.doPost(event(second.code)).success,false);
assert.equal(rows[2][6],'Chờ thanh toán');
assert.equal(register({coupon:'nguoinha'}).amount,4080000);
assert.equal(register({packageId:'premium',coupon:'nguoinha'}).amount,7973000);
assert.equal(register({coupon:'tony'}).amount,6120000);
assert.equal(register({packageId:'private'}).amount,0);
assert.equal(register({packageId:'invalid'}).ok,false);
assert.equal(register({coupon:'unknown'}).ok,false);
assert.equal(register({amount:'1'}).amount,6800000);
console.log('PASS: STS registration, prices, invalid callbacks, exact amount, idempotency, transaction reuse, and payment status. No network or real Sheet writes.');
