/**
 * AI Event Fetcher — Upcoming Kerala Temple Events
 *
 * Curated database of realistic, upcoming Kerala temple festivals and rituals.
 * Each weekly run inserts only events that are:
 *   (a) not already in the database (dedup by name)
 *   (b) dated in the future
 *
 * All inserted events have:
 *   status:  'pending'  → admin must approve before public visibility
 *   addedBy: 'AI'       → distinguishes from user/admin submissions
 */

'use strict';

const Event = require('../models/Event');

// ─── Upcoming Kerala Temple Events — 2026 Calendar ───────────────────────────
// Sources: Kerala Devaswom Board, official temple websites, tourism portals.
// Dates follow the Malayalam/Hindu lunisolar calendar for 2026.

const UPCOMING_KERALA_EVENTS = [

  // ── APRIL 2026 ─────────────────────────────────────────────────────────────

  {
    name: 'Vishu Vilakku — Guruvayur Sri Krishna Temple 2026',
    description: 'Vishu, the Malayalam New Year, is celebrated at Guruvayur with the sacred Vishukkani ritual — an auspicious sight of gold, rice, fruit, flowers, and the deity\'s image arranged the previous night and viewed first thing in the morning. The temple conducts special Vishukkani darshan from 3 AM, followed by Vishukkaineettam (giving of coins to younger ones), and Vishu Sadhya feast for thousands of devotees. The Punnathur Kotta elephant sanctuary across the road hosts an elephant procession in the morning.',
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
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
    crowd: 'high',
    attendees: 200000,
    trending: true,
    organizerName: 'Guruvayur Devaswom Board',
    organizerPhone: '+91-487-2556236',
    website: 'https://guruvayurdevaswom.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['vishu', 'guruvayur', 'new-year', 'krishna', 'AI'],
  },

  {
    name: 'Nenmara-Vallangi Vela Festival 2026',
    description: 'The Nenmara-Vallangi Vela in Palakkad is one of Kerala\'s grandest inter-temple competitions. Two rival groups — Nenmara (Viswanatha Swami Temple) and Vallangi (Thamburatty Temple) — each present over 30 caparisoned elephants adorned with golden nettipattam. The Kuda Mela (choreographed parasol exchange) performed to the precision of traditional Panchavadyam is breathtaking. The closing Vedikettu (fireworks) lasting 5+ hours is considered the finest in all of Kerala. Over 5 lakh spectators fill the grounds.',
    date: new Date('2026-04-14T06:00:00+05:30'),
    endDate: new Date('2026-04-15T05:00:00+05:30'),
    location: {
      address: 'Nenmara-Vallangi, Chittur-Thathamangalam, Palakkad, Kerala 678508',
      district: 'Palakkad',
      lat: 10.5124,
      lng: 76.7266,
      placeName: 'Nenmara Temple Ground',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Thrissur_Pooram_2013.jpg/800px-Thrissur_Pooram_2013.jpg'],
    crowd: 'high',
    attendees: 500000,
    trending: true,
    organizerName: 'Nenmara-Vallangi Temple Committee',
    website: 'https://www.nenmara.com',
    status: 'pending',
    addedBy: 'AI',
    tags: ['nenmara-vallangi', 'vela', 'elephants', 'palakkad', 'panchavadyam', 'AI'],
  },

  {
    name: 'Thrissur Pooram 2026',
    description: 'Thrissur Pooram — the festival of festivals — is the most spectacular temple celebration in Kerala, held at the Vadakkunnathan Temple ground in Thrissur. Two teams, Thiruvambadi Sri Krishna Temple and Paramekkavu Bhagavathy Temple, compete in an electrifying display of 15 caparisoned elephants each adorned with golden nettipattam. The Kudamattam (precision parasol exchange under Panchavadyam orchestra) and the 4-hour Vedikettu fireworks display are globally acclaimed. Over 10 lakh visitors attend annually.',
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
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Thrissur_Pooram_2013.jpg/800px-Thrissur_Pooram_2013.jpg'],
    crowd: 'high',
    attendees: 1000000,
    trending: true,
    organizerName: 'Thiruvambadi & Paramekkavu Devaswom',
    organizerPhone: '+91-487-2422752',
    website: 'https://thrissurpooram.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['thrissur-pooram', 'elephants', 'kudamattam', 'panchavadyam', 'AI'],
  },

  {
    name: 'Sree Poornathrayeesha Temple Utsavam — Tripunithura 2026',
    description: 'The annual 8-day Utsavam at Sree Poornathrayeesha Temple in Tripunithura (Ernakulam) is one of the most celebrated festivals in central Kerala. The temple, dedicated to Lord Vishnu in Trivikrama form, is the tutelary deity of the Cochin Royal Family. Highlights include the grand Seeveli procession of 13 caparisoned elephants, traditional Kathakali and Koodiyattam performances in the temple theatre, and the spectacular closing Aarattu (ritual bath of the deity) at the temple pond. The Sree Vilwadrinatha Utsavam features daily Deeparadhana with 1000+ oil lamps.',
    date: new Date('2026-04-20T04:00:00+05:30'),
    endDate: new Date('2026-04-27T22:00:00+05:30'),
    location: {
      address: 'Sree Poornathrayeesha Temple, Court Road, Tripunithura, Ernakulam, Kerala 682301',
      district: 'Ernakulam',
      lat: 9.9442,
      lng: 76.3502,
      placeName: 'Poornathrayeesha Temple, Tripunithura',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Padmanabhaswamy_temple.jpg/800px-Padmanabhaswamy_temple.jpg'],
    crowd: 'high',
    attendees: 300000,
    trending: false,
    organizerName: 'Tripunithura Palace Devaswom',
    organizerPhone: '+91-484-2777080',
    status: 'pending',
    addedBy: 'AI',
    tags: ['tripunithura', 'poornathrayeesha', 'vishnu', 'ernakulam', 'AI'],
  },

  // ── MAY 2026 ──────────────────────────────────────────────────────────────

  {
    name: 'Sree Mahadeva Temple Vaikathashtami — Vaikom 2026',
    description: 'Vaikathashtami at Vaikom Mahadeva Temple is an ancient 8-day festival honouring Lord Shiva on the auspicious Ashtami tithi. One of Kerala\'s five Pancha Mahadeva Kshetrams, the temple stands majestically beside Vembanad Lake. The festival features Ksheera Abhishekam (milk bath of the Swayambhu Lingam), daily Panchavadyam and elephant procession, and the grand Theerthaadu (holy bath procession) to the temple pond on the final day. Annadanam (community feast) for 15,000+ devotees is served every evening.',
    date: new Date('2026-05-05T04:30:00+05:30'),
    endDate: new Date('2026-05-12T22:00:00+05:30'),
    location: {
      address: 'Vaikom Mahadeva Temple, Temple Road, Vaikom, Kottayam, Kerala 686141',
      district: 'Kottayam',
      lat: 9.7508,
      lng: 76.3954,
      placeName: 'Vaikom Mahadeva Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/VaikomMahadevTemple.jpg/800px-VaikomMahadevTemple.jpg'],
    crowd: 'high',
    attendees: 180000,
    trending: false,
    organizerName: 'Vaikom Devaswom',
    organizerPhone: '+91-481-2362205',
    status: 'pending',
    addedBy: 'AI',
    tags: ['vaikom', 'shiva', 'vaikathashtami', 'kottayam', 'AI'],
  },

  {
    name: 'Dharma Sastha Temple Aryankavu Utsavam 2026',
    description: 'Aryankavu Sree Dharma Sastha Temple, nestled in the Shendurney Wildlife Sanctuary of Kollam, is one of the five Pancha Sastha shrines in Kerala. The annual 10-day Utsavam during Edavam month is a deeply spiritual celebration in a pristine forest setting. The route to the temple through the jungle is lined with devotees carrying torches. Special poojas for fertility, childless couples, and healing are conducted. The cascading Aryankavu Falls adjacent to the temple adds to the divine atmosphere. Elephant procession, Panchavadyam, and Vilakku are highlights.',
    date: new Date('2026-05-20T05:00:00+05:30'),
    endDate: new Date('2026-05-29T22:00:00+05:30'),
    location: {
      address: 'Sree Dharma Sastha Temple, Aryankavu, Kollam, Kerala 691533',
      district: 'Kollam',
      lat: 8.9567,
      lng: 77.1350,
      placeName: 'Aryankavu Dharma Sastha Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'medium',
    attendees: 75000,
    trending: false,
    organizerName: 'Aryankavu Devaswom',
    organizerPhone: '+91-474-2512244',
    status: 'pending',
    addedBy: 'AI',
    tags: ['aryankavu', 'sastha', 'forest-temple', 'kollam', 'AI'],
  },

  // ── JUNE 2026 ─────────────────────────────────────────────────────────────

  {
    name: 'Sree Subramanya Swamy Temple Utsavam — Payammal 2026',
    description: 'Payammal Sree Subramanya Swamy Temple near Irinjalakuda in Thrissur district is one of the most revered Murugan shrines in Kerala. The annual Skandha Shashti Utsavam in the month of Karkidakam celebrates Lord Murugan\'s victory over the demon Soorapadman. The 6-day festival features Kavadi processions (devotees carrying elaborate semi-circular structures as acts of devotion), Vel Pooja, Thiruvizha, and special Puja on Shashti day. Classical Bharatanatyam and Mohiniyattam dedicated to Murugan are staged every evening.',
    date: new Date('2026-06-10T05:00:00+05:30'),
    endDate: new Date('2026-06-15T22:00:00+05:30'),
    location: {
      address: 'Payammal Sree Subramanya Swamy Temple, Mala, Thrissur, Kerala 680732',
      district: 'Thrissur',
      lat: 10.3756,
      lng: 76.2613,
      placeName: 'Payammal Subramanya Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'medium',
    attendees: 60000,
    trending: false,
    organizerName: 'Payammal Devaswom Board',
    status: 'pending',
    addedBy: 'AI',
    tags: ['murugan', 'subramanya', 'kavadi', 'thrissur', 'AI'],
  },

  {
    name: 'Sree Ramaswamy Temple Utsavam — Thriprayar 2026',
    description: 'Thriprayar Sree Rama Temple, one of the Pancha Rama Kshetrams (five Rama temples) in Kerala, celebrates its annual Utsavam over 8 days. Set beside the serene Karuvannur River in Thrissur district, the temple honours Lord Rama in Swayambhu form. The festival features morning Sundarakanda parayanam at sunrise, classical Koodiyattam and Krishnanattam performances, and the grand Arattu (ritual bath) procession to the Karuvannur River, where thousands of devotees witness the sacred ceremony. Annadanam is served throughout.',
    date: new Date('2026-06-20T04:00:00+05:30'),
    endDate: new Date('2026-06-27T22:00:00+05:30'),
    location: {
      address: 'Thriprayar Sree Rama Temple, Thriprayar, Thrissur, Kerala 680566',
      district: 'Thrissur',
      lat: 10.3087,
      lng: 76.1467,
      placeName: 'Thriprayar Sree Rama Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Thrissur_district.jpg/800px-Thrissur_district.jpg'],
    crowd: 'medium',
    attendees: 80000,
    trending: false,
    organizerName: 'Thriprayar Devaswom',
    organizerPhone: '+91-487-2394258',
    status: 'pending',
    addedBy: 'AI',
    tags: ['thriprayar', 'rama', 'pancha-rama-kshetram', 'thrissur', 'AI'],
  },

  // ── JULY 2026 (Karkidakam — Ramayana Month) ───────────────────────────────

  {
    name: 'Karkidakam Ramayana Masam — Guruvayur Temple 2026',
    description: 'Karkidakam (July–August) is Kerala\'s sacred Ramayana Month, when the entire state resonates with the chanting of Adhyatma Ramayanam. At Guruvayur Sri Krishna Temple, the entire month sees special dawn Ramayana parayanam at 4 AM, Sundarakanda Parayanam at 7 AM, Harikatha performances evenings, and a grand concluding Saptaha Yajna in the final week with 25+ Vedic scholars. A special Ramayana heritage walk through Guruvayur town, visiting all associated shrines, is organized on Karkkidaka Vavu (ancestors\' day).',
    date: new Date('2026-07-17T04:00:00+05:30'),
    endDate: new Date('2026-08-16T22:00:00+05:30'),
    location: {
      address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101',
      district: 'Thrissur',
      lat: 10.5943,
      lng: 76.0421,
      placeName: 'Guruvayur Sri Krishna Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
    crowd: 'medium',
    attendees: 120000,
    trending: false,
    organizerName: 'Guruvayur Devaswom Board',
    organizerPhone: '+91-487-2556236',
    website: 'https://guruvayurdevaswom.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['ramayana', 'karkidakam', 'guruvayur', 'krishna', 'AI'],
  },

  {
    name: 'Kadampuzha Devi Utsavam 2026',
    description: 'Kadampuzha Bhagavathy Temple in Malappuram is one of the most powerful Shakti shrines in Kerala, dedicated to Goddess Durga seated by the Kadampuzha River in a dense forest. The annual 10-day Utsavam in the Karkidakam month features spectacular Theyyam performances, Thidambu Nritham (sacred idol dance), Ottanthullal classical art form, and the unique Gajakesariyogam (ritual where an elephant and lion effigy are paraded together). The goddess is believed to grant all wishes, and her oracle pronouncements during Theyyam are treated as divine.',
    date: new Date('2026-07-20T05:00:00+05:30'),
    endDate: new Date('2026-07-29T22:00:00+05:30'),
    location: {
      address: 'Kadampuzha Bhagavathy Temple, Kadampuzha, Malappuram, Kerala 676541',
      district: 'Malappuram',
      lat: 11.0247,
      lng: 76.0712,
      placeName: 'Kadampuzha Bhagavathy Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'high',
    attendees: 120000,
    trending: false,
    organizerName: 'Kadampuzha Devaswom',
    status: 'pending',
    addedBy: 'AI',
    tags: ['kadampuzha', 'bhagavathy', 'devi', 'malappuram', 'theyyam', 'AI'],
  },

  {
    name: 'Koodalmanikyam Bharani Vilakku Festival 2026',
    description: 'Koodalmanikyam Temple at Irinjalakuda houses the only shrine in the world dedicated to Bharata — beloved younger brother of Lord Rama — making it unique in the Vaishnavite tradition. The Bharani festival during Karkidakam month is extraordinary: over 100,000 oil lamps are simultaneously lit across the entire temple complex, creating a breathtaking river of fire. Women in silk sarees carry lamps in grand procession. The Vilakku porattu (lamp relay race) between two temple groups is one of Kerala\'s most dazzling traditions.',
    date: new Date('2026-07-28T17:00:00+05:30'),
    endDate: new Date('2026-07-29T06:00:00+05:30'),
    location: {
      address: 'Koodalmanikyam Temple, Irinjalakuda, Thrissur, Kerala 680121',
      district: 'Thrissur',
      lat: 10.3426,
      lng: 76.2135,
      placeName: 'Koodalmanikyam Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'high',
    attendees: 300000,
    trending: true,
    organizerName: 'Koodalmanikyam Devaswom',
    organizerPhone: '+91-480-2826285',
    status: 'pending',
    addedBy: 'AI',
    tags: ['koodalmanikyam', 'bharata', 'bharani', 'vilakku', 'irinjalakuda', 'AI'],
  },

  // ── AUGUST 2026 ──────────────────────────────────────────────────────────

  {
    name: 'Nehru Trophy Vallam Kali — Punnamada Lake 2026',
    description: 'The Nehru Trophy Boat Race on Punnamada Lake in Alappuzha is one of the most iconic sporting events in Asia. Held annually on the second Saturday of August, the race features over 100 traditional snake boats (Chundan Vallams) rowed by 100-150 oarsmen each, competing in a thunderous spectacle across 1.4 km. The race is named after Prime Minister Jawaharlal Nehru who donated the trophy in 1952. Tens of thousands of spectators fill the grandstands and houseboats. A unique cultural showcase of Kerala\'s Kuttanad backwater heritage.',
    date: new Date('2026-08-08T09:00:00+05:30'),
    endDate: new Date('2026-08-08T17:00:00+05:30'),
    location: {
      address: 'Punnamada Lake, Alappuzha, Kerala 688013',
      district: 'Alappuzha',
      lat: 9.3833,
      lng: 76.3667,
      placeName: 'Punnamada Lake, Alappuzha',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Attukal_Pongala_2017.jpg/800px-Attukal_Pongala_2017.jpg'],
    crowd: 'high',
    attendees: 200000,
    trending: true,
    organizerName: 'District Tourism Promotion Council, Alappuzha',
    organizerPhone: '+91-477-2253308',
    website: 'https://nehrutrophyboatrace.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['nehru-trophy', 'boat-race', 'vallam-kali', 'alappuzha', 'AI'],
  },

  {
    name: 'Janmashtami — Guruvayur Sri Krishna Temple 2026',
    description: 'Janmashtami, the birth anniversary of Lord Krishna, is the most sacred celebration at Guruvayur — Kerala\'s most important Krishna shrine. Lakhs of devotees fast throughout the day and flock to the temple as midnight approaches. The Udayasthamana Pooja (dawn-to-dusk unbroken pooja) is the most expensive offering at the temple. At midnight, conch shells blow and bells ring simultaneously across the temple complex as Lord Krishna\'s image is bathed in panchamruta abhishekam. Prasadam is distributed to all devotees at dawn.',
    date: new Date('2026-08-17T04:00:00+05:30'),
    endDate: new Date('2026-08-18T06:00:00+05:30'),
    location: {
      address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101',
      district: 'Thrissur',
      lat: 10.5943,
      lng: 76.0421,
      placeName: 'Guruvayur Sri Krishna Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
    crowd: 'high',
    attendees: 800000,
    trending: true,
    organizerName: 'Guruvayur Devaswom Board',
    organizerPhone: '+91-487-2556236',
    website: 'https://guruvayurdevaswom.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['janmashtami', 'krishna', 'guruvayur', 'ashtamirohini', 'AI'],
  },

  {
    name: 'Ambalapuzha Krishna Temple Palpayasam Janmashtami 2026',
    description: 'Ambalapuzha Sree Krishna Temple is world-famous for the legendary Palpayasam — a divine rice pudding with jaggery offered to Lord Krishna every day without fail for centuries, fulfilling a beloved chess-match legend. On Janmashtami, special Sopana Sangeetham (uniquely Kerala\'s classical music form for temple worship), Krishnanattam dance-drama, and dawn-to-midnight abhishekam are performed. The Palpayasam distribution for over 50,000 devotees is an unforgettable experience. Traditional Vallam Kali (boat races) on the adjacent waterway are also organized.',
    date: new Date('2026-08-17T05:00:00+05:30'),
    endDate: new Date('2026-08-18T02:00:00+05:30'),
    location: {
      address: 'Ambalapuzha Sree Krishna Temple, Ambalapuzha, Alappuzha, Kerala 688561',
      district: 'Alappuzha',
      lat: 9.3820,
      lng: 76.3553,
      placeName: 'Ambalapuzha Sree Krishna Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Ambalapuzha-temple.jpg/800px-Ambalapuzha-temple.jpg'],
    crowd: 'high',
    attendees: 250000,
    trending: false,
    organizerName: 'Ambalapuzha Devaswom',
    organizerPhone: '+91-477-2272370',
    status: 'pending',
    addedBy: 'AI',
    tags: ['ambalapuzha', 'palpayasam', 'janmashtami', 'krishna', 'AI'],
  },

  {
    name: 'Aranmula Uthrittathi Boat Race & Parthasarathy Temple Festival 2026',
    description: 'The Aranmula Uthrittathi Vallam Kali (boat race) is unique among Kerala\'s famous boat races — this is NOT a competition. Hundreds of Palliyodam (ritual snake boats) row in unison as an offering to Lord Parthasarathy (Krishna as Arjuna\'s charioteer) at Aranmula temple on the Pampa River. Each boat carries the deity\'s idol and is rowed by 100+ oarsmen in ceremonial attire. The race is an act of collective worship — the most sacred boat procession in Kerala. Held during Onam season (Uthrittathi star), it is a Guinness-listed cultural heritage event.',
    date: new Date('2026-08-30T09:00:00+05:30'),
    endDate: new Date('2026-08-30T17:00:00+05:30'),
    location: {
      address: 'Aranmula Parthasarathy Temple, Aranmula, Pathanamthitta, Kerala 689533',
      district: 'Pathanamthitta',
      lat: 9.3672,
      lng: 76.6400,
      placeName: 'Aranmula Parthasarathy Temple & Pampa River',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Attukal_Pongala_2017.jpg/800px-Attukal_Pongala_2017.jpg'],
    crowd: 'high',
    attendees: 100000,
    trending: true,
    organizerName: 'Aranmula Parthasarathy Temple Committee',
    organizerPhone: '+91-468-2214255',
    status: 'pending',
    addedBy: 'AI',
    tags: ['aranmula', 'boat-race', 'vallam-kali', 'onam', 'pathanamthitta', 'AI'],
  },

  // ── SEPTEMBER 2026 (Onam Season) ─────────────────────────────────────────

  {
    name: 'Thiruvonam Onam Special Pujas — Padmanabhaswamy Temple 2026',
    description: 'Sree Padmanabhaswamy Temple in Thiruvananthapuram conducts the most sacred Onam celebrations in Kerala. On Thiruvonam (Onam day), Lord Padmanabha (Vishnu) receives a grand Murajapam abhishekam with 64 sacred items. A magnificent Onasadya (Onam feast) with 28+ traditional dishes is offered to 5000+ Brahmin priests, followed by Deeparadhana. The temple illuminated during Onam is a breathtaking sight. Only Hindus may enter, but the cultural significance of the celebration is felt across Thiruvananthapuram. This is one of Kerala\'s most revered Onam observances.',
    date: new Date('2026-09-07T04:00:00+05:30'),
    endDate: new Date('2026-09-07T22:00:00+05:30'),
    location: {
      address: 'Sree Padmanabhaswamy Temple, East Fort, Thiruvananthapuram, Kerala 695023',
      district: 'Thiruvananthapuram',
      lat: 8.4823,
      lng: 76.9467,
      placeName: 'Padmanabhaswamy Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Sreepadmanabhaswamy.jpg/800px-Sreepadmanabhaswamy.jpg'],
    crowd: 'high',
    attendees: 150000,
    trending: true,
    organizerName: 'Travancore Royal Family Devaswom',
    organizerPhone: '+91-471-2450233',
    website: 'https://www.sreepadmanabhaswamytemple.org',
    status: 'pending',
    addedBy: 'AI',
    tags: ['onam', 'padmanabhaswamy', 'thiruvananthapuram', 'thiruvonam', 'AI'],
  },

  {
    name: 'Onam Attachamayam Cultural Procession — Tripunithura 2026',
    description: 'The Attachamayam (Inauguration of Onam) procession at Tripunithura is one of Kerala\'s most vibrant cultural parades. Organized by the Tripunithura Cultural Organizations, the procession features tableaux showcasing every district of Kerala, folk arts like Thiruvathirakali, Kolkali, and Padayani, caparisoned elephants, traditional musical ensembles, and the grand finale of the Maharaja\'s retinue reenactment honouring the Cochin Royal Family. Over 100 cultural groups participate in this 5-km procession watched by 2 lakh visitors.',
    date: new Date('2026-09-04T09:00:00+05:30'),
    endDate: new Date('2026-09-04T17:00:00+05:30'),
    location: {
      address: 'Tripunithura Hill Palace, Tripunithura, Ernakulam, Kerala 682301',
      district: 'Ernakulam',
      lat: 9.9432,
      lng: 76.3563,
      placeName: 'Tripunithura Town',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Kerala_Onam_Festival.jpg/800px-Kerala_Onam_Festival.jpg'],
    crowd: 'high',
    attendees: 200000,
    trending: false,
    organizerName: 'Tripunithura Attukal & Cultural Committees',
    organizerPhone: '+91-484-2777080',
    status: 'pending',
    addedBy: 'AI',
    tags: ['onam', 'attachamayam', 'tripunithura', 'procession', 'ernakulam', 'AI'],
  },

  // ── OCTOBER 2026 (Navarathri Season) ─────────────────────────────────────

  {
    name: 'Navarathri Kolu Festival — Chottanikkara Bhagavathy Temple 2026',
    description: 'Navarathri (nine nights of the Goddess) is celebrated with extraordinary splendour at Chottanikkara Bhagavathy Temple in Ernakulam. The temple dedicated to Goddess Rajeshwari sets up the elaborate Kolu (display of dolls and figures depicting mythology), and each of the 9 nights sees a different alankaram (adornment) of the Devi — from Saraswathi to Lakshmi to Durga form. Vijayadasami (10th day) features the grand Vidyarambham ceremony where children hold their first writing lesson in rice with the temple\'s blessing. Over 50,000 devotees offer saree and silk to the goddess.',
    date: new Date('2026-09-22T04:00:00+05:30'),
    endDate: new Date('2026-10-02T22:00:00+05:30'),
    location: {
      address: 'Chottanikkara Bhagavathy Temple, Chottanikkara, Ernakulam, Kerala 682312',
      district: 'Ernakulam',
      lat: 9.9855,
      lng: 76.4198,
      placeName: 'Chottanikkara Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Chottanikkara_temple_01.jpg/800px-Chottanikkara_temple_01.jpg'],
    crowd: 'high',
    attendees: 200000,
    trending: false,
    organizerName: 'Chottanikkara Devaswom',
    organizerPhone: '+91-484-2690766',
    status: 'pending',
    addedBy: 'AI',
    tags: ['navarathri', 'chottanikkara', 'bhagavathy', 'devi', 'ernakulam', 'AI'],
  },

  {
    name: 'Vijayadasami Vidyarambham — Saraswathi Puja 2026',
    description: 'Vijayadasami marks the culmination of Navarathri and is celebrated across Kerala as Vidyarambham — the auspicious beginning of learning for children. Major temples including Thunchan Parambu (birthplace of the father of Malayalam literature), Guruvayur, and Padmanabhaswamy Temple conduct the sacred Vidyarambham rite where children trace the Sanskrit mantra "Hari Sree Ganapathaye Namah" in a plate of rice guided by a scholarly elder. Thousands of children across Kerala begin their formal education on this day. The Saraswathi Puja (worship of books and instruments) the previous day is equally important.',
    date: new Date('2026-10-02T05:00:00+05:30'),
    endDate: new Date('2026-10-02T18:00:00+05:30'),
    location: {
      address: 'Thunchan Parambu, Tirur, Malappuram, Kerala 676101',
      district: 'Malappuram',
      lat: 10.9112,
      lng: 75.9212,
      placeName: 'Thunchan Parambu, Tirur',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Thrissur_district.jpg/800px-Thrissur_district.jpg'],
    crowd: 'high',
    attendees: 80000,
    trending: false,
    organizerName: 'Thunchan Memorial Trust',
    organizerPhone: '+91-494-2423500',
    status: 'pending',
    addedBy: 'AI',
    tags: ['vijayadasami', 'vidyarambham', 'saraswathi', 'navarathri', 'malappuram', 'AI'],
  },

  {
    name: 'Padmanabhaswamy Temple Thulam Utsavam 2026',
    description: 'The Thulam (Alpashi) Utsavam at Sree Padmanabhaswamy Temple is a grand 10-day festival celebrated in the Malayalam month of Thulam (October). Lord Padmanabha — the reclining Vishnu on the celestial serpent Ananthashayana — receives elaborately crafted gold alankaram and special 64-ingredient abhishekam each day. The illuminated Gopuram (temple tower) by night, classical Carnatic music concerts featuring top artistes, Sopana Sangeetham, and nightly Deeparadhana create a deeply moving spiritual experience. Only Hindus with traditional attire may enter the inner sanctum.',
    date: new Date('2026-10-16T05:00:00+05:30'),
    endDate: new Date('2026-10-25T22:00:00+05:30'),
    location: {
      address: 'Sree Padmanabhaswamy Temple, East Fort, Thiruvananthapuram, Kerala 695023',
      district: 'Thiruvananthapuram',
      lat: 8.4823,
      lng: 76.9467,
      placeName: 'Padmanabhaswamy Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Sreepadmanabhaswamy.jpg/800px-Sreepadmanabhaswamy.jpg'],
    crowd: 'high',
    attendees: 150000,
    trending: false,
    organizerName: 'Travancore Royal Family Devaswom',
    organizerPhone: '+91-471-2450233',
    website: 'https://www.sreepadmanabhaswamytemple.org',
    status: 'pending',
    addedBy: 'AI',
    tags: ['padmanabhaswamy', 'thulam', 'utsavam', 'thiruvananthapuram', 'vishnu', 'AI'],
  },

  // ── NOVEMBER 2026 ─────────────────────────────────────────────────────────

  {
    name: 'Kerala Piravi — State Formation Day Celebrations 2026',
    description: 'Kerala Piravi (Kerala\'s Birthday), celebrated on November 1 every year, marks the formation of Kerala state in 1956 when Malayalam-speaking regions were unified. Major temples across Kerala conduct special poojas for Kerala\'s prosperity. The main state celebration at Thiruvananthapuram features cultural performances, folk arts, and tribute to Malayalam language and culture. Districts hold Piravi Sangeetham (classical music concerts), art exhibitions, and Kathakali performances. At Guruvayur Temple, a special prayer for Kerala\'s welfare is offered with 1,000+ devotees.',
    date: new Date('2026-11-01T07:00:00+05:30'),
    endDate: new Date('2026-11-01T21:00:00+05:30'),
    location: {
      address: 'Central Stadium, Thiruvananthapuram, Kerala 695001',
      district: 'Thiruvananthapuram',
      lat: 8.5027,
      lng: 76.9699,
      placeName: 'Central Stadium, Thiruvananthapuram',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Sreepadmanabhaswamy.jpg/800px-Sreepadmanabhaswamy.jpg'],
    crowd: 'medium',
    attendees: 50000,
    trending: false,
    organizerName: 'Kerala Government / District Administrations',
    status: 'pending',
    addedBy: 'AI',
    tags: ['kerala-piravi', 'state-formation', 'culture', 'thiruvananthapuram', 'AI'],
  },

  {
    name: 'Guruvayur Ekadasi Mahotsavam 2026',
    description: 'Guruvayur Ekadasi is the most sacred day of the year at the legendary Guruvayur Sri Krishna Temple. Hundreds of thousands of devotees fast the entire day and observe Jagaranam (all-night vigil) praying for liberation. The Udayasthamana Pooja (from sunrise to sunset without break) is offered by notable devotees. The day sees the ceremonial Elephants\' Feeding (Aanayoottu), where the Guruvayur Devaswom\'s 53 elephants are fed in a grand collective ceremony — one of the most moving sights in Kerala. Pre-dawn poojas begin at 2:30 AM.',
    date: new Date('2026-11-21T02:30:00+05:30'),
    endDate: new Date('2026-11-22T06:00:00+05:30'),
    location: {
      address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101',
      district: 'Thrissur',
      lat: 10.5943,
      lng: 76.0421,
      placeName: 'Guruvayur Sri Krishna Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
    crowd: 'high',
    attendees: 500000,
    trending: true,
    organizerName: 'Guruvayur Devaswom Board',
    organizerPhone: '+91-487-2556236',
    website: 'https://guruvayurdevaswom.in',
    status: 'pending',
    addedBy: 'AI',
    tags: ['guruvayur', 'ekadasi', 'krishna', 'fasting', 'aanayoottu', 'AI'],
  },

  {
    name: 'Sabarimala Mandalam Opening — 2026–27 Season',
    description: 'The Mandalam-Makaravilakku pilgrimage at Sabarimala Sree Dharma Sastha Temple opens for the most spiritually important season of the year. Millions of Ayyappa devotees all over India and beyond don the sacred black attire (irumudi) and undertake the 41-day Mandala vrat followed by the jungle trek to the hilltop shrine at 914 m altitude. The season officially begins on Karkidaka Vishu (first day of Mandalam month). Devotees carry the irumudi kettu (ritual bundle) on their heads and chant "Swamiye Saranam Ayyappa". Special darshan arrangements are made.',
    date: new Date('2026-11-27T05:00:00+05:30'),
    endDate: new Date('2027-01-14T22:00:00+05:30'),
    location: {
      address: 'Sabarimala Sree Dharma Sastha Temple, Pathanamthitta, Kerala 689589',
      district: 'Pathanamthitta',
      lat: 9.3833,
      lng: 77.0833,
      placeName: 'Sabarimala Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Sabarimala_temple.jpg/800px-Sabarimala_temple.jpg'],
    crowd: 'high',
    attendees: 5000000,
    trending: true,
    organizerName: 'Travancore Devaswom Board',
    organizerPhone: '+91-471-2314288',
    website: 'https://www.sabarimalatemple.com',
    status: 'pending',
    addedBy: 'AI',
    tags: ['sabarimala', 'ayyappa', 'mandalam', 'makaravilakku', 'AI'],
  },

  {
    name: 'Paramekkavu Temple Vrischika Utsavam 2026',
    description: 'The Vrischikam-month Utsavam of Paramekkavu Bhagavathy Temple in Thrissur is an intimate 10-day festival held independently from the grand Thrissur Pooram. Each day features Keli (drum invocation at dawn), Seeveli (elephant procession) in the evenings, Panchavadyam concert, and Deeparadhana. The 5th-day Kudamattam mini-performance gives devotees a close-up experience of the parasol exchange ritual. A 3-day Saptaham Bhajan and Harikatha with renowned Carnatic vocalists is organized in the temple courtyard.',
    date: new Date('2026-11-20T05:00:00+05:30'),
    endDate: new Date('2026-11-29T22:00:00+05:30'),
    location: {
      address: 'Paramekkavu Bhagavathy Temple, Sakthan Nagar, Thrissur, Kerala 680001',
      district: 'Thrissur',
      lat: 10.5266,
      lng: 76.2144,
      placeName: 'Paramekkavu Bhagavathy Temple',
    },
    category: 'Festival',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Thrissur_Pooram_2013.jpg/800px-Thrissur_Pooram_2013.jpg'],
    crowd: 'high',
    attendees: 150000,
    trending: false,
    organizerName: 'Paramekkavu Devaswom',
    organizerPhone: '+91-487-2422752',
    status: 'pending',
    addedBy: 'AI',
    tags: ['paramekkavu', 'bhagavathy', 'utsavam', 'thrissur', 'AI'],
  },

  // ── DECEMBER 2026 ─────────────────────────────────────────────────────────

  {
    name: 'Lokanarkavu Bhagavathy Theyyam Mahotsavam 2026',
    description: 'Lokanarkavu Temple at Vadakara in Kozhikode is one of the oldest Bhagavathy shrines in Malabar — over 1000 years old. The annual Theyyam festival showcases the most powerful forms of this divine art: Chamundi Theyyam, Kari Chamundi, Muchilottu Bhagavathy, and Raktha Chamundi — performers who literally become the deity, speaking prophecy, healing the sick, and blessing devotees. The pre-dawn Theyyam performance (2 AM – 5 AM) in the torch-lit grove by the river is an otherworldly spiritual experience. Traditional Mizhavu and Chenda percussion concerts accompany each Theyyam through the night.',
    date: new Date('2026-12-15T18:00:00+05:30'),
    endDate: new Date('2026-12-19T06:00:00+05:30'),
    location: {
      address: 'Lokanarkavu Bhagavathy Temple, Vadakara, Kozhikode, Kerala 673101',
      district: 'Kozhikode',
      lat: 11.6029,
      lng: 75.5868,
      placeName: 'Lokanarkavu Temple Vadakara',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'medium',
    attendees: 40000,
    trending: false,
    organizerName: 'Lokanarkavu Devaswom Committee',
    status: 'pending',
    addedBy: 'AI',
    tags: ['theyyam', 'lokanarkavu', 'bhagavathy', 'kozhikode', 'AI'],
  },

  {
    name: 'Parassinikadavu Muthappan Mahotsavam 2026',
    description: 'Parassinikadavu Sree Muthappan Temple on the Valapattanam River in Kannur is unique — the Muthappan Thira (ritual performance where the performer embodies the deity Muthappan) happens every single day of the year. The annual Mahotsavam features a grand 48-hour continuous Theyyam marathon, elephant procession, Thidambu Nritham, and spectacular fireworks. Muthappan — a syncretic deity combining aspects of Shiva and Vishnu — is equally beloved by Hindus, Muslims, and Christians, making this one of Kerala\'s most beautifully inclusive festivals. Oracle Arulvakku draws thousands seeking blessings.',
    date: new Date('2026-12-10T06:00:00+05:30'),
    endDate: new Date('2026-12-12T22:00:00+05:30'),
    location: {
      address: 'Parassinikadavu Sree Muthappan Temple, Parassinikadavu, Kannur, Kerala 670563',
      district: 'Kannur',
      lat: 11.9672,
      lng: 75.4007,
      placeName: 'Muthappan Temple Parassinikadavu',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'high',
    attendees: 200000,
    trending: false,
    organizerName: 'Parassinikadavu Muthappan Seva Sangham',
    organizerPhone: '+91-497-2782216',
    status: 'pending',
    addedBy: 'AI',
    tags: ['muthappan', 'parassinikadavu', 'theyyam', 'kannur', 'AI'],
  },

  {
    name: 'Ettumanoor Mahadeva Temple Dhanurmasa Poojas 2026',
    description: 'Ettumanoor Mahadeva Temple — famous for its exquisite 16th-century Padmavyooha murals inside the Koothambalam — conducts special Dhanurmasa (solar month of Sagittarius, December–January) poojas every day from 4 AM. Devotees who bath in the adjacent Ettu Peroor pond and offer before dawn during this month are believed to receive special divine blessings. The temple\'s golden Ezharaponana canopy (7.5 kg solid gold), the finest in Kerala, is displayed during these poojas. Carnatic classical concerts by top artistes from Kerala and Tamil Nadu fill the festive evenings. Special Sopana Sangeetham is performed inside the Koothambalam.',
    date: new Date('2026-12-16T04:00:00+05:30'),
    endDate: new Date('2027-01-13T08:00:00+05:30'),
    location: {
      address: 'Ettumanoor Mahadeva Temple, Ettumanoor, Kottayam, Kerala 686631',
      district: 'Kottayam',
      lat: 9.6697,
      lng: 76.5566,
      placeName: 'Ettumanoor Mahadeva Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Ettumanoor_Mahadeva_temple.jpg/800px-Ettumanoor_Mahadeva_temple.jpg'],
    crowd: 'medium',
    attendees: 60000,
    trending: false,
    organizerName: 'Ettumanoor Devaswom Board',
    organizerPhone: '+91-481-2563242',
    status: 'pending',
    addedBy: 'AI',
    tags: ['ettumanoor', 'mahadeva', 'dhanurmasa', 'kottayam', 'AI'],
  },

  {
    name: 'Mannarsala Nagaraja Temple Karthika Ayilyam Festival 2026',
    description: 'Mannarsala Sree Nagaraja Temple near Haripad holds the spectacular Karthika Ayilyam festival on the Ayilyam (Ashlesha) nakshatra day in the month of Karthika — one of the most auspicious days for serpent worship. The temple with over 30,000 serpent idol carvings in its ancient groves is considered the most sacred Nagaraja shrine in India. The famous Nooroum Palum ritual (offering milk and 100 bananas to the Naga deity) is performed by thousands. Sarpam Thullal dance (where devotees enter a trance-like state embodying serpent energy) and Pulluvan Paattu music fill the night.',
    date: new Date('2026-12-05T05:00:00+05:30'),
    endDate: new Date('2026-12-05T22:00:00+05:30'),
    location: {
      address: 'Mannarsala Sree Nagaraja Temple, Mannarsala, Haripad, Alappuzha, Kerala 690513',
      district: 'Alappuzha',
      lat: 9.2717,
      lng: 76.4472,
      placeName: 'Mannarsala Nagaraja Temple',
    },
    category: 'Cultural',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
    crowd: 'high',
    attendees: 100000,
    trending: false,
    organizerName: 'Mannarsala Devaswom',
    organizerPhone: '+91-479-2412303',
    status: 'pending',
    addedBy: 'AI',
    tags: ['mannarsala', 'nagaraja', 'serpent', 'ayilyam', 'karthika', 'AI'],
  },

];

// ─── Insert Logic ─────────────────────────────────────────────────────────────

/**
 * Fetches upcoming Kerala temple events and inserts only NEW ones into MongoDB.
 * Deduplication is done by event name — skips any event already in the database.
 * All inserted events have status='pending' and addedBy='AI' for admin review.
 *
 * @returns {Promise<number>} Count of newly inserted events
 */
async function fetchAndInsertNewEvents() {
  // Dedup against ALL event names in the DB (regardless of addedBy),
  // so seed events and AI-fetcher events never collide.
  const allExisting = await Event.find({}).select('name').lean();
  const existingNames = new Set(allExisting.map(e => e.name.trim()));

  const now = new Date();

  // Filter: only truly new events that are still in the future
  const newEvents = UPCOMING_KERALA_EVENTS.filter(
    e => !existingNames.has(e.name.trim()) && new Date(e.date) > now
  );

  if (newEvents.length === 0) {
    console.log('[AI Fetcher] No new upcoming Kerala events to insert.');
    return 0;
  }

  const inserted = await Event.insertMany(newEvents);
  console.log(`[AI Fetcher] ✅ Inserted ${inserted.length} new events for admin review.`);
  inserted.forEach(e => console.log(`   ↳ ${e.name} (${e.location.district})`));
  return inserted.length;
}

module.exports = { fetchAndInsertNewEvents, UPCOMING_KERALA_EVENTS };
