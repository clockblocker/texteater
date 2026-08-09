import { schemasFor } from "dumling/schema";
import type { Attestation, Lemma, Surface } from "dumling/types";

import type { PROMPT_CATALOG } from "../catalog/prompt-catalog";
import type { GeneratorCatalog } from "../generator/generator";
import { DumgenError } from "../generator/generator-error";
import { isGermanHighLevelRoute } from "../schema/german-high-level-routes";
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
	Segment,
	SegmentationResult,
	SegmentedSentence,
	SegmentedSentenceId,
} from "../types";

type DumgenGenerators = GeneratorCatalog<typeof PROMPT_CATALOG>;
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

export function createDumgenImplementation(generators: DumgenGenerators) {
	const segmentationRoutes = Object.freeze({
		de: generators.laboratory.segmentation.de,
	});
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

	async function segment(text: string): Promise<SegmentationResult> {
		if (typeof text !== "string" || text.length === 0) {
			throw invalidInput("Expected non-empty source text.");
		}

		const intake = await generators.laboratory.intake({ text });
		if (intake.decision === "UnsupportedLanguage") {
			return Object.freeze({
				outcome: "Unavailable",
				reason: "UnsupportedLanguage",
				language: intake.language,
			});
		}
		if (intake.decision === "Unintelligible") {
			return Object.freeze({
				outcome: "Unavailable",
				reason: "Unintelligible",
				language: null,
			});
		}

		const route = segmentationRoutes[intake.language];
		if (!route) {
			throw invalidOutput(
				`Intake accepted unavailable Segmentation language ${intake.language}.`,
			);
		}
		const generated = await route({ text });
		let offset = 0;
		const segments = generated.segments.map((generatedSegment, index) => {
			const start = offset;
			offset += generatedSegment.text.length;
			return Object.freeze({
				...generatedSegment,
				index,
				start,
				end: offset,
			}) satisfies Segment;
		});
		const sentence = Object.freeze({
			id: crypto.randomUUID() as SegmentedSentenceId,
			language: intake.language,
			sourceText: text,
			segments: Object.freeze(segments),
		}) satisfies SegmentedSentence<"de">;

		return Object.freeze({
			outcome: "Segmented",
			language: sentence.language,
			sentence,
		});
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
		typeof sentence.sourceText !== "string" ||
		!Array.isArray(sentence.segments)
	) {
		throw invalidInput(
			"The explicit language must match a valid Segmented Sentence.",
		);
	}

	let offset = 0;
	for (let index = 0; index < sentence.segments.length; index += 1) {
		const segment = sentence.segments[index];
		if (
			!segment ||
			segment.index !== index ||
			typeof segment.text !== "string" ||
			segment.text.length === 0 ||
			!isSegmentKind(segment.kind) ||
			segment.start !== offset ||
			segment.end !== offset + segment.text.length
		) {
			throw invalidInput(
				"The Segmented Sentence contains an invalid Segment aggregate.",
			);
		}
		offset = segment.end;
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
		!isGermanHighLevelRoute(target.family, target.kind) ||
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
	const linkedSurface = {
		...resolution.surface,
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
		.map((segment) => {
			const escapedText = segment.text
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;");
			return members.has(segment.index)
				? `<TARGET>${escapedText}</TARGET>`
				: escapedText;
		})
		.join("");
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
