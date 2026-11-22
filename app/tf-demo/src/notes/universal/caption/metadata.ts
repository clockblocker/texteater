import { featureValueText } from "../../../../shared/feature-values";
import { targetWordings, UI_LANGUAGE, uiWordings } from "./wording";

const LEXEME_KIND_LABELS: Readonly<Record<string, string>> = {
	ADJ: "Adjective",
	ADP: "Preposition",
	ADV: "Adverb",
	AUX: "Auxiliary verb",
	CCONJ: "Conjunction",
	DET: "Determiner",
	INTJ: "Interjection",
	NOUN: "Noun",
	NUM: "Numeral",
	PART: "Particle",
	PRON: "Pronoun",
	PROPN: "Proper noun",
	PUNCT: "Punctuation",
	SCONJ: "Subordinating conjunction",
	SYM: "Symbol",
	VERB: "Verb",
};

const MORPHEME_KIND_LABELS: Readonly<Record<string, string>> = {
	Circumfix: "Circumfix",
	Duplifix: "Duplifix",
	Ending: "Ending",
	Infix: "Infix",
	Interfix: "Linking element",
	Prefix: "Prefix",
	Root: "Root",
	Suffix: "Suffix",
	Suffixoid: "Suffixoid",
};

const PRON_TYPE_LABELS: Readonly<Record<string, string>> = {
	Prs: "personal",
	Dem: "demonstrative",
	Rel: "relative",
	Int: "interrogative",
	Ind: "indefinite",
	Neg: "negative",
	Rcp: "reciprocal",
	Tot: "total",
};

const NUM_TYPE_LABELS: Readonly<Record<string, string>> = {
	Card: "cardinal",
	Ord: "ordinal",
	Mult: "multiplicative",
	Frac: "fractional",
};

const ORTHOGRAPHY_LABELS: Readonly<Record<string, string>> = {
	Typo: "typo",
	Shorthand: "shorthand",
	Fused: "fused",
};

const COVERAGE_LABELS: Readonly<Record<string, string>> = {
	Partial: "partial",
};

type GenderCode = keyof (typeof uiWordings)[typeof UI_LANGUAGE]["gender"];

function isGenderCode(value: string): value is GenderCode {
	return value === "Masc" || value === "Fem" || value === "Neut";
}

function genderCodesFrom(value: unknown): GenderCode[] {
	if (typeof value === "string") {
		return value.split("/").filter(isGenderCode);
	}
	const members =
		typeof value === "object" && value !== null && "mixed" in value
			? (value as { readonly mixed?: unknown }).mixed
			: value;
	if (!Array.isArray(members)) return [];
	return members.map(String).filter(isGenderCode);
}

function targetWordingFor(language: string) {
	return language === "de" ? targetWordings.de : null;
}

function formatGenderFeature(
	language: string,
	feature: unknown,
): string | null {
	const codes = genderCodesFrom(feature);
	if (codes.length === 0) return null;
	const ui = uiWordings[UI_LANGUAGE];
	const target = targetWordingFor(language);
	const names = codes.map((code) => ui.gender[code]).join("/");
	if (!target) return names;
	const articles = codes
		.map((code) => target.article[code])
		.join(target.articleSeparator);
	return `${names} (${articles})`;
}

function humanizeFeatureName(name: string): string {
	return name
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.toLowerCase();
}

function formatCoreFeature(
	language: string,
	name: string,
	feature: unknown,
): string | null {
	if (name === "gender") {
		const formatted = formatGenderFeature(language, feature);
		if (formatted) return formatted;
	}
	const value = featureValueText(feature);
	if (value === undefined) return null;
	const ui = uiWordings[UI_LANGUAGE];
	switch (name) {
		case "hasSepPrefix":
			return `separable (${value}-)`;
		case "nounKind":
			return value.toLowerCase();
		case "article":
			return `${value.toLowerCase()} article`;
		case "pronType":
			return PRON_TYPE_LABELS[value] ?? value.toLowerCase();
		case "numType":
			return NUM_TYPE_LABELS[value] ?? value.toLowerCase();
		case "number":
			return value in ui.number
				? ui.number[value as keyof typeof ui.number]
				: value.toLowerCase();
		case "case":
			return value in ui.case
				? ui.case[value as keyof typeof ui.case]
				: value.toLowerCase();
		case "degree":
			return value in ui.degree
				? ui.degree[value as keyof typeof ui.degree]
				: value.toLowerCase();
		default:
			return value === "yes"
				? humanizeFeatureName(name)
				: `${humanizeFeatureName(name)}: ${value.toLowerCase()}`;
	}
}

/**
 * Plain learner labels for a Lemma's grammatical class, split into tag items
 * (`["Noun"]`, `["Verb"]`, `["Phrase", "verb"]`, `["Saying"]`, `["Prefix"]`).
 */
export function formatLemmaClass(
	family: string,
	kind: string,
): readonly string[] {
	switch (family) {
		case "Lexeme":
			return [LEXEME_KIND_LABELS[kind] ?? kind.toLowerCase()];
		case "Locution": {
			const kindLabel = LEXEME_KIND_LABELS[kind] ?? kind;
			return ["Phrase", kindLabel.toLowerCase()];
		}
		case "Saying":
			return ["Saying"];
		case "Morpheme":
			return [MORPHEME_KIND_LABELS[kind] ?? kind];
		default:
			return [family, kind];
	}
}

/** Inline summary of a Lemma's grammatical class for route asides. */
export function formatLemmaClassLine(family: string, kind: string): string {
	return formatLemmaClass(family, kind).join(" · ");
}

/** Plain learner labels for a list of Core Feature name/value entries. */
export function formatCoreFeatureEntries(
	language: string,
	entries: readonly { readonly name: string; readonly value: unknown }[],
): readonly string[] {
	return entries.flatMap(({ name, value }) => {
		const formatted = formatCoreFeature(language, name, value);
		return formatted ? [formatted] : [];
	});
}

/**
 * Quiet closing metadata tags for a Reading or Lemma Note
 * (e.g. `Noun · masculine (der)`, `Verb`, `Phrase · verb`).
 */
export function formatLemmaMetadata(lemma: {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
	readonly coreFeatures: Readonly<Record<string, unknown>>;
}): readonly string[] {
	const features = Object.entries(lemma.coreFeatures).flatMap(
		([name, feature]) => {
			const formatted = formatCoreFeature(lemma.language, name, feature);
			return formatted ? [formatted] : [];
		},
	);
	return [...formatLemmaClass(lemma.family, lemma.kind), ...features];
}

/** Quiet closing metadata tags for an Attestation Note. */
export function formatAttestationMetadata(presented: {
	readonly members: readonly { readonly orthography: string }[];
	readonly realizationCoverage: string;
}): readonly string[] {
	const orthographies = [
		...new Set(presented.members.map(({ orthography }) => orthography)),
	]
		.filter((orthography) => orthography !== "Standard")
		.map(
			(orthography) =>
				ORTHOGRAPHY_LABELS[orthography] ?? orthography.toLowerCase(),
		);
	const coverage =
		presented.realizationCoverage !== "Full"
			? [
					COVERAGE_LABELS[presented.realizationCoverage] ??
						presented.realizationCoverage.toLowerCase(),
				]
			: [];
	return ["In text", ...orthographies, ...coverage];
}

/** Quiet closing metadata tags for a Shadow Note. */
export function formatShadowMetadata(descriptor: {
	readonly family: string;
	readonly kind: string;
}): readonly string[] {
	return [
		"Not yet in dictionary",
		...formatLemmaClass(descriptor.family, descriptor.kind),
	];
}
