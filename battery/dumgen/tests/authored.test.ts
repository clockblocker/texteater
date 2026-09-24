import { expect, test } from "bun:test";
import {
	createDumgen,
	selectGrammaticalAlternatives,
	validateEncounter,
} from "dumgen";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { Effect } from "effect";
import { stableJson } from "promptsmith";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import { knowledgeInputSchema } from "../src/schemas.js";
import { executeOutput, rejectJudgment } from "../src/testing.js";
import { createDumgen as createSourceDumgen } from "../src/universal/dumgen.js";

test("every authored member supplies all advertised Knowledge without a provider", async () => {
	let calls = 0;
	const unexpected = async (): Promise<never> => {
		calls++;
		throw Error("Authored Knowledge must not call a provider");
	};
	const dumgen = createSourceDumgen({
		execute: unexpected,
		judge: unexpected,
	});
	for (const member of authoredMembers) {
		const { language, family, kind, canonicalForm } = member.lemma;
		const selected = selectKnowledge({
			route: {
				language,
				family,
				kind,
			} as Dumrel.KnowledgeSelectionInput["route"],
		});
		if (!selected.success) throw selected.error;
		const result = await Effect.runPromise(
			dumgen.produceKnowledge(
				knowledgeInputSchema.parse({
					encounter: {
						sentence: {
							id: "authored",
							language,
							segments: [
								{ kind: "ResolvableText", text: canonicalForm },
							],
						},
						target: { family, kind, memberSegmentIndices: [0] },
					},
					reading: member.reading,
					request: selected.value,
				}),
			),
		);
		expect(result.failures, canonicalForm).toEqual([]);
		expect(result.pendingRelations, canonicalForm).toEqual([]);
		expect(result.changes, canonicalForm).toEqual(
			expect.arrayContaining([
				{
					kind: "Contribute",
					aspect: "definition",
					value: member.knowledge.definition,
				},
				{
					kind: "Contribute",
					aspect: "transcription",
					value: member.knowledge.transcription,
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: member.knowledge.translations?.en,
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "ru",
					value: member.knowledge.translations?.ru,
				},
			]),
		);
	}
	expect(calls).toBe(0);
});

test("reviewed member bundles have distinct Readings and valid semantic endpoints", () => {
	expect(
		new Set(authoredMembers.map((member) => stableJson(member.reading)))
			.size,
	).toBe(authoredMembers.length);
	for (const member of authoredMembers) {
		expect(member.reading.lemma).toEqual(member.lemma);
		expect(
			parseReadingKnowledge({
				source: member.reading,
				knowledge: member.knowledge,
			}).success,
		).toBe(true);
		expect(member.lemma.coreFeatures).not.toHaveProperty("referenceGender");
	}
});
test("same-spelling personal and possessive identities remain distinct", () => {
	const pronouns = authoredMembers.flatMap((member) =>
		member.lemma.kind === "PRON" ? [member.lemma] : [],
	);
	expect(
		pronouns
			.filter(
				(lemma) =>
					lemma.canonicalForm === "sie" &&
					lemma.coreFeatures.gender === "Fem",
			)
			.map((lemma) => lemma.coreFeatures.case)
			.sort(),
	).toEqual(["Acc", "Nom"]);
	for (const possessor of ["Masc", "Neut"]) {
		expect(
			pronouns.some(
				(lemma) =>
					lemma.canonicalForm === "seiner" &&
					lemma.coreFeatures.gender === "Masc" &&
					lemma.coreFeatures["gender[psor]"] === possessor,
			),
		).toBe(true);
		expect(
			pronouns.some(
				(lemma) =>
					lemma.canonicalForm === "seines" &&
					lemma.coreFeatures.gender === "Neut" &&
					lemma.coreFeatures["gender[psor]"] === possessor,
			),
		).toBe(true);
	}
	const demonstrative = pronouns.find(
		(lemma) =>
			lemma.canonicalForm === "der" &&
			lemma.coreFeatures.pronType === "Dem",
	);
	if (!demonstrative) throw Error("Missing reviewed demonstrative");
	for (const reading of selectGrammaticalAlternatives({
		source: demonstrative,
		vary: ["case"],
	})) {
		expect(
			(reading.lemma as Dumling.Lemma<"de", "Lexeme", "PRON">)
				.coreFeatures.pronType,
		).toBe("Dem");
	}
});
test("covered Knowledge and reviewed claims require no inventory preload or provider call", async () => {
	const member = authoredMembers.find(
		(member) =>
			member.lemma.kind === "DET" && member.knowledge.semanticRelations,
	);
	if (!member) throw Error("Missing catalog fixture");
	const encounter = validateEncounter({
		sentence: {
			id: "fixed",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: member.lemma.canonicalForm },
			],
		},
		target: { family: "Lexeme", kind: "DET", memberSegmentIndices: [0] },
	});
	const input = {
		encounter,
		reading: member.reading,
		request: { definition: null, semanticRelations: { synonym: null } },
	};
	const { knowledgeInputSchema } = await import("dumgen/schemas");
	const result = await Effect.runPromise(
		createDumgen({
			judge: rejectJudgment,
			execute: executeOutput(async () => {
				throw Error("Unexpected provider call");
			}),
		}).produceKnowledge(knowledgeInputSchema.parse(input)),
	);
	if (member.knowledge.definition === undefined)
		throw Error("Missing authored definition");
	expect(result.changes).toContainEqual({
		kind: "Contribute",
		aspect: "definition",
		value: member.knowledge.definition,
	});
	expect(
		result.changes.some((change) => change.aspect === "semanticRelations"),
	).toBe(true);
	expect(result.pendingRelations).toEqual([]);
});
