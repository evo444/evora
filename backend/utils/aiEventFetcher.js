/**
 * AI Event Fetcher — Upcoming Kerala Temple Events (Optimized)
 *
 * This version filters for specific high-priority events (Theyyam, Pooram, etc.)
 * occurring only in the CURRENT WEEK.
 */

'use strict';

const Event = require('../models/Event');

// ─── Wikipedia Image Mapping — Original Photos ──────────────────────────────
const WIKI_IMAGES = {
  'guruvayur': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg',
  'sabarimala': 'https://upload.wikimedia.org/wikipedia/commons/6/62/Sabarimala_2.jpg',
  'padmanabhaswamy': 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Sree_Padmanabhaswamy_temple_01.jpg',
  'attukal': 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Attukal_temple.jpg',
  'thrissur pooram': 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Kudamatom_at_thrissur_pooram_2013_7618.JPG',
  'parassinikadavu': 'https://upload.wikimedia.org/wikipedia/commons/5/55/Parassini.jpg',
  'muthappan': 'https://upload.wikimedia.org/wikipedia/commons/5/55/Parassini.jpg',
  'theyyam': 'https://upload.wikimedia.org/wikipedia/commons/3/38/Kathivanoor_Veeran_Chemmarathi_Thara-Eripuram.jpg',
  'chottanikkara': 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Chottanikkara_Temple.jpg',
  'vaikom': 'https://upload.wikimedia.org/wikipedia/commons/5/54/Pambady_Rajan_carrying_Idol_of_vaikom_mahadeva_temple.jpg',
  'ettumanoor': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Ettumanoor_Temple_North_Gate_Entrance.JPG',
  'ambalapuzha': 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Ambalappuzha_Temple.JPG',
  'tripunithura': 'https://upload.wikimedia.org/wikipedia/commons/1/12/Thrippunithura-Elephants8_crop.jpg',
  'aranmula': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Kerala_boatrace.jpg',
  'lokanarkavu': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/%E0%B4%B2%E0%B5%8B%E0%B4%95%E0%B4%A8%E0%B4%BE%E0%B5%BC%E0%B4%95%E0%B4%BE%E0%B5%B4%E0%B4%AD%E0%B4%97%E0%B4%B5%E0%B4%A4%E0%B4%BF_%E0%B4%95%E0%B5%8D%E0%B4%B7%E0%B5%87%E0%B4%A4%E0%B5%8D%E0%B4%B0%E0%B4%82_02.jpg',
  'mannarsala': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Mannarasala_temple.jpg',
  'kadampuzha': 'https://upload.wikimedia.org/wikipedia/commons/5/59/KadampuzhaTempleFrontGate.jpg',
};

function getWikiImage(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(WIKI_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return 'https://upload.wikimedia.org/wikipedia/commons/1/17/Guruvayoor_Temple_1.jpg'; // Default
}

// ─── Upcoming Kerala Temple Events — 2026 Calendar (Filtered & Cleaned) ────────
const UPCOMING_KERALA_EVENTS = [
  {
    name: 'Thrissur Pooram 2026',
    description: 'Thrissur Pooram — the festival of festivals — is the most spectacular temple celebration in Kerala, held at the Vadakkunnathan Temple ground in Thrissur. Features caparisoned elephants, Kudamattam, and grand fireworks.',
    date: new Date('2026-04-26T05:00:00+05:30'),
    endDate: new Date('2026-04-27T06:00:00+05:30'),
    location: {
      address: 'Vadakkunnathan Temple Maidan, Round, Thrissur, Kerala 680001',
      district: 'Thrissur',
      lat: 10.5276,
      lng: 76.2144,
      placeName: 'Vadakkunnathan Temple',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 1000000,
    trending: true,
    organizerName: 'Thiruvambadi & Paramekkavu Devaswom',
    status: 'pending',
    addedBy: 'AI',
    tags: ['thrissur-pooram', 'elephants', 'pooram', 'AI'],
  },
  {
    name: 'Parassinikadavu Muthappan Daily Theyyam',
    description: 'Parassinikadavu Sree Muthappan Temple on the Valapattanam River in Kannur is unique — the Muthappan Thira (ritual performance) happens every single day. This week features special rituals for devotees.',
    date: new Date('2026-05-01T06:00:00+05:30'),
    endDate: new Date('2026-05-07T22:00:00+05:30'),
    location: {
      address: 'Parassinikadavu Sree Muthappan Temple, Kannur, Kerala 670563',
      district: 'Kannur',
      lat: 11.9672,
      lng: 75.4007,
      placeName: 'Muthappan Temple Parassinikadavu',
    },
    category: 'Cultural',
    crowd: 'high',
    attendees: 50000,
    trending: false,
    organizerName: 'Parassinikadavu Devaswom',
    status: 'pending',
    addedBy: 'AI',
    tags: ['muthappan', 'parassinikadavu', 'theyyam', 'kannur', 'AI'],
  },
  {
    name: 'Vishu Vilakku — Guruvayur Sri Krishna Temple 2026',
    description: 'Vishu celebrations at Guruvayur with the sacred Vishukkani ritual and special darshan.',
    date: new Date('2026-04-14T03:00:00+05:30'),
    endDate: new Date('2026-04-14T21:00:00+05:30'),
    location: {
      address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101',
      district: 'Thrissur',
      lat: 10.5943,
      lng: 76.0421,
      placeName: 'Guruvayur Sri Krishna Temple',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 200000,
    trending: true,
    organizerName: 'Guruvayur Devaswom Board',
    status: 'pending',
    addedBy: 'AI',
    tags: ['vishu', 'guruvayur', 'krishna', 'AI'],
  },
  {
    name: 'Nenmara-Vallangi Vela 2026',
    description: 'Grand inter-temple competition with 30+ caparisoned elephants and spectacular fireworks in Palakkad.',
    date: new Date('2026-04-14T06:00:00+05:30'),
    endDate: new Date('2026-04-15T05:00:00+05:30'),
    location: {
      address: 'Nenmara, Palakkad, Kerala 678508',
      district: 'Palakkad',
      lat: 10.5124,
      lng: 76.7266,
      placeName: 'Nenmara Temple Ground',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 500000,
    trending: true,
    status: 'pending',
    addedBy: 'AI',
    tags: ['nenmara', 'vela', 'elephants', 'AI'],
  },
  {
    name: 'Puthuppally Perunnal 2026',
    description: 'The annual feast at Puthuppally St. George Orthodox Church, one of the most famous Christian festivals in Kerala. Features grand processions and cultural programs.',
    date: new Date('2026-05-01T06:00:00+05:30'),
    endDate: new Date('2026-05-02T22:00:00+05:30'),
    location: {
      address: 'St. George Orthodox Church, Puthuppally, Kottayam, Kerala 686011',
      district: 'Kottayam',
      lat: 9.5833,
      lng: 76.5667,
      placeName: 'Puthuppally Church',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 80000,
    status: 'pending',
    addedBy: 'AI',
    tags: ['puthuppally', 'perunnal', 'kottayam', 'AI'],
  },
  {
    name: 'Mukhathala Sree Murari Dhanwanthari Temple Ulsavam 2026',
    description: 'The annual 10-day festival at Mukhathala Temple in Kollam. Features traditional rituals, elephant processions, and cultural performances.',
    date: new Date('2026-05-01T05:00:00+05:30'),
    endDate: new Date('2026-05-10T22:00:00+05:30'),
    location: {
      address: 'Mukhathala Sree Murari Dhanwanthari Temple, Kollam, Kerala 691577',
      district: 'Kollam',
      lat: 8.8932,
      lng: 76.6141,
      placeName: 'Mukhathala Temple',
    },
    category: 'Cultural',
    crowd: 'high',
    attendees: 50000,
    status: 'pending',
    addedBy: 'AI',
    tags: ['mukhathala', 'temple', 'kollam', 'ulsavam', 'AI'],
  },
  {
    name: 'Edappally St. George Forane Church Feast 2026',
    description: 'The annual feast of St. George at Edappally, one of the oldest churches in Kerala. Attracts thousands of devotees across all religions.',
    date: new Date('2026-05-03T06:00:00+05:30'),
    endDate: new Date('2026-05-04T22:00:00+05:30'),
    location: {
      address: 'St. George Forane Church, Edappally, Kochi, Kerala 682024',
      district: 'Ernakulam',
      lat: 10.0261,
      lng: 76.3075,
      placeName: 'Edappally Church',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 100000,
    trending: false,
    status: 'pending',
    addedBy: 'AI',
    tags: ['edappally', 'perunnal', 'kochi', 'AI'],
  },
  {
    name: 'Sree Mahadeva Temple Vaikathashtami — Vaikom 2026',
    description: 'Ancient festival at Vaikom Mahadeva Temple beside Vembanad Lake.',
    date: new Date('2026-05-05T04:30:00+05:30'),
    endDate: new Date('2026-05-12T22:00:00+05:30'),
    location: {
      address: 'Vaikom Mahadeva Temple, Kottayam, Kerala 686141',
      district: 'Kottayam',
      lat: 9.7508,
      lng: 76.3954,
      placeName: 'Vaikom Mahadeva Temple',
    },
    category: 'Festival',
    crowd: 'high',
    attendees: 180000,
    status: 'pending',
    addedBy: 'AI',
    tags: ['vaikom', 'shiva', 'kottayam', 'AI'],
  },
];

/**
 * Fetches and inserts events for the CURRENT WEEK only.
 */
async function fetchAndInsertNewEvents() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7); // 7 days from now
  endOfWeek.setHours(23, 59, 59, 999);

  console.log(`[AI Fetcher] Checking for events between ${startOfWeek.toLocaleDateString()} and ${endOfWeek.toLocaleDateString()}`);

  const allExisting = await Event.find({}).select('name').lean();
  const existingNames = new Set(allExisting.map(e => e.name.trim()));

  // Filter: 
  // 1. Must be in the current week (starting or ending this week)
  // 2. Not already in DB
  // 3. Match high-priority temples/events
  const filteredEvents = UPCOMING_KERALA_EVENTS.filter(e => {
    const eDate = new Date(e.date);
    const isThisWeek = (eDate >= startOfWeek && eDate <= endOfWeek);
    const isNew = !existingNames.has(e.name.trim());
    
    // User requested: Theyyam, Pooram, Parassinikadavu, specific temples
    const isTarget = /theyyam|pooram|parassinikadavu|muthappan|temple|ulsavam/i.test(e.name);
    
    return isThisWeek && isNew && isTarget;
  });

  if (filteredEvents.length === 0) {
    console.log('[AI Fetcher] No matching Kerala events for this week.');
    return 0;
  }

  // Add Wikipedia images before inserting
  const processedEvents = filteredEvents.map(e => ({
    ...e,
    images: [getWikiImage(e.name)]
  }));

  const inserted = await Event.insertMany(processedEvents);
  console.log(`[AI Fetcher] ✅ Inserted ${inserted.length} matching events for this week.`);
  inserted.forEach(e => console.log(`   ↳ ${e.name} (${e.location.district}) — Photo: ${e.images[0]}`));
  
  return inserted.length;
}

module.exports = { fetchAndInsertNewEvents, UPCOMING_KERALA_EVENTS };
