import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { renderToStaticMarkup } from "react-dom/server";
import { api } from "../convex/_generated/api";
import { structuralShadowLocatorKey } from "../convex/model/shadows";
import { projectFeaturesForPresentation as projectFeatures } from "../convex/modules/notes/featurePresentation";
import {
	projectReadingKnowledge,
	projectReadingValue,
} from "../convex/modules/notes/projections";
import { isUnitReadingFamily } from "../convex/modules/notes/unitReadingFamilies";
import {
	get as getReadingNote,
	sourceContexts as getSourceContexts,
} from "../convex/readingNotes";
import { get as getScrollView, occurrenceFocus } from "../convex/scrollViews";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import { createTestConvex, submitText } from "./support/convex";
import { exportedArgs, exportedReturns } from "./support/convexRuntimeExports";
import {
	bankLemma,
	germanAdposition,
	insertReading,
	type ReadingValue,
} from "./support/presentation";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("projects Dumling feature values for learner inspection", () => {
	expect(projectFeatures({ gender: "Fem", number: null })).toEqual([
		{ name: "gender", value: "Fem" },
		{ name: "number", value: "—" },
	]);
});

test("projects a value set and a mixed gender as Notes print them, not as JSON", () => {
	expect(
		projectFeatures({
			case: ["Acc", "Dat"],
			gender: { mixed: ["Masc", "Neut"] },
		}),
	).toEqual([
		{ name: "case", value: "Acc/Dat" },
		{ name: "gender", value: "Masc/Neut" },
	]);
});

test("projects foundational Reading and unfiltered Knowledge without display sentinels", () => {
	const reading = projectReadingValue(
		{ emojiDescription: "🏃" },
		{
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "aufpassen",
			coreFeatures: {
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
			},
		},
	);
	const knowledge = projectReadingKnowledge(reading, {
		transcription: "  aʊ̯fˌpasn̩  ",
		definition: "  aufmerksam sein  ",
		translations: { en: ["pay attention"] },
	});

	expect(reading.lemma.coreFeatures).toEqual({
		hasSepPrefix: "auf",
		lexicallyReflexive: null,
	});
	expect(knowledge).toEqual({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
	});
});

test("Unit Reading NoteData ignores visitor settings and keeps all pure data", async () => {
	const t = createTestConvex();
	const sourceLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "aufpassen",
		coreFeatures: {
			hasSepPrefix: "auf",
			lexicallyReflexive: null,
		},
	} as const;
	const targetLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Aufmerksamkeit",
		coreFeatures: { gender: "Fem" },
	} as const;
	const source = await insertReading(t, {
		unitKind: "Reading",
		lemma: sourceLemma,
		emojiDescription: "🏃",
	});
	const target = await insertReading(t, {
		unitKind: "Reading",
		lemma: targetLemma,
		emojiDescription: "👀",
	});
	const everythingOff = JSON.parse(
		JSON.stringify(DEFAULT_KNOWLEDGE_SETTINGS).replaceAll("true", "false"),
	);
	await t.run(async (ctx) => {
		for (const { lemmaId } of [source, target]) {
			await ctx.db.insert("dictionaryLemmas", { lemmaId });
		}
		await ctx.db.insert("readingEntries", {
			readingId: source.readingId,
			record: { attestedTranslations: [], notes: "" },
		});
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: source.readingKey,
			knowledge: {
				transcription: "aʊ̯fˌpasn̩",
				definition: "aufmerksam sein",
				translations: { en: ["pay attention"] },
			},
			status: "Full",
			updatedAt: 42,
		});
		await ctx.db.insert("semanticRelationEdges", {
			sourceReadingId: source.readingId,
			targetLemmaId: target.lemmaId,
			relation: "synonym",
		});
		const shadowId = await ctx.db.insert("shadows", {
			shadowKey: JSON.stringify(["de", "merkmal", "Lexeme", "NOUN"]),
			language: "de",
			canonicalForm: "Merkmal",
			family: "Lexeme",
			kind: "NOUN",
		});
		await ctx.db.insert("structuralShadowReferences", {
			shadowId,
			ownerReadingKey: source.readingKey,
			aspect: "breakdown",
			path: "constituents.0",
			locatorKey: structuralShadowLocatorKey(
				source.readingKey,
				"breakdown",
				"constituents.0",
			),
		});
		// A Visitor who hid every Knowledge aspect still receives pure NoteData.
		await ctx.db.insert("knowledgeSettings", {
			visitorId: "visitor-1",
			settings: everythingOff,
			updatedAt: 1,
		});
	});

	const note = await t.query(api.readingNotes.get, {
		readingId: source.readingId,
		visitorId: "visitor-1",
	});

	if (!note) throw new Error("Expected a Reading Note.");
	expect(note.kind).toBe("Reading");
	expect(note.reading.lemma.coreFeatures).toEqual(sourceLemma.coreFeatures);
	expect(note.knowledge).toMatchObject({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
		semanticRelations: {
			synonym: [
				{
					unitKind: "Lemma",
					language: targetLemma.language,
					family: targetLemma.family,
					kind: targetLemma.kind,
					canonicalForm: targetLemma.canonicalForm,
					coreFeatures: targetLemma.coreFeatures,
				},
			],
		},
	});
	expect(note.relations).toHaveLength(1);
	expect(note.structuralReferences).toHaveLength(1);
});

test("a stored Valency Frame reaches the Reading Note and renders its Valency Block", async () => {
	const t = createTestConvex();
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "aufpassen",
		coreFeatures: {
			hasSepPrefix: "auf",
			lexicallyReflexive: null,
		},
	} as const;
	const valency: Dumrel.ValencyFrame = [
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: germanAdposition("auf"),
					governedCase: "Acc",
					referent: "Either",
				},
			],
		},
	];
	const reading = await insertReading(t, {
		unitKind: "Reading",
		lemma,
		emojiDescription: "👀",
	});
	await t.run(async (ctx) => {
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: reading.readingKey,
			knowledge: { valency },
			status: "Partial",
			updatedAt: 1,
		});
	});

	const note = await t.query(api.readingNotes.get, {
		readingId: reading.readingId,
		visitorId: "visitor-1",
	});

	if (!note) throw new Error("Expected a Reading Note.");
	expect(note.knowledge.valency).toEqual(valency);
	const markup = renderToStaticMarkup(renderNote({ noteData: note }));
	expect(markup).toContain('aria-label="Valency"');
	expect(markup).toContain(
		'<span data-slot="valency-token" class="font-mono text-[0.9em] text-ink-soft">jN/etw</span>',
	);
});

test("the Reading Note carries the per-Reading aspects Knowledge production writes", async () => {
	const t = createTestConvex();
	const cases: readonly {
		readonly reading: ReadingValue;
		readonly knowledge: Pick<Dumrel.ReadingKnowledge, "formulaRole">;
	}[] = [
		{
			reading: {
				unitKind: "Reading",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "INTJ",
					canonicalForm: "danke",
					coreFeatures: { partType: null },
				},
				emojiDescription: "🙏",
			},
			knowledge: { formulaRole: "Thanks" },
		},
	];
	for (const { reading: value, knowledge } of cases) {
		const reading = await insertReading(t, value);
		await t.run(async (ctx) => {
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: reading.readingKey,
				knowledge,
				status: "Partial",
				updatedAt: 1,
			});
		});

		const note = await t.query(api.readingNotes.get, {
			readingId: reading.readingId,
			visitorId: "visitor-1",
		});

		if (!note) throw new Error("Expected a Reading Note.");
		expect(note.knowledge).toEqual(knowledge);
	}
});

test("the Reading Note carries Slot alternatives and every German complement kind", async () => {
	const t = createTestConvex();
	const verb = (canonicalForm: string, hasSepPrefix: string | null = null) =>
		({
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm,
			coreFeatures: { hasSepPrefix, lexicallyReflexive: null },
		}) as const;
	const subject: Dumrel.ValencySlot = {
		status: "Required",
		complements: [
			{ kind: "Case", governedCase: "Nom", referent: "Someone" },
		],
	};
	const frames: readonly {
		readonly lemma: ReturnType<typeof verb>;
		readonly valency: Dumrel.ValencyFrame;
	}[] = [
		{
			lemma: verb("reden"),
			valency: [
				subject,
				{
					status: "Optional",
					complements: [
						{
							kind: "Preposition",
							preposition: germanAdposition("über"),
							governedCase: "Acc",
							referent: "Either",
						},
						{
							kind: "Preposition",
							preposition: germanAdposition("von"),
							governedCase: "Dat",
							referent: "Either",
						},
					],
				},
			],
		},
		{
			lemma: verb("wohnen"),
			valency: [
				subject,
				{
					status: "Required",
					complements: [{ kind: "Adverbial", standIn: "Irgendwo" }],
				},
			],
		},
		{
			lemma: verb("aussehen", "aus"),
			valency: [
				subject,
				{
					status: "Required",
					complements: [
						{ kind: "Predicative", of: "Subject", marker: "None" },
					],
				},
			],
		},
		{
			lemma: verb("warten"),
			valency: [
				subject,
				{
					status: "Optional",
					complements: [
						{
							kind: "Preposition",
							preposition: germanAdposition("auf"),
							governedCase: "Acc",
							referent: "Either",
						},
						{ kind: "Clause", form: "Dass", correlate: "Required" },
					],
				},
			],
		},
		{
			lemma: verb("bedeuten"),
			valency: [
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Nom",
							referent: "Something",
						},
						{ kind: "Clause", form: "Dass" },
					],
				},
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Acc",
							referent: "Something",
						},
						{ kind: "Clause", form: "Dass" },
					],
				},
			],
		},
	];
	for (const { lemma, valency } of frames) {
		const reading = await insertReading(t, {
			unitKind: "Reading",
			lemma,
			emojiDescription: "🧩",
		});
		await t.run(async (ctx) => {
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: reading.readingKey,
				knowledge: { valency },
				status: "Partial",
				updatedAt: 1,
			});
		});

		const note = await t.query(api.readingNotes.get, {
			readingId: reading.readingId,
			visitorId: "visitor-1",
		});

		if (!note) throw new Error("Expected a Reading Note.");
		expect(note.knowledge.valency).toEqual(valency);
		// The Valency Line shows no alternatives or free complements yet (#676).
		expect(
			renderToStaticMarkup(renderNote({ noteData: note })),
		).not.toContain('aria-label="Valency"');
	}
});

test("note and text queries expose target-specific interfaces", () => {
	const scrollArgs = exportedArgs(getScrollView);
	const scrollReturns = exportedReturns(getScrollView);
	const focusArgs = exportedArgs(occurrenceFocus);
	const focusReturns = exportedReturns(occurrenceFocus);
	const noteArgs = exportedArgs(getReadingNote);
	const noteReturns = exportedReturns(getReadingNote);

	expect(scrollArgs).toContain('"scrollId"');
	expect(scrollArgs).not.toContain('"focusAttestationId"');
	expect(scrollArgs).not.toContain('"target"');
	expect(focusArgs).toContain('"scrollId"');
	expect(focusArgs).toContain('"attestationId"');
	expect(noteArgs).toContain('"readingId"');
	// Paging travels through its own query, so the body never takes a cursor.
	expect(noteArgs).not.toContain('"contextCursor"');
	expect(exportedArgs(getSourceContexts)).toContain('"cursor"');
	expect(exportedReturns(getSourceContexts)).toContain('"sentenceSnippet"');
	expect(exportedReturns(getSourceContexts)).not.toContain(
		'"personalAnnotation"',
	);
	expect(noteArgs).toContain('"visitorId"');
	expect(noteArgs).not.toContain('"value":"RouteNote"');
	expect(noteArgs).not.toContain('"value":"ShadowNote"');
	expect(noteReturns).toContain('"tableName":"readings"');
	expect(noteReturns).toContain('"tableName":"attestations"');
	expect(noteReturns).toContain('"sentenceSnippet"');
	expect(noteReturns).not.toContain("targetReadingKey");
	expect(noteReturns).toContain('"value":"Lemma"');
	// Landing on an occurrence never changes the Scroll query's shape.
	expect(scrollReturns).not.toContain('"value":"Occurrence"');
	expect(focusReturns).toContain('"value":"Missing"');
	expect(focusReturns).toContain('"value":"Occurrence"');
});

test("only learner-facing Unit families can open Unit Reading Notes", () => {
	expect(
		["Lexeme", "Locution", "Saying", "Morpheme"].every(isUnitReadingFamily),
	).toBe(true);
	expect(isUnitReadingFamily("Foreign")).toBe(false);
	expect(isUnitReadingFamily("Construction")).toBe(false);
});

test("malformed routed IDs return not-found", async () => {
	const t = createTestConvex();

	expect(
		await t.query(api.readingNotes.get, {
			readingId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await t.query(api.scrollViews.get, {
			scrollId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
});

test("deleted routed records return the same defined not-found result", async () => {
	const t = createTestConvex();
	const { readingId } = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const { scrollId } = await submitText(t, [["Banken"]]);
	await t.run(async (ctx) => {
		await ctx.db.delete(readingId);
		await ctx.db.delete(scrollId);
	});

	expect(
		await t.query(api.readingNotes.get, {
			readingId,
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await t.query(api.scrollViews.get, {
			scrollId,
			visitorId: "visitor-1",
		}),
	).toBeNull();
});
