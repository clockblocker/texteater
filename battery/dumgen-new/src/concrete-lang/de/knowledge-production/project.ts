import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { KnowledgeProduction, KnowledgeRequest } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { parse } from "../../../universal/validation.js";
import type { AuthoredMember } from "../authored/member.js";
import { assertRequestShape } from "./request-shape.js";

export function validateRequest(
	reading: Dumling.Reading,
	request: KnowledgeRequest,
): void {
	const { language, family, kind } = reading.lemma;
	const selected = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
	if (!selected.success)
		throw new DumgenFailure(
			"NotImplemented",
			"produceKnowledge",
			selected.error.message,
		);
	for (const [aspect, value] of Object.entries(request)) {
		const applicable = (selected.value as Record<string, unknown>)[aspect];
		if (applicable === undefined)
			throw new DumgenFailure(
				"InvalidInput",
				"produceKnowledge",
				`Aspect ${aspect} is not applicable`,
			);
		if (value && typeof value === "object")
			for (const leaf of Object.keys(value))
				if (
					!applicable ||
					typeof applicable !== "object" ||
					!Object.hasOwn(applicable, leaf)
				)
					throw new DumgenFailure(
						"InvalidInput",
						"produceKnowledge",
						`Aspect ${aspect}/${leaf} is not applicable`,
					);
	}
}
export type KnowledgeAnalysis = {
	transcription?: string | null;
	definition?: string | null;
	translations?: { en?: string | null };
	semanticRelations?: Partial<
		Record<
			Dumrel.DirectSemanticRelation,
			{ canonicalForm: string; kind: string }[] | null
		>
	>;
};
export function projectKnowledge(
	reading: Dumling.Reading,
	request: KnowledgeRequest,
	analysis: KnowledgeAnalysis,
): KnowledgeProduction {
	assertRequestShape(request, analysis);
	const changes: unknown[] = [],
		pendingRelations: unknown[] = [];
	for (const [aspect, value] of Object.entries(analysis)) {
		if (!Object.hasOwn(request, aspect))
			throw new DumgenFailure(
				"InvalidModelOutput",
				"produceKnowledge",
				`Unrequested ${aspect}`,
			);
		if (aspect === "transcription" || aspect === "definition") {
			if (value !== null)
				changes.push({ kind: "Contribute", aspect, value });
		} else if (aspect === "translations")
			for (const [language, text] of Object.entries(value ?? {})) {
				if (!Object.hasOwn(request.translations ?? {}, language))
					throw new DumgenFailure(
						"InvalidModelOutput",
						"produceKnowledge",
						`Unrequested translation ${language}`,
					);
				if (text !== null)
					changes.push({
						kind: "Contribute",
						aspect,
						language,
						value: [text],
					});
			}
		else if (aspect === "semanticRelations")
			for (const [relation, targets] of Object.entries(
				analysis.semanticRelations ?? {},
			)) {
				if (!Object.hasOwn(request.semanticRelations ?? {}, relation))
					throw new DumgenFailure(
						"InvalidModelOutput",
						"produceKnowledge",
						`Unrequested relation ${relation}`,
					);
				for (const target of targets ?? [])
					pendingRelations.push({
						relation,
						target: {
							canonicalForm: target.canonicalForm,
							kind: target.kind,
							language: reading.lemma.language,
							family: reading.lemma.family,
						},
					});
			}
	}
	const result = parse<KnowledgeProduction>(
		"knowledgeProductionSchema",
		{ changes, pendingRelations },
		"produceKnowledge",
		true,
	);
	for (const change of result.changes) {
		const parsed = applyKnowledgeChange({
			source: reading,
			knowledge: {},
			change,
		});
		if (!parsed.success)
			throw new DumgenFailure(
				"InvalidModelOutput",
				"produceKnowledge",
				parsed.error.message,
			);
	}
	return result;
}

export function authoredKnowledge(
	member: AuthoredMember,
	request: KnowledgeRequest,
): { production: KnowledgeProduction; missing: KnowledgeRequest } {
	const changes: unknown[] = [],
		missing: Record<string, unknown> = {};
	const knowledge = member.knowledge;
	for (const [aspect, value] of Object.entries(request)) {
		if (aspect === "transcription" || aspect === "definition") {
			if (knowledge[aspect] !== undefined)
				changes.push({
					kind: "Contribute",
					aspect,
					value: knowledge[aspect],
				});
			else missing[aspect] = null;
		} else if (aspect === "translations")
			for (const language of Object.keys(value ?? {})) {
				const translated =
					knowledge.translations?.[language as "en" | "ru"];
				if (translated)
					changes.push({
						kind: "Contribute",
						aspect,
						language,
						value: translated,
					});
				else
					missing.translations = {
						...((missing.translations as object) ?? {}),
						[language]: null,
					};
			}
		else if (aspect === "semanticRelations")
			for (const relation of Object.keys(value ?? {})) {
				const covered = member.coverage.semanticRelations[relation];
				if (covered === "Authored" || covered === "ReviewedEmpty") {
					const relations = knowledge.semanticRelations as
						| Record<string, unknown>
						| undefined;
					const targetKind =
						relations?.targetKind === "reading"
							? "reading"
							: "lemma";
					if (targetKind === "reading" && relation !== "synonym")
						continue;
					changes.push({
						kind: "Contribute",
						aspect,
						relation,
						targetKind,
						value: relations?.[relation] ?? [],
					});
				} else
					missing.semanticRelations = {
						...((missing.semanticRelations as object) ?? {}),
						[relation]: null,
					};
			}
		else missing[aspect] = value;
	}
	return {
		production: parse<KnowledgeProduction>(
			"knowledgeProductionSchema",
			{ changes, pendingRelations: [] },
			"produceKnowledge",
			true,
		),
		missing: missing as KnowledgeRequest,
	};
}
