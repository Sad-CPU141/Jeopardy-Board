/* Jeopardy-Board clue bank c09764e99b — built from src/bank/ by build.js. Edit src/bank/, not this file. */
/* ---- bank/00-runtime.js ---- */
/* ============================================================
   CLUE BANK — runtime for the data files in src/bank/.
   build.js joins src/bank/*.js (in name order) into bank.js, which
   index.html loads before app.js. The game reads window.JB_BANK.
   Clue history (what's been seen) is stored separately on the device.
   Same row format as Khatfa's question bank, with five values.

   Category meta: { g: group, e: emoji, en, ar, subs, pop: 1 = broadly popular, niche: 1 = specialist topic }
   Writing clues (one row per clue):
     ['id', value, 'Clue (English)', 'التلميح (عربي)', 'Response', 'الإجابة', { options }]
   The clue is a STATEMENT; the response is the short answer ("Rome", not "What is Rome?").
   value: 200 · 400 · 600 · 800 · 1000 = difficulty row 1–5 (easiest → hardest).
     The host can change the points in setup; the row (difficulty) stays the same.
   options (all optional):
     s:   subcategory key (from the category's subs)
     alt: other acceptable responses, English  (string or array)
     altAr: other acceptable responses, Arabic
     n / nAr: a short note shown after the response
     r:   where to verify it (a Wikipedia article title, or a full URL)
     v:   'web:YYYY-MM-DD' ONLY when the fact was actually checked online on that date
     f:   fact key(s) — clues sharing a key give each other away and never share a game
     c:   1 = time-sensitive; must also have asOf
     asOf:'YYYY-MM' the date the response was true
     ok:  1 = a person reviewed this clue's audit warnings
   Clue ids are permanent: never reuse or renumber them.
   ============================================================ */
(function () {
  var B = window.JB_BANK = { groups: [], cats: [], clues: [], errors: [] };
  var VALUES = { 200: 1, 400: 2, 600: 3, 800: 4, 1000: 5 };
  B.group = function (id, emoji, en, ar) { B.groups.push({ id: id, emoji: emoji, name: { en: en, ar: ar } }); };
  var arr = function (v) { return v == null ? [] : Array.isArray(v) ? v : [v]; };
  B.cat = function (id, meta, rows) {
    var subs = {};
    Object.keys(meta.subs || {}).forEach(function (k) { subs[k] = { en: meta.subs[k][0], ar: meta.subs[k][1] }; });
    var c = { id: id, group: meta.g, emoji: meta.e, name: { en: meta.en, ar: meta.ar }, subs: subs, count: [0, 0, 0, 0, 0], popular: meta.pop ? 1 : 0, nicheTopic: meta.niche ? 1 : 0 };
    B.cats.push(c);
    addRows(c, rows);
  };
  // More clues for a category defined elsewhere.
  B.more = function (id, rows) {
    var c = B.cats.filter(function (x) { return x.id === id; })[0];
    if (!c) { B.errors.push('more(): unknown category "' + id + '"'); return; }
    addRows(c, rows);
  };
  function addRows(c, rows) {
    var id = c.id, subs = c.subs;
    rows.forEach(function (row) {
      var o = row[6] || {};
      var tier = VALUES[row[1]];
      var q = {
        id: id + '.' + row[0], cat: id, tier: tier || 0, points: row[1], sub: o.s || null,
        q: { en: row[2], ar: row[3] }, a: { en: row[4], ar: row[5] },
        alt: { en: arr(o.alt), ar: arr(o.altAr) },
        note: o.n || o.nAr ? { en: o.n || '', ar: o.nAr || '' } : null,
        ref: o.r || null, verified: o.v || null,
        facts: arr(o.f), reviewed: o.ok ? 1 : 0, check: o.c ? 1 : 0, asOf: o.asOf || null,
      };
      if (!tier) B.errors.push(q.id + ': value must be 200, 400, 600, 800 or 1000 (got ' + row[1] + ')');
      if (q.sub && !subs[q.sub]) B.errors.push(q.id + ': unknown subcategory "' + q.sub + '"');
      if (tier) c.count[tier - 1]++;
      B.clues.push(q);
    });
  }
})();

/* ---- bank/01-groups.js ---- */
/* Topic groups: how categories are organised in the category picker, and how a board
   is kept varied (each board prefers categories from different groups).
   The bank is international; Arab-world topics have their own category and also appear
   across the others, at roughly 10–12% of all clues (npm run audit reports the share). */
JB_BANK.group('geo', '🌍', 'Geography', 'جغرافيا');
JB_BANK.group('history', '🏛️', 'History & myths', 'تاريخ وأساطير');
JB_BANK.group('science', '🔬', 'Science & tech', 'علوم وتقنية');
JB_BANK.group('nature', '🐾', 'Nature', 'طبيعة');
JB_BANK.group('food', '🍽️', 'Food & drink', 'أكل ومشروبات');
JB_BANK.group('screen', '🎬', 'Movies & animation', 'أفلام ورسوم متحركة');
JB_BANK.group('music', '🎵', 'Music', 'موسيقى');
JB_BANK.group('sports', '🏆', 'Sports', 'رياضة');
JB_BANK.group('games', '🎮', 'Games', 'ألعاب');
JB_BANK.group('words', '📚', 'Words, books & art', 'لغة وكتب وفن');
JB_BANK.group('arab', '🌙', 'Arab world', 'العالم العربي');

/* ---- bank/10-geo.js ---- */
/* Geography. Row values are difficulty rows: 200 easiest … 1000 hardest. */
JB_BANK.cat('capitals', { g: 'geo', pop: 1, e: '🏙️', en: 'World Capitals', ar: 'عواصم العالم' }, [
  ['c01', 200, 'This city on the River Seine is the capital of France.', 'هذه المدينة الواقعة على نهر السين هي عاصمة فرنسا.', 'Paris', 'باريس', { r: 'Paris' }],
  ['c02', 200, 'Japan’s capital, it was called Edo until 1868.', 'عاصمة اليابان، وكان اسمها «إيدو» حتى عام ١٨٦٨.', 'Tokyo', 'طوكيو', { r: 'Tokyo' }],
  ['c03', 200, 'The capital of Saudi Arabia, in the Najd region.', 'عاصمة المملكة العربية السعودية، في منطقة نجد.', 'Riyadh', 'الرياض', { r: 'Riyadh' }],
  ['c04', 200, 'The capital of Spain, right in the middle of the country.', 'عاصمة إسبانيا، وتقع في وسط البلاد تماماً.', 'Madrid', 'مدريد', { r: 'Madrid' }],
  ['c05', 400, 'Not Sydney or Melbourne: this purpose-built city is Australia’s capital.', 'ليست سيدني ولا ملبورن: هذه المدينة المخططة هي عاصمة أستراليا.', 'Canberra', 'كانبرا', { r: 'Canberra' }],
  ['c06', 400, 'Canada’s capital, in the province of Ontario.', 'عاصمة كندا، في مقاطعة أونتاريو.', 'Ottawa', 'أوتاوا', { r: 'Ottawa' }],
  ['c07', 400, 'Turkey’s capital since 1923 — not Istanbul.', 'عاصمة تركيا منذ عام ١٩٢٣، وليست إسطنبول.', 'Ankara', 'أنقرة', { r: 'Ankara' }],
  ['c08', 400, 'The capital of South Korea, home to about half the country’s people with its metro area.', 'عاصمة كوريا الجنوبية، ويعيش في منطقتها الحضرية نحو نصف سكان البلاد.', 'Seoul', 'سيول', { r: 'Seoul' }],
  ['c09', 600, 'Brazil moved its capital to this planned city from Rio de Janeiro in 1960.', 'نقلت البرازيل عاصمتها من ريو دي جانيرو إلى هذه المدينة المخططة عام ١٩٦٠.', 'Brasília', 'برازيليا', { r: 'Brasília' }],
  ['c10', 600, 'Switzerland’s seat of government, officially called the “federal city”.', 'مقر حكومة سويسرا، ويسمى رسمياً «المدينة الاتحادية».', 'Bern', 'برن', { alt: ['Berne'], r: 'Bern' }],
  ['c11', 600, 'This city replaced Lagos as Nigeria’s capital in 1991.', 'حلّت هذه المدينة محل لاغوس عاصمةً لنيجيريا عام ١٩٩١.', 'Abuja', 'أبوجا', { r: 'Abuja' }],
  ['c12', 600, 'New Zealand’s capital, at the southern tip of the North Island.', 'عاصمة نيوزيلندا، في الطرف الجنوبي من الجزيرة الشمالية.', 'Wellington', 'ويلينغتون', { r: 'Wellington' }],
  ['c13', 800, 'Kazakhstan’s capital was renamed Nur-Sultan in 2019, then got this name back in 2022.', 'غُيّر اسم عاصمة كازاخستان إلى «نور سلطان» عام ٢٠١٩، ثم عادت إلى هذا الاسم عام ٢٠٢٢.', 'Astana', 'أستانا', { r: 'Astana' }],
  ['c14', 800, 'La Paz is Bolivia’s seat of government; this city is its constitutional capital.', 'لاباز مقر حكومة بوليفيا، أما هذه المدينة فهي عاصمتها الدستورية.', 'Sucre', 'سوكري', { r: 'Sucre' }],
  ['c15', 800, 'Founded by Spanish conquistador Francisco Pizarro in 1535, it is the capital of Peru.', 'أسسها الفاتح الإسباني فرانسيسكو بيزارو عام ١٥٣٥، وهي عاصمة بيرو.', 'Lima', 'ليما', { r: 'Lima' }],
  ['c16', 800, 'Vietnam’s capital, in the north on the Red River.', 'عاصمة فيتنام، في الشمال على النهر الأحمر.', 'Hanoi', 'هانوي', { r: 'Hanoi' }],
  ['c17', 1000, 'This purpose-built city replaced Yangon as Myanmar’s capital in 2005–06.', 'حلّت هذه المدينة المبنية خصيصاً محل يانغون عاصمةً لميانمار عام ٢٠٠٥–٢٠٠٦.', 'Naypyidaw', 'نايبيداو', { alt: ['Nay Pyi Taw'], r: 'Naypyidaw' }],
  ['c18', 1000, 'The capital of the Himalayan kingdom of Bhutan.', 'عاصمة مملكة بوتان في جبال الهيمالايا.', 'Thimphu', 'تيمفو', { r: 'Thimphu' }],
  ['c19', 1000, 'Abidjan is Côte d’Ivoire’s biggest city, but this is its official capital.', 'أبيدجان أكبر مدن ساحل العاج، لكن هذه المدينة عاصمتها الرسمية.', 'Yamoussoukro', 'ياموسوكرو', { r: 'Yamoussoukro' }],
  ['c20', 1000, 'Mongolia’s capital, whose name means “red hero”.', 'عاصمة منغوليا، ويعني اسمها «البطل الأحمر».', 'Ulaanbaatar', 'أولان باتور', { alt: ['Ulan Bator'], r: 'Ulaanbaatar' }],
]);

JB_BANK.cat('landmarks', { g: 'geo', pop: 1, e: '🗼', en: 'Famous Landmarks', ar: 'معالم شهيرة' }, [
  ['l01', 200, 'This wrought-iron tower in Paris was built for the 1889 World’s Fair.', 'بُني هذا البرج الحديدي في باريس لمعرض باريس الدولي عام ١٨٨٩.', 'The Eiffel Tower', 'برج إيفل', { r: 'Eiffel Tower' }],
  ['l02', 200, 'Rome’s great ancient amphitheatre, also called the Flavian Amphitheatre.', 'المدرج الروماني القديم الكبير في روما، ويسمى أيضاً المدرج الفلافي.', 'The Colosseum', 'الكولوسيوم', { r: 'Colosseum' }],
  ['l03', 200, 'This Dubai skyscraper has been the world’s tallest building since it opened in 2010.', 'ناطحة السحاب هذه في دبي هي أطول مبنى في العالم منذ افتتاحها عام ٢٠١٠.', 'Burj Khalifa', 'برج خليفة', { c: 1, asOf: '2026-06', r: 'Burj Khalifa' }],
  ['l04', 200, 'A gift from France, this copper statue stands in New York Harbor.', 'هدية من فرنسا، يقف هذا التمثال النحاسي في ميناء نيويورك.', 'The Statue of Liberty', 'تمثال الحرية', { r: 'Statue of Liberty' }],
  ['l05', 400, 'Emperor Shah Jahan built this white marble tomb in Agra for his wife Mumtaz Mahal.', 'بنى الإمبراطور شاه جهان هذا الضريح الرخامي الأبيض في أغرا لزوجته ممتاز محل.', 'The Taj Mahal', 'تاج محل', { r: 'Taj Mahal' }],
  ['l06', 400, 'The ancient city of Petra, carved into rose-red rock, is in this country.', 'مدينة البتراء القديمة المنحوتة في الصخر الوردي تقع في هذا البلد.', 'Jordan', 'الأردن', { r: 'Petra' }],
  ['l07', 400, 'London’s clock tower was renamed Elizabeth Tower in 2012, but most people call it by the name of its great bell.', 'أُعيدت تسمية برج الساعة في لندن «برج إليزابيث» عام ٢٠١٢، لكن معظم الناس يسمونه باسم جرسه الكبير.', 'Big Ben', 'بيغ بن', { r: 'Big Ben' }],
  ['l08', 400, 'This 15th-century Inca citadel sits high in the Andes of Peru.', 'تقع هذه القلعة الإنكية من القرن الخامس عشر عالياً في جبال الأنديز في بيرو.', 'Machu Picchu', 'ماتشو بيتشو', { r: 'Machu Picchu' }],
  ['l09', 600, 'Antoni Gaudí’s basilica in Barcelona, on which work began in 1882.', 'كنيسة أنطوني غاودي الكبرى في برشلونة، التي بدأ بناؤها عام ١٨٨٢.', 'The Sagrada Família', 'ساغرادا فاميليا', { r: 'Sagrada Família' }],
  ['l10', 600, 'This temple complex in Cambodia is the largest religious monument in the world.', 'هذا المجمّع المعبدي في كمبوديا هو أكبر معلم ديني في العالم.', 'Angkor Wat', 'أنغكور وات', { r: 'Angkor Wat' }],
  ['l11', 600, 'The Great Pyramid of Giza was built as the tomb of this pharaoh.', 'بُني الهرم الأكبر في الجيزة مقبرةً لهذا الفرعون.', 'Khufu', 'خوفو', { alt: ['Cheops'], altAr: ['خيوبس'], r: 'Great Pyramid of Giza' }],
  ['l12', 600, 'This cathedral with colourful onion domes stands on Moscow’s Red Square.', 'تقف هذه الكاتدرائية ذات القباب البصلية الملونة في الساحة الحمراء بموسكو.', 'St Basil’s Cathedral', 'كاتدرائية القديس باسيل', { r: 'Saint Basil\'s Cathedral' }],
  ['l13', 800, 'This Istanbul building was a cathedral, then a mosque, then a museum, and became a mosque again in 2020.', 'كان هذا المبنى في إسطنبول كاتدرائية ثم مسجداً ثم متحفاً، وعاد مسجداً عام ٢٠٢٠.', 'Hagia Sophia', 'آيا صوفيا', { r: 'Hagia Sophia' }],
  ['l14', 800, 'The giant stone figures of Easter Island are known by this name.', 'تُعرف التماثيل الحجرية العملاقة في جزيرة القيامة بهذا الاسم.', 'Moai', 'مواي', { r: 'Moai' }],
  ['l15', 800, 'This Nabataean city of rock-cut tombs near AlUla became Saudi Arabia’s first UNESCO World Heritage Site in 2008.', 'أصبحت هذه المدينة النبطية ذات المقابر المنحوتة في الصخر قرب العُلا أول موقع سعودي في قائمة التراث العالمي لليونسكو عام ٢٠٠٨.', 'Hegra', 'الحِجر', { alt: ['Al-Hijr', 'Mada’in Salih'], altAr: ['مدائن صالح'], r: 'Hegra (Mada\'in Salih)' }],
  ['l16', 800, 'Danish architect Jørn Utzon designed this Australian building with its sail-like shells.', 'صمّم المعماري الدنماركي يورن أوتزون هذا المبنى الأسترالي ذا الأصداف الشبيهة بالأشرعة.', 'The Sydney Opera House', 'دار أوبرا سيدني', { r: 'Sydney Opera House' }],
  ['l17', 1000, 'This giant bronze statue of the sun god Helios, one of the Seven Wonders, stood at a harbour on a Greek island.', 'هذا التمثال البرونزي العملاق لإله الشمس هيليوس، إحدى عجائب الدنيا السبع، كان قائماً عند ميناء جزيرة يونانية.', 'The Colossus of Rhodes', 'تمثال رودس العملاق', { r: 'Colossus of Rhodes' }],
  ['l18', 1000, 'The step pyramid at Chichén Itzá, El Castillo, is dedicated to this feathered serpent god.', 'الهرم المدرّج في تشيتشن إيتزا، «إل كاستيو»، مكرّس لهذا الإله الأفعى المريّشة.', 'Kukulcán', 'كوكولكان', { alt: ['Quetzalcoatl'], r: 'El Castillo, Chichen Itza' }],
  ['l19', 1000, 'Rio’s Christ the Redeemer statue, completed in 1931, stands on top of this mountain.', 'يقف تمثال المسيح الفادي في ريو، الذي اكتمل عام ١٩٣١، على قمة هذا الجبل.', 'Corcovado', 'كوركوفادو', { r: 'Corcovado' }],
  ['l20', 1000, 'Opened in 2007 in Abu Dhabi, this mosque has one of the largest hand-knotted carpets in the world.', 'افتُتح هذا المسجد في أبوظبي عام ٢٠٠٧، وفيه واحدة من أكبر السجادات المعقودة يدوياً في العالم.', 'The Sheikh Zayed Grand Mosque', 'جامع الشيخ زايد الكبير', { r: 'Sheikh Zayed Grand Mosque' }],
]);

JB_BANK.cat('rivers-peaks', { g: 'geo', pop: 1, e: '🏔️', en: 'Rivers, Lakes & Peaks', ar: 'أنهار وبحيرات وجبال' }, [
  ['r01', 200, 'The highest mountain on Earth above sea level.', 'أعلى جبل على وجه الأرض فوق مستوى سطح البحر.', 'Mount Everest', 'جبل إيفرست', { r: 'Mount Everest' }],
  ['r02', 200, 'Africa’s longest river, flowing north into the Mediterranean.', 'أطول أنهار أفريقيا، ويجري شمالاً حتى البحر المتوسط.', 'The Nile', 'النيل', { r: 'Nile' }],
  ['r03', 200, 'This South American river carries more water than any other river on Earth.', 'يحمل هذا النهر في أمريكا الجنوبية مياهاً أكثر من أي نهر آخر على الأرض.', 'The Amazon', 'الأمازون', { r: 'Amazon River' }],
  ['r04', 200, 'The river that flows through the middle of London.', 'النهر الذي يجري في وسط لندن.', 'The Thames', 'التايمز', { r: 'River Thames' }],
  ['r05', 400, 'Africa’s highest mountain, a dormant volcano in Tanzania.', 'أعلى جبل في أفريقيا، وهو بركان خامد في تنزانيا.', 'Mount Kilimanjaro', 'جبل كليمنجارو', { r: 'Mount Kilimanjaro' }],
  ['r06', 400, 'This river flows through Vienna, Budapest and Belgrade on its way to the Black Sea.', 'يجري هذا النهر عبر فيينا وبودابست وبلغراد في طريقه إلى البحر الأسود.', 'The Danube', 'الدانوب', { r: 'Danube' }],
  ['r07', 400, 'This mountain range runs along the border between France and Spain.', 'تمتد هذه السلسلة الجبلية على طول الحدود بين فرنسا وإسبانيا.', 'The Pyrenees', 'جبال البرانس', { r: 'Pyrenees' }],
  ['r08', 400, 'Ancient Mesopotamia lay between the Tigris and this river.', 'كانت بلاد الرافدين القديمة تقع بين نهر دجلة وهذا النهر.', 'The Euphrates', 'الفرات', { r: 'Euphrates' }],
  ['r09', 600, 'The highest mountain in the Americas, in Argentina.', 'أعلى جبل في الأمريكتين، ويقع في الأرجنتين.', 'Aconcagua', 'أكونكاغوا', { r: 'Aconcagua' }],
  ['r10', 600, 'China’s longest river, and the longest in Asia.', 'أطول أنهار الصين، وأطول نهر في آسيا.', 'The Yangtze', 'اليانغتسي', { r: 'Yangtze' }],
  ['r11', 600, 'Mont Blanc is the highest peak of this mountain range.', 'مون بلان هي أعلى قمة في هذه السلسلة الجبلية.', 'The Alps', 'جبال الألب', { r: 'Mont Blanc' }],
  ['r12', 600, 'The world’s second-highest mountain, on the border of Pakistan and China.', 'ثاني أعلى جبل في العالم، على الحدود بين باكستان والصين.', 'K2', 'كي ٢', { r: 'K2' }],
  ['r13', 800, 'The deepest lake in the world, in Siberia.', 'أعمق بحيرة في العالم، وتقع في سيبيريا.', 'Lake Baikal', 'بحيرة بايكال', { r: 'Lake Baikal' }],
  ['r14', 800, 'Africa’s second-longest river, it crosses the equator twice.', 'ثاني أطول نهر في أفريقيا، ويعبر خط الاستواء مرتين.', 'The Congo', 'نهر الكونغو', { r: 'Congo River' }],
  ['r15', 800, 'The highest mountain on the Arabian Peninsula, Jabal an-Nabi Shu’ayb, is in this country.', 'أعلى جبل في شبه الجزيرة العربية، جبل النبي شعيب، يقع في هذا البلد.', 'Yemen', 'اليمن', { r: 'Jabal an-Nabi Shu\'ayb' }],
  ['r16', 800, 'This river forms much of the border between the United States and Mexico.', 'يشكّل هذا النهر جزءاً كبيراً من الحدود بين الولايات المتحدة والمكسيك.', 'The Rio Grande', 'ريو غراندي', { alt: ['Río Bravo'], r: 'Rio Grande' }],
  ['r17', 1000, 'Europe’s longest river, it flows into the Caspian Sea.', 'أطول أنهار أوروبا، ويصب في بحر قزوين.', 'The Volga', 'الفولغا', { r: 'Volga' }],
  ['r18', 1000, 'The Okavango River ends not in a sea but in a vast inland delta in this country.', 'لا ينتهي نهر أوكافانغو في بحر، بل في دلتا داخلية واسعة في هذا البلد.', 'Botswana', 'بوتسوانا', { r: 'Okavango Delta' }],
  ['r19', 1000, 'The Blue Nile flows out of this lake in Ethiopia.', 'يخرج النيل الأزرق من هذه البحيرة في إثيوبيا.', 'Lake Tana', 'بحيرة تانا', { r: 'Lake Tana' }],
  ['r20', 1000, 'The Mekong River rises on this high plateau.', 'ينبع نهر الميكونغ من هذه الهضبة المرتفعة.', 'The Tibetan Plateau', 'هضبة التبت', { alt: ['Tibet'], altAr: ['التبت'], r: 'Mekong' }],
]);

JB_BANK.cat('countries', { g: 'geo', pop: 1, e: '🗺️', en: 'Countries of the World', ar: 'دول العالم' }, [
  ['n01', 200, 'On a map, this European country looks like a boot.', 'تبدو هذه الدولة الأوروبية على الخريطة مثل حذاء طويل.', 'Italy', 'إيطاليا', { r: 'Italy' }],
  ['n02', 200, 'The largest country in the world by area.', 'أكبر دولة في العالم من حيث المساحة.', 'Russia', 'روسيا', { r: 'Russia' }],
  ['n03', 200, 'Kangaroos and koalas are native to this country.', 'الكنغر والكوالا من الحيوانات الأصلية في هذا البلد.', 'Australia', 'أستراليا', { r: 'Australia' }],
  ['n04', 200, 'South America’s largest country by area and by population.', 'أكبر دولة في أمريكا الجنوبية مساحةً وسكاناً.', 'Brazil', 'البرازيل', { r: 'Brazil' }],
  ['n05', 400, 'This Scandinavian country, famous for its fjords, has Oslo as its capital.', 'هذه الدولة الإسكندنافية المشهورة بمضائقها البحرية عاصمتها أوسلو.', 'Norway', 'النرويج', { r: 'Norway' }],
  ['n06', 400, 'This large island country in the Indian Ocean is the only natural home of lemurs.', 'هذه الدولة الجزيرة الكبيرة في المحيط الهندي هي الموطن الطبيعي الوحيد لحيوانات الليمور.', 'Madagascar', 'مدغشقر', { r: 'Madagascar' }],
  ['n07', 400, 'With more than 17,000 islands, this is the world’s largest archipelago country.', 'بأكثر من ١٧ ألف جزيرة، هذه أكبر دولة أرخبيلية في العالم.', 'Indonesia', 'إندونيسيا', { r: 'Indonesia' }],
  ['n08', 400, 'The smallest country in the world, entirely surrounded by Rome.', 'أصغر دولة في العالم، وتحيط بها روما من كل الجهات.', 'Vatican City', 'الفاتيكان', { r: 'Vatican City' }],
  ['n09', 600, 'In 2023 the UN estimated that this country had overtaken China as the most populous.', 'في عام ٢٠٢٣ قدّرت الأمم المتحدة أن هذا البلد تجاوز الصين ليصبح الأكثر سكاناً.', 'India', 'الهند', { r: 'Demographics of India' }],
  ['n10', 600, 'Apart from an Italian occupation in 1936–41, this East African country was never colonised.', 'باستثناء احتلال إيطالي بين ١٩٣٦ و١٩٤١، لم تُستعمر هذه الدولة في شرق أفريقيا قط.', 'Ethiopia', 'إثيوبيا', { r: 'Ethiopia' }],
  ['n11', 600, 'This mountain kingdom is completely surrounded by South Africa.', 'هذه المملكة الجبلية محاطة بالكامل بجنوب أفريقيا.', 'Lesotho', 'ليسوتو', { r: 'Lesotho' }],
  ['n12', 600, 'This peninsula country hosted the 2022 FIFA World Cup.', 'استضافت هذه الدولة الواقعة على شبه جزيرة كأس العالم ٢٠٢٢.', 'Qatar', 'قطر', { f: 'wc2022-host', r: '2022 FIFA World Cup' }],
  ['n13', 800, 'This is the only country whose national flag is not a rectangle.', 'هذه هي الدولة الوحيدة التي ليس علمها الوطني مستطيلاً.', 'Nepal', 'نيبال', { r: 'Flag of Nepal' }],
  ['n14', 800, 'This small country in the Pyrenees has two co-princes: the French president and a Spanish bishop.', 'لهذه الدولة الصغيرة في جبال البرانس أميران مشتركان: رئيس فرنسا وأسقف إسباني.', 'Andorra', 'أندورا', { r: 'Andorra' }],
  ['n15', 800, 'This country has the longest coastline in the world.', 'هذه الدولة لديها أطول خط ساحلي في العالم.', 'Canada', 'كندا', { r: 'List of countries by length of coastline' }],
  ['n16', 800, 'This island country was known as Ceylon until 1972.', 'كانت هذه الدولة الجزيرة تُعرف باسم سيلان حتى عام ١٩٧٢.', 'Sri Lanka', 'سريلانكا', { r: 'Sri Lanka' }],
  ['n17', 1000, 'Only two countries are doubly landlocked: Liechtenstein and this one in Central Asia.', 'هناك دولتان فقط محاطتان باليابسة مرتين: ليختنشتاين وهذه الدولة في آسيا الوسطى.', 'Uzbekistan', 'أوزبكستان', { r: 'Landlocked country' }],
  ['n18', 1000, 'Swaziland changed its name to this in 2018.', 'غيّرت سوازيلاند اسمها إلى هذا الاسم عام ٢٠١٨.', 'Eswatini', 'إسواتيني', { r: 'Eswatini' }],
  ['n19', 1000, 'The West African country once called Dahomey.', 'الدولة الواقعة في غرب أفريقيا التي كانت تُسمى داهومي.', 'Benin', 'بنين', { r: 'Benin' }],
  ['n20', 1000, 'Upper Volta took this name, meaning “land of upright people”, in 1984.', 'اتخذت فولتا العليا هذا الاسم، ومعناه «أرض الناس المستقيمين»، عام ١٩٨٤.', 'Burkina Faso', 'بوركينا فاسو', { r: 'Burkina Faso' }],
]);

/* ---- bank/20-history.js ---- */
/* History and myths. */
JB_BANK.cat('ancient', { g: 'history', pop: 1, e: '🏺', en: 'The Ancient World', ar: 'العالم القديم' }, [
  ['a01', 200, 'The kings of ancient Egypt were known by this title.', 'كان ملوك مصر القديمة يُعرفون بهذا اللقب.', 'Pharaoh', 'فرعون', { alt: ['Pharaohs'], altAr: ['الفراعنة'], r: 'Pharaoh' }],
  ['a02', 200, 'The ancient Olympic Games were held at Olympia in this country.', 'أُقيمت الألعاب الأولمبية القديمة في أولمبيا في هذا البلد.', 'Greece', 'اليونان', { r: 'Ancient Olympic Games' }],
  ['a03', 200, 'Built over many centuries to guard China’s northern frontier, it is the longest structure ever built.', 'بُني على مدى قرون لحماية الحدود الشمالية للصين، وهو أطول بناء شُيّد على الإطلاق.', 'The Great Wall', 'سور الصين العظيم', { r: 'Great Wall of China' }],
  ['a04', 200, 'This Roman town was buried by the eruption of Mount Vesuvius in AD 79.', 'دُفنت هذه المدينة الرومانية تحت ثوران بركان فيزوف عام ٧٩ للميلاد.', 'Pompeii', 'بومبي', { r: 'Pompeii' }],
  ['a05', 400, 'The Rosetta Stone helped scholars finally read this ancient Egyptian script.', 'ساعد حجر رشيد العلماء أخيراً على قراءة هذه الكتابة المصرية القديمة.', 'Hieroglyphs', 'الهيروغليفية', { alt: ['Hieroglyphics'], f: 'rosetta', r: 'Rosetta Stone' }],
  ['a06', 400, 'Legend says Romulus founded this city in 753 BC.', 'تقول الأسطورة إن رومولوس أسس هذه المدينة عام ٧٥٣ قبل الميلاد.', 'Rome', 'روما', { r: 'Founding of Rome' }],
  ['a07', 400, 'This general from Carthage crossed the Alps with war elephants to attack Rome.', 'عبر هذا القائد القرطاجي جبال الألب بالفيلة الحربية لمهاجمة روما.', 'Hannibal', 'هانيبال', { r: 'Hannibal' }],
  ['a08', 400, 'This Greek writer from Halicarnassus is called the Father of History.', 'هذا الكاتب اليوناني من هاليكارناسوس يُلقّب بأبي التاريخ.', 'Herodotus', 'هيرودوت', { r: 'Herodotus' }],
  ['a09', 600, 'This Babylonian king’s code of 282 laws is one of the oldest written legal codes.', 'قانون هذا الملك البابلي المؤلف من ٢٨٢ مادة من أقدم القوانين المكتوبة.', 'Hammurabi', 'حمورابي', { r: 'Code of Hammurabi' }],
  ['a10', 600, 'Octavian took this name in 27 BC and became the first Roman emperor.', 'اتخذ أوكتافيان هذا الاسم عام ٢٧ قبل الميلاد وأصبح أول إمبراطور روماني.', 'Augustus', 'أغسطس', { r: 'Augustus' }],
  ['a11', 600, 'This people of southern Mesopotamia developed cuneiform, one of the first writing systems.', 'طوّر هذا الشعب في جنوب بلاد الرافدين الكتابة المسمارية، من أوائل أنظمة الكتابة.', 'The Sumerians', 'السومريون', { r: 'Sumer' }],
  ['a12', 600, 'The last active ruler of Egypt’s Ptolemaic Kingdom, she allied with Julius Caesar and Mark Antony.', 'آخر حكام المملكة البطلمية في مصر، تحالفت مع يوليوس قيصر ثم مارك أنطونيو.', 'Cleopatra', 'كليوباترا', { r: 'Cleopatra' }],
  ['a13', 800, 'This Persian king founded the Achaemenid Empire and conquered Babylon in 539 BC.', 'أسس هذا الملك الفارسي الإمبراطورية الأخمينية وفتح بابل عام ٥٣٩ قبل الميلاد.', 'Cyrus the Great', 'قورش الكبير', { alt: ['Cyrus'], r: 'Cyrus the Great' }],
  ['a14', 800, 'This Greek philosopher, a student of Plato, was the tutor of Alexander the Great.', 'هذا الفيلسوف اليوناني، تلميذ أفلاطون، كان معلّم الإسكندر الأكبر.', 'Aristotle', 'أرسطو', { r: 'Aristotle' }],
  ['a15', 800, 'At Thermopylae in 480 BC, 300 soldiers from this Greek city-state made a famous last stand.', 'في معركة ثيرموبيلاي عام ٤٨٠ قبل الميلاد، صمد ٣٠٠ جندي من هذه المدينة اليونانية صموداً شهيراً.', 'Sparta', 'إسبرطة', { r: 'Battle of Thermopylae' }],
  ['a16', 800, 'This Roman emperor ordered a wall built across northern Britain in AD 122.', 'أمر هذا الإمبراطور الروماني ببناء سور عبر شمال بريطانيا عام ١٢٢ للميلاد.', 'Hadrian', 'هادريان', { r: 'Hadrian\'s Wall' }],
  ['a17', 1000, 'In 49 BC this Roman general crossed the Rubicon river with his army, starting a civil war.', 'في عام ٤٩ قبل الميلاد عبر هذا القائد الروماني نهر الروبيكون بجيشه، فاندلعت حرب أهلية.', 'Julius Caesar', 'يوليوس قيصر', { r: 'Crossing the Rubicon' }],
  ['a18', 1000, 'This Nubian kingdom’s later capital, Meroë in today’s Sudan, is known for its many small pyramids.', 'عاصمة هذه المملكة النوبية المتأخرة، مروي في السودان اليوم، مشهورة بأهراماتها الصغيرة الكثيرة.', 'Kush', 'كوش', { r: 'Kingdom of Kush' }],
  ['a19', 1000, 'Sickened by the Kalinga war, this Mauryan emperor of India turned to Buddhism around 260 BC.', 'بعد أن هالته حرب كالينغا، اعتنق هذا الإمبراطور الموري في الهند البوذية نحو عام ٢٦٠ قبل الميلاد.', 'Ashoka', 'أشوكا', { r: 'Ashoka' }],
  ['a20', 1000, 'Constantine refounded the city of Byzantium in AD 330 under this new name.', 'أعاد قسطنطين تأسيس مدينة بيزنطة عام ٣٣٠ للميلاد بهذا الاسم الجديد.', 'Constantinople', 'القسطنطينية', { r: 'Constantinople' }],
]);

JB_BANK.cat('modern-history', { g: 'history', pop: 1, e: '📜', en: 'Modern History', ar: 'التاريخ الحديث' }, [
  ['m01', 200, 'The Second World War ended in this year.', 'انتهت الحرب العالمية الثانية في هذا العام.', '1945', '١٩٤٥', { r: 'World War II' }],
  ['m02', 200, 'In 1969, Neil Armstrong became the first person to walk on this.', 'في عام ١٩٦٩ أصبح نيل آرمسترونغ أول إنسان يمشي على هذا.', 'The Moon', 'القمر', { f: 'apollo11', r: 'Apollo 11' }],
  ['m03', 200, 'This wall dividing a German city came down in 1989.', 'سقط هذا الجدار الذي كان يقسم مدينة ألمانية عام ١٩٨٩.', 'The Berlin Wall', 'جدار برلين', { r: 'Berlin Wall' }],
  ['m04', 200, 'This British liner sank on its first voyage in 1912 after hitting an iceberg.', 'غرقت هذه السفينة البريطانية في رحلتها الأولى عام ١٩١٢ بعد اصطدامها بجبل جليدي.', 'The Titanic', 'تايتانيك', { f: 'titanic', r: 'Titanic' }],
  ['m05', 400, 'He became South Africa’s first Black president in 1994 after 27 years in prison.', 'أصبح أول رئيس أسود لجنوب أفريقيا عام ١٩٩٤ بعد ٢٧ عاماً في السجن.', 'Nelson Mandela', 'نيلسون مانديلا', { r: 'Nelson Mandela' }],
  ['m06', 400, 'The First World War began in this year.', 'بدأت الحرب العالمية الأولى في هذا العام.', '1914', '١٩١٤', { r: 'World War I' }],
  ['m07', 400, 'This leader of India’s independence movement championed non-violent resistance.', 'قاد هذا الزعيم حركة استقلال الهند ودعا إلى المقاومة السلمية.', 'Mahatma Gandhi', 'المهاتما غاندي', { alt: ['Gandhi'], altAr: ['غاندي'], r: 'Mahatma Gandhi' }],
  ['m08', 400, 'This currency was launched in 1999, with notes and coins arriving in 2002.', 'أُطلقت هذه العملة عام ١٩٩٩، ووصلت أوراقها النقدية وعملاتها المعدنية عام ٢٠٠٢.', 'The euro', 'اليورو', { r: 'Euro' }],
  ['m09', 600, 'King Abdulaziz proclaimed the unified Kingdom of Saudi Arabia in this year.', 'أعلن الملك عبدالعزيز توحيد المملكة العربية السعودية في هذا العام.', '1932', '١٩٣٢', { r: 'Proclamation of the Kingdom of Saudi Arabia' }],
  ['m10', 600, 'The Soviet Union was dissolved in this year.', 'تفكك الاتحاد السوفيتي في هذا العام.', '1991', '١٩٩١', { r: 'Dissolution of the Soviet Union' }],
  ['m11', 600, 'His assassination in Sarajevo in June 1914 set off the First World War.', 'أشعل اغتياله في سراييفو في يونيو ١٩١٤ الحرب العالمية الأولى.', 'Archduke Franz Ferdinand', 'الأرشيدوق فرانز فرديناند', { alt: ['Franz Ferdinand'], altAr: ['فرانز فرديناند'], r: 'Assassination of Archduke Franz Ferdinand' }],
  ['m12', 600, 'This canal linking the Mediterranean and the Red Sea opened in 1869.', 'افتُتحت هذه القناة التي تربط البحر المتوسط بالبحر الأحمر عام ١٨٦٩.', 'The Suez Canal', 'قناة السويس', { f: 'suez', r: 'Suez Canal' }],
  ['m13', 800, 'This Soviet leader’s decision to place missiles in Cuba led to the 1962 Cuban Missile Crisis.', 'أدى قرار هذا الزعيم السوفيتي بنشر صواريخ في كوبا إلى أزمة الصواريخ الكوبية عام ١٩٦٢.', 'Nikita Khrushchev', 'نيكيتا خروتشوف', { alt: ['Khrushchev'], altAr: ['خروتشوف'], r: 'Cuban Missile Crisis' }],
  ['m14', 800, 'Roosevelt, Churchill and Stalin met in February 1945 at this resort in Crimea.', 'التقى روزفلت وتشرشل وستالين في فبراير ١٩٤٥ في هذا المنتجع في القرم.', 'Yalta', 'يالطا', { r: 'Yalta Conference' }],
  ['m15', 800, 'In 1979 she became the first woman to serve as Britain’s prime minister.', 'في عام ١٩٧٩ أصبحت أول امرأة تتولى رئاسة وزراء بريطانيا.', 'Margaret Thatcher', 'مارغريت تاتشر', { r: 'Margaret Thatcher' }],
  ['m16', 800, 'The nuclear disaster at Chernobyl happened in this year.', 'وقعت كارثة تشيرنوبل النووية في هذا العام.', '1986', '١٩٨٦', { r: 'Chernobyl disaster' }],
  ['m17', 1000, 'Signed in a French palace in 1919, this treaty formally ended the First World War with Germany.', 'وُقّعت هذه المعاهدة في قصر فرنسي عام ١٩١٩، وأنهت رسمياً الحرب العالمية الأولى مع ألمانيا.', 'The Treaty of Versailles', 'معاهدة فرساي', { r: 'Treaty of Versailles' }],
  ['m18', 1000, 'In 1960 she became the world’s first woman elected to lead a government, in Ceylon.', 'في عام ١٩٦٠ أصبحت أول امرأة في العالم تُنتخب لرئاسة حكومة، في سيلان.', 'Sirimavo Bandaranaike', 'سيريمافو باندارانايكا', { alt: ['Bandaranaike'], r: 'Sirimavo Bandaranaike' }],
  ['m19', 1000, 'Saudi Arabia’s first commercial oil flowed in 1938 from this well, later nicknamed the “Prosperity Well”.', 'تدفق أول نفط تجاري في السعودية عام ١٩٣٨ من هذه البئر، التي لُقبت لاحقاً «بئر الخير».', 'Dammam No. 7', 'بئر الدمام رقم ٧', { alt: ['Dammam Well No. 7'], r: 'Dammam No. 7' }],
  ['m20', 1000, 'In 1893 this became the first self-governing country where women could vote in national elections.', 'في عام ١٨٩٣ أصبحت هذه أول دولة ذات حكم ذاتي تمنح المرأة حق التصويت في الانتخابات الوطنية.', 'New Zealand', 'نيوزيلندا', { r: 'Women\'s suffrage in New Zealand' }],
]);

JB_BANK.cat('mythology', { g: 'history', pop: 1, e: '⚡', en: 'Myths & Legends', ar: 'أساطير وخرافات' }, [
  ['y01', 200, 'King of the Greek gods, he hurled thunderbolts from Mount Olympus.', 'ملك الآلهة الإغريقية، كان يقذف الصواعق من جبل الأوليمب.', 'Zeus', 'زيوس', { r: 'Zeus' }],
  ['y02', 200, 'The Norse god of thunder, who carries the hammer Mjölnir.', 'إله الرعد في الأساطير الإسكندنافية، يحمل المطرقة ميولنير.', 'Thor', 'ثور', { r: 'Thor' }],
  ['y03', 200, 'This Greek hero of the Trojan War could only be wounded in his heel.', 'هذا البطل الإغريقي في حرب طروادة لم يكن يُصاب إلا في كعبه.', 'Achilles', 'أخيل', { r: 'Achilles' }],
  ['y04', 200, 'The winged horse of Greek myth.', 'الحصان المجنّح في الأساطير الإغريقية.', 'Pegasus', 'بيغاسوس', { r: 'Pegasus' }],
  ['y05', 400, 'The Greek goddess of wisdom, after whom Athens is named.', 'إلهة الحكمة عند الإغريق، وسُمّيت أثينا باسمها.', 'Athena', 'أثينا', { r: 'Athena' }],
  ['y06', 400, 'A creature with a lion’s body and a human head, like the giant statue at Giza.', 'مخلوق بجسد أسد ورأس إنسان، مثل التمثال العملاق في الجيزة.', 'A sphinx', 'أبو الهول', { alt: ['Sphinx'], altAr: ['سفنكس'], r: 'Great Sphinx of Giza' }],
  ['y07', 400, 'The Roman god of war, who also gave his name to a planet.', 'إله الحرب عند الرومان، وسُمّي كوكب باسمه.', 'Mars', 'مارس', { altAr: ['المريخ'], f: 'mars', r: 'Mars (mythology)' }],
  ['y08', 400, 'He flew too close to the Sun on wings of feathers and wax, and fell into the sea.', 'طار قريباً جداً من الشمس بجناحين من ريش وشمع، فسقط في البحر.', 'Icarus', 'إيكاروس', { r: 'Icarus' }],
  ['y09', 600, 'The Egyptian god of the dead and embalming, shown with the head of a jackal.', 'إله الموتى والتحنيط عند المصريين القدماء، ويُصوّر برأس ابن آوى.', 'Anubis', 'أنوبيس', { r: 'Anubis' }],
  ['y10', 600, 'This Gorgon had snakes for hair, and her gaze turned people to stone.', 'كان لهذه الغورغونة ثعابين بدل الشعر، ونظرتها تحوّل الناس إلى حجارة.', 'Medusa', 'ميدوسا', { r: 'Medusa' }],
  ['y11', 600, 'In Norse myth, warriors who died in battle were taken to this great hall.', 'في الأساطير الإسكندنافية، كان المحاربون الذين يموتون في المعركة يُؤخذون إلى هذه القاعة العظيمة.', 'Valhalla', 'فالهالا', { r: 'Valhalla' }],
  ['y12', 600, 'The Greek god of the sea, who carries a trident.', 'إله البحر عند الإغريق، ويحمل رمحاً ثلاثي الشعب.', 'Poseidon', 'بوسيدون', { r: 'Poseidon' }],
  ['y13', 800, 'This Norse trickster god was the father of the giant wolf Fenrir.', 'إله المكر في الأساطير الإسكندنافية، وهو والد الذئب العملاق فنرير.', 'Loki', 'لوكي', { r: 'Loki' }],
  ['y14', 800, 'This king of Uruk is the hero of one of the oldest surviving works of literature.', 'ملك أوروك هذا هو بطل واحدة من أقدم الأعمال الأدبية الباقية.', 'Gilgamesh', 'جلجامش', { r: 'Epic of Gilgamesh' }],
  ['y15', 800, 'This Norse goddess of love and beauty rode in a chariot pulled by two cats.', 'كانت هذه الإلهة الإسكندنافية للحب والجمال تركب عربة يجرها قطّان.', 'Freyja', 'فريا', { alt: ['Freya'], r: 'Freyja' }],
  ['y16', 800, 'The elephant-headed Hindu god of beginnings, said to remove obstacles.', 'الإله الهندوسي ذو رأس الفيل، إله البدايات ومزيل العقبات.', 'Ganesha', 'غانيشا', { alt: ['Ganesh'], r: 'Ganesha' }],
  ['y17', 1000, 'In Greek myth, this ferryman carried the souls of the dead across the river Styx.', 'في الأساطير الإغريقية، كان هذا المراكبي ينقل أرواح الموتى عبر نهر ستيكس.', 'Charon', 'خارون', { r: 'Charon (mythology)' }],
  ['y18', 1000, 'The immense tree that connects the nine worlds of Norse myth.', 'الشجرة الهائلة التي تربط العوالم التسعة في الأساطير الإسكندنافية.', 'Yggdrasil', 'إغدراسيل', { r: 'Yggdrasil' }],
  ['y19', 1000, 'In Arabian legend, this enormous bird could carry off elephants, as Sinbad discovered.', 'في الحكايات العربية، كان هذا الطائر الهائل يحمل الفيلة، كما اكتشف السندباد.', 'The roc', 'الرُّخ', { alt: ['Rukh'], r: 'Roc (mythology)' }],
  ['y20', 1000, 'For giving fire to humans, this Titan was chained to a rock while an eagle ate his liver.', 'عقاباً على إعطائه النار للبشر، قُيّد هذا التيتان إلى صخرة بينما يأكل نسر كبده.', 'Prometheus', 'بروميثيوس', { r: 'Prometheus' }],
]);

JB_BANK.cat('inventions', { g: 'history', pop: 1, e: '💡', en: 'Inventors & Inventions', ar: 'مخترعون واختراعات' }, [
  ['i01', 200, 'Alexander Graham Bell received a patent for this device in 1876.', 'حصل ألكسندر غراهام بيل على براءة اختراع هذا الجهاز عام ١٨٧٦.', 'The telephone', 'الهاتف', { r: 'Invention of the telephone' }],
  ['i02', 200, 'The Wright brothers made the first powered aeroplane flights in this year.', 'قام الأخوان رايت بأول رحلات طيران بطائرة ذات محرك في هذا العام.', '1903', '١٩٠٣', { r: 'Wright Flyer' }],
  ['i03', 200, 'Thomas Edison is famous for making a long-lasting, practical version of this.', 'يشتهر توماس إديسون بصنع نسخة عملية طويلة العمر من هذا الاختراع.', 'The light bulb', 'المصباح الكهربائي', { alt: ['Electric light'], r: 'Incandescent light bulb' }],
  ['i04', 200, 'Johannes Gutenberg’s 15th-century machine used movable metal type.', 'استخدمت آلة يوهانس غوتنبرغ في القرن الخامس عشر حروفاً معدنية متحركة.', 'The printing press', 'المطبعة', { r: 'Printing press' }],
  ['i05', 400, 'This Scottish scientist discovered penicillin in 1928.', 'اكتشف هذا العالم الاسكتلندي البنسلين عام ١٩٢٨.', 'Alexander Fleming', 'ألكسندر فليمنغ', { r: 'Alexander Fleming' }],
  ['i06', 400, 'Tim Berners-Lee proposed this in 1989 while working at CERN.', 'اقترح تيم بيرنرز لي هذا عام ١٩٨٩ أثناء عمله في سيرن.', 'The World Wide Web', 'الشبكة العنكبوتية العالمية', { alt: ['The web'], altAr: ['الويب'], f: 'www', r: 'World Wide Web' }],
  ['i07', 400, 'In 1886 Karl Benz patented one of the first practical vehicles of this kind.', 'في عام ١٨٨٦ سجّل كارل بنز براءة واحدة من أوائل المركبات العملية من هذا النوع.', 'A petrol-powered car', 'سيارة تعمل بالبنزين', { alt: ['Car', 'Automobile'], altAr: ['سيارة'], r: 'Benz Patent-Motorwagen' }],
  ['i08', 400, 'Guglielmo Marconi was a pioneer of this kind of long-distance wireless communication.', 'كان غولييلمو ماركوني رائداً في هذا النوع من الاتصال اللاسلكي البعيد.', 'Radio', 'الراديو', { r: 'Guglielmo Marconi' }],
  ['i09', 600, 'James Watt’s improvements to this engine helped power the Industrial Revolution.', 'ساعدت تحسينات جيمس واط على هذا المحرك في إطلاق الثورة الصناعية.', 'The steam engine', 'المحرك البخاري', { r: 'Watt steam engine' }],
  ['i10', 600, 'Around the year 1000, Ibn al-Haytham studied this darkened room with a pinhole, an ancestor of the camera.', 'نحو عام ١٠٠٠ درس ابن الهيثم هذه الغرفة المظلمة ذات الثقب الصغير، وهي سلف الكاميرا.', 'The camera obscura', 'الحجرة المظلمة', { alt: ['Pinhole camera'], altAr: ['الكاميرا المظلمة'], r: 'Camera obscura' }],
  ['i11', 600, 'Around AD 105, Cai Lun of China is credited with improving the making of this.', 'نحو عام ١٠٥ للميلاد يُنسب إلى الصيني تساي لون تحسين صناعة هذه المادة.', 'Paper', 'الورق', { r: 'Cai Lun' }],
  ['i12', 600, 'This Swedish chemist invented dynamite and left his fortune to fund famous prizes.', 'اخترع هذا الكيميائي السويدي الديناميت وترك ثروته لتمويل جوائز شهيرة.', 'Alfred Nobel', 'ألفريد نوبل', { r: 'Alfred Nobel' }],
  ['i13', 800, 'Al-Jazari’s 1206 book of machines describes a famous water clock shaped like this animal.', 'يصف كتاب الجزري عن الآلات عام ١٢٠٦ ساعة مائية شهيرة على شكل هذا الحيوان.', 'An elephant', 'الفيل', { alt: ['Elephant'], r: 'Elephant clock' }],
  ['i14', 800, 'Wilhelm Röntgen discovered these rays in 1895.', 'اكتشف فيلهلم رونتغن هذه الأشعة عام ١٨٩٥.', 'X-rays', 'الأشعة السينية', { r: 'X-ray' }],
  ['i15', 800, 'With his improved one, Galileo discovered four moons of Jupiter in 1610.', 'اكتشف غاليليو بالنسخة التي طوّرها منه أربعة أقمار للمشتري عام ١٦١٠.', 'A telescope', 'التلسكوب', { alt: ['Telescope'], altAr: ['المقراب'], r: 'Galilean moons' }],
  ['i16', 800, 'Edward Jenner’s pioneering vaccine of 1796 protected against this disease.', 'كان لقاح إدوارد جينر الرائد عام ١٧٩٦ يحمي من هذا المرض.', 'Smallpox', 'الجدري', { r: 'Edward Jenner' }],
  ['i17', 1000, 'This English mathematician designed the Analytical Engine, a mechanical general-purpose computer.', 'صمّم هذا الرياضي الإنجليزي «المحرك التحليلي»، وهو حاسوب ميكانيكي متعدد الأغراض.', 'Charles Babbage', 'تشارلز باباج', { f: 'babbage', r: 'Analytical Engine' }],
  ['i18', 1000, 'Her 1843 notes on Babbage’s engine include what is often called the first computer program.', 'تضمنت ملاحظاتها عام ١٨٤٣ عن محرك باباج ما يُوصف غالباً بأول برنامج حاسوبي.', 'Ada Lovelace', 'آدا لوفليس', { f: 'babbage', r: 'Ada Lovelace' }],
  ['i19', 1000, 'In 9th-century Córdoba, Abbas ibn Firnas is remembered for an early attempt at this.', 'في قرطبة في القرن التاسع، يُذكر عباس بن فرناس بمحاولة مبكرة لهذا الأمر.', 'Human flight', 'الطيران', { alt: ['Flying', 'Gliding'], altAr: ['الطيران الشراعي'], r: 'Abbas ibn Firnas' }],
  ['i20', 1000, 'Actress Hedy Lamarr co-invented an early form of this radio technique during the Second World War.', 'شاركت الممثلة هيدي لامار في اختراع شكل مبكر من هذه التقنية اللاسلكية خلال الحرب العالمية الثانية.', 'Frequency hopping', 'القفز الترددي', { alt: ['Frequency-hopping spread spectrum'], r: 'Hedy Lamarr' }],
]);

/* ---- bank/30-science.js ---- */
/* Science and technology. */
JB_BANK.cat('human-body', { g: 'science', pop: 1, e: '🫀', en: 'The Human Body', ar: 'جسم الإنسان' }, [
  ['b01', 200, 'This muscular organ pumps blood around the body.', 'هذا العضو العضلي يضخ الدم في أنحاء الجسم.', 'The heart', 'القلب', { r: 'Heart' }],
  ['b02', 200, 'A full adult set of teeth, wisdom teeth included, has this many.', 'المجموعة الكاملة لأسنان البالغ، مع ضروس العقل، فيها هذا العدد.', '32', '٣٢', { r: 'Human tooth' }],
  ['b03', 200, 'The largest organ of the human body, covering it all over.', 'أكبر عضو في جسم الإنسان، ويغطيه بالكامل.', 'The skin', 'الجلد', { r: 'Human skin' }],
  ['b04', 200, 'You have two of these organs for breathing.', 'لديك اثنتان من هذا العضو للتنفس.', 'The lungs', 'الرئتان', { alt: ['Lungs'], f: 'lungs', r: 'Lung' }],
  ['b05', 400, 'The longest and strongest bone in the body, in the thigh.', 'أطول وأقوى عظمة في الجسم، وتقع في الفخذ.', 'The femur', 'عظم الفخذ', { r: 'Femur' }],
  ['b06', 400, 'Red blood cells carry this gas from the lungs to the rest of the body.', 'تنقل خلايا الدم الحمراء هذا الغاز من الرئتين إلى بقية الجسم.', 'Oxygen', 'الأكسجين', { r: 'Red blood cell' }],
  ['b07', 400, 'The coloured part of the eye, around the pupil.', 'الجزء الملوّن من العين حول البؤبؤ.', 'The iris', 'القزحية', { r: 'Iris (anatomy)' }],
  ['b08', 400, 'The medical name for the kneecap.', 'الاسم الطبي لصابونة الركبة.', 'The patella', 'الرضفة', { r: 'Patella' }],
  ['b09', 600, 'A typical adult human skeleton has this many bones.', 'يحتوي هيكل الإنسان البالغ عادةً على هذا العدد من العظام.', '206', '٢٠٦', { r: 'Human skeleton' }],
  ['b10', 600, 'The smallest bone in the body, in the middle ear, is named after this piece of riding gear.', 'أصغر عظمة في الجسم، في الأذن الوسطى، سُميت باسم هذه القطعة من عُدّة ركوب الخيل.', 'The stirrup', 'الركاب', { alt: ['Stapes'], r: 'Stapes' }],
  ['b11', 600, 'This organ behind the stomach makes insulin.', 'هذا العضو الواقع خلف المعدة يفرز الإنسولين.', 'The pancreas', 'البنكرياس', { r: 'Pancreas' }],
  ['b12', 600, 'These blood vessels carry blood back towards the heart.', 'تنقل هذه الأوعية الدموية الدم عائداً إلى القلب.', 'Veins', 'الأوردة', { r: 'Vein' }],
  ['b13', 800, 'People with this blood type are known as universal donors for red blood cells.', 'يُعرف أصحاب هذه الفصيلة بالمتبرعين العامّين لخلايا الدم الحمراء.', 'O negative', 'O سالب', { alt: ['O-', 'O neg'], r: 'Blood type' }],
  ['b14', 800, 'This part of the brain at the back of the skull coordinates balance and movement.', 'هذا الجزء من الدماغ في مؤخرة الجمجمة ينسّق التوازن والحركة.', 'The cerebellum', 'المخيخ', { r: 'Cerebellum' }],
  ['b15', 800, 'The pineal gland releases this hormone, which helps control the sleep cycle.', 'تفرز الغدة الصنوبرية هذا الهرمون الذي يساعد في تنظيم دورة النوم.', 'Melatonin', 'الميلاتونين', { r: 'Melatonin' }],
  ['b16', 800, 'In the 13th century Ibn al-Nafis correctly described blood’s path between the heart and this organ.', 'في القرن الثالث عشر وصف ابن النفيس بشكل صحيح مسار الدم بين القلب وهذا العضو.', 'The lungs', 'الرئتان', { alt: ['Lungs'], f: 'lungs', ok: 1, n: 'This is the pulmonary circulation.', nAr: 'وهي الدورة الدموية الصغرى.', r: 'Ibn al-Nafis' }],
  ['b17', 1000, 'This U-shaped bone in the neck is the only bone that doesn’t join on to any other bone.', 'هذه العظمة على شكل حرف U في الرقبة هي العظمة الوحيدة التي لا تتصل بأي عظمة أخرى.', 'The hyoid', 'العظم اللامي', { alt: ['Hyoid bone'], r: 'Hyoid bone' }],
  ['b18', 1000, 'These cells in the retina let us see colour.', 'هذه الخلايا في شبكية العين تتيح لنا رؤية الألوان.', 'Cones', 'المخاريط', { alt: ['Cone cells'], altAr: ['الخلايا المخروطية'], r: 'Cone cell' }],
  ['b19', 1000, 'Hair and nails are made mostly of this tough protein.', 'يتكون الشعر والأظافر في معظمهما من هذا البروتين المتين.', 'Keratin', 'الكيراتين', { r: 'Keratin' }],
  ['b20', 1000, 'The largest artery in the body, leaving the heart’s left ventricle.', 'أكبر شريان في الجسم، ويخرج من البطين الأيسر للقلب.', 'The aorta', 'الشريان الأورطي', { altAr: ['الأبهر'], r: 'Aorta' }],
]);

JB_BANK.cat('elements', { g: 'science', e: '⚗️', en: 'Chemistry & the Elements', ar: 'الكيمياء والعناصر' }, [
  ['e01', 200, 'H is the chemical symbol for this element, the lightest of all.', 'H هو الرمز الكيميائي لهذا العنصر، وهو أخف العناصر كلها.', 'Hydrogen', 'الهيدروجين', { r: 'Hydrogen' }],
  ['e02', 200, 'Its chemical symbol is Au, and it has been prized for jewellery for thousands of years.', 'رمزه الكيميائي Au، ويُقدَّر في صناعة الحلي منذ آلاف السنين.', 'Gold', 'الذهب', { r: 'Gold' }],
  ['e03', 200, 'Symbol C, this element is found in every living thing.', 'رمزه C، وهذا العنصر موجود في كل كائن حي.', 'Carbon', 'الكربون', { r: 'Carbon' }],
  ['e04', 200, 'This light gas makes party balloons float and voices sound squeaky.', 'هذا الغاز الخفيف يجعل البالونات تطفو والأصوات تبدو رفيعة.', 'Helium', 'الهيليوم', { r: 'Helium' }],
  ['e05', 400, 'Its symbol is Fe, and it is the main ingredient of steel.', 'رمزه Fe، وهو المكوّن الأساسي للفولاذ.', 'Iron', 'الحديد', { r: 'Iron' }],
  ['e06', 400, 'Na is the chemical symbol for this soft, reactive metal.', 'Na هو الرمز الكيميائي لهذا الفلز اللين النشط.', 'Sodium', 'الصوديوم', { r: 'Sodium' }],
  ['e07', 400, 'The only metal that is liquid at room temperature.', 'الفلز الوحيد الذي يكون سائلاً في درجة حرارة الغرفة.', 'Mercury', 'الزئبق', { r: 'Mercury (element)' }],
  ['e08', 400, 'H₂O is the formula for this.', 'H₂O هي الصيغة الكيميائية لهذه المادة.', 'Water', 'الماء', { r: 'Properties of water' }],
  ['e09', 600, 'K is the chemical symbol for this element, plentiful in bananas.', 'K هو الرمز الكيميائي لهذا العنصر الموجود بكثرة في الموز.', 'Potassium', 'البوتاسيوم', { r: 'Potassium' }],
  ['e10', 600, 'The most abundant gas in Earth’s atmosphere, at about 78%.', 'أكثر الغازات وفرة في الغلاف الجوي للأرض، بنحو ٧٨٪.', 'Nitrogen', 'النيتروجين', { f: 'nitrogen-air', r: 'Atmosphere of Earth' }],
  ['e11', 600, 'Symbol Pb, this heavy metal was once used in water pipes and paint.', 'رمزه Pb، وكان هذا الفلز الثقيل يُستخدم في أنابيب المياه والطلاء.', 'Lead', 'الرصاص', { r: 'Lead' }],
  ['e12', 600, 'This Russian chemist published his periodic table in 1869.', 'نشر هذا الكيميائي الروسي جدوله الدوري عام ١٨٦٩.', 'Dmitri Mendeleev', 'ديمتري مندلييف', { alt: ['Mendeleev'], altAr: ['مندلييف'], r: 'Dmitri Mendeleev' }],
  ['e13', 800, 'Marie and Pierre Curie discovered polonium and this other radioactive element in 1898.', 'اكتشفت ماري وبيير كوري البولونيوم وهذا العنصر المشع الآخر عام ١٨٩٨.', 'Radium', 'الراديوم', { r: 'Radium' }],
  ['e14', 800, 'Its symbol W comes from its other name, wolfram.', 'رمزه W مأخوذ من اسمه الآخر «ولفرام».', 'Tungsten', 'التنغستن', { r: 'Tungsten' }],
  ['e15', 800, 'Most computer chips are made from this element, symbol Si.', 'تُصنع معظم رقائق الحاسوب من هذا العنصر، ورمزه Si.', 'Silicon', 'السيليكون', { r: 'Silicon' }],
  ['e16', 800, 'This noble gas glows red-orange in classic advertising signs.', 'يتوهج هذا الغاز النبيل باللون الأحمر البرتقالي في لافتات الإعلانات الكلاسيكية.', 'Neon', 'النيون', { r: 'Neon' }],
  ['e17', 1000, 'Element 118, the heaviest named so far, honours the physicist Yuri Oganessian.', 'العنصر ١١٨، أثقل عنصر سُمّي حتى الآن، يكرّم الفيزيائي يوري أوغانيسيان.', 'Oganesson', 'أوغانيسون', { r: 'Oganesson' }],
  ['e18', 1000, 'Four elements — yttrium, ytterbium, terbium and erbium — are named after this one Swedish village.', 'أربعة عناصر — الإتريوم والإتربيوم والتيربيوم والإربيوم — سُمّيت باسم هذه القرية السويدية الواحدة.', 'Ytterby', 'إتربي', { r: 'Ytterby' }],
  ['e19', 1000, 'This element’s name comes from the Greek word for violet, the colour of its vapour.', 'اشتُق اسم هذا العنصر من الكلمة اليونانية للبنفسجي، وهو لون بخاره.', 'Iodine', 'اليود', { r: 'Iodine' }],
  ['e20', 1000, 'The Haber–Bosch process makes this compound from nitrogen and hydrogen, mainly for fertiliser.', 'تنتج عملية هابر-بوش هذا المركب من النيتروجين والهيدروجين، أساساً لصناعة الأسمدة.', 'Ammonia', 'الأمونيا', { r: 'Haber process' }],
]);

JB_BANK.cat('space', { g: 'science', pop: 1, e: '🪐', en: 'Space', ar: 'الفضاء' }, [
  ['s01', 200, 'The planet closest to the Sun.', 'أقرب الكواكب إلى الشمس.', 'Mercury', 'عطارد', { r: 'Mercury (planet)' }],
  ['s02', 200, 'Iron oxide dust gives this planet its nickname, the Red Planet.', 'يمنح غبار أكسيد الحديد هذا الكوكب لقبه «الكوكب الأحمر».', 'Mars', 'المريخ', { f: 'mars', r: 'Mars' }],
  ['s03', 200, 'The largest planet in our solar system.', 'أكبر كوكب في مجموعتنا الشمسية.', 'Jupiter', 'المشتري', { r: 'Jupiter' }],
  ['s04', 200, 'The name of the galaxy that contains our solar system.', 'اسم المجرة التي تضم مجموعتنا الشمسية.', 'The Milky Way', 'درب التبانة', { r: 'Milky Way' }],
  ['s05', 400, 'This planet is famous for its broad, bright rings.', 'يشتهر هذا الكوكب بحلقاته العريضة اللامعة.', 'Saturn', 'زحل', { r: 'Saturn' }],
  ['s06', 400, 'In April 1961 this Soviet cosmonaut became the first person in space.', 'في أبريل ١٩٦١ أصبح رائد الفضاء السوفيتي هذا أول إنسان في الفضاء.', 'Yuri Gagarin', 'يوري غاغارين', { r: 'Yuri Gagarin' }],
  ['s07', 400, 'In 2006 astronomers reclassified it as a dwarf planet.', 'في عام ٢٠٠٦ أعاد علماء الفلك تصنيفه كوكباً قزماً.', 'Pluto', 'بلوتو', { r: 'Pluto' }],
  ['s08', 400, 'The star nearest to Earth.', 'أقرب نجم إلى الأرض.', 'The Sun', 'الشمس', { r: 'Sun' }],
  ['s09', 600, 'Launched in 1990, this space telescope is named after an American astronomer.', 'أُطلق هذا التلسكوب الفضائي عام ١٩٩٠، ويحمل اسم فلكي أمريكي.', 'Hubble', 'هابل', { alt: ['The Hubble Space Telescope'], r: 'Hubble Space Telescope' }],
  ['s10', 600, 'The first artificial satellite, launched by the Soviet Union in 1957.', 'أول قمر صناعي، أطلقه الاتحاد السوفيتي عام ١٩٥٧.', 'Sputnik 1', 'سبوتنيك ١', { alt: ['Sputnik'], r: 'Sputnik 1' }],
  ['s11', 600, 'Thanks to its thick carbon dioxide atmosphere, it is the hottest planet in the solar system.', 'بسبب غلافه الجوي الكثيف من ثاني أكسيد الكربون، هو أشد كواكب المجموعة الشمسية حرارة.', 'Venus', 'الزهرة', { r: 'Venus' }],
  ['s12', 600, 'Sunlight takes roughly this many minutes to reach Earth.', 'يستغرق ضوء الشمس نحو هذا العدد من الدقائق ليصل إلى الأرض.', 'About 8', 'نحو ٨', { alt: ['8', 'Eight'], altAr: ['٨', 'ثماني'], r: 'Sunlight' }],
  ['s13', 800, 'In 1985 he became the first Arab and first Muslim in space, aboard the Space Shuttle Discovery.', 'في عام ١٩٨٥ أصبح أول عربي وأول مسلم يصعد إلى الفضاء، على متن المكوك ديسكفري.', 'Sultan bin Salman Al Saud', 'الأمير سلطان بن سلمان', { alt: ['Prince Sultan bin Salman'], altAr: ['سلطان بن سلمان آل سعود'], r: 'Sultan bin Salman Al Saud' }],
  ['s14', 800, 'Jupiter’s largest moon is also the biggest moon in the solar system.', 'أكبر أقمار المشتري هو أيضاً أكبر قمر في المجموعة الشمسية.', 'Ganymede', 'غانيميد', { r: 'Ganymede (moon)' }],
  ['s15', 800, 'NASA’s rover that landed on Mars in 2021 carrying the Ingenuity helicopter.', 'مركبة ناسا الجوالة التي هبطت على المريخ عام ٢٠٢١ حاملةً المروحية «إنجينويتي».', 'Perseverance', 'بيرسيفيرانس', { f: 'mars', r: 'Perseverance (rover)' }],
  ['s16', 800, 'This boundary at 100 km altitude is commonly used to mark where space begins.', 'هذا الحد على ارتفاع ١٠٠ كيلومتر يُستخدم عادة لتحديد بداية الفضاء.', 'The Kármán line', 'خط كارمان', { r: 'Kármán line' }],
  ['s17', 1000, 'Saturn’s largest moon has a thick atmosphere and lakes of liquid methane.', 'أكبر أقمار زحل له غلاف جوي كثيف وبحيرات من الميثان السائل.', 'Titan', 'تيتان', { r: 'Titan (moon)' }],
  ['s18', 1000, 'Star names such as Aldebaran, Betelgeuse and Altair come from this language.', 'أسماء نجوم مثل الدبران ومنكب الجوزاء والنسر الطائر جاءت من هذه اللغة.', 'Arabic', 'العربية', { r: 'List of Arabic star names' }],
  ['s19', 1000, 'The nearest star system to our Sun, about 4.4 light-years away.', 'أقرب نظام نجمي إلى شمسنا، على بعد نحو ٤٫٤ سنة ضوئية.', 'Alpha Centauri', 'ألفا قنطورس', { r: 'Alpha Centauri' }],
  ['s20', 1000, 'Launched in 1977, this probe is the human-made object farthest from Earth.', 'أُطلق هذا المسبار عام ١٩٧٧، وهو أبعد جسم صنعه الإنسان عن الأرض.', 'Voyager 1', 'فوياجر ١', { c: 1, asOf: '2026-06', r: 'Voyager 1' }],
]);

JB_BANK.cat('numbers', { g: 'science', e: '🔢', en: 'Numbers & Maths', ar: 'أرقام ورياضيات' }, [
  ['u01', 200, 'A hexagon has this many sides.', 'للشكل السداسي هذا العدد من الأضلاع.', '6', '٦', { r: 'Hexagon' }],
  ['u02', 200, 'A right angle measures this many degrees.', 'تقيس الزاوية القائمة هذا العدد من الدرجات.', '90', '٩٠', { r: 'Right angle' }],
  ['u03', 200, 'This many items make a dozen.', 'هذا العدد من الأشياء يساوي دستة.', '12', '١٢', { r: 'Dozen' }],
  ['u04', 200, 'In Roman numerals, this letter stands for 100.', 'في الأرقام الرومانية يرمز هذا الحرف إلى ١٠٠.', 'C', 'C', { r: 'Roman numerals' }],
  ['u05', 400, 'Pi rounded to two decimal places.', 'العدد باي مقرّباً إلى منزلتين عشريتين.', '3.14', '٣٫١٤', { r: 'Pi' }],
  ['u06', 400, 'One hour contains this many seconds.', 'الساعة الواحدة فيها هذا العدد من الثواني.', '3,600', '٣٦٠٠', { alt: ['3600'], r: 'Hour' }],
  ['u07', 400, 'A polygon with eight sides, like a stop sign.', 'مضلع له ثمانية أضلاع، مثل إشارة «قف».', 'An octagon', 'مثمّن', { alt: ['Octagon'], altAr: ['شكل ثماني'], r: 'Octagon' }],
  ['u08', 400, 'The square root of 169.', 'الجذر التربيعي للعدد ١٦٩.', '13', '١٣', { r: 'Square root' }],
  ['u09', 600, 'The only even prime number.', 'العدد الأولي الزوجي الوحيد.', '2', '٢', { r: 'Prime number' }],
  ['u10', 600, 'The three angles inside any flat triangle add up to this many degrees.', 'مجموع الزوايا الثلاث داخل أي مثلث مستوٍ يساوي هذا العدد من الدرجات.', '180', '١٨٠', { r: 'Triangle' }],
  ['u11', 600, 'The Roman numeral M stands for this number.', 'الرمز الروماني M يمثل هذا العدد.', '1,000', '١٠٠٠', { alt: ['1000'], r: 'Roman numerals' }],
  ['u12', 600, 'The word “algebra” comes from al-jabr, in a book by this 9th-century Baghdad mathematician.', 'جاءت كلمة «algebra» من «الجبر» في كتاب لهذا العالم الرياضي البغدادي في القرن التاسع.', 'Al-Khwarizmi', 'الخوارزمي', { r: 'Al-Khwarizmi' }],
  ['u13', 800, 'The sequence 1, 1, 2, 3, 5, 8, 13… is named after this Italian mathematician.', 'المتتالية ١، ١، ٢، ٣، ٥، ٨، ١٣… سُمّيت باسم هذا الرياضي الإيطالي.', 'Fibonacci', 'فيبوناتشي', { r: 'Fibonacci sequence' }],
  ['u14', 800, 'A googol is the number 1 followed by this many zeros.', 'الغوغول هو العدد ١ يليه هذا العدد من الأصفار.', '100', '١٠٠', { r: 'Googol' }],
  ['u15', 800, 'Often written with the Greek letter phi, this “golden” number is about 1.618.', 'يُكتب غالباً بالحرف اليوناني فاي، وهذا العدد «الذهبي» يساوي نحو ١٫٦١٨.', 'The golden ratio', 'النسبة الذهبية', { r: 'Golden ratio' }],
  ['u16', 800, 'An icosahedron has this many faces.', 'لمتعدد الوجوه العشريني هذا العدد من الأوجه.', '20', '٢٠', { r: 'Regular icosahedron' }],
  ['u17', 1000, 'The next number in the sequence 2, 3, 5, 7, 11, 13…', 'العدد التالي في المتتالية ٢، ٣، ٥، ٧، ١١، ١٣…', '17', '١٧', { r: 'Prime number' }],
  ['u18', 1000, 'Euler’s identity links e, i, pi, 1 and this number.', 'تربط متطابقة أويلر بين e وi وباي و١ وهذا العدد.', '0', '٠', { alt: ['Zero'], altAr: ['صفر'], r: 'Euler\'s identity' }],
  ['u19', 1000, 'The value of 5 factorial (5!).', 'قيمة مضروب العدد ٥ (!٥).', '120', '١٢٠', { r: 'Factorial' }],
  ['u20', 1000, 'In 1994 this British mathematician completed his proof of Fermat’s Last Theorem.', 'في عام ١٩٩٤ أكمل هذا الرياضي البريطاني برهانه على مبرهنة فيرما الأخيرة.', 'Andrew Wiles', 'أندرو وايلز', { r: 'Wiles\'s proof of Fermat\'s Last Theorem' }],
]);

JB_BANK.cat('tech', { g: 'science', pop: 1, e: '💻', en: 'Tech & the Internet', ar: 'التقنية والإنترنت' }, [
  ['t01', 200, 'Apple’s smartphone, first released in 2007.', 'هاتف آبل الذكي الذي صدر لأول مرة عام ٢٠٠٧.', 'The iPhone', 'آيفون', { r: 'iPhone' }],
  ['t02', 200, 'Founded in 1998, this company’s name became a verb meaning to search online.', 'تأسست عام ١٩٩٨، وأصبح اسم هذه الشركة فعلاً يعني البحث على الإنترنت.', 'Google', 'غوغل', { f: 'google', r: 'Google' }],
  ['t03', 200, 'On most computers, the shortcut Ctrl+C (or Cmd+C) does this.', 'في معظم الحواسيب، يقوم الاختصار Ctrl+C (أو Cmd+C) بهذا.', 'Copy', 'النسخ', { r: 'Cut, copy, and paste' }],
  ['t04', 200, 'This is short for “electronic mail”.', 'هذا اختصار لعبارة «البريد الإلكتروني» بالإنجليزية.', 'Email', 'الإيميل', { alt: ['E-mail'], altAr: ['البريد الإلكتروني'], r: 'Email' }],
  ['t05', 400, 'Bill Gates and Paul Allen founded this company in 1975.', 'أسس بيل غيتس وبول ألن هذه الشركة عام ١٩٧٥.', 'Microsoft', 'مايكروسوفت', { r: 'Microsoft' }],
  ['t06', 400, 'USB stands for Universal Serial this.', 'USB اختصار لعبارة Universal Serial وهذه الكلمة.', 'Bus', 'Bus (ناقل)', { r: 'USB' }],
  ['t07', 400, 'This video site was founded in 2005 and bought by Google the next year.', 'تأسس موقع الفيديو هذا عام ٢٠٠٥ واشترته غوغل في العام التالي.', 'YouTube', 'يوتيوب', { f: 'google', r: 'YouTube' }],
  ['t08', 400, 'Eight bits make one of these.', 'ثمانية بتات تساوي واحداً من هذه الوحدة.', 'A byte', 'بايت', { alt: ['Byte'], r: 'Byte' }],
  ['t09', 600, 'This company created the PDF file format.', 'أنشأت هذه الشركة صيغة ملفات PDF.', 'Adobe', 'أدوبي', { r: 'PDF' }],
  ['t10', 600, 'Created by Guido van Rossum, this programming language is named after a British comedy group.', 'ابتكرها غيدو فان روسم، وسُمّيت لغة البرمجة هذه على اسم فرقة كوميدية بريطانية.', 'Python', 'بايثون', { r: 'Python (programming language)' }],
  ['t11', 600, 'In computing, CPU stands for this.', 'في الحوسبة، CPU اختصار لهذه العبارة.', 'Central processing unit', 'وحدة المعالجة المركزية', { r: 'Central processing unit' }],
  ['t12', 600, 'Bluetooth is named after Harald Bluetooth, a 10th-century king of this country.', 'سُميت تقنية بلوتوث على اسم هارالد بلوتوث، ملك هذا البلد في القرن العاشر.', 'Denmark', 'الدنمارك', { alt: ['Denmark and Norway'], r: 'Bluetooth' }],
  ['t13', 800, 'He posted the very first tweet in March 2006.', 'نشر أول تغريدة على الإطلاق في مارس ٢٠٠٦.', 'Jack Dorsey', 'جاك دورسي', { r: 'Jack Dorsey' }],
  ['t14', 800, 'Linus Torvalds released the first version of this operating-system kernel in 1991.', 'أصدر لينوس تورفالدس النسخة الأولى من نواة نظام التشغيل هذه عام ١٩٩١.', 'Linux', 'لينكس', { r: 'Linux kernel' }],
  ['t15', 800, 'A web server returns error code 404 when this happens.', 'يُرجع خادم الويب رمز الخطأ ٤٠٤ عندما يحدث هذا.', 'The page isn’t found', 'الصفحة غير موجودة', { alt: ['Not found', 'Page not found'], r: 'HTTP 404' }],
  ['t16', 800, 'In 1947 engineers found a real “bug” in the Harvard Mark II computer: it was this insect.', 'في عام ١٩٤٧ وجد المهندسون «حشرة» حقيقية في حاسوب هارفارد مارك ٢: كانت هذه الحشرة.', 'A moth', 'عثة', { alt: ['Moth'], r: 'Software bug' }],
  ['t17', 1000, 'The first ARPANET message in 1969 was meant to be “LOGIN”, but the system crashed after these two letters.', 'كان يُفترض أن تكون أول رسالة على أربانت عام ١٩٦٩ كلمة «LOGIN»، لكن النظام تعطل بعد هذين الحرفين.', 'LO', 'LO', { r: 'ARPANET' }],
  ['t18', 1000, 'The QWERTY keyboard layout was designed for this machine in the 1870s.', 'صُمّم ترتيب لوحة المفاتيح QWERTY لهذه الآلة في سبعينيات القرن التاسع عشر.', 'The typewriter', 'الآلة الكاتبة', { r: 'QWERTY' }],
  ['t19', 1000, 'Alan Turing helped break this German cipher machine’s codes during the Second World War.', 'ساعد آلان تورنغ في كسر شيفرات آلة التشفير الألمانية هذه خلال الحرب العالمية الثانية.', 'Enigma', 'إنيغما', { r: 'Enigma machine' }],
  ['t20', 1000, 'The world’s first website went online in 1991 at this research centre near Geneva.', 'ظهر أول موقع إلكتروني في العالم عام ١٩٩١ في مركز الأبحاث هذا قرب جنيف.', 'CERN', 'سيرن', { f: 'www', r: 'CERN' }],
]);

/* ---- bank/40-nature.js ---- */
/* Nature: animals, the planet, the oceans. */
JB_BANK.cat('animals', { g: 'nature', pop: 1, e: '🦒', en: 'Animal Kingdom', ar: 'مملكة الحيوان' }, [
  ['an01', 200, 'The tallest animal in the world.', 'أطول حيوان في العالم.', 'The giraffe', 'الزرافة', { r: 'Giraffe' }],
  ['an02', 200, 'The largest living land animal.', 'أكبر حيوان بري حي.', 'The African elephant', 'الفيل الأفريقي', { alt: ['Elephant'], altAr: ['الفيل'], r: 'African bush elephant' }],
  ['an03', 200, 'Called the “ship of the desert”, it stores fat in its hump.', 'يُلقب بـ«سفينة الصحراء»، ويخزّن الدهون في سنامه.', 'The camel', 'الجمل', { r: 'Camel' }],
  ['an04', 200, 'Baby kangaroos are called this.', 'تُسمى صغار الكنغر بهذا الاسم.', 'Joeys', 'جوي', { alt: ['Joey'], r: 'Kangaroo' }],
  ['an05', 400, 'The fastest land animal.', 'أسرع حيوان بري.', 'The cheetah', 'الفهد الصياد', { altAr: ['الشيتا'], r: 'Cheetah' }],
  ['an06', 400, 'The thick ring of hair around a male lion’s head.', 'الشعر الكثيف المحيط برأس ذكر الأسد.', 'The mane', 'اللِّبدة', { alt: ['Mane'], r: 'Lion' }],
  ['an07', 400, 'Giant pandas eat almost nothing but this plant.', 'لا تأكل الباندا العملاقة تقريباً إلا هذا النبات.', 'Bamboo', 'الخيزران', { altAr: ['البامبو'], r: 'Giant panda' }],
  ['an08', 400, 'The only mammal capable of true flight.', 'الحيوان الثديي الوحيد القادر على الطيران الحقيقي.', 'The bat', 'الخفاش', { r: 'Bat' }],
  ['an09', 600, 'Once extinct in the wild, this white antelope of the Arabian deserts was brought back from captive herds.', 'بعد أن انقرض في البرية، أُعيد هذا الظبي الأبيض في الصحارى العربية من قطعان الأسر.', 'The Arabian oryx', 'المها العربي', { r: 'Arabian oryx' }],
  ['an10', 600, 'Koalas feed almost entirely on the leaves of this tree.', 'تتغذى الكوالا بالكامل تقريباً على أوراق هذه الشجرة.', 'Eucalyptus', 'الكينا', { altAr: ['الأوكالبتوس'], r: 'Koala' }],
  ['an11', 600, 'The largest living bird can’t fly but can run at about 70 km/h.', 'أكبر طائر حي لا يطير، لكنه يركض بسرعة نحو ٧٠ كم/ساعة.', 'The ostrich', 'النعامة', { r: 'Common ostrich' }],
  ['an12', 600, 'This egg-laying Australian mammal has a bill like a duck’s.', 'هذا الثديي الأسترالي البيوض له منقار يشبه منقار البطة.', 'The platypus', 'خلد الماء', { altAr: ['البلاتيبوس'], r: 'Platypus' }],
  ['an13', 800, 'In a hunting dive this bird, prized in falconry, is the fastest animal on Earth.', 'في انقضاضه للصيد يصبح هذا الطائر، المحبوب في الصقارة، أسرع حيوان على الأرض.', 'The peregrine falcon', 'الصقر الشاهين', { alt: ['Peregrine'], altAr: ['الشاهين'], r: 'Peregrine falcon' }],
  ['an14', 800, 'This bird of prey can turn its head about 270 degrees, since its eyes can’t move in their sockets.', 'يستطيع هذا الطائر الجارح أن يدير رأسه نحو ٢٧٠ درجة، لأن عينيه لا تتحركان في محجريهما.', 'The owl', 'البومة', { alt: ['Owl'], r: 'Owl' }],
  ['an15', 800, 'The axolotl, famous for regrowing lost limbs, is a type of this amphibian.', 'الأكسولوتل، المشهور بإعادة نمو أطرافه المفقودة، نوع من هذه البرمائيات.', 'A salamander', 'السمندل', { alt: ['Salamander'], r: 'Axolotl' }],
  ['an16', 800, 'The largest species of big cat.', 'أكبر أنواع السنوريات الكبيرة.', 'The tiger', 'الببر', { altAr: ['النمر المخطط', 'التايغر'], r: 'Tiger' }],
  ['an17', 1000, 'This nocturnal bird from New Zealand is the world’s only flightless parrot.', 'هذا الطائر الليلي من نيوزيلندا هو الببغاء الوحيد في العالم الذي لا يطير.', 'The kākāpō', 'الكاكابو', { alt: ['Kakapo'], r: 'Kākāpō' }],
  ['an18', 1000, 'Tiny, nearly indestructible tardigrades are nicknamed these.', 'تُلقب بطيئات المشية الصغيرة شبه الخالدة بهذا اللقب.', 'Water bears', 'دببة الماء', { r: 'Tardigrade' }],
  ['an19', 1000, 'The snow leopard lives in the high mountains of this continent.', 'يعيش نمر الثلج في الجبال العالية لهذه القارة.', 'Asia', 'آسيا', { r: 'Snow leopard' }],
  ['an20', 1000, 'This lemur from Madagascar taps on wood and uses a long middle finger to pull out grubs.', 'يطرق هذا الليمور من مدغشقر على الخشب ويستخدم إصبعه الوسطى الطويلة لاستخراج اليرقات.', 'The aye-aye', 'الآي آي', { r: 'Aye-aye' }],
]);

JB_BANK.cat('planet-earth', { g: 'nature', pop: 1, e: '🌋', en: 'Planet Earth', ar: 'كوكب الأرض' }, [
  ['p01', 200, 'The largest and deepest ocean on Earth.', 'أكبر محيطات الأرض وأعمقها.', 'The Pacific', 'المحيط الهادئ', { r: 'Pacific Ocean' }],
  ['p02', 200, 'The largest hot desert in the world, across North Africa.', 'أكبر صحراء حارة في العالم، تمتد عبر شمال أفريقيا.', 'The Sahara', 'الصحراء الكبرى', { r: 'Sahara' }],
  ['p03', 200, 'Molten rock that pours out of a volcano is called this.', 'الصخور المنصهرة التي تتدفق من البركان تُسمى بهذا الاسم.', 'Lava', 'الحمم', { altAr: ['اللافا'], r: 'Lava' }],
  ['p04', 200, 'The usual model of the world has this many continents.', 'النموذج المعتاد للعالم فيه هذا العدد من القارات.', '7', '٧', { alt: ['Seven'], altAr: ['سبع'], r: 'Continent' }],
  ['p05', 400, 'Created in 1935 by Charles Richter, this scale measured earthquake strength.', 'وضعه تشارلز ريختر عام ١٩٣٥، وكان هذا المقياس يقيس قوة الزلازل.', 'The Richter scale', 'مقياس ريختر', { r: 'Richter scale' }],
  ['p06', 400, 'Most of the Rub’ al Khali, the Empty Quarter, lies in this country.', 'يقع معظم الربع الخالي في هذا البلد.', 'Saudi Arabia', 'السعودية', { r: 'Rub\' al Khali' }],
  ['p07', 400, 'Earth’s coldest, windiest continent.', 'أبرد قارات الأرض وأكثرها رياحاً.', 'Antarctica', 'القارة القطبية الجنوبية', { altAr: ['أنتاركتيكا'], r: 'Antarctica' }],
  ['p08', 400, 'The most abundant gas in the air we breathe is not oxygen but this.', 'أكثر الغازات وفرة في الهواء الذي نتنفسه ليس الأكسجين بل هذا الغاز.', 'Nitrogen', 'النيتروجين', { f: 'nitrogen-air', r: 'Atmosphere of Earth' }],
  ['p09', 600, 'The deepest known point in the oceans, at the southern end of the Mariana Trench.', 'أعمق نقطة معروفة في المحيطات، في الطرف الجنوبي لخندق ماريانا.', 'Challenger Deep', 'تشالنجر ديب', { r: 'Challenger Deep' }],
  ['p10', 600, 'The hardest natural mineral.', 'أصلب معدن طبيعي.', 'Diamond', 'الألماس', { r: 'Diamond' }],
  ['p11', 600, 'The lowest layer of the atmosphere, where we live and where weather happens.', 'الطبقة السفلى من الغلاف الجوي، حيث نعيش ويحدث الطقس.', 'The troposphere', 'التروبوسفير', { r: 'Troposphere' }],
  ['p12', 600, 'A scientist who studies the weather.', 'العالم الذي يدرس الطقس.', 'A meteorologist', 'خبير الأرصاد الجوية', { alt: ['Meteorologist'], r: 'Meteorology' }],
  ['p13', 800, 'This wall of dust and sand, common in Sudan and Arabia, takes its name from the Arabic for “blowing strongly”.', 'هذا الجدار من الغبار والرمال، الشائع في السودان والجزيرة العربية، اسمه مأخوذ من الكلمة العربية للهبوب الشديد.', 'A haboob', 'الهَبوب', { alt: ['Haboob'], r: 'Haboob' }],
  ['p14', 800, 'This supercontinent began breaking apart about 200 million years ago.', 'بدأت هذه القارة العظمى بالتفكك قبل نحو ٢٠٠ مليون سنة.', 'Pangaea', 'بانجيا', { r: 'Pangaea' }],
  ['p15', 800, 'The driest non-polar desert on Earth, in northern Chile.', 'أكثر الصحارى غير القطبية جفافاً على الأرض، في شمال تشيلي.', 'The Atacama', 'صحراء أتاكاما', { r: 'Atacama Desert' }],
  ['p16', 800, 'Rocks that form when magma or lava cools and hardens.', 'الصخور التي تتكون عندما تبرد الصهارة أو الحمم وتتصلب.', 'Igneous rocks', 'الصخور النارية', { alt: ['Igneous'], r: 'Igneous rock' }],
  ['p17', 1000, 'Geologists usually call the boundary between Earth’s crust and mantle by this short name.', 'يسمّي الجيولوجيون الحد الفاصل بين قشرة الأرض والوشاح عادةً بهذا الاسم المختصر.', 'The Moho', 'موهو', { r: 'Mohorovičić discontinuity' }],
  ['p18', 1000, 'This cold northerly wind blows down the Rhône valley to the Mediterranean coast of France.', 'هذه الريح الشمالية الباردة تهب عبر وادي الرون إلى ساحل فرنسا على المتوسط.', 'The mistral', 'الميسترال', { r: 'Mistral (wind)' }],
  ['p19', 1000, 'A crescent-shaped sand dune with its horns pointing downwind.', 'كثيب رملي على شكل هلال، يتجه طرفاه مع اتجاه الريح.', 'A barchan', 'البرخان', { alt: ['Barchan'], r: 'Barchan' }],
  ['p20', 1000, 'Lake Assal, the lowest point in Africa, is in this small country.', 'تقع بحيرة عسل، أخفض نقطة في أفريقيا، في هذا البلد الصغير.', 'Djibouti', 'جيبوتي', { r: 'Lake Assal (Djibouti)' }],
]);

JB_BANK.cat('ocean-life', { g: 'nature', e: '🐙', en: 'Ocean Life', ar: 'حياة المحيطات' }, [
  ['o01', 200, 'The largest animal known ever to have lived.', 'أكبر حيوان عُرف أنه عاش على الإطلاق.', 'The blue whale', 'الحوت الأزرق', { r: 'Blue whale' }],
  ['o02', 200, 'Orange with white stripes, this little reef fish starred in “Finding Nemo”.', 'هذه السمكة المرجانية الصغيرة البرتقالية ذات الخطوط البيضاء كانت بطلة فيلم «البحث عن نيمو».', 'The clownfish', 'سمكة المهرج', { f: 'clownfish', r: 'Amphiprioninae' }],
  ['o03', 200, 'This sea creature has eight arms.', 'لهذا الكائن البحري ثماني أذرع.', 'The octopus', 'الأخطبوط', { r: 'Octopus' }],
  ['o04', 200, 'Despite the name, these five-armed sea creatures aren’t fish at all.', 'رغم اسمها، هذه الكائنات البحرية ذات الأذرع الخمس ليست أسماكاً أبداً.', 'Starfish', 'نجم البحر', { alt: ['Sea stars'], r: 'Starfish' }],
  ['o05', 400, 'A shark’s skeleton is made of this, not bone.', 'هيكل القرش مصنوع من هذه المادة، وليس من العظم.', 'Cartilage', 'الغضروف', { r: 'Chondrichthyes' }],
  ['o06', 400, 'The largest fish in the world, a gentle filter feeder.', 'أكبر سمكة في العالم، وهي تتغذى بالترشيح بلطف.', 'The whale shark', 'القرش الحوتي', { r: 'Whale shark' }],
  ['o07', 400, 'The Great Barrier Reef lies off the coast of this country.', 'يقع الحاجز المرجاني العظيم قبالة ساحل هذا البلد.', 'Australia', 'أستراليا', { r: 'Great Barrier Reef' }],
  ['o08', 400, 'Dolphins and whales breathe through this opening on top of the head.', 'تتنفس الدلافين والحيتان من هذه الفتحة أعلى الرأس.', 'The blowhole', 'فتحة التنفس', { r: 'Blowhole (anatomy)' }],
  ['o09', 600, 'An octopus has this many hearts.', 'للأخطبوط هذا العدد من القلوب.', '3', '٣', { alt: ['Three'], altAr: ['ثلاثة'], r: 'Octopus' }],
  ['o10', 600, 'Among seahorses, this parent carries the eggs in a pouch until they hatch.', 'عند فرس البحر، هذا الوالد يحمل البيض في كيس حتى يفقس.', 'The father', 'الأب', { alt: ['The male'], altAr: ['الذكر'], r: 'Seahorse' }],
  ['o11', 600, 'Clownfish live safely among the stinging tentacles of these animals.', 'تعيش أسماك المهرج بأمان بين لوامس هذه الحيوانات اللاسعة.', 'Sea anemones', 'شقائق النعمان البحرية', { alt: ['Anemones'], f: 'clownfish', r: 'Sea anemone' }],
  ['o12', 600, 'Female sea turtles come ashore to lay their eggs on this.', 'تخرج إناث السلاحف البحرية إلى اليابسة لتضع بيضها على هذا.', 'A beach', 'الشاطئ', { alt: ['Sand', 'The beach where they hatched'], altAr: ['الرمل'], r: 'Sea turtle' }],
  ['o13', 800, 'Nicknamed the unicorn of the sea, this Arctic whale has a long spiral tusk.', 'يلقب بوحيد القرن البحري، ولهذا الحوت القطبي ناب حلزوني طويل.', 'The narwhal', 'الناروال', { r: 'Narwhal' }],
  ['o14', 800, 'The dugong of the Indian Ocean is a close relative of this other “sea cow”.', 'الأطوم في المحيط الهندي قريب من «بقرة البحر» الأخرى هذه.', 'The manatee', 'خروف البحر', { altAr: ['المناتي'], r: 'Dugong' }],
  ['o15', 800, 'The largest living turtle, named for its soft, leathery shell.', 'أكبر سلحفاة حية، وسُميت بسبب درقتها اللينة الجلدية.', 'The leatherback', 'السلحفاة جلدية الظهر', { alt: ['Leatherback sea turtle'], r: 'Leatherback sea turtle' }],
  ['o16', 800, 'The light made by living things, like the glowing lure of a deep-sea anglerfish.', 'الضوء الذي تنتجه الكائنات الحية، مثل الطُّعم المضيء لسمكة أبو الشص في الأعماق.', 'Bioluminescence', 'الإضاءة الحيوية', { r: 'Bioluminescence' }],
  ['o17', 1000, 'The Portuguese man o’ war looks like a jellyfish but is a colony of creatures of this kind.', 'تبدو قنديل «رجل الحرب البرتغالي» كقنديل البحر، لكنها مستعمرة من كائنات من هذا النوع.', 'A siphonophore', 'السيفونوفورات', { alt: ['Siphonophore'], r: 'Portuguese man o\' war' }],
  ['o18', 1000, 'The ocean sunfish, Mola mola, is among the heaviest of this huge group of fish.', 'سمكة الشمس المحيطية «مولا مولا» من أثقل أفراد هذه المجموعة الكبيرة من الأسماك.', 'Bony fish', 'الأسماك العظمية', { r: 'Ocean sunfish' }],
  ['o19', 1000, 'Thought extinct for 66 million years, a coelacanth was caught off this country in 1938.', 'بعد أن ظُنّ أنه انقرض منذ ٦٦ مليون سنة، اصطيد سمك الكولاكانث قبالة هذا البلد عام ١٩٣٨.', 'South Africa', 'جنوب أفريقيا', { r: 'Coelacanth' }],
  ['o20', 1000, 'The so-called immortal jellyfish can turn itself back into this early life stage.', 'يستطيع ما يُسمى بقنديل البحر الخالد أن يعود إلى هذه المرحلة المبكرة من حياته.', 'A polyp', 'البوليب', { alt: ['Polyp'], r: 'Turritopsis dohrnii' }],
]);

/* ---- bank/50-food.js ---- */
/* Food and drink. */
JB_BANK.cat('world-food', { g: 'food', pop: 1, e: '🍲', en: 'World Food', ar: 'أطباق العالم' }, [
  ['f01', 200, 'This dish from Naples is a flat dough topped with tomato and cheese.', 'هذا الطبق القادم من نابولي عجينة مسطحة يعلوها الطماطم والجبن.', 'Pizza', 'البيتزا', { r: 'Pizza' }],
  ['f02', 200, 'Sushi comes from this country.', 'السوشي يأتي من هذا البلد.', 'Japan', 'اليابان', { r: 'Sushi' }],
  ['f03', 200, 'This dip is made of mashed chickpeas with tahini, lemon and garlic.', 'هذه الغموسة مصنوعة من الحمص المهروس مع الطحينة والليمون والثوم.', 'Hummus', 'الحمص بالطحينة', { altAr: ['حمص'], r: 'Hummus' }],
  ['f04', 200, 'Tacos and enchiladas come from this country’s kitchen.', 'التاكو والإنتشيلادا من مطبخ هذا البلد.', 'Mexico', 'المكسيك', { r: 'Mexican cuisine' }],
  ['f05', 400, 'This spiced rice and meat dish is widely seen as Saudi Arabia’s national dish.', 'يُعد طبق الأرز واللحم المتبّل هذا الطبق الوطني للسعودية.', 'Kabsa', 'الكبسة', { r: 'Kabsa' }],
  ['f06', 400, 'This rice dish from Valencia is cooked in a wide, shallow pan.', 'طبق الأرز هذا من فالنسيا يُطهى في مقلاة واسعة ضحلة.', 'Paella', 'الباييا', { r: 'Paella' }],
  ['f07', 400, 'Deep-fried balls of ground chickpeas or fava beans.', 'كرات مقلية من الحمص أو الفول المطحون.', 'Falafel', 'الفلافل', { altAr: ['الطعمية'], r: 'Falafel' }],
  ['f08', 400, 'Korea’s famous side dish of fermented vegetables, usually cabbage.', 'الطبق الجانبي الكوري الشهير من الخضار المخمّرة، وغالباً الملفوف.', 'Kimchi', 'الكيمتشي', { r: 'Kimchi' }],
  ['f09', 600, 'Melted cheese shared from a communal pot is this Swiss dish.', 'الجبن المذاب المشترك من قِدر واحد هو هذا الطبق السويسري.', 'Fondue', 'الفوندو', { r: 'Fondue' }],
  ['f10', 600, 'Hungary’s famous beef stew, rich with paprika.', 'يخنة اللحم الهنغارية الشهيرة الغنية بالبابريكا.', 'Goulash', 'الغولاش', { r: 'Goulash' }],
  ['f11', 600, 'This leavened Indian flatbread is baked on the wall of a tandoor oven.', 'هذا الخبز الهندي المخمّر يُخبز على جدار فرن التنور.', 'Naan', 'خبز النان', { r: 'Naan' }],
  ['f12', 600, 'This Greek dish layers aubergine and minced meat under a béchamel topping.', 'هذا الطبق اليوناني طبقات من الباذنجان واللحم المفروم تحت صلصة البشاميل.', 'Moussaka', 'المسقعة', { r: 'Moussaka' }],
  ['f13', 800, 'This Italian dessert, whose name means “pick me up”, layers coffee-soaked sponge fingers with mascarpone.', 'هذه الحلوى الإيطالية، التي يعني اسمها «ارفعني»، طبقات من البسكويت المنقوع بالقهوة مع جبن الماسكاربوني.', 'Tiramisu', 'تيراميسو', { r: 'Tiramisu' }],
  ['f14', 800, 'This Japanese stock is made from kombu seaweed and dried bonito flakes.', 'هذا المرق الياباني مصنوع من أعشاب الكومبو البحرية ورقائق سمك البونيتو المجفف.', 'Dashi', 'الداشي', { r: 'Dashi' }],
  ['f15', 800, 'Layers of filo pastry, chopped nuts and syrup make this sweet.', 'طبقات من عجينة الفيلو والمكسرات المفرومة والقطر تصنع هذه الحلوى.', 'Baklava', 'البقلاوة', { r: 'Baklava' }],
  ['f16', 800, 'Peru’s national dish: raw fish cured in lime juice.', 'الطبق الوطني لبيرو: سمك نيء منقوع في عصير الليمون.', 'Ceviche', 'السيفيتشي', { r: 'Ceviche' }],
  ['f17', 1000, 'This spongy Ethiopian flatbread is made from teff flour.', 'هذا الخبز الإثيوبي الإسفنجي مصنوع من دقيق التيف.', 'Injera', 'الإنجيرا', { r: 'Injera' }],
  ['f18', 1000, 'Wheat and meat slow-cooked into a smooth porridge make this Gulf dish, popular in Ramadan.', 'القمح واللحم المطهوان ببطء حتى يصبحا عصيدة ناعمة يصنعان هذا الطبق الخليجي المحبوب في رمضان.', 'Harees', 'الهريس', { f: 'ramadan', r: 'Harees' }],
  ['f19', 1000, 'The Indonesian name nasi goreng means this.', 'الاسم الإندونيسي «ناسي غورينغ» يعني هذا.', 'Fried rice', 'الأرز المقلي', { r: 'Nasi goreng' }],
  ['f20', 1000, 'This Japanese dish is thin slices of raw fish served without rice.', 'هذا الطبق الياباني شرائح رقيقة من السمك النيء تُقدّم بلا أرز.', 'Sashimi', 'الساشيمي', { r: 'Sashimi' }],
]);

JB_BANK.cat('fruit-spices', { g: 'food', e: '🌶️', en: 'Fruit, Veg & Spices', ar: 'فواكه وخضار وبهارات' }, [
  ['g01', 200, 'Grapes become these when they are dried.', 'يصبح العنب هذا عندما يجفّ.', 'Raisins', 'الزبيب', { r: 'Raisin' }],
  ['g02', 200, 'Guacamole is made mainly from this fruit.', 'يُصنع الغواكامولي أساساً من هذه الفاكهة.', 'Avocado', 'الأفوكادو', { r: 'Guacamole' }],
  ['g03', 200, 'Long and yellow, this fruit grows in bunches called hands.', 'هذه الفاكهة الطويلة الصفراء تنمو في عناقيد تُسمى «الكفوف».', 'Banana', 'الموز', { r: 'Banana' }],
  ['g04', 200, 'In the cartoons, Popeye eats this leafy vegetable to get strong.', 'في الرسوم المتحركة، يأكل باباي هذه الخضار الورقية ليصبح قوياً.', 'Spinach', 'السبانخ', { r: 'Popeye' }],
  ['g05', 400, 'Picked by hand from crocus flowers, it is the most expensive spice by weight.', 'يُقطف يدوياً من أزهار الزعفران، وهو أغلى التوابل وزناً.', 'Saffron', 'الزعفران', { r: 'Saffron' }],
  ['g06', 400, 'Most pickles in a jar started life as this vegetable.', 'معظم المخللات في المرطبان كانت في الأصل هذه الخضار.', 'Cucumber', 'الخيار', { alt: ['Gherkin'], r: 'Pickled cucumber' }],
  ['g07', 400, 'This bright yellow spice gives many curries their colour.', 'هذا البهار الأصفر الزاهي يمنح كثيراً من أطباق الكاري لونها.', 'Turmeric', 'الكركم', { r: 'Turmeric' }],
  ['g08', 400, 'Botanically a fruit but cooked as a vegetable, it is the base of ketchup.', 'هي فاكهة نباتياً لكنها تُطهى كخضار، وهي أساس الكاتشب.', 'Tomato', 'الطماطم', { r: 'Tomato' }],
  ['g09', 600, 'This star-shaped spice is a key part of Chinese five-spice powder.', 'هذا البهار النجمي الشكل جزء أساسي من خلطة البهارات الصينية الخمس.', 'Star anise', 'اليانسون النجمي', { altAr: ['البادِيان'], r: 'Illicium verum' }],
  ['g10', 600, 'This spice is the dried inner bark of a tree.', 'هذا البهار هو اللحاء الداخلي المجفف لشجرة.', 'Cinnamon', 'القرفة', { r: 'Cinnamon' }],
  ['g11', 600, 'This spiky Southeast Asian fruit is famous, and often banned on trains, for its strong smell.', 'هذه الفاكهة الشوكية من جنوب شرق آسيا مشهورة برائحتها القوية، وكثيراً ما تُمنع في القطارات.', 'Durian', 'الدوريان', { r: 'Durian' }],
  ['g12', 600, 'Chickpeas are also known by this Spanish-derived name.', 'يُعرف الحمص أيضاً بهذا الاسم المشتق من الإسبانية.', 'Garbanzo beans', 'غاربانزو', { alt: ['Garbanzos'], r: 'Chickpea' }],
  ['g13', 800, 'These dried flower buds, once found only in the Maluku Islands, are a strong spice.', 'هذه البراعم الزهرية المجففة، التي كانت لا توجد إلا في جزر الملوك، بهار قوي.', 'Cloves', 'القرنفل', { r: 'Clove' }],
  ['g14', 800, 'Vanilla comes from the seed pods of a plant in this flower family.', 'تأتي الفانيلا من قرون بذور نبات من هذه العائلة الزهرية.', 'Orchids', 'الأوركيد', { alt: ['Orchid'], altAr: ['السحلبيات'], r: 'Vanilla' }],
  ['g15', 800, 'This tangy, deep-red ground spice is sprinkled on fattoush and musakhan.', 'يُرش هذا البهار المطحون الأحمر الداكن الحامض على الفتوش والمسخّن.', 'Sumac', 'السماق', { r: 'Sumac' }],
  ['g16', 800, 'The heat of chilli peppers is measured on this scale.', 'تُقاس حرارة الفلفل الحار بهذا المقياس.', 'The Scoville scale', 'مقياس سكوفيل', { r: 'Scoville scale' }],
  ['g17', 1000, 'This herb blend, mixed with sesame and sumac, shares its name with an Arabic word for thyme.', 'هذه الخلطة العشبية، الممزوجة بالسمسم والسماق، تحمل اسماً عربياً من أسماء نبات الصعتر.', 'Za’atar', 'الزعتر', { r: 'Za\'atar' }],
  ['g18', 1000, 'Nutmeg and this lacy red spice come from the same tree.', 'جوزة الطيب وهذا البهار الأحمر الشبكي يأتيان من الشجرة نفسها.', 'Mace', 'البسباسة', { r: 'Mace (spice)' }],
  ['g19', 1000, 'Sukkari, Ajwa and Khalas are varieties of this fruit.', 'السكري والعجوة والخلاص أصناف من هذه الفاكهة.', 'Dates', 'التمر', { r: 'Date palm' }],
  ['g20', 1000, 'Real wasabi, like mustard and horseradish, belongs to this plant family.', 'الوسابي الحقيقي، مثل الخردل والفجل الحار، ينتمي إلى هذه العائلة النباتية.', 'The cabbage family', 'العائلة الصليبية', { alt: ['Brassicaceae', 'Crucifers', 'Mustard family'], altAr: ['الكرنبية'], r: 'Wasabi' }],
]);

/* ---- bank/60-screen-music.js ---- */
/* Movies, animation and music. Facts about films and songs only (no quotes, lyrics or images). */
JB_BANK.cat('movies', { g: 'screen', pop: 1, e: '🎬', en: 'At the Movies', ar: 'في السينما' }, [
  ['v01', 200, 'James Cameron’s 1997 film about a doomed ocean liner and its maiden voyage.', 'فيلم جيمس كاميرون عام ١٩٩٧ عن سفينة ركاب منكوبة ورحلتها الأولى.', 'Titanic', 'تايتانيك', { f: 'titanic', r: 'Titanic (1997 film)' }],
  ['v02', 200, 'Dorothy’s little dog in “The Wizard of Oz”.', 'كلب دوروثي الصغير في فيلم «ساحر أوز».', 'Toto', 'توتو', { r: 'Toto (Oz)' }],
  ['v03', 200, 'In “Jurassic Park”, scientists bring these creatures back to life.', 'في فيلم «الحديقة الجوراسية» يعيد العلماء هذه المخلوقات إلى الحياة.', 'Dinosaurs', 'الديناصورات', { r: 'Jurassic Park (film)' }],
  ['v04', 200, 'The golden statuettes handed out at the Academy Awards.', 'التماثيل الذهبية التي تُمنح في حفل جوائز الأكاديمية.', 'Oscars', 'الأوسكار', { r: 'Academy Awards' }],
  ['v05', 400, 'He directed “Jaws”, “E.T.” and “Jurassic Park”.', 'أخرج «الفك المفترس» و«إي تي» و«الحديقة الجوراسية».', 'Steven Spielberg', 'ستيفن سبيلبرغ', { r: 'Steven Spielberg' }],
  ['v06', 400, 'Peter Jackson filmed “The Lord of the Rings” in this country.', 'صوّر بيتر جاكسون «سيد الخواتم» في هذا البلد.', 'New Zealand', 'نيوزيلندا', { r: 'The Lord of the Rings (film series)' }],
  ['v07', 400, 'The fictional British spy with the code number 007.', 'الجاسوس البريطاني الخيالي صاحب الرقم الرمزي ٠٠٧.', 'James Bond', 'جيمس بوند', { r: 'James Bond' }],
  ['v08', 400, 'The nickname of the Hindi-language film industry based in Mumbai.', 'لقب صناعة السينما الناطقة بالهندية ومقرها مومباي.', 'Bollywood', 'بوليوود', { r: 'Bollywood' }],
  ['v09', 600, 'When cinemas reopened in Saudi Arabia in April 2018, this Marvel film was the first shown.', 'عندما أُعيد افتتاح دور السينما في السعودية في أبريل ٢٠١٨، كان فيلم مارفل هذا أول ما عُرض.', 'Black Panther', 'بلاك بانثر', { r: 'Cinema of Saudi Arabia' }],
  ['v10', 600, 'This 2019 South Korean film was the first non-English-language winner of the Oscar for Best Picture.', 'هذا الفيلم الكوري الجنوبي عام ٢٠١٩ كان أول فيلم غير ناطق بالإنجليزية يفوز بأوسكار أفضل فيلم.', 'Parasite', 'باراسايت', { altAr: ['الطفيلي'], r: 'Parasite (2019 film)' }],
  ['v11', 600, 'This film festival is held every May on the French Riviera.', 'يُقام هذا المهرجان السينمائي كل مايو على الريفييرا الفرنسية.', 'Cannes', 'مهرجان كان', { alt: ['Cannes Film Festival'], altAr: ['كان'], r: 'Cannes Film Festival' }],
  ['v12', 600, 'Charlie Chaplin’s famous silent-film character, with a bowler hat, cane and moustache.', 'شخصية تشارلي تشابلن الشهيرة في الأفلام الصامتة، بقبعة مستديرة وعصا وشارب.', 'The Tramp', 'المتشرد', { r: 'The Tramp' }],
  ['v13', 800, 'James Cameron’s 2009 epic set on the alien moon Pandora.', 'ملحمة جيمس كاميرون عام ٢٠٠٩ التي تدور على القمر الفضائي باندورا.', 'Avatar', 'أفاتار', { r: 'Avatar (2009 film)' }],
  ['v14', 800, 'Called the Master of Suspense, he directed “Psycho” (1960).', 'لُقّب بسيد التشويق، وأخرج فيلم «سايكو» عام ١٩٦٠.', 'Alfred Hitchcock', 'ألفريد هيتشكوك', { alt: ['Hitchcock'], altAr: ['هيتشكوك'], r: 'Alfred Hitchcock' }],
  ['v15', 800, 'Orson Welles’s 1941 film about newspaper tycoon Charles Foster Kane.', 'فيلم أورسون ويلز عام ١٩٤١ عن قطب الصحافة تشارلز فوستر كين.', 'Citizen Kane', 'المواطن كين', { r: 'Citizen Kane' }],
  ['v16', 800, 'She directed “Wadjda” (2012), the first feature film shot entirely in Saudi Arabia.', 'أخرجت فيلم «وجدة» عام ٢٠١٢، أول فيلم روائي طويل يُصوَّر بالكامل في السعودية.', 'Haifaa al-Mansour', 'هيفاء المنصور', { r: 'Wadjda' }],
  ['v17', 1000, 'This 1927 war film won Best Picture at the very first Academy Awards.', 'فاز فيلم الحرب هذا من عام ١٩٢٧ بجائزة أفضل فيلم في أول حفل لجوائز الأكاديمية.', 'Wings', 'أجنحة', { r: 'Wings (1927 film)' }],
  ['v18', 1000, 'Akira Kurosawa’s 1954 film about villagers who hire warriors to defend them.', 'فيلم أكيرا كوروساوا عام ١٩٥٤ عن قرويين يستأجرون محاربين للدفاع عنهم.', 'Seven Samurai', 'الساموراي السبعة', { r: 'Seven Samurai' }],
  ['v19', 1000, 'In December 1895 these French brothers held one of the first paid public film screenings, in Paris.', 'في ديسمبر ١٨٩٥ نظّم هذان الأخوان الفرنسيان واحداً من أول العروض السينمائية العامة المدفوعة في باريس.', 'The Lumière brothers', 'الأخوان لوميير', { alt: ['Lumière'], r: 'Auguste and Louis Lumière' }],
  ['v20', 1000, 'This Syrian-American director made “The Message” (1976), about the early days of Islam.', 'أخرج هذا المخرج السوري الأمريكي فيلم «الرسالة» عام ١٩٧٦ عن بدايات الإسلام.', 'Moustapha Akkad', 'مصطفى العقاد', { r: 'Moustapha Akkad' }],
]);

JB_BANK.cat('animation', { g: 'screen', pop: 1, e: '🧸', en: 'Animated Films', ar: 'أفلام الرسوم المتحركة' }, [
  ['w01', 200, 'The young lion prince in “The Lion King” (1994).', 'الأمير الأسد الصغير في فيلم «الأسد الملك» عام ١٩٩٤.', 'Simba', 'سيمبا', { r: 'The Lion King' }],
  ['w02', 200, 'The cowboy doll who leads Andy’s toys in “Toy Story”.', 'دمية راعي البقر التي تقود ألعاب آندي في «حكاية لعبة».', 'Woody', 'وودي', { r: 'Woody (Toy Story)' }],
  ['w03', 200, 'In “Frozen”, Elsa’s younger sister.', 'في فيلم «ملكة الثلج» الأخت الصغرى لإلسا.', 'Anna', 'آنا', { r: 'Frozen (2013 film)' }],
  ['w04', 200, 'This green ogre lives in a swamp and marries Princess Fiona.', 'هذا الغول الأخضر يعيش في مستنقع ويتزوج الأميرة فيونا.', 'Shrek', 'شريك', { r: 'Shrek' }],
  ['w05', 400, 'The studio behind “Toy Story”, “Up” and “Inside Out”.', 'الاستوديو الذي أنتج «حكاية لعبة» و«فوق» و«قلباً وقالباً».', 'Pixar', 'بيكسار', { r: 'Pixar' }],
  ['w06', 400, 'The talking snowman in “Frozen” who loves warm hugs.', 'رجل الثلج المتكلم في «ملكة الثلج» الذي يحب العناق الدافئ.', 'Olaf', 'أولاف', { r: 'Olaf (Frozen)' }],
  ['w07', 400, 'This 1992 Disney film is set in the desert city of Agrabah.', 'تدور أحداث فيلم ديزني هذا من عام ١٩٩٢ في مدينة أغربة الصحراوية.', 'Aladdin', 'علاء الدين', { r: 'Aladdin (1992 Disney film)' }],
  ['w08', 400, 'This mouse became a star in the 1928 cartoon “Steamboat Willie”.', 'أصبح هذا الفأر نجماً في فيلم الرسوم «ستيمبوت ويلي» عام ١٩٢٨.', 'Mickey Mouse', 'ميكي ماوس', { r: 'Steamboat Willie' }],
  ['w09', 600, '“Spirited Away” and “My Neighbor Totoro” come from this Japanese studio.', 'فيلما «المخطوفة» و«جاري توتورو» من إنتاج هذا الاستوديو الياباني.', 'Studio Ghibli', 'استوديو جيبلي', { f: 'ghibli', r: 'Studio Ghibli' }],
  ['w10', 600, 'The forgetful blue tang fish in “Finding Nemo”.', 'سمكة التانغ الزرقاء كثيرة النسيان في «البحث عن نيمو».', 'Dory', 'دوري', { r: 'Finding Nemo' }],
  ['w11', 600, 'In Pixar’s “Up”, Carl’s house is lifted into the sky by thousands of these.', 'في فيلم «فوق» من بيكسار، يرتفع منزل كارل إلى السماء بآلاف من هذه.', 'Balloons', 'البالونات', { r: 'Up (2009 film)' }],
  ['w12', 600, 'In “Ratatouille”, this rat dreams of being a chef in Paris.', 'في فيلم «راتاتوي» يحلم هذا الفأر بأن يصبح طاهياً في باريس.', 'Remy', 'ريمي', { r: 'Ratatouille (film)' }],
  ['w13', 800, 'Disney’s first full-length animated feature film, released in 1937.', 'أول فيلم رسوم متحركة طويل من ديزني، صدر عام ١٩٣٧.', 'Snow White and the Seven Dwarfs', 'سنو وايت والأقزام السبعة', { alt: ['Snow White'], altAr: ['بياض الثلج'], r: 'Snow White and the Seven Dwarfs (1937 film)' }],
  ['w14', 800, 'Pixar’s “Coco” is built around this Mexican holiday honouring the dead.', 'يدور فيلم «كوكو» من بيكسار حول هذا العيد المكسيكي الذي يكرّم الموتى.', 'The Day of the Dead', 'يوم الموتى', { alt: ['Día de los Muertos'], r: 'Coco (2017 film)' }],
  ['w15', 800, 'In a 2008 Pixar film, this little robot is left alone to clean up an abandoned Earth.', 'في فيلم بيكسار عام ٢٠٠٨، يُترك هذا الروبوت الصغير وحيداً لتنظيف أرض مهجورة.', 'WALL-E', 'وول-إي', { r: 'WALL-E' }],
  ['w16', 800, 'Hayao Miyazaki’s 1988 film features a giant furry forest spirit and a Catbus.', 'يضم فيلم هاياو ميازاكي عام ١٩٨٨ روح غابة عملاقة فروية وحافلة على شكل قطة.', 'My Neighbor Totoro', 'جاري توتورو', { f: 'ghibli', r: 'My Neighbor Totoro' }],
  ['w17', 1000, 'In 1992 this Disney film became the first animated feature nominated for the Oscar for Best Picture.', 'في عام ١٩٩٢ أصبح فيلم ديزني هذا أول فيلم رسوم متحركة طويل يُرشّح لأوسكار أفضل فيلم.', 'Beauty and the Beast', 'الجميلة والوحش', { r: 'Beauty and the Beast (1991 film)' }],
  ['w18', 1000, 'Disney’s 1940 film set animation to classical music, with Mickey as the sorcerer’s apprentice.', 'جمع فيلم ديزني عام ١٩٤٠ الرسوم المتحركة مع الموسيقى الكلاسيكية، وفيه ميكي في دور تلميذ الساحر.', 'Fantasia', 'فانتازيا', { r: 'Fantasia (1940 film)' }],
  ['w19', 1000, 'Miyazaki’s “Spirited Away” won the Oscar for Best Animated Feature at the ceremony held in this year.', 'فاز فيلم ميازاكي «المخطوفة» بأوسكار أفضل فيلم رسوم متحركة في حفل أُقيم في هذا العام.', '2003', '٢٠٠٣', { f: 'ghibli', r: 'Spirited Away' }],
  ['w20', 1000, 'The feared restaurant critic in “Ratatouille”.', 'الناقد المطعمي المرهوب في فيلم «راتاتوي».', 'Anton Ego', 'أنطون إيغو', { r: 'Ratatouille (film)' }],
]);

JB_BANK.cat('music', { g: 'music', pop: 1, e: '🎤', en: 'Music', ar: 'موسيقى' }, [
  ['x01', 200, 'Called the King of Pop, he released the album “Thriller” in 1982.', 'لُقّب بملك البوب، وأصدر ألبوم «ثريلر» عام ١٩٨٢.', 'Michael Jackson', 'مايكل جاكسون', { r: 'Michael Jackson' }],
  ['x02', 200, 'John, Paul, George and Ringo were this band from Liverpool.', 'جون وبول وجورج ورينغو كانوا هذه الفرقة من ليفربول.', 'The Beatles', 'البيتلز', { r: 'The Beatles' }],
  ['x03', 200, 'This British singer had huge hits with “Hello” and “Someone Like You”.', 'حققت هذه المغنية البريطانية نجاحاً هائلاً بأغنيتي «Hello» و«Someone Like You».', 'Adele', 'أديل', { r: 'Adele' }],
  ['x04', 200, 'A group of three musicians.', 'مجموعة من ثلاثة موسيقيين.', 'A trio', 'ثلاثي', { alt: ['Trio'], r: 'Trio (music)' }],
  ['x05', 400, 'This German composer wrote nine symphonies and kept composing after he went deaf.', 'كتب هذا الملحن الألماني تسع سيمفونيات واستمر في التأليف بعد أن فقد سمعه.', 'Ludwig van Beethoven', 'لودفيغ فان بيتهوفن', { alt: ['Beethoven'], altAr: ['بيتهوفن'], r: 'Ludwig van Beethoven' }],
  ['x06', 400, 'Called “the Star of the East”, this Egyptian singer was famous for “Enta Omri”.', 'لُقّبت بـ«كوكب الشرق»، واشتهرت هذه المطربة المصرية بأغنية «إنت عمري».', 'Umm Kulthum', 'أم كلثوم', { r: 'Umm Kulthum' }],
  ['x07', 400, 'Wolfgang Amadeus Mozart was born in this Austrian city in 1756.', 'وُلد فولفغانغ أماديوس موزارت في هذه المدينة النمساوية عام ١٧٥٦.', 'Salzburg', 'سالزبورغ', { r: 'Wolfgang Amadeus Mozart' }],
  ['x08', 400, 'Freddie Mercury was the lead singer of this rock band.', 'كان فريدي ميركوري المغني الرئيسي لفرقة الروك هذه.', 'Queen', 'كوين', { r: 'Queen (band)' }],
  ['x09', 600, 'This South Korean group topped the US Billboard Hot 100 with “Dynamite” in 2020.', 'تصدّرت هذه الفرقة الكورية الجنوبية قائمة بيلبورد هوت ١٠٠ الأمريكية بأغنية «Dynamite» عام ٢٠٢٠.', 'BTS', 'بي تي إس', { r: 'BTS' }],
  ['x10', 600, 'Bob Marley made this Jamaican music style famous around the world.', 'جعل بوب مارلي هذا النمط الموسيقي الجامايكي مشهوراً حول العالم.', 'Reggae', 'الريغي', { r: 'Reggae' }],
  ['x11', 600, 'The musical instruction for “very loud”, marked ff.', 'المصطلح الموسيقي لـ«عالٍ جداً»، ويُكتب ff.', 'Fortissimo', 'فورتيسيمو', { r: 'Dynamics (music)' }],
  ['x12', 600, 'This Saudi singer is known as “Fannan Al Arab”, the Artist of the Arabs.', 'يُعرف هذا المطرب السعودي بلقب «فنان العرب».', 'Mohammed Abdu', 'محمد عبده', { r: 'Mohammed Abdu' }],
  ['x13', 800, 'Born Nouhad Haddad, this Lebanese singer is called the voice of Beirut.', 'وُلدت باسم نهاد حداد، وتُلقّب هذه المطربة اللبنانية بصوت بيروت.', 'Fairuz', 'فيروز', { r: 'Fairuz' }],
  ['x14', 800, 'Antonio Vivaldi’s set of four violin concertos, each named after a time of year.', 'مجموعة أنطونيو فيفالدي من أربعة كونشيرتوات للكمان، كل منها باسم وقت من السنة.', 'The Four Seasons', 'الفصول الأربعة', { r: 'The Four Seasons (Vivaldi)' }],
  ['x15', 800, 'Written music sits on a staff made of this many lines.', 'تُكتب النوتة الموسيقية على مدرج من هذا العدد من الخطوط.', '5', '٥', { alt: ['Five'], altAr: ['خمسة'], r: 'Staff (music)' }],
  ['x16', 800, 'Luis Fonsi, who sang the 2017 hit “Despacito”, is from this Caribbean island.', 'لويس فونسي، مغني أغنية «ديسباسيتو» الشهيرة عام ٢٠١٧، من هذه الجزيرة الكاريبية.', 'Puerto Rico', 'بورتوريكو', { r: 'Luis Fonsi' }],
  ['x17', 1000, 'The Sugar Plum Fairy dances in this Tchaikovsky ballet.', 'ترقص جنية البرقوق السكري في باليه تشايكوفسكي هذا.', 'The Nutcracker', 'كسارة البندق', { r: 'The Nutcracker' }],
  ['x18', 1000, 'The system of melodic modes, such as Rast and Bayati, used in Arabic music.', 'نظام الأنماط اللحنية، مثل الراست والبياتي، المستخدم في الموسيقى العربية.', 'Maqam', 'المقام', { alt: ['Maqamat'], altAr: ['المقامات'], r: 'Arabic maqam' }],
  ['x19', 1000, 'This Austrian composer, a friend of Mozart’s, is called the “Father of the Symphony”.', 'يُلقّب هذا الملحن النمساوي، صديق موزارت، بـ«أبي السيمفونية».', 'Joseph Haydn', 'جوزيف هايدن', { alt: ['Haydn'], altAr: ['هايدن'], r: 'Joseph Haydn' }],
  ['x20', 1000, 'Giacomo Puccini’s opera about a young geisha in Nagasaki.', 'أوبرا جاكومو بوتشيني عن غيشا شابة في ناغازاكي.', 'Madama Butterfly', 'مدام بترفلاي', { r: 'Madama Butterfly' }],
]);

JB_BANK.cat('instruments', { g: 'music', e: '🎻', en: 'Musical Instruments', ar: 'آلات موسيقية' }, [
  ['z01', 200, 'A standard acoustic guitar has this many strings.', 'للغيتار الصوتي العادي هذا العدد من الأوتار.', '6', '٦', { alt: ['Six'], altAr: ['ستة'], r: 'Guitar' }],
  ['z02', 200, 'A standard modern one has 88 black and white keys.', 'الآلة الحديثة العادية منه فيها ٨٨ مفتاحاً أبيض وأسود.', 'The piano', 'البيانو', { r: 'Piano' }],
  ['z03', 200, 'This small wind instrument with reeds is played by breathing in and out, often in blues music.', 'تُعزف هذه الآلة النفخية الصغيرة ذات الألسنة بالشهيق والزفير، وكثيراً في موسيقى البلوز.', 'The harmonica', 'الهارمونيكا', { r: 'Harmonica' }],
  ['z04', 200, 'This stringed instrument is held under the chin and played with a bow.', 'تُمسك هذه الآلة الوترية تحت الذقن وتُعزف بالقوس.', 'The violin', 'الكمان', { r: 'Violin' }],
  ['z05', 400, 'This pear-shaped, fretless stringed instrument is at the heart of Arabic music.', 'هذه الآلة الوترية الكمثرية الشكل بلا دساتين في قلب الموسيقى العربية.', 'The oud', 'العود', { r: 'Oud' }],
  ['z06', 400, 'The Great Highland bagpipe is the national instrument of this country.', 'مزمار القربة الهايلاندي هو الآلة الوطنية لهذا البلد.', 'Scotland', 'اسكتلندا', { r: 'Great Highland bagpipe' }],
  ['z07', 400, 'The trumpet, trombone and tuba belong to this instrument family.', 'البوق والترومبون والتوبا تنتمي إلى هذه العائلة من الآلات.', 'Brass', 'النحاسيات', { alt: ['Brass instruments'], altAr: ['الآلات النحاسية'], r: 'Brass instrument' }],
  ['z08', 400, 'The didgeridoo was first played by Aboriginal people of this country.', 'أول من عزف على الديدجريدو هم السكان الأصليون لهذا البلد.', 'Australia', 'أستراليا', { r: 'Didgeridoo' }],
  ['z09', 600, 'This goblet-shaped hand drum is played across the Middle East and North Africa.', 'تُعزف هذه الطبلة اليدوية على شكل كأس في أنحاء الشرق الأوسط وشمال أفريقيا.', 'The darbuka', 'الدربكة', { alt: ['Doumbek', 'Tabla'], altAr: ['الطبلة'], r: 'Goblet drum' }],
  ['z10', 600, 'Orchestras usually tune to the A played by this double-reed woodwind.', 'تضبط الأوركسترا أوتارها عادة على نغمة «لا» من هذه الآلة الخشبية ذات اللسان المزدوج.', 'The oboe', 'المزمار (أوبوا)', { altAr: ['الأوبوا'], r: 'Oboe' }],
  ['z11', 600, 'Steel pans, or steel drums, were developed in this Caribbean country.', 'طُوّرت الطبول الفولاذية في هذا البلد الكاريبي.', 'Trinidad and Tobago', 'ترينيداد وتوباغو', { alt: ['Trinidad'], r: 'Steelpan' }],
  ['z12', 600, 'This long Japanese zither traditionally has 13 strings.', 'لهذه الآلة اليابانية الطويلة من فصيلة القانون ١٣ وتراً تقليدياً.', 'The koto', 'الكوتو', { r: 'Koto (instrument)' }],
  ['z13', 800, 'This end-blown reed flute is central to Sufi and classical Middle Eastern music.', 'هذا الناي القصبي المنفوخ من طرفه أساسي في الموسيقى الصوفية والشرقية الكلاسيكية.', 'The ney', 'الناي', { alt: ['Nay'], r: 'Ney' }],
  ['z14', 800, 'Belgian Adolphe Sax invented this instrument in the 1840s.', 'اخترع البلجيكي أدولف ساكس هذه الآلة في أربعينيات القرن التاسع عشر.', 'The saxophone', 'الساكسفون', { r: 'Saxophone' }],
  ['z15', 800, 'Ravi Shankar was a world-famous master of this Indian stringed instrument.', 'كان رافي شانكار أستاذاً عالمي الشهرة في هذه الآلة الوترية الهندية.', 'The sitar', 'السيتار', { r: 'Sitar' }],
  ['z16', 800, 'This trapezoid zither of Arabic and Turkish music is plucked on the player’s lap.', 'هذه الآلة الوترية شبه المنحرفة في الموسيقى العربية والتركية تُعزف على حجر العازف.', 'The qanun', 'القانون', { alt: ['Kanun'], r: 'Qanun (instrument)' }],
  ['z17', 1000, 'This electronic instrument is played without touching it, by moving your hands near two antennas.', 'تُعزف هذه الآلة الإلكترونية دون لمسها، بتحريك اليدين قرب هوائيين.', 'The theremin', 'الثيرمين', { r: 'Theremin' }],
  ['z18', 1000, 'This Indonesian ensemble is built around gongs and metallophones.', 'تقوم هذه الفرقة الإندونيسية على الصنوج والآلات المعدنية الإيقاعية.', 'Gamelan', 'الغاميلان', { r: 'Gamelan' }],
  ['z19', 1000, 'This one-string bowed fiddle traditionally accompanies Bedouin poets.', 'ترافق هذه الآلة ذات الوتر الواحد التي تُعزف بالقوس شعراءَ البادية تقليدياً.', 'The rababa', 'الربابة', { alt: ['Rebab', 'Rababah'], r: 'Rebab' }],
  ['z20', 1000, 'The deepest-sounding woodwind in a standard orchestra.', 'أعمق آلات النفخ الخشبية صوتاً في الأوركسترا المعتادة.', 'The contrabassoon', 'الكونترباصون', { alt: ['Double bassoon'], r: 'Contrabassoon' }],
]);

/* ---- bank/70-sports.js ---- */
/* Sports. Records and "most ever" facts are marked time-sensitive (c: 1, asOf). */
JB_BANK.cat('football', { g: 'sports', pop: 1, e: '⚽', en: 'Football', ar: 'كرة القدم' }, [
  ['k01', 200, 'Each football team has this many players on the pitch at kick-off.', 'لكل فريق كرة قدم هذا العدد من اللاعبين في الملعب عند صافرة البداية.', '11', '١١', { r: 'Association football' }],
  ['k02', 200, 'The men’s FIFA World Cup is held once every this many years.', 'تُقام كأس العالم للرجال مرة كل هذا العدد من السنوات.', '4', '٤', { alt: ['Four'], altAr: ['أربع'], r: 'FIFA World Cup' }],
  ['k03', 200, 'With five titles, this country has won the most men’s World Cups.', 'بخمسة ألقاب، فاز هذا البلد بأكبر عدد من بطولات كأس العالم للرجال.', 'Brazil', 'البرازيل', { c: 1, asOf: '2026-06', r: 'FIFA World Cup' }],
  ['k04', 200, 'This Argentine captain finally won the World Cup in 2022.', 'رفع هذا القائد الأرجنتيني كأس العالم أخيراً عام ٢٠٢٢.', 'Lionel Messi', 'ليونيل ميسي', { alt: ['Messi'], altAr: ['ميسي'], f: 'arg2022', r: 'Lionel Messi' }],
  ['k05', 400, 'Real Madrid and Barcelona play in this country’s top league.', 'يلعب ريال مدريد وبرشلونة في الدوري الممتاز لهذا البلد.', 'Spain', 'إسبانيا', { r: 'La Liga' }],
  ['k06', 400, 'The first World Cup was held in 1930 in this country, which also won it.', 'أُقيمت أول كأس عالم عام ١٩٣٠ في هذا البلد، وفاز بها أيضاً.', 'Uruguay', 'الأوروغواي', { r: '1930 FIFA World Cup' }],
  ['k07', 400, 'This English club is nicknamed the Red Devils.', 'يُلقّب هذا النادي الإنجليزي بالشياطين الحمر.', 'Manchester United', 'مانشستر يونايتد', { r: 'Manchester United F.C.' }],
  ['k08', 400, 'The name for one player scoring three goals in a single match.', 'اسم تسجيل لاعب واحد ثلاثة أهداف في مباراة واحدة.', 'A hat-trick', 'هاتريك', { alt: ['Hat-trick', 'Hat trick'], r: 'Hat-trick' }],
  ['k09', 600, 'Saudi Arabia stunned this team 2–1 in a 2022 World Cup group match.', 'فاجأت السعودية هذا المنتخب بالفوز عليه ٢–١ في دور المجموعات بكأس العالم ٢٠٢٢.', 'Argentina', 'الأرجنتين', { f: 'arg2022', r: 'Argentina v Saudi Arabia (2022 FIFA World Cup)' }],
  ['k10', 600, 'Saudi club Al-Nassr signed this Portuguese superstar at the end of 2022.', 'تعاقد نادي النصر السعودي مع هذا النجم البرتغالي في نهاية عام ٢٠٢٢.', 'Cristiano Ronaldo', 'كريستيانو رونالدو', { alt: ['Ronaldo'], altAr: ['رونالدو'], r: 'Cristiano Ronaldo' }],
  ['k11', 600, 'The 2026 World Cup is co-hosted by the United States, Mexico and this country.', 'تستضيف كأس العالم ٢٠٢٦ الولايات المتحدة والمكسيك وهذا البلد.', 'Canada', 'كندا', { r: '2026 FIFA World Cup' }],
  ['k12', 600, 'This country beat Argentina in the 2014 World Cup final in Brazil.', 'فاز هذا البلد على الأرجنتين في نهائي كأس العالم ٢٠١٤ في البرازيل.', 'Germany', 'ألمانيا', { r: '2014 FIFA World Cup final' }],
  ['k13', 800, 'France Football magazine’s famous award for the best player of the year.', 'جائزة مجلة فرانس فوتبول الشهيرة لأفضل لاعب في العام.', 'The Ballon d’Or', 'الكرة الذهبية', { alt: ['Ballon d\'Or'], r: 'Ballon d\'Or' }],
  ['k14', 800, 'In December 2024 FIFA confirmed this country as host of the 2034 men’s World Cup.', 'في ديسمبر ٢٠٢٤ أكدت فيفا استضافة هذا البلد لكأس العالم للرجال ٢٠٣٤.', 'Saudi Arabia', 'السعودية', { r: '2034 FIFA World Cup' }],
  ['k15', 800, 'Nicknamed “O Rei”, this Brazilian won three World Cups as a player.', 'لُقّب بـ«الملك»، وفاز هذا البرازيلي بثلاث كؤوس عالم لاعباً.', 'Pelé', 'بيليه', { r: 'Pelé' }],
  ['k16', 800, 'Football’s world governing body, founded in Paris in 1904.', 'الهيئة العالمية لكرة القدم، التي تأسست في باريس عام ١٩٠٤.', 'FIFA', 'فيفا', { altAr: ['الاتحاد الدولي لكرة القدم'], r: 'FIFA' }],
  ['k17', 1000, 'Saudi Arabia played at its first World Cup in this year, in the United States.', 'شاركت السعودية في أول كأس عالم لها في هذا العام، في الولايات المتحدة.', '1994', '١٩٩٤', { f: 'ksa1994', r: 'Saudi Arabia at the FIFA World Cup' }],
  ['k18', 1000, 'Saeed Al-Owairan’s famous solo goal at the 1994 World Cup came against this country.', 'جاء هدف سعيد العويران الفردي الشهير في كأس العالم ١٩٩٤ في مرمى هذا البلد.', 'Belgium', 'بلجيكا', { f: 'ksa1994', r: 'Saeed Al-Owairan' }],
  ['k19', 1000, 'Diego Maradona’s “Hand of God” goal in 1986 was scored against this team.', 'سجّل دييغو مارادونا هدف «يد الله» عام ١٩٨٦ في مرمى هذا المنتخب.', 'England', 'إنجلترا', { r: 'Hand of God goal' }],
  ['k20', 1000, 'This country won the first Women’s World Cup, in 1991.', 'فاز هذا البلد بأول كأس عالم للسيدات عام ١٩٩١.', 'The United States', 'الولايات المتحدة', { alt: ['USA'], r: '1991 FIFA Women\'s World Cup' }],
]);

JB_BANK.cat('olympics', { g: 'sports', pop: 1, e: '🥇', en: 'The Olympics', ar: 'الألعاب الأولمبية' }, [
  ['q01', 200, 'The Olympic flag shows this many interlocking rings.', 'يُظهر العلم الأولمبي هذا العدد من الحلقات المتشابكة.', '5', '٥', { alt: ['Five'], altAr: ['خمس'], r: 'Olympic symbols' }],
  ['q02', 200, 'This Jamaican sprinter set the 100 m world record of 9.58 seconds in 2009.', 'سجّل هذا العدّاء الجامايكي الرقم القياسي العالمي في ١٠٠ متر بزمن ٩٫٥٨ ثانية عام ٢٠٠٩.', 'Usain Bolt', 'يوسين بولت', { c: 1, asOf: '2026-06', r: 'Usain Bolt' }],
  ['q03', 200, 'Olympic champions receive a medal named after this metal.', 'يحصل الأبطال الأولمبيون على ميدالية تحمل اسم هذا المعدن.', 'Gold', 'الذهب', { r: 'Olympic medal' }],
  ['q04', 200, 'The 2024 Summer Olympics were held in this city.', 'أُقيمت الألعاب الأولمبية الصيفية ٢٠٢٤ في هذه المدينة.', 'Paris', 'باريس', { r: '2024 Summer Olympics' }],
  ['q05', 400, 'This American swimmer won 23 Olympic gold medals.', 'فاز هذا السبّاح الأمريكي بـ٢٣ ميدالية ذهبية أولمبية.', 'Michael Phelps', 'مايكل فيلبس', { r: 'Michael Phelps' }],
  ['q06', 400, 'This 42.195-km race is named after a battlefield in ancient Greece.', 'هذا السباق البالغ ٤٢٫١٩٥ كيلومتراً سُمّي باسم ساحة معركة في اليونان القديمة.', 'The marathon', 'الماراثون', { r: 'Marathon' }],
  ['q07', 400, 'This Olympic event packs ten track and field events into two days.', 'تجمع هذه المسابقة الأولمبية عشر مسابقات في ألعاب القوى في يومين.', 'The decathlon', 'العشاري', { altAr: ['المسابقة العشارية'], r: 'Decathlon' }],
  ['q08', 400, 'The first modern Olympic Games were held in this city in 1896.', 'أُقيمت أول ألعاب أولمبية حديثة في هذه المدينة عام ١٨٩٦.', 'Athens', 'أثينا', { r: '1896 Summer Olympics' }],
  ['q09', 600, 'In 2022 it became the first city to have hosted both the Summer and Winter Olympics.', 'في عام ٢٠٢٢ أصبحت أول مدينة تستضيف الألعاب الأولمبية الصيفية والشتوية معاً.', 'Beijing', 'بكين', { r: '2022 Winter Olympics' }],
  ['q10', 600, 'This Romanian gymnast scored the first perfect 10 in Olympic gymnastics, in 1976.', 'سجّلت لاعبة الجمباز الرومانية هذه أول علامة كاملة ١٠ في الجمباز الأولمبي عام ١٩٧٦.', 'Nadia Comăneci', 'ناديا كومانتشي', { r: 'Nadia Comăneci' }],
  ['q11', 600, 'At these Games Hadi Souan won silver in the 400 m hurdles, one of Saudi Arabia’s first two Olympic medals.', 'في هذه الدورة أحرز هادي صوعان فضية سباق ٤٠٠ متر حواجز، وهي من أول ميداليتين أولمبيتين للسعودية.', 'Sydney 2000', 'سيدني ٢٠٠٠', { alt: ['Sydney', '2000'], altAr: ['سيدني'], r: 'Hadi Soua\'an Al-Somaily' }],
  ['q12', 600, 'The Olympic motto “Citius, Altius, Fortius” means faster, higher and this.', 'الشعار الأولمبي «Citius, Altius, Fortius» يعني أسرع وأعلى وهذه الكلمة.', 'Stronger', 'أقوى', { r: 'List of Olympic mottos' }],
  ['q13', 800, 'Jesse Owens won four gold medals at the 1936 Olympics in this city.', 'فاز جيسي أوينز بأربع ميداليات ذهبية في أولمبياد ١٩٣٦ في هذه المدينة.', 'Berlin', 'برلين', { r: 'Jesse Owens' }],
  ['q14', 800, 'In 2012 this judoka and runner Sarah Attar became the first women to compete for Saudi Arabia at the Olympics.', 'في عام ٢٠١٢ أصبحت لاعبة الجودو هذه والعدّاءة سارة عطار أول امرأتين تمثلان السعودية في الأولمبياد.', 'Wojdan Shaherkani', 'وجدان شهرخاني', { r: 'Wojdan Shaherkani' }],
  ['q15', 800, 'In 2019 this Kenyan became the first person to run a marathon distance in under two hours, in a special event.', 'في عام ٢٠١٩ أصبح هذا الكيني أول إنسان يركض مسافة الماراثون في أقل من ساعتين، في حدث خاص.', 'Eliud Kipchoge', 'إليود كيبتشوغي', { alt: ['Kipchoge'], r: 'Ineos 1:59 Challenge' }],
  ['q16', 800, 'Dick Fosbury’s backwards “flop” changed this event forever in 1968.', 'غيّرت قفزة ديك فوسبري الخلفية هذه المسابقة إلى الأبد عام ١٩٦٨.', 'The high jump', 'الوثب العالي', { r: 'Fosbury flop' }],
  ['q17', 1000, 'Pierre de Coubertin helped found this body in Paris in 1894.', 'ساعد بيير دي كوبرتان في تأسيس هذه الهيئة في باريس عام ١٨٩٤.', 'The International Olympic Committee', 'اللجنة الأولمبية الدولية', { alt: ['IOC'], r: 'International Olympic Committee' }],
  ['q18', 1000, 'Ukrainian Sergey Bubka broke the world record in this event 35 times.', 'حطّم الأوكراني سيرغي بوبكا الرقم القياسي العالمي في هذه المسابقة ٣٥ مرة.', 'The pole vault', 'القفز بالزانة', { r: 'Sergey Bubka' }],
  ['q19', 1000, 'The first Winter Olympics were held in 1924 in this French Alpine town.', 'أُقيمت أول ألعاب أولمبية شتوية عام ١٩٢٤ في هذه البلدة الفرنسية في جبال الألب.', 'Chamonix', 'شامونيه', { r: '1924 Winter Olympics' }],
  ['q20', 1000, 'Bob Beamon’s astonishing 1968 long jump was made in the thin air of this city.', 'حقق بوب بيمون قفزته الطويلة المذهلة عام ١٩٦٨ في الهواء الخفيف لهذه المدينة.', 'Mexico City', 'مكسيكو سيتي', { r: 'Bob Beamon' }],
]);

JB_BANK.cat('sports-world', { g: 'sports', e: '🏁', en: 'Sports Around the World', ar: 'رياضات حول العالم' }, [
  ['h01', 200, 'A basketball team has this many players on court at a time.', 'لفريق كرة السلة هذا العدد من اللاعبين في الملعب في وقت واحد.', '5', '٥', { alt: ['Five'], altAr: ['خمسة'], r: 'Basketball' }],
  ['h02', 200, 'The oldest tennis tournament, played on grass in London every summer.', 'أقدم بطولة تنس، وتُلعب على العشب في لندن كل صيف.', 'Wimbledon', 'ويمبلدون', { r: 'Wimbledon Championships' }],
  ['h03', 200, 'In motor racing, waving this black-and-white flag means the race is over.', 'في سباقات السيارات، رفع هذا العلم الأبيض والأسود يعني انتهاء السباق.', 'The chequered flag', 'العلم المربّع', { alt: ['Checkered flag'], r: 'Racing flags' }],
  ['h04', 200, 'The Super Bowl is the championship game of this sport.', 'السوبر بول هي المباراة النهائية لهذه الرياضة.', 'American football', 'كرة القدم الأمريكية', { r: 'Super Bowl' }],
  ['h05', 400, 'In this Japanese sport, huge wrestlers try to push each other out of a ring.', 'في هذه الرياضة اليابانية يحاول مصارعون ضخام دفع بعضهم خارج الحلبة.', 'Sumo', 'السومو', { r: 'Sumo' }],
  ['h06', 400, 'In cricket, an over is made up of this many balls.', 'في الكريكت يتكون «الأوفر» من هذا العدد من الرميات.', '6', '٦', { alt: ['Six'], altAr: ['ست'], r: 'Over (cricket)' }],
  ['h07', 400, 'Tiger Woods is one of the greatest players of this sport.', 'تايغر وودز من أعظم لاعبي هذه الرياضة.', 'Golf', 'الغولف', { r: 'Tiger Woods' }],
  ['h08', 400, 'The famous three-week bicycle race held every July.', 'سباق الدراجات الشهير الذي يستمر ثلاثة أسابيع ويُقام كل يوليو.', 'The Tour de France', 'طواف فرنسا', { r: 'Tour de France' }],
  ['h09', 600, 'The Jeddah Corniche Circuit hosts a race in this championship.', 'تستضيف حلبة كورنيش جدة سباقاً في هذه البطولة.', 'Formula 1', 'الفورمولا ١', { alt: ['F1', 'Formula One'], r: 'Jeddah Corniche Circuit' }],
  ['h10', 600, 'The tennis Grand Slam played on red clay in Paris.', 'بطولة التنس الكبرى التي تُلعب على الملاعب الترابية الحمراء في باريس.', 'The French Open', 'بطولة فرنسا المفتوحة', { alt: ['Roland-Garros'], altAr: ['رولان غاروس'], r: 'French Open' }],
  ['h11', 600, 'A perfect game in ten-pin bowling scores this many points.', 'المباراة الكاملة في البولينغ تحقق هذا العدد من النقاط.', '300', '٣٠٠', { r: 'Perfect game (bowling)' }],
  ['h12', 600, 'Hunting with trained birds of prey, a treasured tradition in the Gulf.', 'الصيد بالطيور الجارحة المدرّبة، وهو تقليد عزيز في الخليج.', 'Falconry', 'الصقارة', { altAr: ['القنص'], r: 'Falconry' }],
  ['h13', 800, 'Badminton takes its name from the country house of this English duke.', 'أخذت الريشة الطائرة (البادمنتون) اسمها من القصر الريفي لهذا الدوق الإنجليزي.', 'The Duke of Beaufort', 'دوق بوفورت', { alt: ['Beaufort'], r: 'Badminton House' }],
  ['h14', 800, 'In snooker, the highest-scoring colour ball, worth 7 points.', 'في السنوكر، الكرة الملونة الأعلى قيمة، وتساوي ٧ نقاط.', 'The black', 'الكرة السوداء', { alt: ['Black'], r: 'Snooker' }],
  ['h15', 800, 'This Korean martial art is famous for its high, spinning kicks.', 'هذا الفن القتالي الكوري مشهور بركلاته العالية الدوّارة.', 'Taekwondo', 'التايكوندو', { r: 'Taekwondo' }],
  ['h16', 800, 'The Dakar Rally moved to this country in 2020.', 'انتقل رالي داكار إلى هذا البلد عام ٢٠٢٠.', 'Saudi Arabia', 'السعودية', { r: 'Dakar Rally' }],
  ['h17', 1000, 'A polo team has this many riders on the field.', 'لفريق البولو هذا العدد من الفرسان في الملعب.', '4', '٤', { alt: ['Four'], altAr: ['أربعة'], r: 'Polo' }],
  ['h18', 1000, 'The National Hockey League’s championship trophy, first awarded in 1893.', 'كأس بطولة دوري الهوكي الوطني، التي مُنحت لأول مرة عام ١٨٩٣.', 'The Stanley Cup', 'كأس ستانلي', { r: 'Stanley Cup' }],
  ['h19', 1000, 'Buzkashi, played on horseback with a goat carcass, is the national sport of this country.', 'البزكشي، التي تُلعب على ظهور الخيل بجثة ماعز، هي الرياضة الوطنية لهذا البلد.', 'Afghanistan', 'أفغانستان', { r: 'Buzkashi' }],
  ['h20', 1000, 'The Henley Royal Regatta is a famous event in this sport.', 'سباق هنلي الملكي حدث شهير في هذه الرياضة.', 'Rowing', 'التجديف', { r: 'Henley Royal Regatta' }],
]);

/* ---- bank/80-games-words.js ---- */
/* Video games, languages, books and art. */
JB_BANK.cat('video-games', { g: 'games', pop: 1, e: '🎮', en: 'Video Games', ar: 'ألعاب الفيديو' }, [
  ['vg01', 200, 'Nintendo’s famous plumber, usually dressed in red.', 'السبّاك الشهير لدى نينتندو، ويرتدي عادة اللون الأحمر.', 'Mario', 'ماريو', { r: 'Mario' }],
  ['vg02', 200, 'Alexey Pajitnov created this falling-block puzzle game in 1984.', 'ابتكر أليكسي باجيتنوف لعبة الألغاز هذه ذات القطع المتساقطة عام ١٩٨٤.', 'Tetris', 'تتريس', { r: 'Tetris' }],
  ['vg03', 200, 'In this best-selling game you mine blocks and build almost anything.', 'في هذه اللعبة الأكثر مبيعاً تحفر المكعبات وتبني أي شيء تقريباً.', 'Minecraft', 'ماينكرافت', { r: 'Minecraft' }],
  ['vg04', 200, 'Pac-Man eats dots while running away from these four characters.', 'يأكل باك مان النقاط وهو يهرب من هذه الشخصيات الأربع.', 'Ghosts', 'الأشباح', { r: 'Pac-Man' }],
  ['vg05', 400, 'Sonic the Hedgehog was created as the mascot of this company.', 'صُمّم سونيك القنفذ ليكون تميمة هذه الشركة.', 'Sega', 'سيغا', { r: 'Sonic the Hedgehog' }],
  ['vg06', 400, 'This yellow electric-type creature is Pokémon’s best-known mascot.', 'هذا المخلوق الأصفر من النوع الكهربائي هو أشهر تمائم بوكيمون.', 'Pikachu', 'بيكاتشو', { r: 'Pikachu' }],
  ['vg07', 400, 'Link is the hero of this Nintendo series.', 'لينك هو بطل سلسلة نينتندو هذه.', 'The Legend of Zelda', 'أسطورة زيلدا', { alt: ['Zelda'], altAr: ['زيلدا'], r: 'The Legend of Zelda' }],
  ['vg08', 400, 'Epic Games released the battle royale mode of this game in 2017.', 'أصدرت إيبك غيمز طور «باتل رويال» لهذه اللعبة عام ٢٠١٧.', 'Fortnite', 'فورتنايت', { r: 'Fortnite' }],
  ['vg09', 600, 'This company makes the PlayStation.', 'هذه الشركة تصنع جهاز بلايستيشن.', 'Sony', 'سوني', { r: 'PlayStation' }],
  ['vg10', 600, 'After its FIFA licence ended in 2023, EA’s football series took this new name.', 'بعد انتهاء ترخيص فيفا عام ٢٠٢٣، حملت سلسلة إي إيه لكرة القدم هذا الاسم الجديد.', 'EA Sports FC', 'إي إيه سبورتس إف سي', { alt: ['EA FC'], r: 'EA Sports FC' }],
  ['vg11', 600, 'Microsoft launched its first games console under this name in 2001.', 'أطلقت مايكروسوفت أول جهاز ألعاب لها بهذا الاسم عام ٢٠٠١.', 'Xbox', 'إكس بوكس', { r: 'Xbox (console)' }],
  ['vg12', 600, 'Riyadh’s summer esports festival, called Gamers8 in 2022 and 2023, was renamed this in 2024.', 'مهرجان الرياض الصيفي للرياضات الإلكترونية، الذي حمل اسم «جيمرز ٨» في ٢٠٢٢ و٢٠٢٣، صار اسمه هذا عام ٢٠٢٤.', 'The Esports World Cup', 'كأس العالم للرياضات الإلكترونية', { r: 'Esports World Cup' }],
  ['vg13', 800, 'In this series, the Spartan warrior Kratos battles the gods of Greece and the Norse lands.', 'في هذه السلسلة يقاتل المحارب الإسبرطي كريتوس آلهة اليونان والشمال.', 'God of War', 'إله الحرب', { r: 'God of War (franchise)' }],
  ['vg14', 800, 'This Japanese company released Pac-Man in 1980.', 'أصدرت هذه الشركة اليابانية لعبة باك مان عام ١٩٨٠.', 'Namco', 'نامكو', { r: 'Pac-Man' }],
  ['vg15', 800, 'In 1981’s “Donkey Kong”, the hero later known as Mario was called this.', 'في لعبة «دونكي كونغ» عام ١٩٨١، كان البطل الذي عُرف لاحقاً باسم ماريو يُسمى هكذا.', 'Jumpman', 'جمبمان', { r: 'Donkey Kong (1981 video game)' }],
  ['vg16', 800, 'Atari’s 1972 arcade hit was a simple version of table tennis.', 'كانت لعبة أتاري الشهيرة عام ١٩٧٢ نسخة بسيطة من تنس الطاولة.', 'Pong', 'بونغ', { r: 'Pong' }],
  ['vg17', 1000, '“Spacewar!”, one of the earliest video games, was created in 1962 at this university.', 'صُنعت «سبيس وور!»، من أوائل ألعاب الفيديو، عام ١٩٦٢ في هذه الجامعة.', 'MIT', 'معهد ماساتشوستس للتقنية', { alt: ['Massachusetts Institute of Technology'], altAr: ['إم آي تي'], r: 'Spacewar!' }],
  ['vg18', 1000, 'Nintendo launched the original Game Boy in this year.', 'أطلقت نينتندو جهاز «غيم بوي» الأصلي في هذا العام.', '1989', '١٩٨٩', { r: 'Game Boy' }],
  ['vg19', 1000, 'Classic Pac-Man breaks into its famous glitchy “kill screen” at this level.', 'تنهار لعبة باك مان الكلاسيكية إلى «شاشة القتل» الشهيرة في هذا المستوى.', '256', '٢٥٦', { r: 'Pac-Man' }],
  ['vg20', 1000, 'The subtitle of “The Elder Scrolls V”, released in 2011.', 'العنوان الفرعي للعبة «ذا إلدر سكرولز ٥» الصادرة عام ٢٠١١.', 'Skyrim', 'سكايرم', { r: 'The Elder Scrolls V: Skyrim' }],
]);

JB_BANK.cat('languages', { g: 'words', e: '🔤', en: 'Languages', ar: 'لغات العالم' }, [
  ['lg01', 200, 'More people speak this language as their mother tongue than any other.', 'يتحدث هذه اللغة كلغة أم عدد من الناس أكبر من أي لغة أخرى.', 'Mandarin Chinese', 'الصينية الماندرينية', { alt: ['Mandarin', 'Chinese'], altAr: ['الصينية'], r: 'List of languages by number of native speakers' }],
  ['lg02', 200, 'Arabic is written in this direction.', 'تُكتب العربية في هذا الاتجاه.', 'Right to left', 'من اليمين إلى اليسار', { r: 'Arabic script' }],
  ['lg03', 200, '“Hola” means hello in this language.', '«Hola» تعني مرحباً في هذه اللغة.', 'Spanish', 'الإسبانية', { r: 'Spanish language' }],
  ['lg04', 200, 'The modern English alphabet has this many letters.', 'للأبجدية الإنجليزية الحديثة هذا العدد من الحروف.', '26', '٢٦', { r: 'English alphabet' }],
  ['lg05', 400, 'The Arabic alphabet has this many letters.', 'للأبجدية العربية هذا العدد من الحروف.', '28', '٢٨', { r: 'Arabic alphabet' }],
  ['lg06', 400, 'The official language of Brazil.', 'اللغة الرسمية للبرازيل.', 'Portuguese', 'البرتغالية', { r: 'Portuguese language in Brazil' }],
  ['lg07', 400, 'The English word “kindergarten” was borrowed from this language.', 'استُعيرت الكلمة الإنجليزية «kindergarten» من هذه اللغة.', 'German', 'الألمانية', { r: 'Kindergarten' }],
  ['lg08', 400, 'The word “robot” was coined in a 1920 play written in this language.', 'صُكّت كلمة «روبوت» في مسرحية عام ١٩٢٠ مكتوبة بهذه اللغة.', 'Czech', 'التشيكية', { r: 'R.U.R.' }],
  ['lg09', 600, 'Besides kanji, Japanese is written with these two syllabaries.', 'إلى جانب الكانجي، تُكتب اليابانية بهذين المقطعيين.', 'Hiragana and katakana', 'الهيراغانا والكاتاكانا', { r: 'Japanese writing system' }],
  ['lg10', 600, 'The English word “coffee” came, through Turkish and Italian, from this Arabic word.', 'جاءت الكلمة الإنجليزية «coffee»، عبر التركية والإيطالية، من هذه الكلمة العربية.', 'Qahwa', 'قهوة', { alt: ['Qahwah'], f: 'arabic-coffee', r: 'Coffee' }],
  ['lg11', 600, 'This Polish eye doctor published Esperanto in 1887.', 'نشر طبيب العيون البولندي هذا لغة الإسبرانتو عام ١٨٨٧.', 'L. L. Zamenhof', 'لودفيك زامنهوف', { alt: ['Zamenhof'], altAr: ['زامنهوف'], r: 'L. L. Zamenhof' }],
  ['lg12', 600, 'The United Nations has this many official languages.', 'للأمم المتحدة هذا العدد من اللغات الرسمية.', '6', '٦', { alt: ['Six'], altAr: ['ست'], r: 'Official languages of the United Nations' }],
  ['lg13', 800, 'Hangul, created under King Sejong in the 15th century, is the alphabet of this language.', 'الهانغول، الذي ابتُكر في عهد الملك سيجونغ في القرن الخامس عشر، هو أبجدية هذه اللغة.', 'Korean', 'الكورية', { r: 'Hangul' }],
  ['lg14', 800, 'The name Swahili comes from the Arabic word for these.', 'اسم «السواحيلية» مأخوذ من الكلمة العربية لهذه.', 'Coasts', 'السواحل', { alt: ['Coast', 'Sawahil'], r: 'Swahili language' }],
  ['lg15', 800, 'A word or phrase that reads the same backwards as forwards.', 'كلمة أو عبارة تُقرأ من الخلف كما تُقرأ من الأمام.', 'A palindrome', 'كلمة متناظرة', { alt: ['Palindrome'], altAr: ['الباليندروم'], r: 'Palindrome' }],
  ['lg16', 800, 'The language with the most native speakers in India.', 'اللغة صاحبة أكبر عدد من المتحدثين الأصليين في الهند.', 'Hindi', 'الهندية', { r: 'Languages of India' }],
  ['lg17', 1000, 'This language of northern Spain and south-west France is unrelated to any other living language.', 'هذه اللغة في شمال إسبانيا وجنوب غرب فرنسا لا تمت بصلة لأي لغة حية أخرى.', 'Basque', 'الباسكية', { r: 'Basque language' }],
  ['lg18', 1000, 'The Rosetta Stone carries the same decree in hieroglyphs, Demotic and this language.', 'يحمل حجر رشيد المرسوم نفسه بالهيروغليفية والديموطيقية وهذه اللغة.', 'Ancient Greek', 'اليونانية القديمة', { alt: ['Greek'], altAr: ['اليونانية'], f: 'rosetta', r: 'Rosetta Stone' }],
  ['lg19', 1000, 'Linguists call the shared ancestor of English, Hindi and Persian by this name.', 'يطلق علماء اللغة على السلف المشترك للإنجليزية والهندية والفارسية هذا الاسم.', 'Proto-Indo-European', 'الهندوأوروبية البدائية', { r: 'Proto-Indo-European language' }],
  ['lg20', 1000, 'Arabic is nicknamed “the language of” this letter, said to be unique to it.', 'تُلقّب العربية بـ«لغة» هذا الحرف، الذي يُقال إنها تنفرد به.', 'Ḍād (ض)', 'الضاد', { alt: ['Dad'], r: 'Ḍād' }],
]);

JB_BANK.cat('books', { g: 'words', pop: 1, e: '📖', en: 'Books & Authors', ar: 'كتب ومؤلفون' }, [
  ['bk01', 200, 'J. K. Rowling’s boy wizard, who goes to Hogwarts.', 'الساحر الصغير في روايات ج. ك. رولينغ، الذي يدرس في هوغوورتس.', 'Harry Potter', 'هاري بوتر', { r: 'Harry Potter' }],
  ['bk02', 200, 'Shakespeare’s tragedy about two young lovers from feuding families in Verona.', 'مأساة شكسبير عن عاشقين شابين من عائلتين متخاصمتين في فيرونا.', 'Romeo and Juliet', 'روميو وجولييت', { r: 'Romeo and Juliet' }],
  ['bk03', 200, 'He wrote “Alice’s Adventures in Wonderland”.', 'كتب «مغامرات أليس في بلاد العجائب».', 'Lewis Carroll', 'لويس كارول', { r: 'Lewis Carroll' }],
  ['bk04', 200, 'In “One Thousand and One Nights”, she tells the king a story every night to stay alive.', 'في «ألف ليلة وليلة» تحكي للملك قصة كل ليلة لتبقى على قيد الحياة.', 'Scheherazade', 'شهرزاد', { r: 'Scheherazade' }],
  ['bk05', 400, 'She wrote “Pride and Prejudice”.', 'كتبت رواية «كبرياء وتحامل».', 'Jane Austen', 'جين أوستن', { r: 'Jane Austen' }],
  ['bk06', 400, 'Arthur Conan Doyle’s detective lives at 221B Baker Street.', 'يسكن محقق آرثر كونان دويل في ٢٢١ب شارع بيكر.', 'Sherlock Holmes', 'شيرلوك هولمز', { r: 'Sherlock Holmes' }],
  ['bk07', 400, 'This Spanish writer gave the world Don Quixote.', 'قدّم هذا الكاتب الإسباني للعالم «دون كيخوته».', 'Miguel de Cervantes', 'ميغيل دي ثربانتس', { alt: ['Cervantes'], altAr: ['ثربانتس'], r: 'Miguel de Cervantes' }],
  ['bk08', 400, 'In 1988 this Egyptian novelist became the first Arab to win the Nobel Prize in Literature.', 'في عام ١٩٨٨ أصبح هذا الروائي المصري أول عربي يفوز بجائزة نوبل للأدب.', 'Naguib Mahfouz', 'نجيب محفوظ', { r: 'Naguib Mahfouz' }],
  ['bk09', 600, 'George Orwell’s novel of a world where Big Brother is always watching.', 'رواية جورج أورويل عن عالم يراقب فيه «الأخ الأكبر» الجميع دائماً.', 'Nineteen Eighty-Four', 'ألف وتسعمئة وأربعة وثمانون', { alt: ['1984'], altAr: ['١٩٨٤'], r: 'Nineteen Eighty-Four' }],
  ['bk10', 600, 'Leo Tolstoy’s vast novel set during Napoleon’s invasion of Russia.', 'رواية ليو تولستوي الضخمة التي تدور أثناء غزو نابليون لروسيا.', 'War and Peace', 'الحرب والسلام', { r: 'War and Peace' }],
  ['bk11', 600, 'He wrote “The Old Man and the Sea”.', 'كتب «العجوز والبحر».', 'Ernest Hemingway', 'إرنست همنغواي', { alt: ['Hemingway'], altAr: ['همنغواي'], r: 'The Old Man and the Sea' }],
  ['bk12', 600, 'Kahlil Gibran’s best-known book, published in English in 1923.', 'أشهر كتب جبران خليل جبران، الذي نُشر بالإنجليزية عام ١٩٢٣.', 'The Prophet', 'النبي', { r: 'The Prophet (book)' }],
  ['bk13', 800, 'Gabriel García Márquez’s novel follows the Buendía family in the town of Macondo.', 'تتبع رواية غابرييل غارسيا ماركيز عائلة بوينديا في بلدة ماكوندو.', 'One Hundred Years of Solitude', 'مئة عام من العزلة', { r: 'One Hundred Years of Solitude' }],
  ['bk14', 800, 'This Nigerian author wrote “Things Fall Apart” (1958).', 'كتب هذا الأديب النيجيري رواية «الأشياء تتداعى» عام ١٩٥٨.', 'Chinua Achebe', 'تشينوا أتشيبي', { r: 'Chinua Achebe' }],
  ['bk15', 800, 'This 14th-century Moroccan traveller described journeys from Tangier as far as China in his Rihla.', 'وصف هذا الرحالة المغربي في القرن الرابع عشر في «رحلته» أسفاره من طنجة حتى الصين.', 'Ibn Battuta', 'ابن بطوطة', { r: 'Ibn Battuta' }],
  ['bk16', 800, 'Murasaki Shikibu’s 11th-century Japanese work is often called the first novel.', 'يُوصف عمل موراساكي شيكيبو الياباني من القرن الحادي عشر غالباً بأنه أول رواية.', 'The Tale of Genji', 'حكاية غينجي', { r: 'The Tale of Genji' }],
  ['bk17', 1000, 'Ibn Khaldun’s 1377 introduction to his history of the world.', 'مقدمة ابن خلدون لكتابه في تاريخ العالم عام ١٣٧٧.', 'The Muqaddimah', 'المقدمة', { r: 'Muqaddimah' }],
  ['bk18', 1000, 'Dante Alighieri’s poem of a journey through Hell, Purgatory and Paradise.', 'قصيدة دانتي أليغييري عن رحلة عبر الجحيم والمطهر والفردوس.', 'The Divine Comedy', 'الكوميديا الإلهية', { r: 'Divine Comedy' }],
  ['bk19', 1000, 'This Andalusian thinker wrote “Hayy ibn Yaqzan”, about a boy raised alone on an island.', 'كتب هذا المفكر الأندلسي «حي بن يقظان» عن صبي نشأ وحيداً على جزيرة.', 'Ibn Tufail', 'ابن طفيل', { r: 'Hayy ibn Yaqdhan' }],
  ['bk20', 1000, 'This ancient Sanskrit epic tells the story of Prince Rama.', 'تروي هذه الملحمة السنسكريتية القديمة قصة الأمير راما.', 'The Ramayana', 'رامايانا', { r: 'Ramayana' }],
]);

JB_BANK.cat('art', { g: 'words', pop: 1, e: '🎨', en: 'Art & Architecture', ar: 'فن وعمارة' }, [
  ['ar01', 200, 'Leonardo da Vinci’s portrait famous for its mysterious smile.', 'لوحة ليوناردو دا فينشي المشهورة بابتسامتها الغامضة.', 'The Mona Lisa', 'الموناليزا', { altAr: ['الجوكندا'], f: 'louvre', r: 'Mona Lisa' }],
  ['ar02', 200, 'In painting, the three primary colours are red, blue and this.', 'في الرسم، الألوان الأساسية الثلاثة هي الأحمر والأزرق وهذا اللون.', 'Yellow', 'الأصفر', { r: 'Primary color' }],
  ['ar03', 200, 'This Dutch painter created “The Starry Night” and “Sunflowers”.', 'رسم هذا الفنان الهولندي «ليلة النجوم» و«عباد الشمس».', 'Vincent van Gogh', 'فينسنت فان غوخ', { alt: ['Van Gogh'], altAr: ['فان غوخ'], r: 'Vincent van Gogh' }],
  ['ar04', 200, 'This Paris museum is entered through a glass pyramid.', 'يُدخل إلى هذا المتحف الباريسي عبر هرم زجاجي.', 'The Louvre', 'اللوفر', { f: 'louvre', r: 'Louvre' }],
  ['ar05', 400, 'Michelangelo painted the ceiling of this chapel in the Vatican.', 'رسم مايكل أنجلو سقف هذه الكنيسة الصغيرة في الفاتيكان.', 'The Sistine Chapel', 'كنيسة سيستينا', { r: 'Sistine Chapel ceiling' }],
  ['ar06', 400, 'This Spanish artist co-founded Cubism and painted “Guernica”.', 'شارك هذا الفنان الإسباني في تأسيس التكعيبية ورسم «غيرنيكا».', 'Pablo Picasso', 'بابلو بيكاسو', { alt: ['Picasso'], altAr: ['بيكاسو'], r: 'Pablo Picasso' }],
  ['ar07', 400, 'The art of beautiful writing, raised to great heights in Arabic and Islamic art.', 'فن الكتابة الجميلة، الذي بلغ ذروة عالية في الفن العربي والإسلامي.', 'Calligraphy', 'الخط', { altAr: ['فن الخط العربي'], r: 'Islamic calligraphy' }],
  ['ar08', 400, 'Michelangelo’s 5-metre marble statue in Florence shows this biblical hero.', 'يُظهر تمثال مايكل أنجلو الرخامي البالغ ٥ أمتار في فلورنسا هذا البطل التوراتي.', 'David', 'داود', { r: 'David (Michelangelo)' }],
  ['ar09', 600, 'Edvard Munch’s painting of a figure clutching its face under a blood-red sky.', 'لوحة إدفارد مونك لشخص يمسك وجهه تحت سماء حمراء كالدم.', 'The Scream', 'الصرخة', { r: 'The Scream' }],
  ['ar10', 600, 'This Mexican artist is famous for her vivid self-portraits.', 'تشتهر هذه الفنانة المكسيكية بصورها الذاتية الزاهية.', 'Frida Kahlo', 'فريدا كاهلو', { r: 'Frida Kahlo' }],
  ['ar11', 600, 'This architect designed the Louvre’s glass pyramid and Hong Kong’s Bank of China Tower.', 'صمّم هذا المعماري هرم اللوفر الزجاجي وبرج بنك الصين في هونغ كونغ.', 'I. M. Pei', 'آي إم باي', { alt: ['Pei'], f: 'louvre', r: 'I. M. Pei' }],
  ['ar12', 600, 'Andy Warhol, with his soup cans, was a leader of this art movement.', 'كان آندي وارهول، بعلب الحساء الشهيرة، من رواد هذه الحركة الفنية.', 'Pop art', 'فن البوب', { r: 'Pop art' }],
  ['ar13', 800, 'This Japanese artist made the woodblock print “The Great Wave off Kanagawa”.', 'صنع هذا الفنان الياباني الطبعة الخشبية «الموجة العظيمة قبالة كاناغاوا».', 'Hokusai', 'هوكوساي', { r: 'The Great Wave off Kanagawa' }],
  ['ar14', 800, 'In 2004 this Iraqi-British architect became the first woman to win the Pritzker Prize.', 'في عام ٢٠٠٤ أصبحت هذه المعمارية العراقية البريطانية أول امرأة تفوز بجائزة بريتزكر.', 'Zaha Hadid', 'زها حديد', { r: 'Zaha Hadid' }],
  ['ar15', 800, 'Salvador Dalí’s 1931 painting of melting clocks.', 'لوحة سلفادور دالي عام ١٩٣١ للساعات الذائبة.', 'The Persistence of Memory', 'إصرار الذاكرة', { r: 'The Persistence of Memory' }],
  ['ar16', 800, 'Rembrandt and Vermeer were stars of this country’s 17th-century Golden Age.', 'كان رامبرانت وفيرمير من نجوم العصر الذهبي لهذا البلد في القرن السابع عشر.', 'The Netherlands', 'هولندا', { alt: ['Holland', 'The Dutch Republic'], r: 'Dutch Golden Age painting' }],
  ['ar17', 1000, 'The colourful geometric tilework that decorates Moroccan palaces and mosques.', 'البلاط الهندسي الملوّن الذي يزيّن القصور والمساجد المغربية.', 'Zellij', 'الزليج', { r: 'Zellij' }],
  ['ar18', 1000, 'This Florentine painted “The Birth of Venus”.', 'رسم هذا الفنان الفلورنسي «مولد فينوس».', 'Sandro Botticelli', 'ساندرو بوتيتشيلي', { alt: ['Botticelli'], altAr: ['بوتيتشيلي'], r: 'The Birth of Venus' }],
  ['ar19', 1000, 'This Spanish architect designed Valencia’s City of Arts and Sciences.', 'صمّم هذا المعماري الإسباني مدينة الفنون والعلوم في فالنسيا.', 'Santiago Calatrava', 'سانتياغو كالاترافا', { alt: ['Calatrava'], r: 'City of Arts and Sciences' }],
  ['ar20', 1000, 'The Louvre Abu Dhabi, with its vast latticed dome, was designed by this French architect.', 'صمّم هذا المعماري الفرنسي متحف اللوفر أبوظبي بقبته الشبكية الواسعة.', 'Jean Nouvel', 'جان نوفيل', { f: 'louvre', r: 'Louvre Abu Dhabi' }],
]);

JB_BANK.cat('arab-world', { g: 'arab', pop: 1, e: '🌙', en: 'The Arab World', ar: 'العالم العربي' }, [
  ['ab01', 200, 'This Arabic word for peace begins one of the world’s most common greetings.', 'هذه الكلمة العربية التي تعني الأمان تبدأ بها واحدة من أكثر التحيات انتشاراً في العالم.', 'Salam', 'السلام', { alt: ['Salaam'], r: 'As-salamu alaykum' }],
  ['ab02', 200, 'Muslims around the world face this holy city when they pray.', 'يتجه المسلمون حول العالم إلى هذه المدينة المقدسة عند الصلاة.', 'Mecca', 'مكة المكرمة', { alt: ['Makkah'], altAr: ['مكة'], r: 'Qibla' }],
  ['ab03', 200, 'The Islamic month in which Muslims fast from dawn to sunset.', 'الشهر الهجري الذي يصوم فيه المسلمون من الفجر حتى غروب الشمس.', 'Ramadan', 'رمضان', { f: 'ramadan', r: 'Ramadan' }],
  ['ab04', 200, 'This festival marks the end of the month of fasting.', 'هذا العيد يأتي في ختام شهر الصيام.', 'Eid al-Fitr', 'عيد الفطر', { r: 'Eid al-Fitr' }],
  ['ab05', 400, 'Since 2011, this has been the largest country in Africa and in the Arab world.', 'منذ عام ٢٠١١ أصبح هذا البلد أكبر دولة في أفريقيا وفي العالم العربي.', 'Algeria', 'الجزائر', { r: 'Algeria' }],
  ['ab06', 400, 'Saudi National Day is celebrated on this date each year.', 'يُحتفل باليوم الوطني السعودي في هذا التاريخ كل عام.', '23 September', '٢٣ سبتمبر', { alt: ['September 23'], r: 'Saudi National Day' }],
  ['ab07', 400, 'A green tree of this kind sits in the middle of Lebanon’s flag.', 'تتوسط علم لبنان شجرة خضراء من هذا النوع.', 'A cedar', 'الأرز', { alt: ['Cedar'], r: 'Flag of Lebanon' }],
  ['ab08', 400, 'Saudi Arabia’s national dance, performed with swords, drums and poetry.', 'الرقصة الوطنية السعودية، وتُؤدى بالسيوف والطبول والشعر.', 'Al-Ardah', 'العرضة', { alt: ['Ardah'], r: 'Ardah' }],
  ['ab09', 600, 'Queen Zenobia ruled this caravan city in the Syrian desert, famous for its colonnades.', 'حكمت الملكة زنوبيا مدينة القوافل هذه في بادية الشام، المشهورة بأعمدتها.', 'Palmyra', 'تدمر', { r: 'Palmyra' }],
  ['ab10', 600, 'The historic heart of Jeddah, a UNESCO World Heritage Site, is known by this name.', 'يُعرف قلب جدة التاريخي، المسجّل في قائمة التراث العالمي لليونسكو، بهذا الاسم.', 'Al-Balad', 'البلد', { alt: ['Historic Jeddah'], altAr: ['جدة التاريخية'], r: 'Al-Balad, Jeddah' }],
  ['ab11', 600, 'The Islamic calendar counts from the Prophet Muhammad’s migration from Mecca to this city.', 'يبدأ التقويم الهجري من هجرة النبي محمد ﷺ من مكة إلى هذه المدينة.', 'Medina', 'المدينة المنورة', { alt: ['Madinah'], altAr: ['المدينة'], r: 'Hijrah' }],
  ['ab12', 600, 'Arabic coffee is traditionally served in these small handleless cups.', 'تُقدَّم القهوة العربية تقليدياً في هذه الأكواب الصغيرة بلا مقابض.', 'Finjan', 'الفنجان', { alt: ['Finjaan'], f: 'arabic-coffee', r: 'Arabic coffee' }],
  ['ab13', 800, 'Twice a year the rising sun lights up the inner sanctuary of this temple of Ramesses II.', 'مرتين في السنة تضيء الشمس المشرقة قدس الأقداس في معبد رمسيس الثاني هذا.', 'Abu Simbel', 'أبو سمبل', { r: 'Abu Simbel' }],
  ['ab14', 800, 'The Bedouin tent woven from goat hair is called this in Arabic, meaning “house of hair”.', 'تُسمى خيمة البدو المنسوجة من شعر الماعز بهذا الاسم.', 'Bayt al-sha’ar', 'بيت الشَّعر', { alt: ['Beit al-shaar'], r: 'Black tent' }],
  ['ab15', 800, 'This Moroccan mountain town is famous for its blue-painted streets.', 'تشتهر هذه البلدة الجبلية المغربية بشوارعها المطلية بالأزرق.', 'Chefchaouen', 'شفشاون', { r: 'Chefchaouen' }],
  ['ab16', 800, 'The digits ٠١٢٣٤٥٦٧٨٩ are called this, to tell them apart from the 0–9 used in Europe.', 'تُسمى الأرقام ٠١٢٣٤٥٦٧٨٩ بهذا الاسم لتمييزها عن الأرقام 0–9 المستخدمة في أوروبا.', 'Eastern Arabic numerals', 'الأرقام العربية المشرقية', { alt: ['Arabic-Indic numerals'], altAr: ['الأرقام الهندية'], r: 'Eastern Arabic numerals' }],
  ['ab17', 1000, 'The Abbasid “House of Wisdom” was a great centre of learning in this city.', 'كان «بيت الحكمة» العباسي مركزاً عظيماً للعلم في هذه المدينة.', 'Baghdad', 'بغداد', { r: 'House of Wisdom' }],
  ['ab18', 1000, 'Founded by Fatima al-Fihri in Fez in 859, it is often called the oldest university still operating.', 'أسستها فاطمة الفهرية في فاس عام ٨٥٩، وتوصف كثيراً بأنها أقدم جامعة ما زالت تعمل.', 'Al-Qarawiyyin', 'جامعة القرويين', { altAr: ['القرويين'], r: 'University of al-Qarawiyyin' }],
  ['ab19', 1000, 'In this year Abdulaziz Al Saud recaptured Riyadh, beginning the unification of Saudi Arabia.', 'في هذا العام استعاد عبدالعزيز آل سعود الرياض، مبتدئاً توحيد المملكة.', '1902', '١٩٠٢', { r: 'Battle of Riyadh (1902)' }],
  ['ab20', 1000, 'This ancient incense-trading kingdom in Yemen had its capital at Ma’rib.', 'كانت عاصمة هذه المملكة القديمة في اليمن، التي تاجرت باللبان، مدينة مأرب.', 'Saba', 'سبأ', { alt: ['Sheba'], r: 'Sheba' }],
]);

