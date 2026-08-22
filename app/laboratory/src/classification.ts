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
	GermanSegmentedSentence,
	Reading,
	ResolutionDiagnostic,
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

type ResolvedGrammaticalResult = Extract<
	GrammaticalResult<"de">,
	{ decision: "Resolved" }
>;

type GrammaticalUnit = {
	target: AnalysisTarget;
	markedContext: string;
	attestation: ResolvedGrammaticalResult["attestation"];
	interaction: ResolvedGrammaticalResult["interaction"];
	stages: GermanClassificationTrace;
};

type ResolvedUnit = Omit<GrammaticalUnit, "markedContext"> & {
	reading: Reading;
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
		family: result.attestation.surface.lemma.family,
		kind: result.attestation.surface.lemma.kind,
		memberSegmentIndices: result.interaction.memberSegmentIndices,
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
	readonly #grammaticalUnitsByMember = new Map<string, GrammaticalUnit>();
	readonly #emojiDescriptionsByLemma = new Map<string, string[]>();

	constructor(createDumgen: DumgenFactory) {
		this.#createDumgen = createDumgen;
		this.#dumgen = createDumgen();
	}

	clear(): void {
		this.#dumgen = this.#createDumgen();
		this.#unitsByMember.clear();
		this.#grammaticalUnitsByMember.clear();
		this.#emojiDescriptionsByLemma.clear();
	}

	async resolve(
		sentence: GermanSegmentedSentence,
		clickedSegmentIndex: number,
		modelExchanges: readonly DumgenModelExchange[] = [],
		attemptedPrompts: string[] = [],
	): Promise<ClickResolutionResponse> {
		const cacheKey = this.#cacheKey(sentence.id, clickedSegmentIndex);
		const cached = this.#unitsByMember.get(cacheKey);
		if (cached) {
			return this.#resolvedResponse(
				clickedSegmentIndex,
				cached,
				"member-hit",
				[],
			);
		}

		const exchangeStart = modelExchanges.length;
		let grammaticalUnit = this.#grammaticalUnitsByMember.get(cacheKey);
		let stages: GermanClassificationTrace;
		if (grammaticalUnit) {
			stages = cachedStages(grammaticalUnit.stages);
			grammaticalUnit = {
				...grammaticalUnit,
				interaction: {
					...grammaticalUnit.interaction,
					clickedSegmentIndex,
				},
				stages,
			};
		} else {
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
			if (
				grammatical.decision === "Resolved" &&
				(grammatical.interaction.segmentedSentenceId !== sentence.id ||
					grammatical.interaction.clickedSegmentIndex !==
						clickedSegmentIndex)
			) {
				throw new Error(
					"Dumgen returned a fresh Attestation for a different clicked member or Segmented Sentence.",
				);
			}

			stages = createGermanClassificationTrace();
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
				const prompts = promptsFromExchanges(
					modelExchanges,
					exchangeStart,
				);
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
						model: "gpt-5.6-luna",
						prompts,
						cache: "miss",
						modelCalls: prompts.length,
					},
				};
			}

			if (grammatical.decision === "CatalogMiss") {
				if (!target) {
					throw new Error(
						"A Lemma CatalogMiss requires an observable Analysis Target.",
					);
				}
				stages.grammatical = stage(
					grammaticalResolutionPrompt(target),
					modelExchanges,
					exchangeStart,
				);
				const prompts = promptsFromExchanges(
					modelExchanges,
					exchangeStart,
				);
				attemptedPrompts.push(...prompts);
				return {
					decision: "CatalogMiss",
					stage: grammatical.stage,
					reason: grammatical.reason,
					language: grammatical.language,
					family: grammatical.route.family,
					kind: grammatical.route.kind,
					target,
					candidate: grammatical.candidate,
					stages,
					diagnostics: [
						{
							stage: "grammatical",
							kind: "CatalogMiss",
							message: `The promoted de/${grammatical.route.family}/${grammatical.route.kind} route has no fixed Lemma for this candidate.`,
						},
					],
					generation: {
						model: "gpt-5.6-luna",
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
				const prompts = promptsFromExchanges(
					modelExchanges,
					exchangeStart,
				);
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
						model: "gpt-5.6-luna",
						prompts,
						cache: "miss",
						modelCalls: prompts.length,
					},
				};
			}
			if (!target) {
				throw new Error(
					"Resolved grammar requires an Analysis Target.",
				);
			}

			stages.grammatical = stage(
				grammaticalResolutionPrompt(target),
				modelExchanges,
				exchangeStart,
			);
			grammaticalUnit = {
				target,
				markedContext: grammatical.markedContext,
				attestation: grammatical.attestation,
				interaction: grammatical.interaction,
				stages,
			};
			for (const memberIndex of target.memberSegmentIndices) {
				this.#grammaticalUnitsByMember.set(
					this.#cacheKey(sentence.id, memberIndex),
					grammaticalUnit,
				);
			}
		}

		const { target } = grammaticalUnit;
		const lemma = grammaticalUnit.attestation.surface.lemma;
		const lemmaKey = stableJson(lemma);
		const existingEmojiDescriptions = [
			...(this.#emojiDescriptionsByLemma.get(lemmaKey) ?? []),
		];
		let reading: ReadingResolution;
		try {
			reading = await this.#dumgen.resolve.reading("de", {
				markedContext: grammaticalUnit.markedContext,
				lemma,
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
		if (reading.decision === "CatalogMiss") {
			const prompts = promptsFromExchanges(modelExchanges, exchangeStart);
			attemptedPrompts.push(...prompts);
			return {
				decision: "CatalogMiss",
				stage: reading.stage,
				reason: reading.reason,
				language: reading.language,
				family: reading.route.family,
				kind: reading.route.kind,
				target,
				candidate: reading.candidate,
				stages,
				diagnostics: [
					{
						stage: "reading",
						kind: "CatalogMiss",
						message: `The promoted de/${reading.route.family}/${reading.route.kind} route has no fixed Reading for this candidate.`,
					},
				],
				generation: {
					model: "gpt-5.6-luna",
					prompts,
					cache: "miss",
					modelCalls: prompts.length,
				},
			};
		}

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
			attestation: grammaticalUnit.attestation,
			interaction: grammaticalUnit.interaction,
			reading: {
				lemma,
				emojiDescription: reading.emojiDescription,
			} as Reading,
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
			"miss",
			prompts,
		);
	}

	#resolvedResponse(
		clickedSegmentIndex: number,
		unit: ResolvedUnit,
		cache: "miss" | "member-hit",
		prompts: string[],
	): ClickResolutionResponse {
		if (
			!unit.interaction.memberSegmentIndices.includes(clickedSegmentIndex)
		) {
			throw new Error(
				"The resolved Attestation does not include the clicked member.",
			);
		}
		const interaction = {
			...unit.interaction,
			clickedSegmentIndex,
		};
		const entity: EntityRepresentation = {
			resolution: "dumgen",
			model: "gpt-5.6-luna",
			attestation: unit.attestation,
			reading: unit.reading,
		};
		return {
			decision: "Resolved",
			target: unit.target,
			interaction,
			entity,
			stages:
				cache === "member-hit"
					? cachedStages(unit.stages)
					: unit.stages,
			diagnostics: unit.diagnostics,
			generation: {
				model: "gpt-5.6-luna",
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
	createDumgen: DumgenFactory,
	sentence: GermanSegmentedSentence,
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
