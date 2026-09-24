import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import esbuild from "esbuild";
import { internal } from "../convex/_generated/api";
import { COMPILED_RELATION_VERDICT } from "../convex/model/compiledRelationVerdict";
import {
	effectiveRelationPublicationPolicy,
	GENERATED_SEMANTIC_RELATION_POLICY,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
	type ReviewedRelationVerdictArtifact,
} from "../convex/model/generatedKnowledgeContainment";
import {
	type RelationPublicationAuthorization,
	recordCommittedRelationRun,
	relationPublicationRunAllowed,
} from "../convex/relationPublication";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	compileReviewedVerdict,
	currentRelationFingerprints,
} from "../tooling/compile-relation-verdict";
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
		coreFeatures: { gender: "Fem", hyph: null },
	},
	emojiDescription: "🏦",
} as const;

function jsonBytes(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

test("the compiler accepts only complete, execution-aware per-kind acceptance evidence", () => {
	const candidateId = "candidate-1";
	const selectionCommitmentSha256 = "selection-1";
	const byRelation = Object.fromEntries(
		[
			"synonym",
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"holonym",
		].map((relation) => [relation, { gate: { pass: true } }]),
	);
	const acceptance = {
		formatVersion: "german-relation-acceptance-result-v1",
		state: "complete",
		candidateId,
		selectionCommitmentSha256,
		report: {
			semanticReport: { byRelation },
			byRelationPass: Object.fromEntries(
				Object.keys(byRelation).map((relation) => [relation, true]),
			),
		},
	};
	const verdict = {
		formatVersion: "german-relation-human-verdict-v1",
		candidateId,
		recordedAt: "2026-08-20T12:00:00.000Z",
		reviewer: "semantic-reviewer",
		acceptanceEvidence: {
			status: "retained-untouched",
			artifactSha256: "bound-by-compile-helper",
			reservationCommitmentSha256: selectionCommitmentSha256,
		},
		byRelation: Object.fromEntries(
			Object.keys(byRelation).map((relation) => [
				relation,
				{ decision: relation === "synonym" ? "promote" : "revise" },
			]),
		),
	};
	const compile = (
		rawAcceptance: unknown = acceptance,
		verdictOverrides: Record<string, unknown> = {},
	) => {
		const acceptanceBytes = jsonBytes(rawAcceptance);
		const artifactSha256 = new Bun.CryptoHasher("sha256")
			.update(acceptanceBytes)
			.digest("hex");
		return compileReviewedVerdict({
			candidateId,
			verdictFormatVersion: "german-relation-human-verdict-v1",
			requiredAcceptanceStatus: "retained-untouched",
			selectionCommitmentSha256,
			verdictArtifactPath: "gate/verdict.json",
			verdictBytes: jsonBytes({
				...verdict,
				...verdictOverrides,
				acceptanceEvidence: {
					...verdict.acceptanceEvidence,
					artifactSha256,
				},
			}),
			acceptanceBytes,
		});
	};
	const compiled = compile();
	expect(compiled).toMatchObject({
		candidateId,
		reviewedBy: "semantic-reviewer",
	});
	expect(compiled.verdicts as unknown[]).toContainEqual({
		relation: "synonym",
		verdict: "promote",
	});
	expect(compiled.verdicts as unknown[]).toContainEqual({
		relation: "nearSynonym",
		verdict: "revise",
	});
	expect(() => compile({ ...acceptance, state: "revealed-running" })).toThrow(
		"Acceptance result candidate binding is invalid",
	);
	expect(() =>
		compile({
			...acceptance,
			report: {
				...acceptance.report,
				byRelationPass: {
					...acceptance.report.byRelationPass,
					synonym: false,
				},
			},
		}),
	).toThrow("synonym cannot be promoted");
	expect(() =>
		compile(acceptance, { candidateId: "different-candidate" }),
	).toThrow("Verdict candidate binding is invalid");
});

test("historical fingerprints remain bound to the relocated frozen sources", async () => {
	const historicalFingerprints =
		COMPILED_RELATION_VERDICT.historicalCandidate.fingerprints;
	const sha256 = async (path: string) =>
		new Bun.CryptoHasher("sha256")
			.update(
				await Bun.file(new URL(path, import.meta.url)).arrayBuffer(),
			)
			.digest("hex");
	expect(historicalFingerprints.prompt).toBe(
		`sha256:${await sha256("../../../battery/dumgen/docs/prototypes/german-relation-human-gate/frozen-source/promptsmith/production/knowledge-analysis/de/lexeme/prompt-source.ts.txt")}`,
	);
	expect(historicalFingerprints.schema).toBe(
		`sha256:${await sha256("../../../battery/dumgen/docs/prototypes/german-relation-human-gate/frozen-source/knowledge-generation/de/schemas.ts.txt")}`,
	);
	expect(historicalFingerprints.evaluator).toBe(
		`sha256:${await sha256("../../../battery/dumgen/docs/prototypes/german-relation-human-gate/frozen-source/promptsmith/laboratory/experiments/knowledge-analysis/de/evaluator.ts.txt")}`,
	);
	const modelPolicy = await Bun.file(
		new URL(
			"../../../battery/dumgen/docs/prototypes/german-relation-human-gate/frozen-source/ai-sdk/model-policy.ts.txt",
			import.meta.url,
		),
	).text();
	expect(modelPolicy).toContain('DUMGEN_GENERATION_MODEL = "gpt-5.6-luna"');
	expect(historicalFingerprints.model).toContain(
		"openai:gpt-5.6-luna:sha256:",
	);
	expect(historicalFingerprints.policy).toMatch(
		/^candidate:[a-f0-9]{64}:sha256:[a-f0-9]{64}$/,
	);
});

test("the current model cannot be qualified by a signed historical candidate", async () => {
	expect(RELATION_PUBLICATION_FINGERPRINTS).toEqual(
		await currentRelationFingerprints(),
	);
	expect(COMPILED_RELATION_VERDICT.verdict).toBeNull();
	expect(
		effectiveRelationPublicationPolicy({
			...reviewedArtifact,
			fingerprints:
				COMPILED_RELATION_VERDICT.historicalCandidate.fingerprints,
		}),
	).toMatchObject({
		qualifiedKinds: [],
		invalidationReasons: ["candidateFingerprintMismatch"],
	});
});

test("only an explicitly signed, fingerprint-matched promote verdict enters the allowlist", () => {
	expect(GENERATED_SEMANTIC_RELATION_POLICY).toMatchObject({
		productionRequest: "reviewedAllowlist",
		productionPublication: "reviewedAllowlist",
	});
	expect(effectiveRelationPublicationPolicy()).toMatchObject({
		qualifiedKinds: [],
		invalidationReasons: [
			"archivedRunEvidence",
			"missingReviewedVerdictArtifact",
			"historicalCandidateRequiresReevaluation",
		],
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
	expect(request.semanticRelations).toEqual({ synonym: null });
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
	const run = {
		runNumber: 3,
		requestedKinds: ["synonym"],
		artifactPath: reviewedArtifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [],
	} as const;
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
			spelling: "Canonical",
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
				"pending-entry:v2:de:Lexeme:NOUN:Geldinstitut",
			]),
			sourceReadingKey: "reading-key",
			targetCanonicalForm: "Geldinstitut",
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
