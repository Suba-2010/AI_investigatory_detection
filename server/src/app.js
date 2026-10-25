import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { config } from './config.js';
import { store } from './model.js';
import { generateCase } from './gemini.js';
import { calculateScore, difficultyRules } from './validation.js';
import { sendCaseInvite } from './emailService.js';

export const app = express();
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '30kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use((req, res, next) => {
  const sid = req.get('x-session-id');
  if (!sid || sid.length > 100) return res.status(401).json({ error: { code: 'SESSION_REQUIRED', message: 'Start or resume a player session.' } });
  req.sessionId = sid; next();
});
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const createLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: (_req,res) => fail(res,429,'RATE_LIMITED','Too many case generation requests. Please try again later.') });
const hintLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, handler: (_req,res) => fail(res,429,'RATE_LIMITED','Too many hint requests. Please try again later.') });
const owned = async (req, res, ownerOnly = false) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) { fail(res, 404, 'CASE_NOT_FOUND', 'Case not found.'); return null; }
  const doc = await store.get(req.params.id);
  if (!doc) { fail(res, 404, 'CASE_NOT_FOUND', 'Case not found.'); return null; }
  const isOwner = doc.sessionId === req.sessionId;
  const isParticipant = (doc.participants || []).includes(req.sessionId);
  if (!isOwner && !isParticipant) { fail(res, 403, 'FORBIDDEN', 'This case belongs to another session.'); return null; }
  if (ownerOnly && !isOwner) { fail(res, 403, 'OWNER_REQUIRED', 'Only the case creator can invite teammates.'); return null; }
  return doc;
};
const safeCase = (c, sessionId) => ({ id: String(c._id), title: c.title, premise: c.premise, story: c.story, difficulty: c.difficulty, suspects: c.suspects, clues: c.clues.map(({ explanation, content, ...x }) => ({ ...x, ...(c.discoveredClueIds.includes(x.id) ? { content } : {}), discovered: c.discoveredClueIds.includes(x.id) })), timeline: c.timeline, discoveredClueIds: c.discoveredClueIds, hintsUsed: c.hintUses.length, usedHints: c.hintUses.map((_, index) => c.hints[index]), hintsRemaining: difficultyRules[c.difficulty].hints - c.hintUses.length, status: c.status, isOwner: c.sessionId === sessionId, teamSize: 1 + (c.participants || []).length, pinnedClueIds: c.pinnedClueIds || [], teamNotes: c.teamNotes || '' });

app.post('/api/cases', createLimit, async (req, res) => {
  const { premise, difficulty } = req.body || {};
  if (typeof premise !== 'string' || !premise.trim() || premise.trim().length > 500) return fail(res, 400, 'INVALID_INPUT', 'Enter a premise between 1 and 500 characters.');
  if (!Object.hasOwn(difficultyRules, difficulty)) return fail(res, 400, 'INVALID_INPUT', 'Choose Easy, Medium, or Hard.');
  try {
    const generated = await generateCase(premise.trim(), difficulty);
    const id = randomUUID().replaceAll('-', '').slice(0,24);
    const doc = { _id: id, sessionId: req.sessionId, participants: [], invites: [], pinnedClueIds: [], teamNotes: '', premise: premise.trim(), ...generated, difficulty, discoveredClueIds: [], hintUses: [], accusation: null, score: 0, status: 'active' };
    await store.save(doc); res.status(201).json({ case: safeCase(doc, req.sessionId) });
  } catch (e) { fail(res, e.status || 502, e.code || 'GENERATION_FAILED', e.status ? e.message : 'Mystery generation failed. Please try again.'); }
});
app.get('/api/cases/:id', async (req, res) => { const c = await owned(req,res); if (c) res.json({ case: safeCase(c, req.sessionId) }); });
app.patch('/api/cases/:id/board', async (req,res) => {
  const c = await owned(req,res); if (!c) return;
  if (c.status !== 'active') return fail(res,409,'CASE_COMPLETE','The theory board is locked because this case is complete.');
  const { notes, pinnedClueIds } = req.body || {};
  if (typeof notes !== 'string' || notes.length > 1000 || !Array.isArray(pinnedClueIds) || pinnedClueIds.length > c.clues.length || new Set(pinnedClueIds).size !== pinnedClueIds.length || pinnedClueIds.some(id => !c.discoveredClueIds.includes(id))) return fail(res,400,'INVALID_BOARD','Notes must be at most 1,000 characters and only discovered clues can be pinned.');
  c.teamNotes = notes; c.pinnedClueIds = pinnedClueIds; await store.update(c);
  res.json({ board: { notes: c.teamNotes, pinnedClueIds: c.pinnedClueIds } });
});

const inviteLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, handler: (_req,res) => fail(res,429,'INVITE_RATE_LIMITED','Too many invitations. Try again later.') });
const tokenHash = token => createHash('sha256').update(token).digest('hex');
app.post('/api/cases/:id/invites', inviteLimit, async (req,res) => {
  const c = await owned(req,res,true); if (!c) return;
  if (c.status !== 'active') return fail(res,409,'CASE_COMPLETE','Completed cases cannot accept new teammates.');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(res,400,'INVALID_EMAIL','Enter a valid email address.');
  const previousInvite = c.invites.find(i => i.email === email && !i.acceptedAt && new Date(i.expiresAt) > new Date());
  if (previousInvite) { previousInvite.expiresAt = new Date().toISOString(); if (typeof c.markModified === 'function') c.markModified('invites'); }
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const invitation = { email, tokenHash: tokenHash(token), expiresAt, createdAt: new Date().toISOString(), acceptedAt: null, acceptedBySessionId: null };
  c.invites.push(invitation);
  const inviteUrl = `${config.clientUrl.replace(/\/$/,'')}/join/${token}`;
  try {
    await store.update(c);
  } catch (e) {
    c.invites = c.invites.filter(i => i.tokenHash !== invitation.tokenHash);
    try { await store.update(c); } catch { /* retain the original safe error */ }
    return fail(res,500,'INVITE_CREATE_FAILED','The invitation could not be created. Please try again.');
  }
  const smtpReady = config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom;
  let emailSent = false;
  if (smtpReady) {
    try { await sendCaseInvite({ email, caseTitle: c.title, url: inviteUrl }); emailSent = true; }
    catch (e) { console.error('[Invite email] delivery failed', { name: e?.name || 'Error', code: String(e?.code || '') }); }
  }
  res.status(201).json({ invite: { email, expiresAt, inviteUrl, emailSent } });
});
app.get('/api/invites/:token', async (req,res) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) return fail(res,404,'INVITE_NOT_FOUND','This invitation link is invalid.');
  const found = await store.findInvite(tokenHash(req.params.token));
  if (!found) return fail(res,404,'INVITE_NOT_FOUND','This invitation link is invalid.');
  const { doc, invite } = found;
  if (new Date(invite.expiresAt) < new Date()) return fail(res,410,'INVITE_EXPIRED','This invitation has expired. Ask the case creator for a new one.');
  if (invite.acceptedAt) return fail(res,409,'INVITE_ALREADY_USED','This invitation has already been used.');
  if (doc.status !== 'active') return fail(res,409,'CASE_COMPLETE','This investigation is already closed.');
  res.json({ invite: { caseId: String(doc._id), caseTitle: doc.title, difficulty: doc.difficulty, email: invite.email, expiresAt: invite.expiresAt } });
});
app.post('/api/invites/:token/accept', async (req,res) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token)) return fail(res,404,'INVITE_NOT_FOUND','This invitation link is invalid.');
  const found = await store.findInvite(tokenHash(req.params.token));
  if (!found) return fail(res,404,'INVITE_NOT_FOUND','This invitation link is invalid.');
  const { doc, invite } = found;
  if (new Date(invite.expiresAt) < new Date()) return fail(res,410,'INVITE_EXPIRED','This invitation has expired. Ask the case creator for a new one.');
  if (invite.acceptedAt) {
    if (invite.acceptedBySessionId === req.sessionId) return res.json({ case: safeCase(doc,req.sessionId) });
    return fail(res,409,'INVITE_ALREADY_USED','This invitation has already been used.');
  }
  if (doc.status !== 'active') return fail(res,409,'CASE_COMPLETE','This investigation is already closed.');
  if (doc.sessionId !== req.sessionId && !(doc.participants || []).includes(req.sessionId)) doc.participants.push(req.sessionId);
  invite.acceptedAt = new Date().toISOString(); invite.acceptedBySessionId = req.sessionId;
  if (typeof doc.markModified === 'function') doc.markModified('invites');
  await store.update(doc);
  res.json({ case: safeCase(doc,req.sessionId) });
});
app.post('/api/cases/:id/clues/:clueId/discover', async (req,res) => {
  const c = await owned(req,res); if (!c) return;
  if (c.status !== 'active') return fail(res,409,'CASE_COMPLETE','This case is already complete.');
  const clue = c.clues.find(x => x.id === req.params.clueId); if (!clue) return fail(res,404,'CLUE_NOT_FOUND','Clue not found.');
  if (!c.discoveredClueIds.includes(clue.id)) { c.discoveredClueIds.push(clue.id); await store.update(c); }
  const { explanation: _privateExplanation, ...publicClue } = clue;
  res.json({ clue: { ...publicClue, discovered: true }, progress: c.discoveredClueIds.length, discoveredClueIds: c.discoveredClueIds });
});
app.post('/api/cases/:id/hints', hintLimit, async(req,res) => {
  const c = await owned(req,res); if (!c) return;
  if (c.status !== 'active') return fail(res,409,'CASE_COMPLETE','This case is already complete.');
  if (c.hintUses.length >= difficultyRules[c.difficulty].hints) return fail(res,429,'HINT_LIMIT_REACHED','No hints remain.');
  const hint = c.hints[c.hintUses.length]; c.hintUses.push(`hint-${c.hintUses.length+1}`); await store.update(c);
  res.json({ hint, hintsUsed: c.hintUses.length, hintsRemaining: difficultyRules[c.difficulty].hints-c.hintUses.length });
});
app.post('/api/cases/:id/accuse', async(req,res) => {
  const c = await owned(req,res); if (!c) return;
  if (c.status !== 'active') return fail(res,409,'ACCUSATION_ALREADY_SUBMITTED','An accusation has already been submitted.');
  const { suspectId } = req.body || {}; if (!c.suspects.some(s => s.id === suspectId)) return fail(res,400,'INVALID_INPUT','Select a valid suspect.');
  const correct = suspectId === c.culpritSuspectId; c.score = calculateScore(c.difficulty, correct, c.discoveredClueIds.length, c.hintUses.length);
  c.accusation = { suspectId, correct, submittedAt: new Date().toISOString() }; c.status = 'complete'; await store.update(c);
  res.json({ result: { correct, selectedSuspectId: suspectId, culprit: c.suspects.find(s=>s.id===c.culpritSuspectId), explanation: c.solutionExplanation, decisiveClues: c.clues.filter(x=>c.decisiveClueIds.includes(x.id)).map(({ explanation,...x })=>x), score: c.score, breakdown: { base: correct ? difficultyRules[c.difficulty].base : 0, discoveredClues: c.discoveredClueIds.length, cluePoints: c.discoveredClueIds.length*5, hintsUsed: c.hintUses.length, hintPenalty: c.hintUses.length*10 } } });
});
app.get('/api/cases/:id/result', async(req,res) => {
  const c = await owned(req,res); if (!c) return;
  if (c.status !== 'complete') return fail(res,409,'CASE_ACTIVE','Results are available after an accusation.');
  const suspect = c.suspects.find(s=>s.id===c.culpritSuspectId);
  res.json({ result: { correct:c.accusation.correct, selectedSuspectId:c.accusation.suspectId, culprit:suspect, explanation:c.solutionExplanation, decisiveClues:c.clues.filter(x=>c.decisiveClueIds.includes(x.id)), score:c.score, breakdown:{base:c.accusation.correct?difficultyRules[c.difficulty].base:0,discoveredClues:c.discoveredClueIds.length,cluePoints:c.discoveredClueIds.length*5,hintsUsed:c.hintUses.length,hintPenalty:c.hintUses.length*10} } });
});
app.use((err,_req,res,_next) => { console.error(err); fail(res,500,'INTERNAL_ERROR','Something went wrong. Please try again.'); });
