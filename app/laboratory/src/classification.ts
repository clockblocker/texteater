import type { Dumgen, DumgenModelExchange, GrammaticalResult } from "dumgen";
import { dumling } from "dumling";

import type {
	AnalysisTarget,
	ClassificationStageName,
	ClassificationStageResult,
	ClickResolutionResponse,
	EntityRepresentation,
	MemberOrthography,
	Reading,
	ResolutionDiagnostic,
	SegmentedSentence,
	Selection,
} from "./shared/contract";

export const targetClassificationPrompt =
	"laboratory.targetClassification.de.highLevelWholeUnit" as const;

export const grammaticalResolutionPrompt = (target: AnalysisTarget): string =>
	`laboratory.grammaticalResolution.de.${target.family}.${target.kind}`;

export const readingResolutionPrompt =
	"laboratory.readingResolution.de" as const;

export type GermanClassificationTrace = Partial<
	Record<ClassificationStageName, ClassificationStageResult>
>;

export function createGermanClassificationTrace(): GermanClassificationTrace {
	return {};
}

type ResolvedUnit = {
	target: AnalysisTarget;
	selection: Selection;
	reading: Reading;
	memberOrthographies: Record<number, MemberOrthography>;
	stages: GermanClassificationTrace;
	diagnostics: ResolutionDiagnostic[];
};

type AcceptedExchange = Extract<
	DumgenModelExchange,
	{ readonly phase: "accepted" }
>;

function acceptedExchange(
	modelExchanges: readonly DumgenModelExchange[],
	prompt: string,
	startIndex = 0,
): AcceptedExchange | undefined {
	return modelExchanges
		.slice(startIndex)
		.find(
			(exchange): exchange is AcceptedExchange =>
				exchange.phase === "accepted" && exchange.promptPath === prompt,
		);
}

function stage(
	prompt: string,
	result: unknown,
	modelExchanges: readonly DumgenModelExchange[],
	startIndex: number,
): ClassificationStageResult {
	const exchange = acceptedExchange(modelExchanges, prompt, startIndex);
	if (!exchange) {
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

function promptsFromExchanges(
	modelExchanges: readonly DumgenModelExchange[],
	startIndex: number,
): string[] {
	return modelExchanges
		.slice(startIndex)
		.filter(
			(exchange): exchange is AcceptedExchange =>
				exchange.phase === "accepted",
		)
		.map(({ promptPath }) => promptPath);
}

function targetFromExchange(
	modelExchanges: readonly DumgenModelExchange[],
	clickedSegmentIndex: number,
	startIndex: number,
): AnalysisTarget | undefined {
	const exchange = acceptedExchange(
		modelExchanges,
		targetClassificationPrompt,
		startIndex,
	);
	const output = exchange?.validatedModelOutput as
		| {
				decision?: unknown;
				target?: {
					additionalMemberSegmentIndices?: unknown;
					family?: unknown;
					kind?: unknown;
				} | null;
		  }
		| undefined;
	if (
		output?.decision !== "Resolved" ||
		!output.target ||
		!Array.isArray(output.target.additionalMemberSegmentIndices) ||
		typeof output.target.family !== "string" ||
		typeof output.target.kind !== "string"
	) {
		return undefined;
	}
	return {
		family: output.target.family,
		kind: output.target.kind,
		memberSegmentIndices: [
			clickedSegmentIndex,
			...output.target.additionalMemberSegmentIndices,
		].toSorted((left, right) => left - right),
	} as AnalysisTarget;
}

function targetFromResolved(
	result: Extract<GrammaticalResult<"de">, { decision: "Resolved" }>,
): AnalysisTarget {
	return {
		family: result.selection.surface.lemma.family,
		kind: result.selection.surface.lemma.kind,
		memberSegmentIndices: result.selection.surfaceSegmentIndices,
	} as AnalysisTarget;
}

function memberOrthographiesFromExchange(
	modelExchanges: readonly DumgenModelExchange[],
	target: AnalysisTarget,
	startIndex: number,
): Record<number, MemberOrthography> {
	const exchange = acceptedExchange(
		modelExchanges,
		grammaticalResolutionPrompt(target),
		startIndex,
	);
	const output = exchange?.validatedModelOutput as
		| {
				resolution?: {
					memberOrthographies?: unknown;
				} | null;
		  }
		| undefined;
	const orthographies = output?.resolution?.memberOrthographies;
	if (
		!Array.isArray(orthographies) ||
		orthographies.length !== target.memberSegmentIndices.length
	) {
		throw new Error(
			"The grammatical model exchange has no aligned member orthographies.",
		);
	}
	return Object.fromEntries(
		target.memberSegmentIndices.map((index, position) => [
			index,
			orthographies[position] as MemberOrthography,
		]),
	);
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

function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
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

export class GermanClassificationResolver {
	readonly #dumgen: Dumgen;
	readonly #unitsByMember = new Map<string, ResolvedUnit>();
	readonly #emojiDescriptionsByLemma = new Map<string, string[]>();

	constructor(dumgen: Dumgen) {
		this.#dumgen = dumgen;
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

		const exchangeStart = modelExchanges.length;
		let grammatical: GrammaticalResult<"de">;
		try {
			grammatical = await this.#dumgen.resolve.grammatical("de", {
				sentence,
				clickedSegmentIndex,
			});
		} catch (error) {
			attemptedPrompts.push(
				...promptsFromExchanges(modelExchanges, exchangeStart),
			);
			const target = targetFromExchange(
				modelExchanges,
				clickedSegmentIndex,
				exchangeStart,
			);
			if (
				target &&
				!attemptedPrompts.includes(grammaticalResolutionPrompt(target))
			) {
				attemptedPrompts.push(grammaticalResolutionPrompt(target));
			}
			throw error;
		}

		const stages = createGermanClassificationTrace();
		const target =
			grammatical.decision === "Resolved"
				? targetFromResolved(grammatical)
				: targetFromExchange(
						modelExchanges,
						clickedSegmentIndex,
						exchangeStart,
					);
		stages.target = stage(
			targetClassificationPrompt,
			target ?? { decision: "Unresolved" },
			modelExchanges,
			exchangeStart,
		);

		if (grammatical.decision === "NotImplemented") {
			if (!target) {
				throw new Error(
					"NotImplemented requires an observable Analysis Target.",
				);
			}
			const prompts = promptsFromExchanges(modelExchanges, exchangeStart);
			attemptedPrompts.push(...prompts);
			return {
				decision: "NotImplemented",
				stage: "GrammaticalResolution",
				language: grammatical.language,
				family: grammatical.route.family,
				kind: grammatical.route.kind,
				target,
				stages,
				diagnostics: [
					{
						stage: "grammatical",
						kind: "ResolutionRouteNotImplemented",
						message: `GrammaticalResolution is not enabled for de/${grammatical.route.family}/${grammatical.route.kind}.`,
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

		if (grammatical.decision === "Unresolved") {
			const grammaticalPrompt = target
				? grammaticalResolutionPrompt(target)
				: undefined;
			if (grammaticalPrompt) {
				stages.grammatical = stage(
					grammaticalPrompt,
					grammatical,
					modelExchanges,
					exchangeStart,
				);
			}
			const prompts = promptsFromExchanges(modelExchanges, exchangeStart);
			attemptedPrompts.push(...prompts);
			const failedStage = target ? "grammatical" : "target";
			return {
				decision: "Unresolved",
				...(target ? { target } : undefined),
				stages,
				diagnostics: [
					{
						stage: failedStage,
						kind: "Unresolved",
						message: `${failedStage === "target" ? "Target Classification" : "Grammatical Resolution"} returned Unresolved for clickable ResolvableText.`,
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
		if (!target) {
			throw new Error("Resolved grammar requires an Analysis Target.");
		}

		stages.grammatical = stage(
			grammaticalResolutionPrompt(target),
			grammatical,
			modelExchanges,
			exchangeStart,
		);
		const memberOrthographies = memberOrthographiesFromExchange(
			modelExchanges,
			target,
			exchangeStart,
		);
		const lemma = grammatical.selection.surface.lemma;
		const lemmaKey = stableJson(lemma);
		const existingEmojiDescriptions = [
			...(this.#emojiDescriptionsByLemma.get(lemmaKey) ?? []),
		];
		const reading = await this.#dumgen.resolve.reading("de", {
			markedContext: grammatical.markedContext,
			lemma: lemma.canonicalForm,
			existingEmojiDescriptions,
		});
		stages.reading = stage(
			readingResolutionPrompt,
			reading,
			modelExchanges,
			exchangeStart,
		);

		const diagnostics: ResolutionDiagnostic[] = [];
		const readingExchange = acceptedExchange(
			modelExchanges,
			readingResolutionPrompt,
			exchangeStart,
		);
		const advisoryDecision = (
			readingExchange?.validatedModelOutput as
				| { decision?: unknown }
				| undefined
		)?.decision;
		if (
			(advisoryDecision === "Reuse" || advisoryDecision === "New") &&
			advisoryDecision !== reading.decision
		) {
			diagnostics.push({
				stage: "reading",
				kind: "DecisionMismatch",
				message: `Model advised ${advisoryDecision}, but exact Emoji Description membership requires ${reading.decision}.`,
			});
		}
		if (reading.decision === "New") {
			this.#emojiDescriptionsByLemma.set(lemmaKey, [
				...existingEmojiDescriptions,
				reading.emojiDescription,
			]);
		}

		const resolvedUnit: ResolvedUnit = {
			target,
			selection: grammatical.selection,
			reading: {
				lemma,
				emojiDescription: reading.emojiDescription,
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
		const prompts = promptsFromExchanges(modelExchanges, exchangeStart);
		attemptedPrompts.push(...prompts);
		return this.#resolvedResponse(
			sentence,
			clickedSegmentIndex,
			resolvedUnit,
			"miss",
			prompts,
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
		const selection =
			clickedSegmentIndex === unit.selection.clickedSegmentIndex
				? unit.selection
				: dumling.de.create.selection({
						...unit.selection,
						segmentedSentenceId: sentence.id,
						clickedSegmentIndex,
						surfaceSegmentIndices: [
							...unit.selection.surfaceSegmentIndices,
						],
						selectedOrthography,
					});
		const entity: EntityRepresentation = {
			resolution: "dumgen",
			model: "gpt-5-nano",
			selection,
			surface: selection.surface,
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

	#cacheKey(sentenceId: string, segmentIndex: number): string {
		return `${sentenceId}:${segmentIndex}`;
	}
}

export async function classifyGermanSegment(
	dumgen: Dumgen,
	sentence: SegmentedSentence,
	clickedSegmentIndex: number,
	trace?: GermanClassificationTrace,
	modelExchanges: readonly DumgenModelExchange[] = [],
	attemptedPrompts: string[] = [],
): Promise<ClickResolutionResponse> {
	const result = await new GermanClassificationResolver(dumgen).resolve(
		sentence,
		clickedSegmentIndex,
		modelExchanges,
		attemptedPrompts,
	);
	if (trace) Object.assign(trace, result.stages);
	return result;
}
