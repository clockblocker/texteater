import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { renderToStaticMarkup } from "react-dom/server";
import { api, internal } from "../convex/_generated/api";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { parseGermanReading } from "../server/operationalParsing";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import { renderNote } from "../src/notes";
import { createTestConvex } from "./support/convex";
import {
	insertDictionaryLemma,
	insertReading,
} from "./support/dumdict-relations";

const ERINNERN: Dumling.Lemma<"de"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "erinnern",
	coreFeatures: { hasSepPrefix: null },
};
const reading = (emojiDescription: string) =>
	parseGermanReading({
		unitKind: "Reading",
		lemma: ERINNERN,
		emojiDescription,
	});
const REMEMBER = reading("🪞🧠");
const REMIND = reading("💭");

/** `erinnern` with 💭 and 🪞🧠, the 🪞 one holding its frame (ADR 0052). */
async function seeded() {
	const t = createTestConvex();
	const lemmaId = await insertDictionaryLemma(t, ERINNERN);
	const remindId = await insertReading(t, lemmaId, REMIND);
	const rememberId = await insertReading(t, lemmaId, REMEMBER);
	await t.run((ctx) =>
		ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingIdentityKey(REMEMBER),
			knowledge: {
				valency: [
					{
						status: "Required",
						complements: [
							{ kind: "Reflexive", governedCase: "Acc" },
						],
					},
				],
			},
			status: "Partial",
			updatedAt: 1,
		}),
	);
	return { t, lemmaId, remindId, rememberId };
}

test("a Lemma Note keeps its heading bare and cites each Reading by its frame", async () => {
	const { t, lemmaId, remindId, rememberId } = await seeded();
	const note = await t.query(api.routeNotes.get, {
		target: { kind: "Lemma", lemmaId },
	});
	if (note?.kind !== "Lemma") throw new Error("no Lemma Note");
	expect(
		Object.fromEntries(
			note.connections.readings.map(({ readingId, reflexive }) => [
				readingId,
				reflexive,
			]),
		),
	).toEqual({
		[remindId]: null,
		[rememberId]: {
			status: "Required",
			governedCase: "Acc",
			preposition: null,
		},
	});

	const markup = renderToStaticMarkup(renderNote({ noteData: note }));
	expect(markup).toMatch(/data-lemma-title=""[^>]*><bdi>erinnern<\/bdi>/);
	expect(markup).toContain("💭</span>erinnern<");
	expect(markup).toContain("🪞🧠</span>sich erinnern<");
});

test("a Reading Note's heading cites the reflexive its frame holds", async () => {
	const { t, rememberId, remindId } = await seeded();
	const headings = await Promise.all(
		[rememberId, remindId].map(async (readingId) => {
			const note = await t.query(api.readingNotes.get, {
				readingId,
				visitorId: "visitor-1",
			});
			if (note?.kind !== "Reading") throw new Error("no Reading Note");
			const markup = renderToStaticMarkup(
				renderNote({
					noteData: note,
					capabilities: {
						knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
						sourceContexts: {
							items: [],
							hasMore: false,
							isLoading: false,
							error: null,
							loadMore: null,
						},
						personalAnnotation: {
							isSaving: false,
							error: null,
							save: null,
						},
						follow: () => {},
					},
				}),
			);
			return markup.match(/aria-label="([^"]*), open its Lemma"/)?.[1];
		}),
	);
	expect(headings).toEqual(["sich erinnern", "erinnern"]);
});

test("a click finds the Readings whose stored frame has an Optional Reflexive Slot", async () => {
	const t = createTestConvex();
	const ausruhen: Dumling.Lemma<"de"> = {
		...ERINNERN,
		canonicalForm: "ausruhen",
		coreFeatures: { hasSepPrefix: "aus" },
	};
	const lemmaId = await insertDictionaryLemma(t, ausruhen);
	const frames = {
		"😴": "Optional",
		"🪞🧘": "Required",
		"💤": undefined,
	} as const;
	for (const [emojiDescription, status] of Object.entries(frames)) {
		const stored = parseGermanReading({
			unitKind: "Reading",
			lemma: ausruhen,
			emojiDescription,
		});
		await insertReading(t, lemmaId, stored);
		if (status === undefined) continue;
		await t.run((ctx) =>
			ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: readingIdentityKey(stored),
				knowledge: {
					valency: [
						{
							status,
							complements: [
								{ kind: "Reflexive", governedCase: "Acc" },
							],
						},
					],
				},
				status: "Partial",
				updatedAt: 1,
			}),
		);
	}
	expect(
		await t.query(
			internal.dumdictStorage.queries.findOptionallyReflexiveReadings,
			{ lemmaKey: lemmaIdentityKey(ausruhen) },
		),
	).toEqual(["😴"]);
});
