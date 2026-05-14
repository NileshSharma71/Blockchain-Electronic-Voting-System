const { seedDemoData } = require('../services/seedService');

async function seedData() {
  try {
    const result = await seedDemoData();
    console.log(`[Seed] Demo data ready: ${result.users} users, ${result.elections} elections.`);
  } catch (err) {
    console.error('[Seed] Failed:', err);
  }
}

module.exports = seedData;
