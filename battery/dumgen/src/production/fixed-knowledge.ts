import type { Reading } from "dumling/types";
import type { FixedKnowledgeLookup } from "dumrel/fixed";
import type { DirectSemanticRelation, ReadingKnowledge } from "dumrel/types";
import * as Effect from "effect/Effect";
import { DumgenError } from "../generator/generator-error";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationResult,
	KnowledgeGenerationSuccess,
	ReadingKnowledgeCatalogMiss,
	ReadingKnowledgeCatalogMissFor,
} from "../knowledge-generation/contracts";
import {
	parseAsKnowledgeGenerationResult,
	unwrapDumgenParse,
} from "../parsing/lightweight-parsers";
import { readingRouteFor } from "./contracts";

export function generateFixedKnowledge(
	input: KnowledgeGenerationInput<"de">,
): Effect.Effect<KnowledgeGenerationResult, DumgenError> {
	return Effect.promise(() => import("dumrel/fixed")).pipe(
		Effect.flatMap(({ fixedKnowledgeFor }) =>
			Effect.try({
				try: () =>
					generateFixedKnowledgeFromLookup(
						input,
						fixedKnowledgeFor(input.reading as unknown as Reading),
					),
				catch: (cause) =>
					new DumgenError(
						"invalid-output",
						"Fixed Knowledge could not be projected.",
						{ cause },
					),
			}),
		),
	);
}

function generateFixedKnowledgeFromLookup(
	input: KnowledgeGenerationInput<"de">,
	lookup: FixedKnowledgeLookup,
): KnowledgeGenerationResult {
	if (lookup.decision === "Miss") {
		return catalogMissForReadingKnowledge(
			lookup.reason,
			input.reading,
			input.request,
		);
	}
	const missingRequest = unauthoredRequest(input.request, lookup);
	if (missingRequest) {
		return catalogMissForReadingKnowledge(
			"MemberNotCatalogued",
			input.reading,
			missingRequest,
		);
	}

	return parseFixedSuccess(input.request, lookup.knowledge);
}

function catalogMissForReadingKnowledge<Value extends Reading<"de">>(
	reason: ReadingKnowledgeCatalogMiss["reason"],
	reading: Value,
	missingRequest: KnowledgeGenerationInput<"de">["request"],
): ReadingKnowledgeCatalogMissFor<Value> {
	return Object.freeze({
		decision: "CatalogMiss",
		reason,
		language: "de",
		route: readingRouteFor(reading),
		stage: "ReadingKnowledge",
		reading,
		missingRequest,
	}) as ReadingKnowledgeCatalogMissFor<Value>;
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
