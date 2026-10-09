/**
 * The cases `knowledge.produce` is evaluated on (#887, #873's split): one
 * per distinct Reading of a German Spec Record target, its first target's
 * Attestation and Sentence as the occurrence. A Reading several records
 * share carries one Knowledge value and is scored once (#884 ruling 2).
 *
 * - Held-out: the Readings of records reviewed to Knowledge depth, each
 *   with its gold Knowledge and coverage; scored only for finalists.
 * - Dev: the Readings of Draft records that carry a Reading layer, frozen
 *   with the git commit and a hash so concurrent review never moves a
 *   run's gold. A dev Reading that held-out also holds stays out. Dev
 *   Readings have structural gold only where a Draft holds a Knowledge
 *   layer; the rest are scored on validity and failures alone.
 * - Spot-check: the text aspects' human sample (#883 point 10): a seeded
 *   sample of dev Readings plus the six translation slips #545 named,
 *   which may not replicate.
 *
 * The sidecar's exclusions leave every set.
 */
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { isReviewed, loadSpecRecords } from "dumcorpus";
import { authoredReading, closedRoute } from "dumcorpus/inventories";
import type * as Dumcorpus from "dumcorpus/types";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { KnowledgeSentence } from "../../../src/knowledge/types.js";
import { git } from "../../git.js";
import { hashOf } from "../../segmentation/harness/jev-cache.js";
import { loadFrozenSet, storeFrozenSet } from "../frozen-sets.js";
import { readSidecar } from "../spec-corpus/gold.js";

type KnowledgeGold = {
	readonly knowledge: Dumrel.ReadingKnowledge;
	readonly coverage: Dumcorpus.KnowledgeCoverage;
};

export type KnowledgeCase = {
	/** `<record>#<target>`, or `slip:<lemma>` for a synthetic slip case. */
	readonly id: string;
	readonly record: string;
	readonly target: number;
	readonly reading: Dumling.Reading<"de">;
	readonly attestation: Dumling.Attestation<"de">;
	readonly sentence: KnowledgeSentence;
	/** The Sentence's text, for reports. */
	readonly text: string;
	/** The record's gold Knowledge and coverage, when it has a Knowledge layer. */
	readonly gold?: KnowledgeGold;
	/** A Closed Route or an exact authored Reading: tf-demo attaches its Knowledge (ADR 0021). */
	readonly authored: boolean;
	/** The Rules the record cites, for slicing. */
	readonly rules: readonly string[];
};

/** One of #545's translation slips: the case it rides on and the answers it may not give. */
export type TranslationSlip = {
	readonly caseId: string;
	readonly lemma: string;
	readonly language: Dumrel.TranslationLanguage;
	readonly rejected: readonly string[];
	readonly issue: string;
};

export type KnowledgeSetName = "dev" | "heldout" | "spot-check";

export type KnowledgeSet = {
	readonly name: KnowledgeSetName;
	readonly createdAt: string;
	readonly gitHead: string;
	/** Uncommitted changes under battery/dumcorpus/records when frozen. */
	readonly dirtyRecordFiles: number;
	readonly hash: string;
	readonly cases: readonly KnowledgeCase[];
	/** The spot-check set's slips (#545). */
	readonly slips?: readonly TranslationSlip[];
};

type Target = Dumcorpus.SpecRecord["targets"][number];

/** A target's Reading, gold and Attestation as the loader gives them. */
type LoadedTarget = Target & {
	readonly reading?: Dumling.Reading<"de">;
	readonly knowledge?: Dumrel.ReadingKnowledge;
	readonly coverage?: Dumcorpus.KnowledgeCoverage;
	readonly attestation?: Dumling.Attestation<"de">;
};

const isAuthored = (reading: Dumling.Reading<"de">) =>
	closedRoute(reading.lemma) || authoredReading(reading) !== undefined;

/** The cases of one record, one per target with a Reading. */
function casesOf(record: Dumcorpus.SpecRecord): KnowledgeCase[] {
	const segments = record.segments.map(({ text }) => ({ text }));
	return (record.targets as readonly LoadedTarget[]).flatMap(
		(target, index) => {
			const { reading, attestation } = target;
			if (!reading || !attestation) return [];
			return [
				{
					id: `${record.id}#${index}`,
					record: record.id,
					target: index,
					reading,
					attestation,
					sentence: {
						segments,
						target: [...target.memberSegmentIndices],
					},
					text: record.sentence,
					...(target.coverage
						? {
								gold: {
									knowledge: target.knowledge ?? {},
									coverage: target.coverage,
								},
							}
						: {}),
					authored: isAuthored(reading),
					rules: record.sources.rules.map(({ rule }) => rule),
				},
			];
		},
	);
}

/** A Reading's identity: one case per Reading (#884 ruling 2). */
const readingKeyOf = (goldCase: Pick<KnowledgeCase, "reading">) =>
	readingIdentityKey(goldCase.reading);

/** The first case of each Reading, skipping the Readings in `taken`. */
function distinct(
	cases: readonly KnowledgeCase[],
	taken: ReadonlySet<string> = new Set(),
): KnowledgeCase[] {
	const seen = new Set(taken);
	return cases.filter((goldCase) => {
		const key = readingKeyOf(goldCase);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Held-out and dev from today's records. */
export function knowledgeCases(
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
	excluded: ReadonlySet<string> = new Set(
		Object.keys(readSidecar().exclusions),
	),
): Readonly<Record<"dev" | "heldout", readonly KnowledgeCase[]>> {
	const german = records.filter(
		(record) => record.language === "de" && !excluded.has(record.id),
	);
	const heldout = distinct(
		german
			.filter((record) => isReviewed(record, "Knowledge"))
			.flatMap(casesOf),
	);
	const dev = distinct(
		german
			.filter((record) => record.reviewDepth === undefined)
			.flatMap(casesOf),
		new Set(heldout.map(readingKeyOf)),
	);
	return { dev, heldout };
}

/** Dev Readings the spot-check samples, besides the slips. */
const spotCheckSampleSize = 30;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

type SyntheticSlip = {
	readonly record: string;
	readonly sentence: string;
	readonly target: readonly string[];
	/** The target's Attestation, one member per word of `target`. */
	readonly attestation: Dumling.Attestation<"de">;
	readonly emojiDescription: string;
};

/**
 * #545's six slips. Four ride on a record's target; *schmecken* and
 * *Paket* come only from imported cases with no target, so their spot-check
 * cases are built here from the record's Sentence, with a Reading the
 * slip's sense names.
 */
const slipSpecs: readonly (Omit<TranslationSlip, "caseId"> & {
	readonly record: string;
	readonly synthetic?: SyntheticSlip;
})[] = [
	{
		record: "de/der-heisse-kakao-schmeckt-gut",
		lemma: "schmecken",
		language: "en",
		rejected: ["taste good", "tastes good"],
		issue: "schmeckt → taste good",
		synthetic: {
			record: "de/der-heisse-kakao-schmeckt-gut",
			sentence: "Der heiße Kakao schmeckt gut.",
			target: ["schmeckt"],
			attestation: {
				unitKind: "Attestation",
				surface: {
					unitKind: "Surface",
					language: "de",
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: "Lexeme",
						kind: "VERB",
						canonicalForm: "schmecken",
						coreFeatures: {
							hasSepPrefix: null,
							lexicallyReflexive: null,
						},
					},
					normalizedSurface: "schmeckt",
					spelling: { kind: "Canonical" },
					surfaceFeatures: null,
					inflectionalFeatures: {
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
						verbForm: "Fin",
						expletive: null,
						perfect: null,
						future: null,
						voice: null,
						passive: null,
					},
				},
				members: [{ attested: "schmeckt", orthography: "Standard" }],
				realizationCoverage: "Full",
				expletiveEvidence: null,
				valencyEvidence: [],
			} satisfies Dumling.Attestation<"de", "Lexeme", "VERB">,
			emojiDescription: "👅",
		},
	},
	{
		record: "de/das-paket-wird-morgen-geliefert",
		lemma: "Paket",
		language: "ru",
		rejected: ["пакет"],
		issue: "Paket → пакет, a false friend",
		synthetic: {
			record: "de/das-paket-wird-morgen-geliefert",
			sentence: "Das Paket wird morgen geliefert.",
			target: ["Das", "Paket"],
			attestation: {
				unitKind: "Attestation",
				surface: {
					unitKind: "Surface",
					language: "de",
					lemma: {
						unitKind: "Lemma",
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Paket",
						coreFeatures: { gender: "Neut" },
					},
					normalizedSurface: "Das Paket",
					spelling: { kind: "Canonical" },
					surfaceFeatures: null,
					inflectionalFeatures: {
						case: "Nom",
						gender: "Neut",
						number: "Sing",
					},
				},
				members: [
					{ attested: "Das", orthography: "Standard" },
					{ attested: "Paket", orthography: "Standard" },
				],
				realizationCoverage: "Full",
				articleEvidence: { kind: "Owned", member: 0 },
				valencyEvidence: [],
			} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">,
			emojiDescription: "📦",
		},
	},
	{
		record: "de/durch-die-akten-wurde-endlich-licht-ins-dunkel-gebracht",
		lemma: "Licht ins Dunkel bringen",
		language: "en",
		rejected: ["bring to light", "bring something to light"],
		issue: "Licht ins Dunkel bringen → bring to light (ans Licht bringen)",
	},
	{
		record: "de/dipl-ing-mueller-leitet-das-projekt",
		lemma: "Diplom-Ingenieur",
		language: "ru",
		rejected: ["инженер-дипломант"],
		issue: "Dipl.-Ing. → инженер-дипломант",
	},
	{
		record: "de/du-hast-heute-wohl-tomaten-auf-den-augen",
		lemma: "Tomaten auf den Augen haben",
		language: "en",
		rejected: [
			"have tomatoes on one's eyes",
			"have tomatoes on your eyes",
			"have tomatoes on the eyes",
		],
		issue: "Tomaten auf den Augen haben → the calque",
	},
	{
		record: "de/das-essen-war-ganz-gut",
		lemma: "gut",
		language: "ru",
		rejected: ["вкусный"],
		issue: "gut → вкусный",
	},
];

/** A synthetic slip case, its Sentence cut into words and spaces. */
function syntheticCase(slip: SyntheticSlip): KnowledgeCase {
	const words = slip.sentence.split(/(\s+|[.,!?])/u).filter(Boolean);
	const target = slip.target.map((word) => words.indexOf(word));
	if (target.some((index) => index < 0))
		throw Error(`${slip.target.join(" ")} is not in ${slip.sentence}`);
	const { lemma } = slip.attestation.surface;
	const reading = {
		unitKind: "Reading",
		lemma,
		emojiDescription: slip.emojiDescription,
	} as Dumling.Reading<"de">;
	return {
		id: `slip:${lemma.canonicalForm}`,
		record: slip.record,
		target: 0,
		reading,
		attestation: slip.attestation,
		sentence: { segments: words.map((text) => ({ text })), target },
		text: slip.sentence,
		authored: false,
		rules: [],
	};
}

/**
 * The spot-check set: the six slip cases and a seeded sample of dev's open
 * Readings, so a human checks each text aspect on the same cases every
 * round.
 */
export function spotCheckCases(
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
	dev: readonly KnowledgeCase[] = knowledgeCases(records).dev,
	seed = 887,
): { readonly cases: KnowledgeCase[]; readonly slips: TranslationSlip[] } {
	const slips: TranslationSlip[] = [];
	const slipCases: KnowledgeCase[] = [];
	for (const spec of slipSpecs) {
		const goldCase = spec.synthetic
			? syntheticCase(spec.synthetic)
			: records
					.filter((record) => record.id === spec.record)
					.flatMap(casesOf)
					.find(
						({ reading }) =>
							reading.lemma.canonicalForm === spec.lemma,
					);
		if (!goldCase)
			throw Error(`No ${spec.lemma} target in ${spec.record} for #545`);
		const { synthetic: _synthetic, record: _record, ...slip } = spec;
		slips.push({ ...slip, caseId: goldCase.id });
		slipCases.push(goldCase);
	}
	const taken = new Set(slipCases.map(readingKeyOf));
	const sample = dev
		.filter(
			(goldCase) =>
				!goldCase.authored && !taken.has(readingKeyOf(goldCase)),
		)
		.map((goldCase) => ({ goldCase, rank: sha(`${seed}:${goldCase.id}`) }))
		.sort((left, right) => (left.rank < right.rank ? -1 : 1))
		.slice(0, spotCheckSampleSize)
		.map(({ goldCase }) => goldCase);
	return { cases: [...slipCases, ...sample], slips };
}

/** Which aspects a run asks for: the structural ones, or the text ones. */
export type KnowledgeScope = "structural" | "text";

const structuralAspects = new Set([
	"plural",
	"valency",
	"participleSource",
	"conjugationClass",
	"locutionType",
	"sayingType",
	"formulaRole",
	"semanticRelations",
]);
const textAspects = new Set(["transcription", "definition", "translations"]);

/** The request a case's run sends: its route's applicable aspects of `scope`. */
export function requestOf(
	goldCase: Pick<KnowledgeCase, "reading">,
	scope: KnowledgeScope,
): Dumrel.KnowledgeRequestMask {
	const { language, family, kind } = goldCase.reading.lemma;
	const selected = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
	if (!selected.success) return {};
	const wanted = scope === "structural" ? structuralAspects : textAspects;
	return Object.fromEntries(
		Object.entries(selected.value).filter(([aspect]) => wanted.has(aspect)),
	) as Dumrel.KnowledgeRequestMask;
}

/** The tracked frozen sets (`frozen-sets.ts`). */
export const trackedKnowledgeSetsRoot = fileURLToPath(
	new URL("../../../evidence/knowledge/sets/", import.meta.url),
);

/**
 * Freezes into `root` dev, held-out and the spot-check set from today's records. A
 * refreeze keeps the set it replaces beside it under its hash, so a run is
 * always scored against the set it ran on.
 */
export async function freezeKnowledgeSets(
	root: string,
	repository: string,
	records: readonly Dumcorpus.SpecRecord[] = loadSpecRecords(),
): Promise<KnowledgeSet[]> {
	const gitHead = git(["rev-parse", "HEAD"], repository);
	const dirtyRecordFiles = git(
		["status", "--porcelain", "--", "battery/dumcorpus/records"],
		repository,
	)
		.split("\n")
		.filter(Boolean).length;
	const { dev, heldout } = knowledgeCases(records);
	const spot = spotCheckCases(records, dev);
	const sets: KnowledgeSet[] = [];
	for (const [name, cases, slips] of [
		["dev", dev, undefined],
		["heldout", heldout, undefined],
		["spot-check", spot.cases, spot.slips],
	] as const) {
		const set: KnowledgeSet = {
			name,
			createdAt: new Date().toISOString(),
			gitHead,
			dirtyRecordFiles,
			hash: hashOf({ cases, slips: slips ?? [] }).slice(0, 16),
			cases,
			...(slips ? { slips } : {}),
		};
		await storeFrozenSet(root, set);
		sets.push(set);
	}
	return sets;
}

/** The frozen set `name`, or the replaced set of `hash`. */
export const loadKnowledgeSet = (
	root: string,
	name: KnowledgeSetName,
	hash?: string,
): Promise<KnowledgeSet> =>
	loadFrozenSet<KnowledgeSet>(
		root,
		name,
		hash,
		"bun cli/knowledge.ts freeze",
	);
