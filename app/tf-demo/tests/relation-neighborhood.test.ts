import { expect, test } from "bun:test";
import { projectReadingValue } from "../convex/modules/notes/projections";
import {
	parseStoredGermanLemma,
	relationsOf,
} from "../convex/modules/notes/relationNeighborhood";

function noun(canonicalForm: string, gender: "Fem" | "Masc" | "Neut") {
	return {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	} as const;
}

const lemmas = new Map([
	["lemma:haus", noun("Haus", "Neut")],
	["lemma:gebaeude", noun("Gebäude", "Neut")],
	["lemma:ufer", noun("Ufer", "Neut")],
]);
const units = new Map([
	[
		"reading:bank",
		projectReadingValue({ emojiDescription: "🏦" }, noun("Bank", "Fem")),
	],
	[
		"reading:ufer",
		projectReadingValue({ emojiDescription: "🏞️" }, noun("Ufer", "Neut")),
	],
]);

function edge(
	relation: string,
	target: { targetLemmaId: string } | { targetReadingId: string },
	extra: { sourceReadingId?: string; targetKind?: "lemma" | "reading" } = {},
) {
	return { sourceReadingId: "reading:bank", relation, ...target, ...extra };
}

function relations(
	edges: ReturnType<typeof edge>[],
	options: {
		storedTargetKind?: "lemma" | "reading";
		truncated?: boolean;
	} = {},
) {
	return relationsOf({
		readingId: "reading:bank",
		storedTargetKind: options.storedTargetKind,
		edges,
		units,
		lemmas,
		truncated: options.truncated ?? false,
	});
}

test("groups a Reading's own edges by relation in edge order", () => {
	expect(
		relations([
			edge("synonym", { targetLemmaId: "lemma:haus" }),
			edge("hypernym", { targetLemmaId: "lemma:ufer" }),
			edge("synonym", { targetLemmaId: "lemma:gebaeude" }),
			edge(
				"synonym",
				{ targetLemmaId: "lemma:ufer" },
				{ sourceReadingId: "reading:ufer" },
			),
		]),
	).toEqual({
		synonym: [
			parseStoredGermanLemma(noun("Haus", "Neut")),
			parseStoredGermanLemma(noun("Gebäude", "Neut")),
		],
		hypernym: [parseStoredGermanLemma(noun("Ufer", "Neut"))],
	});
});

test("a Reading target resolves to its unit and switches to Reading mode", () => {
	expect(
		relations([
			edge(
				"synonym",
				{ targetReadingId: "reading:ufer" },
				{ targetKind: "reading" },
			),
		]),
	).toEqual({ targetKind: "reading", synonym: [units.get("reading:ufer")] });
});

test("a Lemma target resolves to its parsed Lemma and stays in Lemma mode", () => {
	const built = relations([edge("synonym", { targetLemmaId: "lemma:haus" })]);
	expect(built).toEqual({
		synonym: [parseStoredGermanLemma(noun("Haus", "Neut"))],
	});
	expect(built).not.toHaveProperty("targetKind");
});

test("a Reading id wins over a Lemma id on the same edge", () => {
	expect(() =>
		relations([
			edge("synonym", {
				targetReadingId: "reading:missing",
				targetLemmaId: "lemma:haus",
			}),
		]),
	).toThrow("Relation neighborhood has a missing target.");
});

test("a missing target is skipped when the neighbourhood is truncated", () => {
	expect(
		relations(
			[
				edge("synonym", { targetLemmaId: "lemma:missing" }),
				edge("synonym", { targetReadingId: "reading:missing" }),
				edge("synonym", { targetLemmaId: "lemma:haus" }),
			],
			{ truncated: true },
		),
	).toEqual({ synonym: [parseStoredGermanLemma(noun("Haus", "Neut"))] });
});

test("a missing target throws when the neighbourhood is complete", () => {
	expect(() =>
		relations([edge("synonym", { targetLemmaId: "lemma:missing" })]),
	).toThrow("Relation neighborhood has a missing target.");
	expect(() =>
		relations([edge("synonym", { targetReadingId: "reading:missing" })]),
	).toThrow("Relation neighborhood has a missing target.");
});

test("a stored Reading target kind turns on Reading mode without edges", () => {
	expect(relations([], { storedTargetKind: "reading" })).toEqual({
		targetKind: "reading",
	});
	expect(relations([], { storedTargetKind: "lemma" })).toEqual({});
});

test("another Reading's Reading-targeted edge does not switch this one", () => {
	expect(
		relations([
			edge(
				"synonym",
				{ targetReadingId: "reading:bank" },
				{ sourceReadingId: "reading:ufer", targetKind: "reading" },
			),
		]),
	).toEqual({});
});
