import type {
	Dumgen,
	DumgenModelExchange,
	GrammaticalResult,
	ReadingResolution,
} from "dumgen";

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

export type DumgenFactory = () => Dumgen;

export function createGermanClassificationTrace(): GermanClassificationTrace {
	return {};
}

type ResolvedUnit = {
	target: AnalysisTarget;
	reading: Reading;
	memberOrthographies: Record<number, MemberOrthography>;
	selectionsByMember: Record<number, Selection>;
	stages: GermanClassificationTrace;
	diagnostics: ResolutionDiagnostic[];
};

type AcceptedExchange = Extract<
	DumgenModelExchange,
	{ readonly phase: "accepted" }
>;

type AttemptedExchange = Extract<
	DumgenModelExchange,
	{ readonly phase: "attempted" }
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
		result: exchange.result,
	};
}

function promptsFromExchanges(
	modelExchanges: readonly DumgenModelExchange[],
	startIndex: number,
): string[] {
	return modelExchanges
		.slice(startIndex)
		.filter(
			(exchange): exchange is AttemptedExchange =>
				exchange.phase === "attempted",
		)
		.map(({ promptPath }) => promptPath);
}

function targetFromExchange(
	modelExchanges: readonly DumgenModelExchange[],
	startIndex: number,
): AnalysisTarget | undefined {
	const exchange = acceptedExchange(
		modelExchanges,
		targetClassificationPrompt,
		startIndex,
	);
	const output = exchange?.result as
		| {
				decision?: unknown;
				memberSegmentIndices?: unknown;
				family?: unknown;
				kind?: unknown;
		  }
		| undefined;
	if (
		!output ||
		output.decision === "Unresolved" ||
		!Array.isArray(output.memberSegmentIndices) ||
		typeof output.family !== "string" ||
		typeof output.kind !== "string"
	) {
		return undefined;
	}
	return {
		family: output.family,
		kind: output.kind,
		memberSegmentIndices: output.memberSegmentIndices,
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
	#dumgen: Dumgen;
	readonly #createDumgen: DumgenFactory;
	readonly #unitsByMember = new Map<string, ResolvedUnit>();
	readonly #emojiDescriptionsByLemma = new Map<string, string[]>();

	constructor(createDumgen: DumgenFactory) {
		this.#createDumgen = createDumgen;
		this.#dumgen = createDumgen();
	}

	clear(): void {
		this.#dumgen = this.#createDumgen();
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
			const selection = cached.selectionsByMember[clickedSegmentIndex];
			if (!selection) {
				throw new Error(
					"The view cache has no Selection for a known target member.",
				);
			}
			return this.#resolvedResponse(
				clickedSegmentIndex,
				cached,
				selection,
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
			throw error;
		}

		const stages = createGermanClassificationTrace();
		const target =
			grammatical.decision === "Resolved"
				? targetFromResolved(grammatical)
				: targetFromExchange(modelExchanges, exchangeStart);
		stages.target = stage(
			targetClassificationPrompt,
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
			modelExchanges,
			exchangeStart,
		);
		const { memberOrthographies, selectionsByMember } =
			await this.#resolveMemberSelections(sentence, target, grammatical);
		const lemma = grammatical.selection.surface.lemma;
		const lemmaKey = stableJson(lemma);
		const existingEmojiDescriptions = [
			...(this.#emojiDescriptionsByLemma.get(lemmaKey) ?? []),
		];
		let reading: ReadingResolution;
		try {
			reading = await this.#dumgen.resolve.reading("de", {
				markedContext: grammatical.markedContext,
				lemma: lemma.canonicalForm,
				existingEmojiDescriptions,
			});
		} catch (error) {
			attemptedPrompts.push(
				...promptsFromExchanges(modelExchanges, exchangeStart),
			);
			throw error;
		}
		stages.reading = stage(
			readingResolutionPrompt,
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
			readingExchange?.result as { decision?: unknown } | undefined
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
			reading: {
				lemma,
				emojiDescription: reading.emojiDescription,
			} as Reading,
			memberOrthographies,
			selectionsByMember,
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
			clickedSegmentIndex,
			resolvedUnit,
			grammatical.selection,
			"miss",
			prompts,
		);
	}

	#resolvedResponse(
		clickedSegmentIndex: number,
		unit: ResolvedUnit,
		selection: Selection,
		cache: "miss" | "member-hit",
		prompts: string[],
	): ClickResolutionResponse {
		if (selection.clickedSegmentIndex !== clickedSegmentIndex) {
			throw new Error(
				"Dumgen returned a Selection for a different clicked member.",
			);
		}
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

	async #resolveMemberSelections(
		sentence: SegmentedSentence,
		target: AnalysisTarget,
		initial: Extract<GrammaticalResult<"de">, { decision: "Resolved" }>,
	): Promise<{
		memberOrthographies: Record<number, MemberOrthography>;
		selectionsByMember: Record<number, Selection>;
	}> {
		const orthographyEntries: Array<[number, MemberOrthography]> = [];
		const selectionEntries: Array<[number, Selection]> = [];
		for (const memberIndex of target.memberSegmentIndices) {
			const result =
				memberIndex === initial.selection.clickedSegmentIndex
					? initial
					: await this.#dumgen.resolve.grammatical("de", {
							sentence,
							clickedSegmentIndex: memberIndex,
						});
			if (
				result.decision !== "Resolved" ||
				result.selection.clickedSegmentIndex !== memberIndex ||
				stableJson(result.selection.surfaceSegmentIndices) !==
					stableJson(target.memberSegmentIndices)
			) {
				throw new Error(
					"Dumgen did not preserve the resolved grammatical unit for every member.",
				);
			}
			orthographyEntries.push([
				memberIndex,
				result.selection.selectedOrthography,
			]);
			selectionEntries.push([memberIndex, result.selection]);
		}
		return {
			memberOrthographies: Object.fromEntries(orthographyEntries),
			selectionsByMember: Object.fromEntries(selectionEntries),
		};
	}

	#cacheKey(sentenceId: string, segmentIndex: number): string {
		return `${sentenceId}:${segmentIndex}`;
	}
}

export async function classifyGermanSegment(
	createDumgen: DumgenFactory,
	sentence: SegmentedSentence,
	clickedSegmentIndex: number,
	trace?: GermanClassificationTrace,
	modelExchanges: readonly DumgenModelExchange[] = [],
	attemptedPrompts: string[] = [],
): Promise<ClickResolutionResponse> {
	const result = await new GermanClassificationResolver(createDumgen).resolve(
		sentence,
		clickedSegmentIndex,
		modelExchanges,
		attemptedPrompts,
	);
	if (trace) Object.assign(trace, result.stages);
	return result;
}
