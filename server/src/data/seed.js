import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

// Rajahmundry / Pushkaram area facilities (synthetic demo data)
const FACILITIES = [
  // Bathing Ghats
  { name: 'Godavari Pushkara Ghat 1', name_te: 'గోదావరి పుష్కర ఘాట్ 1', name_hi: 'गोदावरी पुष्कर घाट 1', category: 'ghat', lat: 17.0005, lng: 81.7793, address: 'Pushkara Ghat, Rajahmundry', status: 'verified', operational_status: 'operational', capacity: 5000, description: 'Main bathing ghat for Pushkaram pilgrims', description_te: 'పుష్కరం యాత్రికుల ప్రధాన స్నాన ఘాట్', description_hi: 'पुष्करम् तीर्थयात्रियों के लिए मुख्य स्नान घाट' },
  { name: 'Godavari Pushkara Ghat 2', name_te: 'గోదావరి పుష్కర ఘాట్ 2', name_hi: 'गोदावरी पुष्कर घाट 2', category: 'ghat', lat: 17.0012, lng: 81.7810, address: 'Pushkara Ghat 2, Rajahmundry', status: 'verified', operational_status: 'operational', capacity: 4000, description: 'Secondary bathing ghat', description_te: 'ద్వితీయ స్నాన ఘాట్', description_hi: 'द्वितीयक स्नान घाट' },
  { name: 'Lanka Ghat Access Point', name_te: 'లంక ఘాట్ యాక్సెస్ పాయింట్', name_hi: 'लंका घाट प्रवेश बिंदु', category: 'ghat', lat: 16.9980, lng: 81.7760, address: 'Lanka Ghat, Rajahmundry', status: 'reported', operational_status: 'unknown', capacity: 2000, description: 'Designated ghat access point on Lanka side', description_te: 'లంక వైపు నిర్ణీత ఘాట్ ప్రవేశ స్థలం', description_hi: 'लंका की ओर से नामित घाट प्रवेश बिंदु' },
  { name: 'Dhavaleswaram Ghat', name_te: 'ధవళేశ్వరం ఘాట్', name_hi: 'धवलेश्वरम घाट', category: 'ghat', lat: 16.9940, lng: 81.7720, address: 'Dhavaleswaram, East Godavari', status: 'verified', operational_status: 'operational', capacity: 3000, description: 'Ghat near Dhavaleswaram barrage', description_te: 'ధవళేశ్వరం బ్యారేజ్ సమీప ఘాట్', description_hi: 'धवलेश्वरम बैराज के पास घाट' },

  // Public Toilets
  { name: 'Pushkara Sanitation Complex A', name_te: 'పుష్కర పారిశుద్ధ్య సముదాయం A', name_hi: 'पुष्कर स्वच्छता परिसर A', category: 'toilet', lat: 17.0020, lng: 81.7800, address: 'Near Ghat 1 Entrance', status: 'verified', operational_status: 'operational', capacity: 200, description: 'Public toilet complex with 200 units', description_te: '200 యూనిట్లతో ప్రజా మరుగుదొడ్డి సముదాయం', description_hi: '200 इकाइयों वाला सार्वजनिक शौचालय परिसर' },
  { name: 'Pushkara Sanitation Complex B', name_te: 'పుష్కర పారిశుద్ధ్య సముదాయం B', name_hi: 'पुष्कर स्वच्छता परिसर B', category: 'toilet', lat: 16.9995, lng: 81.7770, address: 'Near Ghat 2, Main Road', status: 'reported', operational_status: 'unknown', capacity: 150, description: 'Temporary sanitation facility', description_te: 'తాత్కాలిక పారిశుద్ధ్య సదుపాయం', description_hi: 'अस्थायी स्वच्छता सुविधा' },
  { name: 'Lanka Sanitation Point', name_te: 'లంక పారిశుద్ధ్య స్థానం', name_hi: 'लंका स्वच्छता बिंदु', category: 'toilet', lat: 16.9975, lng: 81.7750, address: 'Lanka Island Area', status: 'reported', operational_status: 'operational', capacity: 100, description: 'Sanitation point on Lanka side', description_te: 'లంక వైపు పారిశుద్ధ్య స్థానం', description_hi: 'लंका की ओर स्वच्छता बिंदु' },

  // Drinking Water
  { name: 'Drinking Water Kiosk — Ghat 1', name_te: 'త్రాగునీటి కేంద్రం — ఘాట్ 1', name_hi: 'पेयजल केंद्र — घाट 1', category: 'water', lat: 17.0008, lng: 81.7795, address: 'Pushkara Ghat 1 Entrance', status: 'verified', operational_status: 'operational', capacity: 10000, description: 'RO purified drinking water station', description_te: 'RO శుద్ధి చేయబడిన త్రాగునీటి కేంద్రం', description_hi: 'RO शुद्ध पेयजल केंद्र' },
  { name: 'Mobile Water Distribution — Sector 3', name_te: 'మొబైల్ జలవితరణ — సెక్టార్ 3', name_hi: 'मोबाइल जल वितरण — सेक्टर 3', category: 'water', lat: 16.9990, lng: 81.7780, address: 'Sector 3 Main Junction', status: 'reported', operational_status: 'unknown', capacity: 5000, description: 'Mobile water distribution point', description_te: 'మొబైల్ జలవితరణ కేంద్రం', description_hi: 'मोबाइल जल वितरण केंद्र' },
  { name: 'Drinking Water Point — Lanka', name_te: 'త్రాగునీటి కేంద్రం — లంక', name_hi: 'पेयजल केंद्र — लंका', category: 'water', lat: 16.9970, lng: 81.7740, address: 'Lanka Island', status: 'verified', operational_status: 'operational', capacity: 3000, description: 'Water point near Lanka ghat', description_te: 'లంక ఘాట్ సమీప నీటి కేంద్రం', description_hi: 'लंका घाट के पास पानी का केंद्र' },

  // Medical Camps
  { name: 'Primary Medical Camp — Ghat Zone', name_te: 'ప్రాథమిక వైద్య శిబిరం — ఘాట్ జోన్', name_hi: 'प्राथमिक चिकित्सा शिविर — घाट क्षेत्र', category: 'medical', lat: 17.0015, lng: 81.7788, address: 'Ghat Zone Medical Hub', status: 'verified', operational_status: 'operational', capacity: 50, description: 'Emergency and first-aid medical camp. 24×7 operation during Pushkaram.', description_te: 'అత్యవసర మరియు ప్రథమ చికిత్స వైద్య శిబిరం. పుష్కరం సమయంలో 24×7 నడుస్తుంది.', description_hi: 'आपातकालीन और प्राथमिक चिकित्सा शिविर। पुष्करम के दौरान 24×7 संचालन।' },
  { name: 'First-Aid Post — Lanka Ghat', name_te: 'ప్రథమ చికిత్స కేంద్రం — లంక ఘాట్', name_hi: 'प्राथमिक उपचार केंद्र — लंका घाट', category: 'medical', lat: 16.9982, lng: 81.7755, address: 'Lanka Ghat Area', status: 'reported', operational_status: 'unknown', capacity: 20, description: 'First-aid post near Lanka Ghat', description_te: 'లంక ఘాట్ సమీప ప్రథమ చికిత్స కేంద్రం', description_hi: 'लंका घाट के पास प्राथमिक उपचार केंद्र' },
  { name: 'Mobile Medical Unit — Sector 2', name_te: 'మొబైల్ వైద్య విభాగం — సెక్టార్ 2', name_hi: 'मोबाइल चिकित्सा इकाई — सेक्टर 2', category: 'medical', lat: 17.0003, lng: 81.7822, address: 'Sector 2, Near Bus Stop', status: 'verified', operational_status: 'operational', capacity: 30, description: 'Mobile medical unit serving Sector 2', description_te: 'సెక్టార్ 2 కి సేవలందించే మొబైల్ వైద్య విభాగం', description_hi: 'सेक्टर 2 की सेवा करने वाली मोबाइल चिकित्सा इकाई' },

  // Shelters
  { name: 'Pilgrim Rest Shelter — Zone A', name_te: 'యాత్రికుల విశ్రాంతి ఆశ్రయం — జోన్ A', name_hi: 'तीर्थयात्री विश्राम आश्रय — क्षेत्र A', category: 'shelter', lat: 17.0025, lng: 81.7805, address: 'Zone A, Near Parking', status: 'verified', operational_status: 'operational', capacity: 500, description: 'Temporary shelter with seating and shade for pilgrims', description_te: 'యాత్రికులకు కూర్చుండే మరియు నీడ సదుపాయంతో తాత్కాలిక ఆశ్రయం', description_hi: 'तीर्थयात्रियों के लिए बैठने और छाया के साथ अस्थायी आश्रय' },
  { name: 'Pilgrim Rest Area — Lanka Side', name_te: 'యాత్రికుల విశ్రాంతి ప్రదేశం — లంక వైపు', name_hi: 'तीर्थयात्री विश्राम क्षेत्र — लंका की ओर', category: 'shelter', lat: 16.9978, lng: 81.7748, address: 'Lanka Island Rest Area', status: 'reported', operational_status: 'unknown', capacity: 300, description: 'Rest area on Lanka island for pilgrims', description_te: 'లంక ద్వీపంలో యాత్రికులకు విశ్రాంతి ప్రదేశం', description_hi: 'लंका द्वीप पर तीर्थयात्रियों के लिए विश्राम क्षेत्र' },
  { name: 'Community Hall — Sector 1 Shelter', name_te: 'కమ్యూనిటీ హాల్ — సెక్టార్ 1 ఆశ్రయం', name_hi: 'सामुदायिक भवन — सेक्टर 1 आश्रय', category: 'shelter', lat: 16.9998, lng: 81.7765, address: 'Sector 1 Community Center', status: 'verified', operational_status: 'operational', capacity: 800, description: 'Large community hall serving as pilgrim shelter', description_te: 'యాత్రికుల ఆశ్రయంగా సేవలందించే పెద్ద కమ్యూనిటీ హాల్', description_hi: 'तीर्थयात्री आश्रय के रूप में सेवा करने वाला बड़ा सामुदायिक भवन' },
];

export function seedFacilities(db) {
  // Seed demo users
  const users = [
    { id: uuidv4(), username: 'admin', password: 'admin123', role: 'admin' },
    { id: uuidv4(), username: 'inspector1', password: 'inspect123', role: 'inspector' },
    { id: uuidv4(), username: 'field1', password: 'field123', role: 'field_staff' },
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.id, u.username, hash, u.role);
  }

  const insertFacility = db.prepare(`
    INSERT OR IGNORE INTO facilities
      (id, qr_token, name, name_te, name_hi, category, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, data_source, is_verified)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synthetic', ?)
  `);

  for (const f of FACILITIES) {
    const id = uuidv4();
    const qrToken = nanoid(12);
    insertFacility.run(
      id, qrToken, f.name, f.name_te, f.name_hi,
      f.category, f.lat, f.lng, f.address,
      f.status, f.operational_status, f.capacity,
      f.description, f.description_te, f.description_hi,
      f.status === 'verified' ? 1 : 0
    );
  }
}
