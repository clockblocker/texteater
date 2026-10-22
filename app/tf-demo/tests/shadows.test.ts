import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { messageOf } from "common-utils";
import { internal } from "../convex/_generated/api";
import { resetDemoTableNames } from "../convex/demoReset";
import {
	attachPendingShadowReference,
	collectStructuralShadowReferences,
	descriptorFromStoredShadow,
	normalizeShadowDescriptor,
	parsePendingShadowDescriptor,
	parseStoredShadowDescriptor,
	parseStructuralShadowReferences,
	replaceAccumulatedKnowledge,
	shadowIsCompatible,
	shadowKeyFor,
} from "../convex/model/shadows";
import { foldedCanonicalForm } from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";
import {
	insertPendingRelation,
	nounShadow,
	pendingRecord,
	replaceKnowledge,
	rows,
	shadowTree,
	structuralKnowledge,
	verbShadow,
} from "./support/shadows";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("Shadow descriptor and storage seam", () => {
	test("normalizes stable descriptors and preserves every exact structural path", () => {
		expect(normalizeShadowDescriptor(nounShadow)).toEqual({
			...nounShadow,
			canonicalForm: "Bank",
		});
		expect(shadowKeyFor(nounShadow)).toBe('["de","bank","Lexeme","NOUN"]');
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, extra: true }),
		).toThrow("exactly language");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, kind: "VERBISH" }),
		).toThrow("not a supported Dumling Lemma route");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, language: " de " }),
		).toThrow("Unsupported Unit Shadow language");
		// Family and Kind are closed names, checked exactly as Dumdict does.
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, family: " Lexeme" }),
		).toThrow("de/ Lexeme/NOUN is not a supported Dumling Lemma route");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, kind: "NOUN " }),
		).toThrow("de/Lexeme/NOUN  is not a supported Dumling Lemma route");
		expect(() =>
			normalizeShadowDescriptor({ ...verbShadow, kind: " VERB" }),
		).toThrow("de/Lexeme/ VERB is not a supported Dumling Lemma route");
		const stored = {
			_id: "shadow_realistic",
			_creationTime: 1,
			shadowKey: shadowKeyFor(nounShadow),
			...normalizeShadowDescriptor(nounShadow),
		};
		expect(descriptorFromStoredShadow(stored)).toEqual(
			normalizeShadowDescriptor(nounShadow),
		);
		expect(shadowIsCompatible(stored, nounShadow)).toBe(true);
		expect(() =>
			normalizeShadowDescriptor({
				...nounShadow,
				language: "he",
				family: "Locution",
				kind: "VERB",
			}),
		).toThrow("not a supported Dumling Lemma route");
		expect(
			collectStructuralShadowReferences(structuralKnowledge()).map(
				({ aspect, path }) => `${aspect}:${path}`,
			),
		).toEqual([
			"morphologicalTree:root.children[0]",
			"morphologicalTree:root.children[1].children[0]",
		]);
	});

	test("parses malformed stored values to a failure instead of throwing", () => {
		expect(parseStoredShadowDescriptor(null)).toEqual({
			ok: false,
			error: "Stored Shadow must be an object.",
		});
		expect(
			parsePendingShadowDescriptor({
				pending: { target: { ...nounShadow, kind: "VERBISH" } },
			}),
		).toMatchObject({
			ok: false,
			error: expect.stringContaining(
				"not a supported Dumling Lemma route",
			),
		});
		expect(
			parseStructuralShadowReferences(shadowTree({ family: "Lexeme" })),
		).toMatchObject({
			ok: false,
			error: expect.stringContaining("exactly language"),
		});
		expect(parsePendingShadowDescriptor(pendingRecord())).toEqual({
			ok: true,
			value: normalizeShadowDescriptor(nounShadow),
		});

		const stored = {
			shadowKey: shadowKeyFor(nounShadow),
			...normalizeShadowDescriptor(nounShadow),
		};
		expect(shadowIsCompatible(null, nounShadow)).toBe(false);
		expect(shadowIsCompatible(stored, { ...nounShadow, extra: true })).toBe(
			false,
		);
		expect(shadowIsCompatible(stored, nounShadow)).toBe(true);
	});

	test("atomically replaces structural projection, keeps dormant rows, and reuses the same Shadow ID", async () => {
		const t = createTestConvex();
		await replaceKnowledge(t, "reading-source", structuralKnowledge());
		expect(await rows(t, "structuralShadowReferences")).toHaveLength(2);
		const shadows = await rows(t, "shadows");
		expect(shadows).toHaveLength(1);
		const shadowId = shadows[0]?._id;
		if (!shadowId) throw new Error("Expected a Shadow.");
		const referenceIds = (await rows(t, "structuralShadowReferences")).map(
			({ _id }) => _id,
		);

		await replaceKnowledge(t, "reading-source", structuralKnowledge());
		expect(
			(await rows(t, "structuralShadowReferences")).map(({ _id }) => _id),
		).toEqual(referenceIds);

		await replaceKnowledge(t, "reading-source", undefined);
		expect(await rows(t, "structuralShadowReferences")).toEqual([]);
		expect((await rows(t, "shadows")).map(({ _id }) => _id)).toEqual([
			shadowId,
		]);

		await replaceKnowledge(
			t,
			"reading-source",
			shadowTree(nounShadow, verbShadow),
		);
		expect(
			(await rows(t, "shadows")).find(
				({ shadowKey }) => shadowKey === shadowKeyFor(nounShadow),
			)?._id,
		).toBe(shadowId);
	});

	test("rejects a malformed replacement before changing authoritative or projected state", async () => {
		const t = createTestConvex();
		await replaceKnowledge(
			t,
			"reading-source",
			shadowTree(nounShadow, verbShadow),
		);
		const snapshot = async () => ({
			accumulatedKnowledge: await rows(t, "accumulatedKnowledge"),
			definitionTexts: await rows(t, "definitionTexts"),
			shadows: await rows(t, "shadows"),
			structuralShadowReferences: await rows(
				t,
				"structuralShadowReferences",
			),
		});
		const before = await snapshot();

		// The failure is caught inside the transaction, so any write made
		// before validation would commit and show up in the snapshot.
		const failure = await t.run(async (ctx) => {
			try {
				await replaceAccumulatedKnowledge(
					ctx,
					"reading-source",
					shadowTree(nounShadow, { family: "Lexeme" }),
				);
				return null;
			} catch (error) {
				return messageOf(error);
			}
		});
		expect(failure).toContain("exactly language");
		expect(await snapshot()).toEqual(before);
	});
});

describe("Shadow reset lifecycle", () => {
	async function lifecycleDb() {
		const t = createTestConvex();
		await replaceKnowledge(
			t,
			"reading-doomed",
			shadowTree(nounShadow, nounShadow),
		);
		await replaceKnowledge(
			t,
			"reading-survivor",
			shadowTree(nounShadow, nounShadow),
		);
		const { activeShadowId, dormantShadowId } = await t.run(async (ctx) => {
			const pending = pendingRecord("reading-doomed");
			const active = await attachPendingShadowReference(ctx, pending);
			await insertPendingRelation(ctx, pending, active);
			const dormant = await attachPendingShadowReference(ctx, {
				...pending,
				pending: { relation: "synonym", target: verbShadow },
			});
			return { activeShadowId: active, dormantShadowId: dormant };
		});
		return { t, activeShadowId, dormantShadowId };
	}

	test("analysis stripping removes doomed references, preserves survivor activity, and visitor reset leaves Shadows", async () => {
		const { t, activeShadowId, dormantShadowId } = await lifecycleDb();
		await t.mutation(internal.analysisStripping.clearReadingDataBatch, {
			readingKeys: ["reading-doomed"],
		});
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		const references = await rows(t, "structuralShadowReferences");
		expect(
			references.every(
				({ ownerReadingKey }) => ownerReadingKey === "reading-survivor",
			),
		).toBe(true);
		expect(
			references.some(({ shadowId }) => shadowId === activeShadowId),
		).toBe(true);
		expect((await rows(t, "shadows")).map(({ _id }) => _id).sort()).toEqual(
			[activeShadowId, dormantShadowId].sort(),
		);

		await t.mutation(internal.demoReset.clearVisitorDataBatch, {
			visitorId: "visitor-1",
		});
		expect((await rows(t, "shadows")).map(({ _id }) => _id).sort()).toEqual(
			[activeShadowId, dormantShadowId].sort(),
		);
	});

	test("shared reset removes active and dormant Shadow rows", async () => {
		const { t } = await lifecycleDb();
		let tableIndex = 0;
		for (
			let batch = 0;
			batch < 100 && tableIndex < resetDemoTableNames.length;
			batch += 1
		) {
			const result = await t.mutation(
				internal.demoReset.clearSharedDataBatch,
				{ tableIndex },
			);
			tableIndex = result.nextTableIndex;
			if (!result.hasMore) break;
		}
		expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
		expect(await rows(t, "structuralShadowReferences")).toEqual([]);
		expect(await rows(t, "shadows")).toEqual([]);
	});
});

test("Reading deletion removes outgoing edges and preserves incoming edges until the target Lemma dies", async () => {
	const t = createTestConvex();
	const { doomedLemmaId, doomedReadingId, incomingEdgeId } = await t.run(
		async (ctx) => {
			const insertOwner = async (
				key: string,
				canonicalForm: string,
				emojiDescription: string,
			) => {
				const lemmaId = await ctx.db.insert("lemmas", {
					lemmaKey: key,
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm,
					foldedCanonicalForm: foldedCanonicalForm({
						language: "de",
						canonicalForm,
					}),
					coreFeatures: {},
				});
				await ctx.db.insert("dictionaryLemmas", { lemmaId });
				const readingId = await ctx.db.insert("readings", {
					readingKey: `reading-${key}`,
					lemmaId,
					emojiDescription,
				});
				await ctx.db.insert("readingEntries", {
					readingId,
					record: {},
				});
				return { lemmaId, readingId };
			};
			const doomed = await insertOwner("doomed", "Ziel", "🎯");
			const survivor = await insertOwner("survivor", "Quelle", "➡️");
			await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: doomed.readingId,
				relation: "hypernym",
				targetLemmaId: survivor.lemmaId,
			});
			const incoming = await ctx.db.insert("semanticRelationEdges", {
				sourceReadingId: survivor.readingId,
				relation: "holonym",
				targetLemmaId: doomed.lemmaId,
			});
			return {
				doomedLemmaId: doomed.lemmaId,
				doomedReadingId: doomed.readingId,
				incomingEdgeId: incoming,
			};
		},
	);

	for (let attempt = 0; attempt < 3; attempt += 1) {
		await t.mutation(internal.analysisStripping.clearReadingDataBatch, {
			readingKeys: ["reading-doomed"],
		});
	}
	expect(
		(await rows(t, "semanticRelationEdges")).map(({ _id }) => _id),
	).toEqual([incomingEdgeId]);
	expect((await rows(t, "readings")).map(({ _id }) => _id)).not.toContain(
		doomedReadingId,
	);

	await t.mutation(internal.analysisStripping.clearLemmaDataBatch, {
		lemmaIds: [doomedLemmaId],
	});
	expect(await rows(t, "semanticRelationEdges")).toEqual([]);
	await t.mutation(internal.analysisStripping.clearLemmaDataBatch, {
		lemmaIds: [doomedLemmaId],
	});
	expect((await rows(t, "lemmas")).map(({ _id }) => _id)).not.toContain(
		doomedLemmaId,
	);
});
