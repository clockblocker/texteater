import { createHash } from "node:crypto";
import { CORPUS as VISIBLE_V1_CORPUS } from "../issue-7-entry-resolution/corpus";
import type {
	BlindCase,
	CatalogEntry,
	GoldCase,
	RelationalAssertion,
} from "./scorer";
import { scoreEvaluation } from "./scorer";

type CatalogDocument = {
	version: string;
	kind: string;
	authorityBindings: unknown[];
	boundaryPolicies: Record<string, string>;
	entries: CatalogEntry[];
};

type BlindDocument = {
	version: string;
	catalogVersion: string;
	cases: BlindCase[];
};

type GoldDocument = {
	version: string;
	blindVersion: string;
	cases: GoldCase[];
	relationalAssertions: RelationalAssertion[];
	meaningIndependenceAssertions: Array<{
		assertionId: string;
		caseIds: string[];
		learnerMeaningFixtureIds: string[];
		invariant: string;
	}>;
};

type FreezeManifest = {
	prototype: boolean;
	corpusVersion: string;
	catalogVersion: string;
	goldVersion: string;
	noInference: boolean;
	hiddenSemantics: string;
	counts: {
		cases: number;
		catalogEntries: number;
		languages: Record<string, number>;
		decisions: Record<string, number>;
		primaryStrata: Record<string, number>;
		relationalAssertions: number;
		meaningIndependenceAssertions: number;
		exactVisibleSentenceOverlap: number;
		exactVisibleCaseIdOverlap: number;
		exactVisibleEntryIdOverlap: number;
	};
	files: Record<string, string>;
	policySources: Record<string, string>;
};

const REQUIRED_PRIMARY_STRATA: Record<string, number> = {
	"polysemy-meaning-independence": 2,
	"paradigm-homonym": 4,
	"same-spelling-pos": 2,
	"cross-linguistic-homonym": 3,
	"family-subkind": 4,
	"grammar-category": 2,
	baseline: 1,
	"inflection-same-entry": 2,
	"new-entry": 1,
};

const REQUIRED_TAGS = new Set([
	"german-schloss",
	"bank-paradigm",
	"same-spelling-pos",
	"russian-kosa",
	"family-phraseme",
	"family-morpheme",
	"inflection-same-entry",
	"missing-identity",
	"meaning-independent",
]);

const REQUIRED_ASSERTIONS = new Set([
	"schloss-readings-share-entry",
	"bank-paradigms-are-distinct",
	"same-spelling-pos-is-distinct",
	"russian-kosa-identities-are-distinct",
	"idiom-and-literal-verb-are-distinct",
	"morpheme-and-host-lexeme-are-distinct",
	"separable-verb-and-adposition-are-distinct",
	"person-inflections-share-entry",
	"mutter-paradigms-are-distinct",
	"missing-clay-identity-is-proposed",
]);

const FORBIDDEN_BLIND_KEYS = new Set([
	"decision",
	"expected",
	"gold",
	"learnerMeaningFixtureIds",
	"meaningIndependenceAssertions",
]);

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function readJson<T>(name: string): Promise<T> {
	return (await Bun.file(`${import.meta.dir}/${name}`).json()) as T;
}

async function sha256(path: string): Promise<string> {
	const bytes = await Bun.file(path).arrayBuffer();
	return createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
}

function countBy(values: readonly string[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
	return Object.fromEntries(
		Object.entries(counts).sort(([left], [right]) =>
			left.localeCompare(right),
		),
	);
}

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (typeof value === "object" && value !== null) {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function walkBlind(value: unknown, path = "$"): void {
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			walkBlind(item, `${path}[${index}]`);
		}
		return;
	}
	if (typeof value !== "object" || value === null) return;
	for (const [key, child] of Object.entries(value)) {
		assert(
			!FORBIDDEN_BLIND_KEYS.has(key),
			`blind input leaks forbidden key ${path}.${key}`,
		);
		walkBlind(child, `${path}.${key}`);
	}
}

function assertUnique(values: readonly string[], label: string): void {
	assert(new Set(values).size === values.length, `${label} must be unique`);
}

async function main(): Promise<void> {
	const catalog = await readJson<CatalogDocument>("catalog.json");
	const blind = await readJson<BlindDocument>("blind-input.json");
	const gold = await readJson<GoldDocument>("gold.json");
	const manifest = await readJson<FreezeManifest>("freeze-manifest.json");

	assert(manifest.prototype, "manifest must mark this bundle as a prototype");
	assert(
		manifest.noInference,
		"manifest must state that no inference was run",
	);
	assert(
		catalog.kind === "synthetic-evaluation-catalog",
		"catalog must not claim authority provenance",
	);
	assert(
		catalog.authorityBindings.length === 0,
		"authority bindings must remain empty",
	);
	assert(
		blind.catalogVersion === catalog.version,
		"blind/catalog versions disagree",
	);
	assert(gold.blindVersion === blind.version, "gold/blind versions disagree");
	assert(
		manifest.catalogVersion === catalog.version,
		"manifest/catalog versions disagree",
	);
	assert(
		manifest.corpusVersion === blind.version,
		"manifest/blind versions disagree",
	);
	assert(
		manifest.goldVersion === gold.version,
		"manifest/gold versions disagree",
	);

	walkBlind(blind);
	const serializedBlind = JSON.stringify(blind);
	for (const assertion of gold.meaningIndependenceAssertions) {
		for (const fixtureId of assertion.learnerMeaningFixtureIds) {
			assert(
				!serializedBlind.includes(fixtureId),
				`blind input leaks Meaning fixture ${fixtureId}`,
			);
		}
	}

	assertUnique(
		catalog.entries.map((entry) => entry.entryId),
		"catalog entry IDs",
	);
	assertUnique(
		blind.cases.map((entryCase) => entryCase.caseId),
		"blind case IDs",
	);
	assertUnique(
		gold.cases.map((entryCase) => entryCase.caseId),
		"gold case IDs",
	);
	assert(
		catalog.entries.every((entry) =>
			/^ent_[0-9a-f]{16}$/.test(entry.entryId),
		),
		"entry IDs must be opaque",
	);

	const catalogById = new Map(
		catalog.entries.map((entry) => [entry.entryId, entry]),
	);
	const goldByCaseId = new Map(
		gold.cases.map((goldCase) => [goldCase.caseId, goldCase]),
	);
	assert(
		blind.cases.length === gold.cases.length,
		"blind and gold case counts differ",
	);

	for (const blindCase of blind.cases) {
		const goldCase = goldByCaseId.get(blindCase.caseId);
		assert(goldCase, `missing gold case ${blindCase.caseId}`);
		assert(
			blindCase.candidateEntryIds.length > 0,
			`${blindCase.caseId} has no candidates`,
		);
		assertUnique(
			blindCase.candidateEntryIds,
			`${blindCase.caseId} candidate IDs`,
		);
		for (const entryId of blindCase.candidateEntryIds) {
			const entry = catalogById.get(entryId);
			assert(
				entry,
				`${blindCase.caseId} references unknown catalog ID ${entryId}`,
			);
			assert(
				entry.language === blindCase.language,
				`${blindCase.caseId} has a cross-language candidate`,
			);
		}
		if (goldCase.decision === "Existing") {
			assert(
				typeof goldCase.entryId === "string",
				`${goldCase.caseId} Existing requires an ID`,
			);
			assert(
				blindCase.candidateEntryIds.includes(goldCase.entryId),
				`${goldCase.caseId} gold ID is not a candidate`,
			);
			const entry = catalogById.get(goldCase.entryId);
			assert(entry, `${goldCase.caseId} gold ID is absent from catalog`);
			assert(
				stable({
					family: goldCase.family,
					subkind: goldCase.subkind,
					citationForm: goldCase.citationForm,
					inherentFeatures: goldCase.inherentFeatures,
				}) ===
					stable({
						family: entry.family,
						subkind: entry.subkind,
						citationForm: entry.citationForm,
						inherentFeatures: entry.inherentFeatures,
					}),
				`${goldCase.caseId} gold descriptor drifts from catalog`,
			);
		} else {
			assert(
				goldCase.entryId === null,
				`${goldCase.caseId} ProposeNew requires null entryId`,
			);
		}
	}

	const tags = new Set(
		blind.cases.flatMap((entryCase) => entryCase.coverageTags),
	);
	for (const tag of REQUIRED_TAGS)
		assert(tags.has(tag), `missing required coverage tag ${tag}`);
	assert(
		stable(
			countBy(blind.cases.map((entryCase) => entryCase.primaryStratum)),
		) === stable(REQUIRED_PRIMARY_STRATA),
		"primary stratum counts changed",
	);
	const assertionIds = new Set(
		gold.relationalAssertions.map((assertion) => assertion.assertionId),
	);
	for (const assertionId of REQUIRED_ASSERTIONS) {
		assert(
			assertionIds.has(assertionId),
			`missing required relational assertion ${assertionId}`,
		);
	}
	assert(
		gold.meaningIndependenceAssertions.length === 1,
		"expected one Meaning-independence assertion",
	);

	const shuffledGroups = [
		["H16-DE-001", "H16-DE-002"],
		["H16-DE-003", "H16-DE-004"],
		["H16-DE-005", "H16-DE-006"],
		["H16-RU-001", "H16-RU-002", "H16-RU-003"],
	];
	const blindByCaseId = new Map(
		blind.cases.map((entryCase) => [entryCase.caseId, entryCase]),
	);
	for (const caseIds of shuffledGroups) {
		const orders = caseIds.map((caseId) => {
			const entryCase = blindByCaseId.get(caseId);
			assert(entryCase, `missing shuffled-order case ${caseId}`);
			return entryCase.candidateEntryIds.join("|");
		});
		assert(
			new Set(orders).size === orders.length,
			`${caseIds.join(", ")} must use distinct candidate orders`,
		);
	}

	const visibleSentences = new Set(
		VISIBLE_V1_CORPUS.map((entryCase) => entryCase.sentence),
	);
	const visibleCaseIds = new Set(
		VISIBLE_V1_CORPUS.map((entryCase) => entryCase.id),
	);
	const visibleEntryIds = new Set(
		VISIBLE_V1_CORPUS.flatMap((entryCase) =>
			entryCase.candidates.map((candidate) => candidate.entryId),
		),
	);
	const sentenceOverlap = blind.cases.filter((entryCase) =>
		visibleSentences.has(entryCase.sentence),
	).length;
	const caseIdOverlap = blind.cases.filter((entryCase) =>
		visibleCaseIds.has(entryCase.caseId),
	).length;
	const entryIdOverlap = catalog.entries.filter((entry) =>
		visibleEntryIds.has(entry.entryId),
	).length;
	assert(sentenceOverlap === 0, "hidden corpus reuses a visible-v1 sentence");
	assert(caseIdOverlap === 0, "hidden corpus reuses a visible-v1 case ID");
	assert(entryIdOverlap === 0, "hidden catalog reuses a visible-v1 entry ID");

	const perfectScore = scoreEvaluation(
		gold.cases,
		blind.cases,
		gold.cases,
		catalog.entries,
		gold.relationalAssertions,
	);
	assert(
		perfectScore.totals.exactCorrect === blind.cases.length,
		"gold does not score perfectly",
	);
	assert(
		perfectScore.totals.relationsCorrect ===
			gold.relationalAssertions.length,
		"gold violates a relational assertion",
	);

	const calculatedCounts = {
		cases: blind.cases.length,
		catalogEntries: catalog.entries.length,
		languages: countBy(blind.cases.map((entryCase) => entryCase.language)),
		decisions: countBy(gold.cases.map((goldCase) => goldCase.decision)),
		primaryStrata: countBy(
			blind.cases.map((entryCase) => entryCase.primaryStratum),
		),
		relationalAssertions: gold.relationalAssertions.length,
		meaningIndependenceAssertions:
			gold.meaningIndependenceAssertions.length,
		exactVisibleSentenceOverlap: sentenceOverlap,
		exactVisibleCaseIdOverlap: caseIdOverlap,
		exactVisibleEntryIdOverlap: entryIdOverlap,
	};
	assert(
		stable(calculatedCounts) === stable(manifest.counts),
		"manifest counts do not match frozen data",
	);

	for (const [relativePath, expectedHash] of Object.entries({
		...manifest.files,
		...manifest.policySources,
	})) {
		const path = relativePath.startsWith("../")
			? `${import.meta.dir}/${relativePath}`
			: `${import.meta.dir}/${relativePath}`;
		const actualHash = await sha256(path);
		assert(
			actualHash === expectedHash,
			`SHA-256 mismatch for ${relativePath}`,
		);
	}

	console.log(
		JSON.stringify(
			{
				ok: true,
				versions: {
					blind: blind.version,
					catalog: catalog.version,
					gold: gold.version,
				},
				counts: calculatedCounts,
				hashesVerified:
					Object.keys(manifest.files).length +
					Object.keys(manifest.policySources).length,
			},
			null,
			2,
		),
	);
}

await main();
