import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../../');
const docsDir = path.join(__dirname, '../../docs');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function createStyledDoc(title, subtitle, category) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  // Header band
  doc.rect(0, 0, 595.28, 80).fill('#1e3a5f');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
     .text('CIVICPROOF GIS — GODAVARI PUSHKARALU 2027', 50, 25);
  doc.fontSize(10).font('Helvetica')
     .text(`${category.toUpperCase()} | RAJAHMUNDRY MUNICIPAL REGION`, 50, 50);

  // Document Title
  doc.moveDown(3);
  doc.fillColor('#1e3a5f').fontSize(18).font('Helvetica-Bold').text(title, 50, 105);
  doc.fillColor('#64748b').fontSize(11).font('Helvetica').text(subtitle, 50, 130);
  doc.moveDown(1.5);

  return doc;
}

function addFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.rect(50, 785, 495.28, 0.5).fill('#cbd5e1');
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('CivicProof GIS — Official Hackathon Submission | Godavari Pushkaralu 2027', 50, 795, { align: 'left' });
    doc.text(`Page ${i + 1} of ${pages.count}`, 50, 795, { align: 'right' });
  }
}

// -------------------------------------------------------------
// 1. CONCEPT NOTE
// -------------------------------------------------------------
function generateConceptNote() {
  const filename = 'CivicProof_GIS_Concept_Note.pdf';
  const outPath1 = path.join(outputDir, filename);
  const outPath2 = path.join(docsDir, filename);

  const doc = createStyledDoc(
    'CivicProof GIS: Concept Note & Problem Resolution',
    'Integrated Civic Infrastructure Verification, Discovery & Real-Time Pilgrim Navigation',
    'Concept Note'
  );

  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. Executive Summary', 50, 160);
  doc.fontSize(9.5).font('Helvetica').text(
    `Godavari Pushkaralu 2027 is projected to draw over 50 million pilgrims to the twin riverbanks of Rajahmundry and Kovvur over a 12-day festival window. The sudden congregation of human mass creates unprecedented strain on civic resources: bathing ghats, public sanitation clusters, drinking water points, medical emergency posts, and transit shelters. Conventional event management suffers from a critical disconnect: physical facilities are established rapidly on the ground, yet pilgrims lack real-time knowledge of facility status, accessibility, and safe routes. Furthermore, municipal authorities struggle with manual inspection lag, leading to unnoticed sanitation defects, water shortages, and overcrowding.\n\n` +
    `CivicProof GIS bridges this physical-digital gap. By anchoring every municipal asset to an opaque, tamper-evident physical QR placard and an offline-first PWA with Apple Maps-grade turn-by-turn navigation, CivicProof ensures both transparent pilgrim wayfinding and automated municipal accountability.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('2. The Problem Landscape');
  doc.fontSize(9.5).font('Helvetica').text(
    `• Severe Wayfinding Confusion: Overcrowding frequently causes mobile data throttling (2G/3G speeds or zero coverage), making heavy consumer maps fail entirely.\n` +
    `• Lack of Real-Time Operational Truth: A digital marker on a map does not prove that a water RO kiosk has clean water or that a public toilet is functional.\n` +
    `• Linguistic Inequity: Over 80% of pilgrims speak Telugu or Hindi; standard GIS portals default to English, disenfranchising rural and elder visitors.\n` +
    `• Delayed Inspection Feedback: Paper-based or manual reporting causes hours of latency before sanitary inspectors or municipal engineers dispatch repair crews.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('3. The CivicProof GIS Solution');
  doc.fontSize(9.5).font('Helvetica').text(
    `CivicProof GIS delivers five integrated capabilities:\n` +
    `1. Physical QR Placards: Distributed across all ghats, kiosks, and camps. Scanning opens instant facility operational cards without downloading an app.\n` +
    `2. True Offline-First Architecture: Service Worker caching and IndexedDB store facility catalogs, route geometries, and cached tiles so wayfinding never freezes.\n` +
    `3. Turn-by-Turn Navigation with Start Simulation: OSRM route calculation, turn maneuvers, real-time voice guidance (Telugu/Hindi/English), and live simulated puck movement.\n` +
    `4. Field Inspector Attention Queue: Municipal inspectors capture defects, assign severity ratings, and save offline drafts with automated background synchronization.\n` +
    `5. Transparent Provenance & Safety Notices: Clear labeling of synthetic vs. verified data, eliminating false assurance of open facilities.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('4. Projected Social & Operational Impact');
  doc.fontSize(9.5).font('Helvetica').text(
    `• 60% Reduction in Pilgrimage Bottlenecks: Dynamic dispersion across secondary ghats (Pushkara Ghat 2, Lanka Ghat, Dhavaleswaram).\n` +
    `• Sub-15 Minute Defect Response: Critical sanitation and water defects immediately trigger red alerts on the Municipal Attention Queue.\n` +
    `• 100% Inclusive Access: Native Telugu script, high-contrast visual indicators, and vocalized navigation prompts guarantee universal usability.`
  );

  addFooter(doc);
  const stream1 = fs.createWriteStream(outPath1);
  const stream2 = fs.createWriteStream(outPath2);
  doc.pipe(stream1);
  doc.pipe(stream2);
  doc.end();
}

// -------------------------------------------------------------
// 2. TECHNICAL ARCHITECTURE
// -------------------------------------------------------------
function generateTechnicalArchitecture() {
  const filename = 'CivicProof_GIS_Technical_Architecture.pdf';
  const outPath1 = path.join(outputDir, filename);
  const outPath2 = path.join(docsDir, filename);

  const doc = createStyledDoc(
    'CivicProof GIS: Technical Architecture & Design Specification',
    'PWA Client, Resilient Node/SQLite Backend, OSRM Routing & Offline Sync',
    'Technical Architecture'
  );

  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. Architectural Overview', 50, 160);
  doc.fontSize(9.5).font('Helvetica').text(
    `CivicProof GIS is engineered as a resilient, full-stack hybrid Progressive Web Application (PWA). It decouples field client operations from continuous server connectivity by implementing a three-tiered state model: In-Memory Zustand Store -> IndexedDB Client Persistence -> Centralized Express/SQLite API.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('2. Component Architecture');
  doc.fontSize(9.5).font('Helvetica').text(
    `• Frontend Engine: React 18 with Vite 8 bundling, Tailwind CSS v4, and Leaflet GIS mapping. All components are responsive and optimized for mobile screens (portrait 360px to 430px).\n` +
    `• Routing Subsystem: Integrates with the Open Source Routing Machine (OSRM). Computes real road-network polyline geometries for walking, cycling, and driving modes.\n` +
    `• Apple Maps Navigation UX: Features a high-contrast dark HUD (#1c1c1e), prominent green #34c759 "Start" button, animated pulsing blue navigation puck, step-by-step turn guidance, and Web Speech Synthesis vocalization in Telugu, Hindi, and English.\n` +
    `• Backend Service: Node.js 24 environment utilizing the high-performance native DatabaseSync (node:sqlite) module in WAL mode. Eliminates external C++ compilation dependencies while delivering ACID transactional integrity.\n` +
    `• QR Security & Token Architecture: QR labels utilize cryptographically random nanoid tokens rather than sequential or internal database primary keys. Public endpoints expose only operational data, protecting administrative metadata.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('3. Data Flow & Offline Resiliency Pipeline');
  doc.fontSize(9.5).font('Helvetica').text(
    `1. Initial Handshake: Service Worker precaches all core assets (JS, CSS, fonts, SVG icons). Facilities and route queries are stored into IndexedDB via the 'idb' wrapper.\n` +
    `2. Disconnected Operation: When network connectivity drops, the app switches to IndexedDB fallback mode. Facilities show an amber 'Cached Data' banner with last-sync timestamp.\n` +
    `3. Offline Field Inspection Drafts: Inspectors can fill inspection forms and defect items in the field without internet. Drafts are assigned local UUIDs and saved to IndexedDB.\n` +
    `4. Event-Driven Auto Sync: The client listens for the browser 'online' event. As soon as cellular connection is restored, pending drafts are automatically posted in sequence to /api/inspections and marked as synced.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('4. Security & Role-Based Access Control (RBAC)');
  doc.fontSize(9.5).font('Helvetica').text(
    `• Roles: Administrator (full oversight, QR generation, facility verification), Inspector (inspections, defect logging, attention queue), Field Staff (inspection drafts).\n` +
    `• Authentication: JSON Web Tokens (JWT) signed with HMAC-SHA256, salted bcrypt password hashing (10 rounds), and HTTP Bearer authorization headers with auto-logout interceptors.`
  );

  addFooter(doc);
  const stream1 = fs.createWriteStream(outPath1);
  const stream2 = fs.createWriteStream(outPath2);
  doc.pipe(stream1);
  doc.pipe(stream2);
  doc.end();
}

// -------------------------------------------------------------
// 3. BUDGET & IMPLEMENTATION PLAN
// -------------------------------------------------------------
function generateBudgetPlan() {
  const filename = 'CivicProof_GIS_Budget_Implementation_Plan.pdf';
  const outPath1 = path.join(outputDir, filename);
  const outPath2 = path.join(docsDir, filename);

  const doc = createStyledDoc(
    'CivicProof GIS: Budget & Implementation Roadmap',
    'Phased Deployment Schedule, Resource Allocation & Risk Matrix',
    'Implementation & Budget'
  );

  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. Phased Implementation Roadmap', 50, 160);
  doc.fontSize(9.5).font('Helvetica').text(
    `• Phase 1: GIS Survey & Infrastructure Tagging (Month 1 - 3)\n` +
    `  - High-precision GPS mapping of 1,200+ bathing ghat zones, sanitation units, RO kiosks, and medical camps in Rajahmundry.\n` +
    `  - Database seeding and Telugu localization of all civic asset names and landmarks.\n\n` +
    `• Phase 2: QR Placard Fabrication & Pilot Deployment (Month 4 - 6)\n` +
    `  - Production of weatherproof aluminium composite QR labels with reflective UV coating for outdoor riverbank durability.\n` +
    `  - Municipal pilot deployment with 50 sanitary inspectors testing offline draft recording.\n\n` +
    `• Phase 3: Stress Testing, CDN Edge Caching & City Poster Blitz (Month 7 - 9)\n` +
    `  - Simulated 250,000 concurrent user load test on routing and QR resolution APIs.\n` +
    `  - Installation of 500+ A2-sized City Discovery Posters at railway stations, bus terminals, and highway entry tollgates.\n\n` +
    `• Phase 4: Pushkaram Live Command Center Operations (Event Month)\n` +
    `  - 24/7 technical monitoring team co-located with RMC Central Police Control Room.\n` +
    `  - Real-time dispatching based on the Attention Queue defect dashboard.`
  );

  doc.moveDown(0.8);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('2. Comprehensive Budget Estimate');
  doc.fontSize(9.5).font('Helvetica').text(
    `Below is the itemized budget for turnkey municipal execution across Rajahmundry Municipal Corporation (RMC):`
  );
  doc.moveDown(0.3);

  const budgetItems = [
    ['Component', 'Description', 'Est. Cost (INR)', 'Est. Cost (USD)'],
    ['Physical QR Signage', '2,500 Heavy-duty anodized aluminium QR placards & 500 Posters', '₹8,50,000', '$10,200'],
    ['Cloud & Edge CDN', 'High-availability Kubernetes cluster, Cloudflare CDN, Tile Cache', '₹9,80,000', '$11,800'],
    ['Inspector Hardware', '120 Rugged IP68 Android tablets for sanitary and medical inspectors', '₹18,00,000', '$21,600'],
    ['Field Survey & Training', 'Ground GIS survey team, inspector training workshops, manuals', '₹5,20,000', '$6,250'],
    ['Command Center & Contingency', '24/7 Operations monitoring room, emergency tech reserve', '₹7,00,000', '$8,400'],
    ['Total Project Investment', 'Full 12-Month Lifecycle including Event Execution', '₹48,50,000', '$58,250']
  ];

  let y = doc.y;
  budgetItems.forEach((row, i) => {
    const isHeader = i === 0;
    const isTotal = i === budgetItems.length - 1;
    doc.rect(50, y, 495, 18).fill(isHeader ? '#1e3a5f' : isTotal ? '#e2e8f0' : i % 2 === 0 ? '#f8fafc' : '#ffffff');
    doc.fillColor(isHeader ? '#ffffff' : isTotal ? '#0f172a' : '#334155')
       .fontSize(isHeader || isTotal ? 8.5 : 8)
       .font(isHeader || isTotal ? 'Helvetica-Bold' : 'Helvetica');

    doc.text(row[0], 55, y + 5, { width: 110 });
    doc.text(row[1], 170, y + 5, { width: 190 });
    doc.text(row[2], 370, y + 5, { width: 65, align: 'right' });
    doc.text(row[3], 445, y + 5, { width: 95, align: 'right' });
    y += 19;
  });

  doc.y = y + 10;
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('3. Risk Management & Mitigation');
  doc.fontSize(9.5).font('Helvetica').text(
    `• Network Blackouts: Full PWA caching ensures all wayfinding and cached facilities remain accessible without mobile signal.\n` +
    `• QR Placard Damage: High-durability aluminium plates with manual code fallbacks printed prominently beside each code.\n` +
    `• High Traffic Spikes: Stateless CDN caching of public GIS tiles and static route geometries prevents server load choke.`
  );

  addFooter(doc);
  const stream1 = fs.createWriteStream(outPath1);
  const stream2 = fs.createWriteStream(outPath2);
  doc.pipe(stream1);
  doc.pipe(stream2);
  doc.end();
}

console.log('Generating Hackathon PDF documents...');
generateConceptNote();
generateTechnicalArchitecture();
generateBudgetPlan();
console.log('All 3 PDF documents generated successfully in hackathon-submission/ and docs/');
