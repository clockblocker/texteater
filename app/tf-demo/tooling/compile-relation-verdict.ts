import { resolve } from "node:path";

const workspace = resolve(import.meta.dir, "../../..");
const gateDirectory = resolve(
	workspace,
	"battery/dumgen-new/docs/prototypes/german-relation-human-gate",
);
const manifestPath = resolve(gateDirectory, "candidate-manifest.json");
const locationsPath = resolve(gateDirectory, "artifact-locations.json");
const verdictPath = resolve(gateDirectory, "verdict.json");
const acceptancePath = resolve(gateDirectory, "acceptance-result.json");
const outputPath = resolve(
	workspace,
	"app/tf-demo/convex/model/compiledRelationVerdict.ts",
);
const relationKinds = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be an object.`);
	}
	return value as JsonRecord;
}

function string(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length === 0)
		throw new Error(`${label} must be a non-empty string.`);
	return value;
}

function sha256(value: string | Uint8Array): string {
	return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

async function readJson(path: string): Promise<unknown> {
	return JSON.parse(await Bun.file(path).text()) as unknown;
}

async function exists(path: string): Promise<boolean> {
	return Bun.file(path).exists();
}

export function compileReviewedVerdict(args: {
	readonly candidateId: string;
	readonly verdictFormatVersion: unknown;
	readonly requiredAcceptanceStatus: unknown;
	readonly selectionCommitmentSha256: unknown;
	readonly verdictArtifactPath: string;
	readonly verdictBytes: Uint8Array;
	readonly acceptanceBytes: Uint8Array;
}): JsonRecord {
	const verdict = record(
		JSON.parse(new TextDecoder().decode(args.verdictBytes)) as unknown,
		"human verdict",
	);
	if (
		verdict.formatVersion !== args.verdictFormatVersion ||
		verdict.candidateId !== args.candidateId
	) {
		throw new Error("Verdict candidate binding is invalid.");
	}
	const reviewer = string(verdict.reviewer, "verdict reviewer").trim();
	const recordedAt = string(verdict.recordedAt, "verdict timestamp");
	if (reviewer.length === 0) throw new Error("Verdict reviewer is blank.");
	const evidence = record(verdict.acceptanceEvidence, "acceptance evidence");
	if (
		evidence.status !== args.requiredAcceptanceStatus ||
		evidence.reservationCommitmentSha256 !== args.selectionCommitmentSha256
	) {
		throw new Error("Verdict acceptance binding is invalid.");
	}
	const acceptanceSha256 = string(
		evidence.artifactSha256,
		"acceptance artifact sha256",
	);
	if (sha256(args.acceptanceBytes) !== acceptanceSha256)
		throw new Error("Acceptance evidence fingerprint is invalid.");
	const acceptance = record(
		JSON.parse(new TextDecoder().decode(args.acceptanceBytes)) as unknown,
		"acceptance result",
	);
	if (
		acceptance.candidateId !== args.candidateId ||
		acceptance.state !== "complete" ||
		acceptance.selectionCommitmentSha256 !== args.selectionCommitmentSha256
	) {
		throw new Error("Acceptance result candidate binding is invalid.");
	}
	const report = record(acceptance.report, "acceptance report");
	const semanticReport = record(
		report.semanticReport,
		"acceptance semantic report",
	);
	const acceptanceByRelation = record(
		semanticReport.byRelation,
		"acceptance semantic per-kind gates",
	);
	const byRelationPass = record(
		report.byRelationPass,
		"acceptance execution-aware per-kind gates",
	);
	const verdictByRelation = record(
		verdict.byRelation,
		"verdict per-kind decisions",
	);
	const verdicts = relationKinds.map((relation) => {
		const decision = record(
			verdictByRelation[relation],
			`${relation} verdict`,
		);
		const rawDecision = string(decision.decision, `${relation} decision`);
		if (
			rawDecision !== "promote" &&
			rawDecision !== "revise" &&
			rawDecision !== "do-not-generate"
		) {
			throw new Error(`${relation} decision is invalid.`);
		}
		const gate = record(
			record(acceptanceByRelation[relation], `${relation} acceptance`)
				.gate,
			`${relation} acceptance gate`,
		);
		if (
			rawDecision === "promote" &&
			(gate.pass !== true || byRelationPass[relation] !== true)
		) {
			throw new Error(
				`${relation} cannot be promoted without an untouched, execution-complete acceptance pass.`,
			);
		}
		return {
			relation,
			verdict:
				rawDecision === "do-not-generate"
					? "doNotGenerate"
					: rawDecision,
		};
	});
	return {
		artifactPath: args.verdictArtifactPath,
		artifactSha256: sha256(args.verdictBytes),
		candidateId: args.candidateId,
		reviewedBy: reviewer,
		reviewedAt: recordedAt,
		acceptanceArtifactSha256: acceptanceSha256,
		verdicts,
	};
}

/** Hash current source contracts separately from immutable historical model exchanges. */
export async function currentRelationFingerprints() {
	async function digest(paths: readonly string[]) {
		const hash = new Bun.CryptoHasher("sha256");
		for (const path of [...paths].sort()) {
			hash.update(path).update("\0");
			hash.update(
				await Bun.file(resolve(workspace, path)).arrayBuffer(),
			).update("\0");
		}
		return `sha256:${hash.digest("hex")}`;
	}
	async function sources(directory: string) {
		const paths = [];
		for await (const path of new Bun.Glob("**/*.{ts,json}").scan(
			resolve(workspace, directory),
		))
			paths.push(`${directory}/${path}`);
		return paths;
	}
	const dumgen = "battery/dumgen-new/src";
	return {
		prompt: await digest([`${dumgen}/generated/prompts.ts`]),
		schema: await digest([
			`${dumgen}/generated/model-schemas.ts`,
			`${dumgen}/generated/validation.ts`,
		]),
		evaluator: await digest([
			...(await sources(
				`${dumgen}/concrete-lang/de/knowledge-production/evaluation`,
			)),
			...(await sources("battery/promptsmith/src")),
			`${dumgen}/development.ts`,
		]),
		model: await digest([
			`${dumgen}/universal/model.ts`,
			"app/tf-demo/server/modelExecution.ts",
		]),
		// Cover route dispatch, projection, corpus selections and foundational contracts.
		policy: await digest([
			...(await sources(dumgen)),
			...(await sources("battery/dumrel-new/src")),
			...(await sources("battery/dumling-new/src")),
			"app/tf-demo/server/generatedKnowledgeRequest.ts",
		]),
	};
}

export async function compileRelationVerdict(
	checkOnly = process.argv.includes("--check"),
) {
	const manifest = record(await readJson(manifestPath), "candidate manifest");
	if (manifest.formatVersion !== "german-relation-human-gate-candidate-v1")
		throw new Error("Unsupported relation candidate manifest format.");
	const candidateId = string(manifest.candidateId, "candidateId");
	const relocation = record(
		await readJson(locationsPath),
		"artifact locations",
	);
	if (relocation.candidateId !== candidateId)
		throw new Error("Relocated evidence belongs to a different candidate.");
	const locations = record(relocation.artifacts, "relocated artifacts");
	const artifacts = manifest.artifacts;
	if (!Array.isArray(artifacts) || artifacts.length === 0)
		throw new Error("Candidate manifest has no frozen artifacts.");

	const artifactByRole = new Map<
		string,
		{ issue: number; role: string; path: string; sha256: string }
	>();
	for (const rawArtifact of artifacts) {
		const artifact = record(rawArtifact, "frozen artifact");
		const normalized = {
			issue: Number(artifact.issue),
			role: string(artifact.role, "artifact role"),
			path: string(artifact.path, "artifact path"),
			sha256: string(artifact.sha256, "artifact sha256"),
		};
		const relocatedPath = string(
			locations[normalized.role],
			"relocated artifact path",
		);
		const contents = new Uint8Array(
			await Bun.file(resolve(gateDirectory, relocatedPath)).arrayBuffer(),
		);
		if (sha256(contents) !== normalized.sha256)
			throw new Error(
				`Frozen relation artifact drifted: ${normalized.path}.`,
			);
		if (artifactByRole.has(normalized.role))
			throw new Error(
				`Duplicate frozen artifact role: ${normalized.role}.`,
			);
		artifactByRole.set(normalized.role, normalized);
	}
	if (Object.keys(locations).length !== artifactByRole.size)
		throw new Error(
			"Relocated evidence inventory does not match its candidate.",
		);
	const calculatedCandidateId = sha256(
		[...artifactByRole.values()]
			.map(({ issue, role, path, sha256: digest }) =>
				[issue, role, path, digest].join("\u0000"),
			)
			.join("\u0001"),
	);
	if (calculatedCandidateId !== candidateId)
		throw new Error(
			"Candidate ID does not match the frozen artifact inventory.",
		);

	function artifactDigest(role: string): string {
		const artifact = artifactByRole.get(role);
		if (!artifact)
			throw new Error(`Candidate manifest is missing ${role}.`);
		return artifact.sha256;
	}

	const candidate = record(manifest.candidate, "candidate policy");
	const candidateModel = string(candidate.model, "candidate model");
	const verdictContract = record(
		manifest.verdictContract,
		"verdict contract",
	);
	const acceptanceReservation = record(
		manifest.acceptanceReservation,
		"acceptance reservation",
	);
	const historicalVerdictArtifactPath = string(
		verdictContract.path,
		"verdict artifact path",
	);
	const verdictArtifactPath =
		"battery/dumgen-new/docs/prototypes/german-relation-human-gate/verdict.json";

	let compiledVerdict: JsonRecord | null = null;
	const invalidationReasons: string[] = [];
	if (!(await exists(verdictPath))) {
		invalidationReasons.push("missingReviewedVerdictArtifact");
	} else {
		try {
			const verdictBytes = new Uint8Array(
				await Bun.file(verdictPath).arrayBuffer(),
			);
			const acceptanceBytes = new Uint8Array(
				await Bun.file(acceptancePath).arrayBuffer(),
			);
			compiledVerdict = compileReviewedVerdict({
				candidateId,
				verdictFormatVersion: verdictContract.formatVersion,
				requiredAcceptanceStatus:
					verdictContract.requiredAcceptanceStatus,
				selectionCommitmentSha256:
					acceptanceReservation.selectionCommitmentSha256,
				verdictArtifactPath,
				verdictBytes,
				acceptanceBytes,
			});
		} catch (cause) {
			invalidationReasons.push(
				`invalidReviewedVerdict:${cause instanceof Error ? cause.message : String(cause)}`,
			);
		}
	}

	const historicalFingerprints = {
		prompt: `sha256:${artifactDigest("prompt-source")}`,
		schema: `sha256:${artifactDigest("model-facing-schema")}`,
		evaluator: `sha256:${artifactDigest("semantic-evaluator")}`,
		model: `openai:${candidateModel}:sha256:${artifactDigest("model-policy")}`,
		policy: `candidate:${candidateId}:sha256:${artifactDigest("candidate-policy")}`,
	};
	const fingerprints = await currentRelationFingerprints();
	const candidateMatchesCurrentModel = Object.entries(fingerprints).every(
		([role, fingerprint]) =>
			historicalFingerprints[
				role as keyof typeof historicalFingerprints
			] === fingerprint,
	);
	if (!candidateMatchesCurrentModel)
		invalidationReasons.push("historicalCandidateRequiresReevaluation");

	const compiled = {
		formatVersion: "tf-demo-compiled-relation-verdict-v2",
		candidateId,
		verdictArtifactPath,
		fingerprints,
		historicalCandidate: {
			candidateId,
			originalVerdictArtifactPath: historicalVerdictArtifactPath,
			fingerprints: historicalFingerprints,
			verdict: compiledVerdict,
		},
		invalidationReasons,
		verdict: candidateMatchesCurrentModel ? compiledVerdict : null,
	};

	const source = `/** Generated by tooling/compile-relation-verdict.ts. Do not edit. */\nexport const COMPILED_RELATION_VERDICT = ${JSON.stringify(compiled, null, "\t")} as const;\n`;
	if (checkOnly) {
		const current = await Bun.file(outputPath)
			.text()
			.catch(() => "");
		if (current !== source) {
			throw new Error(
				"Compiled relation verdict is stale. Run `bun run compile:relation-policy` in app/tf-demo.",
			);
		}
	} else {
		await Bun.write(outputPath, source);
	}
}

if (import.meta.main) await compileRelationVerdict();
