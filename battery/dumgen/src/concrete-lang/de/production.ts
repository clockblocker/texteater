import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type {
	AnalysisTarget,
	Dumgen,
	DumgenOptions,
	Encounter,
	GrammarInput,
	KnowledgeProduction,
	KnowledgeRequest,
	LemmaCandidate,
	KnowledgeInput as PublicKnowledgeInput,
	SegmentedSentence,
} from "../../types.js";
import { DumgenFailure } from "../../universal/failure.js";
import { operation, type RequestBudget } from "../../universal/trace.js";
import {
	markedContext,
	parse,
	validateEncounter,
} from "../../universal/validation.js";
import { authoredFor, closedRoute } from "./authored-closed-sets/select.js";
import { resolveGrammarJudgments } from "./grammatical-resolution/judgments.js";
import { attestedMember } from "./grammatical-resolution/member-spelling.js";
import { normalizeGrammarSurface } from "./grammatical-resolution/project.js";
import type { ReferentMode } from "./grammatical-resolution/referent.js";
import { produceKnowledge } from "./knowledge-production/produce.js";
import { resolveReading } from "./reading-emoji-description/resolve.js";
import { assertFusedWordsSplit } from "./segmentation/fused-word-guard.js";
import { analyzeGermanSentence } from "./sentence-analysis/operation.js";
import { classifyGermanTarget } from "./target-classification/judgments.js";

function routeOf(encounter: Encounter): string {
	return `${encounter.sentence.language}/${encounter.target.family}/${encounter.target.kind}`;
}
function agreement(
	encounter: Encounter,
	lemma: Dumling.Lemma,
	stage: string,
): void {
	if (
		lemma.language !== encounter.sentence.language ||
		lemma.family !== encounter.target.family ||
		lemma.kind !== encounter.target.kind
	)
		throw new DumgenFailure(
			"InvalidInput",
			stage,
			"Encounter and Lemma routes disagree",
			routeOf(encounter),
		);
}
function supported(encounter: Encounter, stage: string): void {
	if (encounter.sentence.language !== "de")
		throw new DumgenFailure(
			"NotImplemented",
			stage,
			"Production is not enabled for this Language",
			routeOf(encounter),
		);
}
/**
 * One Sentence while more exists may ask for context; supplied context, or
 * none to supply, must answer.
 */
function referentMode(input: GrammarInput): ReferentMode {
	const { context, contextAvailable = true } = input;
	const invalid = (message: string) =>
		new DumgenFailure("InvalidInput", "resolveGrammar", message);
	if (typeof contextAvailable !== "boolean")
		throw invalid("contextAvailable is a boolean");
	if (context === undefined)
		return contextAvailable
			? { mode: "MayAskForContext" }
			: { mode: "MustAnswer" };
	if (
		!context ||
		typeof context !== "object" ||
		Object.keys(context).some(
			(key) => key !== "before" && key !== "after",
		) ||
		Object.values(context).some(
			(text) => typeof text !== "string" || !text.trim(),
		)
	)
		throw invalid(
			"context holds the non-empty Sentences before and after the Encounter's",
		);
	return { mode: "MustAnswer", context };
}
type EmojiInput = {
	encounter: Encounter;
	lemma: Dumling.Lemma;
	candidates: readonly string[];
};
type KnowledgeInput = {
	encounter: Encounter;
	reading: Dumling.Reading;
	request: KnowledgeRequest;
};

/** German owns its dispatch and model-call grouping behind the shared encounter contract. */
export function createGermanOperations(
	options: DumgenOptions,
	budget: RequestBudget,
): Omit<Dumgen, "segment" | "segmentSentence"> {
	const task = operation(options, budget);
	const operations = {
		analyzeSentence(raw: { sentence: SegmentedSentence<"de"> }) {
			return task("analyzeSentence", raw, (scope) => {
				const input = parse<typeof raw>(
					"analyzeInputSchema",
					raw,
					"analyzeSentence",
				);
				assertFusedWordsSplit(input.sentence, "analyzeSentence");
				return analyzeGermanSentence(options, input.sentence, scope);
			});
		},
		classifyTarget<L extends Dumling.Language>(raw: {
			sentence: SegmentedSentence<L>;
			clickedSegmentIndex: number;
		}) {
			return task("classifyTarget", raw, (scope) => {
				const input = parse<typeof raw>(
					"classifyInputSchema",
					raw,
					"classifyTarget",
				);
				if (
					input.sentence.segments[input.clickedSegmentIndex]?.kind !==
					"ResolvableText"
				)
					throw new DumgenFailure(
						"InvalidInput",
						"classifyTarget",
						"Click must reference a ResolvableText segment",
					);
				if (input.sentence.language !== "de")
					throw new DumgenFailure(
						"NotImplemented",
						"classifyTarget",
						"Target Classification is not enabled for this Language",
					);
				assertFusedWordsSplit(input.sentence, "classifyTarget");
				return classifyGermanTarget(
					options,
					input,
					scope,
				) as Effect.Effect<AnalysisTarget<L>, DumgenFailure>;
			});
		},
		resolveGrammar: (<L extends Dumling.Language>(
			raw: GrammarInput<L>,
			lemmaCandidates: readonly LemmaCandidate<L>[] = [],
		) => {
			return task(
				"resolveGrammar",
				{ ...raw, lemmaCandidates },
				(scope) =>
					Effect.gen(function* () {
						if (lemmaCandidates.length > 64)
							throw new DumgenFailure(
								"InvalidInput",
								"resolveGrammar",
								"At most 64 stored Lemma candidates are supported",
							);
						const candidates = lemmaCandidates.map(
							({ lemma, foundUnder }) => {
								if (
									!Array.isArray(foundUnder) ||
									!foundUnder.every(
										(text) =>
											typeof text === "string" && text,
									)
								)
									throw new DumgenFailure(
										"InvalidInput",
										"resolveGrammar",
										"A Lemma candidate names the non-empty texts it was found under",
									);
								return {
									lemma: parse<Dumling.Lemma>(
										"lemmaSchema",
										lemma,
										"resolveGrammar",
									),
									foundUnder,
								};
							},
						);
						const mode = referentMode(raw);
						const {
							context: _context,
							contextAvailable: _available,
							...bare
						} = raw;
						const encounter = validateEncounter(
							bare,
							"resolveGrammar",
						);
						supported(encounter, "resolveGrammar");
						const route = routeOf(encounter),
							input = markedContext(encounter);
						const output = yield* resolveGrammarJudgments(
							options,
							encounter,
							scope,
							candidates,
							mode,
						);
						if ("decision" in output) return output;
						const normalizedSurface = normalizeGrammarSurface(
							input,
							output,
							encounter.target,
						);
						const lemma = parse<Dumling.Lemma>(
							"lemmaSchema",
							{
								...output.lemma,
								unitKind: "Lemma",
								language: encounter.sentence.language,
								family: encounter.target.family,
								kind: encounter.target.kind,
							},
							"resolveGrammar",
							true,
						);
						const authored = authoredFor(lemma);
						if (closedRoute(lemma) && !authored)
							throw new DumgenFailure(
								"CatalogMiss",
								"resolveGrammar",
								"Resolved Lemma is outside the Fixed Catalog",
								route,
							);
						if (
							output.realizationCoverage !== "Full" &&
							lemma.family !== "Phraseme" &&
							lemma.kind !== "NOUN"
						)
							throw new DumgenFailure(
								"InvalidModelOutput",
								"resolveGrammar",
								"Partial realization requires a Phraseme or licensed shared noun article",
								route,
							);
						return parse<Dumling.Attestation<L>>(
							"attestationSchema",
							{
								unitKind: "Attestation",
								surface: {
									...output.surface,
									unitKind: "Surface",
									language: encounter.sentence.language,
									lemma: authored?.lemma ?? lemma,
									normalizedSurface,
								},
								members:
									encounter.target.memberSegmentIndices.map(
										(index, position) =>
											attestedMember(
												encounter,
												index,
												output.memberOrthographies[
													position
												] ?? "Standard",
												output.pieceReadings ??
													new Map(),
											),
									),
								realizationCoverage: output.realizationCoverage,
								...("expletiveEvidence" in output
									? {
											expletiveEvidence:
												output.expletiveEvidence,
										}
									: {}),
								...("valencyEvidence" in output
									? {
											valencyEvidence:
												output.valencyEvidence ?? [],
										}
									: {}),
								...(lemma.kind === "NOUN"
									? {
											articleEvidence:
												output.articleEvidence ?? null,
										}
									: {}),
								...(lemma.kind === "ADP"
									? {
											valencyEvidence:
												output.valencyEvidence ?? [],
										}
									: {}),
							},
							"resolveGrammar",
							true,
						);
					}),
			);
		}) as Dumgen["resolveGrammar"],
		resolveOrGenerateReadingEmojiDescription(raw: EmojiInput) {
			return task(
				"resolveOrGenerateReadingEmojiDescription",
				raw,
				(scope) => {
					const stage = "resolveOrGenerateReadingEmojiDescription";
					const input = parse<EmojiInput>(
						"comparisonInput",
						raw,
						stage,
					);
					const encounter = validateEncounter(input.encounter, stage);
					agreement(encounter, input.lemma, stage);
					supported(encounter, stage);
					return resolveReading(
						options,
						{ ...input, encounter },
						scope,
					);
				},
			);
		},
		produceKnowledge<I extends PublicKnowledgeInput>(raw: I) {
			return task("produceKnowledge", raw, (scope) => {
				const input = parse<KnowledgeInput>(
					"knowledgeInput",
					raw,
					"produceKnowledge",
				);
				const encounter = validateEncounter(
					input.encounter,
					"produceKnowledge",
				);
				agreement(encounter, input.reading.lemma, "produceKnowledge");
				supported(encounter, "produceKnowledge");
				return produceKnowledge(
					options,
					{ ...input, encounter },
					scope,
				) as Effect.Effect<
					KnowledgeProduction<I["reading"]["lemma"]["language"]>,
					DumgenFailure
				>;
			});
		},
	};
	// Each operation validates correlated canonical inputs before dispatch; its
	// selected Language is preserved when constructing the corresponding output.
	return operations;
}
