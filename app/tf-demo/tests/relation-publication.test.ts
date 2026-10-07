import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import esbuild from "esbuild";
import { api, internal } from "../convex/_generated/api";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import {
	effectiveRelationPublicationPolicy,
	GENERATED_SEMANTIC_RELATION_POLICY,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
	type ReviewedRelationVerdictArtifact,
} from "../convex/model/generatedKnowledgeContainment";
import {
	type RelationPublicationAuthorization,
	type RelationPublicationRun,
	recordCommittedRelationRun,
	relationPublicationRunAllowed,
} from "../convex/relationPublication";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("the isolate publication policy does not bundle Dumling's schema graph", async () => {
	const entryPoint = new URL(
		"../convex/model/generatedKnowledgeContainment.ts",
		import.meta.url,
	).pathname;
	const bundle = await esbuild.build({
		entryPoints: [entryPoint],
		bundle: true,
		platform: "browser",
		format: "esm",
		conditions: ["convex", "module"],
		write: false,
		metafile: true,
		logLevel: "silent",
	});
	const bundledInputs = Object.keys(bundle.metafile.inputs);
	expect(
		bundledInputs.some(
			(path) =>
				path.includes("dumling-old/dist/schema.js") ||
				path.includes("node_modules/zod/"),
		),
	).toBe(false);
	expect(bundle.outputFiles[0]?.contents.byteLength).toBeLessThan(100_000);
});

const reviewedArtifact: ReviewedRelationVerdictArtifact = {
	artifactPath:
		"battery/dumgen/docs/prototypes/german-relation-human-gate/verdict.json",
	status: "reviewed",
	reviewedBy: "semantic-reviewer",
	reviewedAt: "2026-08-20T12:00:00.000Z",
	fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	verdicts: [
		{ relation: "synonym", verdict: "promote" },
		{ relation: "nearSynonym", verdict: "revise" },
		{ relation: "antonym", verdict: "doNotGenerate" },
	],
};

const sourceReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem" },
	},
	emojiDescription: "🏦",
} as const;

test("only an explicitly signed, fingerprint-matched promote verdict enters the allowlist", () => {
	expect(GENERATED_SEMANTIC_RELATION_POLICY).toMatchObject({
		productionRequest: "reviewedAllowlist",
		productionPublication: "reviewedAllowlist",
	});
	expect(effectiveRelationPublicationPolicy()).toMatchObject({
		qualifiedKinds: [],
		invalidationReasons: ["missingReviewedVerdictArtifact"],
	});
	expect(effectiveRelationPublicationPolicy(reviewedArtifact)).toMatchObject({
		artifactPath: reviewedArtifact.artifactPath,
		qualifiedKinds: ["synonym"],
		invalidationReasons: [],
	});
	expect(
		effectiveRelationPublicationPolicy({
			...reviewedArtifact,
			fingerprints: {
				...RELATION_PUBLICATION_FINGERPRINTS,
				model: "openai:changed-model",
			},
		}),
	).toMatchObject({
		qualifiedKinds: [],
		invalidationReasons: ["candidateFingerprintMismatch"],
	});
	expect(
		effectiveRelationPublicationPolicy({
			...reviewedArtifact,
			status: "awaitingHumanReview",
			reviewedBy: null,
			reviewedAt: null,
		}),
	).toMatchObject({
		qualifiedKinds: [],
		invalidationReasons: ["humanReviewIncomplete", "missingHumanSignature"],
	});
});

test("request and publication use the same qualified-kind allowlist", () => {
	const request = generationRequestFor(sourceReading, ["synonym"]);
	expect(
		"semanticRelations" in request ? request.semanticRelations : undefined,
	).toEqual({ synonym: null });
	const generated = generatedKnowledgeAllowedForPublication(
		{
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "antonym",
					value: [],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
				{
					relation: "antonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Nichtbank",
					},
				},
			],
		},
		["synonym"],
	);
	expect(generated.changes).toEqual([
		expect.objectContaining({ aspect: "definition" }),
	]);
	expect(generated.pendingRelations).toEqual([
		expect.objectContaining({ relation: "synonym" }),
	]);
});

test("rollback denies a previously authorized relation run without changing its evidence", () => {
	const run: RelationPublicationRun = {
		runNumber: 3,
		requestedKinds: ["synonym"],
		artifactPath: reviewedArtifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [],
	};
	const authorization: RelationPublicationAuthorization = {
		artifactPath: reviewedArtifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		qualifiedKinds: ["synonym"],
		invalidationReasons: [],
		rollbackStopped: false,
		rollbackReason: "",
	};
	expect(relationPublicationRunAllowed(authorization, run)).toBeTrue();
	expect(
		relationPublicationRunAllowed(
			{
				...authorization,
				rollbackStopped: true,
				rollbackReason: "semantic regression under review",
			},
			run,
		),
	).toBeFalse();
	expect(
		relationPublicationRunAllowed(
			{
				...authorization,
				invalidationReasons: ["candidateFingerprintMismatch"],
			},
			run,
		),
	).toBeFalse();
});

test("rollback persistence and proposal monitoring are queryable through internal Convex seams", async () => {
	const t = createTestConvex();
	const attempt = await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma-key",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			foldedCanonicalForm: "bank",
			coreFeatures: {},
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey: "reading-key",
			lemmaId,
			emojiDescription: "🏦",
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: "surface-key",
			lemmaId,
			language: "de",
			normalizedSurface: "Bank",
			spelling: { kind: "Canonical" },
			surfaceFeatures: {},
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
		});
		const row = {
			attemptKey: "attempt-1",
			readingId,
			ownerReadingKey: "reading-key",
			attestationId,
		};
		await ctx.db.insert("knowledgeGenerationAttempts", {
			...row,
			visitorId: "visitor-1",
			state: "Running",
			createdAt: 1,
			updatedAt: 1,
		});
		await ctx.db.insert("pendingSemanticRelations", {
			locatorKey: JSON.stringify([
				"reading-key",
				"synonym",
				"pending-entry:v2:de:Lexeme:NOUN:geldinstitut",
			]),
			sourceReadingKey: "reading-key",
			targetFoldedCanonicalForm: "geldinstitut",
			record: {},
		});
		return row;
	});
	expect(
		await t.query(internal.relationPublication.getAuthorization, {}),
	).toMatchObject({
		rollbackStopped: false,
		qualifiedKinds: [],
	});
	await t.mutation(internal.relationPublication.setRollback, {
		stopped: true,
		reason: "sampled semantic regression",
	});
	expect(
		await t.query(internal.relationPublication.getAuthorization, {}),
	).toMatchObject({
		rollbackStopped: true,
		rollbackReason: "sampled semantic regression",
		qualifiedKinds: [],
	});

	const targetShadow = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Geldinstitut",
	} as const;
	await t.run((ctx) =>
		recordCommittedRelationRun(
			ctx,
			attempt,
			{
				runNumber: 1,
				requestedKinds: ["synonym"],
				artifactPath: reviewedArtifact.artifactPath,
				fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
				proposals: [{ relation: "synonym", targetShadow }],
			},
			false,
		),
	);
	const provenance = await t.query(
		internal.relationPublication.listAttemptProvenance,
		{ attemptKey: "attempt-1", runNumber: 1 },
	);
	expect(provenance).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			runNumber: 1,
			relation: "synonym",
			sourceReadingId: attempt.readingId,
			sourceReadingKey: "reading-key",
			contextAttestationId: attempt.attestationId,
			targetShadow,
			verdictArtifactPath: reviewedArtifact.artifactPath,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			outcome: "PendingShadow",
		}),
	]);
	const monitor = (
		relation: "synonym" | "antonym" | "nearSynonym" | "hypernym",
	) =>
		t.query(internal.relationPublication.monitorKind, {
			relation,
			from: 0,
			to: Date.now() + 1_000,
		});
	expect(await monitor("synonym")).toMatchObject({
		generatedTargets: 1,
		nulls: 0,
		pendingShadows: 1,
		directMatches: 0,
		rejectedOutputs: 0,
		publicationFailures: 0,
		rows: 1,
		truncated: false,
	});
	await t.run((ctx) =>
		recordCommittedRelationRun(
			ctx,
			attempt,
			{
				runNumber: 2,
				requestedKinds: ["antonym", "nearSynonym"],
				artifactPath: reviewedArtifact.artifactPath,
				fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
				proposals: [
					{
						relation: "nearSynonym",
						targetShadow: {
							...targetShadow,
							canonicalForm: "Kreditinstitut",
						},
					},
				],
			},
			false,
		),
	);
	expect(await monitor("antonym")).toMatchObject({
		generatedTargets: 0,
		nulls: 1,
	});
	expect(await monitor("nearSynonym")).toMatchObject({
		generatedTargets: 1,
		directMatches: 1,
	});
	await t.mutation(internal.relationPublication.recordRejectedOutput, {
		attemptKey: "attempt-1",
		runNumber: 3,
		requestedKinds: ["hypernym"],
		artifactPath: reviewedArtifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	});
	expect(await monitor("hypernym")).toMatchObject({
		rejectedOutputs: 1,
		nulls: 0,
	});
});

test("commit-time rollback keeps base Knowledge changes and drops relation changes", () => {
	const baseChange = {
		kind: "applyKnowledgeChange",
		envelope: {
			reading: sourceReading,
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		},
	};
	const relationChange = {
		kind: "applyKnowledgeChange",
		envelope: {
			reading: sourceReading,
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [],
			},
		},
	};
	expect(
		generatedKnowledgeAllowedForPublication(
			{
				changes: [
					baseChange.envelope.change,
					relationChange.envelope.change,
				],
				pendingRelations: [],
			},
			[],
		).changes,
	).toEqual([baseChange.envelope.change]);
});

test("an action's draft context is the Visitor's settings and the publication authorization in one read", async () => {
	const t = createTestConvex();
	const settings = defaultKnowledgeSettings();
	const russianOff = {
		...settings,
		translations: { ...settings.translations, ru: false },
	};
	await t.mutation(api.knowledgeSettings.update, {
		visitorId: "visitor-1",
		settings: russianOff,
	});
	await t.mutation(internal.relationPublication.setRollback, {
		stopped: true,
		reason: "sampled semantic regression",
	});

	expect(
		await t.query(internal.knowledgeSettings.getDraftContext, {
			visitorId: "visitor-1",
		}),
	).toEqual({
		settings: russianOff,
		authorization: await t.query(
			internal.relationPublication.getAuthorization,
			{},
		),
	});
	expect(
		await t.query(internal.knowledgeSettings.getDraftContext, {
			visitorId: "visitor-2",
		}),
	).toMatchObject({ settings, authorization: { rollbackStopped: true } });
});
