/**
 * Drafts one Full German Spec Record from one UD-parsed sentence (#732). The
 * parse decides the Segments and which words form one target; UPOS and
 * features decide each target's route and features as far as that mapping is
 * mechanical. Everything else stays null, and every target's rationale says
 * the draft came from UD and names what the converter doubts. A person
 * corrects the Draft to the Rules before it is Reviewed.
 */
import { parseUnit } from "dumling";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
} from "../../src/inventories.js";
import { ruleStatementHash, rules } from "../../src/rules.js";
import type { Segment } from "../../src/types.js";
import type { UdSentence, UdWord } from "./conllu.js";

/** Where the sentence was quoted from. */
export interface DraftSource {
	work: string;
	author: string;
	year: number;
	/** The exact source, cited as the record's reference. */
	reference: { title: string; url: string; supports: string };
}

type Json = Record<string, unknown>;
type Fusion = {
	spelling: string;
	components: [
		{ span: string; surface: string },
		{ span: string; surface: string },
	];
};
type Member =
	| { attested: string; orthography: "Standard" | "Shorthand" }
	| {
			attested: string;
			orthography: "Fused";
			fusion: Fusion;
			component: number;
	  };

/** A record file as the converter writes it, before dumspec checks it. */
export interface DraftRecordFile {
	$schema: string;
	sentence: string;
	segments: Segment[];
	coverage: "Full";
	status: "Draft";
	provenance: { kind: "Quoted"; work: string; author: string; year: number };
	sources: {
		adrs: string[];
		rules: { rule: string; hash: string }[];
		references: DraftSource["reference"][];
	};
	targets: {
		memberSegmentIndices: number[];
		notes: { rationale: string };
		attestation: Json;
	}[];
	noTarget: [];
}

// German preposition + article fusions, as Dumgen's fusion table splits them
// (dumgen src/concrete-lang/de/fusion-entries.ts): the article is the last
// letter, and the preposition the rest.
const fusions: Readonly<Record<string, readonly [string, string]>> = {
	im: ["in", "dem"],
	ins: ["in", "das"],
	zum: ["zu", "dem"],
	zur: ["zu", "der"],
	am: ["an", "dem"],
	ans: ["an", "das"],
	beim: ["bei", "dem"],
	vom: ["von", "dem"],
	aufs: ["auf", "das"],
	durchs: ["durch", "das"],
	fürs: ["für", "das"],
	ums: ["um", "das"],
	übers: ["über", "das"],
	unters: ["unter", "das"],
	hinters: ["hinter", "das"],
	vors: ["vor", "das"],
	überm: ["über", "dem"],
	unterm: ["unter", "dem"],
	hinterm: ["hinter", "dem"],
	vorm: ["vor", "dem"],
};
const modals = new Set([
	"dürfen",
	"können",
	"mögen",
	"müssen",
	"sollen",
	"wollen",
]);
const auxiliaries = new Set(["sein", "haben", "werden"]);
// A title or form of address before a name is a NOUN of its own
// (de/title-before-a-name). UD tags it PROPN and attaches the name as flat.
const titles = new Set([
	"herr",
	"herrn",
	"frau",
	"fräulein",
	"doktor",
	"dr.",
	"professor",
	"prof.",
	"graf",
	"gräfin",
	"baron",
	"baronin",
	"onkel",
	"tante",
	"kommerzienrat",
	"konsul",
	"pastor",
]);
// The heads that own an article (ADR 0040); Dumling's article owners.
const articleOwners = new Set(["NOUN", "PROPN", "ADJ", "NUM", "PRON"]);
// Particles that head a separable verb; used only to name a doubt.
const separableParticles = [
	"zusammen",
	"zurück",
	"hinunter",
	"herunter",
	"hinaus",
	"heraus",
	"hinein",
	"herein",
	"hinauf",
	"herauf",
	"hinüber",
	"herüber",
	"vorbei",
	"weiter",
	"entgegen",
	"gegenüber",
	"umher",
	"fort",
	"los",
	"weg",
	"mit",
	"nach",
	"vor",
	"auf",
	"aus",
	"ein",
	"ab",
	"an",
	"bei",
	"her",
	"hin",
	"zu",
];
const inseparablePrefixes = new Set([
	"be",
	"ge",
	"er",
	"ver",
	"zer",
	"ent",
	"emp",
	"miss",
]);
// STTS tags of words standing for a noun phrase (PRON) and of words
// modifying a noun (DET), per de/pron-or-det-by-use.
const substituting = new Set(["PDS", "PIS", "PPOSS", "PRELS", "PWS", "PPER"]);
const attributive = new Set(["PDAT", "PIAT", "PPOSAT", "PWAT"]);

/** Why a word joins another word's target. */
type Role =
	| "Particle"
	| "Auxiliary"
	| "Reflexive"
	| "Article"
	| "DegreeMarker"
	| "Name"
	| "Fixed"
	| "Correlate"
	| "SameSegment";

interface Piece {
	segment: number;
	fusion?: Fusion;
	component?: number;
}

interface Unit {
	head: UdWord;
	words: UdWord[];
	roles: Map<number, Role>;
	rules: Set<string>;
	doubts: string[];
	/** A title UD made part of a name, drafted as a NOUN. */
	title?: boolean;
	/** A `fixed` group, drafted as a candidate Locution. */
	locution?: boolean;
	/** The correlator a `mark` and its `zu` form (ohne … zu). */
	correlator?: string;
}

/** What drafting one sentence knows beside the unit at hand. */
interface Context {
	words: readonly UdWord[];
	pieces: ReadonlyMap<number, Piece>;
	/** The index of the first ResolvableText Segment. */
	firstResolvable: number;
}

// The pronType an STTS tag fixes.
const sttsPronType: Readonly<Record<string, string>> = {
	PRELS: "Rel",
	PRELAT: "Rel",
	PDS: "Dem",
	PDAT: "Dem",
	PWS: "Int",
	PWAT: "Int",
	PWAV: "Int",
	PPER: "Prs",
	PRF: "Prs",
	PPOSAT: "Prs",
	PPOSS: "Prs",
};

const featureNames = {
	case: "Case",
	number: "Number",
	gender: "Gender",
	person: "Person",
	pronType: "PronType",
	poss: "Poss",
	polite: "Polite",
} as const;

const lower = (text: string) => text.toLocaleLowerCase("de");
// STTS tags back up a missing VerbForm feature.
const sttsVerbForms: Readonly<Record<string, string>> = {
	VVFIN: "Fin",
	VAFIN: "Fin",
	VMFIN: "Fin",
	VVIMP: "Fin",
	VAIMP: "Fin",
	VVINF: "Inf",
	VAINF: "Inf",
	VMINF: "Inf",
	VVIZU: "Inf",
	VVPP: "Part",
	VAPP: "Part",
	VMPP: "Part",
};
const isVerbForm = (word: UdWord, form: string) =>
	(word.feats.VerbForm ?? sttsVerbForms[word.xpos]) === form;

/** Cites a Rule by id with the hash of its current statement. */
function cite(id: string) {
	const rule = rules.find((candidate) => candidate.id === id);
	if (!rule) throw Error(`No Rule ${id}`);
	return { rule: id, hash: ruleStatementHash(rule.statement) };
}

/**
 * The Segments of a sentence, as Dumgen's intake makes them: words and
 * punctuation from the parse's tokens, the whitespace between them from the
 * text, and a fused preposition + article split into one Segment per piece
 * (`de/fused-word-pieces`). `am` before a superlative stays one Segment.
 * Returns where each word landed.
 */
function segment(sentence: UdSentence, degreeMarkers: ReadonlySet<number>) {
	const { text } = sentence;
	const segments: Segment[] = [];
	const pieces = new Map<number, Piece>();
	const doubts = new Map<number, string>();
	let offset = 0;
	for (const token of sentence.tokens) {
		const space = /^\s+/u.exec(text.slice(offset))?.[0];
		if (space) {
			segments.push({ kind: "Whitespace", text: space });
			offset += space.length;
		}
		if (!text.startsWith(token.form, offset))
			throw Error(
				`Token ${JSON.stringify(token.form)} is not at ${offset} of ${JSON.stringify(text)}`,
			);
		offset += token.form.length;
		const [first, second] = token.words;
		if (!first) continue;
		if (token.words.every((word) => word.upos === "PUNCT")) {
			segments.push({ kind: "Punctuation", text: token.form });
			continue;
		}
		const fusion = fusions[lower(token.form)];
		if (
			token.words.length === 2 &&
			second &&
			fusion &&
			!degreeMarkers.has(first.id)
		) {
			const cut = token.form.length - 1;
			const value: Fusion = {
				spelling: token.form,
				components: [
					{ span: token.form.slice(0, cut), surface: fusion[0] },
					{ span: token.form.slice(cut), surface: fusion[1] },
				],
			};
			for (const [component, word] of [first, second].entries()) {
				const { span, surface } = value.components[component] as {
					span: string;
					surface: string;
				};
				pieces.set(word.id, {
					segment: segments.length,
					fusion: value,
					component,
				});
				segments.push({ kind: "ResolvableText", text: span, surface });
			}
			continue;
		}
		for (const word of token.words)
			pieces.set(word.id, { segment: segments.length });
		if (token.words.length > 1 && !degreeMarkers.has(first.id))
			doubts.set(
				first.id,
				`UD splits ${token.form} into ${token.words.map((word) => word.form).join(" + ")}, which the converter keeps as one Segment.`,
			);
		segments.push({ kind: "ResolvableText", text: token.form });
	}
	if (segments.map((part) => part.text).join("") !== text)
		throw Error(`The Segments do not spell ${JSON.stringify(text)}`);
	return { segments, pieces, doubts };
}

/**
 * `am` before a superlative with no noun after it is one Segment and a
 * member of the word whose degree it marks (ADR 0040): UD parses it as
 * `an` + `dem` attached to that word.
 */
function degreeMarkerHeads(sentence: UdSentence): Map<number, UdWord> {
	const heads = new Map<number, UdWord>();
	for (const token of sentence.tokens) {
		const [first, second] = token.words;
		if (lower(token.form) !== "am" || !first || !second) continue;
		const head = sentence.words.find((word) => word.id === second.head);
		if (
			head &&
			first.head === head.id &&
			(head.feats.Degree === "Sup" || /sten$/u.test(head.form))
		)
			heads.set(first.id, head);
	}
	return heads;
}

/**
 * Groups the words into targets by UD relation, mapped to the Rules, and
 * records the doubts the grouping leaves.
 */
function group(
	sentence: UdSentence,
	pieces: ReadonlyMap<number, Piece>,
	degreeMarkers: ReadonlyMap<number, UdWord>,
) {
	const { words } = sentence;
	const byId = new Map(words.map((word) => [word.id, word]));
	const parent = new Map<number, number>();
	const roles = new Map<number, Role>();
	const rulesOf = new Map<number, Set<string>>();
	const doubtsOf = new Map<number, string[]>();
	const titled = new Set<number>();
	const locutions = new Set<number>();
	const correlators = new Map<number, string>();
	const root = (id: number): number => {
		const up = parent.get(id);
		return up === undefined ? id : root(up);
	};
	const ruleOn = (word: UdWord, ...ids: string[]) => {
		const set = rulesOf.get(word.id) ?? new Set();
		for (const id of ids) set.add(id);
		rulesOf.set(word.id, set);
	};
	const doubt = (word: UdWord, text: string) =>
		doubtsOf.set(word.id, [...(doubtsOf.get(word.id) ?? []), text]);
	const join = (child: UdWord, into: UdWord, role: Role) => {
		const from = root(child.id);
		const to = root(into.id);
		if (from === to) return;
		parent.set(from, to);
		roles.set(child.id, role);
	};
	const children = (head: UdWord) =>
		words.filter((word) => word.head === head.id);

	for (const [markerId, head] of degreeMarkers) {
		const marker = byId.get(markerId);
		const article = byId.get(markerId + 1);
		if (!marker || !article) continue;
		join(marker, head, "DegreeMarker");
		join(article, head, "DegreeMarker");
		ruleOn(head, "de/fused-word-pieces");
	}

	for (const word of words) {
		const head = byId.get(word.head);
		if (!head || roles.has(word.id)) continue;
		const relation = word.deprel;
		if (relation === "compound:prt") {
			join(word, head, "Particle");
			ruleOn(head, "de/verb-owns-its-scattered-members");
			if (head.upos !== "VERB")
				doubt(
					head,
					`UD gives the particle ${word.form} to ${head.form}, tagged ${head.upos}.`,
				);
			continue;
		}
		if (relation === "aux" || relation === "aux:pass") {
			const lemma = lower(word.lemma);
			if (modals.has(lemma)) {
				ruleOn(word, "de/modal-is-a-verb", "de/verb-core-features");
				continue;
			}
			// A tense auxiliary beside a non-finite modal serves the modal:
			// hat … schreiben müssen gives [hat, müssen] (de/modal-is-a-verb).
			const modal =
				relation === "aux"
					? children(head).find(
							(sibling) =>
								sibling.deprel === "aux" &&
								modals.has(lower(sibling.lemma)) &&
								!isVerbForm(sibling, "Fin"),
						)
					: undefined;
			const governor = modal ?? head;
			if (!auxiliaries.has(lemma))
				doubt(
					word,
					`UD makes ${word.form} (${word.lemma}) an auxiliary of ${governor.form}; only sein, haben and werden are, besides the recipient passive (de/recipient-passive).`,
				);
			if (governor.upos !== "VERB" && governor !== modal) {
				doubt(
					word,
					`Auxiliary with no verb found: UD attaches ${word.form} to ${governor.form} (${governor.upos}), so it is drafted alone, though an auxiliary is never a target of its own (de/auxiliary-joins-the-verb-it-serves).`,
				);
				continue;
			}
			join(word, governor, "Auxiliary");
			ruleOn(
				governor,
				"de/auxiliary-joins-the-verb-it-serves",
				"de/verbal-surface-is-whole",
			);
			if (isVerbForm(governor, "Part"))
				ruleOn(governor, "de/verbal-participle");
			if (modal) ruleOn(governor, "de/modal-is-a-verb");
			if (isVerbForm(governor, "Fin"))
				doubt(
					governor,
					`UD tags both ${word.form} and ${governor.form} finite; check the verb's form and whether ${word.form} is an auxiliary here.`,
				);
			if (lemma === "sein" && isVerbForm(head, "Part"))
				doubt(
					head,
					`sein with a participle is a perfect only when the clause reports the verb's own event; otherwise ${word.form} is the copula and ${head.form} an ADJ (de/sein-perfect-or-copula).`,
				);
			continue;
		}
		if (relation === "expl:pv") {
			join(word, head, "Reflexive");
			ruleOn(head, "de/verb-owns-its-scattered-members");
			doubt(
				head,
				`UD marks ${word.form} as the inherent reflexive (expl:pv), so it joins the verb; check that the verb requires it.`,
			);
			continue;
		}
		if (relation === "det" && isArticle(word)) {
			if (word.id > head.id || !articleOwners.has(head.upos)) {
				doubt(
					word,
					`UD gives the article ${word.form} to ${head.form} (${head.upos}), no Head that opens with it, so it is drafted as a DET of its own (de/noun-owns-its-article).`,
				);
				continue;
			}
			join(word, head, "Article");
			ruleOn(head, "de/noun-owns-its-article");
			if (pieces.get(word.id)?.fusion)
				ruleOn(head, "de/fused-word-pieces");
			if (head.upos === "PROPN") ruleOn(head, "de/proper-noun-article");
			continue;
		}
		if (relation === "flat") {
			if (head.upos === "PROPN" && word.upos === "PROPN") {
				if (titleWords(head)) {
					titled.add(head.id);
					ruleOn(head, "de/title-before-a-name");
					doubt(
						head,
						`UD tags the title ${head.form} PROPN and joins ${word.form} to it as flat; a title before a name is a NOUN of its own (de/title-before-a-name).`,
					);
					continue;
				}
				join(word, head, "Name");
				doubt(
					head,
					`UD joins ${word.form} to ${head.form} as flat: drafted as one PROPN name, the Lexeme a name of several words is. Check that it is one name.`,
				);
				continue;
			}
			doubt(
				head,
				`UD joins ${word.form} to ${head.form} as flat, a candidate multiword unit the converter left apart.`,
			);
			continue;
		}
		if (relation === "fixed") {
			join(word, head, "Fixed");
			locutions.add(head.id);
			ruleOn(head, "de/largest-fixed-unit");
			doubt(
				head,
				`UD joins ${word.form} to ${head.form} as fixed: drafted as a candidate Locution whose Kind is ${head.upos}'s. Check it against de/fixed-member-test, or split it.`,
			);
			continue;
		}
		if (relation === "compound")
			doubt(
				head,
				`UD joins ${word.form} to ${head.form} as compound, a candidate multiword unit the converter left apart.`,
			);
		if (relation === "cop")
			ruleOn(word, "de/copula-stays-apart", "de/sein-perfect-or-copula");
		if (relation === "mark" && lower(word.form) === "zu") continue;
		if (
			relation === "mark" &&
			["um", "ohne", "statt", "anstatt"].includes(lower(word.lemma))
		) {
			const zu = children(head).find(
				(sibling) => sibling.xpos === "PTKZU" && sibling.id > word.id,
			);
			if (zu) {
				join(zu, word, "Correlate");
				correlators.set(word.id, `${lower(word.form)} … zu`);
				ruleOn(word, "de/correlator-anchors");
				const later = children(head).filter(
					(sibling) => sibling.deprel === "conj",
				);
				if (
					later.some((verb) =>
						children(verb).some((child) => child.xpos === "PTKZU"),
					)
				)
					doubt(
						word,
						`${word.form} … zu is coordinated: the zu of the later conjunct is drafted as a PART of its own.`,
					);
				continue;
			}
			const next = byId.get(word.id + 1);
			if (next?.deprel === "mark" && next.head === word.head)
				doubt(
					word,
					`${word.form} ${next.form} may be one conjunction, a Locution SCONJ; the converter left it apart.`,
				);
		}
		if (relation === "obl:arg" || relation === "obl") {
			const adposition = children(word).find(
				(child) => child.deprel === "case" && child.upos === "ADP",
			);
			if (adposition && relation === "obl:arg")
				doubt(
					adposition,
					`UD makes ${word.form} a prepositional object of ${head.form}: ${adposition.form} may be governed and belong to ${head.form}'s target (de/governed-preposition-joins-its-governor).`,
				);
		}
	}

	// A Segment is in one target: every word it holds joins the first.
	const bySegment = new Map<number, UdWord[]>();
	for (const word of words) {
		const piece = pieces.get(word.id);
		if (piece === undefined || word.upos === "PUNCT") continue;
		bySegment.set(piece.segment, [
			...(bySegment.get(piece.segment) ?? []),
			word,
		]);
	}
	for (const held of bySegment.values()) {
		const [first, ...rest] = held;
		for (const word of rest)
			if (first && root(word.id) !== root(first.id))
				join(word, first, "SameSegment");
	}

	const units = new Map<number, Unit>();
	for (const word of words) {
		if (word.upos === "PUNCT") continue;
		const id = root(word.id);
		const head = byId.get(id) as UdWord;
		const unit: Unit = units.get(id) ?? {
			head,
			words: [],
			roles: new Map(),
			rules: new Set(),
			doubts: [],
		};
		unit.words.push(word);
		const role = roles.get(word.id);
		if (role) unit.roles.set(word.id, role);
		for (const rule of rulesOf.get(word.id) ?? []) unit.rules.add(rule);
		unit.doubts.push(...(doubtsOf.get(word.id) ?? []));
		if (titled.has(word.id)) unit.title = true;
		if (locutions.has(word.id)) unit.locution = true;
		const correlator = correlators.get(word.id);
		if (correlator) unit.correlator = correlator;
		units.set(id, unit);
	}
	return [...units.values()];
}

function isArticle(word: UdWord) {
	return (
		word.upos === "DET" &&
		(word.feats.PronType ?? "").split(",").includes("Art") &&
		["der", "ein"].includes(lower(word.lemma))
	);
}

function titleWords(word: UdWord) {
	return titles.has(lower(word.lemma)) || titles.has(lower(word.form));
}

/** UD's value of a feature, or null. */
function feature(word: UdWord, name: string): string | null {
	return word.feats[name] ?? null;
}
const caseOf = (word: UdWord) => {
	const value = feature(word, "Case");
	return value && ["Nom", "Acc", "Dat", "Gen"].includes(value) ? value : null;
};
const genderOf = (word: UdWord) => {
	const value = feature(word, "Gender");
	return value && ["Masc", "Fem", "Neut"].includes(value) ? value : null;
};
const numberOf = (word: UdWord) => {
	const value = feature(word, "Number");
	return value && ["Sing", "Plur"].includes(value) ? value : null;
};

/**
 * The authored DET, PRON or AUX member a spelling realizes whose cell fits
 * the word's UD features best (Dumgen ADR 0007: closed-class identity comes
 * from the authored candidates).
 */
function authoredCandidate(
	word: UdWord,
	kind: "DET" | "PRON" | "AUX",
	spelled: string,
	doubts: string[],
	agreement?: Readonly<Record<string, string>>,
) {
	const candidates = authoredRealizations.filter(
		(realization) =>
			realization.member.lemma.kind === kind &&
			realization.spelled === spelled,
	);
	if (candidates.length === 0) return undefined;
	const scored = candidates.map((candidate) => {
		const cell: Record<string, unknown> = {
			...candidate.member.lemma.coreFeatures,
			...candidate.inflection,
		};
		let score = 0;
		for (const [name, udName] of Object.entries(featureNames)) {
			const ud = agreement?.[udName] ?? feature(word, udName);
			const value = cell[name] ?? null;
			if (ud === null || value === null) continue;
			score += ud.split(",").includes(String(value)) ? 1 : -1;
		}
		// The STTS tag tells a relative from a demonstrative or interrogative.
		const pronType = sttsPronType[word.xpos];
		if (pronType && cell.pronType)
			score += cell.pronType === pronType ? 2 : -2;
		if (word.xpos === "PRELAT") score += cell.extPos === "DET" ? 2 : -2;
		return { candidate, score };
	});
	const best = Math.max(...scored.map(({ score }) => score));
	const winners = scored.filter(({ score }) => score === best);
	const described = new Set(
		winners.map(({ candidate }) =>
			describeCell({
				...candidate.member.lemma.coreFeatures,
				...candidate.inflection,
			}),
		),
	);
	if (described.size > 1)
		doubts.push(
			`${word.form} fits ${described.size} authored ${kind} cells equally (${[...described].join("; ")}); the first is drafted. Check the referent (ADR 0044).`,
		);
	return winners[0]?.candidate;
}

function describeCell(cell: Record<string, unknown>) {
	return ["pronType", "person", "case", "number", "gender"]
		.map((name) => cell[name])
		.filter((value) => value !== null && value !== undefined)
		.join(" ");
}

const pronounBag = (bag: Record<string, unknown> = {}) => ({
	case: null,
	gender: null,
	number: null,
	"gender[psor]": null,
	"number[psor]": null,
	reflex: null,
	...bag,
});
const determinerBag = (bag: Record<string, unknown> = {}) => ({
	case: null,
	degree: null,
	gender: null,
	"gender[psor]": null,
	number: null,
	"number[psor]": null,
	...bag,
});
const allNull = (bag: Record<string, unknown>) =>
	Object.values(bag).every((value) => value === null);

function possessor(word: UdWord) {
	const gender = feature(word, "Gender[psor]");
	return {
		"gender[psor]": gender ? gender.split(",") : null,
		"number[psor]": feature(word, "Number[psor]"),
	};
}

type Route = {
	family: string;
	kind: string;
	canonicalForm: string;
	coreFeatures: Json;
	/** Absent for a route with no inflection. */
	inflectionalFeatures?: Json | null;
	/** Whether the head is a separable-particle verb's Shorthand, and so on. */
	orthography?: Map<number, "Shorthand">;
};

function sepPrefixFromForm(word: UdWord): string | null {
	const form = lower(word.form);
	const lemma = lower(word.lemma);
	for (let length = 2; length < lemma.length - 2; length++) {
		const prefix = lemma.slice(0, length);
		if (inseparablePrefixes.has(prefix)) continue;
		const rest = lemma.slice(length);
		if (
			isVerbForm(word, "Part") &&
			form.startsWith(`${prefix}ge`) &&
			rest.length > 2
		)
			return prefix;
		if (form === `${prefix}zu${rest}`) return prefix;
	}
	return null;
}

/**
 * The whole verbal Surface (de/verbal-surface-is-whole): finite coordinates
 * from the finite member, and perfect, future and passive from the
 * auxiliaries. werden before an infinitive is the future and before a
 * participle the passive, whatever relation UD gave it.
 */
function verbalBag(unit: Unit): Json {
	const finite = unit.words.find((word) => isVerbForm(word, "Fin"));
	const auxiliariesOf = unit.words.filter(
		(word) => unit.roles.get(word.id) === "Auxiliary",
	);
	const werden = auxiliariesOf.find((word) => lower(word.lemma) === "werden");
	const passive = werden !== undefined && isVerbForm(unit.head, "Part");
	const future = werden !== undefined && isVerbForm(unit.head, "Inf");
	if (werden && (werden.deprel === "aux:pass") !== passive)
		unit.doubts.push(
			`UD calls ${werden.form} ${werden.deprel}, but before ${unit.head.form} it is drafted as the ${passive ? "passive" : "future"}.`,
		);
	if (werden && lower(unit.head.form) === lower(unit.head.lemma))
		unit.doubts.push(
			`${unit.head.form} spells both the infinitive and the participle, so ${werden.form} may mark the future or the passive.`,
		);
	const participle = unit.words.some((word) => isVerbForm(word, "Part"));
	const perfect = auxiliariesOf.some(
		(word) =>
			["haben", "sein"].includes(lower(word.lemma)) &&
			(participle || modals.has(lower(unit.head.lemma))),
	);
	const composition = {
		expletive: null,
		perfect: perfect ? "Yes" : null,
		future: future ? "Yes" : null,
		voice: passive ? "Pass" : null,
		passive: passive ? "Process" : null,
	};
	if (finite) {
		const imperative = feature(finite, "Mood") === "Imp";
		return {
			mood: feature(finite, "Mood"),
			number: numberOf(finite),
			person: feature(finite, "Person"),
			tense: imperative ? null : feature(finite, "Tense"),
			verbForm: "Fin",
			...composition,
		};
	}
	const nonfinite = { mood: null, number: null, person: null, tense: null };
	// hat … verleumdet haben: an infinitive auxiliary makes the whole an
	// infinitive.
	if (
		isVerbForm(unit.head, "Part") &&
		!auxiliariesOf.some((word) => isVerbForm(word, "Inf"))
	)
		return {
			...nonfinite,
			verbForm: "Part",
			participleForm: "Past",
			...composition,
		};
	return { ...nonfinite, verbForm: "Inf", ...composition };
}

/** The route, Canonical Form and features of a unit, from its head. */
function routeOf(unit: Unit, context: Context): Route {
	const { head, doubts } = unit;
	const sentenceInitial = isSentenceStart(unit.head, context);
	const form = sentenceInitial ? lowerFirst(head.form) : head.form;
	const lemma = head.lemma === "_" ? head.form : head.lemma;
	const particle = unit.words.find(
		(word) => unit.roles.get(word.id) === "Particle",
	);
	const reflexive = unit.words.some(
		(word) => unit.roles.get(word.id) === "Reflexive",
	);
	const degreeMarked = unit.words.some(
		(word) => unit.roles.get(word.id) === "DegreeMarker",
	);

	if (unit.correlator)
		return {
			family: "Locution",
			kind: "SCONJ",
			canonicalForm: unit.correlator,
			coreFeatures: {},
		};
	if (unit.locution) {
		const kind = head.upos === "AUX" ? "VERB" : head.upos;
		return {
			family: "Locution",
			kind,
			canonicalForm: unit.words
				.filter((word) => unit.roles.get(word.id) !== "Article")
				.map((word) =>
					["NOUN", "PROPN"].includes(word.upos)
						? word.form
						: lower(word.form),
				)
				.join(" "),
			coreFeatures: {},
		};
	}
	if (unit.title) {
		doubts.push("Drafted as a NOUN title, not the PROPN UD tagged.");
		return nounRoute(head, lemma);
	}

	// sein, haben or werden serving no verb is a VERB with its own meaning
	// (de/auxiliary-joins-the-verb-it-serves); only an aux UD attached to a
	// non-verb stays an AUX, with its doubt.
	const verbal =
		head.upos === "VERB" ||
		(head.upos === "AUX" &&
			(!["aux", "aux:pass"].includes(head.deprel) ||
				modals.has(lower(lemma))));
	const auxiliaryOf = unit.words.some(
		(word) => unit.roles.get(word.id) === "Auxiliary",
	);
	if (head.upos === "VERB" && isVerbForm(head, "Part") && !auxiliaryOf) {
		const conjunct = context.words.find((word) => word.id === head.head);
		const shared =
			head.deprel === "conj" &&
			conjunct !== undefined &&
			context.words.some(
				(word) =>
					word.head === conjunct.id &&
					["aux", "aux:pass"].includes(word.deprel),
			);
		if (shared)
			doubts.push(
				`${head.form} shares the auxiliary of its conjunct ${conjunct?.form}, which the converter gives to that conjunct alone.`,
			);
		else {
			unit.rules.add("de/participial-adjective");
			doubts.push(
				`UD tags ${head.form} VERB, but a participle outside a perfect or passive is an ADJ (de/participial-adjective).`,
			);
			return {
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm: lower(head.form),
				coreFeatures: {
					abbr: null,
					comparable: null,
					foreign: null,
					numType: null,
					variant: null,
				},
				inflectionalFeatures: null,
			};
		}
	}
	if (verbal) {
		const prefix = particle
			? lower(particle.form)
			: sepPrefixFromForm(head);
		let canonicalForm = lower(lemma);
		if (particle && !canonicalForm.startsWith(prefix ?? ""))
			canonicalForm = `${prefix}${canonicalForm}`;
		if (!prefix) {
			// her and hin open too many other verbs (herrschen, hindern).
			const candidate = separableParticles.find(
				(start) =>
					start !== "her" &&
					start !== "hin" &&
					canonicalForm.startsWith(start) &&
					canonicalForm.length >= start.length + 5,
			);
			if (candidate)
				doubts.push(
					`hasSepPrefix is left null: check whether ${canonicalForm} has the separable prefix ${candidate}.`,
				);
		}
		if (reflexive) canonicalForm = `sich ${canonicalForm}`;
		const modal = modals.has(lower(lemma));
		return {
			family: "Lexeme",
			kind: "VERB",
			canonicalForm,
			coreFeatures: {
				hasSepPrefix: prefix,
				lexicallyReflexive: reflexive ? "Yes" : null,
				verbType: modal ? "Mod" : null,
			},
			inflectionalFeatures: verbalBag(unit),
		};
	}
	if (head.upos === "AUX") {
		const authored = authoredCandidate(head, "AUX", lower(head.form), []);
		return {
			family: "Lexeme",
			kind: "AUX",
			canonicalForm: authored?.member.lemma.canonicalForm ?? lower(lemma),
			coreFeatures: {},
			inflectionalFeatures: verbalBag(unit),
		};
	}
	if (head.upos === "NOUN") return nounRoute(head, lemma);
	if (head.upos === "PROPN")
		return {
			family: "Lexeme",
			kind: "PROPN",
			canonicalForm: unit.words
				.filter(
					(word) =>
						word === head || unit.roles.get(word.id) === "Name",
				)
				.map((word) => word.form)
				.join(" "),
			coreFeatures: {
				abbr: null,
				article: null,
				foreign: null,
				gender: genderOf(head),
			},
			inflectionalFeatures: nullIfEmpty({
				case: caseOf(head),
				number: numberOf(head),
			}),
		};
	if (head.upos === "ADJ" || (degreeMarked && head.upos !== "ADV")) {
		if (head.upos !== "ADJ")
			doubts.push(
				`UD tags ${head.form} ${head.upos}; drafted as the ADJ whose superlative am marks.`,
			);
		const degree = feature(head, "Degree");
		const graded =
			degreeMarked || degree === "Cmp" || degree === "Sup"
				? degreeMarked
					? "Sup"
					: degree
				: null;
		if (!graded) {
			doubts.push(
				`Comparability is left null (de/comparability-is-lexical)${degree ? `; UD marks Degree=${degree}` : ""}.`,
			);
			unit.rules.add("de/comparability-is-lexical");
		}
		if (head.xpos === "ADJD") unit.rules.add("de/adjective-stays-adj");
		const numType = feature(head, "NumType");
		// An adverbial or predicative ADJ, and am before a superlative, mark
		// no agreement.
		const uninflected = head.xpos === "ADJD" || degreeMarked;
		const agreement = agreementOf(head, context);
		return {
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: lemma,
			coreFeatures: {
				abbr: null,
				comparable: graded ? "Yes" : null,
				foreign: null,
				numType:
					numType === "Ord" || numType === "Card" ? numType : null,
				variant: null,
			},
			inflectionalFeatures: nullIfEmpty({
				case: uninflected ? null : (agreement?.Case ?? caseOf(head)),
				degree: graded,
				gender: uninflected
					? null
					: agreement
						? (agreement.Gender ?? null)
						: genderOf(head),
				number: uninflected
					? null
					: (agreement?.Number ?? numberOf(head)),
			}),
		};
	}
	if (head.upos === "ADV")
		return adverbRoute(unit, form, lemma, degreeMarked);
	if (head.upos === "PRON" || head.upos === "DET")
		return closedClassRoute(unit, form, lemma, sentenceInitial, context);
	if (head.upos === "NUM") {
		const numType = feature(head, "NumType") ?? "Card";
		return {
			family: "Lexeme",
			kind: "NUM",
			canonicalForm: lower(lemma),
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: ["Card", "Frac", "Mult", "Range"].includes(numType)
					? numType
					: null,
			},
			inflectionalFeatures: nullIfEmpty({
				case: caseOf(head),
				gender: genderOf(head),
				number: numberOf(head),
			}),
		};
	}
	if (head.upos === "ADP") {
		if (head.xpos === "KOUI")
			return conjunctionRoute("SCONJ", lemma, doubts, head);
		if (head.xpos === "KOKOM")
			return conjunctionRoute("CCONJ", lemma, doubts, head);
		const adpType =
			head.xpos === "APPO"
				? "Post"
				: head.xpos === "APZR"
					? "Circ"
					: "Prep";
		if (adpType !== "Prep")
			doubts.push(
				`UD tags ${head.form} ${head.xpos}: it may close a circumposition with a preposition before it (de/bracket-particle-or-circumposition).`,
			);
		return {
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: lower(pieceSurface(head, context) ?? lemma),
			coreFeatures: {
				abbr: null,
				adpType,
				extPos: null,
				foreign: null,
				partType: null,
			},
		};
	}
	if (head.upos === "SCONJ" || head.upos === "CCONJ")
		return conjunctionRoute(
			head.xpos === "KON" ? "CCONJ" : head.upos,
			lemma,
			doubts,
			head,
		);
	if (head.upos === "PART") {
		if (head.xpos === "PTKZU") unit.rules.add("de/bare-infinitive-zu");
		if (head.xpos === "PTKNEG") unit.rules.add("de/nicht-is-part");
		return {
			family: "Lexeme",
			kind: "PART",
			canonicalForm: lower(lemma),
			coreFeatures: {
				abbr: null,
				foreign: null,
				partType: head.xpos === "PTKZU" ? "Inf" : null,
				polarity: feature(head, "Polarity"),
			},
		};
	}
	if (head.upos === "INTJ")
		return {
			family: "Lexeme",
			kind: "INTJ",
			canonicalForm: lower(lemma),
			coreFeatures: { partType: null },
		};
	doubts.push(
		`UD tags ${head.form} ${head.upos}, which the converter does not map.`,
	);
	return {
		family: "Lexeme",
		kind: head.upos,
		canonicalForm: lemma,
		coreFeatures: {},
	};
}

function nounRoute(head: UdWord, lemma: string): Route {
	return {
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: lemma,
		coreFeatures: { gender: genderOf(head), hyph: null },
		inflectionalFeatures: nullIfEmpty({
			case: caseOf(head),
			gender: null,
			number: numberOf(head),
		}),
	};
}

function conjunctionRoute(
	kind: string,
	lemma: string,
	doubts: string[],
	head: UdWord,
): Route {
	if (kind !== head.upos)
		doubts.push(
			`UD tags ${head.form} ${head.upos}; STTS ${head.xpos} makes it ${kind}.`,
		);
	if (head.xpos === "KOKOM")
		doubts.push(
			`Comparison ${head.form} is CCONJ before a phrase and SCONJ before a clause (de/relative-w-adverb-fills-a-slot).`,
		);
	return {
		family: "Lexeme",
		kind,
		canonicalForm: lower(lemma),
		coreFeatures: { conjType: null },
	};
}

function adverbRoute(
	unit: Unit,
	form: string,
	lemma: string,
	degreeMarked: boolean,
): Route {
	const { head, doubts } = unit;
	const orthography = new Map<number, "Shorthand">();
	let spelled = lower(form);
	// dran, drauf, drum … shorten daran, darauf, darum.
	if (/^dr(an|auf|aus|in|um|unter|über)$/u.test(spelled)) {
		spelled = `da${spelled.slice(1)}`;
		orthography.set(head.id, "Shorthand");
		doubts.push(
			`${head.form} is drafted as the Shorthand of ${spelled} (de/member-orthography).`,
		);
	}
	const authored = authoredMembers.filter(
		(member: AuthoredMember) =>
			member.lemma.kind === "ADV" &&
			member.lemma.canonicalForm === spelled,
	);
	if (authored.length > 0) {
		const pronTypes = (feature(head, "PronType") ?? "").split(",");
		const chosen =
			authored.find((member) =>
				pronTypes.includes(
					String((member.lemma.coreFeatures as Json).pronType ?? ""),
				),
			) ?? authored[0];
		if (/^(da|wo|hier)r?/u.test(spelled))
			unit.rules.add("de/pronominal-adverb-stands-alone");
		const lemmaOf = chosen?.lemma as unknown as Json;
		return {
			family: "Lexeme",
			kind: "ADV",
			canonicalForm: String(lemmaOf.canonicalForm),
			coreFeatures: lemmaOf.coreFeatures as Json,
			inflectionalFeatures: null,
			orthography,
		};
	}
	const degree = feature(head, "Degree");
	const graded =
		degreeMarked || degree === "Cmp" || degree === "Sup"
			? degreeMarked
				? "Sup"
				: degree
			: null;
	if (!graded && degree) {
		doubts.push(
			`Comparability is left null (de/comparability-is-lexical); UD marks Degree=${degree}.`,
		);
		unit.rules.add("de/comparability-is-lexical");
	}
	const pronType = feature(head, "PronType");
	return {
		family: "Lexeme",
		kind: "ADV",
		canonicalForm: lower(lemma),
		coreFeatures: {
			comparable: graded ? "Yes" : null,
			foreign: null,
			numType: null,
			pronType:
				pronType &&
				["Dem", "Ind", "Int", "Neg", "Rel"].includes(pronType)
					? pronType
					: null,
		},
		inflectionalFeatures: graded ? { degree: graded } : null,
		orthography,
	};
}

function closedClassRoute(
	unit: Unit,
	form: string,
	lemma: string,
	sentenceInitial: boolean,
	context: Context,
): Route {
	const { head, doubts } = unit;
	const kind: "PRON" | "DET" = substituting.has(head.xpos)
		? "PRON"
		: attributive.has(head.xpos)
			? "DET"
			: head.xpos === "PRELAT" || head.xpos === "PRF"
				? "PRON"
				: (head.upos as "PRON" | "DET");
	unit.rules.add("de/pron-or-det-by-use");
	if (kind !== head.upos)
		doubts.push(
			`UD tags ${head.form} ${head.upos}; STTS ${head.xpos} makes it ${kind} (de/pron-or-det-by-use).`,
		);
	if (lower(head.form) === "es" && head.upos === "PRON")
		doubts.push(
			"If this es refers to nothing and the verb selects it, it joins the verb's target (de/expletive-es-joins-its-verb); the converter never joins it.",
		);
	const reflexive = feature(head, "Reflex") === "Yes";
	if (reflexive && ["obj", "iobj"].includes(head.deprel))
		doubts.push(
			`UD makes ${head.form} an object; if the verb requires it, it is the verb's inherent reflexive and joins its target (de/verb-owns-its-scattered-members).`,
		);
	const polite = /^(Sie|Ihnen|Ihr|Ihre[mnrs]?)$/u.test(head.form);
	const spelled = polite && !sentenceInitial ? head.form : form;
	if (polite && sentenceInitial)
		doubts.push(
			`Sentence-initial ${head.form} may be the formal Sie; drafted as the ${form} its features fit (ADR 0044).`,
		);
	const agreement = agreementOf(head, context);
	const authored = authoredCandidate(head, kind, spelled, doubts, agreement);
	if (!authored) {
		doubts.push(
			`No authored ${kind} spells ${spelled}: a Catalog Miss, drafted from UD's features.`,
		);
		return {
			family: "Lexeme",
			kind,
			canonicalForm: lower(lemma),
			coreFeatures:
				kind === "PRON"
					? {
							case: null,
							extPos: null,
							foreign: null,
							gender: null,
							number: null,
							person: null,
							polite: null,
							poss: null,
							pronType: null,
						}
					: {
							case: null,
							definite: null,
							extPos: null,
							foreign: null,
							gender: null,
							number: null,
							numType: null,
							person: null,
							polite: null,
							poss: null,
							pronType: null,
						},
			inflectionalFeatures:
				kind === "PRON"
					? pronounBag({
							case: agreement?.Case ?? caseOf(head),
							gender: agreement
								? (agreement.Gender ?? null)
								: genderOf(head),
							number: agreement?.Number ?? numberOf(head),
						})
					: determinerBag({
							case: agreement?.Case ?? caseOf(head),
							gender: agreement
								? (agreement.Gender ?? null)
								: genderOf(head),
							number: agreement?.Number ?? numberOf(head),
						}),
		};
	}
	const lemmaOf = authored.member.lemma as unknown as Json;
	const core = lemmaOf.coreFeatures as Json;
	const poss = core.poss === "Yes" ? possessor(head) : {};
	const cell = authored.inflection ? { ...authored.inflection } : undefined;
	let inflectionalFeatures: Json | null;
	if (kind === "PRON") {
		const bag = pronounBag({
			...cell,
			...poss,
			reflex: reflexive ? "Yes" : null,
		});
		inflectionalFeatures = allNull(bag) ? null : bag;
	} else {
		const bag = determinerBag({ ...cell, ...poss });
		inflectionalFeatures = allNull(bag) ? null : bag;
	}
	return {
		family: "Lexeme",
		kind,
		canonicalForm: String(lemmaOf.canonicalForm),
		coreFeatures: core,
		inflectionalFeatures,
	};
}

function nullIfEmpty(bag: Json): Json | null {
	return allNull(bag) ? null : bag;
}

function lowerFirst(text: string) {
	return text.charAt(0).toLocaleLowerCase("de") + text.slice(1);
}

/**
 * The case, number and gender an attributive word agrees in, read from the
 * noun it modifies: UD's features on the noun are drafted over the
 * attributive word's own when both are given.
 */
function agreementOf(
	word: UdWord,
	context: Context,
): Record<string, string> | undefined {
	if (!["det", "det:poss", "amod"].includes(word.deprel)) return undefined;
	const noun = context.words.find((candidate) => candidate.id === word.head);
	if (!noun || !["NOUN", "PROPN"].includes(noun.upos)) return undefined;
	const agreement: Record<string, string> = {};
	const grammaticalCase = caseOf(noun);
	const number = numberOf(noun);
	const gender = genderOf(noun);
	if (grammaticalCase) agreement.Case = grammaticalCase;
	if (number) agreement.Number = number;
	if (gender && number !== "Plur") agreement.Gender = gender;
	return Object.keys(agreement).length > 0 ? agreement : undefined;
}

function isSentenceStart(word: UdWord, context: Context) {
	return context.pieces.get(word.id)?.segment === context.firstResolvable;
}

/** The word a fused piece stands for (`in` for the `i` of `im`). */
function pieceSurface(word: UdWord, context: Context) {
	const piece = context.pieces.get(word.id);
	return piece?.fusion?.components[piece.component ?? 0]?.surface;
}

/** The record id's name for a sentence: its first words, in ASCII. */
export function slugOf(sentence: string): string {
	const transliterations: Record<string, string> = {
		ä: "ae",
		ö: "oe",
		ü: "ue",
		ß: "ss",
	};
	const words = sentence
		.normalize("NFC")
		.toLocaleLowerCase("de")
		.replace(/[äöüß]/gu, (letter) => transliterations[letter] ?? letter)
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-|-$/gu, "")
		.split("-")
		.filter(Boolean);
	let slug = "";
	for (const word of words) {
		if (slug && slug.length + word.length + 1 > 60) break;
		slug = slug ? `${slug}-${word}` : word;
	}
	return slug || "satz";
}

/**
 * Drafts the record of one parsed sentence. `parser` names the parser in
 * each rationale.
 */
export function draftRecord(
	sentence: UdSentence,
	source: DraftSource,
	parser: string,
): DraftRecordFile {
	const degreeMarkers = degreeMarkerHeads(sentence);
	const { segments, pieces, doubts } = segment(
		sentence,
		new Set(degreeMarkers.keys()),
	);
	const context: Context = {
		words: sentence.words,
		pieces,
		firstResolvable: segments.findIndex(
			(part) => part.kind === "ResolvableText",
		),
	};
	const units = group(sentence, pieces, degreeMarkers);
	const recordRules = new Set<string>();
	const adrs = new Set<string>();
	const targets: DraftRecordFile["targets"] = [];
	for (const unit of units) {
		for (const word of unit.words) {
			const doubt = doubts.get(word.id);
			if (doubt) unit.doubts.push(doubt);
		}
		const route = routeOf(unit, context);
		const attestation = attest(unit, route, segments, context);
		for (const rule of unit.rules) recordRules.add(rule);
		if (
			[...unit.roles.values()].some(
				(role) => role === "Article" || role === "DegreeMarker",
			)
		)
			for (const adr of ["ADR-0035", "ADR-0040"]) adrs.add(adr);
		if (unit.words.some((word) => pieces.get(word.id)?.fusion))
			adrs.add("ADR-0035");
		const oldSpelling = attestation.members
			.map((member) => member.attested)
			.filter((attested) => /ß(?![aeiouäöüy])/u.test(attested));
		if (oldSpelling.length > 0)
			unit.doubts.push(
				`Spelling drafted Canonical: check whether ${oldSpelling.join(", ")} is a pre-1996 spelling, a Historical Variant (de/variant-and-historical-status).`,
			);
		targets.push({
			memberSegmentIndices: attestation.indices,
			notes: {
				rationale: [
					`Drafted from a UD parse (${parser}) and not yet reviewed: ${summary(unit, route)}.`,
					...new Set(unit.doubts),
				].join(" "),
			},
			attestation: attestation.value,
		});
	}
	targets.sort(
		(left, right) =>
			(left.memberSegmentIndices[0] ?? 0) -
			(right.memberSegmentIndices[0] ?? 0),
	);
	return {
		$schema: "../../schema/spec-record.de.json",
		sentence: sentence.text,
		segments,
		coverage: "Full",
		status: "Draft",
		provenance: {
			kind: "Quoted",
			work: source.work,
			author: source.author,
			year: source.year,
		},
		sources: {
			adrs: [...adrs].toSorted(),
			rules: [...recordRules].toSorted().map(cite),
			references: [source.reference],
		},
		targets,
		noTarget: [],
	};
}

function summary(unit: Unit, route: Route) {
	const joined = unit.words
		.filter((word) => word !== unit.head)
		.map((word) => `${word.form} (${word.deprel})`);
	return `${route.family} ${route.kind} ${route.canonicalForm} from ${unit.head.form} (${unit.head.upos} ${unit.head.deprel})${joined.length ? ` with ${joined.join(", ")}` : ""}`;
}

/** Builds the unit's Attestation, stored as Dumling normalizes it. */
function attest(
	unit: Unit,
	route: Route,
	segments: readonly Segment[],
	context: Context,
) {
	const bySegment = new Map<number, UdWord>();
	for (const word of unit.words) {
		const piece = context.pieces.get(word.id);
		if (piece && !bySegment.has(piece.segment))
			bySegment.set(piece.segment, word);
	}
	const indices = [...bySegment.keys()].toSorted((a, b) => a - b);
	const members: Member[] = indices.map((index) => {
		const word = bySegment.get(index) as UdWord;
		const piece = context.pieces.get(word.id);
		const attested = segments[index]?.text ?? word.form;
		if (piece?.fusion && piece.component !== undefined)
			return {
				attested,
				orthography: "Fused",
				fusion: piece.fusion,
				component: piece.component,
			};
		if (route.orthography?.get(word.id))
			return { attested, orthography: "Shorthand" };
		return { attested, orthography: "Standard" };
	});
	const articleAt = indices.findIndex(
		(index) => unit.roles.get(bySegment.get(index)?.id ?? -1) === "Article",
	);
	const normalizedSurface = indices
		.filter((_, member) => member !== articleAt)
		.map((index) => {
			const word = bySegment.get(index) as UdWord;
			const piece = context.pieces.get(word.id);
			const text =
				piece?.fusion?.components[piece.component ?? 0]?.surface ??
				segments[index]?.text ??
				word.form;
			if (route.orthography?.get(word.id)) return route.canonicalForm;
			return index === context.firstResolvable &&
				!["NOUN", "PROPN"].includes(route.kind) &&
				!(route.kind === "PRON" && text === "Sie")
				? lowerFirst(text)
				: text;
		})
		.join(" ");
	const surface: Json = {
		unitKind: "Surface",
		language: "de",
		normalizedSurface,
		spelling: { kind: "Canonical" },
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: route.canonicalForm,
			family: route.family,
			kind: route.kind,
			coreFeatures: route.coreFeatures,
		},
		surfaceFeatures: null,
		...(route.inflectionalFeatures === undefined
			? {}
			: { inflectionalFeatures: route.inflectionalFeatures }),
	};
	const governor = route.family === "Lexeme" || route.family === "Locution";
	const verbal =
		(route.family === "Lexeme" && ["VERB", "AUX"].includes(route.kind)) ||
		(route.family === "Locution" && route.kind === "VERB");
	const candidate: Json = {
		unitKind: "Attestation",
		members,
		realizationCoverage: "Full",
		surface,
		...(route.family === "Lexeme" &&
		["NOUN", "PROPN", "ADJ", "NUM", "PRON"].includes(route.kind)
			? {
					articleEvidence:
						articleAt >= 0
							? { kind: "Owned", member: articleAt }
							: null,
				}
			: {}),
		...(verbal ? { expletiveEvidence: null, valencyEvidence: [] } : {}),
		...(governor && ["ADJ", "NOUN"].includes(route.kind)
			? { valencyEvidence: [] }
			: {}),
		...(route.family === "Lexeme" && route.kind === "ADP"
			? { valencyEvidence: adpositionCase(unit, context) }
			: {}),
	};
	const parsed = parseUnit(candidate);
	const value =
		parsed.success && parsed.chain.unitKind === "Attestation"
			? (parsed.chain.value as unknown as Json)
			: candidate;
	return { indices, members, value };
}

/**
 * The case an ADP's complement took, from UD's case on the noun it marks:
 * one bare-case slot with no member, or none when UD gives no oblique case.
 */
function adpositionCase(unit: Unit, context: Context) {
	const marked = context.words.find((word) => word.id === unit.head.head);
	const grammaticalCase = marked ? caseOf(marked) : null;
	if (!grammaticalCase || grammaticalCase === "Nom") {
		unit.doubts.push(
			`The case ${unit.head.form} governs is left out: UD gives ${marked?.form ?? "its complement"} ${grammaticalCase ?? "no case"}.`,
		);
		return [];
	}
	unit.rules.add("de/fused-word-pieces");
	return [
		{
			member: null,
			complement: {
				kind: "Case",
				case: grammaticalCase,
				referent: "Either",
			},
			realizedCase: grammaticalCase,
		},
	];
}
