import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { CORPUS as V1_CORPUS } from "../issue-8-meaning-resolution/corpus.ts";
import { toBlindMeaningInput } from "./blind-evaluation-input.ts";
import {
	CORPUS_VERSION,
	HIDDEN_MEANING_CASES,
	type HiddenMeaningCase,
	type MeaningRequirement,
	type PresentationHazard,
} from "./corpus.hidden.ts";
import {
	EXPECTED_GROUP_COUNTS,
	EXPECTED_INVENTORY_COUNTS,
	ORDER_CONTROL_PAIRS,
	PERFECT_SCORING_FIXTURES,
} from "./scoring-fixtures.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DUMGEN_ROOT = join(HERE, "../..");
const MANIFEST_PATH = join(HERE, "freeze-manifest.json");

const V1_AUTHORING_CONTEXTS = [
	"This light is bright",
	"The box is light",
] as const;

const REQUIRED_REQUIREMENTS: readonly MeaningRequirement[] = [
	"unseen-entry",
	"contextual-paraphrase",
	"broad-reuse-no-split",
	"distinct-note-no-merge",
	"zero-inventory",
	"one-candidate-inventory",
	"multi-candidate-inventory",
	"paired-candidate-order",
	"misleading-emoji",
	"misleading-description",
	"misleading-example",
	"exact-canonical-draft",
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
	decisions: Readonly<Record<string, number>>;
	inventories: Readonly<Record<string, number>>;
	orderPairs: number;
	maxV1TokenJaccard: number;
	freezeHash: string;
}>;

export function validateMeaningCorpus(): ValidationReport {
	assert(CORPUS_VERSION === "meaning-resolution-v2-hidden", "wrong version");
	assert(HIDDEN_MEANING_CASES.length === 18, "expected 18 cases");
	assertDeepFrozen(HIDDEN_MEANING_CASES, "corpus");
	assertUnique(
		HIDDEN_MEANING_CASES.map((hiddenCase) => hiddenCase.id),
		"case IDs",
	);

	const groupCounts = countBy(
		HIDDEN_MEANING_CASES.map((hiddenCase) => hiddenCase.group),
	);
	for (const [group, expected] of Object.entries(EXPECTED_GROUP_COUNTS)) {
		assert(groupCounts[group] === expected, `wrong ${group} count`);
	}

	const inventoryCounts = countBy(
		HIDDEN_MEANING_CASES.map((hiddenCase) =>
			hiddenCase.candidates.length === 0
				? "zero"
				: hiddenCase.candidates.length === 1
					? "one"
					: "multi",
		),
	);
	for (const [inventory, expected] of Object.entries(
		EXPECTED_INVENTORY_COUNTS,
	)) {
		assert(
			inventoryCounts[inventory] === expected,
			`wrong ${inventory} inventory count`,
		);
	}

	const decisions = countBy(
		HIDDEN_MEANING_CASES.map((hiddenCase) => hiddenCase.gold.decision),
	);
	assert(decisions.ReuseExisting === 11, "wrong reuse count");
	assert(decisions.DraftNew === 7, "wrong draft count");

	const coveredRequirements = new Set(
		HIDDEN_MEANING_CASES.flatMap((hiddenCase) => hiddenCase.requirements),
	);
	for (const requirement of REQUIRED_REQUIREMENTS) {
		assert(
			coveredRequirements.has(requirement),
			`missing requirement ${requirement}`,
		);
	}

	const v1EntryIds = new Set(
		V1_CORPUS.map((hiddenCase) => hiddenCase.entryId),
	);
	const v1CitationForms = new Set(
		V1_CORPUS.map((hiddenCase) => normalize(hiddenCase.citationForm)),
	);
	for (const hiddenCase of HIDDEN_MEANING_CASES) {
		assert(
			/^MR2-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(hiddenCase.id),
			`${hiddenCase.id} is not deterministic`,
		);
		assert(
			!v1EntryIds.has(hiddenCase.entryId),
			`${hiddenCase.id} reuses a v1 Entry`,
		);
		assert(
			!v1CitationForms.has(normalize(hiddenCase.citationForm)),
			`${hiddenCase.id} reuses a v1 citation form`,
		);
		assert(
			hiddenCase.requirements.includes("unseen-entry") &&
				hiddenCase.requirements.includes("contextual-paraphrase"),
			`${hiddenCase.id} lacks unseen/paraphrase coverage`,
		);
		assertUnique(
			hiddenCase.candidates.map((candidate) => candidate.meaningId),
			`${hiddenCase.id} candidate IDs`,
		);
		for (const candidate of hiddenCase.candidates) {
			assert(
				candidate.entryId === hiddenCase.entryId,
				`${hiddenCase.id} contains an out-of-scope Meaning`,
			);
		}
		const blind = toBlindMeaningInput(hiddenCase);
		assertDeepFrozen(blind, `${hiddenCase.id} blind input`);
		assert(
			!hasAnyKey(blind, [
				"gold",
				"group",
				"requirements",
				"orderControl",
				"presentationHazards",
			]),
			`${hiddenCase.id} blind projection leaks evaluator metadata`,
		);
		if (hiddenCase.gold.decision === "ReuseExisting") {
			assert(
				hiddenCase.candidates.some(
					(candidate) =>
						candidate.meaningId === hiddenCase.gold.meaningId,
				),
				`${hiddenCase.id} reuses an unsupplied Meaning`,
			);
		} else {
			assert(
				hiddenCase.gold.draft.meaningInEmojis.length > 0 &&
					hiddenCase.gold.draft.descriptionBlocks.length === 2 &&
					hiddenCase.gold.draft.descriptionBlocks.every(
						(block) => block.length > 0,
					),
				`${hiddenCase.id} lacks an exact ordered canonical draft`,
			);
		}
		if (hiddenCase.group === "broad-reuse") {
			assert(
				hiddenCase.gold.decision === "ReuseExisting",
				`${hiddenCase.id} would falsely split`,
			);
		}
		if (hiddenCase.group === "false-merge-trap") {
			assert(
				hiddenCase.gold.decision === "DraftNew",
				`${hiddenCase.id} would falsely merge`,
			);
		}
		assertPresentationHazards(hiddenCase);
	}

	assert(ORDER_CONTROL_PAIRS.length === 3, "expected three order pairs");
	assertDeepFrozen(ORDER_CONTROL_PAIRS, "order fixtures");
	for (const pair of ORDER_CONTROL_PAIRS) {
		assert(
			pair.forwardCaseId !== undefined &&
				pair.reverseCaseId !== undefined,
			`${pair.pairId} is incomplete`,
		);
		const forward = requiredCase(pair.forwardCaseId);
		const reverse = requiredCase(pair.reverseCaseId);
		assertPair(forward, reverse);
	}

	assert(PERFECT_SCORING_FIXTURES.length === 18, "fixture count mismatch");
	assertDeepFrozen(PERFECT_SCORING_FIXTURES, "scoring fixtures");
	for (const fixture of PERFECT_SCORING_FIXTURES) {
		const hiddenCase = requiredCase(fixture.caseId);
		if (fixture.expected.decision === "ReuseExisting") {
			assert(
				hiddenCase.gold.decision === "ReuseExisting" &&
					fixture.expected.existingMeaningId ===
						hiddenCase.gold.meaningId &&
					fixture.expected.draft === null,
				`${fixture.caseId} has a bad reuse fixture`,
			);
		} else {
			assert(
				hiddenCase.gold.decision === "DraftNew" &&
					fixture.expected.existingMeaningId === null &&
					JSON.stringify(fixture.expected.draft) ===
						JSON.stringify(hiddenCase.gold.draft),
				`${fixture.caseId} has a bad draft fixture`,
			);
		}
	}

	const referenceContexts = [
		...V1_CORPUS.map((hiddenCase) => hiddenCase.context),
		...V1_AUTHORING_CONTEXTS,
	];
	let maxV1TokenJaccard = 0;
	for (const hiddenCase of HIDDEN_MEANING_CASES) {
		for (const reference of referenceContexts) {
			assert(
				normalize(hiddenCase.context) !== normalize(reference),
				`${hiddenCase.id} overlaps a v1 context/example`,
			);
			maxV1TokenJaccard = Math.max(
				maxV1TokenJaccard,
				tokenJaccard(hiddenCase.context, reference),
			);
		}
	}
	assert(
		maxV1TokenJaccard < 0.5,
		`v1 lexical overlap too high: ${maxV1TokenJaccard}`,
	);

	const leakageSecrets = HIDDEN_MEANING_CASES.flatMap((hiddenCase) => [
		hiddenCase.context,
		hiddenCase.id,
		...(hiddenCase.gold.decision === "DraftNew"
			? hiddenCase.gold.draft.descriptionBlocks
			: []),
	]);
	assertNoPromptLeakage(
		leakageSecrets,
		"issue-14-meaning-resolution-v2-hidden",
	);

	const manifest = validateFreezeManifest();
	return Object.freeze({
		corpusVersion: CORPUS_VERSION,
		cases: HIDDEN_MEANING_CASES.length,
		decisions: Object.freeze(decisions),
		inventories: Object.freeze(inventoryCounts),
		orderPairs: ORDER_CONTROL_PAIRS.length,
		maxV1TokenJaccard,
		freezeHash: manifest.aggregateSha256,
	});
}

function assertPresentationHazards(hiddenCase: HiddenMeaningCase): void {
	const hazards = new Set<PresentationHazard>(
		hiddenCase.candidates.flatMap(
			(candidate) => candidate.presentationHazards,
		),
	);
	for (const [requirement, hazard] of [
		["misleading-emoji", "emoji"],
		["misleading-description", "description"],
		["misleading-example", "example"],
	] as const) {
		if (hiddenCase.requirements.includes(requirement)) {
			assert(
				hazards.has(hazard),
				`${hiddenCase.id} lacks ${hazard} hazard metadata`,
			);
		}
	}
}

function assertPair(
	forward: HiddenMeaningCase,
	reverse: HiddenMeaningCase,
): void {
	assert(
		forward.orderControl?.order === "forward" &&
			reverse.orderControl?.order === "reverse" &&
			forward.orderControl.pairId === reverse.orderControl.pairId,
		`${forward.id}/${reverse.id} have bad pair labels`,
	);
	const comparable = (hiddenCase: HiddenMeaningCase) => ({
		learnerId: hiddenCase.learnerId,
		language: hiddenCase.language,
		entryId: hiddenCase.entryId,
		citationForm: hiddenCase.citationForm,
		context: hiddenCase.context,
		normalizedSurface: hiddenCase.normalizedSurface,
		gold: hiddenCase.gold,
		candidateIds: [...hiddenCase.candidates]
			.map((candidate) => candidate.meaningId)
			.sort(),
	});
	assert(
		JSON.stringify(comparable(forward)) ===
			JSON.stringify(comparable(reverse)),
		`${forward.id}/${reverse.id} differ beyond candidate order`,
	);
	assert(
		JSON.stringify(
			forward.candidates.map((candidate) => candidate.meaningId),
		) ===
			JSON.stringify(
				[...reverse.candidates]
					.reverse()
					.map((candidate) => candidate.meaningId),
			),
		`${forward.id}/${reverse.id} are not inverse permutations`,
	);
}

function requiredCase(id: string): HiddenMeaningCase {
	const hiddenCase = HIDDEN_MEANING_CASES.find(
		(candidateCase) => candidateCase.id === id,
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
				`hidden gold leaked into Prompt Source: ${relative(DUMGEN_ROOT, path)}`,
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
	console.log(JSON.stringify(validateMeaningCorpus(), null, 2));
}
