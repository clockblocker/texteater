import { createDumdictService } from "dumdict";
import { createMemoryStorage } from "dumdict/memory";
import { DumgenFailure, validateEncounter } from "dumgen";
import type {
	ComparisonInput,
	Dumgen,
	Encounter,
	GenerationInput,
	ModelExchange,
} from "dumgen/types";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { stableJson } from "promptsmith";
import {
	attemptedPromptPaths,
	generation,
	operationStage,
} from "./model-trace";
import type {
	AnalysisTarget,
	ClassificationStageName,
	ClassificationStageResult,
	ClickResolutionResponse,
	GermanSegmentedSentence,
} from "./shared/contract";

export type GermanClassificationTrace = Partial<
	Record<ClassificationStageName, ClassificationStageResult>
>;
export type DumgenFactory = (
	onExchange?: (exchange: ModelExchange) => void,
) => Dumgen;
type Grammar = {
	encounter: Encounter<"de">;
	attestation: Dumling.Attestation<"de">;
	stages: GermanClassificationTrace;
};
type ResolvedUnit = Grammar & { reading: Dumling.Reading<"de">; model: string };
const emptyNote = () => ({
	attestedTranslations: [],
	attestations: [],
	notes: "",
});
const cachedStages = (
	stages: GermanClassificationTrace,
): GermanClassificationTrace =>
	Object.fromEntries(
		Object.entries(stages).map(([name, value]) => [
			name,
			{ ...value, traceOrigin: "cached" },
		]),
	);

/** Session-scoped occurrence caches and Dumdict storage. Supplied targets bypass classification. */
export class GermanClassificationResolver {
	readonly #createDumgen: DumgenFactory;
	#storage = createMemoryStorage("de");
	#dictionary = createDumdictService({
		language: "de",
		storage: this.#storage,
	});
	readonly #units = new Map<string, ResolvedUnit>();
	readonly #grammar = new Map<string, Grammar>();
	constructor(createDumgen: DumgenFactory) {
		this.#createDumgen = createDumgen;
	}
	clear() {
		this.#units.clear();
		this.#grammar.clear();
		this.#storage = createMemoryStorage("de");
		this.#dictionary = createDumdictService({
			language: "de",
			storage: this.#storage,
		});
	}
	snapshot() {
		return this.#storage.snapshot();
	}
	resolve(
		sentence: GermanSegmentedSentence,
		clickedSegmentIndex: number,
		exchanges: ModelExchange[] = [],
		attemptedPrompts: string[] = [],
		suppliedTarget?: AnalysisTarget,
	): Effect.Effect<ClickResolutionResponse, unknown> {
		const localExchanges: ModelExchange[] = [];
		const dumgen = this.#createDumgen((exchange) => {
			exchanges.push(exchange);
			localExchanges.push(exchange);
			attemptedPrompts.push(...attemptedPromptPaths([exchange]));
		});
		let target = suppliedTarget;
		let stages: GermanClassificationTrace = {};
		let activeStage: ClassificationStageName = "target";
		const keyFor = (index: number) =>
			`${sentence.id}:${index}:${suppliedTarget ? stableJson(suppliedTarget) : "whole"}`;
		return Effect.gen(this, function* () {
			if (
				!Number.isSafeInteger(clickedSegmentIndex) ||
				sentence.segments[clickedSegmentIndex]?.kind !==
					"ResolvableText"
			)
				return yield* Effect.fail(
					new DumgenFailure(
						"InvalidInput",
						"classifyTarget",
						"Only ResolvableText can be resolved.",
					),
				);
			if (suppliedTarget) {
				validateEncounter({ sentence, target: suppliedTarget });
				if (
					!suppliedTarget.memberSegmentIndices.includes(
						clickedSegmentIndex,
					)
				)
					return yield* Effect.fail(
						new DumgenFailure(
							"InvalidInput",
							"classifyTarget",
							"Supplied target must include the selected Segment.",
						),
					);
			}
			const cached = this.#units.get(keyFor(clickedSegmentIndex));
			if (cached) return this.#response(cached, [], "member-hit");
			let grammatical = this.#grammar.get(keyFor(clickedSegmentIndex));
			if (grammatical) {
				target = grammatical.encounter.target;
				stages = cachedStages(grammatical.stages);
			} else {
				target =
					suppliedTarget ??
					(yield* dumgen.classifyTarget({
						sentence,
						clickedSegmentIndex,
					}));
				stages.target = operationStage(
					"classifyTarget",
					{ sentence, clickedSegmentIndex },
					target,
					localExchanges,
					"supplied",
				);
				const encounter = validateEncounter({
					sentence,
					target,
				}) as Encounter<"de">;
				activeStage = "grammatical";
				const attestation = yield* dumgen.resolveGrammar(encounter);
				const parsed = parseUnit(attestation);
				if (!parsed.success) return yield* Effect.fail(parsed.error);
				if (
					parsed.chain.unitKind !== "Attestation" ||
					parsed.chain.language !== "de" ||
					attestation.surface.lemma.family !== target.family ||
					attestation.surface.lemma.kind !== target.kind ||
					attestation.members.length !==
						target.memberSegmentIndices.length ||
					attestation.members.some(
						(member, index) =>
							member.attested !==
							sentence.segments[
								target!.memberSegmentIndices[index]!
							]?.text,
					)
				)
					return yield* Effect.fail(
						new DumgenFailure(
							"InvalidModelOutput",
							"resolveGrammar",
							"Attestation does not match the supplied Encounter.",
						),
					);
				stages.grammatical = operationStage(
					"resolveGrammar",
					encounter,
					attestation,
					localExchanges,
				);
				grammatical = { encounter, attestation, stages };
				for (const index of target.memberSegmentIndices)
					this.#grammar.set(keyFor(index), grammatical);
			}
			activeStage = "reading";
			const lemma = grammatical.attestation.surface.lemma;
			const found = yield* this.#dictionary.findStoredReadings({ lemma });
			const candidates = found.candidates.map(
				({ reading }) => reading.emojiDescription,
			);
			const base = { encounter: grammatical.encounter, lemma };
			const resolution =
				candidates.length > 0
					? yield* dumgen.resolveOrGenerateReadingEmojiDescription({
							...base,
							candidates: [
								candidates[0]!,
								...candidates.slice(1),
							],
						} as ComparisonInput<"de">)
					: {
							decision: "New" as const,
							emojiDescription:
								yield* dumgen.generateReadingEmojiDescription(
									base as GenerationInput<"de">,
								),
						};
			const parsedReading = parseUnit({
				unitKind: "Reading",
				lemma,
				emojiDescription: resolution.emojiDescription,
			});
			if (!parsedReading.success)
				return yield* Effect.fail(parsedReading.error);
			if (
				parsedReading.chain.unitKind !== "Reading" ||
				parsedReading.chain.language !== "de"
			)
				throw new Error("Expected a German Reading.");
			const reading = parsedReading.chain.value;
			stages.reading = operationStage(
				candidates.length
					? "resolveOrGenerateReadingEmojiDescription"
					: "generateReadingEmojiDescription",
				{ ...base, candidates },
				resolution,
				localExchanges,
			);
			// All dictionary writes occur after every production stage has succeeded.
			if (resolution.decision === "New")
				yield* this.#dictionary.addNewNote({
					draft: {
						reading,
						note: emptyNote(),
						ownedSurfaces: [
							{
								surface: grammatical.attestation.surface,
								note: emptyNote(),
							},
						],
					},
				});
			else
				yield* this.#dictionary.ensureOwnedSurface({
					reading,
					ownedSurface: {
						surface: grammatical.attestation.surface,
						note: emptyNote(),
					},
				});
			const unit = {
				...grammatical,
				stages,
				reading,
				model: generation(localExchanges).model,
			};
			for (const index of target.memberSegmentIndices)
				this.#units.set(keyFor(index), unit);
			return this.#response(unit, localExchanges, "miss");
		}).pipe(
			Effect.catchAll((error) => {
				if (
					!(error instanceof DumgenFailure) ||
					!["CatalogMiss", "Unresolved", "NotImplemented"].includes(
						error._tag,
					)
				)
					return Effect.fail(error);
				const common = {
					stages,
					diagnostics: [
						{
							stage: activeStage,
							kind:
								error._tag === "NotImplemented"
									? ("ResolutionRouteNotImplemented" as const)
									: (error._tag as
											| "CatalogMiss"
											| "Unresolved"),
							message: error.message,
						},
					],
					generation: generation(localExchanges),
				};
				if (error._tag === "CatalogMiss")
					return Effect.succeed({
						decision: "CatalogMiss",
						stage: error.stage,
						message: error.message,
						...(target ? { target } : {}),
						...common,
					} as ClickResolutionResponse);
				if (error._tag === "NotImplemented" && target)
					return Effect.succeed({
						decision: "NotImplemented",
						stage: "GrammaticalResolution",
						language: "de",
						family: target.family,
						kind: target.kind,
						target,
						...common,
					} as ClickResolutionResponse);
				return Effect.succeed({
					decision: "Unresolved",
					...(target ? { target } : {}),
					...common,
				} as ClickResolutionResponse);
			}),
		);
	}
	#response(
		unit: ResolvedUnit,
		exchanges: ModelExchange[],
		cache: "miss" | "member-hit",
	): ClickResolutionResponse {
		return {
			decision: "Resolved",
			target: unit.encounter.target,
			encounter: unit.encounter,
			entity: {
				resolution: "dumgen",
				model: unit.model,
				attestation: unit.attestation,
				reading: unit.reading,
			},
			stages:
				cache === "member-hit"
					? cachedStages(unit.stages)
					: unit.stages,
			diagnostics: [],
			generation: { ...generation(exchanges, cache), model: unit.model },
		};
	}
}
