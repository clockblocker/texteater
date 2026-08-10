import { schemasFor } from "dumling/schema";
import type { Attestation, Lemma, Surface } from "dumling/types";

import type { PROMPT_CATALOG } from "../catalog/prompt-catalog";
import type { GeneratorCatalog } from "../generator/generator";
import { DumgenError } from "../generator/generator-error";
import { INTAKE_LIMITS, type IntakeTrace } from "../intake/contracts";
import { isGermanReachableHighLevelRoute } from "../schema/german-high-level-routes";
import {
	constructNormalizedSurface,
	NormalizedSurfaceProjectionError,
} from "../schema/normalized-surface-projection";
import { segmentSource } from "../source-segmentation";
import type { SourceSegmentationTrace } from "../source-segmentation/contracts";
import type {
	AnalysisTarget,
	GrammaticalInput,
	GrammaticalResolution,
	GrammaticalResolutionLanguage,
	GrammaticalResult,
	GrammaticalRoute,
	ReadingInput,
	ReadingResolution,
	ReadingResolutionLanguage,
	Section1Error,
	Segment,
	SegmentationDecision,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
} from "../types";

type DumgenGenerators = GeneratorCatalog<typeof PROMPT_CATALOG>;
export type DumgenSection1Trace = IntakeTrace | SourceSegmentationTrace;
type DumgenImplementationOptions = Readonly<{
	readonly onSection1Trace?: (trace: DumgenSection1Trace) => void;
}>;
type GrammaticalGenerator = (input: {
	readonly markedContext: string;
}) => Promise<GrammaticalResolution>;
type GrammaticalRouteKey<
	L extends GrammaticalResolutionLanguage = GrammaticalResolutionLanguage,
	Route = GrammaticalRoute<L>,
> =
	Route extends GrammaticalRoute<L>
		? Route extends { readonly family: string; readonly kind: string }
			? `${L}/${Route["family"]}/${Route["kind"]}`
			: never
		: never;

export function createDumgenImplementation(
	generators: DumgenGenerators,
	options: DumgenImplementationOptions = {},
) {
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
		"de/Phraseme/Collocation":
			generators.laboratory.grammaticalResolution.de.Phraseme.Collocation,
		"de/Phraseme/DiscourseFormula":
			generators.laboratory.grammaticalResolution.de.Phraseme
				.DiscourseFormula,
		"de/Phraseme/Idiom":
			generators.laboratory.grammaticalResolution.de.Phraseme.Idiom,
		"de/Phraseme/Proverb":
			generators.laboratory.grammaticalResolution.de.Phraseme.Proverb,
		"de/Construction/Fusion":
			generators.laboratory.grammaticalResolution.de.Construction.Fusion,
		"de/Construction/PairedFrame":
			generators.laboratory.grammaticalResolution.de.Construction
				.PairedFrame,
	});
	const readingRoutes = Object.freeze({
		de: generators.laboratory.readingResolution.de,
	});
	const resolvedGrammarBySentence = new WeakMap<
		SegmentedSentence<"de">,
		Map<number, CachedGrammaticalResolution>
	>();

	async function segment(
		sourceSentences: readonly string[],
	): Promise<SegmentationResult> {
		const inputError = validateSegmentationInput(sourceSentences);
		if (inputError) return Object.freeze({ ok: false, error: inputError });

		let intake: Awaited<ReturnType<typeof generators.laboratory.intake>>;
		try {
			intake = await generators.laboratory.intake({
				items: sourceSentences.map((sourceText, index) => ({
					id: `item-${index}`,
					sourceText,
				})),
			});
		} catch (cause) {
			const error =
				cause instanceof DumgenError
					? cause
					: new DumgenError("provider-error", "Intake failed.", {
							cause,
						});
			return Object.freeze({
				ok: false,
				error: Object.freeze({
					code: "IntakeFailure",
					reason: error.code,
					message: error.message,
				}),
			});
		}

		notifySection1(options, {
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
				throw invalidOutput("Accepted Intake item has no language.");
			}

			const source = segmentSource(item.language, item.stitchedText);
			notifySection1(options, {
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

		return Object.freeze({ ok: true, value: Object.freeze(decisions) });
	}

	async function grammatical<L extends GrammaticalResolutionLanguage>(
		language: L,
		input: GrammaticalInput<L>,
	): Promise<GrammaticalResult<L>> {
		assertGrammaticalInput(language, input);
		const { sentence, clickedSegmentIndex } = input;
		const germanSentence = sentence as SegmentedSentence<"de">;
		const cached = resolvedGrammarBySentence
			.get(germanSentence)
			?.get(clickedSegmentIndex);
		if (cached) {
			return Object.freeze({
				decision: "Resolved",
				language,
				markedContext: cached.markedContext,
				attestation: cached.attestation,
				interaction: constructInteraction(
					germanSentence,
					clickedSegmentIndex,
					cached.target,
				),
			}) as GrammaticalResult<L>;
		}
		const targetClassifier = targetClassificationRoutes[language];
		if (!targetClassifier) {
			throw invalidInput(
				`Grammatical Resolution is not enabled for language ${language}.`,
			);
		}

		const target = await targetClassifier({
			clickedSegmentIndex,
			segments: sentence.segments.map(({ kind, text }) => ({
				kind,
				text,
			})),
		});
		if ("decision" in target) {
			return Object.freeze({ decision: "Unresolved", language });
		}
		assertTarget(sentence, clickedSegmentIndex, target);

		const routeKey = `${language}/${target.family}/${target.kind}` as const;
		const grammar =
			enabledGrammaticalRoutes[routeKey as GrammaticalRouteKey];
		if (!grammar) {
			return Object.freeze({
				decision: "NotImplemented",
				language,
				route: Object.freeze({
					family: target.family,
					kind: target.kind,
				}),
			}) as GrammaticalResult<L>;
		}

		const markedContext = constructMarkedContext(
			sentence.segments,
			target.memberSegmentIndices,
		);
		const resolution = await grammar({ markedContext });
		if (resolution.decision === "Unresolved") {
			return Object.freeze({ decision: "Unresolved", language });
		}
		assertGrammaticalResolution(target, resolution);

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
		const cachedResolution = Object.freeze({
			target,
			attestation,
			markedContext,
		});
		const cachedByMember =
			resolvedGrammarBySentence.get(germanSentence) ??
			new Map<number, CachedGrammaticalResolution>();
		for (const memberIndex of target.memberSegmentIndices) {
			cachedByMember.set(memberIndex, cachedResolution);
		}
		resolvedGrammarBySentence.set(germanSentence, cachedByMember);

		return Object.freeze({
			decision: "Resolved",
			language,
			markedContext,
			attestation,
			interaction: constructInteraction(
				germanSentence,
				clickedSegmentIndex,
				target,
			),
		}) as GrammaticalResult<L>;
	}

	async function reading<L extends ReadingResolutionLanguage>(
		language: L,
		input: ReadingInput,
	): Promise<ReadingResolution> {
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
			typeof input.lemma !== "string" ||
			input.lemma.length === 0 ||
			!Array.isArray(input.existingEmojiDescriptions)
		) {
			throw invalidInput("Reading Resolution input is invalid.");
		}

		const generated = await readingRoutes[language]({
			markedContext: input.markedContext,
			lemma: input.lemma,
			existingEmojiDescriptions: [...input.existingEmojiDescriptions],
		});
		const decision = input.existingEmojiDescriptions.includes(
			generated.emojiDescription,
		)
			? "Reuse"
			: "New";
		return Object.freeze({
			decision,
			emojiDescription: generated.emojiDescription,
		});
	}

	return Object.freeze({
		segment,
		resolve: Object.freeze({ grammatical, reading }),
	});
}

type CachedGrammaticalResolution = {
	readonly target: AnalysisTarget;
	readonly attestation: Attestation<"de">;
	readonly markedContext: string;
};

function assertGrammaticalInput<L extends GrammaticalResolutionLanguage>(
	language: L,
	input: GrammaticalInput<L>,
): void {
	if (language !== "de") {
		throw invalidInput(
			`Grammatical Resolution is not enabled for language ${language}.`,
		);
	}
	const sentence = input?.sentence;
	if (
		typeof sentence !== "object" ||
		sentence === null ||
		sentence.language !== language ||
		typeof sentence.id !== "string" ||
		sentence.id.length === 0 ||
		!Array.isArray(sentence.segments)
	) {
		throw invalidInput(
			"The explicit language must match a valid Segmented Sentence.",
		);
	}

	for (const segment of sentence.segments) {
		if (
			!segment ||
			typeof segment.text !== "string" ||
			segment.text.length === 0 ||
			!isSegmentKind(segment.kind) ||
			(segment.kind === "Whitespace" && segment.text !== " ")
		) {
			throw invalidInput(
				"The Segmented Sentence contains an invalid Segment aggregate.",
			);
		}
	}

	if (
		!Number.isInteger(input.clickedSegmentIndex) ||
		input.clickedSegmentIndex < 0 ||
		sentence.segments[input.clickedSegmentIndex]?.kind !== "ResolvableText"
	) {
		throw invalidInput(
			"The clicked index must reference a ResolvableText Segment.",
		);
	}
}

function isSegmentKind(value: unknown): boolean {
	return (
		value === "ResolvableText" ||
		value === "OpaqueText" ||
		value === "Whitespace" ||
		value === "Punctuation"
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
	resolution: Extract<
		GrammaticalResolution,
		{ readonly decision: "Resolved" }
	>,
): void {
	if (
		resolution.lemma.language !== "de" ||
		resolution.lemma.family !== target.family ||
		resolution.lemma.kind !== target.kind ||
		resolution.surface.language !== "de"
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
	resolution: Extract<
		GrammaticalResolution,
		{ readonly decision: "Resolved" }
	>,
): Attestation<"de"> {
	let normalizedSurface: string;
	try {
		normalizedSurface = constructNormalizedSurface({
			attestedMembers: target.memberSegmentIndices.map(
				(segmentIndex) => sentence.segments[segmentIndex]?.text ?? "",
			),
			normalizedMembers: resolution.normalizedMembers,
			memberOrthographies: resolution.memberOrthographies,
		});
	} catch (cause) {
		if (cause instanceof NormalizedSurfaceProjectionError) {
			throw invalidOutput(cause.message, cause);
		}
		throw cause;
	}
	const linkedSurface = {
		...resolution.surface,
		normalizedSurface,
		lemma: resolution.lemma,
	} as Surface<"de">;
	const value = {
		members: target.memberSegmentIndices.map((segmentIndex, position) => ({
			attested: sentence.segments[segmentIndex]?.text,
			orthography: resolution.memberOrthographies[position],
		})),
		realizationCoverage: resolution.realizationCoverage,
		surface: linkedSurface,
	};

	try {
		return attestationSchemaFor(linkedSurface, resolution.lemma).parse(
			value,
		);
	} catch (cause) {
		throw invalidOutput(
			"Grammatical Resolution could not construct a valid Attestation.",
			cause,
		);
	}
}

function attestationSchemaFor(
	surface: Surface<"de">,
	lemma: Lemma<"de">,
): { parse(value: unknown): Attestation<"de"> } {
	type Getter = () => { parse(value: unknown): Attestation<"de"> };
	const attestationSchemas = schemasFor.de.entity
		.Attestation as unknown as Record<
		string,
		| Record<string, Record<string, Getter | undefined> | undefined>
		| undefined
	>;
	const getSchema =
		attestationSchemas[surface.surfaceKind]?.[lemma.family]?.[lemma.kind];
	if (!getSchema) {
		throw invalidOutput(
			`No Attestation schema exists for de/${lemma.family}/${lemma.kind}/${surface.surfaceKind}.`,
		);
	}
	return getSchema();
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

function constructMarkedContext(
	segments: readonly Segment[],
	memberSegmentIndices: readonly number[],
): string {
	const members = new Set(memberSegmentIndices);
	return segments
		.map((segment, index) => {
			const escapedText = segment.text
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;");
			return members.has(index)
				? `<TARGET>${escapedText}</TARGET>`
				: escapedText;
		})
		.join("");
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

function notifySection1(
	options: DumgenImplementationOptions,
	trace: DumgenSection1Trace,
): void {
	try {
		options.onSection1Trace?.(structuredClone(trace));
	} catch {
		// Instrumentation is diagnostic-only and cannot affect the operation.
	}
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
