import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import {
	type DefaultFunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import { STRIP_SEGMENT_BATCH } from "../convex/analysisStripping";
import { resetDemoTableNames } from "../convex/demoReset";
import { inspectionPayloadChunks } from "../convex/model/inspection";
import {
	LEMMA_CLEANUP_EXEMPTIONS,
	LEMMA_CLEANUP_PHASES,
	READING_CLEANUP_EXEMPTIONS,
	READING_CLEANUP_PHASES,
	VISITOR_CLEANUP_EXEMPTIONS,
	VISITOR_CLEANUP_PHASES,
} from "../convex/model/ownedRowCleanup";
import { stripScrollAnalysisGraph } from "../convex/model/scrollAnalysisStripping";
import tfDemoSchema from "../convex/schema";
import { actionContext, createTestConvex, submitText } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import {
	existingIds,
	fingerprints,
	insertReading,
	lemmaOwnershipFields,
	ownedTables,
	ownedThroughAttempt,
	ownedThroughSurface,
	readingOwnedRows,
	readingOwnershipFields,
	sweptTables,
	tableRows,
	visitorOwnedRows,
} from "./support/post-reset";

enableDeploymentFlags();

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

describe("tf-demo post-reset contract", () => {
	test("Strip analyses covers every Scroll and clears Resolution Inspector data", async () => {
		const t = createTestConvex();
		await submitText(t, [["Eins", "."]]);
		await submitText(t, [["Zwei", "."]]);
		await t.run(async (ctx) => {
			await ctx.db.insert("inspectionClicks", {
				requestId: "request-1",
				visitorId: "visitor-1",
				selectedSegment: "Eins",
				sentence: "Eins.",
				startedAt: 1,
				selectionKind: "Resolving",
			});
			const stepId = await ctx.db.insert("inspectionSteps", {
				requestId: "request-1",
				id: "step-1",
				name: "Resolution session",
				kind: "Code",
				owner: "app/tf-demo",
				startedAt: 1,
				durationMs: 1,
				status: "Success",
			});
			await ctx.db.insert("inspectionPayloads", {
				stepId,
				part: 0,
				text: "{}",
			});
		});

		const result = await t.action(api.demoReset.stripAnalyses, {});

		expect(result).toEqual({
			strippedScrolls: 2,
			removed: 4,
			deletedReadings: 0,
			deletedLemmas: 0,
			removedInspectionRecords: 3,
		});
		expect(await tableRows(t, "scrolls")).toHaveLength(2);
		expect(await tableRows(t, "sentences")).toHaveLength(2);
		expect(await tableRows(t, "segments")).toEqual([]);
		expect(await tableRows(t, "inspectionPayloads")).toEqual([]);
		expect(await tableRows(t, "inspectionSteps")).toEqual([]);
		expect(await tableRows(t, "inspectionClicks")).toEqual([]);
	});

	test("stripping a long Scroll removes its Segments in batches of about Segments / batch size", async () => {
		const t = createTestConvex({ transactionLimits: true });
		const reading = await insertReading(t, "reading-key-1");
		// Five Sentences of 256 Segments: 128 attested words, their spaces, and a stop.
		const sentences = Array.from({ length: 5 }, () => [
			...Array.from({ length: 128 }, (_, index) => [
				...(index === 0 ? [] : [" "]),
				"Bank",
			]).flat(),
			".",
		]);
		const { scrollId, segmentIds } = await submitText(t, sentences);
		const segmentCount = segmentIds.flat().length;
		expect(segmentCount).toBe(1_280);
		await t.run(async (ctx) => {
			const surfaceId = (await ctx.db.get(reading.attestationId))
				?.surfaceId;
			if (!surfaceId) throw new Error("Expected a stored Surface.");
			for (const segmentId of segmentIds.flat()) {
				const segment = await ctx.db.get(segmentId);
				const sentence =
					segment && (await ctx.db.get(segment.sentenceId));
				if (!sentence || segment.kind !== "ResolvableText") continue;
				const attestationId = await ctx.db.insert("attestations", {
					surfaceId,
					readingId: reading.readingId,
					realizationCoverage: "Full",
				});
				await ctx.db.patch(segmentId, {
					attestationMembership: {
						attestationId,
						orthography: "Standard",
					},
				});
				await ctx.db.insert("visitorEncounters", {
					requestId: `request:${segmentId}`,
					visitorId: "visitor-1",
					scrollId,
					sentenceId: sentence._id,
					segmentId,
					attestationId,
					readingId: reading.readingId,
					encounteredAt: 1,
				});
			}
		});

		let batches = 0;
		const context = actionContext(t);
		const result = await stripScrollAnalysisGraph(
			{
				...context,
				runMutation: (
					reference: FunctionReference<"mutation", "internal">,
					args: DefaultFunctionArgs,
				) => {
					if (
						getFunctionName(reference) ===
						getFunctionName(
							internal.analysisStripping
								.stripScrollAnalysisGraphBatch,
						)
					) {
						batches += 1;
					}
					return context.runMutation(reference, args);
				},
			} as unknown as ActionCtx,
			scrollId,
		);

		// 1,280 Segments, 640 Encounters, and 640 Attestations.
		expect(result.removed).toBe(2_560);
		// One more step finds nothing left.
		expect(batches).toBe(Math.ceil(segmentCount / STRIP_SEGMENT_BATCH) + 1);
		expect(await tableRows(t, "segments")).toEqual([]);
		expect(await tableRows(t, "visitorEncounters")).toEqual([]);
		expect(
			(await tableRows(t, "attestations")).map(({ _id }) => _id),
		).toEqual([reading.attestationId]);
		expect(await tableRows(t, "sentences")).toHaveLength(5);
	});

	test("a full reset clears more than a batch of maximum-size inspection payloads inside the transaction limits", async () => {
		for (const reset of [
			internal.demoReset.resetDemoData,
			api.demoReset.clearSharedData,
		]) {
			const t = createTestConvex({ transactionLimits: true });
			// A maximum chunk of 3-byte characters is about 94 KiB of UTF-8.
			const [chunk] = inspectionPayloadChunks("€".repeat(32_000));
			if (!chunk) throw new Error("Expected a payload chunk.");
			const stepId = await t.run((ctx) =>
				ctx.db.insert("inspectionSteps", {
					requestId: "request-1",
					id: "step-1",
					name: "Resolution session",
					kind: "Code",
					owner: "app/tf-demo",
					startedAt: 1,
					durationMs: 1,
					status: "Success",
				}),
			);
			for (let part = 0; part < 420; part += 100) {
				await t.run(async (ctx) => {
					for (let index = part; index < part + 100; index += 1) {
						await ctx.db.insert("inspectionPayloads", {
							stepId,
							part: index,
							text: chunk,
						});
					}
				});
			}

			expect(await t.action(reset, {})).toEqual({ deleted: 501 });
			expect(await tableRows(t, "inspectionPayloads")).toEqual([]);
		}
	});

	test("the bounded reset inventory stays complete as the schema changes", async () => {
		const schemaTableNames = Object.keys(tfDemoSchema.tables).sort();
		const resetTableNames: readonly string[] = resetDemoTableNames;
		expect([...resetTableNames].sort()).toEqual(schemaTableNames);

		const t = createTestConvex();
		const { sentenceIds } = await submitText(t, [["Banken"]]);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a stored Sentence.");
		await t.mutation(api.resolutionSessions.selectSegment, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: 0,
		});
		await insertReading(t, "reading-key-1");

		expect(await t.action(internal.demoReset.resetDemoData, {})).toEqual({
			deleted: expect.any(Number),
		});
		for (const tableName of resetDemoTableNames) {
			expect(await tableRows(t, tableName), tableName).toEqual([]);
		}
	});

	test("pruning a Reading deletes a row from every Reading-owned table, and nothing of another Reading", async () => {
		const t = createTestConvex();
		const pruned = await insertReading(t, "reading-key-1");
		const kept = await insertReading(t, "reading-key-2");
		const bystander = await insertReading(t, "reading-key-3");
		const owned = ownedTables(
			readingOwnershipFields,
			READING_CLEANUP_EXEMPTIONS,
			ownedThroughAttempt,
		);
		expect(sweptTables(READING_CLEANUP_PHASES)).toEqual(owned);
		expect(Object.keys(readingOwnedRows).sort()).toEqual(owned);
		const seeded = await t.run(async (ctx) => {
			const rows = { pruned: [] as string[], kept: [] as string[] };
			for (const build of Object.values(readingOwnedRows)) {
				rows.pruned.push(...(await build(ctx, pruned, bystander)));
				rows.kept.push(...(await build(ctx, kept, bystander)));
			}
			return rows;
		});

		let cursor: { itemIndex: number; phase: string } | null | undefined;
		for (let batch = 0; batch < 8; batch += 1) {
			const result = await t.mutation(
				internal.analysisStripping.clearReadingDataBatch,
				{
					readingKeys: ["reading-key-1"],
					...(cursor ? { cursor: cursor as never } : {}),
				},
			);
			cursor = result.nextCursor;
			if (!cursor) break;
		}

		expect(cursor).toBeNull();
		const remaining = await existingIds(t, [
			...seeded.pruned,
			...seeded.kept,
		]);
		expect(seeded.pruned.filter((id) => remaining.has(id))).toEqual([]);
		expect(seeded.kept.filter((id) => !remaining.has(id))).toEqual([]);
	});

	test("the Lemma cleanup phases delete from every Lemma-owned table", () => {
		expect(sweptTables(LEMMA_CLEANUP_PHASES)).toEqual(
			ownedTables(
				lemmaOwnershipFields,
				LEMMA_CLEANUP_EXEMPTIONS,
				ownedThroughSurface,
			),
		);
	});

	test("a Lemma the delete budget cannot finish waits for the next batch instead of being skipped", async () => {
		const t = createTestConvex();
		const source = await insertReading(t, "reading-key-1");
		const lemmaId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("lemmas", {
				lemmaKey: "lemma:orphan",
				language: "de",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "orphan",
				foldedCanonicalForm: "orphan",
				coreFeatures: {},
			});
			await ctx.db.insert("dictionaryLemmas", { lemmaId: id });
			// One short of the batch's delete budget, so the Lemma and its
			// dictionary entry no longer fit after the edges.
			for (let edge = 0; edge < 398; edge += 1) {
				await ctx.db.insert("semanticRelationEdges", {
					sourceReadingId: source.readingId,
					targetKind: "lemma",
					targetLemmaId: id,
					relation: "synonym",
				});
			}
			return id;
		});

		const first = await t.mutation(
			internal.analysisStripping.clearLemmaDataBatch,
			{
				lemmaIds: [lemmaId],
			},
		);
		expect(first).toMatchObject({
			deleted: 398,
			deletedLemmas: 0,
			nextCursor: { itemIndex: 0, phase: "Lemma" },
		});
		const second = await t.mutation(
			internal.analysisStripping.clearLemmaDataBatch,
			{
				lemmaIds: [lemmaId],
				...(first.nextCursor ? { cursor: first.nextCursor } : {}),
			},
		);
		expect(second).toMatchObject({
			deleted: 2,
			deletedLemmas: 1,
			nextCursor: null,
		});
		expect(await t.run((ctx) => ctx.db.get(lemmaId))).toBeNull();
	});

	test("clearing a Visitor deletes a row from every Visitor-owned table, and nothing of another Visitor", async () => {
		const t = createTestConvex();
		const reading = await insertReading(t, "reading-key-1");
		const { sentenceIds } = await submitText(t, [["Banken"]]);
		const sentenceId = sentenceIds[0];
		if (!sentenceId) throw new Error("Expected a stored Sentence.");
		const owned = ownedTables(
			["visitorId"],
			VISITOR_CLEANUP_EXEMPTIONS,
			ownedThroughAttempt,
		);
		expect(sweptTables(VISITOR_CLEANUP_PHASES)).toEqual(owned);
		expect(Object.keys(visitorOwnedRows).sort()).toEqual(owned);
		const seeded = { cleared: [] as string[], kept: [] as string[] };
		for (const build of Object.values(visitorOwnedRows)) {
			seeded.cleared.push(
				...(await build(t, "visitor-1", reading, sentenceId)),
			);
			seeded.kept.push(
				...(await build(t, "visitor-2", reading, sentenceId)),
			);
		}

		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});

		const remaining = await existingIds(t, [
			...seeded.cleared,
			...seeded.kept,
		]);
		expect(seeded.cleared.filter((id) => remaining.has(id))).toEqual([]);
		expect(seeded.kept.filter((id) => !remaining.has(id))).toEqual([]);
	});

	test("clearing a Visitor promotes another Visitor's attempt waiting behind a removed one", async () => {
		const t = createTestConvex();
		const reading = await insertReading(t, "reading-key-1");
		await t.run(async (ctx) => {
			for (const [visitorId, state] of [
				["visitor-1", "Running"],
				["visitor-2", "Waiting"],
			] as const) {
				await ctx.db.insert("knowledgeGenerationAttempts", {
					attemptKey: `attempt-${visitorId}`,
					visitorId,
					ownerReadingKey: "reading-key-1",
					readingId: reading.readingId,
					attestationId: reading.attestationId,
					state,
					createdAt: 1,
					updatedAt: 1,
				});
			}
		});

		await t.action(api.demoReset.clearVisitorData, {
			visitorId: "visitor-1",
		});

		expect(await tableRows(t, "knowledgeGenerationAttempts")).toEqual([
			expect.objectContaining({
				attemptKey: "attempt-visitor-2",
				state: "Scheduled",
			}),
		]);
		const scheduled = await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		);
		expect(scheduled.map(({ name, args }) => ({ name, args }))).toEqual([
			{
				name: "knowledgeGenerationActions:runKnowledgeGeneration",
				args: [{ attemptKey: "attempt-visitor-2" }],
			},
			{
				name: "knowledgeGeneration:recoverStaleRun",
				args: [{ attemptKey: "attempt-visitor-2", runNumber: 1 }],
			},
		]);
	});

	test("pruning a Reading clears the rows that would haunt its next incarnation", async () => {
		const t = createTestConvex();
		const pruned = await insertReading(t, "reading-key-1");
		const kept = await insertReading(t, "reading-key-2");
		await t.run(async (ctx) => {
			const attempt = (
				owner: typeof pruned,
				ownerReadingKey: string,
				state: "Running" | "Waiting",
				attemptKey: string,
			) =>
				ctx.db.insert("knowledgeGenerationAttempts", {
					attemptKey,
					visitorId: "visitor-1",
					ownerReadingKey,
					readingId: owner.readingId,
					attestationId: owner.attestationId,
					state,
					createdAt: 1,
					updatedAt: 1,
				});
			await attempt(
				pruned,
				"reading-key-1",
				"Running",
				"attempt-running",
			);
			await attempt(
				pruned,
				"reading-key-1",
				"Waiting",
				"attempt-waiting",
			);
			await attempt(kept, "reading-key-2", "Running", "attempt-other");
			await ctx.db.insert("generatedRelationRuns", {
				runKey: "run-1",
				attemptKey: "attempt-running",
				runNumber: 1,
				relation: "synonym",
				sourceReadingId: pruned.readingId,
				sourceReadingKey: "reading-key-1",
				contextAttestationId: pruned.attestationId,
				verdictArtifactPath: null,
				fingerprints,
				generatedTargets: 0,
				nulls: 0,
				pendingShadows: 0,
				directMatches: 0,
				rejectedOutputs: 0,
				publicationFailures: 0,
				createdAt: 1,
				updatedAt: 1,
			});
			await ctx.db.insert("generatedRelationProposals", {
				proposalKey: "proposal-1",
				attemptKey: "attempt-running",
				runNumber: 1,
				relation: "synonym",
				sourceReadingId: pruned.readingId,
				sourceReadingKey: "reading-key-1",
				contextAttestationId: pruned.attestationId,
				targetShadow: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
				verdictArtifactPath: "artifact",
				fingerprints,
				outcome: "PendingShadow",
				reviewStatus: "NotSampled",
				createdAt: 1,
				updatedAt: 1,
			});
			for (const owner of [pruned, kept]) {
				await ctx.db.insert("personalAnnotations", {
					visitorId: "visitor-1",
					readingId: owner.readingId,
					text: "note",
					updatedAt: 1,
				});
			}
		});

		let cursor: { itemIndex: number; phase: string } | null | undefined;
		for (let batch = 0; batch < 4; batch += 1) {
			const result = await t.mutation(
				internal.analysisStripping.clearReadingDataBatch,
				{
					readingKeys: ["reading-key-1"],
					...(cursor ? { cursor: cursor as never } : {}),
				},
			);
			cursor = result.nextCursor;
			if (!cursor) break;
		}

		expect(cursor).toBeNull();
		expect((await tableRows(t, "readings")).map(({ _id }) => _id)).toEqual([
			kept.readingId,
		]);
		expect(
			(await tableRows(t, "knowledgeGenerationAttempts")).map(
				({ attemptKey }) => attemptKey,
			),
		).toEqual(["attempt-other"]);
		expect(await tableRows(t, "generatedRelationRuns")).toEqual([]);
		expect(await tableRows(t, "generatedRelationProposals")).toEqual([]);
		expect(
			(await tableRows(t, "personalAnnotations")).map(
				({ readingId }) => readingId,
			),
		).toEqual([kept.readingId]);
	});
});
