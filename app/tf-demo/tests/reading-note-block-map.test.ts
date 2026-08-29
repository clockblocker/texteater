import { describe, expect, test } from "bun:test";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { defaultKnowledgeRequestMask } from "dumrel";

import { supportedReadingRoutes } from "../shared/reading-block-layout";
import { orderNoteBlockKinds } from "../src/notes/note-block-order";
import {
	type ReadingBlockLayout,
	resolveReadingBlockPlan,
} from "../src/notes/reading/reading-block-plan";
import type { ReadingNoteRoute } from "../src/notes/reading/reading-note-route";
import { availableBlocksFor } from "../src/notes/reading/system-block-catalog";

const familyKinds = {
	Lexeme: [
		"ADJ",
		"ADP",
		"ADV",
		"AUX",
		"CCONJ",
		"DET",
		"INTJ",
		"NOUN",
		"NUM",
		"PART",
		"PRON",
		"PROPN",
		"PUNCT",
		"SCONJ",
		"SYM",
		"VERB",
		"X",
	],
	Phraseme: [
		"Aphorism",
		"Collocation",
		"DiscourseFormula",
		"Idiom",
		"Proverb",
	],
	Morpheme: [
		"Circumfix",
		"Clitic",
		"Duplifix",
		"Infix",
		"Interfix",
		"Prefix",
		"Root",
		"Suffix",
		"Suffixoid",
		"ToneMarking",
		"Transfix",
	],
} as const;

const universalBlocks = [
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
] as const;

describe("German Reading Block catalog", () => {
	test("resolves a complete valid plan for all 33 Unit Reading routes", () => {
		const routes = supportedReadingRoutes("de").map(
			(route) => route as ReadingNoteRoute,
		);
		expect(routes).toHaveLength(33);
		expect(new Set(routes.map(({ family }) => family))).toEqual(
			new Set(Object.keys(familyKinds)),
		);

		for (const route of routes) {
			const available = availableBlocksFor(route);
			const plan = resolveReadingBlockPlan(route, {
				order: available,
				hidden: new Set(),
			});
			expect(plan.map(({ blockKind }) => blockKind)).toEqual(available);
			expect(
				plan.every(({ renderer }) => typeof renderer === "function"),
			).toBeTrue();
		}
	});

	test("keeps applicability behind the catalog interface", () => {
		for (const route of supportedReadingRoutes("de")) {
			const blocks = new Set(
				availableBlocksFor(route as ReadingNoteRoute),
			);
			for (const block of universalBlocks)
				expect(blocks.has(block)).toBeTrue();
			expect(blocks.has("MorphologicalTree")).toBeFalse();
			expect(blocks.has("LexicalBreakdown")).toBeFalse();
			expect(blocks.has("Routes" as never)).toBeFalse();
		}
		expect(
			availableBlocksFor({
				targetLanguage: "de",
				family: "Construction",
				kind: "Clause",
			}),
		).toBeNull();
	});

	test("reconciles duplicate, stale, unsupported, and missing layout entries", () => {
		const route = {
			targetLanguage: "de",
			family: "Lexeme",
			kind: "PUNCT",
		} as const;
		const staleLayout = {
			order: [
				"Translations",
				"Routes",
				"Header",
				"Translations",
				"Relations",
			],
			hidden: new Set(["Definition", "Relations", "Routes"]),
		} as unknown as ReadingBlockLayout;

		expect(
			resolveReadingBlockPlan(route, staleLayout).map(
				({ blockKind }) => blockKind,
			),
		).toEqual(["Translations", "Header", "SourceContexts"]);
	});

	test("retains a hidden Block's position when it is re-enabled", () => {
		const route = {
			targetLanguage: "de",
			family: "Lexeme",
			kind: "NOUN",
		} as const;
		const order = [
			"Relations",
			"Header",
			"SourceContexts",
			"Translations",
			"Definition",
		] as const;

		expect(
			resolveReadingBlockPlan(route, {
				order,
				hidden: new Set(["Relations"]),
			}).map(({ blockKind }) => blockKind),
		).toEqual(["Header", "SourceContexts", "Translations", "Definition"]);
		expect(
			resolveReadingBlockPlan(route, {
				order,
				hidden: new Set(),
			}).map(({ blockKind }) => blockKind),
		).toEqual(order);
	});

	test("matches Dumrel's frozen German Relations applicability contract", () => {
		for (const [family, kinds] of Object.entries(familyKinds)) {
			for (const kind of kinds) {
				const route = {
					targetLanguage: "de",
					family,
					kind,
				} as ReadingNoteRoute;
				const blocks = new Set(availableBlocksFor(route));
				const lemmaSchema = lemmaSchemaFor(family, kind);
				const coreFeatures = Object.fromEntries(
					Object.keys(lemmaSchema.shape.coreFeatures.shape).map(
						(name) => [name, null],
					),
				);
				const lemma = lemmaSchema.parse({
					language: "de",
					family,
					kind,
					canonicalForm: "contract probe",
					coreFeatures,
				});
				const applicable = defaultKnowledgeRequestMask({
					lemma,
					emojiDescription: "🧭",
				} as never);

				expect(blocks.has("Relations")).toBe(
					Object.keys(applicable?.semanticRelations ?? {}).length > 0,
				);
			}
		}
	});

	test("keeps Route and Shadow Note ordering on the static weight system", () => {
		expect(orderNoteBlockKinds(new Set(["Routes", "Header"]))).toEqual([
			"Header",
			"Routes",
		]);
		expect(orderNoteBlockKinds(new Set(["Relations", "Header"]))).toEqual([
			"Header",
			"Relations",
		]);
	});
});

type RuntimeLemmaSchema = {
	readonly shape: {
		readonly coreFeatures: {
			readonly shape: Readonly<Record<string, unknown>>;
		};
	};
	parse(input: unknown): unknown;
};

const runtimeLemmaSchemas = schemasFor.de.entity.Lemma as unknown as Readonly<
	Record<string, Readonly<Record<string, () => RuntimeLemmaSchema>>>
>;

function lemmaSchemaFor(family: string, kind: string): RuntimeLemmaSchema {
	const schema = runtimeLemmaSchemas[family]?.[kind]?.();
	if (!schema)
		throw new Error(`Missing Dumling schema for ${family}/${kind}.`);
	return schema;
}
