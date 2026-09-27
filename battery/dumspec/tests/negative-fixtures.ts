import { readFileSync } from "node:fs";
import type { SpecCheck } from "../src/issues.js";
import { ruleStatementHash, rules } from "../src/rules.js";

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

/**
 * Marks a seed record Reviewed and gives it what a Reviewed record needs
 * beyond a Draft: a Reading on every target and a Rule citation.
 */
export function review(record: RecordJson): RecordJson {
	record.status = "Reviewed";
	for (const target of record.targets)
		target.reading = { emojiDescription: "👀" };
	record.sources.rules = [ruleCitation];
	return record;
}

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
			record.targets[0].attestation.surface.lemma.coreFeatures = {
				hyph: null,
			};
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
				{ segment: 7, reason: "Duplicated on purpose." },
			];
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
			const target = record.targets[1];
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
			slot.complement.case = "Gen";
			slot.realizedCase = "Gen";
		},
	},
	{
		name: "a governed preposition in a case the ADP Case Table does not allow",
		seed: "de/auf-ihn-bin-ich-stolz",
		check: "AdpositionCase",
		edit: (record) => {
			const [slot] = record.targets[0].attestation.valencyEvidence;
			slot.complement.case = "Gen";
			slot.realizedCase = "Gen";
		},
	},
];
