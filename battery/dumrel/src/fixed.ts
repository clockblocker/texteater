import {
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	fixedMembersFor,
} from "dumling/fixed";
import type { Lemma, Reading } from "dumling/types";
import type { ReadingKnowledge } from "./types.js";

type AuxLemma = Lemma<"de", "Lexeme", "AUX">;
type AuxReading = Reading<"de", "Lexeme", "AUX">;
type DetLemma = Lemma<"de", "Lexeme", "DET">;
type DetReading = Reading<"de", "Lexeme", "DET">;

export type FixedKnowledgeCoverageState =
	| "Authored"
	| "ReviewedEmpty"
	| "Unauthored";

export type FixedKnowledgeCoverage = Readonly<{
	transcription: "Unauthored";
	definition: "Authored";
	translations: Readonly<{ en: "Authored" }>;
	semanticRelations: Readonly<{
		synonym: "Authored" | "ReviewedEmpty";
		nearSynonym: "ReviewedEmpty";
		antonym: "ReviewedEmpty";
		nearAntonym: "ReviewedEmpty";
	}>;
}>;

/**
 * Default authored coverage for the DET v1 slice. Definite-article Readings
 * override synonym coverage below; all remaining empty relation buckets were
 * reviewed and deliberately produce no direct relation claims.
 */
export const DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	transcription: "Unauthored",
	definition: "Authored",
	translations: { en: "Authored" },
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_DET_V1_ARTICLE_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelations: {
		...DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE.semanticRelations,
		synonym: "Authored",
	},
} as const satisfies FixedKnowledgeCoverage);

/** Default authored coverage for fixed German AUX Readings. */
export const DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	transcription: "Unauthored",
	definition: "Authored",
	translations: { en: "Authored" },
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_AUX_V1_SEIN_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelations: {
		...DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE.semanticRelations,
		synonym: "Authored",
	},
} as const satisfies FixedKnowledgeCoverage);

export type FixedKnowledgeLookup =
	| Readonly<{
			decision: "Found";
			scope: string;
			coverage: FixedKnowledgeCoverage;
			knowledge: ReadingKnowledge<"en">;
	  }>
	| Readonly<{
			decision: "Miss";
			reason: "MemberNotCatalogued" | "InventoryNotLoaded";
	  }>;

/** Finds ordinary hand-authored Knowledge for one exact ordinary Reading. */
export function fixedKnowledgeFor(reading: Reading): FixedKnowledgeLookup {
	const readingCatalog = fixedMembersFor.reading(reading.lemma);
	if (!readingCatalog) return INVENTORY_NOT_LOADED;
	const catalogued = readingCatalog.members.find((candidate) =>
		sameCanonicalValue(candidate, reading),
	);
	if (!catalogued) return MEMBER_NOT_CATALOGUED;
	if (catalogued.lemma.family !== "Lexeme") {
		return MEMBER_NOT_CATALOGUED;
	}
	if (catalogued.lemma.kind === "AUX") {
		const auxReading = catalogued as AuxReading;
		return deepFreeze({
			decision: "Found",
			scope: FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
			coverage: isPromotedSeinPeer(auxReading.lemma)
				? DE_LEXEME_AUX_V1_SEIN_FIXED_KNOWLEDGE_COVERAGE
				: DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
			knowledge: authoredAuxKnowledgeFor(auxReading),
		});
	}
	if (catalogued.lemma.kind !== "DET") return MEMBER_NOT_CATALOGUED;
	const detReading = catalogued as DetReading;
	return deepFreeze({
		decision: "Found",
		scope: FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
		coverage: isPromotedDefiniteArticle(detReading.lemma)
			? DE_LEXEME_DET_V1_ARTICLE_FIXED_KNOWLEDGE_COVERAGE
			: DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
		knowledge: authoredDetKnowledgeFor(detReading),
	});
}

const MEMBER_NOT_CATALOGUED = Object.freeze({
	decision: "Miss" as const,
	reason: "MemberNotCatalogued" as const,
});
const INVENTORY_NOT_LOADED = Object.freeze({
	decision: "Miss" as const,
	reason: "InventoryNotLoaded" as const,
});

const englishGlosses = {
	der: ["the"],
	die: ["the"],
	das: ["the"],
	ein: ["a", "an"],
	mein: ["my"],
	dein: ["your"],
	Ihr: ["your (formal)"],
	sein: ["his", "its"],
	ihr: ["her", "their"],
	unser: ["our"],
	euer: ["your (plural)"],
	derjenige: ["the one"],
	derselbe: ["the same"],
	dieser: ["this"],
	jener: ["that"],
	solcher: ["such"],
	derlei: ["this kind of"],
	selber: ["the same"],
	welcher: ["which"],
	welch: ["what a"],
	wieviel: ["how much", "how many"],
	"was für ein": ["what kind of a"],
	wievielte: ["which numbered"],
	einige: ["some"],
	etliche: ["several"],
	irgendein: ["some"],
	irgendwelcher: ["any"],
	mancher: ["many a"],
	mehrere: ["several"],
	lauter: ["nothing but"],
	manch: ["many a"],
	etwelcher: ["some"],
	viel: ["much", "many"],
	meist: ["most"],
	mehr: ["more"],
	wenig: ["little", "few"],
	kein: ["no", "not a"],
	alle: ["all"],
	jeder: ["every"],
	jedweder: ["each and every"],
	sämtlich: ["all"],
	beide: ["both"],
} as const satisfies Record<string, readonly [string, ...string[]]>;

function authoredDetKnowledgeFor(
	reading: Reading<"de", "Lexeme", "DET">,
): ReadingKnowledge<"en"> {
	const canonicalForm = reading.lemma.canonicalForm;
	const translations =
		englishGlosses[canonicalForm as keyof typeof englishGlosses];
	if (!translations) {
		throw new Error(
			`Missing English gloss for fixed DET ${canonicalForm}.`,
		);
	}
	const semanticRelations = detSemanticRelationsFor(reading.lemma);
	return deepFreeze({
		definition: definitionFor(reading),
		translations: { en: [...translations] },
		...(semanticRelations === undefined ? {} : { semanticRelations }),
	} satisfies ReadingKnowledge<"en">);
}

const promotedDefiniteArticleForms = new Set(["der", "die", "das"]);

function isPromotedDefiniteArticle(lemma: DetLemma): boolean {
	return (
		lemma.coreFeatures.definite === "Def" &&
		lemma.coreFeatures.pronType === "Art" &&
		promotedDefiniteArticleForms.has(lemma.canonicalForm)
	);
}

function detSemanticRelationsFor(
	lemma: DetLemma,
): ReadingKnowledge<"en", DetLemma>["semanticRelations"] | undefined {
	if (!isPromotedDefiniteArticle(lemma)) return undefined;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "DET",
	});
	const synonyms = catalog?.members.filter(
		(candidate) =>
			isPromotedDefiniteArticle(candidate) &&
			candidate.canonicalForm !== lemma.canonicalForm,
	);
	if (synonyms?.length !== 2) {
		throw new Error(
			`Expected two fixed definite-article synonyms for ${lemma.canonicalForm}.`,
		);
	}
	return { synonym: [...synonyms] };
}

const auxEnglishGlosses = {
	sein: ["be"],
	bin: ["am"],
	bist: ["are"],
	ist: ["is"],
	sind: ["are"],
	seid: ["are"],
	haben: ["have"],
	werden: ["become", "will"],
	dürfen: ["may"],
	können: ["can"],
	mögen: ["like", "may"],
	müssen: ["must"],
	sollen: ["should"],
	wollen: ["want"],
} as const satisfies Record<string, readonly [string, ...string[]]>;

function authoredAuxKnowledgeFor(reading: AuxReading): ReadingKnowledge<"en"> {
	const canonicalForm = reading.lemma.canonicalForm;
	const translations =
		auxEnglishGlosses[canonicalForm as keyof typeof auxEnglishGlosses];
	if (!translations) {
		throw new Error(
			`Missing English gloss for fixed AUX ${canonicalForm}.`,
		);
	}
	const semanticRelations = auxSemanticRelationsFor(reading.lemma);
	return deepFreeze({
		definition: auxDefinitionFor(reading),
		translations: { en: [...translations] },
		...(semanticRelations === undefined ? {} : { semanticRelations }),
	} satisfies ReadingKnowledge<"en">);
}

const promotedSeinPeerForms = new Set([
	"sein",
	"bin",
	"bist",
	"ist",
	"sind",
	"seid",
]);

function isPromotedSeinPeer(lemma: AuxLemma): boolean {
	return (
		lemma.coreFeatures.verbType === null &&
		promotedSeinPeerForms.has(lemma.canonicalForm)
	);
}

function auxSemanticRelationsFor(
	lemma: AuxLemma,
): ReadingKnowledge<"en", AuxLemma>["semanticRelations"] | undefined {
	if (!isPromotedSeinPeer(lemma)) return undefined;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "AUX",
	});
	const synonyms = catalog?.members.filter(
		(candidate) =>
			isPromotedSeinPeer(candidate) &&
			candidate.canonicalForm !== lemma.canonicalForm,
	);
	if (synonyms?.length !== 5) {
		throw new Error(
			`Expected five fixed sein-peer synonyms for ${lemma.canonicalForm}.`,
		);
	}
	return { synonym: [...synonyms] };
}

function auxDefinitionFor(reading: AuxReading): string {
	const canonicalForm = reading.lemma.canonicalForm;
	if (isPromotedSeinPeer(reading.lemma)) {
		return `Das Auxiliar „${canonicalForm}“ bezeichnet dieselbe Identität wie „sein“ in einer eigenständigen grammatischen Form.`;
	}
	return reading.lemma.coreFeatures.verbType === "Mod"
		? `Das Modalauxiliar „${canonicalForm}“ modifiziert die Geltung oder Möglichkeit einer Handlung.`
		: `Das Auxiliar „${canonicalForm}“ bildet eine grammatische Verbkonstruktion.`;
}

function definitionFor(reading: Reading<"de", "Lexeme", "DET">): string {
	const { canonicalForm, coreFeatures } = reading.lemma;
	switch (coreFeatures.pronType) {
		case "Art":
			return coreFeatures.definite === "Def"
				? `Der bestimmte Artikel „${canonicalForm}“ kennzeichnet einen bestimmten Bezug.`
				: `Der unbestimmte Artikel „${canonicalForm}“ führt einen nicht näher bestimmten Bezug ein.`;
		case "Prs":
			return `Der Possessivartikel „${canonicalForm}“ ordnet den bezeichneten Gegenstand einer Person oder Gruppe zu.`;
		case "Dem":
			return `Der Demonstrativartikel „${canonicalForm}“ hebt einen bestimmten Bezug hervor.`;
		case "Emp":
			return `Der emphatische Determinierer „${canonicalForm}“ markiert Identität mit einem bereits bestimmten Bezug.`;
		case "Int":
			return `Der interrogative Determinierer „${canonicalForm}“ fragt nach Auswahl oder Menge.`;
		case "Rel":
			return `Der relative Determinierer „${canonicalForm}“ verbindet einen Bezug mit einer weiterführenden Aussage.`;
		case "Exc":
			return `Der exklamative Determinierer „${canonicalForm}“ leitet eine hervorhebende Ausrufkonstruktion ein.`;
		case "Neg":
			return `Der negative Determinierer „${canonicalForm}“ verneint das Vorhandensein des bezeichneten Bezugs.`;
		case "Tot":
			return `Der totalisierende Determinierer „${canonicalForm}“ erfasst die bezeichnete Menge vollständig.`;
		default:
			return `Der quantifizierende Determinierer „${canonicalForm}“ grenzt die Menge der bezeichneten Bezüge ein.`;
	}
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object" ||
		Array.isArray(left) !== Array.isArray(right)
	) {
		return false;
	}
	const leftRecord = left as Readonly<Record<string, unknown>>;
	const rightRecord = right as Readonly<Record<string, unknown>>;
	const leftKeys = Object.keys(leftRecord);
	const rightKeys = Object.keys(rightRecord);
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key) =>
				Object.hasOwn(rightRecord, key) &&
				sameCanonicalValue(leftRecord[key], rightRecord[key]),
		)
	);
}
