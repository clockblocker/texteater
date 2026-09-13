import type * as Dumling from "dumling/types";
import { grammarPromptRoutes } from "../../generated/prompts.js";
import type {
	AnalysisTarget,
	Dumgen,
	DumgenOptions,
	Encounter,
	KnowledgeProduction,
	KnowledgeRequest,
	SegmentedSentence,
} from "../../types.js";
import { DumgenFailure } from "../../universal/failure.js";
import { modelCaller } from "../../universal/model.js";
import { task } from "../../universal/task.js";
import {
	markedContext,
	parse,
	validateEncounter,
} from "../../universal/validation.js";
import { authoredFor, closedRoute, sameValue } from "./authored/select.js";
import {
	type GrammarOutput,
	normalizeGrammarSurface,
} from "./grammatical-resolution/project.js";
import {
	authoredKnowledge,
	type KnowledgeAnalysis,
	projectKnowledge,
	validateRequest,
} from "./knowledge-production/project.js";
import {
	createGermanHighLevelTargetClassificationProjection,
	type GermanHighLevelTargetClassificationModelOutput,
} from "./target-classification/projection.js";

function routeOf(encounter: Encounter): string {
	return `${encounter.sentence.language}/${encounter.target.family}/${encounter.target.kind}`;
}
function agreement(
	encounter: Encounter,
	lemma: Dumling.Lemma,
	stage: string,
): void {
	if (
		lemma.language !== encounter.sentence.language ||
		lemma.family !== encounter.target.family ||
		lemma.kind !== encounter.target.kind
	)
		throw new DumgenFailure(
			"InvalidInput",
			stage,
			"Encounter and Lemma routes disagree",
			routeOf(encounter),
		);
}
function supported(encounter: Encounter, stage: string): void {
	if (encounter.sentence.language !== "de")
		throw new DumgenFailure(
			"NotImplemented",
			stage,
			"Production is not enabled for this Language",
			routeOf(encounter),
		);
}
type EmojiInput = {
	encounter: Encounter;
	lemma: Dumling.Lemma;
	candidates?: readonly string[];
};
type KnowledgeInput = {
	encounter: Encounter;
	reading: Dumling.Reading;
	request: KnowledgeRequest;
};

/** German owns its dispatch and model-call grouping behind the shared encounter contract. */
export function createGermanOperations(
	options: DumgenOptions,
): Omit<Dumgen, "segment"> {
	const call = modelCaller(options);
	async function emoji(
		raw: EmojiInput,
		compare: boolean,
		signal: AbortSignal,
	): Promise<string> {
		const stage = compare
			? "resolveOrGenerateReadingEmojiDescription"
			: "generateReadingEmojiDescription";
		const input = parse<EmojiInput>(
			compare ? "comparisonInput" : "generationInput",
			raw,
			stage,
		);
		const encounter = validateEncounter(input.encounter, stage);
		agreement(encounter, input.lemma, stage);
		supported(encounter, stage);
		const member = authoredFor(input.lemma);
		if (member) return member.reading.emojiDescription;
		if (closedRoute(input.lemma))
			throw new DumgenFailure(
				"CatalogMiss",
				stage,
				"Lemma is absent from the Fixed Catalog",
				routeOf(encounter),
			);
		const result = await call<{ emojiDescription: string }>(
			stage,
			routeOf(encounter),
			compare ? "reading-resolution/de" : "reading-generation/de",
			"emojiOutput",
			{
				markedContext: markedContext(encounter).markedContext,
				lemma: input.lemma.canonicalForm,
				...(compare
					? { existingEmojiDescriptions: input.candidates }
					: {}),
			},
			signal,
		);
		return result.emojiDescription;
	}
	const operations = {
		classifyTarget<L extends Dumling.Language>(raw: {
			sentence: SegmentedSentence<L>;
			clickedSegmentIndex: number;
		}) {
			return task("classifyTarget", async (signal) => {
				const input = parse<typeof raw>(
					"classifyInputSchema",
					raw,
					"classifyTarget",
				);
				if (
					input.sentence.segments[input.clickedSegmentIndex]?.kind !==
					"ResolvableText"
				)
					throw new DumgenFailure(
						"InvalidInput",
						"classifyTarget",
						"Click must reference a ResolvableText segment",
					);
				if (input.sentence.language !== "de")
					throw new DumgenFailure(
						"NotImplemented",
						"classifyTarget",
						"Target Classification is not enabled for this Language",
					);
				const projection =
					createGermanHighLevelTargetClassificationProjection({
						segments: input.sentence.segments,
						clickedSegmentIndex: input.clickedSegmentIndex,
					});
				const result =
					await call<GermanHighLevelTargetClassificationModelOutput>(
						"classifyTarget",
						"de",
						"target-classification/de/high-level-whole-unit",
						"target/de",
						projection.modelInput,
						signal,
					);
				const target = projection.canonicalize(result);
				if ("decision" in target)
					throw new DumgenFailure(
						"Unresolved",
						"classifyTarget",
						"No defensible target",
					);
				return validateEncounter(
					{ sentence: input.sentence, target },
					"classifyTarget",
				).target as AnalysisTarget<L>;
			});
		},
		resolveGrammar<L extends Dumling.Language>(raw: Encounter<L>) {
			return task("resolveGrammar", async (signal) => {
				const encounter = validateEncounter(raw, "resolveGrammar");
				supported(encounter, "resolveGrammar");
				const route = routeOf(encounter),
					input = markedContext(encounter);
				const output = await call<
					GrammarOutput | { decision: "Unresolved" }
				>(
					"resolveGrammar",
					route,
					grammarPromptRoutes[route] ?? "",
					`grammar/${route}`,
					input,
					signal,
				);
				if ("decision" in output)
					throw new DumgenFailure(
						"Unresolved",
						"resolveGrammar",
						"Target could not be resolved",
						route,
					);
				const normalizedSurface = normalizeGrammarSurface(
					input,
					output,
					encounter.target,
				);
				const lemma = parse<Dumling.Lemma>(
					"lemmaSchema",
					{
						...output.lemma,
						unitKind: "Lemma",
						language: encounter.sentence.language,
						family: encounter.target.family,
						kind: encounter.target.kind,
					},
					"resolveGrammar",
					true,
				);
				const authored = authoredFor(lemma);
				if (closedRoute(lemma) && !authored)
					throw new DumgenFailure(
						"CatalogMiss",
						"resolveGrammar",
						"Resolved Lemma is outside the Fixed Catalog",
						route,
					);
				if (
					output.realizationCoverage !== "Full" &&
					lemma.family !== "Phraseme"
				)
					throw new DumgenFailure(
						"InvalidModelOutput",
						"resolveGrammar",
						"Partial realization belongs to a Phraseme route",
						route,
					);
				return parse<Dumling.Attestation<L>>(
					"attestationSchema",
					{
						unitKind: "Attestation",
						surface: {
							...output.surface,
							unitKind: "Surface",
							language: encounter.sentence.language,
							lemma: authored?.lemma ?? lemma,
							normalizedSurface,
						},
						members: input.members.map((attested, index) => ({
							attested,
							orthography: output.memberOrthographies[index],
						})),
						realizationCoverage: output.realizationCoverage,
					},
					"resolveGrammar",
					true,
				);
			});
		},
		generateReadingEmojiDescription(raw: EmojiInput) {
			return task("generateReadingEmojiDescription", (signal) =>
				emoji(raw, false, signal),
			);
		},
		resolveOrGenerateReadingEmojiDescription(raw: EmojiInput) {
			return task(
				"resolveOrGenerateReadingEmojiDescription",
				async (signal) => {
					const description = await emoji(raw, true, signal);
					return {
						decision: raw.candidates?.includes(description)
							? ("Reuse" as const)
							: ("New" as const),
						emojiDescription: description,
					};
				},
			);
		},
		produceKnowledge(raw: KnowledgeInput) {
			return task("produceKnowledge", async (signal) => {
				const input = parse<KnowledgeInput>(
					"knowledgeInput",
					raw,
					"produceKnowledge",
				);
				const encounter = validateEncounter(
					input.encounter,
					"produceKnowledge",
				);
				agreement(encounter, input.reading.lemma, "produceKnowledge");
				supported(encounter, "produceKnowledge");
				validateRequest(input.reading, input.request);
				const member = authoredFor(input.reading.lemma),
					closed = closedRoute(input.reading.lemma);
				const exact =
					member && sameValue(member.reading, input.reading)
						? member
						: undefined;
				if (closed && !exact)
					throw new DumgenFailure(
						"CatalogMiss",
						"produceKnowledge",
						"Reading is absent from the Fixed Catalog",
						routeOf(encounter),
					);
				const authored = exact
					? authoredKnowledge(exact, input.request)
					: {
							production: {
								changes: [],
								pendingRelations: [],
							} as KnowledgeProduction,
							missing: input.request,
						};
				if (!Object.keys(authored.missing).length)
					return authored.production;
				if (closed)
					throw new DumgenFailure(
						"CatalogMiss",
						"produceKnowledge",
						"Requested Knowledge has not been authored",
						routeOf(encounter),
					);
				const analysis = await call<KnowledgeAnalysis>(
					"produceKnowledge",
					routeOf(encounter),
					`knowledge-analysis/de/${input.reading.lemma.family.toLowerCase()}`,
					"knowledgeOutput",
					{
						markedContext: markedContext(encounter).markedContext,
						reading: input.reading,
						request: authored.missing,
					},
					signal,
				);
				const generated = projectKnowledge(
					input.reading,
					authored.missing,
					analysis,
				);
				return {
					changes: [
						...authored.production.changes,
						...generated.changes,
					],
					pendingRelations: [
						...authored.production.pendingRelations,
						...generated.pendingRelations,
					],
				};
			});
		},
	};
	// Each operation validates correlated canonical inputs before dispatch; its
	// selected Language is preserved when constructing the corresponding output.
	return operations;
}
