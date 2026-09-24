/**
 * Phraseme membership lab: how a word joins a Phraseme Target.
 *
 * Production (`assemble.ts`) used to union every pair of Heads whose
 * `same_a_b` Noul is at or above tau (single link) and only then average the
 * members' fixedness against the floor, so a free word two fixed words vouch
 * for was carried in (`ganz und gar normal`); it now gates each word on its
 * own fixedness first (`gate@1.5`). This lab asks production's exact
 * questions once per sentence, keeps the answers, and re-assembles the
 * Phraseme layer under each membership policy over the same answers, so the
 * comparison is paired and jev's run-to-run noise cancels:
 *
 * - `single`: the connected components at tau, production before the gate.
 * - `complete`: greedy complete linkage, strongest pair first; two clusters
 *   merge only when every cross pair is at or above tau.
 * - `gate@g`: single link over the Heads whose own `fix_i` is at or above g;
 *   `gate@1.5` is production.
 *
 * Clicks are probed through `resolvedUnitAt`, what tf-demo reads at click
 * time, against the target-classification click gold.
 *
 *   zsh -ic 'bun prototypes/intake/phraseme-linkage.ts'
 *   bun prototypes/intake/phraseme-linkage.ts --from /tmp/phraseme-linkage-answers.json
 */
import { readFile } from "node:fs/promises";
import type { Questions } from "promptsmith/typesafe";
import {
	type PhrasemeTarget,
	resolvedUnitAt,
	type SentenceAnalysis,
} from "../../src/concrete-lang/de/sentence-analysis/analysis.js";
import {
	type Answers,
	assembleAnalysis,
	productionPolicy,
} from "../../src/concrete-lang/de/sentence-analysis/assemble.js";
import { governmentQuestions } from "../../src/concrete-lang/de/sentence-analysis/government.js";
import {
	type Placement,
	placeSegments,
} from "../../src/concrete-lang/de/sentence-analysis/placement.js";
import {
	analysisState,
	chunk,
	lexemeQuestions,
	phrasemeQuestions,
} from "../../src/concrete-lang/de/sentence-analysis/questions.js";
import type { SegmentedSentence } from "../../src/types.js";
import { ask, type Call, save } from "../harness.js";
import { type ClickCase, loadSentences, type Sentence } from "./corpus.js";

const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
	const index = argv.indexOf(`--${name}`);
	return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
};
const replay = flag("from", "");
const concurrency = Number(flag("concurrency", "6"));
const tricky = Number(flag("tricky", "100"));
const tau = productionPolicy.phrasemeTau;
const floor = productionPolicy.fixednessFloor;

// ------------------------------------------------------------------ corpus

/** The request that exposed the bug (tf-demo 55484a34), with authored gold. */
function ganzUndGar(): Sentence {
	const text =
		"Mr und Mrs Dursley im Ligusterweg Nummer 4 waren stolz darauf, ganz und gar normal zu sein, sehr stolz sogar.";
	const segments = [...text.matchAll(/\p{L}+|\d+|\s+|[^\p{L}\d\s]/gu)].map(
		([piece]) => ({
			kind: /^\s+$/u.test(piece)
				? "Whitespace"
				: /^[\p{L}\d]+$/u.test(piece)
					? "ResolvableText"
					: "Punctuation",
			text: piece,
		}),
	);
	const idiom = {
		family: "Phraseme",
		kind: "Idiom",
		memberSegmentIndices: [23, 25, 27],
	};
	const click = (
		index: number,
		idealOutput: Record<string, unknown>,
	): ClickCase => ({
		id: `adhoc-ganz-und-gar-click-${segments[index]?.text}`,
		clickedSegmentIndex: index,
		idealOutput,
	});
	return {
		key: text,
		id: "adhoc-ganz-und-gar",
		segments,
		resolvable: segments.flatMap((s, i) =>
			s.kind === "ResolvableText" ? [i] : [],
		),
		cases: [
			click(23, idiom),
			click(25, idiom),
			click(27, idiom),
			click(29, {
				family: "Lexeme",
				kind: "ADJ",
				memberSegmentIndices: [29],
			}),
		],
	};
}

const sentences = [...loadSentences("all"), ganzUndGar()];
const segmented = (sentence: Sentence): SegmentedSentence<"de"> =>
	({
		id: sentence.id,
		language: "de",
		segments: sentence.segments,
	}) as SegmentedSentence<"de">;

// ----------------------------------------------------------------- answers

type Stored = Record<string, Answers>;

async function collect(): Promise<Stored> {
	const stored: Stored = {};
	const calls: Call[] = [];
	const queue = [...sentences];
	let done = 0;
	const worker = async () => {
		for (;;) {
			const sentence = queue.shift();
			if (!sentence) return;
			const german = segmented(sentence);
			const placement = placeSegments(german);
			const government = governmentQuestions(german, placement);
			const questions: Questions = {
				...lexemeQuestions(german, placement.resolvable),
				...phrasemeQuestions(german, placement.resolvable),
				...government,
			};
			const state = analysisState(
				german,
				Object.keys(government).length > 0,
			);
			const answers: Record<string, unknown> = {};
			for (let attempt = 0; attempt < 3; attempt++)
				try {
					const results = await Promise.all(
						chunk(questions).map((part) =>
							ask(calls, "de/sentence", state, part),
						),
					);
					for (const result of results)
						Object.assign(answers, result.answers);
					break;
				} catch (error) {
					if (attempt === 2)
						console.error(`failed ${sentence.id}`, error);
				}
			stored[sentence.key] = answers as Answers;
			done += 1;
			if (done % 25 === 0)
				console.error(`${done}/${sentences.length} sentences`);
		}
	};
	await Promise.all(Array.from({ length: concurrency }, worker));
	const inputTokens = calls.reduce((sum, call) => sum + call.input_tokens, 0);
	console.error(`${calls.length} calls, ${inputTokens} input tokens`);
	return stored;
}

// --------------------------------------------------------------- policies

type Policy = {
	readonly name: string;
	readonly components: (heads: number[], answers: Answers) => number[][];
};

const noul = (answers: Answers, a: number, b: number) => {
	const answer = answers[`same_${Math.min(a, b)}_${Math.max(a, b)}`];
	return answer?.type === "noul" ? answer.noul : 0;
};
const fix = (answers: Answers, index: number) => {
	const answer = answers[`fix_${index}`];
	return answer?.type === "score" ? answer.score : 0;
};

function singleLink(heads: number[], answers: Answers): number[][] {
	const parent = new Map(heads.map((head) => [head, head]));
	const find = (index: number): number => {
		let current = index;
		while (parent.get(current) !== current)
			current = parent.get(current) ?? current;
		return current;
	};
	for (const [position, a] of heads.entries())
		for (const b of heads.slice(position + 1))
			if (noul(answers, a, b) >= tau) parent.set(find(a), find(b));
	const byRoot = new Map<number, number[]>();
	for (const head of heads)
		byRoot.set(find(head), [...(byRoot.get(find(head)) ?? []), head]);
	return [...byRoot.values()];
}

function completeLink(heads: number[], answers: Answers): number[][] {
	const cluster = new Map(heads.map((head) => [head, [head]]));
	const pairs = heads
		.flatMap((a, position) =>
			heads.slice(position + 1).map((b) => ({
				a,
				b,
				value: noul(answers, a, b),
			})),
		)
		.filter((pair) => pair.value >= tau)
		.sort((x, y) => y.value - x.value);
	for (const { a, b } of pairs) {
		const left = cluster.get(a);
		const right = cluster.get(b);
		if (!left || !right || left === right) continue;
		if (!left.every((x) => right.every((y) => noul(answers, x, y) >= tau)))
			continue;
		const merged = [...left, ...right];
		for (const member of merged) cluster.set(member, merged);
	}
	return [...new Set(cluster.values())];
}

const gated =
	(threshold: number) =>
	(heads: number[], answers: Answers): number[][] => {
		const kept = heads.filter((head) => fix(answers, head) >= threshold);
		return [
			...singleLink(kept, answers),
			...heads
				.filter((head) => !kept.includes(head))
				.map((head) => [head]),
		];
	};

const policies: Policy[] = [
	{ name: "single (before the gate)", components: singleLink },
	{ name: "complete", components: completeLink },
	{ name: "gate@1.0", components: gated(1.0) },
	{ name: "gate@1.25", components: gated(1.25) },
	{ name: "gate@1.5 (production)", components: gated(1.5) },
];

// -------------------------------------------------------------- assembly

/** The segment index a Lexeme Target's Head member sits in. */
function headIndexOf(placement: Placement) {
	const indexAt = new Map<number, number>();
	for (const [index, pieces] of placement.pieces)
		for (const piece of pieces) indexAt.set(piece.offset, index);
	return (target: SentenceAnalysis["targets"][number]) => {
		// Production gives an article left over from a fusion no Head index.
		if (target.provenance === "fusion-table:unattached-article")
			return undefined;
		const head =
			target.members.find((member) => member.role === "Head") ??
			target.members[0];
		return head ? indexAt.get(head.offset) : undefined;
	};
}

/** Production's Phraseme layer over `components`, verbatim but for grouping. */
function phrasemeLayer(
	analysis: Omit<SentenceAnalysis, "sentenceId" | "language">,
	placement: Placement,
	answers: Answers,
	policy: Policy,
): PhrasemeTarget[] {
	const headOf = headIndexOf(placement);
	const heads = [
		...new Set(
			analysis.targets.map(headOf).filter((head) => head !== undefined),
		),
	];
	const phrasemes: PhrasemeTarget[] = [];
	for (const component of policy.components(heads, answers)) {
		if (component.length < 2) continue;
		const kindMass: Record<string, number> = {};
		let fixedness = 0;
		for (const head of component) {
			const kind = answers[`pk_${head}`];
			if (kind?.type === "choice")
				for (const [option, share] of Object.entries(
					kind.probabilities as Record<string, number>,
				))
					kindMass[option] =
						(kindMass[option] ?? 0) + share / component.length;
			fixedness += fix(answers, head) / component.length;
		}
		if (fixedness < floor) continue;
		if (
			!Object.entries(kindMass).some(
				([option, share]) =>
					option !== "None" && option !== "Unresolved" && share > 0,
			)
		)
			continue;
		const members = analysis.targets
			.filter((target) => {
				const head = headOf(target);
				return head !== undefined && component.includes(head);
			})
			.map((target) => target.id);
		if (members.length < 2) continue;
		phrasemes.push({
			id: `p${phrasemes.length + 1}`,
			members,
			kindMass: Object.fromEntries(
				Object.entries(kindMass)
					.sort((a, b) => b[1] - a[1])
					.map(([option, share]) => [option, +share.toFixed(3)]),
			),
			fixedness: +fixedness.toFixed(2),
			provenance: `lab:${policy.name}`,
		});
	}
	return phrasemes;
}

// ----------------------------------------------------------------- probing

type Probe = {
	readonly id: string;
	readonly text: string;
	readonly expected: string;
	readonly actual: string;
	readonly pass: boolean;
	readonly membersOk: boolean;
};

const describe = (unit: {
	family: string;
	kind: string;
	memberSegmentIndices: readonly number[];
}) =>
	`${unit.family}/${unit.kind} [${[...unit.memberSegmentIndices].join(",")}]`;

function probe(
	sentence: Sentence,
	placement: Placement,
	analysis: SentenceAnalysis,
	click: ClickCase,
): Probe {
	const indexAt = new Map<number, number>();
	for (const [index, pieces] of placement.pieces)
		for (const piece of pieces) indexAt.set(piece.offset, index);
	const offset = placement.pieces.get(click.clickedSegmentIndex)?.[0]?.offset;
	const unit = offset === undefined ? null : resolvedUnitAt(analysis, offset);
	const actual = unit && {
		family: unit.family,
		kind: unit.kind,
		memberSegmentIndices: [
			...new Set(unit.offsets.map((o) => indexAt.get(o) ?? -1)),
		].sort((a, b) => a - b),
	};
	const gold = click.idealOutput as {
		family?: string;
		kind?: string;
		memberSegmentIndices?: number[];
	};
	const expected = gold.family
		? describe({
				family: gold.family,
				kind: gold.kind ?? "?",
				memberSegmentIndices: [
					...(gold.memberSegmentIndices ?? []),
				].sort((a, b) => a - b),
			})
		: "Unresolved";
	const actualText = actual ? describe(actual) : "Unresolved";
	const membersOk = gold.family
		? !!actual &&
			actual.memberSegmentIndices.join(",") ===
				[...(gold.memberSegmentIndices ?? [])]
					.sort((a, b) => a - b)
					.join(",")
		: !actual;
	return {
		id: click.id,
		text: `${sentence.segments[click.clickedSegmentIndex]?.text} | ${sentence.key}`,
		expected,
		actual: actualText,
		pass: expected === actualText,
		membersOk,
	};
}

// -------------------------------------------------------------------- main

const stored: Stored = replay
	? JSON.parse(await readFile(replay, "utf8"))
	: await collect();
if (!replay) {
	const path = "/tmp/phraseme-linkage-answers.json";
	await save(path, stored);
	console.error(`answers saved to ${path}`);
}

type Row = { sentence: Sentence; click: ClickCase; tier: string; heat: number };
const rows: Row[] = [];
const results = new Map<string, Map<string, Probe>>(
	policies.map((policy) => [policy.name, new Map()]),
);
let mismatchedBaseline = 0;

for (const sentence of sentences) {
	const answers = stored[sentence.key];
	if (!answers || !Object.keys(answers).length) continue;
	const german = segmented(sentence);
	const placement = placeSegments(german);
	const assembled = assembleAnalysis(german, placement, answers);
	const base = { sentenceId: sentence.id, language: "de" as const };
	// The lab's `gate@1.5` must reproduce production before it is trusted.
	const replayed = phrasemeLayer(
		assembled,
		placement,
		answers,
		policies.at(-1) as Policy,
	);
	const shape = (list: readonly PhrasemeTarget[]) =>
		list
			.map((p) => p.members.join("+"))
			.sort()
			.join(" ");
	if (shape(replayed) !== shape(assembled.phrasemes)) {
		mismatchedBaseline += 1;
		console.error(
			`baseline mismatch ${sentence.id}: ${shape(assembled.phrasemes)} vs ${shape(replayed)}`,
		);
	}
	const headOf = headIndexOf(placement);
	const heads = new Set(assembled.targets.map(headOf));
	const goldPhraseme = sentence.cases.some(
		(c) => (c.idealOutput as { family?: string }).family === "Phraseme",
	);
	for (const click of sentence.cases) {
		const family = (click.idealOutput as { family?: string }).family;
		const index = click.clickedSegmentIndex;
		const heat = Math.max(
			0,
			...[...heads]
				.filter((head) => head !== undefined && head !== index)
				.map((head) => noul(answers, index, head as number)),
		);
		const tier =
			family === "Phraseme"
				? "1 Phraseme gold"
				: goldPhraseme
					? "2 bystander in a Phraseme sentence"
					: "3 Lexeme with a pair Noul >= tau";
		rows.push({ sentence, click, tier, heat });
	}
	for (const policy of policies) {
		const analysis: SentenceAnalysis = {
			...base,
			...assembled,
			phrasemes: phrasemeLayer(assembled, placement, answers, policy),
		};
		for (const click of sentence.cases)
			results
				.get(policy.name)
				?.set(click.id, probe(sentence, placement, analysis, click));
	}
}

// Trickiest: every Phraseme gold click, its bystanders, then the Lexeme
// clicks the pair Noul could pull into an expression, hottest first. The
// ranking reads only the answers, never a policy's outcome.
const ranked = [
	...rows.filter((row) => row.tier.startsWith("1")),
	...rows.filter((row) => row.tier.startsWith("2")),
	...rows
		.filter((row) => row.tier.startsWith("3") && row.heat >= tau)
		.sort((a, b) => b.heat - a.heat),
];
const selected = ranked.slice(0, Math.max(tricky, 0));
const tiers = [...new Set(selected.map((row) => row.tier))].sort();

const table = (ids: readonly string[]) =>
	policies.map((policy) => {
		const probes = ids.map((id) => results.get(policy.name)?.get(id));
		return {
			policy: policy.name,
			clicks: ids.length,
			pass: probes.filter((p) => p?.pass).length,
			membersOk: probes.filter((p) => p?.membersOk).length,
		};
	});

console.log(
	`baseline reproduced: ${mismatchedBaseline === 0 ? "yes" : `no (${mismatchedBaseline} sentences differ)`}`,
);
console.log(`\n## trickiest ${selected.length}`);
console.table(table(selected.map((row) => row.click.id)));
for (const tier of tiers) {
	console.log(`\n### ${tier}`);
	console.table(
		table(
			selected
				.filter((row) => row.tier === tier)
				.map((row) => row.click.id),
		),
	);
}
console.log(`\n## all ${rows.length} clicks`);
console.table(table(rows.map((row) => row.click.id)));

const scope = argv.includes("--all-flips") ? rows : selected;
console.log(
	`\n## flips against single link (${scope === rows ? "all clicks" : "trickiest set"})`,
);
const baseline = results.get(policies[0]?.name ?? "");
for (const policy of policies.slice(1)) {
	console.log(`\n### ${policy.name}`);
	for (const row of scope) {
		const before = baseline?.get(row.click.id);
		const after = results.get(policy.name)?.get(row.click.id);
		if (!before || !after || before.actual === after.actual) continue;
		const mark = before.pass === after.pass ? "=" : after.pass ? "+" : "-";
		console.log(
			`${mark} ${row.click.id}  (${after.text})\n    gold ${after.expected}\n    was  ${before.actual}\n    new  ${after.actual}`,
		);
	}
}
