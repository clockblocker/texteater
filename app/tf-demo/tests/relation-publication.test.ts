import { expect, test } from "bun:test";
import esbuild from "esbuild";

import {
	effectiveRelationPublicationPolicy,
	GENERATED_SEMANTIC_RELATION_POLICY,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
	type ReviewedRelationVerdictArtifact,
} from "../convex/model/generatedKnowledgeContainment";
import { withoutGeneratedRelationPlan } from "../convex/orchestration";
import {
	getAuthorization,
	listAttemptProvenance,
	monitorKind,
	type RelationPublicationAuthorization,
	recordCommittedRelationRun,
	recordRejectedOutput,
	relationPublicationRunAllowed,
	setRollback,
} from "../convex/relationPublication";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { compileReviewedVerdict } from "../tooling/compile-relation-verdict";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

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
				path.includes("dumling/dist/schema.js") ||
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
	lemma: {
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

test("runtime fingerprints stay bound to the frozen candidate sources", async () => {
	const sha256 = async (path: string) =>
		new Bun.CryptoHasher("sha256")
			.update(
				await Bun.file(new URL(path, import.meta.url)).arrayBuffer(),
			)
			.digest("hex");
	expect(RELATION_PUBLICATION_FINGERPRINTS.prompt).toBe(
		`sha256:${await sha256("../../../battery/dumgen/src/promptsmith/production/knowledge-analysis/de/combined/prompt-source.ts")}`,
	);
	expect(RELATION_PUBLICATION_FINGERPRINTS.schema).toBe(
		`sha256:${await sha256("../../../battery/dumgen/src/knowledge-generation/de/schemas.ts")}`,
	);
	expect(RELATION_PUBLICATION_FINGERPRINTS.evaluator).toBe(
		`sha256:${await sha256("../../../battery/dumgen/src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator.ts")}`,
	);
	const modelPolicy = await Bun.file(
		new URL(
			"../../../battery/dumgen/src/ai-sdk/model-policy.ts",
			import.meta.url,
		),
	).text();
	expect(modelPolicy).toContain('DUMGEN_GENERATION_MODEL = "gpt-5.6-luna"');
	expect(RELATION_PUBLICATION_FINGERPRINTS.model).toContain(
		"openai:gpt-5.6-luna:sha256:",
	);
	expect(RELATION_PUBLICATION_FINGERPRINTS.policy).toMatch(
		/^candidate:[a-f0-9]{64}:sha256:[a-f0-9]{64}$/,
	);
});

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
	const db = new IndexedTestDb({
		knowledgeGenerationAttempts: [
			{
				_id: "attempt-row",
				attemptKey: "attempt-1",
				readingId: "reading-1",
				ownerReadingKey: "reading-key",
				attestationId: "attestation-1",
			},
		],
		pendingSemanticRelations: [
			{
				_id: "pending-1",
				locatorKey: JSON.stringify([
					"reading-key",
					"synonym",
					"pending-entry:v2:de:Lexeme:NOUN:Geldinstitut",
				]),
			},
		],
	});
	expect(await runTestQuery(db, getAuthorization, {})).toMatchObject({
		rollbackStopped: false,
		qualifiedKinds: [],
	});
	await runTestMutation(db, setRollback, {
		stopped: true,
		reason: "sampled semantic regression",
	});
	expect(await runTestQuery(db, getAuthorization, {})).toMatchObject({
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
	await recordCommittedRelationRun(
		{ db } as never,
		{
			attemptKey: "attempt-1",
			readingId: "reading-1" as never,
			ownerReadingKey: "reading-key",
			attestationId: "attestation-1" as never,
		},
		{
			runNumber: 1,
			requestedKinds: ["synonym"],
			artifactPath: reviewedArtifact.artifactPath,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			proposals: [{ relation: "synonym", targetShadow }],
		},
		false,
	);
	const provenance = await runTestQuery(db, listAttemptProvenance, {
		attemptKey: "attempt-1",
		runNumber: 1,
	});
	expect(provenance).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			runNumber: 1,
			relation: "synonym",
			sourceReadingId: "reading-1",
			sourceReadingKey: "reading-key",
			contextAttestationId: "attestation-1",
			targetShadow,
			verdictArtifactPath: reviewedArtifact.artifactPath,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			outcome: "PendingShadow",
		}),
	]);
	expect(
		await runTestQuery(db, monitorKind, {
			relation: "synonym",
			from: 0,
			to: Date.now() + 1_000,
		}),
	).toMatchObject({
		generatedTargets: 1,
		nulls: 0,
		pendingShadows: 1,
		directMatches: 0,
		rejectedOutputs: 0,
		publicationFailures: 0,
		rows: 1,
		truncated: false,
	});
	await recordCommittedRelationRun(
		{ db } as never,
		{
			attemptKey: "attempt-1",
			readingId: "reading-1" as never,
			ownerReadingKey: "reading-key",
			attestationId: "attestation-1" as never,
		},
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
	);
	expect(
		await runTestQuery(db, monitorKind, {
			relation: "antonym",
			from: 0,
			to: Date.now() + 1_000,
		}),
	).toMatchObject({ generatedTargets: 0, nulls: 1 });
	expect(
		await runTestQuery(db, monitorKind, {
			relation: "nearSynonym",
			from: 0,
			to: Date.now() + 1_000,
		}),
	).toMatchObject({ generatedTargets: 1, directMatches: 1 });
	await runTestMutation(db, recordRejectedOutput, {
		attemptKey: "attempt-1",
		runNumber: 3,
		requestedKinds: ["hypernym"],
		artifactPath: reviewedArtifact.artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	});
	expect(
		await runTestQuery(db, monitorKind, {
			relation: "hypernym",
			from: 0,
			to: Date.now() + 1_000,
		}),
	).toMatchObject({ rejectedOutputs: 1, nulls: 0 });
});

test("commit-time rollback fallback removes relation operations but retains base Knowledge", () => {
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
	const filtered = withoutGeneratedRelationPlan({
		baseRevision: "convex-0",
		changes: [
			{
				type: "patchReading",
				reading: sourceReading,
				ops: [baseChange, relationChange],
				preconditions: [],
			},
			{
				type: "createPendingSemanticRelation",
				record: {},
				preconditions: [],
			},
		],
	});
	expect(filtered.changes).toEqual([
		expect.objectContaining({
			type: "patchReading",
			ops: [baseChange],
		}),
	]);
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
