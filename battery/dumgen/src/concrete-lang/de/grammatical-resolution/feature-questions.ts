import type { ChoiceQuestion } from "promptsmith/typesafe";
import { choice } from "../../../universal/questions.js";
import type { FeatureField } from "./feature-schema.js";

type Meaning = {
	question: string;
	values: Readonly<Record<string, string>>;
	unmarked: string;
	byKind?: Readonly<Record<string, string>>;
	unmarkedByKind?: Readonly<Record<string, string>>;
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
			PRON: "What grammatical gender belongs to this exact pronoun identity? For a possessive, judge the possessed item's gender; for a nonpossessive personal pronoun, mark gender only with third-person singular reference. Plural agreement has no marked gender. Never infer gender from a name alone.",
		},
		unmarkedByKind: {
			PRON: "Gender is inapplicable: first/second-person nonpossessive identity, plural agreement, or an invariant identity without gender",
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
	"lemma.coreFeatures.governedCase": {
		question:
			"Which single case does this adposition stably govern as a lexical identity? A two-way adposition has no single governed Case even when this occurrence clearly selects accusative or dative. Only choose another case for explicit source-language government.",
		values: {
			...grammaticalCase,
			Abe: "Abessive (caritive/privative) government",
			Ben: "Benefactive government",
			Cau: "Causative government",
			Cmp: "Comparative government",
			Cns: "Considerative government",
			Com: "Comitative government",
			Dis: "Distributive government",
			Equ: "Equative government",
			Ins: "Instrumental government",
			Par: "Partitive government",
			Tem: "Temporal government",
			Abl: "Ablative government",
			Add: "Additive government",
			Ade: "Adessive government",
			All: "Allative government",
			Del: "Delative government",
			Ela: "Elative government",
			Ess: "Essive government",
			Ill: "Illative government",
			Ine: "Inessive government",
			Lat: "Lative government",
			Loc: "Locative government",
			Per: "Perlative government",
			Sbe: "Subelative government",
			Sbl: "Sublative government",
			Spl: "Superlative case government",
			Sub: "Subessive government",
			Sup: "Superessive government",
			Ter: "Terminative government",
		},
		unmarked:
			"No single stable lexical case government, including a two-way adposition",
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
			"Which Case belongs to this exact case-bearing pronoun identity in context? Case is a Core coordinate here: keep uns/Acc distinct from uns/Dat rather than reducing either to a nominative identity.",
		values: grammaticalCase,
		unmarked:
			"Invariant identity without marked Case, such as etwas or einander; not uncertainty between possible cases",
	},
	"lemma.coreFeatures.number": {
		question:
			"What grammatical agreement Number belongs to this exact pronoun identity? Formal Sie/Ihnen requires plural agreement even for one addressee. Do not copy an antecedent's number into dedicated sich; wer/wen/wem/wessen is unmarked for Number.",
		values: number,
		unmarked:
			"No marked agreement Number under the pronoun policy, including dedicated sich and wer/wen/wem/wessen",
	},
	"lemma.coreFeatures.gender[psor]": {
		question:
			"If this is a personal possessive pronoun with third-person singular reference, what gender is established for its possessor? This is independent of the possessed item's gender. Otherwise the feature is unmarked; do not guess from a name.",
		values: gender,
		unmarked:
			"The personal-possessive third-person singular premise does not apply",
	},
	"lemma.coreFeatures.referenceNumber": {
		question:
			"What reference Number belongs to this personal or possessive pronoun (the possessor for a possessive)? Ordinary ich/du/er forms have singular reference and wir/ihr/sie-plural plural reference. Formal Sie may refer to one or several addressees: only formal-address count needs explicit context; without it use Unmarked. Keep this separate from agreement Number.",
		values: number,
		unmarked:
			"Reference count is unmarked under the route policy; formal address without explicit addressee-count evidence stays unmarked",
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
			DET: "If this determiner has contextual inflection, what Case does it agree in with its modified noun? Dictionary mention or an invariant determiner has no contextual Case bag.",
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
			DET: "If this determiner has contextual agreement, what is its modified noun's lexical grammatical gender, including in plural? This feature concerns the possessed or modified item, not the possessor.",
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
			DET: "If this determiner has contextual agreement, what is the modified or possessed item's Number? Do not confuse it with possessor Number.",
			NUM: "If this numeral itself has visible nominal agreement, what Number does it bear? Numerical quantity is not grammatical Number; an invariant digit/cardinal has no agreement bag.",
			SYM: "If this symbol itself fills a nominal phrase, what Number does it bear? A neighboring numerical amount does not establish grammatical agreement.",
			X: "If this residual target has transparent nominal inflection or is a finite nonce verb, what grammatical Number is established? Otherwise leave it unmarked.",
		},
	},
	"surface.inflectionalFeatures.gender[psor]": {
		question:
			"If this is an inflected possessive determiner, what grammatical gender is established for the possessor? Keep it separate from the modified noun's gender. If applicable but not defensibly recoverable, return Unresolved.",
		values: gender,
		unmarked:
			"Possessor gender is inapplicable, such as nonpossessive, first/second-person or plural-possessor use",
	},
	"surface.inflectionalFeatures.number[psor]": {
		question:
			"If this is an inflected possessive determiner, what is the possessor's Number? mein/dein/sein has singular possessor, unser/euer plural. Formal Ihr marks count only with explicit addressee evidence.",
		values: number,
		unmarked:
			"No applicable marked possessor Number; formal Ihr without explicit count stays unmarked",
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
			"Does this complete verbal target realize a process, state or recipient passive? Judge the whole supplied VERB/Phraseme construction under the fixed route, including perfect passive worden and bekommen/kriegen/erhalten plus Partizip II. Do not reclassify an adjectival property or borrow another target's auxiliaries.",
		values: {
			Process:
				"Process passive (Vorgangspassiv), including werden/worden constructions",
			State: "State passive (Zustandspassiv) under the verbal route",
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

const verbalKinds = new Set(["VERB", "AUX", "Idiom", "Collocation"]);

export function featureQuestion(
	kind: string,
	path: string,
	field: FeatureField,
): ChoiceQuestion {
	const meaning = meanings[path];
	if (!meaning)
		throw Error(`Missing German feature question: ${kind}/${path}`);
	const question =
		verbalKinds.has(kind) && path === "surface.inflectionalFeatures.number"
			? "If the whole marked verbal target is finite, what Number does its verb form agree in? Read the actual finite morphology: third-singular sie liest differs from plural/formal sie/Sie lesen. Capitalized sentence-initial Sie alone does not establish formal address. Nonfinite targets are unmarked; do not inherit agreement from a separate modal."
			: (meaning.byKind?.[kind] ?? meaning.question);
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
		marked: "Contextual declining determiner with agreement or comparison features",
		citation:
			"Dictionary mention or genuinely invariant determiner such as derlei",
	},
	PRON: {
		marked: "Reflexive occurrence: the pronoun refers to its clause subject acting on or for itself",
		citation:
			"Nonreflexive occurrence or dictionary mention; marked Core Case/Number alone does not create Surface inflection",
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
