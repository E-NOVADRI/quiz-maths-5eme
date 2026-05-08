const mongoose = require('mongoose');

// ── User ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['admin', 'student'], default: 'student' },
  name:         { type: String, default: '', trim: true },
  class:        { type: String, default: '' },
  plan:         { type: String, enum: ['free', 'premium'], default: 'free' },
  premiumUntil: { type: Date, default: null },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy:   { type: String, default: null },
  referralDays: { type: Number, default: 0 },
}, { timestamps: true });

// ── Score ─────────────────────────────────────────────────
const scoreSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:    { type: String, default: '' },
  lessonId:    { type: Number, required: true },
  lessonTitle: { type: String, default: '' },
  correct:     { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
  percent:     { type: Number, default: 0 },
  wrongParts:  { type: Array, default: [] },
  answers:     { type: Array, default: [] },
}, { timestamps: true });
scoreSchema.index({ userId: 1 });
scoreSchema.index({ userId: 1, lessonId: 1 });

// ── Subscription ──────────────────────────────────────────
const subscriptionSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:         { type: String, enum: ['mensuel', 'annuel', 'manuel'], default: 'mensuel' },
  amount:       { type: Number, default: 0 },
  paymentMethod:{ type: String, enum: ['wave', 'orange', 'manuel'], default: 'manuel' },
  transactionRef:{ type: String, default: '' },
  activatedAt:  { type: Date, default: Date.now },
  expiresAt:    { type: Date, required: true },
  activatedBy:  { type: String, default: 'system' },
}, { timestamps: true });

// ── Referral ──────────────────────────────────────────────
const referralSchema = new mongoose.Schema({
  referrerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code:        { type: String, required: true },
  daysOffered: { type: Number, default: 7 },
}, { timestamps: true });
referralSchema.index({ referrerId: 1 });

module.exports = {
  User:         mongoose.model('User', userSchema),
  Score:        mongoose.model('Score', scoreSchema),
  Subscription: mongoose.model('Subscription', subscriptionSchema),
  Referral:     mongoose.model('Referral', referralSchema),
};
