/**
 * Grammatical Resolution of a unit on an open route: everything but the
 * closed DET and PRON Lexemes. One jev request (`grammar`) judges what
 * neither the unit nor dumspec's tables already fix: a member's Typo or
 * Shorthand, the Surface's spelling, the route's Core Features, its
 * inflection, the auxiliaries' uses, the prepositions a head governs,
 * coverage. Then, side by side, a NOUN's Case question over the cells its
 * article and form leave open, when more than one remains (#625), and
 * Luna's Canonical Form and spellings (#862). Code derives the rest: the
 * article's cell and evidence (#681), perfect, future, passive and
 * causative from the auxiliaries (#686), a lexical reflexive's case where
 * its form shows it, a VERB's subject es, an ADP's case where the ADP Case
 * Table allows one.
 */
import { foldCase, lemmaIdentityKey } from "dumling";
import {
	type ArticleMember,
	authoredRealizations,
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
	germanArticleCell,
	germanArticleSpellings,
	germanParticles,
} from "dumspec/inventories";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../../call.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type { Ask, AskFailure } from "../../segment/ask.js";
import {
	moreParticleForms,
	particleForms,
} from "../../segment/de/candidates.js";
import type { LemmaCandidate } from "../types.js";
import {
	canonicalFormRequest,
	checkWritten,
	hintsFor,
	type Judged,
	type Written,
} from "./canonical-form.js";
import { guardedHeadword } from "./headword-guards.js";
import {
	ambiguousPieces,
	attestedMember,
	type MemberOrthography,
	rShortenings,
} from "./member-spelling.js";
import { numeralWord } from "./numeral.js";
import { auxiliaryUses, fill, question } from "./prompts.js";
import { Answered, Questionnaire, UnresolvedAnswer } from "./questions.js";
import {
	fixedSpelling,
	joinMembers,
	type Member,
	type Target,
	targetState,
} from "./target.js";

type Values = Record<string, unknown>;
type AdpCase = "Acc" | "Dat" | "Gen";

/** What an open-route click comes to before it is checked against Dumling. */
export type OpenOutcome =
	| { readonly _tag: "Attestation"; readonly attestation: Values }
	| { readonly _tag: "Unresolved"; readonly reason: string }
	| { readonly _tag: "CatalogMiss"; readonly message: string };

const cases = ["Nom", "Acc", "Dat", "Gen"] as const;
const caseNames = {
	Nom: "Nominative, as a subject or a predicate noun",
	Acc: "Accusative, as a direct object or after a preposition that takes it",
	Dat: "Dative, as an indirect object or after a preposition that takes it",
	Gen: "Genitive, as a possessor or after a preposition that takes it",
} as const;
const genders = {
	Masc: "Masculine",
	Fem: "Feminine",
	Neut: "Neuter",
} as const;
const numbers = { Sing: "Singular", Plur: "Plural" } as const;
/**
 * A gender question's options are named by the article the gender takes,
 * never Neut, which jev read as a neutral fallback when unsure (#876).
 */
const genderOfArticle: Readonly<Record<string, string>> = {
	der: "Masc",
	die: "Fem",
	das: "Neut",
};

/** The route's shape, as the questions and the Attestation need it. */
function routeShape(target: Target) {
	const { family, kind } = target.route;
	const lexeme = family === "Lexeme";
	const locution = family === "Locution";
	const nounLike =
		(lexeme && (kind === "NOUN" || kind === "PROPN")) ||
		(locution && kind === "NOUN");
	const verbal = (lexeme || locution) && kind === "VERB";
	const adjectival = (lexeme || locution) && kind === "ADJ";
	const adverbial = (lexeme || locution) && kind === "ADV";
	const adposition = (lexeme || locution) && kind === "ADP";
	const governor =
		verbal || adjectival || ((lexeme || locution) && kind === "NOUN");
	return {
		lexeme,
		locution,
		nounLike,
		proper: lexeme && kind === "PROPN",
		verbal,
		adjectival,
		adverbial,
		adposition,
		agreeing:
			(lexeme && (kind === "NUM" || kind === "SYM")) ||
			(locution && (kind === "DET" || kind === "NUM" || kind === "PRON")),
		/** A head whose governed preposition is its valency evidence (ADR 0034). */
		governor,
		/**
		 * A head that may govern a preposition: a governor, or a routine
		 * formula's head word, whose preposition only leaves its Surface.
		 */
		governs: governor || kind === "INTJ",
		articleOwner:
			(lexeme && ["NOUN", "PROPN", "ADJ", "NUM"].includes(kind)) ||
			(locution && kind === "NOUN"),
		inflects: !(
			family === "Saying" ||
			family === "Foreign" ||
			["ADP", "CCONJ", "SCONJ", "INTJ", "PART"].includes(kind)
		),
		/** A route whose inflection a dictionary citation leaves empty. */
		citable: nounLike || verbal,
		coverage: locution || family === "Saying",
		foreign: family === "Foreign",
	};
}
type Shape = ReturnType<typeof routeShape>;

const fold = (text: string) => foldCase(text, "de");
const spellingOf = (member: Member) => fixedSpelling(member) ?? member.text;

/**
 * The article that opens an article owner's unit, read through its fused
 * or shortened form (Rule de/only-der-and-ein-are-articles): a standalone
 * spelling that names no article as written may be a shortened one ('ne).
 */
function openingArticle(
	target: Target,
	shape: Shape,
):
	| {
			readonly member: Member;
			readonly article: ArticleMember;
			readonly orthography: MemberOrthography;
	  }
	| undefined {
	const [first] = target.members;
	if (!shape.articleOwner || !first || target.members.length < 2)
		return undefined;
	const tried = first.spelling
		? [first.spelling.orthography]
		: (["Standard", "Shorthand"] as const);
	for (const orthography of tried) {
		let article: ArticleMember;
		try {
			article = attestedMember(
				target.segments,
				first.segment,
				orthography,
				new Map(),
			);
		} catch {
			return undefined;
		}
		if (
			(germanArticleSpellings(article) ?? []).length > 0 &&
			germanArticleCell(article, {
				case: null,
				number: null,
				gender: null,
			})
		)
			return { member: first, article, orthography };
	}
	return undefined;
}

/** The cases a head's article leaves open for its number and gender. */
function articleCases(
	article: ArticleMember,
	number: string | null,
	gender: string | null,
): readonly string[] {
	return cases.filter(
		(grammaticalCase) =>
			germanArticleCell(article, {
				case: grammaticalCase,
				number,
				gender: number === "Plur" ? null : gender,
			}) !== undefined,
	);
}

/**
 * The cases an article leaves open whatever its head's number and gender,
 * when every agreement leaves the same two or more: then the Case question
 * can ride in the first request, since the head's form narrows nothing.
 */
function casesBeforeAgreement(article: ArticleMember): readonly string[] {
	const sets = [
		articleCases(article, "Sing", "Masc"),
		articleCases(article, "Sing", "Fem"),
		articleCases(article, "Sing", "Neut"),
		articleCases(article, "Plur", null),
	]
		.filter((set) => set.length > 0)
		.map((set) => set.join(","));
	const [first] = sets;
	return first && sets.every((set) => set === first) && first.includes(",")
		? first.split(",")
		: [];
}

/** The authored AUX uses a member's spelling realizes, by Canonical Form and Emoji Description. */
function auxiliaryUsesOf(member: Member): readonly string[] {
	const spelled = fold(member.text);
	return [
		...new Set(
			authoredRealizations
				.filter(
					(realization) =>
						realization.member.lemma.kind === "AUX" &&
						fold(realization.spelled) === spelled,
				)
				.map(
					({ member: authored }) =>
						`${authored.lemma.canonicalForm} ${authored.reading.emojiDescription}`,
				),
		),
	].filter((use) => use in auxiliaryUses);
}

/** The Surface features an auxiliary's use makes (ADR 0022, ADR 0026). */
const auxiliaryFeatures: Readonly<Record<string, Values>> = {
	"haben 🏁": { perfect: "Yes" },
	"sein 🏁": { perfect: "Yes" },
	"werden 🔮": { future: "Yes" },
	"werden 🔄": { passive: "Process", voice: "Pass" },
	"bekommen 🎁": { passive: "Recipient", voice: "Pass" },
	"lassen 🫴": { voice: "Cau" },
};

const reflexives: Readonly<Record<string, "Acc" | "Dat" | undefined>> = {
	sich: undefined,
	uns: undefined,
	euch: undefined,
	mich: "Acc",
	dich: "Acc",
	mir: "Dat",
	dir: "Dat",
};

/** Whether a member spells es, a clitic 's that may stand for it included. */
const spellsEs = (member: Member) =>
	fold(spellingOf(member)) === "es" ||
	(member.spelling?.surfaces.includes("es") ?? false);

/** Particles of particle verbs the segmenter's lists leave out (daliegen, leidtun). */
const verbParticles = new Set(["da", "leid"]);
const isParticle = (word: string) =>
	particleForms.has(word) ||
	moreParticleForms.has(word) ||
	verbParticles.has(word);

/**
 * The separable prefixes a VERB unit could carry, longest first: each
 * particle member standing apart from the verb, the words a shortened one
 * stands for in its place (rein is herein or hinein, never a prefix of its
 * own: Rule de/r-adverb-is-her-or-hin-shorthand), and each particle a
 * member's word begins with. A member that is no particle, such as the
 * verb's own participle, is never offered whole.
 */
function prefixCandidates(target: Target, skip: ReadonlySet<number>) {
	const found = new Set<string>();
	for (const member of target.members) {
		if (skip.has(member.position)) continue;
		const word = fold(spellingOf(member));
		if (
			target.members.length > 1 &&
			member.spelling?.orthography === "Shorthand"
		)
			for (const surface of member.spelling.surfaces)
				found.add(fold(surface));
		else if (
			target.members.length > 1 &&
			/^\p{L}+$/u.test(word) &&
			isParticle(word)
		)
			found.add(word);
		for (let length = word.length - 2; length >= 2; length--) {
			const prefix = word.slice(0, length);
			if (isParticle(prefix)) found.add(prefix);
		}
	}
	return [...found].sort((left, right) => right.length - left.length);
}

/** A member that may be the preposition its head governs, with the cases the ADP Case Table lets it take. */
type Governable = {
	readonly member: Member;
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
};

function governableMembers(
	target: Target,
	skip: ReadonlySet<number>,
): readonly Governable[] {
	if (target.members.length < 2) return [];
	return target.members.flatMap((member) => {
		const whole =
			member.spelling?.orthography === "Fused" &&
			member.spelling.written !== undefined;
		if (skip.has(member.position) || whole) return [];
		const preposition = fold(spellingOf(member));
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: preposition,
		});
		return entry
			? [
					{
						member,
						preposition,
						cases: germanAdpositionAllowedCases(entry),
					},
				]
			: [];
	});
}

/** Everything the first request asks, and what code fixed before it. */
type Plan = {
	readonly questionnaire: Questionnaire;
	readonly shape: Shape;
	readonly article: ReturnType<typeof openingArticle>;
	readonly auxiliaries: readonly {
		readonly member: Member;
		readonly uses: readonly string[];
	}[];
	readonly reflexive: Member | undefined;
	readonly expletive: Member | undefined;
	readonly prefixes: readonly string[];
	readonly governable: readonly Governable[];
	readonly pieces: ReturnType<typeof ambiguousPieces>;
	/** Shortened members whose word is judged, by Segment. */
	readonly shortened: readonly Member[];
	/** Readings code fixes: a VERB's clitic 's is its subject es. */
	readonly presetReadings: ReadonlyMap<number, string>;
	/** Cases asked in the first request, before agreement is known. */
	readonly earlyCases: readonly string[];
	readonly adpositionCases: readonly AdpCase[] | undefined;
};

/** Asks an agreeing word's case, gender and number. */
function agreementQuestions(questionnaire: Questionnaire) {
	questionnaire.choice("agreement.case", question.agreementCase, caseNames);
	questionnaire.choice("agreement.gender", question.agreementGender, {
		...genders,
		Unmarked: "No gender: plural agreement",
	});
	questionnaire.choice("agreement.number", question.agreementNumber, numbers);
}

/** The Case question over the cases still open. */
function caseQuestion(
	questionnaire: Questionnaire,
	open: readonly string[],
): void {
	questionnaire.choice(
		"case",
		question.nounCase,
		Object.fromEntries(
			open.map((value) => [
				value,
				value === "Unmarked"
					? question.unmarkedCase
					: caseNames[value as keyof typeof caseNames],
			]),
		),
		["inflection"],
	);
}

function plan(target: Target): Plan {
	const shape = routeShape(target);
	const questionnaire = new Questionnaire();
	const article = openingArticle(target, shape);
	const expletives = shape.verbal ? target.members.filter(spellsEs) : [];
	const expletive = expletives.length === 1 ? expletives[0] : undefined;
	// A VERB holds es only as its subject es (Rule de/expletive-es-joins-its-verb).
	const presetReadings = new Map<number, string>(
		expletive && shape.lexeme && expletive.spelling
			? [[expletive.segment, "es"]]
			: [],
	);
	const pieces = new Map(
		[
			...ambiguousPieces(
				target.segments,
				target.members.map(({ segment }) => segment),
			),
		].filter(([segment]) => !presetReadings.has(segment)),
	);
	// A member the table spells, or an article read as shortened, is not judged.
	const judgedMembers = target.members.filter(
		(member) => !member.spelling && member !== article?.member,
	);
	if (judgedMembers.length > 0)
		questionnaire.choice(
			"orthography",
			question.orthography,
			{
				None: question.orthographyNone,
				...Object.fromEntries(
					judgedMembers.flatMap((member) => [
						[
							`t${member.position}`,
							fill(question.typoMember, { m: member.ref }),
						],
						[
							`s${member.position}`,
							fill(question.shorthandMember, { m: member.ref }),
						],
					]),
				),
			},
			["orthography"],
		);
	if (!shape.foreign && judgedMembers.length > 0) {
		questionnaire.choice(
			"spelling",
			question.spelling,
			{
				Canonical: question.spellingCanonical,
				Licensed: "Another spelling a current standard accepts",
				Historical: "A spelling only an earlier standard accepted",
				Regional: "A dialect or regional spelling",
				Expressive: "Letters stretched for effect",
			},
			["orthography"],
		);
		questionnaire.choice(
			"archaic",
			question.archaic,
			{ Current: "A current form", Archaic: "An archaic form" },
			["orthography"],
		);
	}
	for (const [segment, piece] of pieces)
		questionnaire.choice(
			`reading_s${segment}`,
			fill(question.reading, {
				m: target.members[piece.member]?.ref ?? "",
				word: piece.spelling,
				piece: target.segments[segment]?.text ?? "",
			}),
			Object.fromEntries(
				piece.surfaces.map((surface, index) => [`w${index}`, surface]),
			),
			["fused"],
		);
	// A shortened adverb the table cannot settle (raus: heraus or hinaus)
	// is judged here; a VERB's prefix question settles its particle.
	const shortened = shape.verbal
		? []
		: target.members.filter(
				(member) =>
					member.spelling?.orthography === "Shorthand" &&
					member.spelling.surfaces.length > 1,
			);
	for (const member of shortened)
		questionnaire.choice(
			`short_s${member.segment}`,
			fill(question.shortened, { m: member.ref }),
			Object.fromEntries(
				(member.spelling?.surfaces ?? []).map((surface, index) => [
					`w${index}`,
					surface,
				]),
			),
			["orthography"],
		);
	if (shape.citable && !article)
		questionnaire.choice(
			"citation",
			question.citation,
			{
				Used: "Used in the sentence, inflected as its role there needs",
				Citation:
					"Only mentioned, as a dictionary entry, a name or a title",
			},
			["inflection"],
		);
	const auxiliaries =
		shape.verbal && target.members.length > 1
			? target.members.flatMap((member) => {
					const uses = auxiliaryUsesOf(member);
					return uses.length > 0 ? [{ member, uses }] : [];
				})
			: [];
	for (const { member, uses } of auxiliaries)
		questionnaire.choice(
			`aux_m${member.position}`,
			fill(question.auxiliary, { m: member.ref }),
			{
				...Object.fromEntries(
					uses.map((use, index) => [
						`u${index}`,
						auxiliaryUses[use] ?? use,
					]),
				),
				Main: question.auxiliaryMain,
			},
			["verbal"],
		);
	const reflexive =
		shape.verbal && shape.lexeme
			? target.members.find((member) => fold(member.text) in reflexives)
			: undefined;
	if (reflexive && reflexives[fold(reflexive.text)] === undefined)
		questionnaire.choice(
			"reflexive",
			fill(question.reflexive, { m: reflexive.ref }),
			{ Acc: "Accusative", Dat: "Dative" },
			["verbCore"],
		);
	if (expletive && shape.locution)
		questionnaire.choice(
			"expletive",
			fill(question.expletive, { m: expletive.ref }),
			{
				Subject: "Yes: the subject es, referring to nothing",
				None: "No: an object or a fixed word of the expression",
			},
		);
	const satellites = new Set(
		[
			...auxiliaries.map(({ member }) => member),
			...(reflexive ? [reflexive] : []),
			...expletives,
			...(article ? [article.member] : []),
		].map(({ position }) => position),
	);
	const prefixes =
		shape.verbal && shape.lexeme
			? prefixCandidates(target, satellites)
			: [];
	if (prefixes.length > 0)
		questionnaire.choice(
			"prefix",
			question.prefix,
			{
				...Object.fromEntries(
					prefixes.map((prefix, index) => [`p${index}`, prefix]),
				),
				None: "No separable prefix: the verb's dictionary infinitive is written without any of these",
			},
			["verbCore"],
		);
	if (shape.verbal) {
		questionnaire.choice(
			"verbForm",
			question.verbForm,
			{
				Fin: "Finite: its own finite verb or auxiliary, an imperative included",
				Inf: "An infinitive, a separate modal's finite form aside",
				Part: "A participle, without its own finite or infinitive auxiliary",
			},
			["verbal"],
		);
		questionnaire.choice("mood", question.mood, {
			Ind: "Indicative",
			Sub: "Subjunctive, Konjunktiv I or II",
			Imp: "Imperative",
		});
		questionnaire.choice("tense", question.tense, {
			Pres: "Present",
			Past: "Past",
		});
		questionnaire.choice("person", question.person, {
			"1": "First person",
			"2": "Second person",
			"3": "Third person, formal Sie included",
		});
		questionnaire.choice("number", question.verbNumber, numbers);
		questionnaire.choice("participle", question.participle, {
			Present: "Present participle",
			Past: "Past participle",
		});
	}
	if (shape.nounLike) {
		if (shape.proper) {
			questionnaire.choice(
				"article",
				question.properArticle,
				{
					Definite: "Cited with its definite article",
					Bare: "Cited bare",
				},
				["properNoun"],
			);
			questionnaire.choice(
				"gender",
				question.properGender,
				{
					der: question.properGenderMasc,
					die: question.properGenderFem,
					das: question.properGenderNeut,
					None: question.properGenderNone,
				},
				["properNoun"],
			);
		} else {
			questionnaire.choice(
				"gender",
				shape.locution ? question.locutionGender : question.nounGender,
				{
					der: question.nounGenderMasc,
					die: question.nounGenderFem,
					das: question.nounGenderNeut,
					None: question.nounGenderNone,
				},
				["noun"],
			);
			if (!shape.locution)
				questionnaire.choice(
					"nounKind",
					question.nounKind,
					{
						Ordinary: question.nounKindOrdinary,
						PluralOnly: question.nounKindPluralOnly,
						Adjectival: question.nounKindAdjectival,
					},
					["noun"],
				);
		}
		questionnaire.choice("number", question.nounNumber, numbers);
		if (!shape.locution)
			questionnaire.choice("formGender", question.formGender, {
				der: "Masculine, as der shows",
				die: "Feminine, as die shows",
				das: "Neuter, as das shows",
			});
	}
	const earlyCases = !shape.nounLike
		? []
		: article
			? casesBeforeAgreement(article.article)
			: [...cases, "Unmarked"];
	if (earlyCases.length > 0) caseQuestion(questionnaire, earlyCases);
	// A bare w-word as an ADV asks, opens a clause or stands for its irgend-
	// word (Rule de/bare-w-word-is-shorthand).
	const [lone] = target.members;
	if (
		shape.adverbial &&
		shape.lexeme &&
		target.members.length === 1 &&
		lone &&
		!lone.spelling &&
		bareWWords.has(fold(lone.text))
	)
		questionnaire.choice(
			"indefinite",
			fill(question.indefinite, { m: lone.ref }),
			{
				Asks: question.indefiniteAsks,
				Indefinite: question.indefiniteIrgend,
			},
			["orthography"],
		);
	if (shape.adjectival || shape.adverbial) {
		questionnaire.choice(
			"comparable",
			question.comparable,
			{ Yes: question.comparableYes, No: question.comparableNo },
			["adjective"],
		);
		questionnaire.choice("degree", question.degree, {
			Pos: "Positive, uncompared",
			Cmp: "Comparative",
			Sup: "Superlative, am … -sten included",
		});
	}
	if (shape.adjectival) {
		questionnaire.choice("attributive", question.attributive, {
			Yes: "It agrees with a noun",
			No: "Predicative or adverbial, agreeing with nothing",
		});
		agreementQuestions(questionnaire);
	}
	if (shape.agreeing) {
		questionnaire.choice(
			"inflects",
			question.inflects,
			{ Yes: "It inflects here", No: "Invariant here" },
			["inflection"],
		);
		agreementQuestions(questionnaire);
	}
	let adpositionCases: readonly AdpCase[] | undefined;
	if (shape.adposition) {
		const [only] = target.members;
		const entry =
			shape.lexeme && only && target.members.length === 1
				? germanAdpositionEntry({
						family: "Lexeme",
						canonicalForm: fold(spellingOf(only)),
					})
				: null;
		adpositionCases = entry
			? germanAdpositionAllowedCases(entry)
			: ["Acc", "Dat", "Gen"];
		if (adpositionCases.length > 1)
			questionnaire.choice("realizedCase", question.realizedCase, {
				...Object.fromEntries(
					adpositionCases.map((value) => [value, caseNames[value]]),
				),
				None: question.realizedCaseNone,
			});
	}
	if (target.route.kind === "INTJ" && shape.lexeme)
		questionnaire.choice(
			"answer",
			question.answer,
			{ Res: "An answer word", None: "Another interjection" },
			["interjection"],
		);
	if (shape.foreign)
		questionnaire.choice(
			"sourceLanguage",
			question.sourceLanguage,
			{
				en: "English",
				fr: "French",
				it: "Italian",
				es: "Spanish",
				la: "Latin",
				pt: "Portuguese",
				nl: "Dutch",
				sv: "Swedish",
				ru: "Russian",
				tr: "Turkish",
				ja: "Japanese",
			},
			["foreign"],
		);
	if (shape.coverage)
		questionnaire.choice(
			"coverage",
			question.coverage,
			{
				Full: "All of its fixed wording is realized",
				Partial:
					"Some fixed wording is missing or deliberately changed",
			},
			["coverage"],
		);
	const governable = shape.governs
		? governableMembers(target, satellites)
		: [];
	for (const { member, cases: allowed } of governable) {
		questionnaire.choice(
			`governed_m${member.position}`,
			fill(question.governed, { m: member.ref }),
			{
				Governed: "Yes, the head selects it",
				Free: question.governedFree,
			},
			["government"],
		);
		if (!shape.governor) continue;
		if (allowed.length > 1)
			questionnaire.choice(
				`governedCase_m${member.position}`,
				fill(question.governedCase, { m: member.ref }),
				Object.fromEntries(
					allowed.map((value) => [value, caseNames[value]]),
				),
			);
		questionnaire.choice(
			`governedReferent_m${member.position}`,
			fill(question.governedReferent, { m: member.ref }),
			{
				Someone: "A person or people",
				Something: "A thing, place, event, fact or idea",
				Either: "Either: the sentence leaves it open or it names both",
			},
		);
	}
	questionnaire.cite("identity");
	return {
		questionnaire,
		shape,
		article,
		auxiliaries,
		reflexive,
		expletive,
		prefixes,
		governable,
		pieces,
		shortened,
		presetReadings,
		earlyCases,
		adpositionCases,
	};
}

/** What the first request settled, and what is still open. */
type FirstRead = {
	readonly core: Values;
	readonly inflection: Values | null | undefined;
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Values;
	readonly surfaceFeatures: Values | null;
	readonly coverage: "Full" | "Partial";
	readonly readings: ReadonlyMap<number, string>;
	readonly governed: readonly Values[];
	readonly governedPositions: readonly number[];
	readonly expletive: Member | undefined;
	readonly realizedCase: AdpCase | "None" | undefined;
	/** The cases a NOUN's Case question still has to choose among. */
	readonly openCases: readonly string[];
	/** A used common NOUN's number and the gender jev saw its form show, for Luna's article. */
	readonly noun?: {
		readonly number: string;
		readonly shown: string | null;
		readonly earlyCase: string | undefined;
	};
};

/** A verbal Surface's features, from its form questions and its auxiliaries' uses. */
function verbalInflection(
	planned: Plan,
	answered: Answered,
	expletive: Member | undefined,
): Values {
	const composition: Values = {
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	};
	for (const { member, uses } of planned.auxiliaries) {
		const answer = answered.pick(`aux_m${member.position}`);
		if (answer === "Main") continue;
		const use = uses[Number(answer.slice(1))];
		for (const [feature, value] of Object.entries(
			(use && auxiliaryFeatures[use]) ?? {},
		)) {
			if (composition[feature] !== null && composition[feature] !== value)
				throw new UnresolvedAnswer(
					"The auxiliaries' uses do not compose",
				);
			composition[feature] = value;
		}
	}
	const verbForm = answered.pick("verbForm");
	const finite = verbForm === "Fin";
	const mood = finite ? answered.pick("mood") : null;
	return {
		mood,
		number: finite ? answered.pick("number") : null,
		person: finite ? answered.pick("person") : null,
		tense: finite && mood !== "Imp" ? answered.pick("tense") : null,
		verbForm,
		...(verbForm === "Part"
			? { participleForm: answered.peek("participle") ?? null }
			: {}),
		expletive: expletive ? "Subject" : null,
		...composition,
	};
}

/** Reads the first request's answers; an Unresolved deciding answer throws. */
function readFirst(
	target: Target,
	planned: Plan,
	answered: Answered,
): FirstRead {
	const { shape, questionnaire } = planned;
	const irregular = questionnaire.questions.orthography
		? answered.pick("orthography")
		: "None";
	const indefinite = answered.peek("indefinite") === "Indefinite";
	const orthographies = target.members.map(
		(member): MemberOrthography =>
			member.spelling?.orthography ??
			(member === planned.article?.member
				? planned.article.orthography
				: irregular === `t${member.position}`
					? "Typo"
					: irregular === `s${member.position}` || indefinite
						? "Shorthand"
						: "Standard"),
	);
	const spellingAnswer = questionnaire.questions.spelling
		? answered.pick("spelling")
		: "Canonical";
	const digits = target.members.every(
		(member) => member.spelling || /^\d+$/u.test(member.text),
	);
	const spelling =
		target.route.kind === "NUM" && digits
			? { kind: "Variant", variantTags: ["Licensed"] }
			: spellingAnswer === "Canonical"
				? { kind: "Canonical" }
				: { kind: "Variant", variantTags: [spellingAnswer] };
	const surfaceFeatures =
		questionnaire.questions.archaic &&
		answered.pick("archaic") === "Archaic"
			? { historicalStatus: "Archaic" }
			: null;
	const readings = new Map(planned.presetReadings);
	for (const [segment, piece] of planned.pieces) {
		const answer = answered.pick(`reading_s${segment}`);
		const reading = piece.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(`No reading of Segment ${segment}`);
		readings.set(segment, reading);
	}
	for (const member of planned.shortened) {
		const answer = answered.pick(`short_s${member.segment}`);
		const reading = member.spelling?.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(
				`No reading of Segment ${member.segment}`,
			);
		readings.set(member.segment, reading);
	}
	const cited =
		questionnaire.questions.citation !== undefined &&
		answered.pick("citation") === "Citation";
	const core: Values = {};
	let inflection: Values | null | undefined = shape.inflects
		? null
		: undefined;
	let expletive: Member | undefined;
	let openCases: readonly string[] = [];
	let noun: FirstRead["noun"];
	if (shape.verbal) {
		if (shape.lexeme) {
			const prefix = planned.prefixes.length
				? prefixAnswer(target, planned.prefixes, answered)
				: "None";
			core.hasSepPrefix =
				prefix === "None"
					? null
					: (planned.prefixes[Number(prefix.slice(1))] ?? null);
			// A shortened particle stands for the prefix judged for it
			// (rein is herein when the verb is hereinkommen).
			for (const member of target.members)
				if (
					member.spelling?.orthography === "Shorthand" &&
					typeof core.hasSepPrefix === "string" &&
					member.spelling.surfaces.length > 1 &&
					member.spelling.surfaces.includes(core.hasSepPrefix)
				)
					readings.set(member.segment, core.hasSepPrefix);
			const reflexive = planned.reflexive;
			core.lexicallyReflexive = reflexive
				? (reflexives[fold(reflexive.text)] ??
					answered.pick("reflexive"))
				: null;
		}
		expletive =
			planned.expletive &&
			(shape.lexeme || answered.pick("expletive") === "Subject")
				? planned.expletive
				: undefined;
		inflection = cited
			? null
			: verbalInflection(planned, answered, expletive);
	}
	if (shape.nounLike) {
		if (shape.proper)
			core.article =
				answered.pick("article") === "Definite" ? "Definite" : null;
		const gender = answered.pick("gender");
		core.gender =
			gender === "None" ? null : (genderOfArticle[gender] ?? gender);
		// Only a person noun made from an adjective or participle, or a noun
		// with no singular, has no gender (Rule de/adjectival-noun-lemma);
		// an ordinary noun shown in its plural keeps its singular's.
		const kind = answered.peek("nounKind");
		if (kind === "Adjectival" || kind === "PluralOnly") core.gender = null;
		if (kind === "Ordinary" && core.gender === null) {
			const likeliest = answered
				.alternatives("gender")
				.find((option) => option in genderOfArticle);
			if (likeliest !== undefined)
				core.gender = genderOfArticle[likeliest];
		}
		if (!cited) {
			const number = answered.pick("number");
			const shown =
				!shape.locution && core.gender === null && number === "Sing"
					? answered.peek("formGender")
					: undefined;
			let formGender =
				shown === undefined ? null : (genderOfArticle[shown] ?? shown);
			if (shape.lexeme && !shape.proper) {
				const seen = answered.peek("formGender");
				noun = {
					number,
					shown:
						seen === undefined
							? null
							: (genderOfArticle[seen] ?? seen),
					earlyCase:
						planned.earlyCases.length > 0
							? answered.peek("case")
							: undefined,
				};
			}
			// A singular head's owned article is hard evidence of its
			// gender: when the judged one agrees with no case of the
			// article, the likeliest other gender jev weighed that does is
			// read instead (der Tisch is never Neut).
			const article = planned.article?.article;
			const judgedGender = (formGender ?? core.gender) as string | null;
			if (
				article &&
				!shape.locution &&
				number === "Sing" &&
				articleCases(article, number, judgedGender).length === 0
			) {
				const id = core.gender === null ? "formGender" : "gender";
				const agreeing = (
					id in planned.questionnaire.questions
						? answered.alternatives(id)
						: []
				)
					.map((option) => genderOfArticle[option])
					.find(
						(option) =>
							option !== undefined &&
							articleCases(article, number, option).length > 0,
					);
				if (agreeing !== undefined && id === "gender")
					core.gender = agreeing;
				if (agreeing !== undefined && id === "formGender")
					formGender = agreeing;
			}
			if (
				!shape.locution &&
				!shape.proper &&
				core.gender === null &&
				number === "Sing" &&
				!formGender
			)
				throw new UnresolvedAnswer("Unresolved formGender");
			inflection = shape.locution
				? { case: null, number }
				: { case: null, gender: formGender, number };
			const agreeing = (formGender ?? core.gender) as string | null;
			openCases = planned.article
				? articleCases(planned.article.article, number, agreeing)
				: [...cases, "Unmarked"];
			// A common NOUN waits for the article Luna writes before this verdict.
			if (openCases.length === 0 && !noun)
				throw new UnresolvedAnswer(
					"The article agrees with no case of its head",
				);
			if (openCases.length > 0 && planned.earlyCases.length > 0) {
				const answer = answered.pick("case");
				if (!openCases.includes(answer))
					throw new UnresolvedAnswer(
						"The Case answer fits no open cell",
					);
				openCases = [answer];
			}
			if (openCases.length === 1)
				inflection.case =
					openCases[0] === "Unmarked" ? null : openCases[0];
		}
	}
	if (shape.adjectival || shape.adverbial) {
		const comparable = answered.pick("comparable") === "Yes";
		core.comparable = comparable ? "Yes" : null;
		const degree = comparable ? answered.pick("degree") : null;
		if (shape.adverbial) inflection = comparable ? { degree } : null;
		else {
			const attributive = answered.pick("attributive") === "Yes";
			const number = attributive
				? answered.pick("agreement.number")
				: null;
			const gender = attributive
				? answered.pick("agreement.gender")
				: null;
			inflection =
				attributive || comparable
					? {
							case: attributive
								? answered.pick("agreement.case")
								: null,
							degree,
							gender:
								gender === "Unmarked" || number === "Plur"
									? null
									: gender,
							number,
						}
					: null;
		}
	}
	if (shape.agreeing) {
		const inflects = answered.pick("inflects") === "Yes";
		if (inflects) {
			const number = answered.pick("agreement.number");
			const gender = answered.pick("agreement.gender");
			inflection = {
				case: answered.pick("agreement.case"),
				gender:
					gender === "Unmarked" || number === "Plur" ? null : gender,
				number,
			};
		} else inflection = null;
	}
	let realizedCase: AdpCase | "None" | undefined;
	if (shape.adposition) {
		const allowed = planned.adpositionCases ?? [];
		realizedCase =
			allowed.length === 1
				? allowed[0]
				: (answered.pick("realizedCase") as AdpCase | "None");
	}
	if (target.route.kind === "INTJ" && shape.lexeme)
		core.partType = answered.pick("answer") === "Res" ? "Res" : null;
	if (shape.foreign) core.sourceLang = answered.pick("sourceLanguage");
	const coverage =
		shape.coverage && answered.pick("coverage") === "Partial"
			? "Partial"
			: "Full";
	const governed: Values[] = [];
	const governedPositions: number[] = [];
	for (const chosen of planned.governable) {
		const position = chosen.member.position;
		if (answered.pick(`governed_m${position}`) !== "Governed") continue;
		governedPositions.push(position);
		if (!shape.governor) continue;
		const governedCase =
			chosen.cases.length === 1
				? chosen.cases[0]
				: answered.pick(`governedCase_m${position}`);
		governed.push({
			member: position,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: chosen.preposition,
					coreFeatures: {},
				},
				governedCase,
				referent:
					answered.peek(`governedReferent_m${position}`) ?? "Either",
			},
			realizedCase: governedCase,
		});
	}
	return {
		core,
		inflection,
		orthographies,
		spelling,
		surfaceFeatures,
		coverage,
		readings,
		governed,
		governedPositions,
		expletive,
		realizedCase,
		openCases,
		...(noun ? { noun } : {}),
	};
}

/** Settles a synchronous reading, an Unresolved deciding answer included. */
function settle<T>(read: () => T): T | UnresolvedAnswer {
	try {
		return read();
	} catch (error) {
		if (error instanceof UnresolvedAnswer) return error;
		throw error;
	}
}

/**
 * A VERB's Canonical Form as its judged Core Features require it (Rule
 * de/verb-core-features, de/canonical-form-is-the-headword): the
 * infinitive with its separable prefix and, for a lexical reflexive, sich
 * before it. Luna's form is kept when it already has both. A prefix it
 * left out is written on, over the r- shortening Luna wrote for it
 * (reinkommen is hereinkommen) or over a shorter particle that ends the
 * prefix (umkommen is herumkommen).
 */
export function verbHeadword(form: string, core: Values): string {
	const reflexive = /^sich\s+/u.test(form) || core.lexicallyReflexive;
	let verb = form.replace(/^sich\s+/u, "");
	const prefix = core.hasSepPrefix;
	if (typeof prefix === "string" && !fold(verb).startsWith(fold(prefix))) {
		const folded = fold(verb);
		const shortening = Object.entries(rShortenings).find(
			([word, expansions]) =>
				expansions.includes(fold(prefix)) && folded.startsWith(word),
		)?.[0];
		const tail = [...fold(prefix)]
			.map((_, start) => fold(prefix).slice(start))
			.find(
				(ending) =>
					ending.length >= 2 &&
					ending.length < prefix.length &&
					isParticle(ending) &&
					folded.startsWith(ending),
			);
		verb = `${prefix}${verb.slice(shortening?.length ?? tail?.length ?? 0)}`;
	}
	return reflexive ? `sich ${verb}` : verb;
}

/**
 * A common NOUN's Core gender and cells from the article Luna wrote with
 * its headword (der Kran; Rules de/core-features-are-identity,
 * de/adjectival-noun-lemma: none for a person noun made from an adjective
 * or participle or a plural-only noun). Undefined keeps jev's reading,
 * which already fell back to the likeliest gender the Sentence's article
 * allows: when Luna wrote none, or a gender the singular head's owned
 * article agrees with in no case, or none for a singular form whose
 * gender jev saw no form show, or one that rules out a Case jev answered.
 */
function nounCells(
	planned: Plan,
	first: FirstRead,
	article: Written["article"],
):
	| {
			readonly core: Values;
			readonly inflection: Values | null | undefined;
			readonly openCases: readonly string[];
	  }
	| undefined {
	const { noun } = first;
	if (!noun || !article || !first.inflection) return undefined;
	const gender =
		article === "none" ? null : (genderOfArticle[article] ?? null);
	if (gender === (first.core.gender ?? null)) return undefined;
	const singular = noun.number === "Sing";
	const formGender = gender === null && singular ? noun.shown : null;
	if (gender === null && singular && formGender === null) return undefined;
	const agreeing = formGender ?? gender;
	let openCases: readonly string[] = planned.article
		? articleCases(planned.article.article, noun.number, agreeing)
		: [...cases, "Unmarked"];
	if (openCases.length === 0) return undefined;
	if (noun.earlyCase !== undefined) {
		if (!openCases.includes(noun.earlyCase)) return undefined;
		openCases = [noun.earlyCase];
	}
	const [only] = openCases;
	return {
		core: { ...first.core, gender },
		inflection: {
			...first.inflection,
			gender: formGender,
			case:
				openCases.length === 1 && only !== undefined
					? only === "Unmarked"
						? null
						: only
					: null,
		},
		openCases,
	};
}

/**
 * The prefix answer. A shortened r- word in the verbal bracket is the
 * particle of its her- or hin- word's particle verb (Rule
 * de/r-adverb-is-her-or-hin-shorthand), so when jev leaves the prefix
 * Unresolved, the likelier of those two it weighed is read; None is never
 * one of them.
 */
function prefixAnswer(
	target: Target,
	prefixes: readonly string[],
	answered: Answered,
): string {
	const governed = (word: string) =>
		target.members.some(
			(member) =>
				fold(spellingOf(member)) === word &&
				answered.peek(`governed_m${member.position}`) === "Governed",
		);
	const settled = answered.peek("prefix");
	// A preposition the verb governs is never its prefix (Rule
	// de/verb-core-features): warten auf is warten.
	if (settled !== undefined && settled !== "None") {
		const prefix = prefixes[Number(settled.slice(1))];
		return prefix !== undefined && governed(prefix) ? "None" : settled;
	}
	// A particle standing apart that segmentation put in the VERB unit, and
	// that the verb does not govern, is its separable prefix: it belongs to
	// the verb's Lemma, and only the prefix can (de/verb-core-features,
	// de/bracket-particle-or-circumposition): tut … leid is leidtun. A
	// preposition followed by a word has its own complement and is never
	// the prefix (sich mit ihm zanken; de/verb-core-features).
	const ownComplement = (member: Member) => {
		if (
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(member.text),
			}) === null
		)
			return false;
		const next = target.segments
			.slice(member.segment + 1)
			.find((segment) => segment.kind !== "Whitespace");
		// A coordinating conjunction or another preposition after it opens
		// no complement of its own (gingen … entlang und spazierten; liefen
		// den Fluss entlang bis zur Brücke).
		return (
			next?.kind === "ResolvableText" &&
			!coordinators.has(fold(next.text)) &&
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(next.text),
			}) === null
		);
	};
	const standing = prefixes.flatMap((prefix, index) =>
		target.members.length > 1 &&
		target.members.some(
			(member) =>
				fold(spellingOf(member)) === prefix &&
				member.spelling === undefined &&
				!ownComplement(member),
		) &&
		!governed(prefix)
			? [`p${index}`]
			: [],
	);
	if (settled === "None")
		return standing.length === 1 ? (standing[0] as string) : "None";
	const expansions = new Set(
		target.members.flatMap((member) =>
			member.spelling?.orthography === "Shorthand" &&
			member.spelling.surfaces.some((surface) => surface in shortenedFrom)
				? member.spelling.surfaces
				: [],
		),
	);
	const likeliest = answered.alternatives("prefix", 0).find((option) => {
		const prefix = prefixes[Number(option.slice(1))];
		return prefix !== undefined && expansions.has(prefix);
	});
	return likeliest ?? answered.pick("prefix");
}

/** Each her- or hin- word an r- shortening stands for. */
const shortenedFrom: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(rShortenings).flatMap(([word, expansions]) =>
		expansions.map((expansion) => [expansion, word]),
	),
);

/** Coordinating conjunctions, which never open a preposition's complement. */
const coordinators = new Set([
	"und",
	"oder",
	"aber",
	"sondern",
	"denn",
	"sowie",
]);

/** The positive of each suppletive adverb's compared forms (gern: lieber, am liebsten). */
const suppletivePositive: Readonly<Record<string, string>> = {
	lieber: "gern",
	liebsten: "gern",
	eher: "bald",
	ehesten: "bald",
	besser: "gut",
	besten: "gut",
	mehr: "viel",
	meisten: "viel",
	weniger: "wenig",
	wenigsten: "wenig",
};

/** An ordinal's stem without its ending, as Luna writes it bare (erst, zweit). */
const ordinalStem =
	/^(erst|zweit|dritt|viert|fünft|sechst|siebt|neunt|zehnt|elft|zwölft|(drei|vier|fünf|sech|sieb|acht|neun)zehnt|(zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)st)$/u;

/** The irgend- words a bare w-word judged Shorthand stands for (Rule de/bare-w-word-is-shorthand). */
const bareWWords = new Set(["wo", "wie", "wann", "woher", "wohin"]);

/**
 * An ADV Lexeme's Canonical Form where the Rules settle it, whatever Luna
 * wrote: a da, wo or hier split from its hin, her or preposition is the
 * one word they form, with r before a vowel (da … auf is darauf; Rules
 * de/split-adverb-is-one-target, de/pronominal-adverb-stands-alone); a
 * bare w-word judged Shorthand is its irgend- word, member and headword
 * (de/bare-w-word-is-shorthand); a member the table spells as one word (a
 * dr- adverb, an r- adverb whose her- or hin- word was judged) is the
 * headword (de/dr-adverb-is-da-shorthand, de/r-adverb-is-her-or-hin-shorthand).
 */
export function adverbHeadword(
	target: Target,
	orthographies: readonly MemberOrthography[],
	spelled: readonly string[],
):
	| {
			readonly canonicalForm: string;
			readonly members: ReadonlyMap<number, string>;
	  }
	| undefined {
	const words = target.members.map((member) => fold(member.text));
	const [first, second] = words;
	if (
		target.members.length === 2 &&
		first !== undefined &&
		second !== undefined &&
		["da", "wo", "hier"].includes(first) &&
		/^\p{L}+$/u.test(second) &&
		orthographies.every((orthography) => orthography === "Standard")
	) {
		const joint =
			first !== "hier" && /^[aeiouäöü]/u.test(second) ? "r" : "";
		return {
			canonicalForm: `${first}${joint}${second}`,
			members: new Map(),
		};
	}
	if (target.members.length !== 1 || first === undefined) return undefined;
	const [member] = target.members;
	if (orthographies[0] === "Shorthand" && bareWWords.has(first)) {
		const word = `irgend${first}`;
		return { canonicalForm: word, members: new Map([[0, word]]) };
	}
	const fixed =
		member?.spelling?.orthography === "Shorthand" ? spelled[0] : undefined;
	return fixed !== undefined &&
		fold(fixed) !== first &&
		/^\p{L}+$/u.test(fixed)
		? { canonicalForm: fold(fixed), members: new Map() }
		: undefined;
}

/**
 * The authored PART Lemmas whose Canonical Form is `form`, compared
 * without case; a Lemma's several Readings count once.
 */
const particlesSpelled = (form: string) => [
	...new Map(
		germanParticles
			.filter((member) => fold(member.lemma.canonicalForm) === fold(form))
			.map((member) => [lemmaIdentityKey(member.lemma), member]),
	).values(),
];

/**
 * Resolves a unit on an open route: the grammar request, then the Case
 * question and Luna's call side by side, then the Attestation as an
 * unchecked value.
 */
export const resolveOpenRoute = Effect.fnUntraced(function* (
	scope: OperationScope,
	target: Target,
	ask: Ask,
	luna: LunaSettings,
	candidates: readonly LemmaCandidate[],
): Effect.fn.Return<OpenOutcome, AskFailure> {
	const planned = plan(target);
	const { shape } = planned;
	const state = targetState(target);
	const answers = planned.questionnaire.empty
		? {}
		: yield* ask({
				stage: "grammar",
				state: {
					...state,
					policy: planned.questionnaire.policyBlock(),
				},
				questions: planned.questionnaire.questions,
			});
	const first = settle(() =>
		readFirst(target, planned, new Answered(answers)),
	);
	if (first instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: first.reason };
	// A PART is authored (#734): its spelling names its member, or Luna's
	// headword does when the member is no Standard spelling.
	const particleSpelled =
		target.route.kind === "PART" && target.members.length === 1
			? particlesSpelled(spellingOf(target.members[0] as Member))
			: [];
	const article = planned.article;
	const outsideHeadword = new Set<number>([
		...(article ? [article.member.position] : []),
		...first.governedPositions,
	]);
	const judged: Judged = {
		orthographies: first.orthographies,
		features: {
			...first.core,
			...(first.inflection ? { inflection: first.inflection } : {}),
		},
		outsideHeadword,
		auxiliaries: new Set(
			planned.auxiliaries.flatMap(({ member }) => {
				const use = new Answered(answers).peek(
					`aux_m${member.position}`,
				);
				return use === undefined || use === "Main"
					? []
					: [member.position];
			}),
		),
		readings: first.readings,
	};
	const caseRequestOver = (open: readonly string[]) =>
		open.length > 1
			? Effect.gen(function* () {
					const questionnaire = new Questionnaire();
					caseQuestion(questionnaire, open);
					const answered = yield* ask({
						stage: "case",
						state: {
							...state,
							policy: questionnaire.policyBlock(),
						},
						questions: questionnaire.questions,
					});
					return settle(() => new Answered(answered).pick("case"));
				})
			: Effect.succeed(undefined);
	const caseRequest = caseRequestOver(first.openCases);
	const writing: Effect.Effect<Written | undefined, AskFailure> =
		particleSpelled.length === 1 && first.orthographies[0] === "Standard"
			? Effect.succeed(undefined)
			: askLuna(
					scope,
					luna,
					"canonical",
					canonicalFormRequest(
						target,
						judged,
						hintsFor(target, candidates),
					),
					(output) => checkWritten(target, judged, output),
				);
	// A common NOUN's gender is the article Luna writes with its headword
	// when it fits the Sentence's article; its Case is asked over the cells
	// that gender leaves, after Luna.
	let cells = {
		core: first.core,
		inflection: first.inflection,
		openCases: first.openCases,
	};
	let caseAnswer: string | UnresolvedAnswer | undefined;
	let written: Written | undefined;
	if (first.noun && first.inflection) {
		written = yield* writing;
		cells = nounCells(planned, first, written?.article) ?? cells;
		if (cells.openCases.length === 0)
			return {
				_tag: "Unresolved",
				reason: "The article agrees with no case of its head",
			};
		caseAnswer = yield* caseRequestOver(cells.openCases);
	} else
		[caseAnswer, written] = yield* Effect.all([caseRequest, writing], {
			concurrency: "unbounded",
		});
	if (caseAnswer instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: caseAnswer.reason };
	const inflection =
		caseAnswer === undefined || !cells.inflection
			? cells.inflection
			: {
					...cells.inflection,
					case: caseAnswer === "Unmarked" ? null : caseAnswer,
				};
	let core = cells.core;
	let canonicalForm =
		written && shape.verbal && shape.lexeme
			? verbHeadword(written.canonicalForm, first.core)
			: written?.canonicalForm;
	const normalized = [
		...(written?.members ??
			target.members.map(
				(member) =>
					fixedSpelling(member, first.readings) ?? member.text,
			)),
	];
	if (target.route.kind === "PART") {
		const [authored, ...others] = particlesSpelled(
			written?.canonicalForm ?? spellingOf(target.members[0] as Member),
		);
		if (!authored || others.length > 0)
			return {
				_tag: "CatalogMiss",
				message: authored
					? "Several authored particles share this spelling"
					: "No authored particle has this spelling",
			};
		core = { ...authored.lemma.coreFeatures };
		canonicalForm = authored.lemma.canonicalForm;
		if (!written) normalized[0] = authored.lemma.canonicalForm;
	}
	if (canonicalForm !== undefined)
		canonicalForm = guardedHeadword(
			target,
			canonicalForm,
			new Set([...outsideHeadword, ...(judged.auxiliaries ?? [])]),
		);
	// Digits spell their numeral word (Rule de/digits-spell-the-numeral).
	const [only] = target.members;
	const spelledNumber =
		target.route.family === "Lexeme" &&
		target.route.kind === "NUM" &&
		target.members.length === 1 &&
		only
			? numeralWord(only.text)
			: undefined;
	if (spelledNumber !== undefined) canonicalForm = spelledNumber;
	if (shape.adverbial && shape.lexeme && canonicalForm !== undefined) {
		const derived = adverbHeadword(target, first.orthographies, normalized);
		if (derived) {
			canonicalForm = derived.canonicalForm;
			for (const [position, word] of derived.members)
				normalized[position] = word;
		}
	}
	// A compared form of a suppletive adverb cites its positive (lieber is
	// gern; Rules de/comparability-is-lexical, de/canonical-form-is-the-headword).
	const degree = (first.inflection as { degree?: unknown } | null | undefined)
		?.degree;
	if (
		shape.adverbial &&
		shape.lexeme &&
		(degree === "Cmp" || degree === "Sup")
	) {
		const last = target.members[target.members.length - 1];
		const positive = last && suppletivePositive[fold(last.text)];
		if (positive) canonicalForm = positive;
	}
	// An ordinal is cited in its attributive headword (erste; Rule
	// de/attributive-adjective-stands-alone).
	if (
		shape.adjectival &&
		shape.lexeme &&
		canonicalForm !== undefined &&
		ordinalStem.test(canonicalForm)
	)
		canonicalForm = `${canonicalForm}e`;
	if (canonicalForm === undefined)
		throw Error("No Canonical Form was written");
	// The subject es is the authored es, whatever its position's capital.
	if (first.expletive) normalized[first.expletive.position] = "es";
	const normalizedSurface = shape.foreign
		? canonicalForm
		: joinMembers(normalized, target.glued, outsideHeadword);
	// A member piece whose table names no word stands for its own word, in
	// the spelling Luna wrote for it (geht of geht's).
	const pieceReadings = new Map(first.readings);
	for (const member of target.members)
		if (
			member.spelling?.orthography === "Fused" &&
			member.spelling.surfaces.length === 0 &&
			!pieceReadings.has(member.segment)
		)
			pieceReadings.set(
				member.segment,
				normalized[member.position] ?? member.text,
			);
	const members = target.members.map((member) =>
		attestedMember(
			target.segments,
			member.segment,
			first.orthographies[member.position] ?? "Standard",
			pieceReadings,
		),
	);
	const valencyEvidence: Values[] = [...first.governed];
	if (
		shape.adposition &&
		first.realizedCase &&
		first.realizedCase !== "None"
	) {
		const table = shape.locution
			? germanAdpositionEntry({ family: "Locution", canonicalForm })
			: null;
		const allowed = table ? germanAdpositionAllowedCases(table) : [];
		const realized =
			allowed.length === 1 ? (allowed[0] as AdpCase) : first.realizedCase;
		valencyEvidence.push({
			member: null,
			complement: {
				kind: "Case",
				governedCase: realized,
				referent: "Either",
			},
			realizedCase: realized,
		});
	}
	const attestation: Values = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: target.route.family,
				kind: target.route.kind,
				canonicalForm,
				coreFeatures: core,
			},
			normalizedSurface,
			spelling: shape.foreign ? { kind: "Canonical" } : first.spelling,
			surfaceFeatures: shape.foreign ? null : first.surfaceFeatures,
			...(inflection === undefined
				? {}
				: { inflectionalFeatures: inflection }),
		},
		members,
		realizationCoverage: first.coverage,
		// A NOUN Locution's evidence is optional: it names only an owned article.
		...(shape.articleOwner && (shape.lexeme || article)
			? {
					articleEvidence: article
						? { kind: "Owned", member: article.member.position }
						: null,
				}
			: {}),
		...(shape.verbal
			? {
					expletiveEvidence: first.expletive
						? members[first.expletive.position]
						: null,
				}
			: {}),
		...(shape.governor || shape.adposition ? { valencyEvidence } : {}),
	};
	return { _tag: "Attestation", attestation };
});
