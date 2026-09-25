import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { api } from "../convex/_generated/api";
import {
	DEFAULT_DE_READING_LANGUAGE_LAYOUT,
	type ReadingBlockKind,
	type ReadingBlockRoute,
} from "../shared/reading-block-layout";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const VISITOR_ID = "visitor-1";
const VERB_ROUTE = {
	targetLanguage: "de",
	family: "Lexeme",
	kind: "VERB",
} as const satisfies ReadingBlockRoute;
const IDIOM_ROUTE = {
	targetLanguage: "de",
	family: "Phraseme",
	kind: "Idiom",
} as const satisfies ReadingBlockRoute;
const PUNCT_ROUTE = {
	targetLanguage: "de",
	family: "Lexeme",
	kind: "PUNCT",
} as const satisfies ReadingBlockRoute;

const {
	getFamilyKind,
	getLanguage,
	setFamilyKindBlockOrder,
	setFamilyKindBlockVisibility,
	setLanguageBlockOrder,
	setLanguageBlockVisibility,
} = api.readingBlockLayouts;

function layoutRows(
	t: TestConvexDb,
	table: "readingLanguageLayouts" | "readingFamilyKindLayouts",
) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

const LANGUAGE_ORDER: readonly ReadingBlockKind[] = [
	"Definition",
	"Relations",
	"Translations",
	"SourceContexts",
	"Header",
	"Valency",
	"PersonalAnnotation",
];
const LOCAL_VERB_ORDER: readonly ReadingBlockKind[] = [
	"Translations",
	"Header",
	"SourceContexts",
	"Definition",
	"Valency",
	"Relations",
	"PersonalAnnotation",
];

describe("Reading Block layout persistence", () => {
	test("returns safe catalog defaults without materializing visitor state", async () => {
		const t = createTestConvex();

		expect(
			await t.query(getLanguage, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
			}),
		).toEqual(DEFAULT_DE_READING_LANGUAGE_LAYOUT);
		expect(
			await t.query(getFamilyKind, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
			}),
		).toEqual(DEFAULT_DE_READING_LANGUAGE_LAYOUT);
		expect(await layoutRows(t, "readingLanguageLayouts")).toEqual([]);
		expect(await layoutRows(t, "readingFamilyKindLayouts")).toEqual([]);
	});

	test("language order remains a fallback without materializing route availability", async () => {
		const t = createTestConvex();

		expect(
			await t.mutation(setLanguageBlockOrder, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
				order: LANGUAGE_ORDER,
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: [] });

		expect(await layoutRows(t, "readingLanguageLayouts")).toHaveLength(1);
		expect(await layoutRows(t, "readingFamilyKindLayouts")).toEqual([]);
		for (const route of [VERB_ROUTE, IDIOM_ROUTE, PUNCT_ROUTE]) {
			expect(
				await t.query(getFamilyKind, {
					visitorId: VISITOR_ID,
					route,
				}),
			).toEqual({ order: LANGUAGE_ORDER, hidden: [] });
		}
	});

	test("a later local edit wins only for its route and keeps facets independent", async () => {
		const t = createTestConvex();
		await t.mutation(setLanguageBlockOrder, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			order: LANGUAGE_ORDER,
		});
		await t.mutation(setLanguageBlockVisibility, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			blockKind: "Relations",
			visible: false,
		});

		await t.mutation(setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await t.mutation(setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Relations",
			visible: true,
		});
		await t.mutation(setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Definition",
			visible: false,
		});

		expect(
			await t.query(getFamilyKind, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
			}),
		).toEqual({ order: LOCAL_VERB_ORDER, hidden: ["Definition"] });
		expect(
			await t.query(getFamilyKind, {
				visitorId: VISITOR_ID,
				route: IDIOM_ROUTE,
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: ["Relations"] });
		expect(
			await t.query(getLanguage, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: ["Relations"] });
	});

	test("a later language edit replaces the matching local facet but preserves all others", async () => {
		const t = createTestConvex();
		await t.mutation(setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await t.mutation(setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Definition",
			visible: false,
		});
		await t.mutation(setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Translations",
			visible: false,
		});
		expect(await layoutRows(t, "readingLanguageLayouts")).toEqual([]);
		expect(await layoutRows(t, "readingFamilyKindLayouts")).toHaveLength(1);
		expect(
			await t.query(getFamilyKind, {
				visitorId: VISITOR_ID,
				route: IDIOM_ROUTE,
			}),
		).toEqual(DEFAULT_DE_READING_LANGUAGE_LAYOUT);

		await t.mutation(setLanguageBlockOrder, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			order: LANGUAGE_ORDER,
		});
		let verb = await t.query(getFamilyKind, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
		});
		expect(verb).toEqual({
			order: LANGUAGE_ORDER,
			hidden: ["Definition", "Translations"],
		});

		await t.mutation(setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await t.mutation(setLanguageBlockVisibility, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			blockKind: "Definition",
			visible: true,
		});
		verb = await t.query(getFamilyKind, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
		});
		expect(verb).toEqual({
			order: LOCAL_VERB_ORDER,
			hidden: ["Translations"],
		});
	});

	test("rejects malformed order while route availability remains renderer-owned", async () => {
		const t = createTestConvex();

		await expect(
			t.mutation(setFamilyKindBlockOrder, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
				order: ["Header", "Definition", "Header"],
			}),
		).rejects.toThrow(
			"Reading Block order must contain configured Blocks at most once.",
		);
		await t.mutation(setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: PUNCT_ROUTE,
			blockKind: "Relations",
			visible: false,
		});
		expect(
			await t.query(getFamilyKind, {
				visitorId: VISITOR_ID,
				route: { ...VERB_ROUTE, kind: "NOT_A_KIND" },
			}),
		).toEqual(DEFAULT_DE_READING_LANGUAGE_LAYOUT);
		expect(await layoutRows(t, "readingLanguageLayouts")).toEqual([]);
		expect(await layoutRows(t, "readingFamilyKindLayouts")).toHaveLength(1);
	});
});
