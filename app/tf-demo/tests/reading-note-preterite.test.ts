import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { api } from "../convex/_generated/api";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const anrufen = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "anrufen",
		coreFeatures: { hasSepPrefix: "an", lexicallyReflexive: null },
	},
	emojiDescription: "📞",
} as const;

test("the Reading Note carries a verb's Präteritum beside its conjugation class (#1209)", async () => {
	const t = createTestConvex();
	const knowledge: Dumrel.ReadingKnowledge = {
		conjugationClass: ["Strong"],
		preterite: ["rief an"],
	};
	const readingId = await t.run(async (ctx) => {
		const { lemma } = anrufen;
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(lemma),
			coreFeatures: lemma.coreFeatures,
		});
		const readingKey = readingIdentityKey(anrufen);
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingKey,
			knowledge,
			status: "Partial",
			updatedAt: 1,
		});
		return ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: anrufen.emojiDescription,
		});
	});

	const note = await t.query(api.readingNotes.get, {
		readingId,
		visitorId: "visitor-1",
	});

	expect(note?.knowledge).toEqual(knowledge);
});
