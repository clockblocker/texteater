/**
 * P2: click-independent pre-analysis at intake time.
 * One jev call per SENTENCE asks, for every resolvable occurrence i:
 *   first_i : which occurrence is the leftmost fixed member of the unit containing <si> (or Self)
 *   route_i : Family/Kind of the unit containing <si>
 * Units are recovered in code as equivalence classes over the leftmost member.
 * Any later click needs zero classification round trips.
 */
import { choice } from "promptsmith/typesafe";
import { targetCriteria } from "../src/concrete-lang/de/target-classification/judgments.js";
import { evaluationCaseIds } from "../src/concrete-lang/de/target-classification/evaluation-ids.js";
import data from "../src/concrete-lang/de/target-classification/source-data.json";
import { indexedContext } from "../src/universal/validation.js";
import { ask, save, stable, summarize, type Call, type CaseResult } from "./harness.js";

const routes = {
	"Lexeme/ADJ": "Adjective, including adjectival participles and adverbial adjective uses",
	"Lexeme/ADP": "Adposition (preposition, postposition or fixed circumposition)",
	"Lexeme/ADV": "Adverb, including a whole adverbial correlator",
	"Lexeme/AUX": "Meaning-bearing modal with an overt infinitive, or copula; includes its own scoped grammatical auxiliaries",
	"Lexeme/CCONJ": "Coordinating conjunction, including a complete fixed correlator",
	"Lexeme/DET": "Determiner modifying a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN": "Common noun, including substantivized participles",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART": "Particle",
	"Lexeme/PRON": "Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	"Lexeme/PROPN": "Proper noun",
	"Lexeme/SCONJ": "Subordinating conjunction, including fixed multi-member conjunctions",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB": "Whole lexical verb with its own scoped auxiliaries and fixed members",
	"Phraseme/Aphorism": "Established concise attributed maxim",
	"Phraseme/DiscourseFormula": "Established fixed discourse formula",
	"Phraseme/Idiom": "Established noncompositional expression in this contextual meaning",
	"Phraseme/Proverb": "Established traditional saying",
	"Construction/Fusion": "One fused preposition/article source word",
	Unresolved: "The unit is invalid, incomplete, includes free material, or has no defensible allowed route",
};

const scope = process.argv[2] === "all" ? Object.keys(data.cases) : evaluationCaseIds.filter((id) => !data.demonstrationIds.includes(id));
const cases = scope.map((id) => ({ id, ...(data.cases as Record<string, any>)[id] }));

// Group cases by sentence text: intake analyses each sentence once.
const bySentence = new Map<string, typeof cases>();
for (const c of cases) {
	const key = c.input.segments.map((s: { text: string }) => s.text).join("");
	bySentence.set(key, [...(bySentence.get(key) ?? []), c]);
}
console.error(`${cases.length} cases over ${bySentence.size} sentences`);

type Analysis = { first: Record<number, number | "Unresolved">; route: Record<number, string>; calls: Call[] };
async function analyse(segments: { kind: string; text: string }[], id: string): Promise<Analysis> {
	const calls: Call[] = [];
	const sentence = { id, language: "de" as const, segments: segments as never };
	const resolvable = segments.flatMap((s, i) => (s.kind === "ResolvableText" ? [i] : []));
	const state = {
		sentence: indexedContext(sentence),
		criteria: "In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. Every occurrence belongs to exactly one complete fixed unit; most units have one member. " + targetCriteria,
	};
	const questions: Record<string, ReturnType<typeof choice>> = {};
	for (const i of resolvable) {
		const earlier = resolvable.filter((j) => j < i);
		questions[`first_${i}`] = choice(
			`Under \`criteria\`, which occurrence in \`sentence\` is the leftmost fixed member of the complete fixed unit that contains occurrence <s${i}>? Choose Self when <s${i}> is itself the leftmost member (including when it is the only member).`,
			{
				Self: `<s${i}> is the leftmost member of its own unit`,
				...Object.fromEntries(earlier.map((j) => [`s${j}`, `<s${j}> "${segments[j]!.text}" is the leftmost fixed member of the same unit as <s${i}>`])),
				Unresolved: "Membership cannot be defensibly decided",
			},
		);
		questions[`route_${i}`] = choice(
			`Under \`criteria\`, what is the Family/Kind of the complete fixed unit that contains occurrence <s${i}> in \`sentence\`? Classify the whole unit, not the standalone part of speech of this word alone.`,
			routes,
		);
	}
	const result = await ask(calls, "p2/intake", state, questions);
	const first: Analysis["first"] = {}, route: Analysis["route"] = {};
	for (const i of resolvable) {
		const f = (result.answers[`first_${i}`] as { choice: string }).choice;
		first[i] = f === "Self" ? i : f === "Unresolved" ? "Unresolved" : Number(f.slice(1));
		route[i] = (result.answers[`route_${i}`] as { choice: string }).choice;
	}
	return { first, route, calls };
}

function root(first: Analysis["first"], i: number): number | "Unresolved" {
	const seen = new Set<number>();
	let cur: number | "Unresolved" = i;
	while (cur !== "Unresolved" && first[cur] !== cur) {
		if (seen.has(cur)) return "Unresolved";
		seen.add(cur);
		cur = first[cur]!;
	}
	return cur;
}

const results: CaseResult[] = [];
const sentences = [...bySentence.entries()];
let next = 0;
async function worker() {
	while (next < sentences.length) {
		const [, group] = sentences[next++]!;
		const sample = group[0]!;
		let analysis: Analysis;
		try {
			analysis = await analyse(sample.input.segments, sample.id);
		} catch (error) {
			for (const c of group) results.push({ id: c.id, pass: false, expected: c.idealOutput, actual: null, calls: [], error: String(error) });
			continue;
		}
		for (const [n, c] of group.entries()) {
			const k = c.input.clickedSegmentIndex;
			const r = root(analysis.first, k);
			let actual: unknown;
			if (r === "Unresolved" || analysis.route[k] === "Unresolved") actual = { decision: "Unresolved" };
			else {
				const members = Object.keys(analysis.first).map(Number).filter((i) => root(analysis.first, i) === r).sort((a, b) => a - b);
				const [family, kind] = analysis.route[k]!.split("/");
				actual = { family, kind, memberSegmentIndices: members };
			}
			// Attribute the sentence's single call to the first case only, so per-case call counts reflect amortization.
			results.push({ id: c.id, pass: stable(actual) === stable(c.idealOutput), expected: c.idealOutput, actual, calls: n === 0 ? analysis.calls : [] });
		}
		if (results.length % 20 < group.length) console.error(`  ${results.length}/${cases.length}`);
	}
}
await Promise.all(Array.from({ length: 6 }, worker));
const summary = summarize(`P2 intake precompute (first-member links) [${process.argv[2] ?? "eval"}]`, results);
const routeOnly = results.filter((r) => r.actual && (r.expected as any).kind && (r.actual as any).kind === (r.expected as any).kind).length;
const membersOnly = results.filter((r) => r.actual && stable((r.actual as any).memberSegmentIndices) === stable((r.expected as any).memberSegmentIndices)).length;
console.log(JSON.stringify({ sentences: bySentence.size, routeCorrect: routeOnly, membersCorrect: membersOnly, clickTimeCalls: 0 }));
await save(`/tmp/p2-${process.argv[2] ?? "eval"}.json`, { summary, results });
