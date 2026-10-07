import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	projectSemanticRelations,
	selectKnowledge,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { SemanticRelationProjection } from "../src/generated/types.js";
import { berlinLemma, houseLemma, houseReading } from "./fixtures.js";

const city = (canonicalForm: string) =>
	({
		unitKind: "Reading",
		lemma: { ...berlinLemma, canonicalForm },
		emojiDescription: "🏙",
	}) as const satisfies Dumling.Reading<"de", "Lexeme", "PROPN">;

// Pressburg is the German exonym; Bratislava is the city's own name.
const pressburg = city("Pressburg");
const bratislava = city("Bratislava");
// Brussels has two local names, one French and one Dutch.
const bruessel = city("Brüssel");
const bruxelles = city("Bruxelles");
const brussel = city("Brussel");

function accepts(source: Dumling.Reading, knowledge: unknown): boolean {
	return parseReadingKnowledge({
		source,
		knowledge: knowledge as Dumrel.ReadingKnowledge,
	}).success;
}

function project(
	entries: readonly Dumrel.ReadingWithKnowledge[],
	source?: Dumling.Reading,
) {
	const result = projectSemanticRelations(entries, source ? { source } : {});
	if (!result.success) throw result.error;
	return result.value;
}

test("a stored endonym projects the exonym onto the local name, and back", () => {
	const entries = [
		{
			reading: pressburg,
			knowledge: {
				semanticRelations: { endonym: [bratislava.lemma] },
			},
		},
		{ reading: bratislava, knowledge: {} },
	];
	const endonym: SemanticRelationProjection = {
		source: pressburg,
		relation: "endonym",
		target: bratislava.lemma,
		provenance: "direct",
	};
	const exonym: SemanticRelationProjection = {
		source: bratislava,
		relation: "exonym",
		target: pressburg.lemma,
		provenance: "inferred",
	};
	expect(project(entries)).toEqual([exonym, endonym]);
	// Each side projects alone to its own edge of the pair.
	expect(project(entries, bratislava)).toEqual([exonym]);
	expect(project(entries, pressburg)).toEqual([endonym]);
});

test("an exonym lists every local name of its place", () => {
	const edges = project([
		{
			reading: bruessel,
			knowledge: {
				semanticRelations: {
					endonym: [bruxelles.lemma, brussel.lemma],
				},
			},
		},
		{ reading: bruxelles, knowledge: {} },
		{ reading: brussel, knowledge: {} },
	]);
	for (const local of [bruxelles, brussel])
		expect(edges).toContainEqual({
			source: local,
			relation: "exonym",
			target: bruessel.lemma,
			provenance: "inferred",
		});
});

test("only a PROPN Reading stores an endonym, and it names a PROPN Lemma", () => {
	expect(
		accepts(pressburg, {
			semanticRelations: { endonym: [bratislava.lemma] },
		}),
	).toBe(true);
	const fromNoun = parseReadingKnowledge({
		source: houseReading,
		knowledge: { semanticRelations: { endonym: [bratislava.lemma] } },
	});
	expect(fromNoun.success).toBe(false);
	if (!fromNoun.success)
		expect(fromNoun.error.issues[0]?.message).toBe(
			"Only a PROPN Reading has an endonym",
		);
	const toNoun = parseReadingKnowledge({
		source: pressburg,
		knowledge: { semanticRelations: { endonym: [houseLemma] } },
	});
	expect(toNoun.success).toBe(false);
	if (!toNoun.success)
		expect(toNoun.error.issues[0]?.path).toEqual([
			"knowledge",
			"semanticRelations",
			"endonym",
			0,
		]);
	// The exonym is projected, never stored, and an endonym names a Lemma.
	expect(
		accepts(bratislava, {
			semanticRelations: { exonym: [pressburg.lemma] },
		}),
	).toBe(false);
	expect(
		accepts(pressburg, {
			semanticRelations: { targetKind: "reading", endonym: [bratislava] },
		}),
	).toBe(false);
});

test("an endonym change is checked against the change's source", () => {
	const change = {
		kind: "Contribute",
		aspect: "semanticRelations",
		relation: "endonym",
		value: [bratislava.lemma],
	} as const;
	expect(
		applyKnowledgeChange({ source: pressburg, knowledge: {}, change }),
	).toEqual({
		success: true,
		value: { semanticRelations: { endonym: [bratislava.lemma] } },
	});
	const wrongRoute = applyKnowledgeChange({
		source: houseReading,
		knowledge: {},
		change,
	});
	expect(wrongRoute.success).toBe(false);
	if (!wrongRoute.success)
		expect(wrongRoute.error.issues[0]?.path).toEqual([
			"change",
			"relation",
		]);
});

test("German proper nouns request an endonym and no other route does", () => {
	for (const [family, kind, expected] of [
		["Lexeme", "PROPN", true],
		["Lexeme", "NOUN", false],
		["Lexeme", "VERB", false],
		["Lexeme", "ADJ", false],
		["Locution", "NOUN", false],
		["Saying", "Saying", false],
		["Morpheme", "Root", false],
	] as const) {
		const selected = selectKnowledge({
			route: { language: "de", family, kind } as never,
		});
		expect(selected.success).toBe(true);
		if (!selected.success) continue;
		expect(
			selected.value.semanticRelations?.endonym === null &&
				Object.hasOwn(selected.value.semanticRelations, "endonym"),
		).toBe(expected);
		// The exonym is projected, so no route requests it.
		expect(
			Object.hasOwn(selected.value.semanticRelations ?? {}, "exonym"),
		).toBe(false);
	}
	const disabled = selectKnowledge({
		route: { language: "de", family: "Lexeme", kind: "PROPN" },
		settings: { semanticRelations: { endonym: false } },
	});
	expect(disabled.success && disabled.value.semanticRelations).toEqual({
		synonym: null,
		hypernym: null,
		holonym: null,
	});
});
