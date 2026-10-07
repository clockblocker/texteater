/**
 * Grammatical Resolution of a unit on an open route: everything but the
 * closed DET and PRON Lexemes. One jev request (`grammar`) judges what
 * neither the unit nor dumcorpus's tables already fix: a member's Typo or
 * Shorthand, the Surface's spelling, the route's Core Features, its
 * inflection, the auxiliaries' uses, the prepositions a head governs,
 * coverage. Then, side by side, a NOUN's Case question over the cells its
 * article and form leave open, when more than one remains (#625), and
 * Luna's Canonical Form and spellings (#862). Luna is asked while jev
 * judges, on the guess that jev changes nothing Luna reads; when it does,
 * Luna is asked again with jev's answers. Code derives the rest: the
 * article's cell and evidence (#681), perfect, future, passive and
 * causative from the auxiliaries (#686), a lexical reflexive's case where
 * its form shows it, a VERB's subject es, an ADP's case where the ADP Case
 * Table allows one.
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
	germanParticles,
	isGermanPluralOnlyNoun,
} from "dumcorpus/inventories";
import { lemmaIdentityKey } from "dumling";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { OperationScope } from "../../call.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type { Ask, AskFailure } from "../../segment/ask.js";
import { draftsEmojiDescription } from "../reading.js";
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
} from "./member-spelling.js";
import { numeralWord } from "./numeral.js";
import {
	adverbHeadword,
	bareWWords,
	ordinalStem,
	suppletivePositive,
} from "./open-route/adverbial.js";
import { agreementQuestions } from "./open-route/agreeing.js";
import { type Governable, governableMembers } from "./open-route/governed.js";
import { guessedJudgment, guessMisses } from "./open-route/luna-guess.js";
import {
	articleCases,
	caseQuestion,
	casesBeforeAgreement,
	nounCells,
	openingArticle,
} from "./open-route/nominal.js";
import {
	type AdpCase,
	caseNames,
	cases,
	fold,
	genderOfArticle,
	numbers,
	routeShape,
	type Shape,
	spellingOf,
	type Values,
} from "./open-route/shape.js";
import {
	auxiliaryUsesOf,
	prefixAnswer,
	prefixCandidates,
	reflexives,
	spellsEs,
	verbalInflection,
	verbGuessMisses,
	verbHeadword,
} from "./open-route/verbal.js";
import { auxiliaryUses, fill, question } from "./prompts.js";
import { Answered, Questionnaire, UnresolvedAnswer } from "./questions.js";
import {
	fixedSpelling,
	joinMembers,
	type Member,
	type Target,
	targetState,
} from "./target.js";

/** What an open-route click comes to before it is checked against Dumling. */
export type OpenOutcome =
	| {
			readonly _tag: "Attestation";
			readonly attestation: Values;
			/** The Emoji Description Luna drafted with the headword, unchecked. */
			readonly drafted?: string;
	  }
	| { readonly _tag: "Unresolved"; readonly reason: string }
	| { readonly _tag: "CatalogMiss"; readonly message: string };

/** Everything the first request asks, and what code fixed before it. */
export type Plan = {
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
			? target.members.find((member) => reflexives.has(fold(member.text)))
			: undefined;
	if (reflexive && reflexives.get(fold(reflexive.text)) === undefined)
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
export type FirstRead = {
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
				? (reflexives.get(fold(reflexive.text)) ??
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
	// A subject es is evidence only of a used verb, in a complete
	// realization: jev's citation or Partial against it is a clash.
	if (expletive && cited)
		throw new UnresolvedAnswer("The subject es clashes with a citation");
	if (expletive && coverage === "Partial")
		throw new UnresolvedAnswer(
			"The subject es clashes with a partial realization",
		);
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
 * Resolves a unit on an open route: the grammar request, with Luna's call
 * on a guess beside it, then the Case question and Luna's call again
 * should the guess miss, then the Attestation as an unchecked value.
 */
export const resolveOpenRoute = Effect.fnUntraced(function* (
	scope: OperationScope,
	target: Target,
	ask: Ask,
	luna: LunaSettings,
	candidates: readonly LemmaCandidate[],
): Effect.fn.Return<OpenOutcome, AskFailure, Scope.Scope> {
	const planned = plan(target);
	const { shape } = planned;
	const state = targetState(target);
	// A PART is authored (#734): its spelling names its member, or Luna's
	// headword does when the member is no Standard spelling.
	const particleSpelled =
		target.route.kind === "PART" && target.members.length === 1
			? particlesSpelled(spellingOf(target.members[0] as Member))
			: [];
	const hints = hintsFor(target, candidates);
	const drafts = draftsEmojiDescription(target.route);
	const request = (judged: Judged) =>
		canonicalFormRequest(target, judged, hints, drafts);
	const write = (judged: Judged) =>
		askLuna(scope, luna, "canonical", request(judged), (output) =>
			checkWritten(target, judged, output),
		);
	// Luna writes while jev judges, on a guess at jev's answers; the
	// guessed call ends with the scope unless it is joined. A PART spelled
	// Standard needs no call, and with nothing to ask jev there is no guess.
	const guessed =
		planned.questionnaire.empty || particleSpelled.length === 1
			? undefined
			: guessedJudgment(target, planned);
	const guess = guessed
		? yield* Effect.forkScoped(write(guessed), { startImmediately: true })
		: undefined;
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
	// The guessed answer stands when jev changed nothing Luna reads;
	// otherwise Luna writes again with jev's answers.
	const writing: Effect.Effect<Written | undefined, AskFailure> =
		particleSpelled.length === 1 && first.orthographies[0] === "Standard"
			? Effect.succeed(undefined)
			: Effect.gen(function* () {
					if (!guess || !guessed) return yield* write(judged);
					let missed = guessMisses(request(guessed), request(judged));
					if (missed) yield* Fiber.interrupt(guess);
					else {
						const written = yield* Fiber.join(guess);
						missed =
							shape.verbal && shape.lexeme
								? verbGuessMisses(
										written.canonicalForm,
										first.core,
										planned.prefixes,
									)
								: undefined;
						if (!missed) return written;
					}
					scope.event({
						name: "CanonicalRewritten",
						data: { reason: missed },
					});
					return yield* write(judged);
				});
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
		// A noun with no singular has gender null, whatever article Luna
		// wrote (Rule de/plural-only-noun-has-no-gender): dumcorpus lists the
		// Pluraletantum nouns Duden gives only in the plural.
		const article =
			written && isGermanPluralOnlyNoun(written.canonicalForm)
				? "none"
				: written?.article;
		cells = nounCells(planned, first, article) ?? cells;
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
	// A numeral Locution has no open slot: a … Luna writes in it (von … bis …)
	// cites a dictionary pattern, not this unit, whose headword is its
	// members' words, digits spelled (zehn bis zwölf; Rules
	// de/canonical-form-is-the-headword, de/digits-spell-the-numeral).
	if (
		canonicalForm !== undefined &&
		target.route.family === "Locution" &&
		target.route.kind === "NUM" &&
		canonicalForm.split(" ").includes("…")
	)
		canonicalForm = joinMembers(
			normalized.map((word) => numeralWord(word) ?? word),
			target.glued,
			outsideHeadword,
		);
	else if (canonicalForm !== undefined)
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
		const positive = last && suppletivePositive.get(fold(last.text));
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
	return {
		_tag: "Attestation",
		attestation,
		...(written?.drafted === undefined ? {} : { drafted: written.drafted }),
	};
}, Effect.scoped);
