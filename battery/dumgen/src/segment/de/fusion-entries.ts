import {
	germanAbbreviations,
	germanClitics,
	germanFusions,
	germanSeparablePrefixes,
} from "dumcorpus/inventories";
import type { FusionTable } from "../fusion-table.js";

/**
 * German's fusion table (Dumgen ADR 0004): dumcorpus's reviewed fusions,
 * apostrophe clitics and abbreviations, which the Segment stage cuts with.
 */
export const germanFusionTable: FusionTable = {
	language: "de",
	fusions: germanFusions,
	clitics: germanClitics,
	abbreviations: germanAbbreviations,
	abbreviationCase: "Authored",
};

/**
 * Separable prefixes whose infixed zu is not split off here. `da` and `hin`:
 * dazugehören and hinzufügen are particle verbs on dazu and hinzu whose zu
 * is no infix, and their own infixed forms (dazuzulernen, hinzuzufügen) are
 * found through dazu and hinzu. The r- shorthands, über and the rest were
 * left out when the list was shaped; splitting one changes segmentation, so
 * each waits for a lab round (#1057).
 */
const noInfixParticles: ReadonlySet<string> = new Set([
	"bloß",
	"da",
	"entzwei",
	"hin",
	"hinterher",
	"kaputt",
	"leid",
	"ran",
	"rauf",
	"raus",
	"rein",
	"rückwärts",
	"runter",
	"rüber",
	"über",
	"übrig",
	"umher",
	"vorwärts",
	"vorweg",
]);

/**
 * Separable prefixes that take an infinitive's infixed zu, which is a piece
 * of its own (de/fused-word-pieces): abzuspannen is ab, zu and spannen.
 * Longer prefixes are tried first, so hinauszulaufen is hinaus, zu and
 * laufen. dumcorpus's list without `noInfixParticles`.
 */
export const germanInfixParticles: readonly string[] = [
	...germanSeparablePrefixes,
].filter((prefix) => !noInfixParticles.has(prefix));
