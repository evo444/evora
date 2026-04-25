const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { protect, adminOnly } = require('../middleware/auth');
const { runScheduledFetch } = require('../utils/scheduler');

// GET all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT approve user
router.put('/users/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT reject/unapprove user
router.put('/users/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { approved: false }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT change user role — body: { role: 'admin' | 'user' }
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'role must be "admin" or "user"' });
    }
    const update = { role };
    if (role === 'admin') update.approved = true; // admins are always approved
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// GET analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const topEvents = await Event.find().sort({ averageRating: -1, attendees: -1 }).limit(5);
    const totalEvents = await Event.countDocuments();
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ approved: false });
    const byCategory = await Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ topEvents, totalEvents, totalUsers, pendingUsers, byCategory });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT toggle trending
router.put('/events/:id/trending', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.trending = !event.trending;
    await event.save();
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/dbstats — live database stats for Database tab
router.get('/dbstats', protect, adminOnly, async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const totalUsers = await User.countDocuments();
    const [
      totalEvents, approvedEvents, pendingEvents, rejectedEvents,
      totalFeedback, bugReports, suggestions, newFeedback,
      recentUsers, recentEvents, recentFeedback
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'approved' }),
      Event.countDocuments({ status: 'pending' }),
      Event.countDocuments({ status: 'rejected' }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ type: 'bug' }),
      Feedback.countDocuments({ type: 'suggestion' }),
      Feedback.countDocuments({ status: 'new' }),
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(5),
      Event.find().select('name category status date createdAt').sort({ createdAt: -1 }).limit(5),
      Feedback.find().select('type message status createdAt').populate('user', 'name').sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      collections: [
        {
          name: 'Users', icon: '👥', color: 'blue',
          total: totalUsers,
          stats: [
            { label: 'Admins', value: adminCount },
            { label: 'Regular Users', value: totalUsers - adminCount },
          ],
          recent: recentUsers,
        },
        {
          name: 'Events', icon: '🎪', color: 'green',
          total: totalEvents,
          stats: [
            { label: 'Approved', value: approvedEvents },
            { label: 'Pending', value: pendingEvents },
            { label: 'Rejected', value: rejectedEvents },
          ],
          recent: recentEvents,
        },
        {
          name: 'Feedback', icon: '💬', color: 'orange',
          total: totalFeedback,
          stats: [
            { label: 'Bug Reports', value: bugReports },
            { label: 'Suggestions', value: suggestions },
            { label: 'Unread', value: newFeedback },
          ],
          recent: recentFeedback,
        },
      ]
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/seed-kerala — insert Kerala temple events (admin only, safe to call once)
router.post('/seed-kerala', protect, adminOnly, async (req, res) => {
  try {
    const existing = await Event.countDocuments({ tags: 'AI' });
    if (existing > 0) {
      return res.json({ message: `Already seeded — ${existing} AI-tagged events found. No duplicates added.`, count: existing });
    }

    const now = new Date();
    const yr = (m, d) => {
      const dt = new Date(`2025-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T05:00:00+05:30`);
      return dt < now ? new Date(dt.setFullYear(2026)) : dt;
    };
    const yr2 = (m, d) => new Date(`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T05:00:00+05:30`);

    const keralaEvents = [
      {
        name: 'Guruvayur Ekadasi Mahotsavam',
        description: 'Guruvayur Ekadasi is one of the most sacred days at Sri Krishna Temple, Guruvayur. Lakhs of devotees participate in 24-hour continuous archana, Udayasthamana Pooja, and a majestic elephant procession with Panchavadyam. The 4 AM morning pooja and Thrissur Pooram-style Kudamattam make this festival extraordinary. All-night bhajan sessions and special Ekadasi poojas are observed. The temple tank and surroundings are illuminated beautifully throughout the night.',
        date: yr(11, 1),
        endDate: yr(11, 2),
        location: { address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101', district: 'Thrissur', lat: 10.5943, lng: 76.0421, placeName: 'Guruvayur Sri Krishna Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
        crowd: 'high', attendees: 500000, trending: true, organizerName: 'Guruvayur Devaswom Board', organizerPhone: '+91-487-2556236', website: 'https://guruvayurdevaswom.in', status: 'approved', tags: ['guruvayur', 'ekadasi', 'krishna', 'panchavadyam', 'AI'],
      },
      {
        name: 'Sabarimala Mandalam-Makaravilakku Season',
        description: 'The annual Mandalam-Makaravilakku pilgrimage at Sabarimala Sree Dharma Sastha Temple is one of the largest Hindu pilgrimages in the world, drawing over 3 crore devotees. Ayyappa devotees undertake 41-day Mandala vrat wearing black attire and trek through Periyar forests. The Makaravilakku climax on January 14 features the celestial Makara Jyothi star and the sacred Thiruvabharanam arrow procession from Pandalam Palace. Special prasad distribution and Panchabhuta deeparadhana conclude the season.',
        date: yr(11, 26),
        endDate: yr2(1, 14),
        location: { address: 'Sabarimala Sree Dharma Sastha Temple, Pathanamthitta, Kerala 689589', district: 'Pathanamthitta', lat: 9.3833, lng: 77.0833, placeName: 'Sabarimala Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Sabarimala_temple.jpg/800px-Sabarimala_temple.jpg'],
        crowd: 'high', attendees: 3000000, trending: true, organizerName: 'Travancore Devaswom Board', organizerPhone: '+91-471-2314288', website: 'https://www.sabarimalatemple.com', status: 'approved', tags: ['sabarimala', 'ayyappa', 'mandalam', 'makaravilakku', 'AI'],
      },
      {
        name: 'Attukal Pongala Mahotsavam',
        description: 'Attukal Pongala is the largest annual gathering of women in the world — a Guinness World Record holder. Millions of women prepare the sacred Pongala offering (rice cooked with jaggery) on makeshift earthen stoves across 15 km of Thiruvananthapuram streets. The 9-day festival honours Attukal Devi (Kannaki) and includes Kappu ketting (sacred thread tying), Kuruthitharpanam, and the grand Pongala day when the entire city smells of jaggery rice. Women of all faiths participate.',
        date: yr2(3, 2),
        endDate: yr2(3, 10),
        location: { address: 'Attukal Devi Temple, Attukal, Thiruvananthapuram, Kerala 695001', district: 'Thiruvananthapuram', lat: 8.4823, lng: 76.9465, placeName: 'Attukal Bhagavathy Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Attukal_pongala.jpg/800px-Attukal_pongala.jpg'],
        crowd: 'high', attendees: 2500000, trending: true, organizerName: 'Attukal Devaswom', organizerPhone: '+91-471-2460327', website: 'https://www.attukaltemple.org', status: 'approved', tags: ['attukal', 'pongala', 'women', 'guinness-record', 'AI'],
      },
      {
        name: 'Thrissur Pooram',
        description: 'Thrissur Pooram is the grandest temple festival in Kerala, held annually at Vadakkunnathan Temple ground. Two rival groups — Thiruvambadi and Paramekkavu — present 15 caparisoned elephants each adorned with golden nettipattam. The Kudamattam (spectacular umbrella exchange) and the thrilling all-night Vedikettu (fireworks lasting 4+ hours) draw over 1 million visitors. The Panchavadyam performance with 100+ musicians is one of the finest percussion ensembles in the world.',
        date: yr2(4, 26),
        endDate: yr2(4, 27),
        location: { address: 'Vadakkunnathan Temple Maidan, Thrissur, Kerala 680001', district: 'Thrissur', lat: 10.5276, lng: 76.2144, placeName: 'Vadakkunnathan Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Thrissur_Pooram_2013.jpg/800px-Thrissur_Pooram_2013.jpg'],
        crowd: 'high', attendees: 1000000, trending: true, organizerName: 'Thiruvambadi & Paramekkavu Devaswom', organizerPhone: '+91-487-2422752', website: 'https://thrissurpooram.in', status: 'approved', tags: ['thrissur-pooram', 'elephants', 'panchavadyam', 'kudamattam', 'AI'],
      },
      {
        name: 'Padmanabhaswamy Temple Alpashi Utsavam',
        description: 'The Alpashi Utsavam at Sree Padmanabhaswamy Temple — one of the 108 Divya Desams and the world\'s wealthiest temple — is a spectacular 10-day festival in the Malayalam month of Thulam. The sacred idol of Lord Padmanabha (Vishnu in Anantha Shayana posture) receives elaborate abhishekam with 64 ritual baths and stunning gold alankaram. The illuminated Gopuram and daily Deeparadhana are breathtaking. Classical Carnatic music concerts, Harikatha, and Sopana Sangeetham fill the festival evenings.',
        date: yr(10, 16),
        endDate: yr(10, 25),
        location: { address: 'Sree Padmanabhaswamy Temple, East Fort, Thiruvananthapuram, Kerala 695023', district: 'Thiruvananthapuram', lat: 8.4823, lng: 76.9467, placeName: 'Padmanabhaswamy Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Sreepadmanabhaswamy.jpg/800px-Sreepadmanabhaswamy.jpg'],
        crowd: 'high', attendees: 150000, trending: false, organizerName: 'Travancore Royal Family Devaswom', organizerPhone: '+91-471-2450233', website: 'https://www.sreepadmanabhaswamytemple.org', status: 'approved', tags: ['padmanabhaswamy', 'thiruvananthapuram', 'vishnu', 'divya-desam', 'AI'],
      },
      {
        name: 'Chottanikkara Makam Thozhal Festival',
        description: 'The Makam Thozhal at Chottanikkara Bhagavathy Temple is celebrated on each Makam nakshatra day, with the annual Mahotsavam being the grandest. The temple dedicated to Goddess Rajeshwari is famous across Kerala for miraculous healing. Tens of thousands offer Guruti (camphor flame) and join the Sreebhuta Bali procession at night. The Kavu Theendal (lighting the sacred grove), Kala Vilakku, and Ashtabandha Kalasham pooja during the festival are deeply sacred. Special healing rituals for mental wellness are conducted daily.',
        date: yr(2, 4),
        endDate: yr(2, 5),
        location: { address: 'Chottanikkara Bhagavathy Temple, Chottanikkara, Ernakulam, Kerala 682312', district: 'Ernakulam', lat: 9.9855, lng: 76.4198, placeName: 'Chottanikkara Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Chottanikkara_temple_01.jpg/800px-Chottanikkara_temple_01.jpg'],
        crowd: 'high', attendees: 80000, trending: false, organizerName: 'Chottanikkara Devaswom', organizerPhone: '+91-484-2690766', status: 'approved', tags: ['chottanikkara', 'bhagavathy', 'makam', 'ernakulam', 'AI'],
      },
      {
        name: 'Vaikom Mahadeva Temple Ashtami Rohini Utsavam',
        description: 'The Ashtami Rohini (Janmashtami) at Vaikom Mahadeva Temple — one of Kerala\'s five Pancha Mahadeva Kshetrams — is an 8-day grand festival. Lord Shiva is worshipped in a rare Swayambhu Lingam form, making this temple extraordinary. Highlights include Ksheera Abhishekam (milk bath for the lingam), elephant procession, Panchavadyam, and illuminated Gopuram. The cool misty air from Vembanad Lake nearby adds ethereal beauty. A grand Annadanam (free food) for 10,000+ devotees is served daily.',
        date: yr(8, 16),
        endDate: yr(8, 23),
        location: { address: 'Vaikom Mahadeva Temple, Vaikom, Kottayam, Kerala 686141', district: 'Kottayam', lat: 9.7508, lng: 76.3954, placeName: 'Vaikom Mahadeva Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/VaikomMahadevTemple.jpg/800px-VaikomMahadevTemple.jpg'],
        crowd: 'high', attendees: 200000, trending: false, organizerName: 'Vaikom Devaswom', organizerPhone: '+91-481-2362205', status: 'approved', tags: ['vaikom', 'shiva', 'ashtami', 'panchamahadevas', 'kottayam', 'AI'],
      },
      {
        name: 'Kadampuzha Devi Utsavam',
        description: 'Kadampuzha Devi Temple in Malappuram is one of the most powerful Shakti shrines in Kerala, nestled in a serene forest by the Kadampuzha River. The annual 10-day Utsavam features breathtaking Theyyam performances, Thidambu Nritham (sacred idol dance), Ottanthullal, and Gajakesariyogam (elephant-lion ritual). The Goddess is believed to grant wishes and the oracle pronouncements during the Theyyam are treated as directly from the Devi. Massive fireworks on the final night light up the riverside forest.',
        date: yr(7, 20),
        endDate: yr(7, 29),
        location: { address: 'Kadampuzha Bhagavathy Temple, Kadampuzha, Malappuram, Kerala 676541', district: 'Malappuram', lat: 11.0247, lng: 76.0712, placeName: 'Kadampuzha Bhagavathy Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
        crowd: 'high', attendees: 120000, trending: false, organizerName: 'Kadampuzha Devaswom', status: 'approved', tags: ['kadampuzha', 'devi', 'theyyam', 'malappuram', 'AI'],
      },
      {
        name: 'Koodalmanikyam Bharani Vilakku Festival',
        description: 'Koodalmanikyam Temple at Irinjalakuda is believed to be the only temple in the world dedicated to Bharata — brother of Lord Rama. The Bharani festival during Karkidakam month is spectacular: over 100,000 oil lamps are lit simultaneously across the entire temple complex, creating a breathtaking sea of fire. Thousands of women in silk sarees carry the lamps in a grand procession. The Vilakku porattu (lamp contest) between temple groups is one of the most unique traditions in Kerala temple culture.',
        date: yr(7, 28),
        endDate: yr(7, 29),
        location: { address: 'Koodalmanikyam Temple, Irinjalakuda, Thrissur, Kerala 680121', district: 'Thrissur', lat: 10.3426, lng: 76.2135, placeName: 'Koodalmanikyam Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Bharani-Festival-Irinjalakuda.jpg/800px-Bharani-Festival-Irinjalakuda.jpg'],
        crowd: 'high', attendees: 300000, trending: true, organizerName: 'Koodalmanikyam Devaswom', organizerPhone: '+91-480-2826285', status: 'approved', tags: ['koodalmanikyam', 'bharata', 'bharani', 'vilakku', 'AI'],
      },
      {
        name: 'Ettumanoor Mahadeva Temple Utsavam & Arattu',
        description: 'The Ettumanoor Mahadeva Temple, renowned for its stunning 16th-century Padmavyooha murals, hosts a grand 10-day Utsavam culminating in the sacred Arattu. The famous "Ezharaponana" — a solid gold canopy weighing 7.5 kg — adorns the deity during festival days. On Ashtami (8th day), a fireworks display and 4-hour Panchavadyam performance draw lakhs. The Arattu procession where the deity is taken for ritual bathing at Ettumanoor pond is a deeply moving spiritual experience.',
        date: yr(2, 14),
        endDate: yr(2, 23),
        location: { address: 'Ettumanoor Mahadeva Temple, Ettumanoor, Kottayam, Kerala 686631', district: 'Kottayam', lat: 9.6697, lng: 76.5566, placeName: 'Ettumanoor Mahadeva Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Ettumanoor_Mahadeva_temple.jpg/800px-Ettumanoor_Mahadeva_temple.jpg'],
        crowd: 'high', attendees: 100000, trending: false, organizerName: 'Ettumanoor Devaswom Board', organizerPhone: '+91-481-2563242', status: 'approved', tags: ['ettumanoor', 'mahadeva', 'arattu', 'kottayam', 'AI'],
      },
      {
        name: 'Nenmara-Vallangi Vela Festival',
        description: 'Nenmara-Vallangi Vela is one of the most colorful and electrifying temple festivals in Kerala, held in Palakkad. Two rival groups — Nenmara and Vallangi — each present over 30 caparisoned elephants in a fierce but friendly competition of grandeur. The highlight is the Kuda Mela (umbrella exchange), where elaborately decorated parasols are swapped to traditional Panchavadyam music. The fireworks finale lasting 5+ hours is considered the finest in all of Kerala and visible from miles away.',
        date: yr2(4, 14),
        endDate: yr2(4, 15),
        location: { address: 'Nenmara-Vallangi, Chittur-Thathamangalam, Palakkad, Kerala 678508', district: 'Palakkad', lat: 10.5124, lng: 76.7266, placeName: 'Nenmara Temple Ground' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Thrissur_Pooram_2013.jpg/800px-Thrissur_Pooram_2013.jpg'],
        crowd: 'high', attendees: 500000, trending: true, organizerName: 'Nenmara-Vallangi Temple Committee', status: 'approved', tags: ['nenmara-vallangi', 'vela', 'elephants', 'palakkad', 'AI'],
      },
      {
        name: 'Mannarsala Sree Nagaraja Ayilyam Festival',
        description: 'Mannarsala Nagaraja Temple near Haripad has over 30,000 serpent idol carvings in its sacred groves — the largest Nagaraja shrine in India. On Ayilyam nakshatra days, the famous Nooroum Palum ritual (offering milk and 100 bananas to serpent idol) is performed. Childless couples and devotees seeking healing undertake Sarpa Bali. The annual Ayilyam Mahotsavam features Pulluvan Paattu (ancient snake-worship music), Sarpam Thullal dance, and night-long Nagapanchami celebrations in the mystical forest grove.',
        date: yr(11, 12),
        endDate: yr(11, 12),
        location: { address: 'Mannarsala Sree Nagaraja Temple, Mannarsala, Haripad, Alappuzha, Kerala 690513', district: 'Alappuzha', lat: 9.2717, lng: 76.4472, placeName: 'Mannarsala Nagaraja Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
        crowd: 'high', attendees: 100000, trending: false, organizerName: 'Mannarsala Devaswom', organizerPhone: '+91-479-2412303', status: 'approved', tags: ['mannarsala', 'nagaraja', 'serpent', 'ayilyam', 'AI'],
      },
      {
        name: 'Ambalapuzha Krishna Temple Janmashtami & Palpayasam',
        description: 'Ambalapuzha Sree Krishna Temple is world-famous for the daily Palpayasam — rice pudding made with jaggery that has been offered without interruption for centuries, fulfilling a divine chess bet. During Janmashtami, special dawn-to-dusk poojas, Krishnanattam dance-drama performances, and Sopana Sangeetham concerts are held. A grand Palpayasam distribution for 50,000+ devotees takes place. Boat races on the adjacent Punnamada Lake add to the festive atmosphere.',
        date: yr(8, 12),
        endDate: yr(8, 13),
        location: { address: 'Ambalapuzha Sree Krishna Temple, Ambalapuzha, Alappuzha, Kerala 688561', district: 'Alappuzha', lat: 9.3820, lng: 76.3553, placeName: 'Ambalapuzha Sree Krishna Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Ambalapuzha-temple.jpg/800px-Ambalapuzha-temple.jpg'],
        crowd: 'high', attendees: 250000, trending: false, organizerName: 'Ambalapuzha Devaswom', organizerPhone: '+91-477-2272370', status: 'approved', tags: ['ambalapuzha', 'palpayasam', 'janmashtami', 'krishna', 'AI'],
      },
      {
        name: 'Parassinikadavu Muthappan Mahotsavam',
        description: 'Parassinikadavu Sree Muthappan Temple on the Valapattanam River banks in Kannur is unique — Muthappan Thira (ritual performance embodying the deity) is performed every single day here. The annual Mahotsavam in the Kumbham month features a 48-hour grand Theyyam marathon, elephant procession, Thidambu Nritham, and fireworks. Muthappan is beloved equally by Hindus, Muslims, and Christians, making this one of Kerala\'s most beautifully secular festivals. The oracle Arulvakku from Muthappan attracts thousands seeking blessings.',
        date: yr2(3, 5),
        endDate: yr2(3, 7),
        location: { address: 'Parassinikadavu Sree Muthappan Temple, Parassinikadavu, Kannur, Kerala 670563', district: 'Kannur', lat: 11.9672, lng: 75.4007, placeName: 'Muthappan Temple Parassinikadavu' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
        crowd: 'high', attendees: 200000, trending: false, organizerName: 'Parassinikadavu Muthappan Seva Sangham', organizerPhone: '+91-497-2782216', status: 'approved', tags: ['muthappan', 'parassinikadavu', 'theyyam', 'kannur', 'AI'],
      },
      {
        name: 'Thiruvanchikulam Mahadeva Temple Shivaratri Mahotsavam',
        description: 'Thiruvanchikulam Sree Mahadeva Temple in Kodungallur is one of the seven Shiva temples mentioned in the Keralolpatti scripture as most sacred. The Shivaratri (Lord Shiva\'s night) is celebrated with a 24-hour fast, all-night Jagaranam (vigil), and special Ashtadrvaas abhishekam using 8 sacred substances including milk, curd, honey, ghee, and holy ash. Thousands of oil lamps are lit around the ancient temple pond. The Kala Vilakku and Deeparadhana at midnight are profoundly moving.',
        date: yr(2, 26),
        endDate: yr(2, 27),
        location: { address: 'Thiruvanchikulam Sree Mahadeva Temple, Kodungallur, Thrissur, Kerala 680664', district: 'Thrissur', lat: 10.2333, lng: 76.2000, placeName: 'Thiruvanchikulam Mahadeva Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Kodungallur_Bharani.jpg/800px-Kodungallur_Bharani.jpg'],
        crowd: 'high', attendees: 80000, trending: false, organizerName: 'Thiruvanchikulam Devaswom', status: 'approved', tags: ['thiruvanchikulam', 'shiva', 'shivaratri', 'kodungallur', 'AI'],
      },
      {
        name: 'Kodungallur Bharani Utsavam',
        description: 'Kodungallur Bharani at the ancient Bhagavathy temple is one of the most raw, primal, and powerful festivals in Kerala — dating back over 1500 years. On Bharani day in the Malayalam month of Karkidakam, devotees march in procession singing Bharani Pattu (ancient ritual folk songs) and offering Guruti (blood ritual). The Kavu Theendal (entering the sacred forest) tradition is unique to this shrine. The Bhagavathy is worshipped in her fierce Bhadrakali form and is believed to grant powerful boons.',
        date: yr(4, 2),
        endDate: yr(4, 3),
        location: { address: 'Kodungallur Bhagavathy Temple, Kodungallur, Thrissur, Kerala 680664', district: 'Thrissur', lat: 10.2324, lng: 76.1949, placeName: 'Kodungallur Bhagavathy Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Kodungallur_Bharani.jpg/800px-Kodungallur_Bharani.jpg'],
        crowd: 'high', attendees: 300000, trending: false, organizerName: 'Kodungallur Devaswom Committee', organizerPhone: '+91-480-2802252', status: 'approved', tags: ['kodungallur', 'bharani', 'bhagavathy', 'bhadrakali', 'AI'],
      },
      {
        name: 'Thriprayar Sree Rama Temple Karkidakam Ramayana Masam',
        description: 'Thriprayar Sree Rama Temple — one of the five Pancha Rama Kshetrams in Kerala — holds a month-long Ramayana Parayanam (recitation) every Karkidakam. This month, Kerala\'s households and temples resonate with the chanting of Adhyatma Ramayanam by Thunchaththu Ezhuthachan. The temple conducts daily Sundarakanda Parayanam at 6 AM, Harikatha evenings, and a grand Saptaha Yajna in the final week with 25+ Vedic scholars. The lakeside setting of the temple with the Karuvannur River makes this spiritually profound.',
        date: yr(7, 17),
        endDate: yr(8, 16),
        location: { address: 'Thriprayar Sree Rama Temple, Thriprayar, Thrissur, Kerala 680566', district: 'Thrissur', lat: 10.3087, lng: 76.1467, placeName: 'Thriprayar Sree Rama Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Thrissur_district.jpg/800px-Thrissur_district.jpg'],
        crowd: 'medium', attendees: 60000, trending: false, organizerName: 'Thriprayar Devaswom', organizerPhone: '+91-487-2394258', status: 'approved', tags: ['thriprayar', 'rama', 'ramayana', 'karkidakam', 'AI'],
      },
      {
        name: 'Lokanarkavu Bhagavathy Theyyam Mahotsavam',
        description: 'Lokanarkavu Temple in Vadakara (Kozhikode) is one of the oldest Bhagavathy shrines in Malabar, over 1000 years old. The annual Theyyam festival features spectacular Chamundi, Kari Chamundi, and Muchilottu Bhagavathy Theyyam — divine art forms where performers are believed to literally embody the goddess. The oracle Arulvakku during Theyyam is treated as divine pronouncement. Traditional Mizhavu and Chenda percussion concerts accompany each Theyyam. The riverside forest setting at dusk makes for an unforgettable experience.',
        date: yr(12, 15),
        endDate: yr(12, 19),
        location: { address: 'Lokanarkavu Bhagavathy Temple, Vadakara, Kozhikode, Kerala 673101', district: 'Kozhikode', lat: 11.6029, lng: 75.5868, placeName: 'Lokanarkavu Temple Vadakara' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theyyam_Kerala.jpg/800px-Theyyam_Kerala.jpg'],
        crowd: 'medium', attendees: 40000, trending: false, organizerName: 'Lokanarkavu Devaswom Committee', status: 'approved', tags: ['lokanarkavu', 'theyyam', 'bhagavathy', 'kozhikode', 'AI'],
      },
      {
        name: 'Guruvayur Utsavam — 10 Day Elephant Festival',
        description: 'The Guruvayur Utsavam is a magnificent 10-day festival at the most famous Krishna temple in Kerala. Each day features a different caparisoned elephant carrying the deity in a grand evening procession (Seeveli) with full Panchavadyam orchestra. The most anticipated event is the Aanayoottu (feeding of elephants) and the selection of the Utsava Elephant of the year. Classical dance performances (Mohiniattam, Bharatanatyam), Harikatha, Sopana Sangeetham, and Ottanthullal are staged every evening. The temple owns the largest elephant sanctuary in the world — the Punnathur Kotta.',
        date: yr(1, 14),
        endDate: yr(1, 23),
        location: { address: 'Sri Krishna Temple, Guruvayur, Thrissur, Kerala 680101', district: 'Thrissur', lat: 10.5943, lng: 76.0421, placeName: 'Guruvayur Sri Krishna Temple' },
        category: 'Festival', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Guruvayur_Temple.jpg/800px-Guruvayur_Temple.jpg'],
        crowd: 'high', attendees: 400000, trending: true, organizerName: 'Guruvayur Devaswom Board', organizerPhone: '+91-487-2556236', website: 'https://guruvayurdevaswom.in', status: 'approved', tags: ['guruvayur', 'utsavam', 'elephants', 'krishna', 'AI'],
      },
      {
        name: 'Sree Kurumba Bhagavathy Kodikuthu — Kodungallur',
        description: 'The Kodikuthu (flag hoisting) ceremony at Kodungallur Sree Kurumba Bhagavathy Temple marks the official start of the Bharani season — 8 days before the main Bharani festival. The Kodikuthu sees thousands of devotees converge from across Kerala. The sacred Kodimaram (flagpost) is ritually anointed with turmeric and vermilion before the flag is raised to conch-shell and Chenda beats. The Deeparadhana that follows at dusk with 1001 oil lamps is breathtaking. Evening Harikatha and Kathakali performances are organised in the temple grounds.',
        date: yr(3, 25),
        endDate: yr(3, 26),
        location: { address: 'Kodungallur Sree Kurumba Bhagavathy Temple, Kodungallur, Thrissur, Kerala 680664', district: 'Thrissur', lat: 10.2324, lng: 76.1949, placeName: 'Kodungallur Bhagavathy Temple' },
        category: 'Cultural', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Kodungallur_Bharani.jpg/800px-Kodungallur_Bharani.jpg'],
        crowd: 'medium', attendees: 50000, trending: false, organizerName: 'Kodungallur Devaswom Committee', organizerPhone: '+91-480-2802252', status: 'approved', tags: ['kodungallur', 'kodikuthu', 'kurumba', 'bhagavathy', 'AI'],
      },
    ];

    // Stamp addedBy:'AI' on every event so they appear in the AI tracking system
    const inserted = await Event.insertMany(keralaEvents.map(e => ({ ...e, addedBy: 'AI' })));
    res.json({
      message: `✅ Successfully seeded ${inserted.length} Kerala temple events!`,
      count: inserted.length,
      events: inserted.map(e => ({ id: e._id, name: e.name, district: e.location.district })),
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── AI Event Queue & Controls ─────────────────────────────────────────────

/**
 * GET /api/admin/ai-queue
 * Returns all AI-added events awaiting admin review (status = pending, addedBy = AI).
 * Supports pagination via ?page=1&limit=20 and filtering by status.
 */
router.get('/ai-queue', protect, adminOnly, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const status = req.query.status || 'pending'; // pending | approved | rejected | all

    const filter = { addedBy: 'AI' };
    if (status !== 'all') filter.status = status;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name category status date endDate location images crowd attendees trending tags addedBy createdAt'),
      Event.countDocuments(filter),
    ]);

    const pendingCount  = await Event.countDocuments({ addedBy: 'AI', status: 'pending' });
    const approvedCount = await Event.countDocuments({ addedBy: 'AI', status: 'approved' });
    const rejectedCount = await Event.countDocuments({ addedBy: 'AI', status: 'rejected' });

    res.json({
      events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/admin/ai-fetch
 * Manually triggers the AI event fetcher — same logic as the weekly scheduler.
 * Useful for testing or fetching immediately without waiting 7 days.
 */
router.post('/ai-fetch', protect, adminOnly, async (req, res) => {
  try {
    console.log(`[Admin] Manual AI fetch triggered by admin at ${new Date().toISOString()}`);
    const count = await runScheduledFetch('admin-manual');
    res.json({
      message: count > 0
        ? `✅ ${count} new Kerala temple event(s) added for review.`
        : 'ℹ️  No new events — all upcoming events are already in the database.',
      newEvents: count,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/admin/ai-stats
 * Quick stats about AI-added events in the database.
 */
router.get('/ai-stats', protect, adminOnly, async (req, res) => {
  try {
    const [total, pending, approved, rejected, upcoming] = await Promise.all([
      Event.countDocuments({ addedBy: 'AI' }),
      Event.countDocuments({ addedBy: 'AI', status: 'pending' }),
      Event.countDocuments({ addedBy: 'AI', status: 'approved' }),
      Event.countDocuments({ addedBy: 'AI', status: 'rejected' }),
      Event.countDocuments({ addedBy: 'AI', status: 'approved', date: { $gte: new Date() } }),
    ]);
    const nextEvent = await Event.findOne({ addedBy: 'AI', status: 'approved', date: { $gte: new Date() } })
      .sort({ date: 1 }).select('name date location.district');
    res.json({ total, pending, approved, rejected, upcoming, nextEvent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
