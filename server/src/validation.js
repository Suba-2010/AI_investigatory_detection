import { z } from 'zod';

export const difficultyRules = {
  easy: { suspects: 3, clues: 5, hints: 2, base: 100 },
  medium: { suspects: 4, clues: 7, hints: 3, base: 150 },
  hard: { suspects: 5, clues: 9, hints: 3, base: 200 }
};
const suspect = z.object({ id: z.string().min(1), name: z.string().min(1), description: z.string().min(1), motive: z.string().min(1), alibi: z.string().min(1) });
const clue = z.object({ id: z.string().min(1), type: z.enum(['messages','image','camera','document','physical']), title: z.string().min(1), content: z.string().min(1), explanation: z.string().min(1) });
export const generatedSchema = z.object({ title: z.string().min(1), story: z.string().min(30), suspects: z.array(suspect), clues: z.array(clue), hints: z.array(z.string().min(1)), timeline: z.array(z.string().min(1)), culpritSuspectId: z.string().min(1), solutionExplanation: z.string().min(20), decisiveClueIds: z.array(z.string()) });

export function validateGenerated(data, difficulty) {
  const parsed = generatedSchema.safeParse(data);
  if (!parsed.success) throw new Error('Generated case did not match the required format.');
  const c = parsed.data, required = difficultyRules[difficulty];
  if (!required || c.suspects.length !== required.suspects || c.clues.length !== required.clues || c.hints.length !== required.hints) throw new Error('Generated case has incorrect content counts.');
  const suspectIds = new Set(c.suspects.map(x => x.id)), clueIds = new Set(c.clues.map(x => x.id));
  if (suspectIds.size !== c.suspects.length || clueIds.size !== c.clues.length || !suspectIds.has(c.culpritSuspectId) || c.decisiveClueIds.length < 2 || c.decisiveClueIds.some(id => !clueIds.has(id))) throw new Error('Generated case contains inconsistent IDs or solution evidence.');
  return c;
}

export function calculateScore(difficulty, correct, discoveredCount, hintsUsedCount) {
  const base = correct ? difficultyRules[difficulty].base : 0;
  return Math.max(0, base + discoveredCount * 5 - hintsUsedCount * 10);
}
