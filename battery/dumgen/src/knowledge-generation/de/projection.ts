import {
	parseAsKnowledgeGenerationResult,
	unwrapDumgenParse,
} from "../../parsing/lightweight-parsers";
import { parseRuntimePromptSchema } from "../../parsing/runtime-prompt-schemas";
import { requestableRelationValues } from "../../vocabulary";
import type { KnowledgeGenerationResult } from "../contracts";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "./runtime-schema";

export type GeneratedKnowledgeUpdate = KnowledgeGenerationResult;

export const EMPTY_GENERATED_KNOWLEDGE_UPDATE: GeneratedKnowledgeUpdate =
	unwrapDumgenParse(
		parseAsKnowledgeGenerationResult({
			changes: [],
			pendingRelations: [],
		}),
	);

/** Pure conversion from one validated private analysis to Dumrel DTOs. */
export function projectGermanKnowledgeUpdate(
	rawInput: GermanKnowledgeGenerationInput,
	rawAnalysis: GermanKnowledgeAnalysis,
): GeneratedKnowledgeUpdate {
	const input = parseRuntimePromptSchema<GermanKnowledgeGenerationInput>(
		"knowledge.de.combined#input",
		rawInput,
	);
	const analysis = parseRuntimePromptSchema<GermanKnowledgeAnalysis>(
		"knowledge.de.combined#output",
		rawAnalysis,
	);
	assertAnalysisMirrorsRequest(input, analysis);

	const changes: Array<Readonly<Record<string, unknown>>> = [];
	if (
		analysis.transcription !== undefined &&
		analysis.transcription !== null
	) {
		changes.push({
			kind: "Contribute",
			aspect: "transcription",
			value: analysis.transcription,
		});
	}
	if (analysis.definition !== undefined && analysis.definition !== null) {
		changes.push({
			kind: "Contribute",
			aspect: "definition",
			value: analysis.definition,
		});
	}
	if (
		analysis.translations?.en !== undefined &&
		analysis.translations.en !== null
	) {
		changes.push({
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: [analysis.translations.en],
		});
	}

	const pendingRelations: Array<
		Readonly<{
			relation: (typeof requestableRelationValues)[number];
			target: Readonly<{
				canonicalForm: string;
				family: string;
				kind: string;
				language: string;
			}>;
		}>
	> = [];
	const relationByTarget = new Map<
		string,
		(typeof requestableRelationValues)[number]
	>();
	for (const relation of requestableRelationValues) {
		const targets = analysis.semanticRelations?.[relation];
		if (targets === undefined || targets === null) continue;
		const uniqueTargets = new Map<
			string,
			{
				canonicalForm: string;
				family: string;
				kind: string;
				language: string;
			}
		>();
		for (const rawTarget of targets) {
			const parsed = {
				relation,
				target: rawTarget,
			};
			const target = parsed.target;
			if (isOwnerTarget(input, target)) {
				throw new Error(
					"A Semantic Relation cannot target its source Reading.",
				);
			}
			uniqueTargets.set(targetKey(target), target);
		}
		for (const target of [...uniqueTargets.values()].sort(compareTargets)) {
			const key = targetKey(target);
			const existingRelation = relationByTarget.get(key);
			if (existingRelation !== undefined) {
				if (
					existingRelation === "synonym" &&
					relation === "nearSynonym"
				) {
					continue;
				}
				if (
					existingRelation === "nearSynonym" &&
					relation === "synonym"
				) {
					const existingIndex = pendingRelations.findIndex(
						(pending) =>
							pending.relation === "nearSynonym" &&
							targetKey(pending.target) === key,
					);
					if (existingIndex >= 0)
						pendingRelations.splice(existingIndex, 1);
				} else {
					throw new Error(
						`A relation target cannot appear under both ${existingRelation} and ${relation}.`,
					);
				}
			}
			relationByTarget.set(key, relation);
			pendingRelations.push({ relation, target });
		}
	}

	return unwrapDumgenParse(
		parseAsKnowledgeGenerationResult({ changes, pendingRelations }),
	);
}

function assertAnalysisMirrorsRequest(
	input: GermanKnowledgeGenerationInput,
	analysis: GermanKnowledgeAnalysis,
): void {
	const expectedKeys = Object.keys(input.request).toSorted();
	const actualKeys = Object.keys(analysis).toSorted();
	if (!sameMembers(expectedKeys, actualKeys))
		throw new TypeError(
			"German Knowledge analysis does not mirror its request.",
		);
	if (
		input.request.translations !== undefined &&
		(analysis.translations === undefined ||
			!sameMembers(
				Object.keys(input.request.translations),
				Object.keys(analysis.translations),
			))
	)
		throw new TypeError(
			"German Knowledge translations do not mirror their request.",
		);
	if (
		input.request.semanticRelations !== undefined &&
		(analysis.semanticRelations === undefined ||
			!sameMembers(
				Object.keys(input.request.semanticRelations),
				Object.keys(analysis.semanticRelations),
			))
	)
		throw new TypeError(
			"German Knowledge relations do not mirror their request.",
		);
}

function sameMembers(left: string[], right: string[]): boolean {
	return (
		left.length === right.length &&
		left.every((value) => right.includes(value))
	);
}

function targetKey(target: {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
}): string {
	return JSON.stringify([
		target.language,
		target.family,
		target.kind,
		target.canonicalForm,
	]);
}

function compareTargets(
	left: {
		canonicalForm: string;
		family: string;
		kind: string;
		language: string;
	},
	right: {
		canonicalForm: string;
		family: string;
		kind: string;
		language: string;
	},
): number {
	const leftKey = targetKey(left);
	const rightKey = targetKey(right);
	if (leftKey < rightKey) return -1;
	if (leftKey > rightKey) return 1;
	return 0;
}

function isOwnerTarget(
	input: GermanKnowledgeGenerationInput,
	target: {
		canonicalForm: string;
		family: string;
		kind: string;
		language: string;
	},
): boolean {
	const owner = input.reading.lemma;
	return (
		owner.language === target.language &&
		owner.family === target.family &&
		owner.kind === target.kind &&
		owner.canonicalForm === target.canonicalForm
	);
}
