import {
	allFixedReadingCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	fixedMembersFor,
} from "dumling/fixed";
import type { Lemma, Reading } from "dumling/types";
import type {
	LexemeUnitShadow,
	ReadingKnowledge,
	SemanticRelations,
} from "./types.js";

type FixedReadingKnowledge = ReadingKnowledge<
	"en",
	Lemma,
	LexemeUnitShadow,
	Reading
>;

type AuxLemma = Lemma<"de", "Lexeme", "AUX">;
type AuxReading = Reading<"de", "Lexeme", "AUX">;
type DetLemma = Lemma<"de", "Lexeme", "DET">;
type DetReading = Reading<"de", "Lexeme", "DET">;
type PronounReading = Reading<"de", "Lexeme", "PRON">;

export type FixedKnowledgeCoverageState =
	| "Authored"
	| "ReviewedEmpty"
	| "Unauthored";

export type FixedKnowledgeCoverage = Readonly<{
	transcription: "Unauthored";
	definition: "Authored";
	translations: Readonly<{ en: "Authored" }>;
	semanticRelationTargetKind: "lemma" | "reading";
	semanticRelations: Readonly<{
		synonym: "Authored" | "ReviewedEmpty";
		nearSynonym: "Authored" | "ReviewedEmpty";
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
	semanticRelationTargetKind: "lemma",
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_DET_V1_ARTICLE_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelationTargetKind: "reading",
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
	semanticRelationTargetKind: "lemma",
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
	},
} as const satisfies FixedKnowledgeCoverage);

/** Authored Knowledge coverage for every fixed German personal PRON Reading. */
export const DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	transcription: "Unauthored",
	definition: "Authored",
	translations: { en: "Authored" },
	semanticRelationTargetKind: "lemma",
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_PRON_KEINER_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelations: {
		...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE.semanticRelations,
		nearSynonym: "Authored",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_PRON_JEDWEDER_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelations: {
		...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE.semanticRelations,
		synonym: "Authored",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_PRON_DER_PARADIGM_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelationTargetKind: "reading",
	semanticRelations: {
		...DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE.semanticRelations,
		synonym: "Authored",
	},
} as const satisfies FixedKnowledgeCoverage);

const DE_LEXEME_AUX_V1_SEIN_FIXED_KNOWLEDGE_COVERAGE = deepFreeze({
	...DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE,
	semanticRelationTargetKind: "reading",
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
			knowledge: FixedReadingKnowledge;
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
	if (catalogued.lemma.kind === "PRON") {
		const pronounReading = catalogued as PronounReading;
		return deepFreeze({
			decision: "Found",
			scope: FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
			coverage: isDerParadigmPronoun(pronounReading.lemma)
				? DE_LEXEME_PRON_DER_PARADIGM_FIXED_KNOWLEDGE_COVERAGE
				: pronounReading.lemma.canonicalForm === "keiner"
					? DE_LEXEME_PRON_KEINER_FIXED_KNOWLEDGE_COVERAGE
					: ["jedweder", "jeglicher"].includes(
								pronounReading.lemma.canonicalForm,
							)
						? DE_LEXEME_PRON_JEDWEDER_FIXED_KNOWLEDGE_COVERAGE
						: DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE,
			knowledge: authoredPronounKnowledgeFor(pronounReading),
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
): FixedReadingKnowledge {
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
	} satisfies FixedReadingKnowledge);
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
): SemanticRelations<DetLemma, DetReading> | undefined {
	if (!isPromotedDefiniteArticle(lemma)) return undefined;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "DET",
	});
	const synonymLemmas = catalog?.members.filter(
		(candidate) =>
			isPromotedDefiniteArticle(candidate) &&
			candidate.canonicalForm !== lemma.canonicalForm,
	);
	if (synonymLemmas?.length !== 2) {
		throw new Error(
			`Expected two fixed definite-article synonyms for ${lemma.canonicalForm}.`,
		);
	}
	const synonymReadings = allFixedReadingCatalogs()
		.find(
			(candidate) =>
				candidate.scope === FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
		)
		?.members.filter((candidate) =>
			synonymLemmas.includes(candidate.lemma as DetLemma),
		);
	if (synonymReadings?.length !== 2) {
		throw new Error(
			`Expected one fixed Reading for each definite-article synonym of ${lemma.canonicalForm}.`,
		);
	}
	return {
		targetKind: "reading",
		synonym: synonymReadings as DetReading[],
	};
}

function exactFixedReadingForLemma<L extends Lemma>(lemma: L): Reading {
	const readings = fixedMembersFor.reading(lemma);
	if (readings?.members.length !== 1) {
		throw new Error(
			`Expected one fixed Reading for ${lemma.canonicalForm}.`,
		);
	}
	return readings.members[0] as Reading;
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

function authoredAuxKnowledgeFor(reading: AuxReading): FixedReadingKnowledge {
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
	} satisfies FixedReadingKnowledge);
}

function authoredPronounKnowledgeFor(
	reading: PronounReading,
): FixedReadingKnowledge {
	const semanticRelations = pronounSemanticRelationsFor(reading.lemma);
	return deepFreeze({
		definition: pronounDefinitionFor(reading),
		translations: { en: [...pronounEnglishTranslationsFor(reading)] },
		...(semanticRelations === undefined ? {} : { semanticRelations }),
	} satisfies FixedReadingKnowledge);
}

function pronounSemanticRelationsFor(
	lemma: PronounReading["lemma"],
): SemanticRelations<PronounReading["lemma"], PronounReading> | undefined {
	if (
		["jedweder", "jeglicher"].includes(lemma.canonicalForm) &&
		lemma.coreFeatures.pronType === "Tot"
	) {
		const jeder = fixedMembersFor
			.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
			?.members.filter(
				(candidate) =>
					candidate.canonicalForm === "jeder" &&
					candidate.coreFeatures.pronType === "Tot",
			);
		if (jeder?.length !== 1) {
			throw new Error(
				`Expected one fixed jeder PRON Synonym target for ${lemma.canonicalForm}.`,
			);
		}
		return { targetKind: "lemma", synonym: jeder };
	}
	if (isDerParadigmPronoun(lemma)) {
		const catalog = fixedMembersFor.lemma({
			language: "de",
			family: "Lexeme",
			kind: "PRON",
		});
		const synonyms = catalog?.members.filter(
			(candidate) =>
				candidate.coreFeatures.pronType ===
					lemma.coreFeatures.pronType &&
				candidate.canonicalForm !== lemma.canonicalForm,
		);
		if (synonyms?.length !== 7) {
			throw new Error(
				`Expected seven fixed ${lemma.coreFeatures.pronType} PRON Synonyms for ${lemma.canonicalForm}.`,
			);
		}
		return {
			targetKind: "reading",
			synonym: synonyms.map(
				exactFixedReadingForLemma,
			) as PronounReading[],
		};
	}
	if (
		lemma.canonicalForm !== "keiner" ||
		lemma.coreFeatures.pronType !== "Neg"
	)
		return undefined;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	});
	const nearSynonyms = catalog?.members.filter(
		(candidate) =>
			candidate.coreFeatures.pronType === "Neg" &&
			["niemand", "nichts"].includes(candidate.canonicalForm),
	);
	if (nearSynonyms?.length !== 2) {
		throw new Error("Expected fixed niemand and nichts Near Synonyms.");
	}
	return { targetKind: "lemma", nearSynonym: nearSynonyms };
}

function isDerParadigmPronoun(lemma: PronounReading["lemma"]): boolean {
	return (
		(lemma.coreFeatures.pronType === "Dem" ||
			lemma.coreFeatures.pronType === "Rel") &&
		[
			"der",
			"die",
			"das",
			"den",
			"dem",
			"dessen",
			"deren",
			"denen",
		].includes(lemma.canonicalForm)
	);
}

function pronounDefinitionFor(reading: PronounReading): string {
	const { canonicalForm, coreFeatures } = reading.lemma;
	if (canonicalForm === "mehrere" && coreFeatures.pronType === "Tot") {
		return "Das Totalpronomen „mehrere“ bezeichnet eine unbestimmte Mehrzahl von Personen oder Sachen.";
	}
	if (coreFeatures.pronType === "Dem") {
		return `Das Demonstrativpronomen „${canonicalForm}“ verweist betont auf eine im Kontext bestimmte Person oder Sache.`;
	}
	if (coreFeatures.pronType === "Rel") {
		return `Das Relativpronomen „${canonicalForm}“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort.`;
	}
	if (canonicalForm === "jemand" && coreFeatures.pronType === "Ind") {
		return "Das Indefinitpronomen „jemand“ verweist auf eine nicht näher bestimmte Person.";
	}
	if (canonicalForm === "niemand" && coreFeatures.pronType === "Neg") {
		return "Das Negativpronomen „niemand“ bezeichnet keine Person.";
	}
	if (canonicalForm === "nichts" && coreFeatures.pronType === "Neg") {
		return "Das Negativpronomen „nichts“ verneint das Vorhandensein einer Sache.";
	}
	if (canonicalForm === "jeder" && coreFeatures.pronType === "Tot") {
		return "Das Totalpronomen „jeder“ bezeichnet jedes einzelne Mitglied einer Gruppe.";
	}
	if (canonicalForm === "jedweder" && coreFeatures.pronType === "Tot") {
		return "Das gehoben oder veraltet wirkende Totalpronomen „jedweder“ bezeichnet nachdrücklich jedes einzelne Mitglied einer Gruppe.";
	}
	if (canonicalForm === "jeglicher" && coreFeatures.pronType === "Tot") {
		return "Das gehoben wirkende Totalpronomen „jeglicher“ bezeichnet jedes einzelne Mitglied einer Gruppe und kann auch pluralisch gebraucht werden.";
	}
	if (canonicalForm === "keiner" && coreFeatures.pronType === "Neg") {
		return "Das Negativpronomen „keiner“ verneint die Zugehörigkeit zu einer im Kontext bestimmten Menge und kann sich auf Personen oder Sachen beziehen.";
	}
	if (canonicalForm === "jedermann" && coreFeatures.pronType === "Tot") {
		return "Das Totalpronomen „jedermann“ bezeichnet ausnahmslos jede Person einer betrachteten Gruppe.";
	}
	if (canonicalForm === "mancher" && coreFeatures.pronType === "Tot") {
		return "Das Totalpronomen „mancher“ bezeichnet einen nicht vollständigen Teil einer im Kontext bestimmten Menge.";
	}
	if (coreFeatures.pronType === "Int") {
		return `Das Interrogativpronomen „${canonicalForm}“ fragt nach einer Person in der durch seine Form ausgedrückten Kasusrolle.`;
	}
	if (coreFeatures.pronType === "Tot") {
		return canonicalForm === "alles"
			? "Das Totalpronomen „alles“ bezeichnet die Gesamtheit in der Einzahl."
			: "Das Totalpronomen „alle“ bezeichnet die Gesamtheit in der Mehrzahl.";
	}
	if (canonicalForm === "sich" && reading.emojiDescription === "🪞") {
		return "Das Reflexivpronomen „sich“ verweist in der dritten Person auf den Bezug des Subjekts zurück.";
	}
	const reference = germanReferenceDescription(coreFeatures);
	return coreFeatures.poss === "Yes"
		? `Das substantivische Possessivpronomen „${canonicalForm}“ bezeichnet etwas, das ${reference} zugeordnet ist.`
		: `Die Personalpronomenform „${canonicalForm}“ verweist auf ${reference}.`;
}

function germanReferenceDescription(
	features: PronounReading["lemma"]["coreFeatures"],
): string {
	if (features.polite === "Form") {
		if (features.referenceNumber === "Sing")
			return "eine höflich angesprochene Person";
		if (features.referenceNumber === "Plur")
			return "mehrere höflich angesprochene Personen";
		return "eine höflich angesprochene Person oder Gruppe";
	}
	const number = features.referenceNumber === "Plur" ? "Mehrzahl" : "Einzahl";
	if (features.person === "1") return `die sprechende ${number}`;
	if (features.person === "2") return `die angesprochene ${number}`;
	const gender =
		features.referenceGender === "Masc"
			? "männliche "
			: features.referenceGender === "Fem"
				? "weibliche "
				: features.referenceGender === "Neut"
					? "sächliche "
					: "";
	return `die ${gender}dritte Person ${number}`;
}

function pronounEnglishTranslationsFor(
	reading: PronounReading,
): readonly [string, ...string[]] {
	const { canonicalForm, coreFeatures } = reading.lemma;
	if (canonicalForm === "mehrere" && coreFeatures.pronType === "Tot") {
		return ["several", "multiple"];
	}
	if (coreFeatures.pronType === "Dem") return ["that one", "this one"];
	if (coreFeatures.pronType === "Rel") return ["who", "which", "that"];
	if (canonicalForm === "jemand" && coreFeatures.pronType === "Ind") {
		return ["someone", "somebody"];
	}
	if (canonicalForm === "niemand" && coreFeatures.pronType === "Neg") {
		return ["nobody", "no one"];
	}
	if (canonicalForm === "nichts" && coreFeatures.pronType === "Neg") {
		return ["nothing"];
	}
	if (canonicalForm === "jeder" && coreFeatures.pronType === "Tot") {
		return ["everyone", "each"];
	}
	if (canonicalForm === "jedweder" && coreFeatures.pronType === "Tot") {
		return ["each and every", "everyone"];
	}
	if (canonicalForm === "jeglicher" && coreFeatures.pronType === "Tot") {
		return ["each", "any", "every one"];
	}
	if (canonicalForm === "keiner" && coreFeatures.pronType === "Neg") {
		return ["none", "no one"];
	}
	if (canonicalForm === "jedermann" && coreFeatures.pronType === "Tot") {
		return ["everyone", "everybody"];
	}
	if (canonicalForm === "mancher" && coreFeatures.pronType === "Tot") {
		return ["some", "many a one"];
	}
	if (coreFeatures.pronType === "Int") {
		if (canonicalForm === "wer") return ["who"];
		if (canonicalForm === "wen" || canonicalForm === "wem") return ["whom"];
		if (canonicalForm === "wessen") return ["whose"];
	}
	if (coreFeatures.pronType === "Tot") {
		if (canonicalForm === "alles") return ["everything", "all"];
		if (canonicalForm === "alle") return ["all", "everyone"];
	}
	if (coreFeatures.poss === "Yes") {
		if (canonicalForm === "mein") return ["mine"];
		if (canonicalForm === "dein") return ["yours"];
		if (canonicalForm === "sein")
			return coreFeatures.referenceGender === "Neut" ? ["its"] : ["his"];
		if (canonicalForm === "ihr")
			return coreFeatures.referenceNumber === "Plur"
				? ["theirs"]
				: ["hers"];
		if (canonicalForm === "unser") return ["ours"];
		if (canonicalForm === "euer") return ["yours (plural)"];
		if (canonicalForm === "Ihr") return ["yours (formal)"];
	}
	if (canonicalForm === "sich") return ["oneself"];
	if (coreFeatures.polite === "Form")
		return coreFeatures.referenceNumber === "Sing"
			? ["you (formal singular)"]
			: ["you (formal plural)"];
	if (coreFeatures.person === "1" && coreFeatures.referenceNumber === "Sing")
		return canonicalForm === "ich" ? ["I"] : ["me"];
	if (coreFeatures.person === "2") return ["you"];
	if (coreFeatures.person === "1" && coreFeatures.referenceNumber === "Plur")
		return canonicalForm === "wir" ? ["we"] : ["us"];
	if (coreFeatures.referenceNumber === "Plur")
		return canonicalForm === "sie" ? ["they", "them"] : ["them"];
	if (coreFeatures.referenceGender === "Masc")
		return canonicalForm === "er" ? ["he"] : ["him"];
	if (coreFeatures.referenceGender === "Fem")
		return canonicalForm === "sie" ? ["she", "her"] : ["her"];
	if (coreFeatures.referenceGender === "Neut") return ["it"];
	throw new Error(`Missing English gloss for fixed PRON ${canonicalForm}.`);
}

export {
	allFixedGrammaticalRelationClaims,
	allFixedGrammaticalSeries,
} from "./fixed/de/lexeme/pronoun.js";

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
): SemanticRelations<AuxLemma, AuxReading> | undefined {
	if (!isPromotedSeinPeer(lemma)) return undefined;
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "AUX",
	});
	const synonymLemmas = catalog?.members.filter(
		(candidate) =>
			isPromotedSeinPeer(candidate) &&
			candidate.canonicalForm !== lemma.canonicalForm,
	);
	if (synonymLemmas?.length !== 5) {
		throw new Error(
			`Expected five fixed sein-peer synonyms for ${lemma.canonicalForm}.`,
		);
	}
	return {
		targetKind: "reading",
		synonym: synonymLemmas.map(
			(candidate) => exactFixedReadingForLemma(candidate) as AuxReading,
		),
	};
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
