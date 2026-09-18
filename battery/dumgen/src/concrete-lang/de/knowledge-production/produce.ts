import type * as Dumling from "dumling/types";
import { normalizeText } from "dumrel";
import type * as Dumrel from "dumrel/types";
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
import {
	effectiveConfiguration,
	executeGeneration,
} from "../../../universal/model.js";
import { choice } from "../../../universal/questions.js";
import { contextFor, recordEvent } from "../../../universal/trace.js";
import { markedContext, parse } from "../../../universal/validation.js";
import {
	authoredReading,
	closedRoute,
} from "../authored-closed-sets/select.js";
import { germanFusion } from "../fusions.js";
import { draftedRelationCandidates, draftedTexts } from "./draft.js";
import { germanRelationTargetKindsByFamily as kinds } from "./families.js";
import {
	authoredKnowledge,
	projectKnowledge,
	validateRequest,
} from "./project.js";

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

export async function produceKnowledge(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		reading: Dumling.Reading;
		request: KnowledgeRequest;
	},
	signal: AbortSignal,
): Promise<KnowledgeProduction> {
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
				production: { changes: [], pendingRelations: [], failures: [] },
				missing: request,
			};
	const result: MutableProduction = {
		changes: [...authored.production.changes],
		pendingRelations: [...authored.production.pendingRelations],
		failures: [],
	};
	const snapshot = () =>
		recordEvent(signal, "KnowledgeContributions", structuredClone(result));
	const failureFor = (
		aspect: KnowledgeFailure["aspect"],
		error: unknown,
		detail: Pick<KnowledgeFailure, "leaf" | "candidate"> = {},
	): KnowledgeFailure => {
		signal.throwIfAborted();
		const failure =
			error instanceof DumgenFailure
				? error
				: new DumgenFailure(
						"InvalidModelOutput",
						stage,
						error instanceof Error ? error.message : String(error),
						route,
					);
		return {
			aspect,
			...detail,
			code: failure._tag,
			message: failure.message,
		};
	};
	const failed = (
		aspect: KnowledgeFailure["aspect"],
		error: unknown,
		detail: Pick<KnowledgeFailure, "leaf" | "candidate"> = {},
	) => {
		result.failures.push(failureFor(aspect, error, detail));
		snapshot();
	};
	snapshot();
	const draftTexts = await draftedTexts(
		options,
		{ ...input, request: authored.missing },
		signal,
	);
	const state = {
		reading,
		markedContext: markedContext(input.encounter).markedContext,
	};
	type TextOutcome = {
		changes: readonly Dumrel.KnowledgeChange[];
		failures: KnowledgeFailure[];
	};
	const textOutcomes: Array<TextOutcome | undefined> = [];
	const textJobs: Array<Promise<void>> = [];
	const publishOutcomes = () => {
		result.changes = [
			...authored.production.changes,
			...textOutcomes.flatMap((item) => item?.changes ?? []),
		];
		result.failures = textOutcomes.flatMap((item) => item?.failures ?? []);
		snapshot();
	};

	for (const [aspect, selection] of Object.entries(authored.missing)) {
		if (aspect === "semanticRelations") continue;
		if (aspect === "lexicalBreakdown" && reading.lemma.kind === "Fusion") {
			const fusion = germanFusion(reading.lemma.canonicalForm);
			if (fusion)
				textOutcomes.push({
					failures: [],
					changes: [
						{
							kind: "Contribute",
							aspect: "lexicalBreakdown",
							value: [
								{
									language: "de",
									family: "Lexeme",
									kind: "ADP",
									canonicalForm: fusion.adposition,
								},
								{
									language: "de",
									family: "Lexeme",
									kind: "DET",
									canonicalForm: fusion.articleLemma,
								},
							],
						},
					],
				});
			else
				textOutcomes.push({
					changes: [],
					failures: [
						failureFor(
							"lexicalBreakdown",
							new DumgenFailure(
								"Unresolved",
								stage,
								"No reviewed Fusion breakdown",
								route,
							),
						),
					],
				});
			publishOutcomes();
			continue;
		}
		const leaves =
			aspect === "translations"
				? Object.keys(selection ?? {})
				: [undefined];
		for (const leaf of leaves) {
			const outcomeIndex = textOutcomes.length;
			textOutcomes.push(undefined);
			textJobs.push(
				(async () => {
					signal.throwIfAborted();
					const targetAspect = aspect as KnowledgeFailure["aspect"];
					let outcome: TextOutcome;
					try {
						if (closed || exact)
							throw new DumgenFailure(
								"CatalogMiss",
								stage,
								"Requested Knowledge has not been authored",
								route,
							);
						if (
							aspect !== "definition" &&
							aspect !== "transcription" &&
							aspect !== "translations"
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
								throw Error("Expected only text or null");
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
							draftText !== undefined
								? validateText({ text: draftText })
								: await executeGeneration(
										options,
										{
											stage,
											route,
											input:
												aspect === "transcription"
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
											signal,
											configuration:
												effectiveConfiguration(
													options,
													route,
												),
											systemPrompt: `Supply only the requested ${aspect} text for the fixed exact German ${aspect === "transcription" ? "Lemma headword" : "Reading in its marked context. The Reading's emojiDescription is the sense anchor: describe the meaning it names"}. Never change the Lemma, Kind, Core Features or Emoji Description or borrow a neighboring meaning. ${aspect === "definition" ? "Write a concise German definition." : aspect === "transcription" ? "Write broad standard-German IPA without slash or bracket delimiters." : `Translate only the unit marked by <TARGET> into ${leaf}. Use the surrounding sentence only to disambiguate its meaning. Return one concise word or phrase for that Reading, never a translation of the surrounding sentence. For example, gestern <TARGET>anstrengend</TARGET> gives strenuous in English, not yesterday was strenuous.`} ${reading.lemma.kind === "Fusion" && aspect === "definition" ? "Explain the expanded preposition plus contextual article and its Case (im = in dem, Dativ; zum = zu dem, Dativ; ins = in das, Akkusativ). These expanded components are an explanation, not separately attested words." : ""} Return {text:string}, or {text:null} if no defensible contribution exists. Do not return judgments or domain objects.`,
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
												required: ["text"],
												additionalProperties: false,
											},
										},
										validateText,
										[],
									);
						if (contribution)
							outcome = {
								changes: contribution.changes,
								failures: [],
							};
						else {
							recordEvent(signal, "NoKnowledgeContribution", {
								aspect,
								leaf: leaf ?? null,
							});
							outcome = { changes: [], failures: [] };
						}
					} catch (error) {
						outcome = {
							changes: [],
							failures: [
								failureFor(targetAspect, error, {
									...(leaf ? { leaf } : {}),
								}),
							],
						};
					}
					textOutcomes[outcomeIndex] = outcome;
					publishOutcomes();
					if (outcome.changes.length) {
						signal.throwIfAborted();
						options.onKnowledgeContribution?.(outcome.changes);
					}
				})(),
			);
		}
	}
	await Promise.all(textJobs);
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
	let candidates: string[];
	try {
		candidates =
			(await draftedRelationCandidates(options, input)) ??
			(await executeGeneration(
				options,
				{
					stage,
					route,
					input: { ...state, requestedRelations },
					signal,
					configuration: effectiveConfiguration(options, route),
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
						throw Error(
							"Expected a bounded flat array of candidate text",
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
			));
	} catch (error) {
		for (const leaf of requestedRelations)
			failed("semanticRelations", error, { leaf });
		return result as KnowledgeProduction;
	}
	recordEvent(signal, "RelationCandidates", {
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
				...Object.fromEntries(familyKinds.map((kind) => [kind, kind])),
				OtherFamily: "Candidate is not a unit in the source Family",
				Unresolved: "Cannot resolve this candidate Kind",
			},
		);
		questions[`relation_${index}`] = choice(
			`Which requested direct relation does candidate ${index} (${candidate}) bear to the fixed source Reading? Relation must hold generally for this Reading, not merely this sentence. Distinguish exact/near relations. Do not create a self relation, conflate category and whole, or select inverse-only Hyponym or Meronym. Select None when no requested relation holds.`,
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
	try {
		const parent = contextFor(signal).calls.findLast(
			(call) =>
				call.request.stage === stage &&
				"requestedRelations" in
					(call.request.input as Record<string, unknown>),
		);
		const judgments = await judgmentCaller(options)(
			stage,
			route,
			JSON.parse(
				JSON.stringify({ ...state, candidates, requestedRelations }),
			),
			questions,
			signal,
			parent ? [parent.id] : [],
		);
		for (const [index, candidate] of candidates.entries()) {
			const kind = judgments.answers[`kind_${index}`],
				relation = judgments.answers[`relation_${index}`];
			if (kind?.type !== "choice" || relation?.type !== "choice")
				throw Error("Expected candidate choices");
			if (relation.choice === "None" || kind.choice === "OtherFamily") {
				recordEvent(signal, "RejectedRelationCandidate", {
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
							{ canonicalForm: candidate, kind: kind.choice },
						],
					},
				},
			);
			result.pendingRelations.push(...projected.pendingRelations);
		}
		snapshot();
	} catch (error) {
		for (const leaf of requestedRelations)
			failed("semanticRelations", error, { leaf });
	}
	return parse<KnowledgeProduction>(
		"knowledgeProductionSchema",
		result,
		stage,
		true,
	);
}
