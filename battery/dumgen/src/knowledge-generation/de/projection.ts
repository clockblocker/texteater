import type { LexicalUnitShadow } from "dumrel";
import {
	parseAsKnowledgeGenerationResult,
	unwrapDumgenParse,
} from "../../parsing/lightweight-parsers";
import { parseRuntimePromptSchema } from "../../parsing/runtime-prompt-schemas";
import { requestableRelationValues } from "../../vocabulary";
import type { KnowledgeGenerationSuccess } from "../contracts";
import {
	type GermanKnowledgeFamily,
	germanFamilySupportsRelationTargetKind,
	germanKnowledgeFamilies,
} from "./families";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
	GermanKnowledgeRelationTarget,
} from "./runtime-schema";

export type GeneratedKnowledgeUpdate = KnowledgeGenerationSuccess;

export const EMPTY_GENERATED_KNOWLEDGE_UPDATE: GeneratedKnowledgeUpdate =
	parseGeneratedKnowledgeUpdate(
		parseAsKnowledgeGenerationResult({
			changes: [],
			pendingRelations: [],
		}),
	);

/** One proposed target dropped by the injected same-Family validation. */
export type FilteredRelationTargetInfo = Readonly<{
	relation: (typeof requestableRelationValues)[number];
	kind: string;
	canonicalForm: string;
	sourceFamily: GermanKnowledgeFamily;
	reason: "KindNotInSourceFamilyInventory";
}>;

export type GermanKnowledgeProjectionOptions = Readonly<{
	readonly onFilteredRelationTarget?: (
		info: FilteredRelationTargetInfo,
	) => void;
}>;

function knowledgeFamilyOf(
	input: GermanKnowledgeGenerationInput,
): GermanKnowledgeFamily | undefined {
	const family = input.reading.lemma.family;
	return germanKnowledgeFamilies.includes(family as GermanKnowledgeFamily)
		? (family as GermanKnowledgeFamily)
		: undefined;
}

/** Pure conversion from one validated private analysis to Dumrel DTOs. */
export function projectGermanKnowledgeUpdate(
	rawInput: GermanKnowledgeGenerationInput,
	rawAnalysis: GermanKnowledgeAnalysis,
	options?: GermanKnowledgeProjectionOptions,
): GeneratedKnowledgeUpdate {
	const family = knowledgeFamilyOf(rawInput);
	if (family === undefined) {
		throw new TypeError(
			`German Knowledge projection requires a ${germanKnowledgeFamilies.join(" | ")} Family.`,
		);
	}
	const input = parseRuntimePromptSchema<GermanKnowledgeGenerationInput>(
		`knowledge.de.${family}#input`,
		rawInput,
	);
	const parsedAnalysis = parseRuntimePromptSchema<GermanKnowledgeAnalysis>(
		`knowledge.de.${family}#output`,
		rawAnalysis,
	);
	const analysis = normalizeRelationTargets(parsedAnalysis, family, options);
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
			target: LexicalUnitShadow<"de">;
		}>
	> = [];
	const relationByTarget = new Map<
		string,
		(typeof requestableRelationValues)[number]
	>();
	for (const relation of requestableRelationValues) {
		const targets = analysis.semanticRelations?.[relation];
		if (targets === undefined || targets === null) continue;
		const uniqueTargets = new Map<string, LexicalUnitShadow<"de">>();
		for (const rawTarget of targets) {
			const injected = injectFamily(rawTarget, family);
			if (injected === undefined) continue;
			if (isOwnerTarget(input, injected)) {
				throw new Error(
					"A Semantic Relation cannot target its source Reading.",
				);
			}
			uniqueTargets.set(targetKey(injected), injected);
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

	return parseGeneratedKnowledgeUpdate(
		parseAsKnowledgeGenerationResult({ changes, pendingRelations }),
	);
}

/**
 * Injects the source Family into one kind-only proposal and applies the
 * same-Family validation. A target that would leave the Family's route
 * inventory is dropped (and recorded by the caller), never thrown.
 */
function injectFamily(
	target: GermanKnowledgeRelationTarget,
	family: GermanKnowledgeFamily,
): LexicalUnitShadow<"de"> | undefined {
	const full = {
		language: "de" as const,
		canonicalForm: target.canonicalForm,
		family,
		kind: target.kind,
	};
	return germanFamilySupportsRelationTargetKind(family, target.kind)
		? (full as LexicalUnitShadow<"de">)
		: undefined;
}

/** Filters relation targets and preserves requested leaves as nullable values. */
export function normalizeRelationTargets(
	analysis: GermanKnowledgeAnalysis,
	family: GermanKnowledgeFamily,
	options?: GermanKnowledgeProjectionOptions,
): GermanKnowledgeAnalysis {
	if (analysis.semanticRelations === undefined) return analysis;
	const semanticRelations: Record<
		string,
		readonly GermanKnowledgeRelationTarget[] | null
	> = {};
	for (const [relation, targets] of Object.entries(
		analysis.semanticRelations,
	)) {
		if (targets === null) {
			semanticRelations[relation] = null;
			continue;
		}
		const retained = targets.filter((target) => {
			if (germanFamilySupportsRelationTargetKind(family, target.kind)) {
				return true;
			}
			notifyFilteredRelationTarget(options, {
				relation:
					relation as (typeof requestableRelationValues)[number],
				kind: target.kind,
				canonicalForm: target.canonicalForm,
				sourceFamily: family,
				reason: "KindNotInSourceFamilyInventory",
			});
			return false;
		});
		semanticRelations[relation] = retained.length === 0 ? null : retained;
	}
	return { ...analysis, semanticRelations };
}

function notifyFilteredRelationTarget(
	options: GermanKnowledgeProjectionOptions | undefined,
	info: FilteredRelationTargetInfo,
): void {
	try {
		options?.onFilteredRelationTarget?.(info);
	} catch {
		// Diagnostics cannot affect projection.
	}
}

function parseGeneratedKnowledgeUpdate(
	parsed: ReturnType<typeof parseAsKnowledgeGenerationResult>,
): GeneratedKnowledgeUpdate {
	const value = unwrapDumgenParse(parsed);
	if ("decision" in value)
		throw new TypeError(
			"Open Knowledge projection produced a CatalogMiss.",
		);
	return value;
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

function targetKey(target: LexicalUnitShadow<"de">): string {
	return JSON.stringify([
		target.language,
		target.family,
		target.kind,
		target.canonicalForm,
	]);
}

function compareTargets(
	left: LexicalUnitShadow<"de">,
	right: LexicalUnitShadow<"de">,
): number {
	const leftKey = targetKey(left);
	const rightKey = targetKey(right);
	if (leftKey < rightKey) return -1;
	if (leftKey > rightKey) return 1;
	return 0;
}

function isOwnerTarget(
	input: GermanKnowledgeGenerationInput,
	target: LexicalUnitShadow<"de">,
): boolean {
	const owner = input.reading.lemma;
	return (
		owner.language === target.language &&
		owner.family === target.family &&
		owner.kind === target.kind &&
		owner.canonicalForm === target.canonicalForm
	);
}
