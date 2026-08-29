import { describe, expect, test } from "bun:test";
import {
	getFamilyKind,
	getLanguage,
	setFamilyKindBlockOrder,
	setFamilyKindBlockVisibility,
	setLanguageBlockOrder,
	setLanguageBlockVisibility,
} from "../convex/readingBlockLayouts";
import {
	DEFAULT_DE_READING_LANGUAGE_LAYOUT,
	defaultReadingBlockLayoutForRoute,
	projectReadingLanguageLayoutOntoRoute,
	type ReadingBlockKind,
	type ReadingBlockRoute,
	supportedReadingRoutes,
} from "../shared/reading-block-layout";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

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

const LANGUAGE_ORDER: readonly ReadingBlockKind[] = [
	"Definition",
	"Relations",
	"Translations",
	"SourceContexts",
	"Header",
];
const LOCAL_VERB_ORDER: readonly ReadingBlockKind[] = [
	"Translations",
	"Header",
	"SourceContexts",
	"Definition",
	"Relations",
];

describe("Reading Block layout persistence", () => {
	test("returns safe catalog defaults without materializing visitor state", async () => {
		const db = new IndexedTestDb();

		expect(
			await runTestQuery(db, getLanguage, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
			}),
		).toEqual(DEFAULT_DE_READING_LANGUAGE_LAYOUT);
		expect(
			await runTestQuery(db, getFamilyKind, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
			}),
		).toEqual(defaultReadingBlockLayoutForRoute(VERB_ROUTE));
		expect(db.rows("readingLanguageLayouts")).toEqual([]);
		expect(db.rows("readingFamilyKindLayouts")).toEqual([]);
	});

	test("language order materializes every route and broadcasts a projected order", async () => {
		const db = new IndexedTestDb();

		expect(
			await runTestMutation(db, setLanguageBlockOrder, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
				order: LANGUAGE_ORDER,
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: [] });

		expect(db.rows("readingLanguageLayouts")).toHaveLength(1);
		expect(db.rows("readingFamilyKindLayouts")).toHaveLength(
			supportedReadingRoutes("de").length,
		);
		for (const route of [VERB_ROUTE, IDIOM_ROUTE, PUNCT_ROUTE]) {
			expect(
				await runTestQuery(db, getFamilyKind, {
					visitorId: VISITOR_ID,
					route,
				}),
			).toEqual(
				projectReadingLanguageLayoutOntoRoute(
					{ order: LANGUAGE_ORDER, hidden: [] },
					route,
				),
			);
		}
	});

	test("a later local edit wins only for its route and keeps facets independent", async () => {
		const db = new IndexedTestDb();
		await runTestMutation(db, setLanguageBlockOrder, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			order: LANGUAGE_ORDER,
		});
		await runTestMutation(db, setLanguageBlockVisibility, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			blockKind: "Relations",
			visible: false,
		});

		await runTestMutation(db, setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await runTestMutation(db, setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Relations",
			visible: true,
		});
		await runTestMutation(db, setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Definition",
			visible: false,
		});

		expect(
			await runTestQuery(db, getFamilyKind, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
			}),
		).toEqual({ order: LOCAL_VERB_ORDER, hidden: ["Definition"] });
		expect(
			await runTestQuery(db, getFamilyKind, {
				visitorId: VISITOR_ID,
				route: IDIOM_ROUTE,
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: ["Relations"] });
		expect(
			await runTestQuery(db, getLanguage, {
				visitorId: VISITOR_ID,
				targetLanguage: "de",
			}),
		).toEqual({ order: LANGUAGE_ORDER, hidden: ["Relations"] });
	});

	test("a later language edit replaces the matching local facet but preserves all others", async () => {
		const db = new IndexedTestDb();
		await runTestMutation(db, setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await runTestMutation(db, setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Definition",
			visible: false,
		});
		await runTestMutation(db, setFamilyKindBlockVisibility, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			blockKind: "Translations",
			visible: false,
		});
		expect(db.rows("readingLanguageLayouts")).toEqual([]);
		expect(db.rows("readingFamilyKindLayouts")).toHaveLength(1);
		expect(
			await runTestQuery(db, getFamilyKind, {
				visitorId: VISITOR_ID,
				route: IDIOM_ROUTE,
			}),
		).toEqual(defaultReadingBlockLayoutForRoute(IDIOM_ROUTE));

		await runTestMutation(db, setLanguageBlockOrder, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			order: LANGUAGE_ORDER,
		});
		let verb = await runTestQuery(db, getFamilyKind, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
		});
		expect(verb).toEqual({
			order: LANGUAGE_ORDER,
			hidden: ["Definition", "Translations"],
		});

		await runTestMutation(db, setFamilyKindBlockOrder, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
			order: LOCAL_VERB_ORDER,
		});
		await runTestMutation(db, setLanguageBlockVisibility, {
			visitorId: VISITOR_ID,
			targetLanguage: "de",
			blockKind: "Definition",
			visible: true,
		});
		verb = await runTestQuery(db, getFamilyKind, {
			visitorId: VISITOR_ID,
			route: VERB_ROUTE,
		});
		expect(verb).toEqual({
			order: LOCAL_VERB_ORDER,
			hidden: ["Translations"],
		});
	});

	test("rejects unsupported routes, blocks, and partial orders transactionally", async () => {
		const db = new IndexedTestDb();

		await expect(
			runTestMutation(db, setFamilyKindBlockOrder, {
				visitorId: VISITOR_ID,
				route: VERB_ROUTE,
				order: ["Header", "Definition"],
			}),
		).rejects.toThrow(
			"Reading Block order must contain every supported Block exactly once.",
		);
		await expect(
			runTestMutation(db, setFamilyKindBlockVisibility, {
				visitorId: VISITOR_ID,
				route: PUNCT_ROUTE,
				blockKind: "Relations",
				visible: false,
			}),
		).rejects.toThrow("Unsupported Reading Block: Relations.");
		await expect(
			runTestQuery(db, getFamilyKind, {
				visitorId: VISITOR_ID,
				route: { ...VERB_ROUTE, kind: "NOT_A_KIND" },
			}),
		).rejects.toThrow("Unsupported Reading route: de/Lexeme/NOT_A_KIND.");
		expect(db.rows("readingLanguageLayouts")).toEqual([]);
		expect(db.rows("readingFamilyKindLayouts")).toEqual([]);
	});
});
