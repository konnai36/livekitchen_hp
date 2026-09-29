// Public content. Edit here, then restart italian-school.service.
module.exports = {
  origin: 'https://livekitchen.tokyo',
  origins: ['https://livekitchen.tokyo', 'https://kitchen.okayu-llc.jp'],
  analytics: {
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID?.trim() || ''
  },
  // Per-site public/notification address. Prefer CONTACT_EMAIL in the service EnvironmentFile.
  contactEmail: process.env.CONTACT_EMAIL || 'livekitchen.co@gmail.com',
  phone: '080-9811-1888',
  instagram: 'https://www.instagram.com/marcy.cooking/',
  x: 'https://x.com/livekitchen_co6',
  prices: [
    {name:'出張シェフ', english:'PRIVATE CHEF', amount:'8,000〜30,000円', unit:'お一人様・税込', description:'ご自宅や会場へ伺い、調理から仕上げまで。記念日や大切な会食に。'},
    {name:'ケータリング', english:'CATERING', amount:'5,000〜20,000円', unit:'お一人様・税込', description:'カジュアルな集まりから華やかなパーティーまで。人数や会場に合わせてご提案。'},
    {name:'法人・大型イベント', english:'CORPORATE EVENTS', amount:'ご予算に合わせてお見積り', unit:'人数・会場・提供内容に応じて', description:'懇親会、レセプション、周年イベントなど。料理・設営・サービスの範囲もご相談ください。'},
    {name:'完全オーダーメイド', english:'BESPOKE', amount:'ご希望からプランをご提案', unit:'食材・テーマ・演出をご相談', description:'「こんな料理を出したい」から、一緒に。ご希望とご予算を伺って組み立てます。'}
  ],
  // Add only verified real requests. No placeholder prices are rendered.
  // {title:'...', people:'...', scope:'...', total:'...', note:'...'}
  examples: [],
  faq: [
    ['何名から依頼できますか？','ご希望人数をお知らせください。出張先や料理内容を伺い、対応できるプランをご案内します。'],
    ['どの地域まで来てもらえますか？','開催場所を添えてご相談ください。日程・移動距離・会場条件を確認して、対応可否と出張にかかる費用をご案内します。'],
    ['キッチンがない会場でも可能ですか？','設備や搬入条件によって、提供できる料理や仕上げ方が変わります。キッチン・電源・水道など、分かる範囲で会場の状況をお知らせください。'],
    ['予算から相談できますか？','はい。人数とおおよそのご予算からご相談いただけます。料理内容や提供方法を、ご予算に合わせてご提案します。'],
    ['アレルギーや食事制限は相談できますか？','事前にご相談ください。対象食材や必要な配慮を確認し、対応可否をご案内します。ハラールなどの食事制限も、必要条件を伺って個別に確認します。すべての制限への対応や、微量混入の防止を一律に保証するものではありません。'],
    ['法人名義の見積書・請求書について相談できますか？','必要な書類・宛名・お支払い条件をお知らせください。発行内容や手続きについて、ご依頼前に確認してご案内します。'],
    ['料理内容は相談できますか？','はい。好きな食材、苦手なもの、お子様向けの料理、お祝いの演出など、料理を作る側と直接ご相談いただけます。'],
    ['キャンセルについて教えてください。','日程変更・キャンセルの条件は、ご依頼内容に応じてお見積り時にご案内します。内容をご確認のうえ、お申し込みください。']
  ]
};
