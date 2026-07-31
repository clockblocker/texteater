import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { CORPUS as V1_CORPUS } from "../../docs/prototypes/issue-4-segmentation-chain/corpus.ts";
import { toBlindSegmentationInput } from "./blind-evaluation-input.ts";
import {
	CORPUS_VERSION,
	HIDDEN_SEGMENTATION_CASES,
	SEGMENT_KINDS,
	type SegmentationRequirement,
	type SegmentationStratum,
} from "./corpus.hidden.ts";
import {
	EXPECTED_DECISION_COUNTS,
	EXPECTED_STRATUM_COUNTS,
	PERFECT_SCORING_FIXTURES,
} from "./scoring-fixtures.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DUMGEN_ROOT = join(HERE, "../..");
const MANIFEST_PATH = join(HERE, "freeze-manifest.json");

const V1_AUTHORING_EXAMPLES = [
	"Der Kaffee ist heiß.",
	"undAllesgut!",
	"והחתול ישן.",
	"Wir treffen quux42 später.",
	"Bonjour tout le monde.",
] as const;

const REQUIRED_STRATA: readonly SegmentationStratum[] = [
	"clean-german",
	"german-boundaries",
	"typo-or-variant-preservation",
	"structural-reconstruction",
	"partially-opaque",
	"unintelligible",
	"unsupported-language",
	"hebrew-fused-material",
];

const REQUIRED_REQUIREMENTS: readonly SegmentationRequirement[] = [
	"german",
	"punctuation-boundary",
	"whitespace-boundary",
	"ordinary-typo-preservation",
	"licensed-variant-preservation",
	"conservative-reconstruction",
	"abbreviation-non-expansion",
	"local-opaque-preservation",
	"unintelligible-intake",
	"unsupported-language-intake",
	"non-whitespace-delimited-fused-material",
];

type FreezeManifest = {
	corpusVersion: string;
	status: string;
	files: ReadonlyArray<{ path: string; sha256: string }>;
	aggregateSha256: string;
};

export type ValidationReport = Readonly<{
	corpusVersion: string;
	cases: number;
	accepted: number;
	strata: Readonly<Record<string, number>>;
	maxV1TokenJaccard: number;
	freezeHash: string;
}>;

export function validateSegmentationCorpus(): ValidationReport {
	assert(CORPUS_VERSION === "segmentation-chain-v2-hidden", "wrong version");
	assert(HIDDEN_SEGMENTATION_CASES.length === 26, "expected 26 cases");
	assertDeepFrozen(HIDDEN_SEGMENTATION_CASES, "corpus");
	assertUnique(
		HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => hiddenCase.id),
		"case IDs",
	);
	assertUnique(
		HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => hiddenCase.source),
		"sources",
	);

	const stratumCounts = countBy(
		HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => hiddenCase.stratum),
	);
	for (const stratum of REQUIRED_STRATA) {
		assert(
			stratumCounts[stratum] === EXPECTED_STRATUM_COUNTS[stratum],
			`wrong ${stratum} count`,
		);
	}

	const decisionCounts = countBy(
		HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => hiddenCase.gold.decision),
	);
	for (const [decision, expected] of Object.entries(
		EXPECTED_DECISION_COUNTS,
	)) {
		assert(
			decisionCounts[decision] === expected,
			`wrong ${decision} count`,
		);
	}

	const coveredRequirements = new Set(
		HIDDEN_SEGMENTATION_CASES.flatMap(
			(hiddenCase) => hiddenCase.requirements,
		),
	);
	for (const requirement of REQUIRED_REQUIREMENTS) {
		assert(
			coveredRequirements.has(requirement),
			`missing requirement ${requirement}`,
		);
	}

	for (const hiddenCase of HIDDEN_SEGMENTATION_CASES) {
		assert(
			/^SC2-[A-Z]+(?:-[A-Z]+)*-\d{3}$/.test(hiddenCase.id),
			`${hiddenCase.id} is not deterministic`,
		);
		const blind = toBlindSegmentationInput(hiddenCase);
		assertDeepFrozen(blind, `${hiddenCase.id} blind input`);
		assert(
			Object.keys(blind).sort().join(",") === "caseId,source",
			`${hiddenCase.id} blind projection leaked metadata`,
		);
		if (hiddenCase.gold.decision !== "Accepted") continue;
		assert(
			hiddenCase.gold.segments.length > 0,
			`${hiddenCase.id} is empty`,
		);
		const replacement = hiddenCase.gold.segments
			.map((segment) => segment.text)
			.join("");
		for (const [index, segment] of hiddenCase.gold.segments.entries()) {
			assert(segment.text.length > 0, `${hiddenCase.id}@${index} empty`);
			assert(
				SEGMENT_KINDS.includes(segment.kind),
				`${hiddenCase.id}@${index} bad kind`,
			);
			if (segment.kind === "Whitespace") {
				assert(
					/^\s+$/u.test(segment.text),
					`${hiddenCase.id}@${index} invalid whitespace`,
				);
				assert(
					hiddenCase.gold.segments[index - 1]?.kind !==
						"Whitespace" &&
						hiddenCase.gold.segments[index + 1]?.kind !==
							"Whitespace",
					`${hiddenCase.id}@${index} non-maximal whitespace`,
				);
			}
			if (segment.kind === "Punctuation") {
				assert(
					graphemeCount(segment.text) === 1,
					`${hiddenCase.id}@${index} punctuation is not one grapheme`,
				);
			}
		}
		const reconstructs = hiddenCase.requirements.includes(
			"conservative-reconstruction",
		);
		assert(
			reconstructs
				? replacement !== hiddenCase.source
				: replacement === hiddenCase.source,
			`${hiddenCase.id} violates reconstruction scope`,
		);
		if (
			hiddenCase.requirements.includes("ordinary-typo-preservation") ||
			hiddenCase.requirements.includes("licensed-variant-preservation") ||
			hiddenCase.requirements.includes("local-opaque-preservation")
		) {
			assert(
				replacement === hiddenCase.source,
				`${hiddenCase.id} failed exact preservation`,
			);
		}
		if (hiddenCase.requirements.includes("local-opaque-preservation")) {
			assert(
				hiddenCase.gold.segments.some(
					(segment) => segment.kind === "ResolvableText",
				) &&
					hiddenCase.gold.segments.some(
						(segment) => segment.kind === "OpaqueText",
					),
				`${hiddenCase.id} must mix resolvable and opaque text`,
			);
		}
		if (
			hiddenCase.requirements.includes(
				"non-whitespace-delimited-fused-material",
			)
		) {
			assert(
				hiddenCase.gold.segments.some(
					(segment, index, segments) =>
						segment.kind === "ResolvableText" &&
						segments[index + 1]?.kind === "ResolvableText",
				),
				`${hiddenCase.id} has no adjacent click atoms`,
			);
		}
	}

	const abbreviationCase = HIDDEN_SEGMENTATION_CASES.find((hiddenCase) =>
		hiddenCase.requirements.includes("abbreviation-non-expansion"),
	);
	assert(
		abbreviationCase?.gold.decision === "Accepted",
		"missing abbreviation case",
	);
	const abbreviationAtoms = abbreviationCase.gold.segments
		.filter((segment) => segment.kind === "ResolvableText")
		.map((segment) => segment.text);
	assert(
		JSON.stringify(abbreviationAtoms) ===
			JSON.stringify(["ngl", "u", "r", "here", "rn"]),
		"abbreviation atoms changed",
	);
	assert(
		!abbreviationAtoms.some((atom) =>
			["you", "are", "right now", "not gonna lie"].includes(
				atom.toLowerCase(),
			),
		),
		"abbreviation case expands lexical content",
	);

	assert(PERFECT_SCORING_FIXTURES.length === 26, "fixture count mismatch");
	assertDeepFrozen(PERFECT_SCORING_FIXTURES, "scoring fixtures");
	assertUnique(
		PERFECT_SCORING_FIXTURES.flatMap((fixture) =>
			fixture.expected.decision === "Accepted"
				? [fixture.expected.segmentedSentenceId]
				: [],
		),
		"segmented sentence IDs",
	);
	for (const fixture of PERFECT_SCORING_FIXTURES) {
		if (fixture.expected.decision !== "Accepted") continue;
		assert(
			fixture.expected.segments.every(
				(segment, index) =>
					segment.index === index &&
					segment.clickable === (segment.kind === "ResolvableText") &&
					!("id" in segment) &&
					!("segmentId" in segment),
			),
			`${fixture.caseId} violates canonical scoring fixture`,
		);
	}

	const referenceSources = [
		...V1_CORPUS.map((corpusCase) => corpusCase.source),
		...V1_AUTHORING_EXAMPLES,
	];
	let maxV1TokenJaccard = 0;
	for (const hiddenCase of HIDDEN_SEGMENTATION_CASES) {
		for (const reference of referenceSources) {
			assert(
				normalize(hiddenCase.source) !== normalize(reference),
				`${hiddenCase.id} overlaps a v1 source/example`,
			);
			maxV1TokenJaccard = Math.max(
				maxV1TokenJaccard,
				tokenJaccard(hiddenCase.source, reference),
			);
		}
	}
	assert(
		maxV1TokenJaccard < 0.5,
		`v1 lexical overlap too high: ${maxV1TokenJaccard}`,
	);
	assertNoPromptLeakage(
		HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => hiddenCase.source),
		"issue-15-segmentation-chain-v2-hidden",
	);

	const manifest = validateFreezeManifest();
	return Object.freeze({
		corpusVersion: CORPUS_VERSION,
		cases: HIDDEN_SEGMENTATION_CASES.length,
		accepted: decisionCounts.Accepted ?? 0,
		strata: Object.freeze(stratumCounts),
		maxV1TokenJaccard,
		freezeHash: manifest.aggregateSha256,
	});
}

function validateFreezeManifest(): FreezeManifest {
	const manifest = JSON.parse(
		readFileSync(MANIFEST_PATH, "utf8"),
	) as FreezeManifest;
	assert(
		manifest.corpusVersion === CORPUS_VERSION,
		"manifest version mismatch",
	);
	assert(
		manifest.status === "frozen-before-inference",
		"manifest not frozen",
	);
	for (const file of manifest.files) {
		const actual = sha256(readFileSync(join(HERE, file.path)));
		assert(actual === file.sha256, `hash mismatch: ${file.path}`);
	}
	const aggregate = sha256(
		manifest.files.map((file) => `${file.path}\0${file.sha256}\n`).join(""),
	);
	assert(aggregate === manifest.aggregateSha256, "aggregate hash mismatch");
	return manifest;
}

function assertNoPromptLeakage(
	secrets: readonly string[],
	forbiddenImport: string,
): void {
	for (const path of promptSourcePaths()) {
		const contents = readFileSync(path, "utf8");
		assert(
			!contents.includes(forbiddenImport),
			`Prompt Source imports hidden module: ${relative(DUMGEN_ROOT, path)}`,
		);
		for (const secret of secrets) {
			assert(
				!contents.includes(secret),
				`hidden case leaked into Prompt Source: ${relative(DUMGEN_ROOT, path)}`,
			);
		}
	}
}

function promptSourcePaths(): string[] {
	return walk(DUMGEN_ROOT).filter((path) => {
		const normalized = path.replaceAll("\\", "/");
		return (
			normalized.endsWith("/prompts.ts") ||
			normalized.endsWith("/src/promtsmith/prompt.ts") ||
			normalized.includes("/src/promtsmith/production/") ||
			normalized.endsWith(
				"/docs/prototypes/issue-4-segmentation-chain/prototype.ts",
			)
		);
	});
}

function walk(directory: string): string[] {
	const paths: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === "results") continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) paths.push(...walk(path));
		else if (entry.isFile()) paths.push(path);
	}
	return paths;
}

function graphemeCount(value: string): number {
	return [
		...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(
			value,
		),
	].length;
}

function normalize(value: string): string {
	return value
		.normalize("NFC")
		.toLocaleLowerCase("und")
		.replace(/\s+/gu, " ");
}

function tokenJaccard(left: string, right: string): number {
	const leftTokens = new Set(normalize(left).match(/[\p{L}\p{N}]+/gu) ?? []);
	const rightTokens = new Set(
		normalize(right).match(/[\p{L}\p{N}]+/gu) ?? [],
	);
	const union = new Set([...leftTokens, ...rightTokens]);
	if (union.size === 0) return 0;
	let intersection = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) intersection += 1;
	}
	return intersection / union.size;
}

function countBy(values: readonly string[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
	return counts;
}

function assertUnique(values: readonly string[], label: string): void {
	assert(new Set(values).size === values.length, `${label} are not unique`);
}

function assertDeepFrozen(value: unknown, label: string): void {
	if (value !== null && typeof value === "object") {
		assert(Object.isFrozen(value), `${label} is mutable`);
		for (const nested of Object.values(value))
			assertDeepFrozen(nested, label);
	}
}

function sha256(value: string | Uint8Array): string {
	return createHash("sha256").update(value).digest("hex");
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

if (import.meta.main) {
	console.log(JSON.stringify(validateSegmentationCorpus(), null, 2));
}
