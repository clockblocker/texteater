/**
 * Writes the playground fixtures: the fixed sentences in `fixtures/sentences.ts`
 * run through the winning intake design (anchored membership, extended
 * routes, group vote at tau 0.6, per-cell identity rubric collapsed to
 * headword groups, member roles) and emitted as Segmented Sentences with
 * fused words split by the German fusion table. Each fixture carries its
 * gold keyed by offset and is scored here against the Resolution Selector.
 *
 *   zsh -ic 'export TYPESAFE_API_KEY=$TYPESAFE_TOKEN; bun prototypes/intake/fixtures.ts'
 *   bun prototypes/intake/fixtures.ts --from /tmp/intake-fixtures.json   (re-emit without calls)
 *
 * Output: `prototypes/intake/fixtures/lattice.json`, which the tf-demo
 * playground entry `lattice` imports.
 */
import type { Questions } from "promptsmith/typesafe";
import type { AuthoredMember } from "../../src/concrete-lang/de/authored-closed-sets/member.js";
import { germanFusionTable } from "../../src/concrete-lang/de/fusion-entries.js";
import { segmentGerman } from "../../src/concrete-lang/de/segmentation/segment.js";
import {
	abbreviationEntry,
	fusionEntry,
	splitClitic,
} from "../../src/universal/fusion-table.js";
import { ask, type Call, save } from "../harness.js";
import type { Sentence, Unit } from "./corpus.js";
import { assemble, groupings, routings, sentenceState } from "./designs.js";
import { fixtureSentences, type GoldSpec } from "./fixtures/sentences.js";
import {
	candidatesFor,
	headwordGroups,
	identityQuestions,
} from "./identity.js";
import { type Role, roleQuestions, solveRoles } from "./roles.js";
import {
	type AnalysisTarget,
	effectiveRoute,
	type Fixture,
	type Fusion,
	type GoldTarget,
	headOf,
	type IdentityCandidate,
	type Member,
	type MemberRole,
	type Segment,
	type SegmentedSentence,
	selectIdentity,
} from "./segmented-sentence.js";

const argv = process.argv.slice(2);
const replay = (() => {
	const index = argv.indexOf("--from");
	return index >= 0 ? argv[index + 1] : "";
})();
const design =
	"anchored+extended+groupVote τ0.6 +identity:rubric→headword +roles";
const tau = 0.6;
const grouping = groupings.anchored!;
const routing = routings.extended!;

type Answers = Record<string, unknown>;
type ChoiceAnswer = {
	type: "choice";
	choice: string;
	probabilities: Record<string, number>;
};

function labSentence(id: string, text: string): Sentence {
	const segments = segmentGerman(text).segments.map((segment) => ({
		kind: segment.kind,
		text: segment.text,
	}));
	return {
		key: text,
		id,
		segments,
		resolvable: segments.flatMap((segment, index) =>
			segment.kind === "ResolvableText" ? [index] : [],
		),
		cases: [],
	};
}

async function askWithBackoff(
	calls: Call[],
	state: unknown,
	questions: Questions,
	attempt = 0,
): Promise<Answers> {
	try {
		return (await ask(calls, "fixtures", state, questions)).answers;
	} catch (error) {
		if (!String(error).includes("429") || attempt >= 5) throw error;
		await new Promise((resolve) =>
			setTimeout(resolve, 2000 * 2 ** attempt),
		);
		return askWithBackoff(calls, state, questions, attempt + 1);
	}
}

// ------------------------------------------------------------- Segments

type Placed = {
	readonly segments: Segment[];
	readonly fusions: Fusion[];
	/** New Segments per original lab index. */
	readonly pieces: Map<number, Segment[]>;
};

/** Apply the fusion table: split fusions and clitics, expand abbreviations. */
function placeSegments(sentence: Sentence): Placed {
	const segments: Segment[] = [];
	const fusions: Fusion[] = [];
	const pieces = new Map<number, Segment[]>();
	let offset = 0;
	const first = (surface: string | readonly string[]) =>
		typeof surface === "string" ? surface : surface[0]!;
	for (const [index, segment] of sentence.segments.entries()) {
		const own: Segment[] = [];
		const push = (kind: Segment["kind"], text: string, surface: string) => {
			const placed = { offset, kind, text, surface };
			segments.push(placed);
			own.push(placed);
			offset += text.length;
		};
		const previous = sentence.segments[index - 1];
		if (segment.kind !== "ResolvableText") {
			push(segment.kind, segment.text, segment.text);
		} else if (fusionEntry(germanFusionTable, segment.text)) {
			const entry = fusionEntry(germanFusionTable, segment.text)!;
			const start = offset;
			for (const component of entry.components)
				push(
					"ResolvableText",
					component.span,
					first(component.surface),
				);
			fusions.push({
				offset: start,
				form: segment.text,
				components: own.map((piece, position) => ({
					offset: piece.offset,
					span: piece.span ?? piece.text,
					surface: piece.surface,
					role: entry.components[position]!.role,
				})),
			});
		} else if (abbreviationEntry(germanFusionTable, segment.text)) {
			push(
				"ResolvableText",
				segment.text,
				first(
					abbreviationEntry(germanFusionTable, segment.text)!.surface,
				),
			);
		} else if (
			previous &&
			/^[’']$/u.test(previous.text) &&
			splitClitic(germanFusionTable, `x'${segment.text}`)
		) {
			// The segmenter already cut `geht's` into host, apostrophe and `s`.
			const clitic = splitClitic(germanFusionTable, `x'${segment.text}`)!;
			push("ResolvableText", segment.text, first(clitic.entry.surface));
		} else {
			push("ResolvableText", segment.text, segment.text);
		}
		pieces.set(index, own);
	}
	return { segments, fusions, pieces };
}

// -------------------------------------------------------------- Targets

function bareKind(route: string): string {
	return route.includes("/") ? route.split("/")[1]! : route;
}

function routeMassOf(
	sentence: Sentence,
	answers: Answers,
	members: readonly number[],
): Record<string, number> {
	const totals: Record<string, number> = {};
	for (const member of members) {
		const spread = routing.distribution(sentence, answers, member);
		if (!spread) continue;
		for (const [route, mass] of Object.entries(spread))
			totals[bareKind(route)] =
				(totals[bareKind(route)] ?? 0) + mass / members.length;
	}
	return Object.fromEntries(
		Object.entries(totals)
			.sort((a, b) => b[1] - a[1])
			.map(([kind, mass]) => [kind, +mass.toFixed(3)]),
	);
}

function candidateOf(group: readonly AuthoredMember[]): IdentityCandidate {
	const lemma = group[0]!.lemma;
	const pronType = (lemma.coreFeatures as Record<string, unknown>).pronType;
	return {
		key: `${lemma.kind}:${lemma.canonicalForm}:${String(pronType ?? "")}`,
		kind: lemma.kind as IdentityCandidate["kind"],
		headword: lemma.canonicalForm,
		pronType: typeof pronType === "string" ? pronType : null,
		cells: group.map((member) =>
			Object.entries(member.lemma.coreFeatures)
				.filter(
					([name, value]) => value !== null && name !== "pronType",
				)
				.map(([name, value]) => `${name}=${String(value)}`)
				.join(" "),
		),
		definition: group[0]!.knowledge.definition,
	};
}

/** Per-cell answer mass summed per headword group (issue 509). */
function identityMassOf(
	sentence: Sentence,
	answers: Answers,
	index: number,
): AnalysisTarget["identity"] {
	const candidates = candidatesFor(sentence.segments[index]?.text ?? "");
	if (!candidates.length) return null;
	const groups = headwordGroups(candidates);
	const answer = answers[`id_${index}`] as ChoiceAnswer | undefined;
	const mass: Record<string, number> = {};
	const keyed = groups.map(candidateOf);
	for (const candidate of keyed) mass[candidate.key] = 0;
	mass.NoMatch = 0;
	mass.Unresolved = 0;
	if (answer?.type === "choice")
		for (const [option, share] of Object.entries(answer.probabilities)) {
			if (!option.startsWith("c")) {
				mass[option] = (mass[option] ?? 0) + share;
				continue;
			}
			const member = candidates[Number(option.slice(1))];
			const position = groups.findIndex((group) =>
				group.includes(member!),
			);
			const key = keyed[position]?.key;
			if (key) mass[key] = (mass[key] ?? 0) + share;
		}
	return {
		candidates: keyed,
		mass: Object.fromEntries(
			Object.entries(mass).map(([key, share]) => [
				key,
				+share.toFixed(3),
			]),
		),
	};
}

function buildTargets(
	sentence: Sentence,
	answers: Answers,
	placed: Placed,
): AnalysisTarget[] {
	const groups = grouping.solve(sentence, answers, tau);
	const units = assemble(
		sentence,
		groups,
		routing,
		answers,
		"groupVote",
		true,
	);
	const roles = solveRoles(sentence, answers);
	const roleOf = (index: number, singleton: boolean): MemberRole => {
		const role: Role = roles.get(index) ?? "Unresolved";
		if (role === "Free") return "Head";
		if (singleton && role === "Unresolved") return "Head";
		return role;
	};
	const targets: AnalysisTarget[] = [];
	const fusedArticles: { offset: number; surface: string }[] = [];
	const seen = new Set<string>();
	let counter = 0;
	const nextId = () => `t${++counter}`;

	for (const index of sentence.resolvable) {
		const unit: Unit | undefined = units.get(index);
		const memberIndices =
			unit && !("decision" in unit) ? unit.memberSegmentIndices : [index];
		const key = memberIndices.join(",");
		if (seen.has(key)) continue;
		seen.add(key);
		const fusion = placed.fusions.find(
			(entry) => entry.offset === placed.pieces.get(index)?.[0]?.offset,
		);
		if (memberIndices.length === 1 && fusion) {
			// The table decides a fused word: adposition alone, article to the noun.
			for (const component of fusion.components)
				if (component.role === "Adposition")
					targets.push({
						id: nextId(),
						members: [{ offset: component.offset, role: "Head" }],
						routeMass: { ADP: 1 },
						identity: null,
						provenance: "fusion-table",
					});
				else
					fusedArticles.push({
						offset: component.offset,
						surface: component.surface,
					});
			continue;
		}
		const members: Member[] = memberIndices.flatMap((memberIndex) =>
			(placed.pieces.get(memberIndex) ?? []).map((piece) => ({
				offset: piece.offset,
				role: roleOf(memberIndex, memberIndices.length === 1),
			})),
		);
		const unresolvedReason =
			unit && "decision" in unit ? (unit.reason ?? "membership") : null;
		const routeMass = unresolvedReason
			? {
					Unresolved: 1,
					...routeMassOf(sentence, answers, memberIndices),
				}
			: routeMassOf(sentence, answers, memberIndices);
		const headIndex =
			memberIndices.find(
				(memberIndex) => roleOf(memberIndex, false) === "Head",
			) ?? memberIndices[0]!;
		targets.push({
			id: nextId(),
			members,
			routeMass: unresolvedReason ? { Unresolved: 1 } : routeMass,
			identity: identityMassOf(sentence, answers, headIndex),
			provenance: unresolvedReason ? `guard:${unresolvedReason}` : "vote",
		});
	}
	// A fused article joins the next NOUN target that has no article yet (ADR 0024).
	for (const article of fusedArticles) {
		const noun = targets
			.filter(
				(target) =>
					effectiveRoute(target).kind === "NOUN" &&
					target.members[0]!.offset > article.offset &&
					!target.members.some((member) => member.role === "Article"),
			)
			.sort((a, b) => a.members[0]!.offset - b.members[0]!.offset)[0];
		if (noun) {
			const position = targets.indexOf(noun);
			targets[position] = {
				...noun,
				members: [
					{ offset: article.offset, role: "Article" },
					...noun.members,
				],
				provenance: `${noun.provenance}+fusion-table`,
			};
		} else
			targets.push({
				id: nextId(),
				members: [{ offset: article.offset, role: "Head" }],
				routeMass: { DET: 1 },
				identity: identityMassOf(
					labSentence("x", article.surface),
					{},
					0,
				),
				provenance: "fusion-table:unattached-article",
			});
	}
	return targets.sort((a, b) => a.members[0]!.offset - b.members[0]!.offset);
}

// ----------------------------------------------------------------- Gold

function resolveGold(spec: GoldSpec, placed: Placed): GoldTarget {
	const members = spec.members.map((member) => {
		const match = member.match(
			/^(.+?)(?:#(\d+))?(?:@([^:]+))?(?::(\w+))?$/u,
		);
		if (!match) throw Error(`Bad gold member ${member}`);
		const [, text, nth, fused, role] = match;
		let candidates = placed.segments.filter(
			(segment) =>
				segment.kind === "ResolvableText" && segment.text === text,
		);
		if (fused) {
			const fusion = placed.fusions.find((entry) => entry.form === fused);
			if (!fusion) throw Error(`No fusion ${fused} for ${member}`);
			candidates = candidates.filter((segment) =>
				fusion.components.some(
					(component) => component.offset === segment.offset,
				),
			);
		} else
			candidates = candidates.filter(
				(segment) =>
					!placed.fusions.some((entry) =>
						entry.components.some(
							(c) => c.offset === segment.offset,
						),
					),
			);
		const segment = candidates[Number(nth ?? "1") - 1];
		if (!segment) throw Error(`No segment for gold member ${member}`);
		return {
			offset: segment.offset,
			...(role ? { role: role as MemberRole } : {}),
		};
	});
	return {
		kind: spec.kind,
		members: members.sort((a, b) => a.offset - b.offset),
		...(spec.identity ? { identity: spec.identity } : {}),
	};
}

type Score = {
	readonly id: string;
	readonly gold: number;
	readonly membersFound: number;
	readonly routeCorrect: number;
	readonly rolesCorrect: number;
	readonly rolesScored: number;
	readonly identityCorrect: number;
	readonly identityScored: number;
	readonly failures: string[];
};

function score(fixture: Fixture): Score {
	const failures: string[] = [];
	let membersFound = 0,
		routeCorrect = 0,
		rolesCorrect = 0,
		rolesScored = 0,
		identityCorrect = 0,
		identityScored = 0;
	const text = (offset: number) =>
		fixture.sentence.segments.find((s) => s.offset === offset)?.text ?? "?";
	for (const gold of fixture.gold) {
		const offsets = gold.members.map((m) => m.offset).join(",");
		const target = fixture.sentence.targets.find(
			(candidate) =>
				candidate.members
					.map((m) => m.offset)
					.sort((a, b) => a - b)
					.join(",") === offsets,
		);
		const label = `[${gold.members.map((m) => text(m.offset)).join(" ")}] ${gold.kind}`;
		if (!target) {
			failures.push(`${label}: no target with these members`);
			continue;
		}
		membersFound += 1;
		const route = effectiveRoute(target);
		if (route.kind === gold.kind) routeCorrect += 1;
		else failures.push(`${label}: route ${route.kind}`);
		for (const member of gold.members) {
			if (!member.role) continue;
			rolesScored += 1;
			const actual = target.members.find(
				(m) => m.offset === member.offset,
			)?.role;
			if (actual === member.role) rolesCorrect += 1;
			else
				failures.push(
					`${label}: ${text(member.offset)} role ${actual} not ${member.role}`,
				);
		}
		if (gold.identity) {
			identityScored += 1;
			const identity = selectIdentity(target, headOf(target));
			const actual =
				identity.state === "Selected"
					? `${identity.candidate.kind}:${identity.candidate.headword}`
					: identity.state;
			if (actual === gold.identity) identityCorrect += 1;
			else
				failures.push(
					`${label}: identity ${actual} not ${gold.identity}`,
				);
		}
	}
	return {
		id: fixture.sentence.id,
		gold: fixture.gold.length,
		membersFound,
		routeCorrect,
		rolesCorrect,
		rolesScored,
		identityCorrect,
		identityScored,
		failures,
	};
}

// ------------------------------------------------------------------ main

const stored = replay
	? ((await Bun.file(replay).json()) as {
			answers: { id: string; answers: Answers }[];
		})
	: null;
const raws: { id: string; answers: Answers }[] = [];
const asked = new Map<string, { sentence: Sentence; answers: Answers }>();
for (const spec of fixtureSentences) {
	const sentence = labSentence(spec.id, spec.text);
	let answers = stored?.answers.find((row) => row.id === spec.id)?.answers;
	if (!answers) {
		const questions: Questions = {
			...grouping.questions(sentence),
			...routing.questions(sentence),
			...identityQuestions(sentence, "rubric"),
			...roleQuestions(sentence),
		};
		const calls: Call[] = [];
		answers = await askWithBackoff(
			calls,
			sentenceState(sentence),
			questions,
		);
		console.error(
			`  ${spec.id}: ${Object.keys(questions).length} questions, ${Math.round(calls[0]?.durationMs ?? 0)} ms, ${calls[0]?.input_tokens} input tokens`,
		);
	}
	raws.push({ id: spec.id, answers });
	asked.set(spec.id, { sentence, answers });
}
if (!replay) await save("/tmp/intake-fixtures.json", { answers: raws });
const fixtures: Fixture[] = fixtureSentences.map((spec) => {
	const { sentence, answers } = asked.get(spec.id)!;
	const placed = placeSegments(sentence);
	return {
		sentence: {
			id: spec.id,
			language: "de",
			stitchedText: spec.text,
			segments: placed.segments,
			targets: buildTargets(sentence, answers, placed),
			fusions: placed.fusions,
		},
		gold: spec.gold.map((gold) => resolveGold(gold, placed)),
		note: spec.note,
		produced: { design, at: new Date().toISOString().slice(0, 10) },
	};
});
await save(
	new URL("./fixtures/lattice.json", import.meta.url).pathname,
	fixtures,
);
const scores = fixtures.map(score);
const total = (pick: (s: Score) => number) =>
	scores.reduce((sum, s) => sum + pick(s), 0);
console.log(
	JSON.stringify(
		{
			sentences: fixtures.length,
			goldTargets: total((s) => s.gold),
			membersFound: total((s) => s.membersFound),
			routeCorrect: total((s) => s.routeCorrect),
			roles: `${total((s) => s.rolesCorrect)}/${total((s) => s.rolesScored)}`,
			identity: `${total((s) => s.identityCorrect)}/${total((s) => s.identityScored)}`,
			failures: Object.fromEntries(
				scores
					.filter((s) => s.failures.length)
					.map((s) => [s.id, s.failures]),
			),
		},
		null,
		2,
	),
);
