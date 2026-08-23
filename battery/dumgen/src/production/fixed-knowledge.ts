import type { Reading } from "dumling/types";
import type { FixedKnowledgeLookup } from "dumrel/fixed";
import type { DirectSemanticRelation, ReadingKnowledge } from "dumrel/types";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationResult,
	KnowledgeGenerationSuccess,
	ReadingKnowledgeCatalogMiss,
} from "../knowledge-generation/contracts";
import {
	parseAsKnowledgeGenerationResult,
	unwrapDumgenParse,
} from "../parsing/lightweight-parsers";
import { routeFor } from "./contracts";

export async function generateFixedKnowledge(
	input: KnowledgeGenerationInput<"de">,
): Promise<KnowledgeGenerationResult> {
	const { fixedKnowledgeFor } = await import("dumrel/fixed");
	const lookup = fixedKnowledgeFor(input.reading as unknown as Reading);
	if (lookup.decision === "Miss") {
		return Object.freeze({
			decision: "CatalogMiss",
			reason: lookup.reason,
			language: "de",
			route: routeFor(input.reading.lemma),
			stage: "ReadingKnowledge",
			reading: input.reading,
			missingRequest: input.request,
		}) satisfies import("../knowledge-generation/contracts").ReadingKnowledgeCatalogMiss;
	}
	const missingRequest = unauthoredRequest(input.request, lookup);
	if (missingRequest) {
		return Object.freeze({
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: routeFor(input.reading.lemma),
			stage: "ReadingKnowledge",
			reading: input.reading,
			missingRequest,
		} satisfies ReadingKnowledgeCatalogMiss);
	}

	return parseFixedSuccess(input.request, lookup.knowledge);
}

function unauthoredRequest(
	request: KnowledgeGenerationInput<"de">["request"],
	lookup: Extract<FixedKnowledgeLookup, { decision: "Found" }>,
): KnowledgeGenerationInput<"de">["request"] | undefined {
	const missing: {
		transcription?: null;
		definition?: null;
		translations?: { en?: null };
		semanticRelations?: Record<string, null>;
	} = {};
	if (
		request.transcription !== undefined &&
		lookup.coverage.transcription === "Unauthored"
	) {
		missing.transcription = null;
	}
	if (
		request.definition !== undefined &&
		lookup.knowledge.definition === undefined
	) {
		missing.definition = null;
	}
	if (
		request.translations?.en !== undefined &&
		lookup.knowledge.translations?.en === undefined
	) {
		missing.translations = { en: null };
	}
	for (const relation of Object.keys(request.semanticRelations ?? {})) {
		if (!(relation in lookup.coverage.semanticRelations)) {
			if (!missing.semanticRelations) missing.semanticRelations = {};
			missing.semanticRelations[relation] = null;
		}
	}
	return Object.keys(missing).length > 0
		? (missing as KnowledgeGenerationInput<"de">["request"])
		: undefined;
}

function parseFixedSuccess(
	request: KnowledgeGenerationInput<"de">["request"],
	knowledge: ReadingKnowledge<"en">,
): KnowledgeGenerationSuccess {
	const changes: Array<Record<string, unknown>> = [];
	if (
		request.transcription !== undefined &&
		knowledge.transcription !== undefined
	)
		changes.push({
			kind: "Contribute",
			aspect: "transcription",
			value: knowledge.transcription,
		});
	if (request.definition !== undefined && knowledge.definition !== undefined)
		changes.push({
			kind: "Contribute",
			aspect: "definition",
			value: knowledge.definition,
		});
	if (request.translations?.en !== undefined && knowledge.translations?.en)
		changes.push({
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: [...knowledge.translations.en],
		});

	const pendingRelations: Array<Record<string, unknown>> = [];
	const semanticRelations = knowledge.semanticRelations;
	for (const relation of Object.keys(request.semanticRelations ?? {})) {
		if (
			semanticRelations !== undefined &&
			semanticRelations.targetKind === "reading"
		) {
			if (relation === "synonym" && semanticRelations.synonym) {
				changes.push({
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					targetKind: "reading",
					value: [...semanticRelations.synonym],
				});
			}
			continue;
		}
		const lemmaTargets =
			semanticRelations?.[relation as DirectSemanticRelation];
		if (!Array.isArray(lemmaTargets)) continue;
		for (const lemma of lemmaTargets) {
			pendingRelations.push({
				relation,
				target: {
					language: lemma.language,
					family: lemma.family,
					kind: lemma.kind,
					canonicalForm: lemma.canonicalForm,
				},
			});
		}
	}

	const parsed = unwrapDumgenParse(
		parseAsKnowledgeGenerationResult({ changes, pendingRelations }),
	);
	if ("decision" in parsed) {
		throw new TypeError("Fixed Knowledge projected to a CatalogMiss.");
	}
	return parsed;
}
