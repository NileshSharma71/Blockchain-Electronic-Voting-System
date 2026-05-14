const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Election = require('../models/Election');
const { sha256 } = require('../utils/hash');

const DEMO_PASSWORD = 'demo123';

const DEMO_USERS = [
  { username: 'admin', email: 'admin@evoting.local', role: 'admin', isVerified: true },
  { username: 'rahul_kumar', email: 'rahul@demo.local', role: 'voter', isVerified: true },
  { username: 'priya_sharma', email: 'priya@demo.local', role: 'voter', isVerified: true },
  { username: 'amit_singh', email: 'amit@demo.local', role: 'voter', isVerified: true },
  { username: 'neha_gupta', email: 'neha@demo.local', role: 'voter', isVerified: true },
];

const DEMO_ELECTIONS = [
  {
    title: 'Student Council President 2026',
    description: 'Vote for the next Student Council President. The elected president will serve for the academic year 2026-27.',
    candidates: [
      { name: 'Aarav Patel', description: 'Focus on campus infrastructure and sports facilities', party: 'Progress Party' },
      { name: 'Diya Reddy', description: 'Mental health awareness and academic reform', party: 'Student Alliance' },
      { name: 'Karan Mehta', description: 'Tech-driven campus with free WiFi and smart classrooms', party: 'Tech Forward' },
    ],
    // Active now (started 1 hour ago, ends in 23 hours)
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 23 * 60 * 60 * 1000),
  },
  {
    title: 'Best Department Award',
    description: 'Vote for the department that has contributed the most to campus life this year.',
    candidates: [
      { name: 'Computer Science', description: 'Organized hackathons and coding bootcamps', party: '' },
      { name: 'Mechanical Engineering', description: 'Built the solar-powered EV prototype', party: '' },
      { name: 'Business Administration', description: 'Launched the campus startup incubator', party: '' },
      { name: 'Design', description: 'Redesigned the campus magazine and event posters', party: '' },
    ],
    // Starts in 2 hours
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
  },
  {
    title: 'Campus Cafeteria Menu Change',
    description: 'Should the campus cafeteria switch to a healthier menu with more vegetarian options?',
    candidates: [
      { name: 'Yes - Switch to Healthier Menu', description: 'More salads, smoothies, and balanced meals', party: '' },
      { name: 'No - Keep Current Menu', description: 'The current menu is fine as it is', party: '' },
    ],
    // Already ended (for demo — shows completed election)
    startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

async function seedDemoData() {
  // Check if already seeded
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[Seed] Data already exists, skipping seed.');
    return { users: userCount, elections: await Election.countDocuments() };
  }

  console.log('[Seed] Seeding demo data...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Create demo users
  const createdUsers = [];
  for (const userData of DEMO_USERS) {
    const user = await User.create({
      ...userData,
      passwordHash,
    });
    createdUsers.push(user);
  }

  // Create demo elections
  const admin = createdUsers.find(u => u.role === 'admin');
  for (const electionData of DEMO_ELECTIONS) {
    const contentRaw = `${electionData.title}${electionData.description}`;
    const contentHash = sha256(contentRaw);

    await Election.create({
      ...electionData,
      createdBy: admin._id,
      contentHash,
      status: electionData.endTime < new Date() ? 'completed' :
              electionData.startTime <= new Date() ? 'active' : 'upcoming',
    });
  }

  console.log(`[Seed] Created ${createdUsers.length} users and ${DEMO_ELECTIONS.length} elections.`);
  return { users: createdUsers.length, elections: DEMO_ELECTIONS.length };
}

module.exports = { seedDemoData };
