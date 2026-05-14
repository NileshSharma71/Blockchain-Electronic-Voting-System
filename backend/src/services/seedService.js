const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Election = require('../models/Election');
const Ballot = require('../models/Ballot');
const ElectionResult = require('../models/ElectionResult');
const { sha256 } = require('../utils/hash');
const { v4: uuidv4 } = require('uuid');

const DEMO_PASSWORD = 'demo123';

const DEMO_USERS = [
  { username: 'admin',         email: 'admin@evoting.local',  role: 'admin',  isVerified: true, verificationStatus: 'verified' },
  { username: 'rahul_kumar',   email: 'rahul@demo.local',     role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'priya_sharma',  email: 'priya@demo.local',     role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'amit_singh',    email: 'amit@demo.local',      role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'neha_gupta',    email: 'neha@demo.local',      role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'arjun_verma',   email: 'arjun@demo.local',     role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'sneha_joshi',   email: 'sneha@demo.local',     role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'vikram_meena',  email: 'vikram@demo.local',    role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'ananya_das',    email: 'ananya@demo.local',    role: 'voter',  isVerified: true, verificationStatus: 'verified' },
  { username: 'rohit_patel',   email: 'rohit@demo.local',     role: 'voter',  isVerified: false, verificationStatus: 'pending' }, // pending approval demo
];

const now = new Date();

const DEMO_ELECTIONS = [
  // 1. Active — hotly contested, plenty of time left
  {
    title: 'Student Council President 2026',
    description: 'Vote for the next Student Council President. The elected president will serve for the academic year 2026-27 and represent all students in administrative meetings.',
    candidates: [
      { name: 'Aarav Patel',  description: 'Focus on campus infrastructure and sports facilities', party: 'Progress Party' },
      { name: 'Diya Reddy',   description: 'Mental health awareness and academic reform',           party: 'Student Alliance' },
      { name: 'Karan Mehta',  description: 'Tech-driven campus with free WiFi and smart classrooms', party: 'Tech Forward' },
    ],
    startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() + 22 * 60 * 60 * 1000),
    status: 'active',
    // 6 of 9 voters have already voted — 3 left for demo
    seedVotes:   ['rahul@demo.local', 'priya@demo.local', 'amit@demo.local', 'arjun@demo.local', 'sneha@demo.local', 'vikram@demo.local'],
    seedChoices: [0, 1, 0, 2, 1, 0], // Aarav:3, Diya:2, Karan:1
  },

  // 2. Active — quick referendum, ends soon
  {
    title: 'Campus Cafeteria Menu Change',
    description: 'Should the campus cafeteria switch to a healthier menu with more vegetarian and vegan options? A yes vote means new menu from next semester.',
    candidates: [
      { name: 'Yes — Switch to Healthier Menu', description: 'More salads, smoothies, and balanced meals', party: '' },
      { name: 'No — Keep Current Menu',          description: 'The current menu works fine for most students', party: '' },
    ],
    startTime: new Date(now.getTime() - 18 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() + 5 * 60 * 60 * 1000),
    status: 'active',
    seedVotes:   ['ananya@demo.local'],
    seedChoices: [0],
  },

  // 3. Upcoming — starts tomorrow
  {
    title: 'Best Department Award 2026',
    description: 'Vote for the academic department that has contributed the most to campus innovation, student welfare, and academic excellence this year.',
    candidates: [
      { name: 'Computer Science',      description: 'Organized hackathons, coding bootcamps, and placement drives', party: '' },
      { name: 'Mechanical Engineering', description: 'Built a solar-powered EV prototype for the national competition',  party: '' },
      { name: 'Business Administration', description: 'Launched the campus startup incubator with 5 funded startups',  party: '' },
      { name: 'Design',                 description: 'Redesigned campus magazine and won 3 national design awards',     party: '' },
    ],
    startTime: new Date(now.getTime() + 20 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() + 44 * 60 * 60 * 1000),
    status: 'upcoming',
    seedVotes: [],
    seedChoices: [],
  },

  // 4. Upcoming — starts in 3 days
  {
    title: 'Annual Tech Fest Venue Selection',
    description: 'Select the venue for TechFest 2026. Each venue has different capacity and facilities. Final decision will be based on this vote.',
    candidates: [
      { name: 'Main Auditorium',     description: 'Capacity 2000, fully air-conditioned, central location',       party: '' },
      { name: 'Open Air Amphitheatre', description: 'Capacity 5000, natural setting, outdoor experience',         party: '' },
      { name: 'Sports Complex',      description: 'Capacity 3500, flexible space, good parking',                   party: '' },
    ],
    startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    status: 'upcoming',
    seedVotes: [],
    seedChoices: [],
  },

  // 5. Completed — ended yesterday, clear winner
  {
    title: 'Library Extended Hours',
    description: 'Should the central library extend its closing time from 10 PM to midnight on weekdays during exam season?',
    candidates: [
      { name: 'Yes — Extend to Midnight', description: 'Students need more study time during exams', party: '' },
      { name: 'No — Keep 10 PM Closing',  description: 'Staff welfare and security concerns',        party: '' },
    ],
    startTime: new Date(now.getTime() - 50 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() - 26 * 60 * 60 * 1000),
    status: 'completed',
    seedVotes: ['rahul@demo.local', 'priya@demo.local', 'amit@demo.local', 'arjun@demo.local', 'sneha@demo.local', 'vikram@demo.local'],
    seedChoices: [0, 0, 0, 1, 0, 0], // 5-1 clear win for extending hours
  },

  // 6. Completed — ended 2 days ago, close race
  {
    title: 'Annual Sports Captain 2026',
    description: 'Vote to elect the Annual Sports Captain who will lead all inter-college sports events for the year 2026.',
    candidates: [
      { name: 'Rohan Iyer',   description: 'Cricket team captain, 3 years experience, national-level player', party: '' },
      { name: 'Simran Kaur',  description: 'Athletics champion, led team to state gold medal last year',      party: '' },
      { name: 'Dev Sharma',   description: 'Football team captain, motivational leader',                      party: '' },
      { name: 'Anjali Nair',  description: 'Badminton state champion, excellent team coordinator',             party: '' },
    ],
    startTime: new Date(now.getTime() - 74 * 60 * 60 * 1000),
    endTime:   new Date(now.getTime() - 50 * 60 * 60 * 1000),
    status: 'completed',
    seedVotes: ['rahul@demo.local', 'priya@demo.local', 'amit@demo.local', 'arjun@demo.local', 'sneha@demo.local', 'vikram@demo.local', 'ananya@demo.local'],
    seedChoices: [1, 0, 1, 2, 1, 3, 0], // close race: Simran 3, Rohan 2, Dev 1, Anjali 1
  },
];

async function seedDemoData() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[Seed] Data already exists, skipping seed.');
    return { users: userCount, elections: await Election.countDocuments() };
  }

  console.log('[Seed] Seeding demo data...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Create users
  const createdUsers = [];
  for (const userData of DEMO_USERS) {
    const user = await User.create({ ...userData, passwordHash });
    createdUsers.push(user);
  }
  const userByEmail = Object.fromEntries(createdUsers.map(u => [u.email, u]));
  const admin = createdUsers.find(u => u.role === 'admin');

  // Create elections and seed votes
  for (const electionData of DEMO_ELECTIONS) {
    const { seedVotes, seedChoices, status, ...electionFields } = electionData;
    const contentHash = sha256(`${electionFields.title}${electionFields.description}`);

    const election = await Election.create({
      ...electionFields,
      createdBy: admin._id,
      contentHash,
      status,
      totalVotes: seedVotes.length,
    });

    // Seed ballots for this election
    if (seedVotes.length > 0) {
      const ballotDocs = [];
      const votedInUpdates = [];

      for (let i = 0; i < seedVotes.length; i++) {
        const voter = userByEmail[seedVotes[i]];
        if (!voter) continue;

        const candidate = election.candidates[seedChoices[i]];
        if (!candidate) continue;

        const nonce = uuidv4();
        const ballotHash = sha256(`${voter._id}${election._id}${candidate._id}${nonce}`);

        ballotDocs.push({
          electionId: election._id,
          voterId: voter._id,
          candidateId: candidate._id,
          ballotHash,
          nonce,
          voterIpHash: sha256('seed'),
          createdAt: new Date(electionData.startTime.getTime() + i * 20 * 60 * 1000),
        });

        votedInUpdates.push(
          User.findByIdAndUpdate(voter._id, {
            $addToSet: { votedIn: election._id },
            $set: { lastVotedAt: new Date(electionData.startTime.getTime() + i * 20 * 60 * 1000) },
          })
        );
      }

      if (ballotDocs.length > 0) {
        await Ballot.insertMany(ballotDocs);
        await Promise.all(votedInUpdates);
      }

      // For completed elections, also seed the result
      if (status === 'completed') {
        const voteCounts = {};
        for (const c of election.candidates) voteCounts[c._id.toString()] = { candidateId: c._id, candidateName: c.name, voteCount: 0 };
        for (const b of ballotDocs) {
          const k = b.candidateId.toString();
          if (voteCounts[k]) voteCounts[k].voteCount++;
        }
        const results = Object.values(voteCounts).sort((a, b) => b.voteCount - a.voteCount);
        const winner = results[0].voteCount > (results[1]?.voteCount ?? -1) ? results[0] : null;
        const proofString = `${election._id}:${results.map(r => `${r.candidateId}:${r.voteCount}`).join('|')}:total:${ballotDocs.length}`;
        const resultProofHash = sha256(proofString);

        await ElectionResult.create({
          electionId: election._id,
          results,
          totalVotes: ballotDocs.length,
          winnerId: winner?.candidateId || null,
          winnerName: winner?.candidateName || null,
          resultProofHash,
        });

        await Election.findByIdAndUpdate(election._id, { resultProofHash, finalizedAt: electionData.endTime });
      }
    }
  }

  console.log(`[Seed] Created ${createdUsers.length} users and ${DEMO_ELECTIONS.length} elections.`);
  return { users: createdUsers.length, elections: DEMO_ELECTIONS.length };
}

module.exports = { seedDemoData };
