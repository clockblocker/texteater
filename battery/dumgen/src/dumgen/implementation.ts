import { recordTrace } from "common-utils/workflow";
import type { Attestation, Lemma, Reading } from "dumling-old/types";
import * as Effect from "effect/Effect";
import type { RUNTIME_PROMPT_CATALOG } from "../catalog/runtime-prompt-catalog";
import type { GeneratorCatalog } from "../generator/generator";
import { DumgenError } from "../generator/generator-error";
import { INTAKE_LIMITS, type IntakeTrace } from "../intake/contracts";
import {
	ParsingError,
	parseAsGermanAttestation,
	parseAsGrammaticalInput,
	parseAsGrammaticalResult,
	parseAsSegmentationResult,
	unwrapDumgenParse,
} from "../parsing/lightweight-parsers";
import type { ReadingCatalogMissFor } from "../production/contracts";
import {
	lemmaRouteFor,
	readingRouteFor,
	routeFor,
} from "../production/contracts";
import { dispatchProduction } from "../production/dispatcher";
import { isGermanReachableHighLevelRoute } from "../schema/german-high-level-routes";
import { projectGrammaticalResolutionInput } from "../schema/normalized-surface-projection";
import { segmentSource } from "../source-segmentation";
import type { SourceSegmentationTrace } from "../source-segmentation/contracts";
import type {
	AnalysisTarget,
	GrammaticalInput,
	GrammaticalResolution,
	GrammaticalResolutionInput,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
	Section1Error,
	SegmentationDecision,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
} from "../types";

type DumgenGenerators = GeneratorCatalog<typeof RUNTIME_PROMPT_CATALOG>;
export type DumgenSection1Trace = IntakeTrace | SourceSegmentationTrace;
type GrammaticalGenerator = (input: {
	readonly markedContext: string;
	readonly members: string[];
}) => Effect.Effect<GrammaticalResolution, DumgenError>;
type GrammaticalRouteKey<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
	Route = GrammaticalRoute<L>,
> =
	Route extends GrammaticalRoute<L>
		? Route extends {
				readonly family: string;
				readonly kind: string;
			}
			? `${L}/${Route["family"]}/${Route["kind"]}`
			: never
		: never;
export function createDumgenImplementation(generators: DumgenGenerators) {
	const targetClassificationRoutes = Object.freeze({
		de: generators.laboratory.targetClassification.de.highLevelWholeUnit,
	});
	const enabledGrammaticalRoutes: Readonly<
		Partial<Record<GrammaticalRouteKey, GrammaticalGenerator>>
	> = Object.freeze({
		"de/Lexeme/ADJ":
			generators.laboratory.grammaticalResolution.de.Lexeme.ADJ,
		"de/Lexeme/ADP":
			generators.laboratory.grammaticalResolution.de.Lexeme.ADP,
		"de/Lexeme/ADV":
			generators.laboratory.grammaticalResolution.de.Lexeme.ADV,
		"de/Lexeme/AUX":
			generators.laboratory.grammaticalResolution.de.Lexeme.AUX,
		"de/Lexeme/CCONJ":
			generators.laboratory.grammaticalResolution.de.Lexeme.CCONJ,
		"de/Lexeme/DET":
			generators.laboratory.grammaticalResolution.de.Lexeme.DET,
		"de/Lexeme/INTJ":
			generators.laboratory.grammaticalResolution.de.Lexeme.INTJ,
		"de/Lexeme/NOUN":
			generators.laboratory.grammaticalResolution.de.Lexeme.NOUN,
		"de/Lexeme/NUM":
			generators.laboratory.grammaticalResolution.de.Lexeme.NUM,
		"de/Lexeme/PART":
			generators.laboratory.grammaticalResolution.de.Lexeme.PART,
		"de/Lexeme/PRON":
			generators.laboratory.grammaticalResolution.de.Lexeme.PRON,
		"de/Lexeme/PROPN":
			generators.laboratory.grammaticalResolution.de.Lexeme.PROPN,
		"de/Lexeme/SCONJ":
			generators.laboratory.grammaticalResolution.de.Lexeme.SCONJ,
		"de/Lexeme/SYM":
			generators.laboratory.grammaticalResolution.de.Lexeme.SYM,
		"de/Lexeme/VERB":
			generators.laboratory.grammaticalResolution.de.Lexeme.VERB,
		"de/Lexeme/X": generators.laboratory.grammaticalResolution.de.Lexeme.X,
		"de/Phraseme/Aphorism":
			generators.laboratory.grammaticalResolution.de.Phraseme.Aphorism,
		"de/Phraseme/DiscourseFormula":
			generators.laboratory.grammaticalResolution.de.Phraseme
				.DiscourseFormula,
		"de/Phraseme/Idiom":
			generators.laboratory.grammaticalResolution.de.Phraseme.Idiom,
		"de/Phraseme/Proverb":
			generators.laboratory.grammaticalResolution.de.Phraseme.Proverb,
		"de/Construction/Fusion":
			generators.laboratory.grammaticalResolution.de.Construction.Fusion,
	});
	const readingRoutes = Object.freeze({
		de: generators.laboratory.readingResolution.de,
	});
	const resolvedGrammarBySentence = new WeakMap<
		SegmentedSentence<"de">,
		Map<number, CachedGrammaticalResolution>
	>();
	function segment(
		sourceSentences: readonly string[],
	): Effect.Effect<SegmentationResult, DumgenError> {
		return Effect.gen(function* () {
			const inputError = validateSegmentationInput(sourceSentences);
			if (inputError) {
				return unwrapDumgenParse(
					parseAsSegmentationResult({
						ok: false,
						error: inputError,
					}),
				);
			}
			const intake = yield* generators.laboratory.intake({
				items: sourceSentences.map((sourceText, index) => ({
					id: `item-${index}`,
					sourceText,
				})),
			});
			yield* recordTrace("section1", {
				phase: "intake",
				items: intake.items,
			});
			const decisions: SegmentationDecision[] = [];
			for (
				let itemIndex = 0;
				itemIndex < intake.items.length;
				itemIndex += 1
			) {
				const item = intake.items[itemIndex];
				if (!item) {
					throw invalidOutput("Validated Intake item is missing.");
				}
				if (item.decision !== "Accepted") {
					decisions.push(Object.freeze({ decision: item.decision }));
					continue;
				}
				if (!item.language) {
					throw invalidOutput(
						"Accepted Intake item has no language.",
					);
				}
				const source = segmentSource(item.language, item.stitchedText);
				yield* recordTrace("section1", {
					phase: "source-segmentation",
					itemIndex,
					language: item.language,
					stitchedText: item.stitchedText,
					segments: source.segments,
					rules: Object.freeze(source.trace.map(({ rule }) => rule)),
				});
				if (item.language === "de") {
					const sentence = Object.freeze({
						id: crypto.randomUUID() as SegmentedSentenceId,
						language: "de",
						segments: source.segments,
					}) satisfies SegmentedSentence<"de">;
					decisions.push(
						Object.freeze({
							decision: "Accepted",
							language: "de",
							sentence,
						}),
					);
				} else {
					const sentence = Object.freeze({
						id: crypto.randomUUID() as SegmentedSentenceId,
						language: "he",
						segments: source.segments,
					}) satisfies SegmentedSentence<"he">;
					decisions.push(
						Object.freeze({
							decision: "Accepted",
							language: "he",
							sentence,
						}),
					);
				}
			}
			return unwrapDumgenParse(
				parseAsSegmentationResult({ ok: true, value: decisions }),
			);
		});
	}
	function grammatical<L extends GrammaticalResolutionLanguage>(
		language: L,
		input: GrammaticalInput<L>,
	): Effect.Effect<GrammaticalResult<L>, DumgenError> {
		return Effect.gen(function* () {
			assertGrammaticalInput(language, input);
			const { sentence, clickedSegmentIndex } = input;
			const germanSentence = sentence as SegmentedSentence<"de">;
			const cached = resolvedGrammarBySentence
				.get(germanSentence)
				?.get(clickedSegmentIndex);
			if (cached) {
				return parseGrammaticalResult({
					decision: "Resolved",
					language,
					markedContext: cached.markedContext,
					attestation: cached.attestation,
					interaction: constructInteraction(
						germanSentence,
						clickedSegmentIndex,
						cached.target,
					),
				});
			}
			const targetClassifier = targetClassificationRoutes[language];
			if (!targetClassifier) {
				throw invalidInput(
					`Grammatical Resolution is not enabled for language ${language}.`,
				);
			}
			const target = yield* targetClassifier({
				clickedSegmentIndex,
				segments: sentence.segments.map(({ kind, text }) => ({
					kind,
					text,
				})),
			});
			if ("decision" in target) {
				return parseGrammaticalResult({
					decision: "Unresolved",
					language,
				});
			}
			assertTarget(sentence, clickedSegmentIndex, target);
			const routeKey =
				`${language}/${target.family}/${target.kind}` as const;
			const grammar =
				enabledGrammaticalRoutes[routeKey as GrammaticalRouteKey];
			if (!grammar) {
				return parseGrammaticalResult({
					decision: "NotImplemented",
					language,
					route: Object.freeze({
						family: target.family,
						kind: target.kind,
					}),
				});
			}
			const grammarInput = projectGrammaticalResolutionInput({
				segments: sentence.segments,
				memberSegmentIndices: target.memberSegmentIndices as readonly [
					number,
					...number[],
				],
			});
			const route = lemmaRouteFor(target);
			const { isClosedRouteFor } = yield* Effect.promise(
				() => import("dumling-old"),
			);
			const resolutionOrMiss = yield* dispatchProduction<
				| GrammaticalResolution
				| Extract<
						GrammaticalResult<"de">,
						{
							decision: "CatalogMiss";
						}
				  >
			>({
				closed: isClosedRouteFor.lemma(route),
				runOpen: () =>
					Effect.gen(function* () {
						const candidate = yield* generateGrammaticalCandidate(
							grammar,
							grammarInput,
							target,
						);
						const { fixedPopulationFor } = yield* Effect.promise(
							() => import("dumling-old/fixed"),
						);
						const fixedLemma = fixedPopulationFor
							.lemma(route)
							?.members.find((member) =>
								sameLemma(member, candidate.surface.lemma),
							);
						return fixedLemma
							? withFixedLemma(candidate, fixedLemma)
							: candidate;
					}),
				runClosed: () =>
					Effect.gen(function* () {
						const { fixedMembersFor } = yield* Effect.promise(
							() => import("dumling-old/fixed"),
						);
						const candidate = yield* generateGrammaticalCandidate(
							grammar,
							grammarInput,
							target,
						);
						const catalog = fixedMembersFor.lemma(route);
						if (!catalog) {
							return Object.freeze({
								decision: "CatalogMiss",
								reason: "InventoryNotLoaded",
								language: "de",
								route: routeFor(target),
								stage: "Lemma",
								candidate: candidate.surface.lemma,
							});
						}
						const fixedLemma = catalog.members.find((member) =>
							sameLemma(member, candidate.surface.lemma),
						);
						if (!fixedLemma) {
							return Object.freeze({
								decision: "CatalogMiss",
								reason: "MemberNotCatalogued",
								language: "de",
								route: routeFor(target),
								stage: "Lemma",
								candidate: candidate.surface.lemma,
							});
						}
						return withFixedLemma(candidate, fixedLemma);
					}),
			});
			if ("decision" in resolutionOrMiss) {
				return parseGrammaticalResult(
					resolutionOrMiss,
				) as GrammaticalResult<L>;
			}
			const resolution = resolutionOrMiss;
			const attestation = constructAttestation(
				germanSentence,
				target,
				resolution,
			);
			if (attestation.surface.language !== language) {
				throw invalidOutput(
					"Grammatical Resolution returned an Attestation in another language.",
				);
			}
			const result = parseGrammaticalResult<L>({
				decision: "Resolved",
				language,
				markedContext: grammarInput.markedContext,
				attestation,
				interaction: constructInteraction(
					germanSentence,
					clickedSegmentIndex,
					target,
				),
			});
			const cachedResolution = Object.freeze({
				target,
				attestation,
				markedContext: grammarInput.markedContext,
			});
			const cachedByMember =
				resolvedGrammarBySentence.get(germanSentence) ??
				new Map<number, CachedGrammaticalResolution>();
			for (const memberIndex of target.memberSegmentIndices) {
				cachedByMember.set(memberIndex, cachedResolution);
			}
			resolvedGrammarBySentence.set(germanSentence, cachedByMember);
			return result;
		});
	}
	function reading<L extends ReadingResolutionLanguage>(
		language: L,
		input: ReadingInput<L>,
	): Effect.Effect<ReadingResolution, DumgenError> {
		return Effect.gen(function* () {
			if (language !== "de" || !readingRoutes[language]) {
				throw invalidInput(
					`Reading Resolution is not enabled for language ${language}.`,
				);
			}
			if (
				typeof input !== "object" ||
				input === null ||
				typeof input.markedContext !== "string" ||
				input.markedContext.length === 0 ||
				typeof input.lemma !== "object" ||
				input.lemma === null ||
				input.lemma.language !== "de" ||
				typeof input.lemma.canonicalForm !== "string" ||
				input.lemma.canonicalForm.length === 0 ||
				!Array.isArray(input.existingEmojiDescriptions)
			) {
				throw invalidInput("Reading Resolution input is invalid.");
			}
			const germanInput = input as unknown as ReadingInput<"de">;
			const route = lemmaRouteFor(germanInput.lemma);
			const { isClosedRouteFor } = yield* Effect.promise(
				() => import("dumling-old"),
			);
			const runOpen = (): Effect.Effect<ReadingResolution, DumgenError> =>
				Effect.gen(function* () {
					const { fixedPopulationFor } = yield* Effect.promise(
						() => import("dumling-old/fixed"),
					);
					const fixed = fixedPopulationFor.reading(germanInput.lemma);
					if (fixed?.members.length === 1) {
						return readingSuccess(
							fixed.members[0] as Reading<"de">,
							germanInput.existingEmojiDescriptions,
						);
					}
					const candidate = yield* generateReadingCandidate(
						readingRoutes.de,
						generators.laboratory.readingGeneration.de,
						germanInput,
					);
					return readingSuccess(
						candidate,
						germanInput.existingEmojiDescriptions,
					);
				});
			return yield* dispatchProduction<ReadingResolution>({
				closed: isClosedRouteFor.reading(route),
				runOpen,
				runClosed: () =>
					Effect.gen(function* () {
						const { fixedMembersFor } = yield* Effect.promise(
							() => import("dumling-old/fixed"),
						);
						const catalog = fixedMembersFor.reading(
							germanInput.lemma,
						);
						if (catalog?.members.length === 1) {
							return readingSuccess(
								catalog.members[0] as Reading<"de">,
								germanInput.existingEmojiDescriptions,
							);
						}
						const candidate = yield* generateReadingCandidate(
							readingRoutes.de,
							generators.laboratory.readingGeneration.de,
							germanInput,
						);
						if (!catalog) {
							return catalogMissForReading(
								"InventoryNotLoaded",
								candidate,
							);
						}
						const fixedReading = catalog.members.find(
							(member) =>
								member.emojiDescription ===
								candidate.emojiDescription,
						);
						return fixedReading
							? readingSuccess(
									fixedReading as Reading<"de">,
									germanInput.existingEmojiDescriptions,
								)
							: catalogMissForReading(
									"MemberNotCatalogued",
									candidate,
								);
					}),
			});
		});
	}
	return Object.freeze({
		segment,
		resolve: Object.freeze({ grammatical, reading }),
	});
}
function withFixedLemma(
	candidate: GrammaticalResolution,
	fixedLemma: Lemma,
): GrammaticalResolution {
	return Object.freeze({
		...candidate,
		surface: Object.freeze({
			...candidate.surface,
			lemma: fixedLemma,
		}),
	}) as GrammaticalResolution;
}
type CachedGrammaticalResolution = {
	readonly target: AnalysisTarget;
	readonly attestation: Attestation<"de">;
	readonly markedContext: string;
};
function generateGrammaticalCandidate(
	grammar: GrammaticalGenerator,
	input: GrammaticalResolutionInput,
	target: AnalysisTarget,
): Effect.Effect<GrammaticalResolution, DumgenError> {
	return Effect.gen(function* () {
		const resolution = yield* grammar({
			markedContext: input.markedContext,
			members: [...input.members],
		});
		assertGrammaticalResolution(target, resolution);
		return resolution;
	});
}
function generateReadingCandidate(
	generate: (input: {
		readonly markedContext: string;
		readonly lemma: string;
		readonly existingEmojiDescriptions: readonly string[];
	}) => Effect.Effect<
		Readonly<{
			emojiDescription: string;
		}>,
		DumgenError
	>,
	generateNew: (input: {
		readonly markedContext: string;
		readonly lemma: string;
	}) => Effect.Effect<Readonly<{ emojiDescription: string }>, DumgenError>,
	input: ReadingInput<"de">,
): Effect.Effect<Reading<"de">, DumgenError> {
	return Effect.gen(function* () {
		const generated = yield* input.existingEmojiDescriptions.length === 0
			? generateNew({
					markedContext: input.markedContext,
					lemma: input.lemma.canonicalForm,
				})
			: generate({
					markedContext: input.markedContext,
					lemma: input.lemma.canonicalForm,
					existingEmojiDescriptions: [
						...input.existingEmojiDescriptions,
					],
				});
		return Object.freeze({
			lemma: input.lemma,
			emojiDescription: generated.emojiDescription,
		}) as Reading<"de">;
	});
}
function readingSuccess(
	reading: Reading<"de">,
	existingEmojiDescriptions: readonly string[],
): ReadingResolution {
	return Object.freeze({
		decision: existingEmojiDescriptions.includes(reading.emojiDescription)
			? "Reuse"
			: "New",
		emojiDescription: reading.emojiDescription,
	});
}
function catalogMissForReading<Value extends Reading<"de">>(
	reason: "MemberNotCatalogued" | "InventoryNotLoaded",
	candidate: Value,
): ReadingCatalogMissFor<Value> {
	return Object.freeze({
		decision: "CatalogMiss",
		reason,
		language: "de",
		route: readingRouteFor(candidate),
		stage: "Reading",
		candidate,
	}) as ReadingCatalogMissFor<Value>;
}
function sameLemma(left: Lemma, right: Lemma): boolean {
	if (
		left.language !== right.language ||
		left.family !== right.family ||
		left.kind !== right.kind ||
		left.canonicalForm !== right.canonicalForm
	) {
		return false;
	}
	const leftFeatures = left.coreFeatures as Readonly<Record<string, unknown>>;
	const rightFeatures = right.coreFeatures as Readonly<
		Record<string, unknown>
	>;
	const keys = Object.keys(leftFeatures);
	if (keys.length !== Object.keys(rightFeatures).length) return false;
	return keys.every((key) => {
		const leftValue = leftFeatures[key];
		const rightValue = rightFeatures[key];
		return Array.isArray(leftValue) && Array.isArray(rightValue)
			? leftValue.length === rightValue.length &&
					leftValue.every(
						(value, index) => value === rightValue[index],
					)
			: leftValue === rightValue;
	});
}
function assertGrammaticalInput<L extends GrammaticalResolutionLanguage>(
	language: L,
	input: GrammaticalInput<L>,
): void {
	if (
		language !== "de" ||
		parseAsGrammaticalInput(input, language) instanceof ParsingError
	) {
		throw invalidInput(
			"The explicit language must match a valid Grammatical Input.",
		);
	}
}
function parseGrammaticalResult<L extends GrammaticalResolutionLanguage>(
	value: object,
): GrammaticalResult<L>;
function parseGrammaticalResult(value: object): GrammaticalResult<"de"> {
	assertValidGermanGrammaticalResult(value);
	return Object.freeze(value);
}
function assertValidGermanGrammaticalResult(
	value: object,
): asserts value is GrammaticalResult<"de"> {
	const parsed = parseAsGrammaticalResult(value, "de");
	if (parsed instanceof ParsingError)
		throw invalidOutput(
			"Grammatical Resolution produced an invalid public result.",
			parsed,
		);
}
function assertTarget(
	sentence: SegmentedSentence<"de">,
	clickedSegmentIndex: number,
	target: AnalysisTarget,
): void {
	if (
		!isGermanReachableHighLevelRoute(target.family, target.kind) ||
		target.memberSegmentIndices.length === 0 ||
		!target.memberSegmentIndices.includes(clickedSegmentIndex)
	) {
		throw invalidOutput("Target Classification returned an invalid route.");
	}
	for (
		let position = 0;
		position < target.memberSegmentIndices.length;
		position += 1
	) {
		const index = target.memberSegmentIndices[position];
		if (
			!Number.isInteger(index) ||
			index === undefined ||
			(position > 0 &&
				index <= (target.memberSegmentIndices[position - 1] ?? -1)) ||
			sentence.segments[index]?.kind !== "ResolvableText"
		) {
			throw invalidOutput(
				"Target members must be ordered, unique, in-bounds ResolvableText Segment indices.",
			);
		}
	}
}
function assertGrammaticalResolution(
	target: AnalysisTarget,
	resolution: GrammaticalResolution,
): void {
	if (
		resolution.surface.language !== "de" ||
		resolution.surface.lemma.language !== "de" ||
		resolution.surface.lemma.family !== target.family ||
		resolution.surface.lemma.kind !== target.kind
	) {
		throw invalidOutput(
			"Grammatical Resolution did not preserve its language, Family, and Kind route.",
		);
	}
	if (
		resolution.memberOrthographies.length !==
		target.memberSegmentIndices.length
	) {
		throw invalidOutput(
			"Grammatical Resolution must return one orthography per target member.",
		);
	}
}
function constructAttestation(
	sentence: SegmentedSentence<"de">,
	target: AnalysisTarget,
	resolution: GrammaticalResolution,
): Attestation<"de"> {
	const value = {
		members: target.memberSegmentIndices.map((segmentIndex, position) => ({
			attested: sentence.segments[segmentIndex]?.text,
			orthography: resolution.memberOrthographies[position],
		})),
		realizationCoverage: resolution.realizationCoverage,
		surface: resolution.surface,
	};
	const parsed = parseAsGermanAttestation(value);
	if (parsed instanceof ParsingError) {
		throw invalidOutput(
			"Grammatical Resolution could not construct a valid Attestation.",
			parsed,
		);
	}
	return parsed;
}
function constructInteraction(
	sentence: SegmentedSentence<"de">,
	clickedSegmentIndex: number,
	target: AnalysisTarget,
) {
	return Object.freeze({
		segmentedSentenceId: sentence.id,
		clickedSegmentIndex,
		memberSegmentIndices: Object.freeze([
			...target.memberSegmentIndices,
		]) as readonly [number, ...number[]],
	});
}
function validateSegmentationInput(
	value: readonly string[],
): Section1Error | undefined {
	if (!Array.isArray(value) || value.length === 0) {
		return Object.freeze({
			code: "InvalidInput",
			message:
				"Expected a non-empty batch of caller-delimited source sentences.",
		});
	}
	if (value.length > INTAKE_LIMITS.maxBatchSize) {
		return Object.freeze({
			code: "InvalidInput",
			message: `Intake accepts at most ${INTAKE_LIMITS.maxBatchSize} sentences per batch.`,
		});
	}
	for (let itemIndex = 0; itemIndex < value.length; itemIndex += 1) {
		const sentence = value[itemIndex];
		if (typeof sentence !== "string" || sentence.trim().length === 0) {
			return Object.freeze({
				code: "InvalidInput",
				itemIndex,
				message:
					"Every Intake item must be a non-empty source sentence.",
			});
		}
		if ([...sentence].length > INTAKE_LIMITS.maxCodePointsPerSentence) {
			return Object.freeze({
				code: "InvalidInput",
				itemIndex,
				message: `An Intake item may contain at most ${INTAKE_LIMITS.maxCodePointsPerSentence} Unicode code points.`,
			});
		}
		if (
			sentence.trim().split(/\s+/u).length >
			INTAKE_LIMITS.maxWordsPerSentence
		) {
			return Object.freeze({
				code: "InvalidInput",
				itemIndex,
				message: `An Intake item may contain at most ${INTAKE_LIMITS.maxWordsPerSentence} whitespace-delimited words.`,
			});
		}
	}
	return undefined;
}
function invalidInput(message: string): DumgenError {
	return new DumgenError("invalid-input", message);
}
function invalidOutput(message: string, cause?: unknown): DumgenError {
	return new DumgenError(
		"invalid-output",
		message,
		cause === undefined ? undefined : { cause },
	);
}
