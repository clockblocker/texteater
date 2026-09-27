import type * as Dumling from "dumling/types";
import { normalizeText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import type { Questions } from "promptsmith/typesafe";
import type {
	DumgenOptions,
	Encounter,
	KnowledgeFailure,
	KnowledgeProduction,
	KnowledgeRequest,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { executeGeneration } from "../../../universal/model.js";
import { effectiveConfiguration } from "../../../universal/model-configuration.js";
import { choice } from "../../../universal/questions.js";
import {
	expected,
	type OperationScope,
	recordEvent,
} from "../../../universal/trace.js";
import { markedContext, parse } from "../../../universal/validation.js";
import {
	authoredReading,
	closedRoute,
} from "../authored-closed-sets/select.js";
import {
	draftedRelationCandidates,
	draftedTexts,
	translationFormClause,
} from "./draft.js";
import { germanRelationTargetKindsByFamily as kinds } from "./families.js";
import {
	parseParticipleForm,
	participleFormOutputSchema,
	participleFormPrompt,
	participleFormQuestion,
	participleMeaningQuestion,
} from "./participle-source.js";
import {
	mergedPlural,
	parsePlural,
	pluralOutputSchema,
	pluralPrompt,
} from "./plural-pattern.js";
import {
	authoredKnowledge,
	projectKnowledge,
	validateRequest,
} from "./project.js";
import { proposeValencyFrame, valencyChanges } from "./valency.js";

const relationCriteria: Record<Dumrel.DirectSemanticRelation, string> = {
	synonym:
		"Exact Synonym: interchangeable for this stable Reading, without a material meaning or register difference.",
	nearSynonym:
		"Near Synonym: closely related meaning with a meaningful restriction, register or perspective difference; not also an exact Synonym.",
	antonym: "Antonym: established direct lexical opposition.",
	nearAntonym:
		"Near Antonym: established conventional contrast, including converse viewpoints on one event. Never an incidental sentence foil or arbitrary co-member.",
	hypernym:
		"Hypernym: a broader category that includes the source concept. Not an instance, narrower category, or containing whole.",
	holonym:
		"Holonym: a whole that contains the source as a part, member or substance. Not a broader category.",
};
type MutableProduction = {
	changes: Dumrel.KnowledgeChange[];
	pendingRelations: Dumrel.PendingSemanticRelation[];
	failures: KnowledgeFailure[];
};

/**
 * Independent aspects succeed or fail on their own (#445): an aspect's
 * DumgenFailure is recorded in failures while its siblings continue. Only a
 * defect or interruption stops them, and no contribution is delivered after
 * either. Text jobs finish before relation candidates start.
 */
export function produceKnowledge(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		reading: Dumling.Reading;
		request: KnowledgeRequest;
		/**
		 * What intake attested for this occurrence (`slotsAt`). Each is
		 * Contributed as an Optional Slot whether or not `valency` is
		 * requested.
		 */
		attestedGovernment?: readonly {
			preposition: string;
			case: Dumrel.GovernedCase;
		}[];
		/**
		 * The Plural Pattern this occurrence's plural Surface attests (#597),
		 * Contributed whether or not `pluralPattern` is requested.
		 */
		attestedPluralPattern?: Dumrel.PluralPattern;
	},
	scope: OperationScope,
): Effect.Effect<KnowledgeProduction, DumgenFailure> {
	return Effect.gen(function* () {
		const { reading, request } = input,
			stage = "produceKnowledge",
			route = `de/${reading.lemma.family}/${reading.lemma.kind}`;
		validateRequest(reading, request);
		const closed = closedRoute(reading.lemma);
		const exact = authoredReading(reading);
		if (closed && !exact)
			throw new DumgenFailure(
				"CatalogMiss",
				stage,
				"Reading is absent from the Fixed Catalog",
				route,
			);
		const authored = exact
			? authoredKnowledge(exact, request)
			: {
					production: {
						changes: [],
						pendingRelations: [],
						failures: [],
					},
					missing: request,
				};
		const result: MutableProduction = {
			changes: [...authored.production.changes],
			pendingRelations: [...authored.production.pendingRelations],
			failures: [],
		};
		const snapshot = () =>
			recordEvent(
				scope,
				"KnowledgeContributions",
				structuredClone(result),
			);
		const failureFor = (
			aspect: KnowledgeFailure["aspect"],
			error: DumgenFailure,
			detail: Pick<KnowledgeFailure, "leaf" | "candidate"> = {},
		): KnowledgeFailure => ({
			aspect,
			...detail,
			code: error._tag,
			message: error.message,
		});
		const failed = (
			aspect: KnowledgeFailure["aspect"],
			error: DumgenFailure,
			detail: Pick<KnowledgeFailure, "leaf" | "candidate"> = {},
		) => {
			result.failures.push(failureFor(aspect, error, detail));
			snapshot();
		};
		snapshot();
		const draftTexts = yield* Effect.promise(() =>
			draftedTexts(
				options,
				{ ...input, request: authored.missing },
				scope,
			),
		);
		const state = {
			reading,
			markedContext: markedContext(input.encounter).markedContext,
		};
		type TextOutcome = {
			changes: readonly Dumrel.KnowledgeChange[];
			failures: KnowledgeFailure[];
		};
		/**
		 * The frame is proposed only when requested, which a caller does while
		 * the Reading has no frame. Government this sentence attests is
		 * Contributed with no model call. Published with the final batch.
		 */
		const attested = input.attestedGovernment ?? [];
		const valency = () =>
			Effect.gen(function* () {
				const proposed = Object.hasOwn(authored.missing, "valency")
					? yield* proposeValencyFrame(options, scope, state, route)
					: [];
				const changes = valencyChanges(
					reading,
					proposed,
					attested,
					route,
				);
				return changes.length ? { changes } : null;
			});
		/**
		 * The verb an adjectival participle's form comes from, named by
		 * generation and checked by a form-only judgment, and whether this
		 * Reading's meaning is a sense of it, settled by a second judgment
		 * (ADR 0036). A plain adjective makes no contribution and no
		 * judgment. Published with the final batch, like the other
		 * structured aspects.
		 */
		const participleSource = () =>
			Effect.gen(function* () {
				const { id, output: form } = yield* executeGeneration(
					options,
					scope,
					{
						stage,
						route,
						input: { ...state, aspect: "participleSource" },
						configuration: effectiveConfiguration(options, route),
						systemPrompt: participleFormPrompt,
						outputSchema: participleFormOutputSchema,
					},
					(output) =>
						parseParticipleForm(
							output,
							reading.lemma.canonicalForm,
							route,
						),
					[],
				);
				if (!form) return null;
				const judge = judgmentCaller(options);
				const [{ output: formJudgment }, { output: meaningJudgment }] =
					yield* Effect.all(
						[
							judge(
								stage,
								route,
								{
									adjective: reading.lemma.canonicalForm,
									verb: form.source,
									preterite: form.preterite,
								},
								participleFormQuestion(
									reading.lemma.canonicalForm,
									form,
								),
								scope,
								[id],
							),
							judge(
								stage,
								route,
								JSON.parse(
									JSON.stringify({
										...state,
										sourceVerb: form.source,
									}),
								),
								participleMeaningQuestion(form.source),
								scope,
								[id],
							),
						],
						{ concurrency: "unbounded" },
					);
				const checked = formJudgment.answers.form;
				const meaning = meaningJudgment.answers.meaning;
				if (checked?.type !== "choice" || meaning?.type !== "choice")
					throw Error("Expected form and meaning choices");
				// The judge rejects a verb that does not build this form.
				if (checked.choice === "NotParticiple") {
					recordEvent(scope, "RejectedParticipleSource", {
						source: form.source,
					});
					return null;
				}
				if (
					checked.choice === "Unresolved" ||
					meaning.choice === "Unresolved"
				)
					return yield* Effect.fail(
						new DumgenFailure(
							"Unresolved",
							stage,
							"The participle's form or meaning is unresolved",
							route,
						),
					);
				return projectKnowledge(
					reading,
					{ participleSource: null },
					{
						participleSource: {
							...form,
							meaning: meaning.choice as Dumrel.ParticipleMeaning,
						},
					},
				);
			});
		/**
		 * The noun's plural: the model names its plural forms only when
		 * requested, and code derives their patterns (#597). The pattern this
		 * sentence attests is Contributed with no model call. Published with
		 * the final batch.
		 */
		const attestedPlural = input.attestedPluralPattern;
		const plural = () =>
			Effect.gen(function* () {
				const proposed = Object.hasOwn(
					authored.missing,
					"pluralPattern",
				)
					? (yield* executeGeneration(
							options,
							scope,
							{
								stage,
								route,
								input: { ...state, aspect: "pluralPattern" },
								configuration: effectiveConfiguration(
									options,
									route,
								),
								systemPrompt: pluralPrompt,
								outputSchema: pluralOutputSchema,
							},
							(output) =>
								parsePlural(
									output,
									reading.lemma.canonicalForm,
									route,
								),
							[],
						)).output
					: null;
				const value = mergedPlural(proposed, attestedPlural);
				return value
					? projectKnowledge(
							reading,
							{ pluralPattern: null },
							{ pluralPattern: value },
						)
					: null;
			});
		const textOutcomes: Array<TextOutcome | undefined> = [];
		const textJobs: Array<Effect.Effect<void, DumgenFailure>> = [];
		const publishOutcomes = () => {
			result.changes = [
				...authored.production.changes,
				...textOutcomes.flatMap((item) => item?.changes ?? []),
			];
			result.failures = textOutcomes.flatMap(
				(item) => item?.failures ?? [],
			);
			snapshot();
		};

		const aspects = Object.entries(authored.missing);
		// Attested government is Contributed even when no frame is requested.
		if (attested.length && !Object.hasOwn(authored.missing, "valency"))
			aspects.push(["valency", null]);
		if (attestedPlural && !Object.hasOwn(authored.missing, "pluralPattern"))
			aspects.push(["pluralPattern", null]);
		for (const [aspect, selection] of aspects) {
			if (aspect === "semanticRelations") continue;
			const leaves =
				aspect === "translations"
					? Object.keys(selection ?? {})
					: [undefined];
			for (const leaf of leaves) {
				const outcomeIndex = textOutcomes.length;
				textOutcomes.push(undefined);
				const targetAspect = aspect as KnowledgeFailure["aspect"];
				textJobs.push(
					expected<TextOutcome, never>(
						Effect.gen(function* () {
							// Intake attests government for authored Readings too.
							if ((closed || exact) && aspect !== "valency")
								throw new DumgenFailure(
									"CatalogMiss",
									stage,
									"Requested Knowledge has not been authored",
									route,
								);
							if (
								aspect !== "definition" &&
								aspect !== "transcription" &&
								aspect !== "translations" &&
								aspect !== "valency" &&
								aspect !== "participleSource" &&
								aspect !== "pluralPattern"
							)
								throw new DumgenFailure(
									"NotImplemented",
									stage,
									"Structured Knowledge generation is deferred",
									route,
								);
							const requestMask = leaf
								? { translations: { [leaf]: null } }
								: { [aspect]: null };
							const validateText = (output: unknown) => {
								if (
									!output ||
									typeof output !== "object" ||
									Object.keys(output).length !== 1 ||
									!("text" in output) ||
									(output.text !== null &&
										typeof output.text !== "string")
								)
									throw new DumgenFailure(
										"InvalidModelOutput",
										stage,
										"Expected only text or null",
										route,
									);
								if (output.text === null) return null;
								const analysis = leaf
									? { translations: { [leaf]: output.text } }
									: { [aspect]: output.text };
								return projectKnowledge(
									reading,
									requestMask,
									analysis,
								);
							};
							const draftText = draftTexts.get(
								`${aspect}/${leaf ?? ""}`,
							);
							const contribution =
								aspect === "valency"
									? yield* valency()
									: aspect === "participleSource"
										? yield* participleSource()
										: aspect === "pluralPattern"
											? yield* plural()
											: draftText !== undefined
												? validateText({
														text: draftText,
													})
												: (yield* executeGeneration(
														options,
														scope,
														{
															stage,
															route,
															input:
																aspect ===
																"transcription"
																	? {
																			lemma: reading.lemma,
																			aspect,
																		}
																	: {
																			...state,
																			aspect,
																			...(leaf
																				? {
																						language:
																							leaf,
																					}
																				: {}),
																		},
															configuration:
																effectiveConfiguration(
																	options,
																	route,
																),
															systemPrompt: `Supply only the requested ${aspect} text for the fixed exact German ${aspect === "transcription" ? "Lemma headword" : "Reading in its marked context. The Reading's emojiDescription is the sense anchor: describe the meaning it names"}. Never change the Lemma, Kind, Core Features or Emoji Description or borrow a neighboring meaning. ${aspect === "definition" ? "Write a concise German definition." : aspect === "transcription" ? "Write broad standard-German IPA without slash or bracket delimiters." : `Translate only the unit marked by <TARGET> into ${leaf}. Use the surrounding sentence only to disambiguate its meaning. Return one concise word or phrase for that Reading, never a translation of the surrounding sentence. ${translationFormClause(String(leaf))} For example, gestern <TARGET>anstrengend</TARGET> gives strenuous in English, not yesterday was strenuous.`} Return {text:string}, or {text:null} if no defensible contribution exists. Do not return judgments or domain objects.`,
															outputSchema: {
																type: "object",
																properties: {
																	text: {
																		type: [
																			"string",
																			"null",
																		],
																	},
																},
																required: [
																	"text",
																],
																additionalProperties: false,
															},
														},
														validateText,
														[],
													)).output;
							if (contribution)
								return {
									changes: contribution.changes,
									failures: [],
								};
							recordEvent(scope, "NoKnowledgeContribution", {
								aspect,
								leaf: leaf ?? null,
							});
							return { changes: [], failures: [] };
						}),
					).pipe(
						Effect.catchAll((error) =>
							Effect.succeed<TextOutcome>({
								changes: [],
								failures: [
									failureFor(targetAspect, error, {
										...(leaf ? { leaf } : {}),
									}),
								],
							}),
						),
						Effect.tap((outcome) => {
							textOutcomes[outcomeIndex] = outcome;
							publishOutcomes();
							if (
								outcome.changes.length &&
								aspect !== "valency" &&
								aspect !== "participleSource" &&
								aspect !== "pluralPattern"
							)
								options.onKnowledgeContribution?.(
									outcome.changes,
								);
						}),
					),
				);
			}
		}
		yield* Effect.all(textJobs, {
			concurrency: "unbounded",
			discard: true,
		});
		const requestedRelations = Object.keys(
			authored.missing.semanticRelations ?? {},
		) as Dumrel.DirectSemanticRelation[];
		if (!requestedRelations.length) return result as KnowledgeProduction;
		if (closed || exact) {
			for (const leaf of requestedRelations)
				failed(
					"semanticRelations",
					new DumgenFailure(
						"CatalogMiss",
						stage,
						"Requested relation has not been authored",
						route,
					),
					{ leaf },
				);
			return result as KnowledgeProduction;
		}
		// The relation judgment depends on the generation that proposed its
		// candidates; drafted candidates came from no call in this operation.
		const drafted = yield* Effect.promise(() =>
			draftedRelationCandidates(options, input),
		);
		const proposal = drafted
			? Either.right({ output: drafted, calls: [] as string[] })
			: yield* Effect.either(
					Effect.map(
						executeGeneration(
							options,
							scope,
							{
								stage,
								route,
								input: { ...state, requestedRelations },
								configuration: effectiveConfiguration(
									options,
									route,
								),
								systemPrompt:
									"Propose up to 16 distinct German Canonical Forms relevant to the requested Semantic Relations of this fixed exact Reading. Preserve its meaning and source Family. Propose text only in a flat candidates array. No relation labels, Kinds, Language, Family, Core Features, Emoji Descriptions, IDs or persistence instructions. Do not propose the source itself, incidental neighbors, inflected Surface forms or duplicate targets. An empty array means no candidates were found, not reviewed exhaustive absence.",
								outputSchema: {
									type: "object",
									properties: {
										candidates: {
											type: "array",
											items: { type: "string" },
											maxItems: 16,
										},
									},
									required: ["candidates"],
									additionalProperties: false,
								},
							},
							(output) => {
								if (
									!output ||
									typeof output !== "object" ||
									Object.keys(output).length !== 1 ||
									!("candidates" in output) ||
									!Array.isArray(output.candidates) ||
									output.candidates.length > 16 ||
									output.candidates.some(
										(value) =>
											typeof value !== "string" ||
											!normalizeText(value),
									)
								)
									throw new DumgenFailure(
										"InvalidModelOutput",
										stage,
										"Expected a bounded flat array of candidate text",
										route,
									);
								return [
									...new Set(
										output.candidates.map((value) =>
											normalizeText(value),
										),
									),
								];
							},
							[],
						),
						({ id, output }) => ({ output, calls: [id] }),
					),
				);
		if (Either.isLeft(proposal)) {
			for (const leaf of requestedRelations)
				failed("semanticRelations", proposal.left, { leaf });
			return result as KnowledgeProduction;
		}
		const { output: candidates, calls: proposedBy } = proposal.right;
		recordEvent(scope, "RelationCandidates", {
			candidates,
			requestedRelations,
		});
		if (!candidates.length) return result as KnowledgeProduction;
		const familyKinds = kinds[reading.lemma.family as keyof typeof kinds];
		if (!familyKinds)
			throw new DumgenFailure(
				"InvalidInput",
				stage,
				"Relations are not applicable to this Family",
				route,
			);
		const questions: Questions = {};
		for (const [index, candidate] of candidates.entries()) {
			questions[`kind_${index}`] = choice(
				`Classify candidate ${index} (${candidate}) as a whole unit in source Family ${reading.lemma.family}. Do not force a cross-Family candidate into a same-Family Kind. The target Kind may differ from the source.`,
				{
					...Object.fromEntries(
						familyKinds.map((kind) => [kind, kind]),
					),
					OtherFamily: "Candidate is not a unit in the source Family",
					Unresolved: "Cannot resolve this candidate Kind",
				},
			);
			questions[`relation_${index}`] = choice(
				`Which requested direct relation does candidate ${index} (${candidate}) bear to the fixed source Reading? Relation must hold generally for this Reading, not merely this sentence. Distinguish exact/near relations. Do not create a self relation or conflate category and whole. Select None when no requested relation holds.`,
				{
					...Object.fromEntries(
						requestedRelations.map((relation) => [
							relation,
							relationCriteria[relation],
						]),
					),
					None: "No requested relation applies to this candidate",
					Unresolved: "Cannot defensibly decide the relation",
				},
			);
		}
		const judging = expected(
			Effect.gen(function* () {
				const { output: judgments } = yield* judgmentCaller(options)(
					stage,
					route,
					JSON.parse(
						JSON.stringify({
							...state,
							candidates,
							requestedRelations,
						}),
					),
					questions,
					scope,
					proposedBy,
				);
				for (const [index, candidate] of candidates.entries()) {
					const kind = judgments.answers[`kind_${index}`],
						relation = judgments.answers[`relation_${index}`];
					if (kind?.type !== "choice" || relation?.type !== "choice")
						throw Error("Expected candidate choices");
					const namesSource =
						normalizeText(candidate) ===
							reading.lemma.canonicalForm &&
						kind.choice === reading.lemma.kind;
					if (
						relation.choice === "None" ||
						kind.choice === "OtherFamily" ||
						namesSource
					) {
						recordEvent(scope, "RejectedRelationCandidate", {
							candidate,
							kind: kind.choice,
							relation: relation.choice,
						});
						continue;
					}
					if (
						kind.choice === "Unresolved" ||
						relation.choice === "Unresolved"
					) {
						failed(
							"semanticRelations",
							new DumgenFailure(
								"Unresolved",
								stage,
								"Candidate relation or Kind is unresolved",
								route,
							),
							{ candidate },
						);
						continue;
					}
					const projected = projectKnowledge(
						reading,
						{ semanticRelations: { [relation.choice]: null } },
						{
							semanticRelations: {
								[relation.choice]: [
									{
										canonicalForm: candidate,
										kind: kind.choice,
									},
								],
							},
						},
					);
					result.pendingRelations.push(...projected.pendingRelations);
				}
				snapshot();
			}),
		);
		const judged = yield* Effect.either(judging);
		if (Either.isLeft(judged))
			for (const leaf of requestedRelations)
				failed("semanticRelations", judged.left, { leaf });
		return parse<KnowledgeProduction>(
			"knowledgeProductionSchema",
			result,
			stage,
			true,
		);
	});
}
