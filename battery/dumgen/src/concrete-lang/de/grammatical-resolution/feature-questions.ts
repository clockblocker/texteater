import type { ChoiceQuestion } from "promptsmith/typesafe";
import { choice } from "../../../universal/questions.js";
import type { FeatureField } from "./feature-schema.js";

type Meaning = {
	question: string;
	values: Readonly<Record<string, string>>;
	unmarked: string;
	byKind?: Readonly<Record<string, string>>;
	unmarkedByKind?: Readonly<Record<string, string>>;
	/** Value sets offered per Kind where the schema accepts one, labeled "Masc,Neut". */
	setsByKind?: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

const gender = {
	Fem: "Feminine grammatical gender",
	Masc: "Masculine grammatical gender",
	Neut: "Neuter grammatical gender",
};
const number = { Sing: "Singular", Plur: "Plural" };
const person = {
	"1": "First person: speaker, or a group including the speaker",
	"2": "Second person: addressee, including formal address",
	"3": "Third person: neither speaker nor addressee",
};
const grammaticalCase = {
	Nom: "Nominative, as in a subject or nominative predicate",
	Acc: "Accusative, as in a direct object or accusative government",
	Dat: "Dative, as in a dative object or dative government",
	Gen: "Genitive, as in genitive attribution or genitive government",
};
const degree = {
	Pos: "Positive comparison degree: the base member of a comparison paradigm",
	Cmp: "Comparative degree, including irregular forms such as besser or lieber",
	Sup: "Superlative degree, including constructions such as am besten",
};
const verbalForm = {
	Fin: "The whole target is finite, including its own finite auxiliary or an imperative",
	Inf: "The whole target is infinitival; a separate modal's finite form does not count",
	Part: "The whole target is participial, without its own finite or infinitival auxiliary",
};
const mood = {
	Ind: "Indicative assertion",
	Sub: "Subjunctive: Konjunktiv I or II, including reported speech or irrealis",
	Imp: "Imperative command or request expressed by imperative morphology",
};
const pronType = {
	Art: "Article, such as definite der/die/das or indefinite ein",
	Dem: "Demonstrative pointing or anaphoric identity",
	Emp: "Emphatic identity such as selber",
	Exc: "Exclamative identity",
	Ind: "Indefinite identity, such as jemand, etwas or mancher",
	Int: "Interrogative identity used to ask a question, including an embedded question",
	Neg: "Negative pronominal identity, such as niemand or kein",
	Prs: "Personal or personal-possessive identity; includes dedicated sich",
	Rcp: "Reciprocal identity such as einander; not sich merely used reciprocally",
	Rel: "Relative identity linking a relative clause to its antecedent",
	Tot: "Total or universal quantifying identity, such as jeder or alle",
};
const numType = {
	Card: "Cardinal quantity or its corresponding quantitative identity",
	Ord: "Ordinal position in an ordered sequence",
	Frac: "Fractional quantity",
	Mult: "Multiplicative quantity: how many times or how manyfold",
	Range: "An interval or range of numerical values",
};
const polite = {
	Form: "Lexically marked formal address, such as Sie, Ihnen or Ihr",
	Infm: "Informal personal-pronoun address (du/dich/deiner); ordinary determiner dein is unmarked under its different route policy",
};
const partType = {
	Inf: "Infinitive-marking particle, such as infinitival zu",
	Vbp: "A verbal-particle lexical identity under the supplied ADP route, not a nearby verb's detached prefix",
	Res: "Response particle, such as ja or nein used as an answer",
};

// Meanings describe judgments; the schema supplies and restricts the actual choices.
const meanings: Readonly<Record<string, Meaning>> = {
	"surface.inflectionalFeatures.expletive": {
		question:
			"Does this complete verbal realization own lexically selected nonreferential subject es? Include es gibt/es gab/gibt es, es regnet, es geht um and es handelt sich um. Exclude referential es, positional es in Es kamen Gäste, anticipatory es in Es freut mich, dass du kommst, and object es in Sie meint es gut mit dir. Uncertain classification is Unresolved.",
		values: {
			Subject: "Realized fixed nonreferential nominative subject es",
		},
		unmarked: "No subject-expletive composition in this Surface",
	},
	"surface.inflectionalFeatures.article": {
		question:
			"Does this whole common-noun Surface include a definite or indefinite article, overtly owned, licensed by compatible coordination, or supplied by a governing Fusion? A Fusion contributes its internal DET without joining noun membership; mein, dieser and kein do not supply an article. Ordinary bare nouns stay bare.",
		values: {
			Definite: "Included definite article",
			Indefinite: "Included indefinite article",
		},
		unmarked:
			"No included article; not uncertainty and not semantic indefiniteness",
	},
	"lemma.coreFeatures.gender": {
		question:
			"What is the dictionary noun's lexical grammatical gender? Recover the singular identity even from plural spelling, as with Kinder and das Kind. Diminutives in -chen/-lein are neuter regardless of the referent's sex. Preserve lexical gender in plural occurrences.",
		values: gender,
		unmarked:
			"The lexical identity has no marked grammatical gender, for example a plural-only identity; not missing evidence for an otherwise gendered noun",
		byKind: {
			PROPN: "What grammatical gender is established for this name by conventional lexical usage or contextual agreement? Familiar name conventions are lexical evidence; do not guess the gender of an unfamiliar person from name shape alone. Plural-only names have unmarked gender.",
			PRON: "If this is a pillar pronoun (personal, der/die/das, wer/was, jemand, einer), what grammatical gender belongs to its Paradigm Cell? A personal pronoun marks gender only in a third-person singular cell: er/ihn are Masc, es Neut, sie/ihr/ihrer Fem. ihm and genitive seiner are the cells of er (Masc) or es (Neut); the gender of what they stand for decides, as it does for dem and dessen. wer-forms are Masc and was-forms Neut. Plural agreement has no marked gender. A stem pronoun (dieser, keiner, meiner, alle) keeps gender on its Surface, not in Core.",
			DET: "If this is a definite or indefinite article (der, die, das, ein, eine), what grammatical gender belongs to its Paradigm Cell? It is the lexical gender of the noun the article modifies. Plural agreement has no marked gender. Every other determiner keeps gender on its Surface, not in Core.",
		},
		unmarkedByKind: {
			PRON: "Gender is inapplicable in Core: a stem pronoun whose gender is on its Surface, a first/second-person nonpossessive identity, plural agreement, or an invariant identity without gender",
			DET: "Not an article cell: a stem determiner such as dieser, mein or kein whose gender is on its Surface, an invariant determiner such as derlei, or plural agreement",
		},
	},
	"lemma.coreFeatures.hyph": {
		question:
			"Does this lexical identity contain a lexical hyphen? Distinguish an internal dictionary hyphen from line wrapping or a trailing suspension mark whose missing compound material is completed.",
		values: { Yes: "The lexical identity itself contains a hyphen" },
		unmarked: "No lexical hyphen",
	},
	"lemma.coreFeatures.abbr": {
		question:
			"Is this lexical identity an established abbreviation? Capital letters, short length, a typo or an incomplete fragment alone do not establish abbreviation.",
		values: { Yes: "An established abbreviated lexical identity" },
		unmarked: "The identity is not an abbreviation",
	},
	"lemma.coreFeatures.foreign": {
		question:
			"Is this identity overt foreign-language material in the German context? Judge current lexical identity, not historical origin, English-looking letters or international use.",
		values: {
			Yes: "Overt source-language identity retained as foreign material",
		},
		unmarked:
			"German or integrated identity; no overt foreign-language marking",
	},
	"lemma.coreFeatures.numType": {
		question:
			"What numerical type belongs to this lexical identity itself? Do not borrow a neighboring word's quantity or label every currency, unit or mathematical symbol as a cardinal.",
		values: numType,
		unmarked: "No applicable lexical numerical type",
	},
	"lemma.coreFeatures.variant": {
		question:
			"Is this adjective a licensed short lexical identity? Absence of an attributive ending, predicative use and abbreviation do not themselves establish a short variant.",
		values: {
			Short: "A licensed short-form adjective identity",
		},
		unmarked: "No short lexical variant",
	},
	"lemma.coreFeatures.adpType": {
		question:
			"Where does this complete adposition stand relative to its complement? Judge the whole fixed unit, including both anchors of a circumposition.",
		values: {
			Prep: "Before its complement",
			Post: "After its complement",
			Circ: "Fixed members surround the complement",
		},
		unmarked: "No applicable positional adposition type",
	},
	// LEO: attributive genitive pronouns retain their own antecedent coordinates.
	// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
	"lemma.coreFeatures.extPos": {
		byKind: {
			PRON: "Is this an attributive genitive dessen/deren/wessen before a noun? If so mark DET. Its Core Case remains Gen and its Number/Gender concerns the antecedent, not that noun. Ordinary standalone pronouns are Unmarked.",
		},
		question:
			"Does this fixed lexical identity have a licensed external syntactic function distinct from its ordinary route? Keep the supplied route unchanged; do not mark a neighboring word's function.",
		values: {
			ADV: "Licensed external adverbial function",
			DET: "Licensed external determiner function",
			SCONJ: "Licensed external subordinating-conjunction function",
		},
		unmarked:
			"Ordinary route function; no external part-of-speech feature is needed",
	},
	"lemma.coreFeatures.partType": {
		question:
			"Which particle subtype belongs to this exact lexical identity in context? Apply only the subtype licensed by the fixed route; a nearby infinitive or separable verb is insufficient evidence.",
		values: partType,
		unmarked: "None of the route's named particle subtypes applies",
		byKind: {
			PART: "Is this particle the infinitive marker zu? This route marks only that subtype as Inf. Other particle roles, including modal halt and focus sogar, have unmarked partType.",
			INTJ: "Is this interjection a response particle such as answering ja/nein? Expressive exclamations, greetings and sound imitations have unmarked partType.",
			ADP: "Does this ADP identity have a licensed verbal-particle subtype? Ordinary prepositions, postpositions and circumpositions have unmarked partType; do not borrow a nearby verb's prefix.",
		},
	},
	"lemma.coreFeatures.conjType": {
		question:
			"Does this conjunction introduce a comparison complement? Distinguish comparative als/wie from ordinary coordination or a complete correlator such as je … desto.",
		values: {
			Comp: "Comparative conjunction introducing the comparison complement",
		},
		unmarked:
			"Ordinary conjunction or correlator without this comparative subtype",
	},
	"lemma.coreFeatures.pronType": {
		question:
			"What pronominal type belongs to this exact identity in context? Distinguish questions from relative clauses and demonstrative uses even when the spelling is identical.",
		values: pronType,
		unmarked: "No listed pronominal type applies to this lexical identity",
	},
	"lemma.coreFeatures.definite": {
		question:
			"If this determiner is an article, does it mark definite or indefinite reference? Other determiner types do not acquire article definiteness merely because their referent is identifiable.",
		values: {
			Def: "Definite article, such as der/die/das",
			Ind: "Indefinite article, such as ein",
		},
		unmarked: "Not an article identity with marked definiteness",
	},
	"lemma.coreFeatures.person": {
		question:
			"What grammatical person belongs to this personal or possessive identity? For possessives, identify the possessor, not the possessed noun. Formal Sie/Ihr is second person; dedicated sich is third person.",
		values: person,
		unmarked: "This identity does not mark personal or possessor person",
	},
	"lemma.coreFeatures.polite": {
		question:
			"Does this personal or possessive identity lexically mark a politeness register? Preserve formal Sie/Ihnen/Ihr. Ordinary du/dein has unmarked politeness under this policy.",
		values: polite,
		unmarked:
			"No lexical politeness marking; includes ordinary determiner dein",
		byKind: {
			PRON: "Is this personal-pronoun identity formal or informal address? Formal Sie/Ihnen is Form; du/dich/deiner and ihr/euch as informal addressee pronouns are Infm. Other identities are unmarked.",
		},
	},
	"lemma.coreFeatures.poss": {
		question:
			"Is this identity itself possessive, expressing a possessor relation? Genitive case alone does not make a nonpossessive personal pronoun possessive.",
		values: {
			Yes: "A possessive determiner or possessive pronoun identity",
		},
		unmarked: "Not a possessive identity",
	},
	"lemma.coreFeatures.case": {
		question:
			"If this is a pillar pronoun (personal, der/die/das, wer/was, jemand, einer), which Case belongs to its Paradigm Cell in context? Case is a Core coordinate of a pillar: keep uns/Acc distinct from uns/Dat rather than reducing either to a nominative identity. A stem pronoun (dieser, keiner, meiner, alle) marks Case on its Surface, not in Core.",
		values: grammaticalCase,
		unmarked:
			"No Core Case: a stem pronoun whose Case is on its Surface, or an invariant identity such as etwas or einander; not uncertainty between possible cases",
		byKind: {
			DET: "If this is a definite or indefinite article (der, die, das, ein, eine), which Case does it share with the noun it modifies? Case is a Core coordinate of an article cell: dem Mann and den Mann are different article Lemmas. Judge the noun phrase's role and government in the sentence. Every other determiner marks Case on its Surface, not in Core.",
		},
		unmarkedByKind: {
			DET: "Not an article cell: a stem determiner such as dieser, mein or kein whose Case is on its Surface, or an invariant determiner such as derlei; not uncertainty between possible cases",
		},
	},
	"lemma.coreFeatures.number": {
		question:
			"If this is a pillar pronoun (personal, der/die/das, wer/was, jemand, einer), what grammatical agreement Number belongs to its Paradigm Cell? Formal Sie/Ihnen requires plural agreement even for one addressee. Do not copy an antecedent's number into dedicated sich; wer/wen/wem/wessen is unmarked for Number. A stem pronoun (dieser, keiner, meiner, alle) marks Number on its Surface, not in Core.",
		values: number,
		unmarked:
			"No marked Core agreement Number: a stem pronoun whose Number is on its Surface, dedicated sich, or wer/wen/wem/wessen",
		byKind: {
			DET: "If this is a definite or indefinite article (der, die, das, ein, eine), what Number does it share with the noun it modifies? Number is a Core coordinate of an article cell: der Tisch and die Tische use different article Lemmas. Every other determiner marks Number on its Surface, not in Core.",
		},
		unmarkedByKind: {
			DET: "Not an article cell: a stem determiner such as dieser, mein or kein whose Number is on its Surface, or an invariant determiner such as derlei",
		},
	},
	"lemma.coreFeatures.polarity": {
		question:
			"Does this particle itself express positive or negative polarity? A negative sentence does not make an unrelated particle negative.",
		values: {
			Neg: "The particle expresses negation",
			Pos: "The particle explicitly expresses positive polarity",
		},
		unmarked: "The particle does not mark polarity",
	},
	"lemma.coreFeatures.lexicallyReflexive": {
		question:
			"Does this verb's lexical identity require a reflexive member? Distinguish an inherently required reflexive from an optional reflexive object or a free contextual pronoun.",
		values: {
			Yes: "Reflexive membership is required by the lexical identity",
		},
		unmarked: "No lexically required reflexive member",
	},
	"lemma.coreFeatures.verbType": {
		question:
			"Is this verb identity a meaning-bearing modal under the supplied route? A modal used without an overt lexical infinitive remains VERB; a copula, tense auxiliary or change-of-state verb is not thereby modal.",
		values: { Mod: "A meaning-bearing modal lexical identity" },
		unmarked: "Not a modal identity",
	},
	"lemma.coreFeatures.hasSepPrefix": {
		question:
			"Does this verb's lexical identity contain a separable prefix, whether attached or detached here? Distinguish it from a governed preposition and an adposition with its own complement.",
		values: {
			Present: "A separable lexical prefix belongs to this verb identity",
		},
		unmarked: "No separable lexical prefix",
	},
	"surface.inflectionalFeatures.case": {
		question:
			"If this occurrence has nominal inflection, what Case does the marked target bear in this sentence? Use its own syntactic role and government; direct address has unmarked Case.",
		values: grammaticalCase,
		unmarked:
			"Case is not marked here, including direct address or an inapplicable nominal-inflection premise",
		byKind: {
			ADJ: "If this adjective is attributive, what Case does it agree in with its modified noun? Predicative/adverbial adjectives have unmarked Case.",
			DET: "If this is a stem determiner (dieser, mein, kein, welcher, einige, inflected viel), what Case does it share with the noun it modifies? An article marks Case in Core instead, and uninflected all/viel/wenig/wieviel has none.",
			PRON: "If this is a stem pronoun (dieser, keiner, meiner, einige, alle, jeder), what Case does it bear in its clause? A pillar pronoun (personal, der/die/das, wer/was, jemand, einer) marks Case in Core instead.",
			NUM: "If this numeral itself has supported nominal inflection, what Case does it bear? An invariant cardinal or digit does not inherit a neighboring noun's Case.",
			SYM: "If this symbol itself fills a nominal phrase, what Case does it bear? A label noun or neighboring quantity does not lend the symbol its Case.",
		},
	},
	"surface.inflectionalFeatures.gender": {
		question:
			"If this target has nominal agreement, what grammatical gender is established for that occurrence? Do not infer gender from an unrelated neighboring noun.",
		values: gender,
		unmarked: "No applicable marked gender agreement",
		byKind: {
			ADJ: "If this adjective is attributive, what gender does it agree in? Predicative/adverbial use and plural agreement have unmarked Gender.",
			DET: "If this is a stem determiner in the singular, what is the lexical gender of the noun it modifies? It is never the possessor's gender. Plural agreement, an article (gender in Core) and uninflected all/viel/wenig/wieviel have unmarked Gender.",
			PRON: "If this is a stem pronoun in the singular, what gender does it agree in with its referent noun? For a possessive it is the possessed item's gender, not the possessor's. Plural agreement and pillar pronouns (gender in Core) have unmarked Gender.",
			NUM: "If this numeral has visible nominal agreement, what gender is established? Ordinary invariant cardinals and digits do not inherit gender from a neighboring noun.",
			SYM: "If the symbol itself fills a nominal phrase with gender agreement, what gender is established? Do not use the gender of a label noun that merely names the symbol.",
		},
	},
	"surface.inflectionalFeatures.number": {
		question:
			"If this target has contextual nominal inflection, what grammatical Number does it bear? A noun's plural agreement does not change its lexical gender.",
		values: number,
		unmarked: "No applicable marked Number",
		byKind: {
			ADJ: "If this adjective is attributive, what Number does it agree in with its modified noun? Predicative/adverbial adjectives have unmarked Number.",
			PROPN: "What grammatical Number does this contextual name bear? One named person, place or organization is singular even without a visible ending or article; plural-only names or multiple bearers can be plural.",
			DET: "If this is a stem determiner, what Number does it share with the noun it modifies? Do not confuse it with possessor Number. An article marks Number in Core instead, and uninflected all/viel/wenig/wieviel has none.",
			PRON: "If this is a stem pronoun, what agreement Number does it bear? A pillar pronoun marks Number in Core instead.",
			NUM: "If this numeral itself has visible nominal agreement, what Number does it bear? Numerical quantity is not grammatical Number; an invariant digit/cardinal has no agreement bag.",
			SYM: "If this symbol itself fills a nominal phrase, what Number does it bear? A neighboring numerical amount does not establish grammatical agreement.",
			X: "If this residual target has transparent nominal inflection or is a finite nonce verb, what grammatical Number is established? Otherwise leave it unmarked.",
		},
	},
	"surface.inflectionalFeatures.gender[psor]": {
		question:
			"If this is an inflected possessive determiner or possessive pronoun, which possessor gender does its form show? It is separate from the possessed item's gender. sein- (seinem, seiner) serves a masculine or neuter possessor: Masc,Neut. Never narrow it from what the possessor is.",
		values: gender,
		unmarked:
			"The form shows no possessor gender: nonpossessive use, first/second person, or ihr-, which serves a feminine singular or a plural possessor",
		setsByKind: {
			DET: {
				"Masc,Neut":
					"Masculine or neuter possessor, as every sein- form shows",
			},
			PRON: {
				"Masc,Neut":
					"Masculine or neuter possessor, as every sein- form shows",
			},
		},
	},
	"surface.inflectionalFeatures.number[psor]": {
		question:
			"If this is an inflected possessive determiner or possessive pronoun, which possessor Number does its form show? mein/dein/sein have singular possessor, unser/euer plural.",
		values: number,
		unmarked:
			"The form shows no possessor Number: nonpossessive use, ihr- (a feminine singular or a plural possessor) or formal Ihr (one or several addressees)",
	},
	"surface.inflectionalFeatures.degree": {
		question:
			"If this target participates in comparison, what degree does this occurrence express? Judge the target itself, including an irregular paradigm.",
		values: degree,
		unmarked: "No comparison degree is marked under this route",
		byKind: {
			ADJ: "For a contextual adjective, including predicative/adverbial use, what comparison degree does this occurrence express? Ordinary noncomparative contextual adjectives are positive; dictionary-only mentions have no inflection bag.",
			ADV: "Does this adverb occurrence express comparative/superlative degree, or an explicitly established positive comparison paradigm? An ordinary invariant adverb has no degree bag.",
			DET: "If this determiner marks comparison, what degree does it express? mehr/weniger are comparative and meisten superlative. An ordinary article or ordinal identity does not automatically have positive degree.",
		},
	},
	"surface.inflectionalFeatures.reflex": {
		question:
			"Does this free pronoun refer back to its clause subject acting on or for itself? Reflexivity is occurrence evidence; the pronoun's Case and agreement remain Core coordinates.",
		values: { Yes: "The pronoun is reflexive in this occurrence" },
		unmarked: "Nonreflexive use or dictionary-only mention",
	},
	"surface.inflectionalFeatures.verbForm": {
		question:
			"If this target has verbal inflection, is its whole construction finite, infinitival or participial? Include only its own selected auxiliaries; do not classify a single participial member in isolation.",
		values: verbalForm,
		unmarked:
			"No transparent verbal form is applicable to this residual identity",
	},
	"surface.inflectionalFeatures.mood": {
		question:
			"If the whole marked target is finite, what Mood does it express? Include its own auxiliaries, never a separate modal. Infinitives and participles have unmarked Mood; an -e ending alone does not establish subjunctive.",
		values: mood,
		unmarked:
			"The whole target is not finite, or Mood is unmarked under the route policy",
	},
	"surface.inflectionalFeatures.person": {
		question:
			"If the whole marked target is finite, what grammatical Person does its finite form express? Formal Sie agrees in third person. Do not inherit Person from a separate modal; nonfinite targets are unmarked.",
		values: {
			"1": "First-person verbal agreement",
			"2": "Second-person verbal agreement",
			"3": "Third-person verbal agreement, including formal Sie",
		},
		unmarked: "No finite Person is marked for the whole target",
	},
	"surface.inflectionalFeatures.tense": {
		question:
			"If the whole target is finite indicative or subjunctive, what is the finite form's Tense? Konjunktiv I uses Pres and Konjunktiv II Past. Perfect/future construction and semantic event time do not determine this coordinate. Imperatives and nonfinite forms are unmarked.",
		values: {
			Pres: "Finite present, including Konjunktiv I and present auxiliaries in perfect/future constructions",
			Past: "Finite past, including Konjunktiv II",
		},
		unmarked: "Imperative or nonfinite target, or no marked finite Tense",
	},
	"surface.inflectionalFeatures.perfect": {
		question:
			"Does this whole verbal target contain a perfect construction, including its own perfect auxiliary or Ersatzinfinitiv complex? A past participle alone and a separate modal's perfect auxiliary do not establish perfect here.",
		values: {
			Yes: "Perfect construction is present in this complete target",
		},
		unmarked: "No perfect construction in this target",
	},
	"surface.inflectionalFeatures.future": {
		question:
			"Does this whole verbal target contain its own grammatical future construction with werden? Future-time meaning alone, passive werden and lexical change-of-state werden do not qualify.",
		values: {
			Yes: "Grammatical future construction is present in this target",
		},
		unmarked: "No grammatical future construction in this target",
	},
	"surface.inflectionalFeatures.passive": {
		question:
			"Does this complete verbal target realize a process or recipient passive? Judge the whole supplied VERB/Phraseme construction under the fixed route, including perfect passive worden and bekommen/kriegen/erhalten plus Partizip II. sein with a participle outside the perfect is a copula with an adjective, never a passive here. Do not borrow another target's auxiliaries.",
		values: {
			Process:
				"Process passive (Vorgangspassiv), including werden/worden constructions",
			Recipient:
				"Recipient passive (Rezipientenpassiv) with bekommen, kriegen or erhalten and a Partizip II",
		},
		unmarked:
			"No passive construction; active or otherwise nonpassive target",
	},
	"surface.inflectionalFeatures.participleForm": {
		question:
			"If the whole target is a participial Surface, is it a present or past participle? This does not ask whether a finite/infinitival complex contains a participial member.",
		values: {
			Present: "Present participle (Partizip I)",
			Past: "Past participle (Partizip II)",
		},
		unmarked: "No applicable marked whole-Surface participle form",
	},
	"lemma.coreFeatures.discourseFormulaRole": {
		question:
			"Which single interactional role does this whole fixed discourse formula conventionally serve? Do not classify every conversational reply as Reaction.",
		values: {
			Greeting: "Greeting",
			Farewell: "Leave-taking",
			Apology: "Apologizing",
			Thanks: "Thanking",
			Acknowledgment: "Acknowledging receipt or understanding",
			Refusal: "Refusing",
			Request: "Requesting",
			Reaction: "Conventional reaction",
			Initiation: "Opening an interaction",
			Transition: "Transitioning within an interaction",
		},
		unmarked:
			"A supported conventional role outside this list, such as a wish or sympathy",
	},
};

const verbalQuestions: Readonly<Record<string, string>> = {
	"surface.inflectionalFeatures.number":
		"If the whole marked verbal target is finite, what Number does its verb form agree in? Read the actual finite morphology: third-singular sie liest differs from plural/formal sie/Sie lesen. Capitalized sentence-initial Sie alone does not establish formal address. Nonfinite targets are unmarked; do not inherit agreement from a separate modal.",
};

export const verbalKinds: ReadonlySet<string> = new Set([
	"VERB",
	"AUX",
	"Idiom",
	"Collocation",
]);

export function featureQuestion(
	kind: string,
	path: string,
	field: FeatureField,
): ChoiceQuestion {
	const meaning = meanings[path];
	if (!meaning)
		throw Error(`Missing German feature question: ${kind}/${path}`);
	const question =
		(verbalKinds.has(kind) ? verbalQuestions[path] : undefined) ??
		meaning.byKind?.[kind] ??
		meaning.question;
	const unmarked = meaning.unmarkedByKind?.[kind] ?? meaning.unmarked;
	const criteria: Record<string, string> = {};
	if (field.open) {
		const present = meaning.values.Present;
		if (!present)
			throw Error(`Missing open-feature meaning: ${kind}/${path}`);
		criteria.Present = present;
		criteria.Absent = unmarked;
	} else {
		// A contextual common noun always has Number, so offering Unmarked only
		// lets bare, mass and plural-only nouns (Obst, Holz) lose the click.
		const numberAlwaysMarked =
			kind === "NOUN" && path === "surface.inflectionalFeatures.number";
		for (const [label, description] of Object.entries(
			field.sets ? (meaning.setsByKind?.[kind] ?? {}) : {},
		))
			criteria[label] = description;
		for (const value of field.values) {
			if (value === null && numberAlwaysMarked) continue;
			const label = value === null ? "Unmarked" : String(value);
			const description =
				value === null ? unmarked : meaning.values[label];
			if (!description)
				throw Error(
					`Missing German feature choice: ${kind}/${path}/${label}`,
				);
			criteria[label] = description;
		}
	}
	criteria.Unresolved =
		"This feature applies, but the supplied evidence does not support a defensible value; do not use Unmarked for uncertainty";
	return choice(
		`For the complete ${kind} target marked by <TARGET> in \`markedContext\`: ${question}`,
		criteria,
	);
}

const inflectionPolicies: Readonly<
	Record<string, { marked: string; citation: string }>
> = {
	NOUN: {
		marked: "Contextual noun with Case/Number, even when spelled like its headword; direct address can have Number with unmarked Case",
		citation: "Dictionary-only mention without contextual noun inflection",
	},
	PROPN: {
		marked: "Name functioning as a sentence's subject, object, governed complement or direct address, even without a determiner or visible inflectional ending",
		citation:
			"Name-entry, register or title mention without contextual name agreement; a surrounding label noun supplies none",
	},
	ADJ: {
		marked: "Contextual adjective with degree, including predicative/adverbial use; attributive use additionally bears agreement",
		citation: "Dictionary-only adjective mention",
	},
	ADV: {
		marked: "Comparative/superlative adverb or explicitly established positive comparison paradigm",
		citation: "Ordinary invariant adverb or dictionary mention",
	},
	DET: {
		marked: "A stem determiner in context (diesem, meinen, keine, welches, einigen, vielen) with its Case, Number and Gender, or comparison degree (weniger, meisten) or possessor features",
		citation:
			"Every definite or indefinite article, whose cell is Core; an invariant or uninflected determiner (derlei, viel Geld, all die Jahre) without comparison; or a dictionary mention",
	},
	PRON: {
		marked: "A stem pronoun in context (diesem, keinen, meiner, allen) with its Case, Number and Gender and, for a possessive, its possessor features, or a reflexive occurrence: the pronoun refers to its clause subject acting on or for itself",
		citation:
			"A nonreflexive pillar pronoun (personal, der/die/das, wer/was, jemand, einer), whose cell is Core; an invariant pronoun (etwas, einander); or a dictionary mention",
	},
	NUM: {
		marked: "The numeral itself has supported nominal agreement, such as inflected Million quantities or visibly agreeing historical forms",
		citation:
			"Invariant numeral or dictionary mention, including ordinary cardinals/digits regardless of a neighboring noun",
	},
	SYM: {
		marked: "The symbol itself fills a nominal phrase with established Case/Gender/Number, even without visible endings",
		citation:
			"Invariant symbol or mention under a label noun, without the symbol's own agreement",
	},
	X: {
		marked: "Transparent nominal or verbal inflection supported by this occurrence",
		citation:
			"Citation or residual identity with no supported inflection; never an all-null marked bag",
	},
};
export function inflectionQuestion(kind: string): ChoiceQuestion {
	const policy = verbalKinds.has(kind)
		? {
				marked: "Contextual whole verbal construction, including infinitives and participles as well as finite forms",
				citation:
					"Dictionary-only mention or genuinely invariant nonverbal use under this route",
			}
		: inflectionPolicies[kind];
	if (!policy) throw Error(`Missing German inflection policy: ${kind}`);
	return choice(
		`Under \`policy.inflection\` and \`policy.route\`, does the complete ${kind} target in \`markedContext\` have contextual Surface inflection, or a null inflection bag? Decide independently from the feature questions.`,
		{
			Marked: policy.marked,
			Citation: policy.citation,
			Unresolved:
				"Cannot defensibly distinguish contextual inflection from a null bag",
		},
	);
}
