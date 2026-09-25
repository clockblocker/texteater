import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import type { DumgenOptions } from "../../../types.js";
import { createDumgen } from "../../../universal/dumgen.js";
import { segmentSchema } from "../../../universal/schemas.js";
import {
	effectiveRoute,
	governorTargets,
	headOf,
	membersOf,
	type SentenceAnalysis,
	type Slot,
	selectIdentity,
	selectPhrasemeKind,
	slotOffset,
} from "./analysis.js";
import { evaluationCaseIds } from "./evaluation-ids.js";
import data from "./source-data.json";

/**
 * The sentence corpus (issue 495): gold keyed by character offset in the
 * Segmented Sentence's Stitched Text, a Lexeme layer of targets with members
 * and, where authored, roles and the closed-class headword group, a Phraseme
 * layer naming member words by head offset and, where authored, the offsets
 * of the prepositions it governs, and slots naming each
 * governed preposition's Segment with the words that may govern it. A layer
 * a case leaves out is not scored.
 */
export const inputSchema = z.strictObject({
	segments: z.array(segmentSchema).min(1),
});
const goldTargetSchema = z.strictObject({
	kind: z.string().min(1),
	members: z
		.array(
			z.strictObject({
				offset: z.number().int().nonnegative(),
				role: z.string().min(1).optional(),
			}),
		)
		.min(1),
	identity: z.string().min(1).optional(),
});
export const goldSchema = z.strictObject({
	targets: z.array(goldTargetSchema).optional(),
	phrasemes: z
		.array(
			z.strictObject({
				kind: z.string().min(1),
				words: z.array(z.number().int().nonnegative()).min(2),
				/** The governed prepositions' offsets; scored only where authored. */
				governed: z.array(z.number().int().nonnegative()).optional(),
			}),
		)
		.optional(),
	slots: z
		.array(
			z.strictObject({
				/** Any member offset of an acceptable governing word. */
				governors: z.array(z.number().int().nonnegative()).min(1),
				/** The Segment realizing the preposition: the marker, or a pronominal adverb filler. */
				offset: z.number().int().nonnegative(),
				preposition: z.string().min(1),
				case: z.enum(["Acc", "Dat", "Gen"]),
				/** Scored only where authored. */
				referent: z.enum(["Someone", "Something", "Either"]).optional(),
			}),
		)
		.optional(),
});
export type SentenceGold = z.infer<typeof goldSchema>;

/** What one analysed sentence scores against its gold. */
export type SentenceScore = {
	readonly contractPass: boolean;
	readonly targets: number;
	readonly membersFound: number;
	readonly routeCorrect: number;
	readonly rolesScored: number;
	readonly rolesCorrect: number;
	readonly identityScored: number;
	readonly identityCorrect: number;
	readonly phrasemes: number;
	readonly phrasemesFound: number;
	readonly phrasemesCorrect: number;
	readonly phrasemesExtra: number;
	readonly slots: number;
	readonly slotsCorrect: number;
	readonly slotsExtra: number;
	readonly failures: readonly string[];
};

export function scoreAnalysis(
	analysis: SentenceAnalysis,
	gold: SentenceGold,
): SentenceScore {
	const failures: string[] = [];
	const text = (offset: number) =>
		analysis.segments.find((s) => s.offset === offset)?.text ?? "?";
	let membersFound = 0;
	let routeCorrect = 0;
	let rolesScored = 0;
	let rolesCorrect = 0;
	let identityScored = 0;
	let identityCorrect = 0;
	for (const target of gold.targets ?? []) {
		const offsets = target.members.map((m) => m.offset).join(",");
		const found = analysis.targets.find(
			(candidate) =>
				candidate.members
					.map((m) => m.offset)
					.sort((a, b) => a - b)
					.join(",") === offsets,
		);
		const label = `[${target.members.map((m) => text(m.offset)).join(" ")}] ${target.kind}`;
		if (!found) {
			failures.push(`${label}: no target with these members`);
			continue;
		}
		membersFound += 1;
		const route = effectiveRoute(found);
		if (route.kind === target.kind) routeCorrect += 1;
		else failures.push(`${label}: route ${route.kind}`);
		for (const member of target.members) {
			if (!member.role) continue;
			rolesScored += 1;
			const actual = found.members.find(
				(m) => m.offset === member.offset,
			)?.role;
			if (actual === member.role) rolesCorrect += 1;
			else
				failures.push(
					`${label}: ${text(member.offset)} role ${actual} not ${member.role}`,
				);
		}
		if (target.identity) {
			identityScored += 1;
			const identity = selectIdentity(found, headOf(found));
			const actual =
				identity.state === "Selected"
					? `${identity.candidate.kind}:${identity.candidate.headword}`
					: identity.state;
			if (actual === target.identity) identityCorrect += 1;
			else
				failures.push(
					`${label}: identity ${actual} not ${target.identity}`,
				);
		}
	}
	const headOffsets = (phraseme: SentenceAnalysis["phrasemes"][number]) =>
		membersOf(analysis, phraseme)
			.map((target) => headOf(target).offset)
			.sort((a, b) => a - b)
			.join(",");
	const matched = new Set<string>();
	let phrasemesFound = 0;
	let phrasemesCorrect = 0;
	for (const expected of gold.phrasemes ?? []) {
		const key = [...expected.words].sort((a, b) => a - b).join(",");
		const label = `{${expected.words.map(text).join(" ")}} ${expected.kind}`;
		const phraseme = analysis.phrasemes.find(
			(candidate) => headOffsets(candidate) === key,
		);
		if (!phraseme) {
			failures.push(`${label}: no Phraseme Target with these words`);
			continue;
		}
		matched.add(phraseme.id);
		phrasemesFound += 1;
		const kind = selectPhrasemeKind(analysis, phraseme).kind;
		const governed = governedOffsets(analysis, phraseme);
		const governedRight =
			expected.governed === undefined ||
			governed.join(",") ===
				[...expected.governed].sort((a, b) => a - b).join(",");
		if (kind === expected.kind && governedRight) phrasemesCorrect += 1;
		else if (kind !== expected.kind)
			failures.push(`${label}: kind ${kind}`);
		else
			failures.push(
				`${label}: governs ${governed.map(text).join(" ") || "nothing"}`,
			);
	}
	const extra = gold.phrasemes
		? analysis.phrasemes.filter((p) => !matched.has(p.id))
		: [];
	for (const phraseme of extra)
		failures.push(
			`extra Phraseme ${selectPhrasemeKind(analysis, phraseme).kind} over {${membersOf(
				analysis,
				phraseme,
			)
				.map((target) => text(headOf(target).offset))
				.join(" ")}}`,
		);
	const slots = scoreSlots(analysis, gold, text);
	failures.push(...slots.failures);
	return {
		contractPass: failures.length === 0,
		targets: gold.targets?.length ?? 0,
		membersFound,
		routeCorrect,
		rolesScored,
		rolesCorrect,
		identityScored,
		identityCorrect,
		phrasemes: gold.phrasemes?.length ?? 0,
		phrasemesFound,
		phrasemesCorrect,
		phrasemesExtra: extra.length,
		slots: gold.slots?.length ?? 0,
		slotsCorrect: slots.correct,
		slotsExtra: slots.extra,
		failures,
	};
}

/**
 * A gold entry matches the Slot on its Segment with its preposition, case,
 * one of its governors and, where authored, its referent.
 */
function scoreSlots(
	analysis: SentenceAnalysis,
	gold: SentenceGold,
	text: (offset: number) => string,
) {
	const failures: string[] = [];
	if (!gold.slots) return { correct: 0, extra: 0, failures };
	const governorLabel = (id: string) =>
		governorTargets(analysis, id)
			.map((target) => text(headOf(target).offset))
			.join(" ") || "?";
	const matched = new Set<Slot>();
	let correct = 0;
	for (const expected of gold.slots) {
		const label = `${expected.governors.map(text).join("/")} + ${expected.preposition} ${expected.case}${expected.referent ? ` ${expected.referent}` : ""}`;
		const found = analysis.slots.find(
			(slot) => slotOffset(analysis, slot) === expected.offset,
		);
		if (!found) {
			failures.push(`${label}: no slot`);
			continue;
		}
		matched.add(found);
		const { complement } = found;
		const actual = `${governorLabel(found.governor)} + ${complement.preposition.canonicalForm} ${complement.case} ${complement.referent}`;
		if (
			complement.preposition.canonicalForm === expected.preposition &&
			complement.case === expected.case &&
			(expected.referent === undefined ||
				complement.referent === expected.referent) &&
			governorTargets(analysis, found.governor).some((governor) =>
				governor.members.some((member) =>
					expected.governors.includes(member.offset),
				),
			)
		)
			correct += 1;
		else failures.push(`${label}: got ${actual}`);
	}
	const extra = analysis.slots.filter((slot) => !matched.has(slot));
	for (const slot of extra)
		failures.push(
			`extra slot ${governorLabel(slot.governor)} + ${text(slotOffset(analysis, slot) ?? -1)} ${slot.complement.case}`,
		);
	return { correct, extra: extra.length, failures };
}

const corpus = defineGoldenCorpus({
	route: data.route,
	inputSchema,
	outputSchema: goldSchema,
	collections: {
		canonical: defineGoldenCaseCollection(import.meta.url, {
			cases: Object.fromEntries(
				Object.entries(data.cases).map(([id, value]) => [
					id,
					{
						input: inputSchema.parse(value.input),
						idealOutput: goldSchema.parse(value.idealOutput),
					},
				]),
			),
		}),
	},
	fingerprintInput: (input) =>
		(input as { segments: { text: string }[] }).segments
			.map((s) => s.text)
			.join("")
			.normalize("NFC")
			.toLocaleLowerCase("de"),
});

/**
 * Runs the production `analyzeSentence` on every corpus sentence and scores
 * both layers; the recorded output is the gold-shaped projection of the
 * analysis so runs stay comparable across policy versions.
 */
export function sentenceOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<typeof inputSchema, typeof goldSchema, SentenceScore> {
	const demonstrations = corpus.select(data.demonstrationIds);
	const analyses = new Map<string, SentenceAnalysis>();
	return {
		corpus,
		demonstrations,
		evaluation: corpus.select(evaluationCaseIds).difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					options.onOperation?.(trace);
					recordTrace(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(
					dumgen.analyzeSentence({
						sentence: {
							id: "evaluation",
							language: "de",
							segments: input.segments,
						},
					}),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			const analysis = result.right;
			analyses.set(stableJson(input), analysis);
			return projectGold(analysis);
		},
		evaluator: ({ input, output, idealOutput }) => {
			const analysis = analyses.get(stableJson(input));
			if (!analysis)
				return {
					...emptyScore(idealOutput),
					contractPass:
						stableJson(output) === stableJson(idealOutput),
				};
			return scoreAnalysis(analysis, idealOutput);
		},
	};
}

/** The analysis in the gold's shape: targets with roles, closed-class identity, Phrasemes by head. */
export function projectGold(analysis: SentenceAnalysis): SentenceGold {
	return {
		targets: analysis.targets.map((target) => {
			const identity = selectIdentity(target, headOf(target));
			return {
				kind: effectiveRoute(target).kind,
				members: target.members.map((m) => ({
					offset: m.offset,
					role: m.role,
				})),
				...(identity.state === "Selected"
					? {
							identity: `${identity.candidate.kind}:${identity.candidate.headword}`,
						}
					: {}),
			};
		}),
		phrasemes: analysis.phrasemes.map((phraseme) => ({
			kind: selectPhrasemeKind(analysis, phraseme).kind,
			words: membersOf(analysis, phraseme)
				.map((target) => headOf(target).offset)
				.sort((a, b) => a - b),
			governed: governedOffsets(analysis, phraseme),
		})),
		slots: analysis.slots.map((slot) => ({
			governors: governorTargets(analysis, slot.governor).map(
				(target) => headOf(target).offset,
			),
			offset: slotOffset(analysis, slot) ?? 0,
			preposition: slot.complement.preposition.canonicalForm,
			case: slot.complement.case,
			referent: slot.complement.referent,
		})),
	};
}

/** The offsets of the prepositions a Phraseme governs, in order. */
function governedOffsets(
	analysis: SentenceAnalysis,
	phraseme: SentenceAnalysis["phrasemes"][number],
): number[] {
	return analysis.targets
		.filter((target) => phraseme.governedPrepositions.includes(target.id))
		.map((target) => headOf(target).offset)
		.sort((a, b) => a - b);
}

function emptyScore(gold: SentenceGold): SentenceScore {
	return {
		contractPass: false,
		targets: gold.targets?.length ?? 0,
		membersFound: 0,
		routeCorrect: 0,
		rolesScored: 0,
		rolesCorrect: 0,
		identityScored: 0,
		identityCorrect: 0,
		phrasemes: gold.phrasemes?.length ?? 0,
		phrasemesFound: 0,
		phrasemesCorrect: 0,
		phrasemesExtra: 0,
		slots: gold.slots?.length ?? 0,
		slotsCorrect: 0,
		slotsExtra: 0,
		failures: ["no analysis recorded"],
	};
}
