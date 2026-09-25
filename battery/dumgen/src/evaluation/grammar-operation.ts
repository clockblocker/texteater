import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import type { OperationExperiment } from "promptsmith/evaluation";
import type { z } from "zod";
import type { LinguisticCorpus } from "../concrete-lang/de/authoring.js";
import { germanFusionTable } from "../concrete-lang/de/fusion-entries.js";
import { deriveNounArticle } from "../concrete-lang/de/grammatical-resolution/noun-article-reference.js";
import { grammarPromptRoutes } from "../generated/prompts.js";
import type {
	DumgenOptions,
	GrammarInput,
	LemmaCandidate,
	Segment,
	SentenceContext,
} from "../types.js";
import { createDumgen } from "../universal/dumgen.js";
import { fusedWordPieces, fusionEntry } from "../universal/fusion-table.js";
import { validateEncounter } from "../universal/validation.js";

/**
 * Retained grammar corpora describe the operation projection, never a model response.
 * A variant case input may add the stored Lemma candidates tf-demo passes; without
 * them the operation is called exactly as before. A case may also say whether
 * the Text has neighbouring Sentences and supply them, as tf-demo does.
 */
export function grammarOperationExperiment(
	definition: {
		source: LinguisticCorpus;
		evaluation: OperationExperiment<
			z.ZodType,
			z.ZodType,
			unknown
		>["evaluation"];
		evaluator: OperationExperiment<
			z.ZodType,
			z.ZodType,
			unknown
		>["evaluator"];
	},
	options: DumgenOptions,
): OperationExperiment<z.ZodType, z.ZodType, unknown> {
	const corpus = definition.source.goldenCorpus;
	if (!corpus) throw Error("Missing grammar corpus");
	const key = Object.entries(grammarPromptRoutes).find(
		([, route]) => route === definition.source.route,
	)?.[0];
	if (!key) throw Error("Unknown grammar operation route");
	const [language, family, kind] = key.split("/");
	return {
		corpus,
		evaluation: definition.evaluation,
		demonstrations: corpus.select(
			definition.source.demonstrations &&
				"ids" in definition.source.demonstrations
				? definition.source.demonstrations.ids
				: [],
		),
		evaluator: definition.evaluator,
		run: async (raw, { signal, recordTrace }) => {
			const input = raw as {
				markedContext: string;
				members: string[];
				lemmaCandidates?: readonly LemmaCandidate[];
				context?: SentenceContext;
				contextAvailable?: boolean;
			};
			const segments: Segment[] = [],
				members: number[] = [];
			for (const chunk of input.markedContext.split(
				/(<TARGET>.*?<\/TARGET>)/gu,
			)) {
				if (!chunk) continue;
				const marked = chunk.startsWith("<TARGET>");
				if (marked) members.push(segments.length);
				if (marked)
					segments.push({
						kind: "ResolvableText",
						text: chunk.slice(8, -9),
					});
				else
					for (const text of chunk.match(
						/\s+|[\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu,
					) ?? []) {
						// Intake splits a fused word into its pieces (ADR 0035).
						const fusion =
							language === "de"
								? fusionEntry(germanFusionTable, text)
								: undefined;
						for (const piece of fusion
							? fusedWordPieces(fusion, text)
							: [text])
							segments.push({
								kind: /^\s+$/u.test(piece)
									? "Whitespace"
									: /^[\p{L}\p{N}]/u.test(piece)
										? "ResolvableText"
										: "Punctuation",
								text: piece,
							});
					}
			}
			if (
				members.some(
					(position, index) =>
						segments[position]?.text !== input.members[index],
				) ||
				members.length !== input.members.length
			)
				throw Error(
					"Corpus member alignment differs from its marked context",
				);
			const encounter = validateEncounter({
				sentence: { id: "evaluation", language, segments },
				target: { family, kind, memberSegmentIndices: members },
			});
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					recordTrace(trace);
					options.onOperation?.(trace);
				},
			});
			const grammarInput: GrammarInput = {
				...encounter,
				...(input.context ? { context: input.context } : {}),
				...(input.contextAvailable === undefined
					? {}
					: { contextAvailable: input.contextAvailable }),
			};
			const result = await Effect.runPromise(
				Effect.either(
					input.lemmaCandidates
						? dumgen.resolveGrammar(
								grammarInput,
								input.lemmaCandidates,
							)
						: dumgen.resolveGrammar(grammarInput),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			const attestation = result.right;
			if ("decision" in attestation) return attestation;
			return grammarOutputOf(attestation);
		},
	};
}

/**
 * The compact grammar answer an Attestation stands for: what the evaluation
 * compares, and what the retained cases project from Spec Records.
 */
export function grammarOutputOf(attestation: Dumling.Attestation) {
	const {
		lemma,
		normalizedSurface,
		unitKind: _unit,
		language: _language,
		...surface
	} = attestation.surface;
	return {
		lemma: {
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		},
		surface,
		normalizedMembers: withValencyMembers(attestation, normalizedSurface),
		memberOrthographies: attestation.members.map(
			(member) => member.orthography,
		),
		realizationCoverage: attestation.realizationCoverage,
		...("articleEvidence" in attestation
			? { articleEvidence: attestation.articleEvidence }
			: {}),
		...("expletiveEvidence" in attestation
			? { expletiveEvidence: attestation.expletiveEvidence }
			: {}),
		...("valencyEvidence" in attestation
			? { valencyEvidence: attestation.valencyEvidence }
			: {}),
	};
}

/**
 * The normalized members behind a Surface that projects only Fixed members:
 * a member realizing a preposition slot is normalized to its preposition, and
 * a noun's owned article to the article form it stands for (ADR 0035). The
 * pieces of one fused word share a Surface word and split it by their letters
 * (`zu`, `m` in `zum`); an abbreviation takes its whole expansion
 * (`zum Beispiel` for `z.B.`).
 */
function withValencyMembers(
	attestation: Dumling.Attestation,
	normalizedSurface: string,
): string[] {
	const words = normalizedSurface.split(" ");
	const normalized = new Map<number, string>();
	if ("valencyEvidence" in attestation)
		for (const slot of attestation.valencyEvidence)
			if (slot.member !== null && slot.complement.kind === "Preposition")
				normalized.set(
					slot.member,
					slot.complement.preposition.canonicalForm,
				);
	const article = deriveNounArticle(attestation.surface);
	if (
		"articleEvidence" in attestation &&
		attestation.articleEvidence?.kind === "Owned" &&
		article
	)
		normalized.set(
			attestation.articleEvidence.member,
			article.surface.normalizedSurface,
		);
	const members: readonly Member[] = attestation.members;
	const groups: number[][] = [];
	for (const [position, member] of members.entries()) {
		if (normalized.has(position)) continue;
		const group = groups.at(-1);
		const previous = members[position - 1];
		if (
			group?.at(-1) === position - 1 &&
			previous?.orthography === "Fused" &&
			member.orthography === "Fused" &&
			previous.fusion.spelling === member.fusion.spelling &&
			previous.component + 1 === member.component
		)
			group.push(position);
		else groups.push([position]);
	}
	const surplus = words.length - groups.length;
	const expanded =
		surplus > 0
			? groups.findIndex((group) =>
					group.some(
						(position) =>
							members[position]?.orthography === "Shorthand",
					),
				)
			: -1;
	let next = 0;
	for (const [index, group] of groups.entries()) {
		const width = index === expanded ? surplus + 1 : 1;
		const word = Array.from(words.slice(next, next + width).join(" "));
		next += width;
		for (const [piece, position] of group.entries()) {
			const length =
				piece === group.length - 1
					? word.length
					: Array.from(members[position]?.attested ?? "").length;
			normalized.set(position, word.splice(0, length).join(""));
		}
	}
	return members.map((_, position) => normalized.get(position) ?? "");
}

type Member = Dumling.Attestation["members"][number];
