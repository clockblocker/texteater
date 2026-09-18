import type * as Dumling from "dumling/types";
import type {
	DumgenOptions,
	Encounter,
	KnowledgeRequest,
} from "../../../types.js";
import {
	effectiveConfiguration,
	executeGeneration,
} from "../../../universal/model.js";
import {
	fingerprint,
	operationTask,
	recordEvent,
} from "../../../universal/trace.js";
import {
	markedContext,
	parse,
	validateEncounter,
} from "../../../universal/validation.js";
import { authoredFor, closedRoute } from "../authored-closed-sets/select.js";

/** Transcription belongs to the Lemma headword; no sentence or Reading is needed. */
const transcriptionPrompt =
	"Write the broad standard-German IPA transcription of the supplied German Lemma headword, without slash or bracket delimiters. Preserve the Lemma exactly. Return {text:string}, or {text:null} if the pronunciation is uncertain.";

/** Definitions and translations describe the sense the Reading's Emoji Description names. */
function senseTextPrompt(
	aspect: "definition" | "translations",
	language: string | undefined,
) {
	return `Draft only the requested ${aspect} for the fixed exact German Reading in its marked context. The Reading's emojiDescription is the sense anchor: describe the meaning it names, not another sense of the same Lemma and not the surrounding scene. Never change the Lemma, Kind, Core Features or Emoji Description, and do not borrow a neighboring word's meaning. ${aspect === "definition" ? "Write a concise German definition." : `Translate only the marked target into ${language}; return one concise word or phrase, never the whole sentence.`} Return {text:string}, or {text:null} if no defensible contribution exists. The caller attaches this text to the Reading after local validation.`;
}

export type KnowledgeDraft = {
	readonly sourceFingerprint: string;
	readonly relations?: {
		readonly requested: readonly string[];
		readonly candidates: readonly string[];
	};
	readonly texts: readonly {
		readonly aspect: "definition" | "transcription" | "translations";
		readonly language?: string;
		readonly text: string;
	}[];
};

/** The Reading's Emoji Description is the sense anchor; drafts are bound to it. */
export function knowledgeDraftFingerprint(
	encounter: Encounter,
	reading: Dumling.Reading,
) {
	return fingerprint({ context: markedContext(encounter), reading });
}

/** Drafts describe an already resolved Reading; reuse checks are local only. */
export function draftKnowledge(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		reading: Dumling.Reading;
		request: KnowledgeRequest;
	},
) {
	return operationTask(options)(
		"draftKnowledge",
		input,
		async (signal): Promise<KnowledgeDraft> => {
			const encounter = validateEncounter(
				input.encounter,
				"draftKnowledge",
			);
			const reading = parse<Dumling.Reading>(
				"readingSchema",
				input.reading,
				"draftKnowledge",
			);
			const lemma = reading.lemma;
			if (
				lemma.language !== encounter.sentence.language ||
				lemma.family !== encounter.target.family ||
				lemma.kind !== encounter.target.kind
			)
				throw Error("Draft Reading and Encounter routes disagree");
			const sourceFingerprint = await knowledgeDraftFingerprint(
				encounter,
				reading,
			);
			if (
				lemma.language !== "de" ||
				authoredFor(lemma) ||
				closedRoute(lemma)
			)
				return { sourceFingerprint, texts: [] };
			const route = `de/${lemma.family}/${lemma.kind}`;
			const jobs = Object.entries(input.request).flatMap(
				([aspect, selection]) => {
					if (
						aspect !== "definition" &&
						aspect !== "transcription" &&
						aspect !== "translations"
					)
						return [];
					return (
						aspect === "translations"
							? Object.keys(selection ?? {})
							: [undefined]
					).map(
						async (language): Promise<KnowledgeDraft["texts"]> => {
							try {
								const text = await executeGeneration(
									options,
									{
										stage: "draftKnowledge",
										route,
										signal,
										configuration: effectiveConfiguration(
											options,
											route,
										),
										input:
											aspect === "transcription"
												? { lemma, aspect }
												: {
														reading,
														markedContext:
															markedContext(
																encounter,
															).markedContext,
														aspect,
														...(language
															? { language }
															: {}),
													},
										systemPrompt:
											aspect === "transcription"
												? transcriptionPrompt
												: senseTextPrompt(
														aspect,
														language,
													),
										outputSchema: {
											type: "object",
											properties: {
												text: {
													type: ["string", "null"],
												},
											},
											required: ["text"],
											additionalProperties: false,
										},
									},
									(output) => {
										if (
											!output ||
											typeof output !== "object" ||
											!("text" in output) ||
											Object.keys(output).length !== 1 ||
											(output.text !== null &&
												typeof output.text !== "string")
										)
											throw Error(
												"Expected text or null",
											);
										return output.text;
									},
									[],
								);
								return text
									? [
											{
												aspect,
												...(language
													? { language }
													: {}),
												text,
											},
										]
									: [];
							} catch (error) {
								signal.throwIfAborted();
								recordEvent(signal, "KnowledgeDraftFailed", {
									aspect,
									language: language ?? null,
									message: String(error),
								});
								return [];
							}
						},
					);
				},
			);
			const requested = Object.keys(
				input.request.semanticRelations ?? {},
			);
			const relationsJob = requested.length
				? (async () => {
						try {
							const candidates = await executeGeneration(
								options,
								{
									stage: "draftRelationCandidates",
									route,
									signal,
									configuration: effectiveConfiguration(
										options,
										route,
									),
									input: {
										reading,
										markedContext:
											markedContext(encounter)
												.markedContext,
										requestedRelations: requested,
									},
									systemPrompt:
										"Propose up to 16 distinct German Canonical Forms for the requested semantic relations of the fixed exact Reading in this marked context. The Reading's emojiDescription is the sense anchor; relate to that sense only. Preserve the source Family. Return only {candidates:string[]}. Do not include the source itself, incidental neighbors or inflected forms. The relation Kind and label are selected separately.",
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
								(value) => {
									if (
										!value ||
										typeof value !== "object" ||
										!("candidates" in value) ||
										!Array.isArray(value.candidates) ||
										value.candidates.length > 16 ||
										!value.candidates.every(
											(candidate): candidate is string =>
												typeof candidate === "string" &&
												!!candidate.trim(),
										)
									)
										throw Error(
											"Expected bounded candidate text",
										);
									return [
										...new Set(
											value.candidates.map((candidate) =>
												candidate.trim(),
											),
										),
									];
								},
								[],
							);
							return { requested, candidates };
						} catch (error) {
							signal.throwIfAborted();
							recordEvent(signal, "RelationDraftFailed", {
								message: String(error),
							});
							return undefined;
						}
					})()
				: Promise.resolve(undefined);
			const [texts, relations] = await Promise.all([
				Promise.all(jobs),
				relationsJob,
			]);
			return {
				sourceFingerprint,
				texts: texts.flat(),
				...(relations ? { relations } : {}),
			};
		},
	);
}

/** Reuse matching generated text without asking another model to review it. */
export async function draftedTexts(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		reading: Dumling.Reading;
		request: KnowledgeRequest;
	},
	signal: AbortSignal,
): Promise<Map<string, string>> {
	const accepted = new Map<string, string>();
	const draft = options.knowledgeDraft;
	if (
		!draft ||
		typeof draft !== "object" ||
		!("sourceFingerprint" in draft) ||
		!("texts" in draft) ||
		!Array.isArray(draft.texts) ||
		draft.texts.length > 20 ||
		draft.sourceFingerprint !==
			(await knowledgeDraftFingerprint(input.encounter, input.reading))
	)
		return accepted;
	const texts = draft.texts.filter(
		(item): item is KnowledgeDraft["texts"][number] => {
			if (
				!item ||
				typeof item !== "object" ||
				typeof item.text !== "string" ||
				!item.text.trim()
			)
				return false;
			return item.aspect === "translations"
				? typeof item.language === "string" &&
						Object.hasOwn(
							input.request.translations ?? {},
							item.language,
						)
				: (item.aspect === "definition" ||
						item.aspect === "transcription") &&
						item.language === undefined &&
						Object.hasOwn(input.request, item.aspect);
		},
	);
	for (const item of texts)
		accepted.set(`${item.aspect}/${item.language ?? ""}`, item.text);
	recordEvent(signal, "KnowledgeDraftReused", {
		aspects: [...accepted.keys()],
	});
	return accepted;
}

export async function draftedRelationCandidates(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		reading: Dumling.Reading;
		request: KnowledgeRequest;
	},
): Promise<string[] | undefined> {
	const draft = options.knowledgeDraft;
	if (
		!draft ||
		typeof draft !== "object" ||
		!("sourceFingerprint" in draft) ||
		draft.sourceFingerprint !==
			(await knowledgeDraftFingerprint(input.encounter, input.reading)) ||
		!("relations" in draft)
	)
		return undefined;
	const relations = draft.relations;
	if (
		!relations ||
		typeof relations !== "object" ||
		!("requested" in relations) ||
		!Array.isArray(relations.requested) ||
		!Object.keys(input.request.semanticRelations ?? {}).every(
			(relation) =>
				Array.isArray(relations.requested) &&
				relations.requested.includes(relation),
		) ||
		!("candidates" in relations) ||
		!Array.isArray(relations.candidates) ||
		relations.candidates.length > 16 ||
		!relations.candidates.every(
			(candidate): candidate is string =>
				typeof candidate === "string" && !!candidate.trim(),
		)
	)
		return undefined;
	return [
		...new Set(relations.candidates.map((candidate) => candidate.trim())),
	];
}
