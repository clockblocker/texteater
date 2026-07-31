import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { CORPUS as V1_CORPUS } from "../issue-6-selection-surface/corpus.ts";
import { toBlindClickInferenceInput } from "./blind-inference-input.ts";
import {
	type ClickRequirement,
	type ClickStratum,
	CORPUS_VERSION,
	HIDDEN_CLICK_CASES,
	type HiddenClickCase,
	type Segment,
} from "./corpus.hidden.ts";
import {
	EXPECTED_GATE_COUNTS,
	EXPECTED_STRATUM_COUNTS,
	PERFECT_SCORING_FIXTURES,
	REJECTION_SCORING_FIXTURES,
	RELATIONAL_SCORING_FIXTURES,
} from "./scoring-fixtures.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DUMGEN_ROOT = join(HERE, "../..");
const MANIFEST_PATH = join(HERE, "freeze-manifest.json");

const REQUIRED_STRATA: readonly ClickStratum[] = [
	"simple-citation",
	"repeated-token-particle",
	"clicked-or-nonclicked-typo",
	"discontinuous-morpheme",
	"partial-phraseme",
	"non-phraseme-control",
	"canonical-or-variant-spelling",
	"citation-or-inflection",
];

const REQUIRED_REQUIREMENTS: readonly ClickRequirement[] = [
	"repeated-identical-token",
	"governed-vs-detached-particle",
	"discontinuous-morpheme-excludes-stem",
	"partial-phraseme",
	"non-phraseme-control",
	"clicked-typo",
	"non-clicked-typo",
	"canonical-spelling",
	"variant-spelling",
	"citation-surface",
	"inflection-surface",
	"full-coverage",
	"partial-coverage",
	"zero-insertion",
	"zero-lemmatization",
];

type FreezeManifest = {
	corpusVersion: string;
	status: string;
	files: ReadonlyArray<{ path: string; sha256: string }>;
	aggregateSha256: string;
};

export type ValidationReport = Readonly<{
	corpusVersion: string;
	clickCases: number;
	segmentedSentences: number;
	strata: Readonly<Record<string, number>>;
	gates: Readonly<Record<string, Readonly<Record<string, number>>>>;
	relationalFixtures: number;
	rejectionFixtures: number;
	maxV1TokenJaccard: number;
	freezeHash: string;
}>;

export function validateClickCorpus(): ValidationReport {
	assert(
		CORPUS_VERSION === "click-resolution-chain-v2-hidden",
		"wrong corpus version",
	);
	assert(HIDDEN_CLICK_CASES.length === 15, "expected 15 click cases");
	assertDeepFrozen(HIDDEN_CLICK_CASES, "corpus");
	assertUnique(
		HIDDEN_CLICK_CASES.map((hiddenCase) => hiddenCase.id),
		"case IDs",
	);

	const sentences = new Map(
		HIDDEN_CLICK_CASES.map((hiddenCase) => [
			hiddenCase.sentence.id,
			hiddenCase.sentence,
		]),
	);
	assert(sentences.size === 10, "expected 10 immutable sentences");
	for (const [id, sentence] of sentences) {
		const matches = HIDDEN_CLICK_CASES.filter(
			(hiddenCase) => hiddenCase.sentence.id === id,
		);
		assert(
			matches.every(
				(hiddenCase) =>
					JSON.stringify(hiddenCase.sentence) ===
					JSON.stringify(sentence),
			),
			`${id} is not immutable across click cases`,
		);
		assert(sentence.segments.length > 0, `${id} has no Segments`);
		assert(
			sentence.segments.every((segment) => segment.text.length > 0),
			`${id} has an empty Segment`,
		);
	}

	const stratumCounts = countBy(
		HIDDEN_CLICK_CASES.map((hiddenCase) => hiddenCase.stratum),
	);
	for (const stratum of REQUIRED_STRATA) {
		assert(
			stratumCounts[stratum] === EXPECTED_STRATUM_COUNTS[stratum],
			`wrong ${stratum} count`,
		);
	}

	const coveredRequirements = new Set(
		HIDDEN_CLICK_CASES.flatMap((hiddenCase) => hiddenCase.requirements),
	);
	for (const requirement of REQUIRED_REQUIREMENTS) {
		assert(
			coveredRequirements.has(requirement),
			`missing requirement ${requirement}`,
		);
	}

	for (const hiddenCase of HIDDEN_CLICK_CASES) {
		validateCase(hiddenCase);
		const blind = toBlindClickInferenceInput(hiddenCase);
		assertDeepFrozen(blind, `${hiddenCase.id} blind input`);
		assert(
			Object.keys(blind).sort().join(",") ===
				"caseId,clickedSegmentIndex,language,segmentedSentenceId,segments",
			`${hiddenCase.id} blind boundary has wrong keys`,
		);
		assert(
			!hasAnyKey(blind, [
				"gold",
				"stratum",
				"requirements",
				"surfaceSegmentIndices",
				"attestedSurface",
				"normalizedSurface",
				"entry",
				"forbiddenNormalizedSurfaces",
				"authorityEvidence",
			]),
			`${hiddenCase.id} blind boundary leaked evaluator data`,
		);
	}

	const gates = {
		selectedOrthography: countBy(
			HIDDEN_CLICK_CASES.map(
				(hiddenCase) => hiddenCase.gold.selectedOrthography,
			),
		),
		spelling: countBy(
			HIDDEN_CLICK_CASES.map((hiddenCase) => hiddenCase.gold.spelling),
		),
		realizationCoverage: countBy(
			HIDDEN_CLICK_CASES.map(
				(hiddenCase) => hiddenCase.gold.realizationCoverage,
			),
		),
		surfaceKind: countBy(
			HIDDEN_CLICK_CASES.map((hiddenCase) => hiddenCase.gold.surfaceKind),
		),
	};
	for (const [gate, expectedCounts] of Object.entries(EXPECTED_GATE_COUNTS)) {
		for (const [value, expected] of Object.entries(expectedCounts)) {
			assert(
				gates[gate as keyof typeof gates][value] === expected,
				`wrong ${gate}.${value} count`,
			);
		}
	}

	validatePerfectFixtures();
	validateRelations();
	validateRejections();

	const v1Sources = [
		...new Set(
			V1_CORPUS.map((goldCase) =>
				goldCase.sentence.segments
					.map((segment) => segment.text)
					.join(""),
			),
		),
	];
	let maxV1TokenJaccard = 0;
	for (const sentence of sentences.values()) {
		const source = sentence.segments
			.map((segment) => segment.text)
			.join("");
		for (const v1Source of v1Sources) {
			assert(
				normalize(source) !== normalize(v1Source),
				`${sentence.id} duplicates a v1 sentence`,
			);
			maxV1TokenJaccard = Math.max(
				maxV1TokenJaccard,
				tokenJaccard(source, v1Source),
			);
		}
	}
	assert(
		maxV1TokenJaccard < 0.5,
		`v1 lexical overlap too high: ${maxV1TokenJaccard}`,
	);
	assertNoPromptLeakage([
		...sentences
			.values()
			.map((sentence) =>
				sentence.segments.map((segment) => segment.text).join(""),
			),
		...HIDDEN_CLICK_CASES.map((hiddenCase) => hiddenCase.id),
	]);

	const manifest = validateFreezeManifest();
	return Object.freeze({
		corpusVersion: CORPUS_VERSION,
		clickCases: HIDDEN_CLICK_CASES.length,
		segmentedSentences: sentences.size,
		strata: Object.freeze(stratumCounts),
		gates: Object.freeze(
			Object.fromEntries(
				Object.entries(gates).map(([gate, values]) => [
					gate,
					Object.freeze(values),
				]),
			),
		),
		relationalFixtures: RELATIONAL_SCORING_FIXTURES.length,
		rejectionFixtures: REJECTION_SCORING_FIXTURES.length,
		maxV1TokenJaccard,
		freezeHash: manifest.aggregateSha256,
	});
}

function validateCase(hiddenCase: HiddenClickCase): void {
	assert(
		/^CRC2-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(hiddenCase.id),
		`${hiddenCase.id} is not deterministic`,
	);
	const clicked =
		hiddenCase.sentence.segments[hiddenCase.clickedSegmentIndex];
	assert(
		clicked?.kind === "ResolvableText",
		`${hiddenCase.id} click is not ResolvableText`,
	);
	assert(
		hiddenCase.gold.surfaceSegmentIndices.length > 0,
		`${hiddenCase.id} membership is empty`,
	);
	assert(
		hiddenCase.gold.surfaceSegmentIndices.includes(
			hiddenCase.clickedSegmentIndex,
		),
		`${hiddenCase.id} membership omits click`,
	);
	for (
		let position = 0;
		position < hiddenCase.gold.surfaceSegmentIndices.length;
		position += 1
	) {
		const index = hiddenCase.gold.surfaceSegmentIndices[position];
		assert(
			Number.isSafeInteger(index) &&
				hiddenCase.sentence.segments[index]?.kind === "ResolvableText",
			`${hiddenCase.id} has invalid member index`,
		);
		assert(
			position === 0 ||
				(hiddenCase.gold.surfaceSegmentIndices[position - 1] ?? -1) <
					(index ?? -1),
			`${hiddenCase.id} membership is not ordered and unique`,
		);
	}
	assert(
		constructAttestedSurface(
			hiddenCase.sentence.segments,
			hiddenCase.gold.surfaceSegmentIndices,
		) === hiddenCase.gold.attestedSurface,
		`${hiddenCase.id} attestedSurface is not deterministic`,
	);
	assert(
		JSON.stringify(
			hiddenCase.gold.normalizedMembers.map((member) => member.index),
		) === JSON.stringify(hiddenCase.gold.surfaceSegmentIndices),
		`${hiddenCase.id} normalization members do not match membership`,
	);
	assert(
		hiddenCase.gold.normalizedMembers.every(
			(member) =>
				member.normalizedText.length > 0 &&
				!/\s/u.test(member.normalizedText),
		),
		`${hiddenCase.id} violates guarded normalization shape`,
	);
	assert(
		joinMemberTexts(
			hiddenCase.sentence.segments,
			hiddenCase.gold.normalizedMembers,
		) === hiddenCase.gold.normalizedSurface,
		`${hiddenCase.id} normalizedSurface is not a guarded join`,
	);
	assert(
		!hiddenCase.gold.forbiddenNormalizedSurfaces.includes(
			hiddenCase.gold.normalizedSurface,
		),
		`${hiddenCase.id} gold is a forbidden insertion/lemma`,
	);
	assert(
		hiddenCase.gold.surfaceKind === "Inflection" ||
			Object.keys(hiddenCase.gold.inflectionalFeatures).length === 0,
		`${hiddenCase.id} Citation carries inflection features`,
	);
	if (hiddenCase.requirements.includes("clicked-typo")) {
		assert(
			hiddenCase.gold.selectedOrthography === "Typo",
			`${hiddenCase.id} misses clicked typo`,
		);
	}
	if (hiddenCase.requirements.includes("non-clicked-typo")) {
		assert(
			hiddenCase.gold.selectedOrthography === "Standard" &&
				hiddenCase.gold.normalizedSurface !==
					hiddenCase.gold.attestedSurface,
			`${hiddenCase.id} propagates non-clicked typo`,
		);
	}
	if (hiddenCase.requirements.includes("variant-spelling")) {
		assert(
			hiddenCase.gold.spelling === "Variant" &&
				hiddenCase.gold.normalizedSurface ===
					hiddenCase.gold.attestedSurface,
			`${hiddenCase.id} erases Variant spelling`,
		);
	}
	if (hiddenCase.requirements.includes("partial-coverage")) {
		assert(
			hiddenCase.gold.realizationCoverage === "Partial",
			`${hiddenCase.id} misses Partial coverage`,
		);
	}
}

function validatePerfectFixtures(): void {
	assert(
		PERFECT_SCORING_FIXTURES.length === HIDDEN_CLICK_CASES.length,
		"perfect fixture count mismatch",
	);
	assertDeepFrozen(PERFECT_SCORING_FIXTURES, "perfect scoring fixtures");
	for (const fixture of PERFECT_SCORING_FIXTURES) {
		const hiddenCase = requiredCase(fixture.caseId);
		assert(
			JSON.stringify(fixture.membershipExpected) ===
				JSON.stringify({
					surfaceSegmentIndices:
						hiddenCase.gold.surfaceSegmentIndices,
					selectedOrthography: hiddenCase.gold.selectedOrthography,
				}),
			`${fixture.caseId} membership fixture mismatch`,
		);
		assert(
			fixture.applicationAttestedSurface ===
				hiddenCase.gold.attestedSurface &&
				fixture.normalizationExpected.normalizedSurface ===
					hiddenCase.gold.normalizedSurface &&
				fixture.entryKeyExpected === hiddenCase.gold.entry.key,
			`${fixture.caseId} exact fixture mismatch`,
		);
	}
}

function validateRelations(): void {
	assert(RELATIONAL_SCORING_FIXTURES.length === 6, "expected 6 relations");
	assertDeepFrozen(RELATIONAL_SCORING_FIXTURES, "relational fixtures");
	for (const relation of RELATIONAL_SCORING_FIXTURES) {
		assert(
			relation.caseIds.every((id) =>
				HIDDEN_CLICK_CASES.some((hiddenCase) => hiddenCase.id === id),
			),
			`${relation.id} references missing case`,
		);
	}

	const repeatedVerb = requiredCase("CRC2-REPEAT-001-VERB");
	const governed = requiredCase("CRC2-REPEAT-002-GOVERNED");
	const repeatedParticle = requiredCase("CRC2-REPEAT-003-PARTICLE");
	assert(
		equal(
			repeatedVerb.gold.surfaceSegmentIndices,
			repeatedParticle.gold.surfaceSegmentIndices,
		) &&
			equal(repeatedVerb.gold.surfaceSegmentIndices, [0, 12]) &&
			equal(governed.gold.surfaceSegmentIndices, [6]),
		"repeated-token relation failed",
	);

	const typoClicked = requiredCase("CRC2-TYPO-001-CLICKED");
	const typoNonclicked = requiredCase("CRC2-TYPO-002-NONCLICKED");
	assert(
		equal(
			typoClicked.gold.surfaceSegmentIndices,
			typoNonclicked.gold.surfaceSegmentIndices,
		) &&
			typoClicked.gold.normalizedSurface ===
				typoNonclicked.gold.normalizedSurface &&
			typoClicked.gold.selectedOrthography === "Typo" &&
			typoNonclicked.gold.selectedOrthography === "Standard",
		"clicked-orthography relation failed",
	);

	const morphemes = [
		requiredCase("CRC2-MORPH-001-PREFIX"),
		requiredCase("CRC2-MORPH-002-SUFFIX"),
	];
	assert(
		morphemes.every(
			(hiddenCase) =>
				equal(hiddenCase.gold.surfaceSegmentIndices, [6, 8]) &&
				!hiddenCase.gold.surfaceSegmentIndices.includes(7),
		),
		"discontinuous-morpheme relation failed",
	);

	const partials = [
		requiredCase("CRC2-PARTIAL-001-ADJECTIVE"),
		requiredCase("CRC2-PARTIAL-002-NOUN"),
	];
	const control = requiredCase("CRC2-CONTROL-001-ORDINARY-ADJECTIVE");
	assert(
		partials.every(
			(hiddenCase) =>
				equal(hiddenCase.gold.surfaceSegmentIndices, [2, 4]) &&
				hiddenCase.gold.realizationCoverage === "Partial",
		) &&
			equal(control.gold.surfaceSegmentIndices, [8]) &&
			control.gold.realizationCoverage === "Full",
		"phraseme/control relation failed",
	);

	const canonical = requiredCase("CRC2-SPELLING-001-CANONICAL");
	const variant = requiredCase("CRC2-SPELLING-002-VARIANT");
	assert(
		canonical.gold.entry.key === variant.gold.entry.key &&
			canonical.gold.spelling === "Canonical" &&
			variant.gold.spelling === "Variant" &&
			canonical.gold.normalizedSurface !== variant.gold.normalizedSurface,
		"spelling relation failed",
	);

	const citation = requiredCase("CRC2-KIND-001-CITATION");
	const inflection = requiredCase("CRC2-KIND-002-INFLECTION");
	assert(
		citation.gold.entry.key === inflection.gold.entry.key &&
			citation.gold.surfaceKind === "Citation" &&
			inflection.gold.surfaceKind === "Inflection",
		"Surface-kind relation failed",
	);
}

function validateRejections(): void {
	assert(REJECTION_SCORING_FIXTURES.length === 7, "expected 7 rejections");
	assertDeepFrozen(REJECTION_SCORING_FIXTURES, "rejection fixtures");
	assertUnique(
		REJECTION_SCORING_FIXTURES.map((fixture) => fixture.id),
		"rejection fixture IDs",
	);
	const categories = new Set(
		REJECTION_SCORING_FIXTURES.map((fixture) => fixture.expectedCategory),
	);
	for (const required of [
		"invalid_membership",
		"membership_mismatch",
		"insertion_violation",
		"lemmatization_violation",
		"orthography_mismatch",
		"variant_erasure",
	]) {
		assert(
			categories.has(required),
			`missing rejection category ${required}`,
		);
	}
	for (const fixture of REJECTION_SCORING_FIXTURES) {
		requiredCase(fixture.caseId);
	}
}

function constructAttestedSurface(
	segments: readonly Segment[],
	indices: readonly number[],
): string {
	return joinMemberTexts(
		segments,
		indices.map((index) => ({
			index,
			normalizedText: segments[index]?.text ?? "",
		})),
	);
}

function joinMemberTexts(
	segments: readonly Segment[],
	members: readonly Readonly<{ index: number; normalizedText: string }>[],
): string {
	let result = "";
	for (const [position, member] of members.entries()) {
		const previous = members[position - 1];
		if (
			previous &&
			segments
				.slice(previous.index + 1, member.index)
				.some((segment) => segment.kind === "Whitespace")
		) {
			result += " ";
		}
		result += member.normalizedText;
	}
	return result;
}

function requiredCase(id: string): HiddenClickCase {
	const hiddenCase = HIDDEN_CLICK_CASES.find(
		(candidate) => candidate.id === id,
	);
	assert(hiddenCase !== undefined, `missing case ${id}`);
	return hiddenCase;
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
		assert(
			sha256(readFileSync(join(HERE, file.path))) === file.sha256,
			`hash mismatch: ${file.path}`,
		);
	}
	const aggregate = sha256(
		manifest.files.map((file) => `${file.path}\0${file.sha256}\n`).join(""),
	);
	assert(aggregate === manifest.aggregateSha256, "aggregate hash mismatch");
	return manifest;
}

function assertNoPromptLeakage(secrets: readonly string[]): void {
	for (const path of promptSourcePaths()) {
		const contents = readFileSync(path, "utf8");
		assert(
			!contents.includes("issue-13-click-resolution-chain-v2-hidden"),
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

function hasAnyKey(value: unknown, forbidden: readonly string[]): boolean {
	if (value === null || typeof value !== "object") return false;
	for (const [key, nested] of Object.entries(value)) {
		if (forbidden.includes(key) || hasAnyKey(nested, forbidden))
			return true;
	}
	return false;
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

function equal(left: readonly number[], right: readonly number[]): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
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
	console.log(JSON.stringify(validateClickCorpus(), null, 2));
}
