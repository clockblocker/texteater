import type {
	LemmaKind,
	LemmaSubKind,
	SupportedLanguage,
	SurfaceKind,
} from "../../../types/public-types";

type TokenMap<T extends string> = Record<T, string>;
type InverseTokenMap<T extends string> = Record<string, T>;

function invert<T extends string>(
	name: string,
	tokens: TokenMap<T>,
): InverseTokenMap<T> {
	const inverse: Partial<Record<string, T>> = {};

	for (const [value, token] of Object.entries(tokens) as [T, string][]) {
		if (inverse[token] !== undefined) {
			throw new Error(`${name} token collision for ${token}`);
		}
		inverse[token] = value;
	}

	return inverse as InverseTokenMap<T>;
}

export const languageTokens = {
	de: "de",
	en: "en",
	he: "he",
} as const satisfies TokenMap<SupportedLanguage>;

export const entityKindTokens = {
	Lemma: "l",
	Selection: "x",
	Surface: "s",
} as const;

export const surfaceKindTokens = {
	Citation: "c",
	Inflection: "i",
} as const satisfies TokenMap<SurfaceKind>;

export const lemmaKindTokens = {
	Construction: "c",
	Lexeme: "l",
	Morpheme: "m",
	Phraseme: "p",
} as const satisfies TokenMap<LemmaKind>;

export const lemmaSubKindTokens = {
	ADJ: "j",
	ADP: "ap",
	ADV: "a",
	AUX: "au",
	Aphorism: "aph",
	CCONJ: "cc",
	Circumfix: "cf",
	Clitic: "cl",
	DET: "dt",
	DiscourseFormula: "df",
	Duplifix: "dfx",
	Fusion: "fus",
	INTJ: "ij",
	Idiom: "id",
	Infix: "if",
	Interfix: "ix",
	NOUN: "n",
	NUM: "num",
	PART: "pt",
	PairedFrame: "pf",
	PROPN: "pn",
	PRON: "pr",
	PUNCT: "pu",
	Prefix: "px",
	Proverb: "pv",
	Root: "r",
	SCONJ: "sc",
	SYM: "sy",
	Suffix: "sx",
	Suffixoid: "so",
	ToneMarking: "tm",
	Transfix: "tx",
	VERB: "v",
	X: "x",
} as const satisfies TokenMap<LemmaSubKind>;

export const featureNameTokens = {
	abbr: "ab",
	adpType: "adt",
	aspect: "as",
	case: "ca",
	conjType: "ct",
	definite: "def",
	degree: "deg",
	discourseFormulaRole: "dfr",
	extPos: "ep",
	foreign: "fo",
	gender: "g",
	"gender[psor]": "gps",
	governedCase: "gc",
	hasGovPrep: "hgp",
	hasSepPrefix: "hsp",
	historicalStatus: "hs",
	hebBinyan: "hb",
	hebExistential: "he",
	hyph: "hy",
	lexicallyReflexive: "lr",
	mood: "mo",
	numForm: "nf",
	number: "nu",
	"number[psor]": "nps",
	numType: "nt",
	orthography: "ort",
	partType: "pat",
	person: "pe",
	phrasal: "phr",
	polarity: "pol",
	polite: "pli",
	poss: "pos",
	prefix: "pre",
	pronType: "prt",
	punctType: "put",
	reflex: "re",
	coverage: "cov",
	spelling: "spl",
	style: "st",
	tense: "te",
	variant: "va",
	verbForm: "vf",
	verbType: "vt",
	voice: "vo",
} as const;

export const featureValueTokens = {
	abbr: { Yes: "y" },
	adpType: { Circ: "ci", Post: "po", Prep: "pr" },
	aspect: { Perf: "pf" },
	case: { Acc: "a", Dat: "d", Gen: "g", Nom: "n", Tem: "t" },
	conjType: { Comp: "c" },
	definite: { Cons: "cs", Def: "d", Ind: "i" },
	degree: { Cmp: "c", Pos: "p", Sup: "s" },
	discourseFormulaRole: {
		Acknowledgment: "ack",
		Apology: "ap",
		Farewell: "fw",
		Greeting: "gr",
		Initiation: "in",
		Reaction: "rea",
		Refusal: "ref",
		Request: "req",
		Thanks: "th",
		Transition: "tr",
	},
	extPos: {
		ADP: "ap",
		ADV: "av",
		CCONJ: "cc",
		DET: "dt",
		PRON: "pr",
		PROPN: "pn",
		SCONJ: "sc",
	},
	foreign: { Yes: "y" },
	gender: { Fem: "f", Masc: "m", Neut: "n" },
	"gender[psor]": { Fem: "f", Masc: "m", Neut: "n" },
	governedCase: {
		Abe: "abe",
		Abl: "abl",
		Acc: "acc",
		Add: "add",
		Ade: "ade",
		All: "all",
		Ben: "ben",
		Cau: "cau",
		Cmp: "cmp",
		Cns: "cns",
		Com: "com",
		Dat: "dat",
		Del: "del",
		Dis: "dis",
		Ela: "ela",
		Equ: "equ",
		Ess: "ess",
		Gen: "gen",
		Ill: "ill",
		Ine: "ine",
		Ins: "ins",
		Lat: "lat",
		Loc: "loc",
		Nom: "nom",
		Par: "par",
		Per: "per",
		Sbe: "sbe",
		Sbl: "sbl",
		Spl: "spl",
		Sub: "sub",
		Sup: "sup",
		Tem: "tem",
		Ter: "ter",
	},
	hasGovPrep: {},
	hasSepPrefix: {},
	historicalStatus: { Archaic: "a" },
	hebBinyan: {
		HIFIL: "hif",
		HITPAEL: "hit",
		HUFAL: "huf",
		NIFAL: "nif",
		PAAL: "pa",
		PIEL: "pi",
		PUAL: "pu",
	},
	hebExistential: { Yes: "y" },
	hyph: { Yes: "y" },
	lexicallyReflexive: { Yes: "y" },
	mood: { Imp: "im", Ind: "in", Sub: "su" },
	numForm: { Combi: "c", Digit: "d", Roman: "r", Word: "w" },
	number: { Dual: "d", Plur: "p", Ptan: "pt", Sing: "s" },
	"number[psor]": { Plur: "p", Sing: "s" },
	numType: { Card: "c", Frac: "f", Mult: "m", Ord: "o", Range: "r" },
	orthography: { Typo: "t" },
	partType: { Inf: "i", Res: "r", Vbp: "v" },
	person: { "1": "p1", "2": "p2", "3": "p3" },
	phrasal: { Yes: "y" },
	polarity: { Neg: "n", Pos: "p" },
	polite: { Form: "f", Infm: "i" },
	poss: { Yes: "y" },
	prefix: { Yes: "y" },
	pronType: {
		Art: "a",
		Dem: "d",
		Emp: "e",
		Exc: "x",
		Ind: "i",
		Int: "q",
		Neg: "n",
		Prs: "p",
		Rcp: "rc",
		Rel: "r",
		Tot: "t",
	},
	punctType: {
		Brck: "b",
		Colo: "c",
		Comm: "cm",
		Dash: "d",
		Elip: "e",
		Excl: "x",
		Peri: "p",
		Qest: "q",
		Quot: "qt",
	},
	reflex: { Yes: "y" },
	coverage: { Partial: "p" },
	spelling: { Variant: "v" },
	style: { Arch: "a", Coll: "c", Expr: "e", Slng: "s", Vrnc: "v" },
	tense: { Fut: "f", Past: "p", Pres: "pr" },
	variant: { Short: "s" },
	verbForm: { Fin: "f", Ger: "g", Inf: "i", Part: "p" },
	verbType: { Cop: "c", Mod: "m" },
	voice: { Act: "a", Mid: "m", Pass: "p" },
} as const satisfies {
	[K in keyof typeof featureNameTokens]: TokenMap<string>;
};

export type FeatureNameTokenKey = keyof typeof featureNameTokens;

export const inverseLanguageTokens = invert("language", languageTokens);
export const inverseEntityKindTokens = invert("entityKind", entityKindTokens);
export const inverseSurfaceKindTokens = invert(
	"surfaceKind",
	surfaceKindTokens,
);
export const inverseLemmaKindTokens = invert("lemmaKind", lemmaKindTokens);
export const inverseLemmaSubKindTokens = invert(
	"lemmaSubKind",
	lemmaSubKindTokens,
);
export const inverseFeatureNameTokens = invert(
	"featureName",
	featureNameTokens,
);
export const inverseFeatureValueTokens = Object.fromEntries(
	Object.entries(featureValueTokens).map(([name, tokens]) => [
		name,
		invert(`${name} feature value`, tokens as TokenMap<string>),
	]),
) as unknown as {
	[K in keyof typeof featureValueTokens]: InverseTokenMap<
		keyof (typeof featureValueTokens)[K] & string
	>;
};

export const rawStringFeatureNames = new Set<FeatureNameTokenKey>([
	"hasGovPrep",
	"hasSepPrefix",
]);
