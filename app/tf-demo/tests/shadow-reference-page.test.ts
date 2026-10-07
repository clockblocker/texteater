import { expect, test } from "bun:test";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import {
	shadowKeyFor,
	structuralShadowLocatorKey,
} from "../convex/model/shadows";
import { buildShadowReferencePage } from "../convex/modules/notes/shadowNote";

const shadowId = "shadow-bank" as Id<"shadows">;
const bank = {
	language: "de",
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
} as const;
const shadow = { _id: shadowId, shadowKey: shadowKeyFor(bank), ...bank };

function pendingRow(
	sourceReadingKey: string,
	targetPendingId: string,
	target: object = bank,
) {
	return {
		_id: `pending-${sourceReadingKey}-${targetPendingId}` as Id<"pendingSemanticRelations">,
		locatorKey: JSON.stringify([
			sourceReadingKey,
			"synonym",
			targetPendingId,
		]),
		sourceReadingKey,
		targetFoldedCanonicalForm: "bank",
		shadowId,
		record: {
			sourceReading: {},
			pending: { relation: "synonym", target },
			locator: { sourceReadingKey, relation: "synonym", targetPendingId },
		},
	};
}

function structuralRow(ownerReadingKey: string, path: string) {
	return {
		ownerReadingKey,
		aspect: "morphologicalTree" as const,
		path,
		locatorKey: structuralShadowLocatorKey(
			ownerReadingKey,
			"morphologicalTree",
			path,
		),
	};
}

/** Knowledge whose Morphological Tree holds the Shadow at root.children[0] and [1]. */
function treeKnowledge(readingKey: string, knowledge: unknown = undefined) {
	return {
		_id: `knowledge-${readingKey}` as Id<"accumulatedKnowledge">,
		knowledge: knowledge ?? {
			morphologicalTree: {
				root: {
					nodeKind: "structure",
					children: [
						{ nodeKind: "unitShadow", unitShadow: bank },
						{ nodeKind: "unitShadow", unitShadow: bank },
					],
				},
			},
		},
	};
}

function owner(
	readingKey: string,
	canonicalForm: string,
	overrides: Partial<{
		reading: null;
		lemma: null | { family: "Lexeme" | "Foreign"; canonicalForm: string };
		knowledge: ReturnType<typeof treeKnowledge> | null;
	}> = {},
) {
	return [
		readingKey,
		{
			reading:
				overrides.reading === null
					? null
					: {
							_id: `reading-${readingKey}` as Id<"readings">,
							emojiDescription: "🏦",
						},
			lemma:
				overrides.lemma === undefined
					? { family: "Lexeme" as const, canonicalForm }
					: overrides.lemma,
			knowledge:
				overrides.knowledge === undefined
					? treeKnowledge(readingKey)
					: overrides.knowledge,
		},
	] as const;
}

function rows(
	pendingRows: ReturnType<typeof pendingRow>[],
	structuralRows: ReturnType<typeof structuralRow>[] = [],
) {
	return {
		pendingRows,
		structuralRows,
		continueCursor: "next",
		isDone: false,
	};
}

function collectWarnings() {
	const warnings: { table: TableNames; id: string }[] = [];
	return {
		warnings,
		warn: (table: TableNames, id: string) => {
			warnings.push({ table, id });
		},
	};
}

test("groups pending and structural rows under their Reading, sorted", () => {
	const { warnings, warn } = collectWarnings();
	const page = buildShadowReferencePage(
		shadow,
		rows(
			[pendingRow("r-zug", "p2"), pendingRow("r-zug", "p1")],
			[
				structuralRow("r-geld", "root.children[1]"),
				structuralRow("r-geld", "root.children[0]"),
			],
		),
		new Map([owner("r-zug", "Zug"), owner("r-geld", "Geld")]),
		warn,
	);
	expect(page).toEqual({
		page: [
			{
				reading: {
					readingId: "reading-r-geld" as Id<"readings">,
					canonicalForm: "Geld",
					emojiDescription: "🏦",
					target: {
						kind: "Reading",
						readingId: "reading-r-geld" as Id<"readings">,
					},
				},
				pendingRelations: [],
				structuralReferences: [
					{ aspect: "morphologicalTree", path: "root.children[0]" },
					{ aspect: "morphologicalTree", path: "root.children[1]" },
				],
			},
			{
				reading: {
					readingId: "reading-r-zug" as Id<"readings">,
					canonicalForm: "Zug",
					emojiDescription: "🏦",
					target: {
						kind: "Reading",
						readingId: "reading-r-zug" as Id<"readings">,
					},
				},
				pendingRelations: [
					{
						locatorKey: JSON.stringify(["r-zug", "synonym", "p1"]),
						relation: "synonym",
					},
					{
						locatorKey: JSON.stringify(["r-zug", "synonym", "p2"]),
						relation: "synonym",
					},
				],
				structuralReferences: [],
			},
		],
		continueCursor: "next",
		isDone: false,
	});
	expect(warnings).toEqual([]);
});

test("a missing Reading or Lemma, or a non-unit Family, gives null", () => {
	const page = rows([pendingRow("r-zug", "p1")]);
	for (const overrides of [
		{ reading: null },
		{ lemma: null },
		{ lemma: { family: "Foreign" as const, canonicalForm: "Zug" } },
	] as const) {
		expect(
			buildShadowReferencePage(
				shadow,
				page,
				new Map([owner("r-zug", "Zug", overrides)]),
				collectWarnings().warn,
			),
		).toBeNull();
	}
	expect(
		buildShadowReferencePage(
			shadow,
			page,
			new Map(),
			collectWarnings().warn,
		),
	).toBeNull();
});

test("a pending row whose target does not fit the Shadow gives null", () => {
	const { warnings, warn } = collectWarnings();
	expect(
		buildShadowReferencePage(
			shadow,
			rows([pendingRow("r-zug", "p1", { ...bank, kind: "VERB" })]),
			new Map([owner("r-zug", "Zug")]),
			warn,
		),
	).toBeNull();
	expect(warnings).toEqual([]);
});

test("a structural row whose locator key is not its own gives null", () => {
	expect(
		buildShadowReferencePage(
			shadow,
			rows(
				[],
				[
					{
						...structuralRow("r-geld", "root.children[0]"),
						locatorKey: structuralShadowLocatorKey(
							"r-geld",
							"morphologicalTree",
							"root.children[1]",
						),
					},
				],
			),
			new Map([owner("r-geld", "Geld")]),
			collectWarnings().warn,
		),
	).toBeNull();
});

test("a structural row with no stored reference at its path gives null", () => {
	expect(
		buildShadowReferencePage(
			shadow,
			rows([], [structuralRow("r-geld", "root.children[2]")]),
			new Map([owner("r-geld", "Geld")]),
			collectWarnings().warn,
		),
	).toBeNull();
});

test("a malformed stored reference gives null and one warning", () => {
	const { warnings, warn } = collectWarnings();
	expect(
		buildShadowReferencePage(
			shadow,
			rows([], [structuralRow("r-geld", "root.children[0]")]),
			new Map([
				owner("r-geld", "Geld", {
					knowledge: treeKnowledge("r-geld", "not an object"),
				}),
			]),
			warn,
		),
	).toBeNull();
	expect(warnings).toEqual([
		{ table: "accumulatedKnowledge", id: "knowledge-r-geld" },
	]);
});

test("a malformed pending record gives null and one warning", () => {
	const { warnings, warn } = collectWarnings();
	const malformed = { ...pendingRow("r-zug", "p1"), record: "not an object" };
	expect(
		buildShadowReferencePage(
			shadow,
			{ ...rows([]), pendingRows: [malformed] },
			new Map([owner("r-zug", "Zug")]),
			warn,
		),
	).toBeNull();
	expect(warnings).toEqual([
		{ table: "pendingSemanticRelations", id: malformed._id },
	]);
});
