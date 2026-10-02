import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type {
	DumgenOptions,
	Encounter,
	KnowledgeRequest,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { executeGeneration } from "../../../universal/model.js";
import { effectiveConfiguration } from "../../../universal/model-configuration.js";
import {
	fingerprint,
	type OperationScope,
	operation,
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
	"Write the broad standard-German IPA transcription of the German headword in <target_lemma>, without slash or bracket delimiters. Reply with the transcription only.";

/**
 * A translation is the target-language dictionary form of the Reading's
 * Lemma, never the sentence's inflection of it: war gives "be", not "was";
 * besser gives "good", not "better".
 */
export function translationFormClause(language: string) {
	return `Write that translation in its ${language} dictionary headword form; do not carry over the tense, person, number or case of the German sentence. It translates the supplied Lemma: a comparative or superlative gives the positive, and a noun stays singular unless it exists only in the plural. A verb or verbal idiom becomes a verb phrase that keeps any reflexive or particle its meaning needs. Leave a discourse formula as it is said.`;
}

/** Definitions and translations describe the sense the marked target carries in this sentence. */
function senseTextPrompt(
	aspect: "definition" | "translations",
	language: string | undefined,
) {
	return `${aspect === "definition" ? "Write a concise German definition of" : `Translate into ${language}`} the German headword in <target_lemma>, as used at <TARGET> in <marked_sentence>. The sentence is the sense anchor: determine what the marked expression means HERE, including figurative uses, and describe that meaning, not another sense of the same headword and not the surrounding scene. Describe the meaning so the text also fits other sentences with that meaning; do not add incidental participants or objects from this sentence, and do not borrow a neighboring word's meaning. ${aspect === "definition" ? "Reply with the definition only." : `Return one concise word or phrase, never the whole sentence. ${translationFormClause(String(language))} Reply with the translation only.`}`;
}

/** Drafts see the headword and the marked sentence as tagged text, never the Lemma DTO. */
function draftInput(lemma: Dumling.Lemma, encounter?: Encounter, extra = "") {
	return [
		`<target_lemma>${lemma.canonicalForm}</target_lemma>`,
		...(encounter
			? [
					`<marked_sentence>${markedContext(encounter).markedContext}</marked_sentence>`,
				]
			: []),
		...(extra ? [extra] : []),
	].join("\n");
}

function draftText(stage: string, route: string, output: unknown) {
	if (typeof output !== "string")
		throw new DumgenFailure(
			"InvalidModelOutput",
			stage,
			"Expected text",
			route,
		);
	return output.trim();
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

/** Drafts are anchored on the marked sentence and Lemma, so they can run before the Reading is resolved. */
export function knowledgeDraftFingerprint(
	encounter: Encounter,
	lemma: Dumling.Lemma,
) {
	return fingerprint({ context: markedContext(encounter), lemma });
}

/** Drafts run concurrently with Reading resolution; reuse checks are local only. */
export function draftKnowledge(
	options: DumgenOptions,
	input: {
		encounter: Encounter;
		lemma: Dumling.Lemma;
		request: KnowledgeRequest;
	},
) {
	return operation(options)("draftKnowledge", input, (scope) =>
		Effect.gen(function* () {
			const encounter = validateEncounter(
				input.encounter,
				"draftKnowledge",
			);
			const lemma = parse<Dumling.Lemma>(
				"lemmaSchema",
				input.lemma,
				"draftKnowledge",
			);
			if (
				lemma.language !== encounter.sentence.language ||
				lemma.family !== encounter.target.family ||
				lemma.kind !== encounter.target.kind
			)
				throw new DumgenFailure(
					"InvalidInput",
					"draftKnowledge",
					"Draft Lemma and Encounter routes disagree",
				);
			const sourceFingerprint = yield* Effect.promise(() =>
				knowledgeDraftFingerprint(encounter, lemma),
			);
			if (
				lemma.language !== "de" ||
				authoredFor(lemma) ||
				closedRoute(lemma)
			)
				return { sourceFingerprint, texts: [] } as KnowledgeDraft;
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
					).map((language) =>
						executeGeneration(
							options,
							scope,
							{
								stage: "draftKnowledge",
								route,
								configuration: effectiveConfiguration(
									options,
									route,
								),
								input:
									aspect === "transcription"
										? draftInput(lemma)
										: draftInput(lemma, encounter),
								systemPrompt:
									aspect === "transcription"
										? transcriptionPrompt
										: senseTextPrompt(aspect, language),
								outputFormat: "text",
							},
							(output) =>
								draftText("draftKnowledge", route, output),
							[],
						).pipe(
							Effect.map(
								({ output: text }): KnowledgeDraft["texts"] =>
									text
										? [
												{
													aspect,
													...(language
														? { language }
														: {}),
													text,
												},
											]
										: [],
							),
							Effect.catchAll((error) =>
								Effect.sync(() => {
									recordEvent(scope, "KnowledgeDraftFailed", {
										aspect,
										language: language ?? null,
										message: String(error),
									});
									return [];
								}),
							),
						),
					);
				},
			);
			const requested = Object.keys(
				input.request.semanticRelations ?? {},
			);
			const relationsJob = requested.length
				? executeGeneration(
						options,
						scope,
						{
							stage: "draftRelationCandidates",
							route,
							configuration: effectiveConfiguration(
								options,
								route,
							),
							input: draftInput(
								lemma,
								encounter,
								`<requested_relations>${requested.join(", ")}</requested_relations>`,
							),
							systemPrompt:
								"Propose up to 16 distinct German dictionary forms that stand in the relations listed in <requested_relations> to the German headword in <target_lemma>, as used at <TARGET> in <marked_sentence>. The sentence is the sense anchor: relate only to the meaning the marked target carries here, not another sense of the same headword. Keep a single word for a single word and a fixed expression for a fixed expression. Do not include the headword itself, incidental neighbors or inflected forms. Reply with one dictionary form per line and nothing else.",
							outputFormat: "text",
						},
						(output) =>
							[
								...new Set(
									draftText(
										"draftRelationCandidates",
										route,
										output,
									)
										.split("\n")
										.map((line) => line.trim())
										.filter(Boolean),
								),
							].slice(0, 16),
						[],
					).pipe(
						Effect.map(({ output: candidates }) => ({
							requested,
							candidates,
						})),
						Effect.catchAll((error) =>
							Effect.sync(() => {
								recordEvent(scope, "RelationDraftFailed", {
									message: String(error),
								});
								return undefined;
							}),
						),
					)
				: Effect.succeed(undefined);
			// A failed draft is recorded and dropped while its siblings continue;
			// only a defect or interruption stops them.
			const [texts, relations] = yield* Effect.all(
				[Effect.all(jobs, { concurrency: "unbounded" }), relationsJob],
				{ concurrency: "unbounded" },
			);
			return {
				sourceFingerprint,
				texts: texts.flat(),
				...(relations ? { relations } : {}),
			} as KnowledgeDraft;
		}),
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
	scope: OperationScope,
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
			(await knowledgeDraftFingerprint(
				input.encounter,
				input.reading.lemma,
			))
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
	recordEvent(scope, "KnowledgeDraftReused", {
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
			(await knowledgeDraftFingerprint(
				input.encounter,
				input.reading.lemma,
			)) ||
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
