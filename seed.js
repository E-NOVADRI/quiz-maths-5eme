const bcrypt = require('bcryptjs');
const { User } = require('./models');

function generateReferralCode(name) {
  const base = name.replace(/\s+/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return base + rand;
}

async function seed() {
  if (await User.countDocuments() > 0) return;

  const hash = await bcrypt.hash('password', 10);

  const prof = await User.create({
    username: 'prof',
    password: hash,
    role: 'admin',
    name: 'Professeur Admin',
    class: '',
    plan: 'premium',
    premiumUntil: new Date('2099-12-31'),
    referralCode: generateReferralCode('ProfAdmin'),
  });

  const eleve = await User.create({
    username: 'eleve1',
    password: hash,
    role: 'student',
    name: 'Élève Un',
    class: '5ème 1',
    plan: 'free',
    premiumUntil: null,
    referralCode: generateReferralCode('EleveUn'),
  });

  console.log('✅ Comptes créés :');
  console.log(`   👨‍🏫 admin  → username: prof      | password: password | code: ${prof.referralCode}`);
  console.log(`   👨‍🎓 élève  → username: eleve1    | password: password | code: ${eleve.referralCode}`);
}

module.exports = { seed, generateReferralCode };
