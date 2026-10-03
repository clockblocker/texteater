import { readFileSync } from "node:fs";
import { lemmaIdentityKey, syncretismView, syncretize } from "dumling";
import type * as Dumling from "dumling/types";
import { authoredMembers } from "../src/inventories.js";
import type { SpecCheck } from "../src/issues.js";
import { ruleStatementHash, rules } from "../src/rules.js";
import type { KnowledgeCoverage } from "../src/types.js";

// biome-ignore lint/suspicious/noExplicitAny: fixtures edit raw record JSON.
type RecordJson = any;

export function seedJson(id: string): RecordJson {
	return JSON.parse(
		readFileSync(new URL(`../records/${id}.json`, import.meta.url), "utf8"),
	);
}

const [citedRule] = rules;
if (!citedRule) throw Error("Expected a Rule to cite");
/** A current citation of a real Rule, for records the tests mark Reviewed. */
export const ruleCitation = {
	rule: citedRule.id,
	hash: ruleStatementHash(citedRule.statement),
};

/** An authored Lemma's first authored Reading, or 👀 for any other Lemma. */
function emojiDescriptionOf(lemma: RecordJson): string {
	const key = lemmaIdentityKey(lemma);
	return (
		authoredMembers.find((member) => lemmaIdentityKey(member.lemma) === key)
			?.reading.emojiDescription ?? "👀"
	);
}

/**
 * Marks a seed record reviewed through Reading and gives it what that needs
 * beyond a Draft: a Reading on every target, an authored one where the
 * Authored Inventory holds the Lemma, and a Rule citation.
 */
export function review(record: RecordJson): RecordJson {
	record.reviewDepth = "Reading";
	// A Foreign Reading is its Lemma alone (ADR 0045).
	for (const target of record.targets) {
		const { lemma } = target.attestation.surface;
		target.reading =
			lemma.family === "Foreign"
				? {}
				: { emojiDescription: emojiDescriptionOf(lemma) };
	}
	record.sources.rules = [ruleCitation];
	return record;
}

/**
 * The authored PRON Lemma spelled `canonicalForm` with these Core values: a
 * cell, or with `syncretic` the generated Syncretism (system ADR 0046).
 */
export function pronoun(
	canonicalForm: string,
	values: Readonly<Record<string, string | null>>,
	syncretic?: readonly string[],
): Dumling.Lemma<"de", "Lexeme", "PRON"> {
	const found = authoredMembers.find(({ lemma }) => {
		const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
		return (
			lemma.kind === "PRON" &&
			lemma.canonicalForm === canonicalForm &&
			Object.entries(values).every(
				([key, value]) => core[key] === value,
			) &&
			JSON.stringify((lemma as { syncretic?: unknown }).syncretic) ===
				JSON.stringify(syncretic)
		);
	});
	if (!found) throw Error(`No authored PRON ${canonicalForm}`);
	return found.lemma as Dumling.Lemma<"de", "Lexeme", "PRON">;
}

/** Stores `lemma` as the Lemma of the record's PRON sie. */
export function attestSie(record: RecordJson, lemma: unknown) {
	const target = record.targets.find(
		(each: RecordJson) =>
			each.attestation.surface.lemma.canonicalForm === "sie",
	);
	target.attestation.surface.lemma = lemma;
}

/** The jedem Surface of the record's PRON jeder, marking these cell values. */
export function jedemSurface(
	record: RecordJson,
	cell: Readonly<Record<string, string | null>>,
): RecordJson {
	const { surface } = record.targets[0].attestation;
	const { syncretic: _list, syncretized: _units, ...plain } = surface;
	return {
		...plain,
		inflectionalFeatures: { ...plain.inflectionalFeatures, ...cell },
	};
}

/** Stores `surface` as the Surface of the record's PRON jeder. */
export function attestJedem(record: RecordJson, surface: unknown) {
	record.targets[0].attestation.surface = surface;
}

/**
 * Coverage of every structural aspect a German VERB Reading's policy
 * requests, for a Knowledge of a definition and a conjugation class.
 */
export const verbCoverage: KnowledgeCoverage = {
	definition: "Authored",
	conjugationClass: "Authored",
	valency: "ReviewedEmpty",
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
		hypernym: "ReviewedEmpty",
	},
};

/**
 * Negative fixtures for the per-record checks: each edits one seed record so
 * that exactly one check fails.
 */
export const negativeFixtures: {
	name: string;
	seed: string;
	id?: string;
	check: SpecCheck;
	edit: (record: RecordJson) => void;
}[] = [
	{
		name: "a record path that is not <language>/<kebab-case>",
		seed: "de/pass-auf-dich-auf",
		id: "de/Pass_auf",
		check: "Id",
		edit: () => {},
	},
	{
		name: "an unknown field",
		seed: "de/pass-auf-dich-auf",
		check: "Shape",
		edit: (record) => {
			record.verified = true;
		},
	},
	{
		name: "a bad Attestation: a noun without its gender",
		seed: "de/das-wetter-ist-xqzt",
		check: "Attestation",
		edit: (record) => {
			record.targets[0].attestation.surface.lemma.coreFeatures = {};
		},
	},
	{
		name: "an Attestation parseUnit would normalize",
		seed: "de/das-wetter-ist-xqzt",
		check: "Attestation",
		edit: (record) => {
			record.targets[0].attestation.surface.normalizedSurface = " Wetter";
		},
	},
	{
		name: "German Attestations in an English record",
		seed: "de/pass-auf-dich-auf",
		id: "en/pass-auf-dich-auf",
		check: "Attestation",
		edit: () => {},
	},
	{
		name: "Segments that do not spell the sentence",
		seed: "de/pass-auf-dich-auf",
		check: "Segments",
		edit: (record) => {
			record.sentence = "Pass gut auf dich auf!";
		},
	},
	{
		name: "members out of order",
		seed: "de/pass-auf-dich-auf",
		check: "Members",
		edit: (record) => {
			record.targets[0].memberSegmentIndices = [0, 6, 2];
		},
	},
	{
		name: "a member pointing at another word",
		seed: "de/das-wetter-ist-xqzt",
		check: "Members",
		edit: (record) => {
			record.segments[4].text = "war";
			record.sentence = "Das Wetter war xqzt.";
		},
	},
	{
		name: "a member on a Whitespace Segment",
		seed: "de/das-wetter-ist-xqzt",
		check: "Members",
		edit: (record) => {
			record.targets[1].memberSegmentIndices = [5];
			record.coverage = "Partial";
		},
	},
	{
		name: "fewer member Segments than members",
		seed: "de/pass-auf-dich-auf",
		check: "Members",
		edit: (record) => {
			record.targets[0].memberSegmentIndices = [0, 2];
			record.coverage = "Partial";
		},
	},
	{
		name: "a Full record with an unaccounted Segment",
		seed: "de/das-wetter-ist-xqzt",
		check: "Coverage",
		edit: (record) => {
			record.noTarget = [];
		},
	},
	{
		name: "a Segment in a target and a No Target entry",
		seed: "de/ich-bin-im-wald",
		check: "Coverage",
		edit: (record) => {
			record.noTarget = [
				{ memberSegmentIndices: [7], reason: "Duplicated on purpose." },
			];
		},
	},
	{
		name: "a No Target entry naming its Segments out of order",
		seed: "de/das-wetter-ist-xqzt",
		check: "Coverage",
		edit: (record) => {
			record.targets = record.targets.slice(0, 1);
			record.noTarget[0].memberSegmentIndices = [6, 4];
		},
	},
	{
		name: "a No Target entry on a Punctuation Segment",
		seed: "de/das-wetter-ist-xqzt",
		check: "Coverage",
		edit: (record) => {
			record.noTarget[0].memberSegmentIndices = [6, 7];
		},
	},
	{
		name: "a No Target entry naming no Segment",
		seed: "de/das-wetter-ist-xqzt",
		check: "Shape",
		edit: (record) => {
			record.noTarget[0].memberSegmentIndices = [];
		},
	},
	{
		name: "a route Dumling does not have",
		seed: "de/pass-auf-dich-auf",
		check: "Route",
		edit: (record) => {
			record.targets[1].route = { family: "Lexeme", kind: "PRONOUN" };
		},
	},
	{
		name: "an Attestation whose Lemma is not the target's route",
		seed: "de/pass-auf-dich-auf",
		check: "Route",
		edit: (record) => {
			record.targets[1].route = { family: "Lexeme", kind: "NOUN" };
		},
	},
	{
		name: "a target without its Attestation in a record reviewed through Attestation",
		seed: "de/pass-auf-dich-auf",
		check: "Attestation",
		edit: (record) => {
			record.reviewDepth = "Attestation";
			record.sources.rules = [ruleCitation];
			delete record.targets[1].attestation;
		},
	},
	{
		name: "a target without its Knowledge in a record reviewed through Knowledge",
		seed: "de/pass-auf-dich-auf",
		check: "Knowledge",
		edit: (record) => {
			review(record);
			record.reviewDepth = "Knowledge";
			record.targets[0].reading.knowledge = {
				definition: "to watch out",
				conjugationClass: ["Weak"],
			};
			record.targets[0].reading.coverage = verbCoverage;
		},
	},
	{
		name: "a record reviewed through Knowledge that leaves a structural aspect uncovered",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			review(record);
			record.reviewDepth = "Knowledge";
			record.targets[0].reading.knowledge = {
				conjugationClass: ["Weak"],
			};
			record.targets[0].reading.coverage = {
				conjugationClass: "Authored",
			};
			// dich is authored, so its Knowledge is reviewed in the inventory.
			record.targets[1].reading.knowledge = {};
		},
	},
	{
		name: "coverage that marks an aspect Authored the Knowledge lacks",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: {},
				coverage: { valency: "Authored" },
			};
		},
	},
	{
		name: "a relation marked Authored with no claim",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: { semanticRelations: { synonym: [] } },
				coverage: { semanticRelations: { synonym: "Authored" } },
			};
		},
	},
	{
		name: "coverage that marks a stored aspect ReviewedEmpty",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: { conjugationClass: ["Weak"] },
				coverage: { conjugationClass: "ReviewedEmpty" },
			};
		},
	},
	{
		name: "a stored aspect its coverage leaves out",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: { conjugationClass: ["Weak"] },
				coverage: {},
			};
		},
	},
	{
		name: "coverage of an aspect its route's Knowledge Policy does not request",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: {},
				coverage: { plural: "ReviewedEmpty" },
			};
		},
	},
	{
		name: "coverage without its Knowledge",
		seed: "de/pass-auf-dich-auf",
		check: "KnowledgeCoverage",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				coverage: { valency: "ReviewedEmpty" },
			};
		},
	},
	{
		name: "a Reviewed target without its Reading",
		seed: "de/pass-auf-dich-auf",
		check: "Reading",
		edit: (record) => {
			review(record);
			delete record.targets[1].reading;
		},
	},
	{
		name: "a Reading whose Emoji Description is not emoji",
		seed: "de/pass-auf-dich-auf",
		check: "Reading",
		edit: (record) => {
			record.targets[0].reading = { emojiDescription: "watch" };
		},
	},
	{
		name: "an Emoji Description parseUnit would normalize",
		seed: "de/pass-auf-dich-auf",
		check: "Reading",
		edit: (record) => {
			// 🖱 with a variation selector, which Dumling drops.
			record.targets[0].reading = {
				emojiDescription: "\u{1F5B1}\u{FE0F}",
			};
		},
	},
	{
		name: "a Reading without the Emoji Description its route needs",
		seed: "de/pass-auf-dich-auf",
		check: "Reading",
		edit: (record) => {
			record.targets[0].reading = {};
		},
	},
	{
		name: "a Foreign Reading with an Emoji Description",
		seed: "de/im-deutschsprachigen-spielchat-wirkte-die-erklaerung-sehr",
		check: "Reading",
		edit: (record) => {
			record.targets[0].reading = { emojiDescription: "😬" };
		},
	},
	{
		name: "a Foreign Reading with a Semantic Relation",
		seed: "de/im-deutschsprachigen-spielchat-wirkte-die-erklaerung-sehr",
		check: "Knowledge",
		edit: (record) => {
			record.targets[0].reading = {
				knowledge: {
					semanticRelations: {
						synonym: [record.targets[0].attestation.surface.lemma],
					},
				},
			};
		},
	},
	{
		name: "Reading Knowledge with an aspect its route cannot hold",
		seed: "de/pass-auf-dich-auf",
		check: "Knowledge",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: { formulaRole: "Thanks" },
			};
		},
	},
	{
		name: "Reading Knowledge with an endonym outside PROPN",
		seed: "de/pass-auf-dich-auf",
		check: "Knowledge",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: {
					semanticRelations: {
						endonym: [record.targets[0].attestation.surface.lemma],
					},
				},
			};
		},
	},
	{
		name: "Reading Knowledge with a relation its route's policy does not request",
		seed: "de/pass-auf-dich-auf",
		check: "Knowledge",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: {
					semanticRelations: {
						holonym: [record.targets[0].attestation.surface.lemma],
					},
				},
			};
		},
	},
	{
		name: "Reading Knowledge dumrel would normalize",
		seed: "de/pass-auf-dich-auf",
		check: "Knowledge",
		edit: (record) => {
			record.targets[0].reading = {
				emojiDescription: "👀",
				knowledge: { definition: " to watch out " },
			};
		},
	},
	{
		name: "a Reviewed record citing no Rule",
		seed: "de/pass-auf-dich-auf",
		check: "Uncited",
		edit: (record) => {
			review(record);
			record.sources.rules = [];
		},
	},
	{
		name: "a Grundform verdict Dumling contradicts",
		seed: "de/ich-bin-im-wald",
		check: "Grundform",
		edit: (record) => {
			record.targets[1].grundform = true;
		},
	},
	{
		// A plural noun needs its Lemma's plural-only convention, so Dumling
		// returns an assessment error instead of a verdict (ADR 0042).
		name: "a Grundform verdict Dumling cannot assess",
		seed: "de/ich-bin-im-wald",
		check: "Grundform",
		edit: (record) => {
			// A bare Wald, so that no article has to agree with the plural.
			const target = record.targets[1];
			target.memberSegmentIndices = [7];
			target.attestation.members = [target.attestation.members[1]];
			target.attestation.articleEvidence = null;
			Object.assign(target.attestation.surface.inflectionalFeatures, {
				case: "Nom",
				number: "Plur",
			});
			target.grundform = true;
		},
	},
	{
		name: "an ADP realized in a case the ADP Case Table does not allow",
		seed: "de/das-buch-liegt-auf-dem-tisch",
		check: "AdpositionCase",
		edit: (record) => {
			const [slot] = record.targets[0].attestation.valencyEvidence;
			slot.complement.governedCase = "Gen";
			slot.realizedCase = "Gen";
		},
	},
	{
		name: "an owned article that names no der or ein cell for its Head",
		seed: "de/ich-bin-im-wald",
		check: "ArticleAgreement",
		edit: (record) => {
			record.targets[1].attestation.surface.inflectionalFeatures.case =
				"Acc";
		},
	},
	{
		name: "a governed preposition in a case the ADP Case Table does not allow",
		seed: "de/auf-ihn-bin-ich-stolz",
		check: "AdpositionCase",
		edit: (record) => {
			const [slot] = record.targets[0].attestation.valencyEvidence;
			slot.complement.governedCase = "Gen";
			slot.realizedCase = "Gen";
		},
	},
	{
		// No unlisted adposition takes "any oblique case" (#652).
		name: "an ADP the ADP Case Table does not list",
		seed: "de/das-buch-liegt-auf-dem-tisch",
		check: "AdpositionCase",
		edit: (record) => {
			const { surface } = record.targets[0].attestation;
			surface.lemma.canonicalForm = "à";
			surface.normalizedSurface = "à";
		},
	},
	{
		name: "a governed preposition the ADP Case Table does not list",
		seed: "de/auf-ihn-bin-ich-stolz",
		check: "AdpositionCase",
		edit: (record) => {
			const [slot] = record.targets[0].attestation.valencyEvidence;
			// Named by no member, so only the table can object.
			slot.member = null;
			slot.complement.preposition.canonicalForm = "à";
		},
	},
	{
		// A classifier answers the view; gold stores the units too.
		name: "a Syncretism's view without its units",
		seed: "de/die-kinder-lachen-und-ich-sehe-sie",
		check: "Syncretism",
		edit: (record) => {
			attestSie(
				record,
				syncretismView(
					pronoun("sie", { case: "Acc" }, ["gender", "number"]),
				),
			);
		},
	},
	{
		// Dumling accepts it, but case is no feature only the referent settles.
		name: "a Syncretism the inventory does not generate",
		seed: "de/die-kinder-lachen-und-ich-sehe-sie",
		check: "Syncretism",
		edit: (record) => {
			attestSie(
				record,
				syncretize([
					pronoun("sie", { case: "Nom", number: "Sing" }),
					pronoun("sie", {
						case: "Acc",
						number: "Plur",
						polite: null,
					}),
				]),
			);
		},
	},
	{
		// 3sg Fem or formal has the identity of the three-way Syncretism,
		// which also holds 3pl.
		name: "a Syncretism with other units than the generated one",
		seed: "de/die-kinder-lachen-und-ich-sehe-sie",
		check: "Syncretism",
		edit: (record) => {
			attestSie(
				record,
				syncretize([
					pronoun("sie", { case: "Acc", number: "Sing" }),
					pronoun("Sie", { case: "Acc" }),
				]),
			);
		},
	},
	{
		name: "a stem Surface Syncretism's view without its units",
		seed: "de/von-den-kindern-helfe-ich-jedem",
		check: "Syncretism",
		edit: (record) => {
			attestJedem(
				record,
				syncretismView(
					syncretize([
						jedemSurface(record, { gender: "Masc" }),
						jedemSurface(record, { gender: "Neut" }),
					]),
				),
			);
		},
	},
	{
		// Dumling accepts it, but a stem's Syncretism leaves gender alone open.
		name: "a stem Surface Syncretism the inventory does not generate",
		seed: "de/von-den-kindern-helfe-ich-jedem",
		check: "Syncretism",
		edit: (record) => {
			attestJedem(
				record,
				syncretize([
					jedemSurface(record, { gender: "Masc" }),
					jedemSurface(record, { gender: null, number: "Plur" }),
				]),
			);
		},
	},
	{
		// No jedem cell is feminine: dative feminine jeder is spelled jeder.
		name: "a stem Surface Syncretism with other units than the generated one",
		seed: "de/von-den-kindern-helfe-ich-jedem",
		check: "Syncretism",
		edit: (record) => {
			attestJedem(
				record,
				syncretize([
					jedemSurface(record, { gender: "Masc" }),
					jedemSurface(record, { gender: "Neut" }),
					jedemSurface(record, { gender: "Fem" }),
				]),
			);
		},
	},
];
