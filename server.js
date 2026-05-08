require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path       = require('path');

const { User, Score, Subscription, Referral } = require('./models');
const { seed, generateReferralCode } = require('./seed');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'changez_moi_en_production_xyz';
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ───────────────────────────────────────────────
function pub(u) {
  return {
    id: u._id, username: u.username, role: u.role,
    name: u.name, class: u.class,
    plan: u.plan, premiumUntil: u.premiumUntil,
    referralCode: u.referralCode, referralDays: u.referralDays,
  };
}

function isPremiumActive(user) {
  return user.plan === 'premium' && user.premiumUntil && user.premiumUntil > new Date();
}

// ── Auth middleware ───────────────────────────────────────
function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Non authentifié' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
    next();
  });
}

// ── Routes AUTH ───────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    res.json({ token, user: pub(user) });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(pub(user));
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Route REGISTER ────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, class: cls, referralCode } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: 'Nom, identifiant et mot de passe sont obligatoires' });
    if (await User.findOne({ username: username.trim() }))
      return res.status(409).json({ error: 'Identifiant déjà utilisé' });

    const hashed = await bcrypt.hash(password, 10);
    const myCode = generateReferralCode(name);

    let plan = 'free', premiumUntil = null, referredBy = null, referralBonus = false;

    if (referralCode) {
      const parrain = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (parrain) {
        plan = 'premium';
        premiumUntil = new Date(Date.now() + 7 * 86400000);
        referredBy = referralCode.toUpperCase();
        referralBonus = true;

        const parrainExpiry = isPremiumActive(parrain)
          ? new Date(parrain.premiumUntil.getTime() + 7 * 86400000)
          : new Date(Date.now() + 7 * 86400000);
        await User.findByIdAndUpdate(parrain._id, {
          plan: 'premium', premiumUntil: parrainExpiry,
          $inc: { referralDays: 7 },
        });
      }
    }

    const user = await User.create({
      username: username.trim(), password: hashed,
      role: 'student', name: name.trim(),
      class: cls || '', plan, premiumUntil,
      referralCode: myCode, referredBy,
    });

    if (referredBy) {
      const parrain = await User.findOne({ referralCode: referredBy });
      if (parrain) {
        await Referral.create({ referrerId: parrain._id, referredId: user._id, code: referredBy, daysOffered: 7 });
      }
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: 'student', name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    res.status(201).json({ token, user: pub(user), referralBonus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// ── Routes USERS (admin) ──────────────────────────────────
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 }).select('-password');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, class: cls, role } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    if (await User.findOne({ username: username.trim() }))
      return res.status(409).json({ error: 'Identifiant déjà utilisé' });
    const hashed = await bcrypt.hash(password, 10);
    const code = generateReferralCode(name);
    const user = await User.create({
      username: username.trim(), password: hashed,
      role: role || 'student', name: name.trim(),
      class: cls || '', referralCode: code,
    });
    res.status(201).json(pub(user));
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { name, class: cls, password } = req.body;
    const update = {};
    if (name) update.name = name.trim();
    if (cls !== undefined) update.class = cls;
    if (password) update.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(pub(user));
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Score.deleteMany({ userId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Routes SCORES ─────────────────────────────────────────
app.post('/api/scores', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { lessonId } = req.body;
    if (!isPremiumActive(user) && lessonId > 3)
      return res.status(403).json({ error: 'Leçon réservée aux abonnés Premium' });
    const score = await Score.create({
      userId: req.user.id,
      userName: user.name,
      lessonId: req.body.lessonId,
      lessonTitle: req.body.lessonTitle,
      correct: req.body.correct,
      total: req.body.total,
      percent: req.body.percent,
      wrongParts: req.body.wrongParts || [],
      answers: req.body.answers || [],
    });
    res.status(201).json(score);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/scores/me', requireAuth, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(scores);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/scores/dashboard/me', requireAuth, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.user.id });
    const byLesson = {};
    for (const s of scores) {
      if (!byLesson[s.lessonId]) byLesson[s.lessonId] = { bestScore: 0, attempts: 0, lessonTitle: s.lessonTitle };
      byLesson[s.lessonId].attempts++;
      if (s.percent > byLesson[s.lessonId].bestScore) byLesson[s.lessonId].bestScore = s.percent;
    }
    res.json(byLesson);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/scores/all', requireAdmin, async (req, res) => {
  try {
    const scores = await Score.find().sort({ createdAt: -1 }).limit(200);
    res.json(scores);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/scores/dashboard/all', requireAdmin, async (req, res) => {
  try {
    const scores = await Score.find();
    const byUser = {};
    for (const s of scores) {
      const uid = s.userId.toString();
      if (!byUser[uid]) byUser[uid] = { userName: s.userName, attempts: 0, totalPct: 0, bestScore: 0 };
      byUser[uid].attempts++;
      byUser[uid].totalPct += s.percent;
      if (s.percent > byUser[uid].bestScore) byUser[uid].bestScore = s.percent;
    }
    for (const uid in byUser) {
      byUser[uid].avgScore = byUser[uid].attempts
        ? Math.round(byUser[uid].totalPct / byUser[uid].attempts) : 0;
    }
    res.json(byUser);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/scores/user/:userId', requireAdmin, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(scores);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Routes SUBSCRIPTION ───────────────────────────────────
app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const active = isPremiumActive(user);
    if (!active && user.plan === 'premium') {
      await User.findByIdAndUpdate(req.user.id, { plan: 'free', premiumUntil: null });
    }
    const daysLeft = active ? Math.ceil((user.premiumUntil - Date.now()) / 86400000) : 0;
    res.json({ plan: active ? 'premium' : 'free', premiumUntil: user.premiumUntil, daysLeft, isActive: active });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/subscription/payment/wave', requireAuth, async (req, res) => {
  const { plan } = req.body;
  const amount = plan === 'annuel'
    ? parseInt(process.env.PREMIUM_PRICE_ANNUAL || 4200)
    : parseInt(process.env.PREMIUM_PRICE_MONTHLY || 500);
  res.json({ number: process.env.WAVE_NUMBER || '+2250700000000', amount, plan });
});

app.post('/api/subscription/payment/orange', requireAuth, async (req, res) => {
  const { plan } = req.body;
  const amount = plan === 'annuel'
    ? parseInt(process.env.PREMIUM_PRICE_ANNUAL || 4200)
    : parseInt(process.env.PREMIUM_PRICE_MONTHLY || 500);
  res.json({ number: process.env.ORANGE_NUMBER || '+2250800000000', amount, plan });
});

app.post('/api/subscription/payment/confirm', requireAuth, async (req, res) => {
  try {
    const { transactionRef, plan, paymentMethod } = req.body;
    if (!transactionRef || !plan) return res.status(400).json({ error: 'Données manquantes' });
    const days = plan === 'annuel' ? 365 : 30;
    const amount = plan === 'annuel'
      ? parseInt(process.env.PREMIUM_PRICE_ANNUAL || 4200)
      : parseInt(process.env.PREMIUM_PRICE_MONTHLY || 500);
    const expiresAt = new Date(Date.now() + days * 86400000);
    await User.findByIdAndUpdate(req.user.id, { plan: 'premium', premiumUntil: expiresAt });
    await Subscription.create({
      userId: req.user.id, plan, amount,
      paymentMethod: paymentMethod || 'wave',
      transactionRef, activatedAt: new Date(),
      expiresAt, activatedBy: 'system',
    });
    res.json({ ok: true, premiumUntil: expiresAt, daysLeft: days });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la confirmation' });
  }
});

app.post('/api/subscription/activate/:userId', requireAdmin, async (req, res) => {
  try {
    const { days } = req.body;
    const d = parseInt(days) || 30;
    const expiresAt = new Date(Date.now() + d * 86400000);
    await User.findByIdAndUpdate(req.params.userId, { plan: 'premium', premiumUntil: expiresAt });
    await Subscription.create({
      userId: req.params.userId, plan: 'manuel', amount: 0,
      paymentMethod: 'manuel', transactionRef: 'ADMIN',
      activatedAt: new Date(), expiresAt, activatedBy: req.user.id,
    });
    res.json({ ok: true, premiumUntil: expiresAt });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/subscription/all-stats', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const subs  = await Subscription.find().sort({ createdAt: -1 }).limit(20);
    const totalPremium = users.filter(u => isPremiumActive(u)).length;
    const totalFree    = users.length - totalPremium;
    res.json({
      totalPremium, totalFree,
      users: users.map(u => ({
        id: u._id, name: u.name, username: u.username,
        plan: u.plan, premiumUntil: u.premiumUntil,
        daysLeft: isPremiumActive(u) ? Math.ceil((u.premiumUntil - Date.now()) / 86400000) : 0,
      })),
      recentActivations: subs,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Routes REFERRAL ───────────────────────────────────────
app.get('/api/referral/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const filleuls = await Referral.find({ referrerId: req.user.id })
      .populate('referredId', 'name createdAt').sort({ createdAt: -1 });
    res.json({
      code: user.referralCode,
      referralDays: user.referralDays,
      referralCount: filleuls.length,
      filleuls: filleuls.map(f => ({
        name: f.referredId?.name || 'Inconnu',
        date: f.createdAt,
        daysOffered: f.daysOffered,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/referral/check/:code', async (req, res) => {
  try {
    const user = await User.findOne({ referralCode: req.params.code.toUpperCase() });
    if (!user) return res.status(404).json({ error: 'Code invalide' });
    res.json({ valid: true, name: user.name });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/referral/all', requireAdmin, async (req, res) => {
  try {
    const all = await Referral.find()
      .populate('referrerId', 'name username referralCode')
      .populate('referredId', 'name username')
      .sort({ createdAt: -1 });

    const byReferrer = {};
    for (const r of all) {
      const rid = r.referrerId?._id?.toString();
      if (!rid) continue;
      if (!byReferrer[rid]) {
        byReferrer[rid] = { name: r.referrerId.name, code: r.referrerId.referralCode, count: 0, days: 0 };
      }
      byReferrer[rid].count++;
      byReferrer[rid].days += r.daysOffered;
    }

    const topReferrers = Object.values(byReferrer).sort((a, b) => b.count - a.count).slice(0, 10);
    const totalDaysOffered = all.reduce((s, r) => s + r.daysOffered, 0);

    res.json({
      totalReferrals: all.length,
      totalDaysOffered,
      topReferrers,
      recent: all.slice(0, 20).map(r => ({
        date: r.createdAt,
        parrain: r.referrerId?.name,
        filleul: r.referredId?.name,
        days: r.daysOffered,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Config publique ───────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    APP_URL:               process.env.APP_URL || '',
    WAVE_NUMBER:           process.env.WAVE_NUMBER || '+2250700000000',
    ORANGE_NUMBER:         process.env.ORANGE_NUMBER || '+2250800000000',
    PREMIUM_PRICE_MONTHLY: parseInt(process.env.PREMIUM_PRICE_MONTHLY || 500),
    PREMIUM_PRICE_ANNUAL:  parseInt(process.env.PREMIUM_PRICE_ANNUAL  || 4200),
  });
});

// ── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-maths-5eme')
  .then(async () => {
    console.log('✅ MongoDB connecté');
    await seed();
    app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB :', err.message);
    process.exit(1);
  });
