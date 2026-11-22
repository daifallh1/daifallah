import type { LoadedBank } from "./bank";
import type { Question } from "./schema";
import { createRng, randInt, shuffle, type Rng } from "./rng";

export interface BlueprintReport {
  fullyCompliant: boolean;
  categoryTargets: Record<number, number>;
  categoryActual: Record<number, number>;
  bloomTargets: { 1: number; 2: number };
  bloomActual: { 1: number; 2: number };
  problems: string[];
}

export interface GeneratedExam {
  questionIds: string[];
  seed: number;
  blueprint: BlueprintReport;
}

interface Group {
  id: string;
  category: number;
  bloom: 1 | 2;
  members: Question[];
}

/** Collapse exam-eligible questions into exclusion groups (duplicates / near-duplicates). */
function eligibleGroups(lb: LoadedBank): Group[] {
  const map = new Map<string, Question[]>();
  for (const q of lb.examEligible) {
    const id = q.audit.exclusionGroupId;
    map.set(id, [...(map.get(id) ?? []), q]);
  }
  const groups: Group[] = [];
  for (const [id, members] of map) {
    const first = members[0];
    if (!first || first.audit.syllabusCategory == null || first.audit.bloomLevel == null) continue;
    // A group is placed in a single (category, bloom) cell; members disagreeing would be an audit error.
    const consistent = members.filter(
      (m) => m.audit.syllabusCategory === first.audit.syllabusCategory && m.audit.bloomLevel === first.audit.bloomLevel,
    );
    groups.push({ id, category: first.audit.syllabusCategory, bloom: first.audit.bloomLevel, members: consistent });
  }
  return groups.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Build one 40-question attempt.
 *  - Only approved, classified, fully translated questions are eligible.
 *  - At most one question per exclusion group, so duplicate stems never appear twice.
 *  - Category quotas [12,4,4,16,2,1,1] and the 16/24 Bloom split are enforced when the bank allows;
 *    otherwise the exam is built best-effort and `blueprint.fullyCompliant` is false with reasons.
 *  - Question order is shuffled; option order and answer keys are untouched.
 */
export function generateExam(lb: LoadedBank, opts: { seed: number; excludeGroups?: Set<string> }): GeneratedExam {
  const rng = createRng(opts.seed);
  const spec = lb.bank.examSpec;
  const targets: Record<number, number> = Object.fromEntries(lb.bank.categories.map((c) => [c.id, c.questions]));
  const bl1Target = spec.bloomCounts["1"];
  const total = spec.questions;
  const groups = eligibleGroups(lb).filter((g) => !opts.excludeGroups?.has(g.id));
  const cells = new Map<string, Group[]>();
  for (const g of groups) {
    const k = `${g.category}:${g.bloom}`;
    cells.set(k, [...(cells.get(k) ?? []), g]);
  }
  const avail = (c: number, b: 1 | 2) => cells.get(`${c}:${b}`)?.length ?? 0;
  const cats = Object.keys(targets).map(Number).sort((a, b) => a - b);
  const problems: string[] = [];

  // Decide how many BL1 items each category contributes (x_c), keeping the BL1 total reachable.
  const lo = (c: number) => Math.max(0, (targets[c] ?? 0) - avail(c, 2));
  const hi = (c: number) => Math.min(targets[c] ?? 0, avail(c, 1));
  let feasible = cats.every((c) => lo(c) <= hi(c));
  if (!feasible) {
    for (const c of cats) if (lo(c) > hi(c)) problems.push(`Category ${c}: needs ${targets[c]} unique items, only ${avail(c, 1) + avail(c, 2)} eligible groups.`);
  }
  const sumLo = cats.reduce((s, c) => s + lo(c), 0);
  const sumHi = cats.reduce((s, c) => s + hi(c), 0);
  if (feasible && !(sumLo <= bl1Target && bl1Target <= sumHi)) {
    feasible = false;
    problems.push(`Bloom split 16/24 not achievable: BL1 count can only range ${sumLo}-${sumHi}.`);
  }

  const picks: Question[] = [];
  const pickFrom = (list: Group[], n: number, r: Rng) => shuffle(list, r).slice(0, n);
  const chooseMember = (g: Group, r: Rng): Question => g.members[Math.floor(r() * g.members.length)] as Question;

  if (feasible) {
    let remaining = bl1Target;
    const order = shuffle(cats, rng);
    const alloc = new Map<number, number>();
    order.forEach((c, i) => {
      const rest = order.slice(i + 1);
      const restLo = rest.reduce((s, x) => s + lo(x), 0);
      const restHi = rest.reduce((s, x) => s + hi(x), 0);
      const minHere = Math.max(lo(c), remaining - restHi);
      const maxHere = Math.min(hi(c), remaining - restLo);
      const x = randInt(minHere, maxHere, rng);
      alloc.set(c, x);
      remaining -= x;
    });
    for (const c of cats) {
      const x1 = alloc.get(c) ?? 0;
      const x2 = (targets[c] ?? 0) - x1;
      for (const g of pickFrom(cells.get(`${c}:1`) ?? [], x1, rng)) picks.push(chooseMember(g, rng));
      for (const g of pickFrom(cells.get(`${c}:2`) ?? [], x2, rng)) picks.push(chooseMember(g, rng));
    }
  } else {
    // Best effort: honour category quotas as far as possible, then fill from any remaining groups.
    const used = new Set<string>();
    for (const c of cats) {
      const pool = groups.filter((g) => g.category === c);
      for (const g of pickFrom(pool, targets[c] ?? 0, rng)) {
        used.add(g.id);
        picks.push(chooseMember(g, rng));
      }
    }
    const rest = groups.filter((g) => !used.has(g.id));
    for (const g of pickFrom(rest, Math.max(0, total - picks.length), rng)) picks.push(chooseMember(g, rng));
    if (picks.length < total) problems.push(`Only ${picks.length} unique eligible questions available; exam is shorter than ${total}.`);
  }

  const categoryActual: Record<number, number> = Object.fromEntries(cats.map((c) => [c, 0]));
  const bloomActual = { 1: 0, 2: 0 } as { 1: number; 2: number };
  for (const q of picks) {
    categoryActual[q.audit.syllabusCategory as number] = (categoryActual[q.audit.syllabusCategory as number] ?? 0) + 1;
    bloomActual[q.audit.bloomLevel as 1 | 2] += 1;
  }
  const fullyCompliant =
    feasible &&
    picks.length === total &&
    cats.every((c) => categoryActual[c] === targets[c]) &&
    bloomActual[1] === bl1Target &&
    bloomActual[2] === total - bl1Target;

  return {
    questionIds: shuffle(picks, rng).map((q) => q.questionId),
    seed: opts.seed,
    blueprint: {
      fullyCompliant,
      categoryTargets: targets,
      categoryActual,
      bloomTargets: { 1: bl1Target, 2: total - bl1Target },
      bloomActual,
      problems,
    },
  };
}
