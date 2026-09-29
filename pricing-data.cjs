module.exports = {
  currency: 'JPY',
  plans: [
    {
      id: 'regular',
      order: '01',
      name: 'Regular',
      label: 'REGULAR',
      price: {from: 13000, to: 13000, unit: 'person'},
      priceLabel: '13,000円',
      topSummary: '旬の食材と黒毛和牛を楽しむ基本のコース',
      description: '旬の魚介や野菜、黒毛和牛を中心に、季節に合わせて組み立てます。',
      dishes: ['旬のフルーツのカプレーゼ', '天然真鯛のストゥファート', '黒毛和牛ロースト'],
      fullDishes: ['旬のフルーツのカプレーゼ', 'イワシのベッカフィーコ', '軍鶏の生ハムインボルティーニ', '天然真鯛のストゥファート', '黒毛和牛ロースト', '本日のパスタ', '本日のデザート']
    },
    {
      id: 'premium',
      order: '02',
      name: 'Premium',
      label: 'PREMIUM',
      price: {from: 20000, to: 20000, unit: 'person'},
      priceLabel: '20,000円',
      topSummary: '特別な食材を、特別な日の一皿へ',
      description: '松阪牛シャトーブリアン、オマール海老、トリュフなど、食材そのものの魅力を味わう上位コースです。',
      dishes: ['オマール海老のジュレ', '金目鯛と魚介のマリネ', '松阪牛シャトーブリアン'],
      fullDishes: ['オマール海老のジュレ', '自家製パン・ジャム・ムース', '金目鯛と魚介のマリネ', '松阪牛シャトーブリアン・トリュフ・卵黄', '本日のパスタ', '本日のデザート']
    },
    {
      id: 'luxury',
      order: '03',
      name: 'Luxury',
      label: 'LUXURY',
      price: {from: 25000, to: null, unit: 'person'},
      priceLabel: '25,000円〜',
      topSummary: '希少食材を組み合わせる特別コース',
      description: 'キャビア、黄金イクラ、雲丹、松茸、田村牛など、希少な食材と手間を惜しまず組み立てます。',
      dishes: ['本鮪のタルターラ・キャビア', '甘鯛・黄金イクラ・雲丹', '田村牛'],
      fullDishes: ['本鮪のタルターラ・キャビア', '季節野菜のパッサータ', '甘鯛・黄金イクラ・雲丹', '田村牛・トリュフ', '松茸・蛤・カラスミの手打ちパスタ', '抹茶のパンナコッタ']
    }
  ],
  options: [
    {id: 'wine-pairing', name: 'ワインペアリング', priceLabel: '＋5,000円 / 人', description: '料理に合わせて赤・白ワインをご用意します。'},
    {id: 'breakfast', name: '朝食作り置き', priceLabel: '＋3,500円 / 人', description: '夕食の仕込みとあわせて翌朝のお食事をご用意します。'},
    {id: 'kids-dinner', name: 'お子様ディナー', priceLabel: '5,500円 / 人', description: 'お子様向けのディナープレートもご相談いただけます。'},
    {id: 'dog-dinner', name: '愛犬用ディナー', priceLabel: '3,500円 / 皿〜', description: '愛犬用のディナープレートや手作りのお食事もご相談いただけます。'}
  ],
  factors: [
    {name: '開催場所', description: '移動距離や会場の設備、搬入条件を確認します。'},
    {name: '人数', description: 'ご希望の人数と料理の提供方法を確認します。'},
    {name: '料理と食材', description: '選ぶコース、旬、仕入れ、ご希望の食材で内容が変わります。'},
    {name: 'オプション', description: 'ワイン、朝食、お子様・愛犬用のお食事などを追加できます。'},
    {name: '提供方法', description: '出張シェフ、ケータリング、設営やサービスの範囲を確認します。'}
  ]
};
