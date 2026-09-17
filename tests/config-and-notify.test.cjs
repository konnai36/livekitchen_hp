const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const config=require('../site.config.cjs');const {render}=require('../server.cjs');const {notify}=require('../notify.cjs');
test('central settings render prices, phone, FAQs and real examples safely',()=>{
 const old={phone:config.phone,examples:config.examples};
 try{
  config.phone='';
  let html=render('{{PHONE_CTA}}{{PRICE_CARDS}}{{FAQ_ITEMS}}{{EXAMPLES}}{{EMAIL_CTA}}{{SOCIAL_LINKS}}');
  assert.ok(!html.includes('tel:'));assert.ok(html.includes('8,000〜30,000円'));assert.ok(html.includes('5,000〜20,000円'));assert.ok(html.includes('mailto:'+config.contactEmail));assert.ok(html.includes('https://x.com/livekitchen_co6'));assert.ok(html.includes('https://www.instagram.com/marcy.cooking/'));assert.ok(!html.includes('CASE STUDIES'));
  config.phone='090-0000-0000';config.examples=[{title:'<script>test</script>',people:'テスト人数',scope:'検証',total:'検証のみ',note:'"&'}];
  html=render('{{PHONE_CTA}}{{EXAMPLES}}');assert.ok(html.includes('tel:09000000000'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 }finally{Object.assign(config,old);}
});
test('website notification worker stays disabled because email is centralized in /cm/',async()=>{
 const old={...process.env};
 try { process.env.MAIL_SENDMAIL_ENABLED='true'; const result=await notify(); assert.equal(result.disabled,true); assert.equal(result.centralized,true); }
 finally { for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old); }
});
