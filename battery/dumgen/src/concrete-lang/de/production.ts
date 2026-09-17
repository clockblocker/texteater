import type * as Dumling from "dumling/types";
import type {
	AnalysisTarget,
	Dumgen,
	DumgenOptions,
	Encounter,
	KnowledgeProduction,
	KnowledgeRequest,
	KnowledgeInput as PublicKnowledgeInput,
	SegmentedSentence,
} from "../../types.js";
import { DumgenFailure } from "../../universal/failure.js";
import { operationTask } from "../../universal/trace.js";
import {
	markedContext,
	parse,
	validateEncounter,
} from "../../universal/validation.js";
import { authoredFor, closedRoute } from "./authored-closed-sets/select.js";
import { resolveGrammarJudgments } from "./grammatical-resolution/judgments.js";
import { normalizeGrammarSurface } from "./grammatical-resolution/project.js";
import { produceKnowledge } from "./knowledge-production/produce.js";
import { resolveReading } from "./reading-emoji-description/resolve.js";
import { classifyGermanTarget } from "./target-classification/judgments.js";

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
	candidates: readonly string[];
};
type KnowledgeInput = {
	encounter: Encounter;
	reading: Dumling.Reading;
	request: KnowledgeRequest;
};

/** German owns its dispatch and model-call grouping behind the shared encounter contract. */
export function createGermanOperations(
	options: DumgenOptions,
): Omit<Dumgen, "segment" | "segmentSentence"> {
	const task = operationTask(options);
	const operations = {
		classifyTarget<L extends Dumling.Language>(raw: {
			sentence: SegmentedSentence<L>;
			clickedSegmentIndex: number;
		}) {
			return task("classifyTarget", raw, async (signal) => {
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
				return (await classifyGermanTarget(
					options,
					input,
					signal,
				)) as AnalysisTarget<L>;
			});
		},
		resolveGrammar<L extends Dumling.Language>(raw: Encounter<L>) {
			return task("resolveGrammar", raw, async (signal) => {
				const encounter = validateEncounter(raw, "resolveGrammar");
				supported(encounter, "resolveGrammar");
				const route = routeOf(encounter),
					input = markedContext(encounter);
				const output = await resolveGrammarJudgments(
					options,
					encounter,
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
		resolveOrGenerateReadingEmojiDescription(raw: EmojiInput) {
			return task(
				"resolveOrGenerateReadingEmojiDescription",
				raw,
				async (signal) => {
					const stage = "resolveOrGenerateReadingEmojiDescription";
					const input = parse<EmojiInput>(
						"comparisonInput",
						raw,
						stage,
					);
					const encounter = validateEncounter(input.encounter, stage);
					agreement(encounter, input.lemma, stage);
					supported(encounter, stage);
					return resolveReading(
						options,
						{ ...input, encounter },
						signal,
					);
				},
			);
		},
		produceKnowledge<I extends PublicKnowledgeInput>(raw: I) {
			return task("produceKnowledge", raw, async (signal) => {
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
				return (await produceKnowledge(
					options,
					{ ...input, encounter },
					signal,
				)) as KnowledgeProduction<I["reading"]["lemma"]["language"]>;
			});
		},
	};
	// Each operation validates correlated canonical inputs before dispatch; its
	// selected Language is preserved when constructing the corresponding output.
	return operations;
}
