'use strict';

const Event = require('../models/Event');

// ── Wikipedia images: SPECIFIC to each event only ─────────────────────────────
// Key = unique keyword in event name (lowercase). Value = direct Wikimedia URL.
const WIKI_IMAGES = {
  'thrissur pooram':      'https://upload.wikimedia.org/wikipedia/commons/9/9b/Kudamatom_at_thrissur_pooram_2013_7618.JPG',
  'parassinikadavu':      'https://upload.wikimedia.org/wikipedia/commons/5/55/Parassini.jpg',
  'muthappan':            'https://upload.wikimedia.org/wikipedia/commons/5/55/Parassini.jpg',
  'theyyam':              'https://upload.wikimedia.org/wikipedia/commons/3/38/Kathivanoor_Veeran_Chemmarathi_Thara-Eripuram.jpg',
  'guruvayur':            'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg',
  'sabarimala':           'https://upload.wikimedia.org/wikipedia/commons/6/62/Sabarimala_2.jpg',
  'attukal':              'https://upload.wikimedia.org/wikipedia/commons/d/d1/Attukal_temple.jpg',
  'padmanabhaswamy':      'https://upload.wikimedia.org/wikipedia/commons/d/d2/Sree_Padmanabhaswamy_temple_01.jpg',
  'nenmara':              'https://upload.wikimedia.org/wikipedia/commons/c/c4/Nenmara_Vallangi_Vela.jpg',
  'aranmula':             'https://upload.wikimedia.org/wikipedia/commons/4/4f/Kerala_boatrace.jpg',
  'vaikom':               'https://upload.wikimedia.org/wikipedia/commons/5/54/Pambady_Rajan_carrying_Idol_of_vaikom_mahadeva_temple.jpg',
  'ettumanoor':           'https://upload.wikimedia.org/wikipedia/commons/5/56/Ettumanoor_Temple_North_Gate_Entrance.JPG',
  'ambalapuzha':          'https://upload.wikimedia.org/wikipedia/commons/c/cd/Ambalappuzha_Temple.JPG',
  'chottanikkara':        'https://upload.wikimedia.org/wikipedia/commons/a/ae/Chottanikkara_Temple.jpg',
  'tripunithura':         'https://upload.wikimedia.org/wikipedia/commons/1/12/Thrippunithura-Elephants8_crop.jpg',
  'lokanarkavu':          'https://upload.wikimedia.org/wikipedia/commons/5/5f/%E0%B4%B2%E0%B5%8B%E0%B4%95%E0%B4%A8%E0%B4%BE%E0%B5%BC%E0%B4%95%E0%B4%BE%E0%B5%B4%E0%B4%AD%E0%B4%97%E0%B4%B5%E0%B4%A4%E0%B4%BF_%E0%B4%95%E0%B5%8D%E0%B4%B7%E0%B5%87%E0%B4%A4%E0%B5%8D%E0%B4%B0%E0%B4%82_02.jpg',
  'mannarsala':           'https://upload.wikimedia.org/wikipedia/commons/4/45/Mannarasala_temple.jpg',
  'kottiyoor':            'https://upload.wikimedia.org/wikipedia/commons/b/b8/Kottiyoor_Vysakha_Mahotsavam.jpg',
  'irinjalakuda':         'https://upload.wikimedia.org/wikipedia/commons/8/8d/Koodalmanikyam_temple.jpg',
  'trissur':              'https://upload.wikimedia.org/wikipedia/commons/9/9b/Kudamatom_at_thrissur_pooram_2013_7618.JPG',
};

// Returns specific image URL for the event or null if no specific image found
function getWikiImage(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(WIKI_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return null; // No fallback — skip generic images
}

// ── Curated yearly Kerala temple/Theyyam/Pooram events — 2026 ────────────────
// Rules: only events that happen YEARLY, real dates, Theyyam/Pooram/Ulsavam focus
const KERALA_YEARLY_EVENTS = [
  {
    name: 'Thrissur Pooram 2026',
    description: 'The grandest temple festival in Kerala held at Vadakkunnathan Temple. Features 15 caparisoned elephants from each side (Thiruvambadi and Paramekkavu), Kudamattam umbrella exchange, Panchavadyam percussion ensemble, and a spectacular fireworks display at dawn. Attracts over 1 million visitors annually.',
    shortDescription: 'Kerala\'s most spectacular festival — elephants, Kudamattam & grand fireworks at Vadakkunnathan Temple.',
    date: new Date('2026-04-26T05:00:00+05:30'),
    endDate: new Date('2026-04-27T06:00:00+05:30'),
    location: { address: 'Vadakkunnathan Temple Maidan, Thrissur, Kerala 680001', district: 'Thrissur', lat: 10.5245, lng: 76.2145, placeName: 'Vadakkunnathan Temple' },
    category: 'Festival', crowd: 'high', attendees: 1000000, trending: true,
    organizerName: 'Thiruvambadi & Paramekkavu Devaswom',
    tags: ['thrissur-pooram', 'elephants', 'pooram', 'panchavadyam', 'AI'],
  },
  {
    name: 'Parassinikadavu Muthappan Ulsavam 2026',
    description: 'The annual festival of Parassinikadavu Sree Muthappan Temple on the Valapattanam River. Muthappan Thira (Theyyam ritual) is performed daily, but the Ulsavam week draws massive crowds. The deity Thiruvappana (Vishnu) and Vellatom (Shiva) are performed by Malayan and Vannan communities.',
    shortDescription: 'Annual festival of Muthappan Temple — daily Theyyam rituals on the Valapattanam river bank.',
    date: new Date('2026-05-06T06:00:00+05:30'),
    endDate: new Date('2026-05-12T22:00:00+05:30'),
    location: { address: 'Parassinikadavu Sree Muthappan Temple, Kannur, Kerala 670563', district: 'Kannur', lat: 11.9825, lng: 75.4022, placeName: 'Parassinikadavu Muthappan Temple' },
    category: 'Cultural', crowd: 'high', attendees: 80000, trending: true,
    organizerName: 'Parassinikadavu Devaswom',
    tags: ['muthappan', 'parassinikadavu', 'theyyam', 'kannur', 'ulsavam', 'AI'],
  },
  {
    name: 'Lokanarkavu Theyyam Mahotsavam 2026',
    description: 'The grand Theyyam festival at Lokanarkavu Bhagavati Temple in Vadakara, Kozhikode. Over 40 different Theyyam forms are performed over 5 days by artists from hereditary communities. One of the largest Theyyam festivals in North Kerala.',
    shortDescription: '40+ Theyyam forms over 5 days at Lokanarkavu Bhagavati Temple, Vadakara.',
    date: new Date('2026-05-10T18:00:00+05:30'),
    endDate: new Date('2026-05-15T06:00:00+05:30'),
    location: { address: 'Lokanarkavu Bhagavati Temple, Vadakara, Kozhikode, Kerala 673104', district: 'Kozhikode', lat: 11.5981, lng: 75.6197, placeName: 'Lokanarkavu Bhagavati Temple' },
    category: 'Cultural', crowd: 'high', attendees: 60000, trending: true,
    organizerName: 'Lokanarkavu Devaswom',
    tags: ['lokanarkavu', 'theyyam', 'kozhikode', 'bhagavati', 'AI'],
  },
  {
    name: 'Kottiyoor Vysakha Mahotsavam 2026',
    description: 'The 28-day annual festival at Kottiyoor Shiva Temple deep in the forest of Kannur. Held annually in Vysakha month (May–June), it is one of the rare open-air temples where the deity is worshipped without a roof structure. Pilgrims trek through forests to reach the temple.',
    shortDescription: '28-day Shiva festival at Kottiyoor forest temple — open-air worship in Vysakha month.',
    date: new Date('2026-05-14T04:00:00+05:30'),
    endDate: new Date('2026-06-11T22:00:00+05:30'),
    location: { address: 'Kottiyoor Shiva Temple, Kannur, Kerala 670631', district: 'Kannur', lat: 11.8755, lng: 75.8647, placeName: 'Kottiyoor Shiva Temple' },
    category: 'Festival', crowd: 'high', attendees: 500000, trending: true,
    organizerName: 'Kottiyoor Devaswom',
    tags: ['kottiyoor', 'shiva', 'kannur', 'vysakha', 'AI'],
  },
  {
    name: 'Irinjalakuda Koodalmanikyam Bharani 2026',
    description: 'Annual Bharani festival at Koodalmanikyam Temple, the only temple in Kerala dedicated to Bharata (brother of Rama). Features spectacular elephant procession and traditional rituals drawing thousands from across Kerala.',
    shortDescription: 'Annual Bharani at Koodalmanikyam Temple — Kerala\'s only Bharata-dedicated temple.',
    date: new Date('2026-05-20T05:00:00+05:30'),
    endDate: new Date('2026-05-21T22:00:00+05:30'),
    location: { address: 'Koodalmanikyam Temple, Irinjalakuda, Thrissur, Kerala 680121', district: 'Thrissur', lat: 10.3466, lng: 76.2011, placeName: 'Koodalmanikyam Temple' },
    category: 'Festival', crowd: 'high', attendees: 150000, trending: false,
    organizerName: 'Koodalmanikyam Devaswom',
    tags: ['irinjalakuda', 'koodalmanikyam', 'bharata', 'thrissur', 'AI'],
  },
  {
    name: 'Nenmara Vallangi Vela 2026',
    description: 'A spectacular inter-temple Pooram competition in Palakkad between Nenmara Kuthiramalika and Vallangi Sreekrishna Temples. Features 30+ caparisoned elephants, traditional percussion, and an extraordinary fireworks competition — second only to Thrissur Pooram in grandeur.',
    shortDescription: 'Grand inter-temple Pooram with 30+ elephants and fireworks in Palakkad.',
    date: new Date('2026-04-19T06:00:00+05:30'),
    endDate: new Date('2026-04-20T05:00:00+05:30'),
    location: { address: 'Nenmara, Palakkad, Kerala 678508', district: 'Palakkad', lat: 10.5924, lng: 76.6032, placeName: 'Nenmara Temple Ground' },
    category: 'Festival', crowd: 'high', attendees: 500000, trending: true,
    organizerName: 'Nenmara-Vallangi Vela Committee',
    tags: ['nenmara', 'vela', 'pooram', 'elephants', 'palakkad', 'AI'],
  },
  {
    name: 'Attukal Pongala 2026',
    description: 'The Attukal Pongala is the world\'s largest annual gathering of women, recognized by the Guinness Book of World Records. Millions of women cook Pongala (rice pudding) on makeshift stoves on Thiruvananthapuram streets as an offering to Attukal Amma (Kannaki). The 10-day festival culminates on Karthika day.',
    shortDescription: 'World\'s largest women\'s gathering — millions cook Pongala on Thiruvananthapuram streets.',
    date: new Date('2026-03-05T04:00:00+05:30'),
    endDate: new Date('2026-03-14T22:00:00+05:30'),
    location: { address: 'Attukal Bhagavathy Temple, Thiruvananthapuram, Kerala 695001', district: 'Thiruvananthapuram', lat: 8.4699, lng: 76.9555, placeName: 'Attukal Bhagavathy Temple' },
    category: 'Festival', crowd: 'high', attendees: 3000000, trending: true,
    organizerName: 'Attukal Devaswom',
    tags: ['attukal', 'pongala', 'women', 'thiruvananthapuram', 'AI'],
  },
  {
    name: 'Vaikom Mahadeva Temple Ashtami 2026',
    description: 'Annual Vaikathashtami festival at Vaikom Mahadeva Temple beside Vembanad Lake. One of the largest Shiva festivals in Kerala, attracting pilgrims from across South India.',
    shortDescription: 'Annual Vaikathashtami Shiva festival beside Vembanad Lake — massive pilgrimage event.',
    date: new Date('2026-12-10T04:30:00+05:30'),
    endDate: new Date('2026-12-18T22:00:00+05:30'),
    location: { address: 'Vaikom Mahadeva Temple, Kottayam, Kerala 686141', district: 'Kottayam', lat: 9.7500, lng: 76.3959, placeName: 'Vaikom Mahadeva Temple' },
    category: 'Festival', crowd: 'high', attendees: 180000, trending: false,
    organizerName: 'Vaikom Mahadeva Devaswom',
    tags: ['vaikom', 'shiva', 'ashtami', 'kottayam', 'AI'],
  },
  {
    name: 'Aranmula Boat Race 2026',
    description: 'The Aranmula Uthrattathi Boat Race is the oldest river boat race in Kerala, held on the Pampa River. Unlike competitive snake boat races, this is a devotional event — the palliyodam boats carry the idol of Lord Parthasarathy. A UNESCO-recognized cultural heritage event.',
    shortDescription: 'Oldest devotional snake boat race on Pampa River — a UNESCO-recognized Kerala heritage event.',
    date: new Date('2026-09-05T14:00:00+05:30'),
    endDate: new Date('2026-09-05T18:00:00+05:30'),
    location: { address: 'Aranmula Parthasarathy Temple, Pathanamthitta, Kerala 689533', district: 'Pathanamthitta', lat: 9.3280, lng: 76.6878, placeName: 'Aranmula Pampa River' },
    category: 'Cultural', crowd: 'high', attendees: 200000, trending: true,
    organizerName: 'Aranmula Devaswom',
    tags: ['aranmula', 'boat-race', 'pampa', 'pathanamthitta', 'AI'],
  },
  {
    name: 'Ettumanoor Mahadeva Temple Ezharaponnana 2026',
    description: 'The grand Ezharaponnana (seven-and-a-half gold elephants) festival at Ettumanoor Shiva Temple. One of the most celebrated Shiva festivals in Kerala featuring a unique gold-caparisoned elephant procession. The 10-day festival includes Panchavadyam and spectacular rituals.',
    shortDescription: 'Ettumanoor Shiva festival famous for Ezharaponnana — seven-and-a-half gold elephants.',
    date: new Date('2026-03-10T05:00:00+05:30'),
    endDate: new Date('2026-03-20T22:00:00+05:30'),
    location: { address: 'Ettumanoor Mahadeva Temple, Kottayam, Kerala 686631', district: 'Kottayam', lat: 9.6737, lng: 76.5605, placeName: 'Ettumanoor Mahadeva Temple' },
    category: 'Festival', crowd: 'high', attendees: 200000, trending: false,
    organizerName: 'Ettumanoor Devaswom',
    tags: ['ettumanoor', 'mahadeva', 'shiva', 'kottayam', 'AI'],
  },
  {
    name: 'Guruvayur Ekadasi 2026',
    description: 'Guruvayur Ekadasi is the most important festival at Guruvayur Sri Krishna Temple. On this day, it is believed that Lord Vishnu\'s portal to Vaikunta opens. Hundreds of elephants are brought to the temple, and the world-famous Guruvayur Elephant Race (Aanayottam) is held the following day.',
    shortDescription: 'Most sacred day at Guruvayur with hundreds of elephants and the famous Aanayottam race.',
    date: new Date('2026-11-20T03:00:00+05:30'),
    endDate: new Date('2026-11-21T22:00:00+05:30'),
    location: { address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101', district: 'Thrissur', lat: 10.5947, lng: 76.0394, placeName: 'Guruvayur Sri Krishna Temple' },
    category: 'Festival', crowd: 'high', attendees: 300000, trending: true,
    organizerName: 'Guruvayur Devaswom Board',
    tags: ['guruvayur', 'ekadasi', 'krishna', 'elephants', 'AI'],
  },
  {
    name: 'Tripunithura Athachamayam 2026',
    description: 'Athachamayam marks the start of Onam celebrations with a grand procession from Tripunithura Palace. Features tableaux, folk arts, Thiruvathira, Kathakali, and caparisoned elephants — one of Kerala\'s most colourful cultural pageants.',
    shortDescription: 'Onam\'s grand opening parade — Kathakali, folk arts and elephant pageant at Tripunithura.',
    date: new Date('2026-09-14T07:00:00+05:30'),
    endDate: new Date('2026-09-14T13:00:00+05:30'),
    location: { address: 'Tripunithura Hill Palace, Ernakulam, Kerala 682301', district: 'Ernakulam', lat: 9.9527, lng: 76.3639, placeName: 'Tripunithura' },
    category: 'Cultural', crowd: 'high', attendees: 100000, trending: true,
    organizerName: 'Tripunithura Municipality',
    tags: ['tripunithura', 'athachamayam', 'onam', 'procession', 'AI'],
  },
  {
    name: 'Mannarsala Nagaraja Temple Festival 2026',
    description: 'Annual festival at Mannarsala Nagaraja Temple — the largest serpent deity shrine in Kerala. Hundreds of snake idols line the 16-acre sacred grove (Kavu). The presiding priestess (a woman from the family) performs unique rituals. Famous for blessing childless couples.',
    shortDescription: 'Annual serpent deity festival at Mannarsala — Kerala\'s largest Nagaraja shrine in a 16-acre grove.',
    date: new Date('2026-10-15T05:00:00+05:30'),
    endDate: new Date('2026-10-16T22:00:00+05:30'),
    location: { address: 'Mannarsala Nagaraja Temple, Haripad, Alappuzha, Kerala 690514', district: 'Alappuzha', lat: 9.2897, lng: 76.4457, placeName: 'Mannarsala Nagaraja Temple' },
    category: 'Festival', crowd: 'high', attendees: 80000, trending: false,
    organizerName: 'Mannarsala Illam',
    tags: ['mannarsala', 'nagaraja', 'serpent', 'alappuzha', 'AI'],
  },
  {
    name: 'Chottanikkara Makam Thozhal 2026',
    description: 'Annual Makam Thozhal at Chottanikkara Bhagavathy Temple — a significant ritual where thousands of devotees seek blessings for mental illness cures. The festival features special Devi rituals at night (Rathri Puja) with the three forms of the Goddess (Saraswati, Lakshmi, Durga) at dawn, noon, and dusk.',
    shortDescription: 'Annual Makam Thozhal at Chottanikkara — thousands seek Bhagavathy\'s healing blessings.',
    date: new Date('2026-02-25T04:00:00+05:30'),
    endDate: new Date('2026-02-25T22:00:00+05:30'),
    location: { address: 'Chottanikkara Bhagavathy Temple, Ernakulam, Kerala 682312', district: 'Ernakulam', lat: 9.9332, lng: 76.3912, placeName: 'Chottanikkara Temple' },
    category: 'Festival', crowd: 'high', attendees: 200000, trending: false,
    organizerName: 'Chottanikkara Devaswom',
    tags: ['chottanikkara', 'bhagavathy', 'makam', 'ernakulam', 'AI'],
  },
];

// ── Main function: insert only events starting THIS week ──────────────────────
async function fetchAndInsertNewEvents() {
  const now = new Date();

  // This week: Mon–Sun (IST)
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMon = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  console.log(`[AI Fetcher] Week window: ${weekStart.toLocaleDateString('en-IN')} → ${weekEnd.toLocaleDateString('en-IN')}`);

  // Load existing event names to avoid duplicates
  const existing = await Event.find({}).select('name').lean();
  const existingNames = new Set(existing.map(e => e.name.trim().toLowerCase()));

  // Filter: event STARTS this week + not already in DB
  const toInsert = KERALA_YEARLY_EVENTS.filter(e => {
    const d = new Date(e.date);
    const startsThisWeek = d >= weekStart && d <= weekEnd;
    const isNew = !existingNames.has(e.name.trim().toLowerCase());
    return startsThisWeek && isNew;
  });

  if (toInsert.length === 0) {
    console.log('[AI Fetcher] No new Kerala events starting this week.');
    return 0;
  }

  // Attach specific Wikipedia image — skip event if no specific image found
  const withImages = toInsert
    .map(e => {
      const img = getWikiImage(e.name);
      if (!img) {
        console.log(`[AI Fetcher] ⚠️  Skipping "${e.name}" — no specific Wikipedia image found.`);
        return null;
      }
      return {
        ...e,
        images: [img],
        status: 'pending',  // ALWAYS requires admin approval
        addedBy: 'AI',
      };
    })
    .filter(Boolean);

  if (withImages.length === 0) {
    console.log('[AI Fetcher] No events with specific Wikipedia images this week.');
    return 0;
  }

  const inserted = await Event.insertMany(withImages);
  console.log(`[AI Fetcher] ✅ ${inserted.length} event(s) queued for admin approval:`);
  inserted.forEach(e =>
    console.log(`   ↳ [PENDING] ${e.name} | ${e.location.district} | Image: ${e.images[0]}`)
  );

  return inserted.length;
}

module.exports = { fetchAndInsertNewEvents, KERALA_YEARLY_EVENTS };
