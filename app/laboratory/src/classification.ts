import type { buildDumgen, DumgenModelExchange } from "dumgen";
import { schemasFor } from "dumling/schema";

import type {
	AnalysisTarget,
	ClassificationStageName,
	ClassificationStageResult,
	ClickResolutionResponse,
	EntityRepresentation,
	Lemma,
	MemberOrthography,
	Reading,
	ResolutionDiagnostic,
	Segment,
	SegmentedSentence,
	Selection,
	Surface,
} from "./shared/contract";

export const targetClassificationPrompt =
	"laboratory.targetClassification.de.highLevelWholeUnit" as const;

export const grammaticalResolutionPrompt = (target: AnalysisTarget): string =>
	`laboratory.grammaticalResolution.de.${target.family}.${target.kind}`;

export const readingResolutionPrompt = (target: AnalysisTarget): string =>
	`laboratory.readingResolution.de.${target.family}.${target.kind}`;

export type GermanClassificationTrace = Partial<
	Record<ClassificationStageName, ClassificationStageResult>
>;

export function createGermanClassificationTrace(): GermanClassificationTrace {
	return {};
}

type ResolvedUnit = {
	target: AnalysisTarget;
	surface: Surface;
	reading: Reading;
	memberOrthographies: Record<number, MemberOrthography>;
	stages: GermanClassificationTrace;
	diagnostics: ResolutionDiagnostic[];
};

type Unresolved = { decision: "Unresolved" };
type GrammaticalResolution =
	| Unresolved
	| {
			decision: "Resolved";
			memberOrthographies: MemberOrthography[];
			surface: Omit<Surface, "lemma">;
			lemma: Lemma;
	  };
type ReadingResolution = {
	decision: "Reuse" | "New";
	emojiDescription: string;
};

type GermanGenerator = {
	laboratory: {
		targetClassification: {
			de: {
				highLevelWholeUnit(input: {
					clickedSegmentIndex: number;
					segments: Array<{ kind: Segment["kind"]; text: string }>;
				}): Promise<AnalysisTarget | Unresolved>;
			};
		};
		grammaticalResolution: {
			de: Record<
				string,
				Record<
					string,
					(input: {
						markedContext: string;
					}) => Promise<GrammaticalResolution>
				>
			>;
		};
		readingResolution: {
			de: Record<
				string,
				Record<
					string,
					(input: {
						markedContext: string;
						lemma: Lemma;
						existingEmojiDescriptions: string[];
					}) => Promise<ReadingResolution>
				>
			>;
		};
	};
};

function constructAttestedSurface(
	segments: readonly Segment[],
	indices: readonly number[],
): string {
	let result = "";
	for (let position = 0; position < indices.length; position += 1) {
		const index = indices[position] ?? 0;
		if (position > 0) {
			const previous = indices[position - 1] ?? index;
			if (
				segments
					.slice(previous + 1, index)
					.some((segment) => segment.kind === "Whitespace")
			) {
				result += " ";
			}
		}
		result += segments[index]?.text ?? "";
	}
	return result;
}

export function constructMarkedContext(
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

function parseGermanEntity<T extends Surface | Selection>(
	entityKind: "Surface" | "Selection",
	value: unknown,
	surfaceKind: Surface["surfaceKind"],
	lemma: Lemma,
): T {
	type Getter = () => { parse(value: unknown): T };
	const entities = schemasFor.de.entity as unknown as Record<
		string,
		Record<string, Record<string, Record<string, Getter>>>
	>;
	const getSchema =
		entities[entityKind]?.[surfaceKind]?.[lemma.family]?.[lemma.kind];
	if (!getSchema) {
		throw new Error(
			`No German Dumling ${entityKind} schema exists for ${surfaceKind} ${lemma.family} ${lemma.kind}.`,
		);
	}
	return getSchema().parse(value);
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableJson).join(",")}]`;
	}
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(
				([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`,
			)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function isUnresolved(
	value: AnalysisTarget | GrammaticalResolution,
): value is Unresolved {
	return "decision" in value && value.decision === "Unresolved";
}

function stage(
	prompt: string,
	result: unknown,
	modelExchanges: readonly DumgenModelExchange[],
): ClassificationStageResult {
	const exchange = modelExchanges.find(
		(candidate) =>
			candidate.phase === "accepted" && candidate.promptPath === prompt,
	);
	if (exchange?.phase !== "accepted") {
		throw new Error(
			`No accepted model exchange was captured for ${prompt}.`,
		);
	}
	return {
		prompt,
		traceOrigin: "generated",
		input: exchange.modelInput,
		output: exchange.validatedModelOutput,
		result,
	};
}

function cachedStages(
	stages: GermanClassificationTrace,
): GermanClassificationTrace {
	return Object.fromEntries(
		Object.entries(stages).map(([name, value]) => [
			name,
			{ ...value, traceOrigin: "cached" },
		]),
	) as GermanClassificationTrace;
}

function unresolvedResponse(
	stageName: "target" | "grammatical",
	stages: GermanClassificationTrace,
	prompts: string[],
	target?: AnalysisTarget,
): ClickResolutionResponse {
	return {
		decision: "Unresolved",
		...(target ? { target } : {}),
		stages,
		diagnostics: [
			{
				stage: stageName,
				kind: "Unresolved",
				message: `${stageName === "target" ? "Target Classification" : "Grammatical Resolution"} returned Unresolved for clickable ResolvableText.`,
			},
		],
		generation: {
			model: "gpt-5-nano",
			prompts,
			cache: "miss",
			modelCalls: prompts.length,
		},
	};
}

export class GermanClassificationResolver {
	readonly #generate: GermanGenerator;
	readonly #unitsByMember = new Map<string, ResolvedUnit>();
	readonly #emojiDescriptionsByLemma = new Map<string, string[]>();

	constructor(generate: ReturnType<typeof buildDumgen>) {
		this.#generate = generate as unknown as GermanGenerator;
	}

	clear(): void {
		this.#unitsByMember.clear();
		this.#emojiDescriptionsByLemma.clear();
	}

	async resolve(
		sentence: SegmentedSentence,
		clickedSegmentIndex: number,
		modelExchanges: readonly DumgenModelExchange[] = [],
		attemptedPrompts: string[] = [],
	): Promise<ClickResolutionResponse> {
		const cacheKey = this.#cacheKey(sentence.id, clickedSegmentIndex);
		const cached = this.#unitsByMember.get(cacheKey);
		if (cached) {
			return this.#resolvedResponse(
				sentence,
				clickedSegmentIndex,
				cached,
				"member-hit",
				[],
			);
		}

		const stages = createGermanClassificationTrace();
		const segments = sentence.segments.map(({ kind, text }) => ({
			kind,
			text,
		}));
		const targetInput = { clickedSegmentIndex, segments };
		attemptedPrompts.push(targetClassificationPrompt);
		const targetOutput =
			await this.#generate.laboratory.targetClassification.de.highLevelWholeUnit(
				targetInput,
			);
		stages.target = stage(
			targetClassificationPrompt,
			targetOutput,
			modelExchanges,
		);
		if (isUnresolved(targetOutput)) {
			return unresolvedResponse("target", stages, [
				targetClassificationPrompt,
			]);
		}
		const target = targetOutput;
		this.#assertTarget(sentence, clickedSegmentIndex, target);

		const markedContext = constructMarkedContext(
			sentence.segments,
			target.memberSegmentIndices,
		);
		const grammaticalInput = { markedContext };
		const grammaticalPrompt = grammaticalResolutionPrompt(target);
		const grammatical = this.#route(
			this.#generate.laboratory.grammaticalResolution.de,
			target,
			"Grammatical Resolution",
		);
		attemptedPrompts.push(grammaticalPrompt);
		const grammaticalOutput = await grammatical(grammaticalInput);
		stages.grammatical = stage(
			grammaticalPrompt,
			grammaticalOutput,
			modelExchanges,
		);
		if (isUnresolved(grammaticalOutput)) {
			return unresolvedResponse(
				"grammatical",
				stages,
				[targetClassificationPrompt, grammaticalPrompt],
				target,
			);
		}
		if (
			grammaticalOutput.memberOrthographies.length !==
			target.memberSegmentIndices.length
		) {
			throw new Error(
				"Grammatical Resolution must return one orthography result per target member.",
			);
		}

		const lemma = grammaticalOutput.lemma;
		if (lemma.family !== target.family || lemma.kind !== target.kind) {
			throw new Error(
				"Grammatical Resolution returned a Lemma outside its catalog route.",
			);
		}
		const surfaceValue = { ...grammaticalOutput.surface, lemma } as Surface;
		const surface = parseGermanEntity<Surface>(
			"Surface",
			surfaceValue,
			surfaceValue.surfaceKind,
			lemma,
		);
		const memberOrthographies = Object.fromEntries(
			target.memberSegmentIndices.map(
				(index: number, position: number) => [
					index,
					grammaticalOutput.memberOrthographies[
						position
					] as MemberOrthography,
				],
			),
		);

		const lemmaKey = stableJson(lemma);
		const existingEmojiDescriptions = [
			...(this.#emojiDescriptionsByLemma.get(lemmaKey) ?? []),
		];
		const readingInput = {
			markedContext,
			lemma,
			existingEmojiDescriptions,
		};
		const readingPrompt = readingResolutionPrompt(target);
		const reading = this.#route(
			this.#generate.laboratory.readingResolution.de,
			target,
			"Reading Resolution",
		);
		attemptedPrompts.push(readingPrompt);
		const readingOutput = await reading(readingInput);
		stages.reading = stage(readingPrompt, readingOutput, modelExchanges);

		const exactMember = existingEmojiDescriptions.includes(
			readingOutput.emojiDescription,
		);
		const authoritativeDecision = exactMember ? "Reuse" : "New";
		const diagnostics: ResolutionDiagnostic[] = [];
		if (readingOutput.decision !== authoritativeDecision) {
			diagnostics.push({
				stage: "reading",
				kind: "DecisionMismatch",
				message: `Model advised ${readingOutput.decision}, but exact Emoji Description membership requires ${authoritativeDecision}.`,
			});
		}
		if (!exactMember) {
			this.#emojiDescriptionsByLemma.set(lemmaKey, [
				...existingEmojiDescriptions,
				readingOutput.emojiDescription,
			]);
		}
		const resolvedUnit: ResolvedUnit = {
			target,
			surface,
			reading: {
				lemma,
				emojiDescription: readingOutput.emojiDescription,
			} as Reading,
			memberOrthographies,
			stages,
			diagnostics,
		};
		for (const memberIndex of target.memberSegmentIndices) {
			this.#unitsByMember.set(
				this.#cacheKey(sentence.id, memberIndex),
				resolvedUnit,
			);
		}
		return this.#resolvedResponse(
			sentence,
			clickedSegmentIndex,
			resolvedUnit,
			"miss",
			[targetClassificationPrompt, grammaticalPrompt, readingPrompt],
		);
	}

	#resolvedResponse(
		sentence: SegmentedSentence,
		clickedSegmentIndex: number,
		unit: ResolvedUnit,
		cache: "miss" | "member-hit",
		prompts: string[],
	): ClickResolutionResponse {
		const selectedOrthography =
			unit.memberOrthographies[clickedSegmentIndex];
		if (!selectedOrthography) {
			throw new Error(
				"Cached resolution has no orthography for clicked member.",
			);
		}
		const selection = parseGermanEntity<Selection>(
			"Selection",
			{
				segmentedSentenceId: sentence.id,
				clickedSegmentIndex,
				surfaceSegmentIndices: unit.target.memberSegmentIndices,
				attestedSurface: constructAttestedSurface(
					sentence.segments,
					unit.target.memberSegmentIndices,
				),
				selectedOrthography,
				surface: unit.surface,
			},
			unit.surface.surfaceKind,
			unit.surface.lemma,
		);
		const entity: EntityRepresentation = {
			resolution: "dumgen",
			model: "gpt-5-nano",
			selection,
			surface: unit.surface,
			reading: unit.reading,
		};
		return {
			decision: "Resolved",
			target: unit.target,
			entity,
			memberOrthographies: unit.memberOrthographies,
			stages:
				cache === "member-hit"
					? cachedStages(unit.stages)
					: unit.stages,
			diagnostics: unit.diagnostics,
			generation: {
				model: "gpt-5-nano",
				prompts,
				cache,
				modelCalls: prompts.length,
			},
		};
	}

	#route<T extends (...args: never[]) => unknown>(
		catalog: Record<string, Record<string, T>>,
		target: AnalysisTarget,
		stageName: string,
	): T {
		const route = catalog[target.family]?.[target.kind];
		if (!route) {
			throw new Error(
				`No ${stageName} prompt exists for de/${target.family}/${target.kind}.`,
			);
		}
		return route;
	}

	#cacheKey(sentenceId: string, segmentIndex: number): string {
		return `${sentenceId}:${segmentIndex}`;
	}

	#assertTarget(
		sentence: SegmentedSentence,
		clickedSegmentIndex: number,
		target: AnalysisTarget,
	): void {
		if ((target.family as string) === "Morpheme") {
			throw new Error(
				"HighLevelWholeUnit Target Classification cannot route to Morpheme.",
			);
		}
		if (!target.memberSegmentIndices.includes(clickedSegmentIndex)) {
			throw new Error(
				"AnalysisTarget must include the clicked Segment index.",
			);
		}
		for (
			let position = 0;
			position < target.memberSegmentIndices.length;
			position += 1
		) {
			const index = target.memberSegmentIndices[position];
			if (
				typeof index !== "number" ||
				(position > 0 &&
					index <=
						(target.memberSegmentIndices[position - 1] ?? -1)) ||
				sentence.segments[index]?.kind !== "ResolvableText"
			) {
				throw new Error(
					"AnalysisTarget member indices must be ordered, unique ResolvableText Segment positions.",
				);
			}
		}
	}
}

export async function classifyGermanSegment(
	generate: ReturnType<typeof buildDumgen>,
	sentence: SegmentedSentence,
	clickedSegmentIndex: number,
	trace?: GermanClassificationTrace,
	modelExchanges: readonly DumgenModelExchange[] = [],
	attemptedPrompts: string[] = [],
): Promise<ClickResolutionResponse> {
	const result = await new GermanClassificationResolver(generate).resolve(
		sentence,
		clickedSegmentIndex,
		modelExchanges,
		attemptedPrompts,
	);
	if (trace) Object.assign(trace, result.stages);
	return result;
}
