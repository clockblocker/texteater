import { readFileSync } from "node:fs";
import type { SpecCheck } from "../src/issues.js";

// biome-ignore lint/suspicious/noExplicitAny: fixtures edit raw record JSON.
type RecordJson = any;

export function seedJson(id: string): RecordJson {
	return JSON.parse(
		readFileSync(new URL(`../records/${id}.json`, import.meta.url), "utf8"),
	);
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
		name: "a Grundform verdict Dumling contradicts",
		seed: "de/ich-bin-im-wald",
		check: "Grundform",
		edit: (record) => {
			record.targets[1].grundform = true;
		},
	},
];
