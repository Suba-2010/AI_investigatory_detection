import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  participants: { type: [String], default: [] },
  invites: { type: [mongoose.Schema.Types.Mixed], default: [] },
  pinnedClueIds: { type: [String], default: [] },
  teamNotes: { type: String, default: '' },
  title: String, premise: String, story: String, difficulty: String,
  suspects: [mongoose.Schema.Types.Mixed], clues: [mongoose.Schema.Types.Mixed],
  hints: [String], timeline: [String], culpritSuspectId: String,
  solutionExplanation: String, decisiveClueIds: [String], discoveredClueIds: [String],
  hintUses: [String], accusation: mongoose.Schema.Types.Mixed, score: Number, status: String
}, { timestamps: true });
CaseSchema.index({ 'invites.tokenHash': 1 });
export const CaseModel = mongoose.models.Case || mongoose.model('Case', CaseSchema);

const memory = new Map();
export const store = {
  async get(id) { return mongoose.connection.readyState === 1 ? CaseModel.findById(id) : memory.get(id) || null; },
  async save(doc) {
    if (mongoose.connection.readyState === 1) {
      const record = new CaseModel(doc); await record.save(); return record;
    }
    memory.set(String(doc._id), doc); return doc;
  },
  async update(doc) {
    if (mongoose.connection.readyState === 1) {
      if (typeof doc.save === 'function') await doc.save();
      else await CaseModel.findByIdAndUpdate(doc._id, doc);
      return doc;
    }
    memory.set(String(doc._id), doc); return doc;
  },
  async findInvite(tokenHash) {
    const doc = mongoose.connection.readyState === 1
      ? await CaseModel.findOne({ 'invites.tokenHash': tokenHash })
      : [...memory.values()].find(item => (item.invites || []).some(invite => invite.tokenHash === tokenHash)) || null;
    if (!doc) return null;
    return { doc, invite: (doc.invites || []).find(item => item.tokenHash === tokenHash) };
  }
};
