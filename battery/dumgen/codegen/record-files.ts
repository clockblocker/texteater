/**
 * Writing Spec Record files from Dumgen's cases (ADR 0037): new record ids
 * and Segments, citations, the file layout, and the compact Attestation the
 * review sheets show. Shared by the migrations of the stages whose gold
 * moves into dumspec.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";
import { stableJson } from "promptsmith";
import { germanFusionTable } from "../src/concrete-lang/de/fusion-entries.js";
import {
	fusedWordAt,
	fusedWordSegments,
} from "../src/universal/fusion-table.js";

type Reference = Dumspec.Reference;
export type CaseSegment = { kind: Dumspec.SegmentKind; text: string };
/** A record file as written, before dumspec checks and loads it. */
export type RecordFile = {
	$schema?: string;
	sentence: string;
	segments: (CaseSegment & { surface?: string })[];
	coverage: Dumspec.Coverage;
	status: Dumspec.ReviewStatus;
	provenance: Dumspec.Provenance;
	sources: {
		adrs: string[];
		rules: Dumspec.RuleCitation[];
		references: Reference[];
	};
	targets: {
		memberSegmentIndices: number[];
		notes?: { rationale?: string; knownMistakes?: string[] };
		attestation: Dumling.Attestation;
	}[];
	noTarget: Dumspec.NoTarget[];
};

const repository = new URL("../../../", import.meta.url);
export const recordsDirectory = new URL("battery/dumspec/records/", repository);

/** The system ADRs a record can cite. */
const adrs = new Set(
	readdirSync(new URL("docs/adr/", repository)).flatMap((file) => {
		const number = /^(\d{4})-/u.exec(file)?.[1];
		return number ? [`ADR-${number}`] : [];
	}),
);

const transliterations: Record<string, string> = {
	ä: "ae",
	ö: "oe",
	ü: "ue",
	ß: "ss",
};
/** A record id's name for a Sentence: its first words, in ASCII. */
export function slugOf(sentence: string): string {
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

/** The case Segments with the surface of each fused-word piece. */
export function recordSegments(segments: readonly CaseSegment[]) {
	const withSurfaces: (CaseSegment & { surface?: string })[] = segments.map(
		({ kind, text }) => ({ kind, text }),
	);
	for (let index = 0; index < segments.length; index++) {
		const run = fusedWordAt(germanFusionTable, segments, index);
		if (!run) continue;
		const pieces = fusedWordSegments(
			germanFusionTable,
			run.map((position) => segments[position]?.text ?? "").join(""),
		);
		for (const [position, piece] of (pieces ?? []).entries()) {
			const segment = withSurfaces[index + position];
			if (segment && piece.surface && piece.text === segment.text)
				segment.surface = piece.surface;
		}
	}
	return withSurfaces;
}

function citedAdrs(text: string | undefined): string[] {
	return [...(text ?? "").matchAll(/\bADR[ -]?(\d{4})\b/gu)]
		.map((match) => `ADR-${match[1]}`)
		.filter((adr) => adrs.has(adr));
}
function issueReferences(text: string | undefined, supports: string) {
	return [
		...new Set(
			[
				...(text ?? "").matchAll(
					/(?:#|\bissue |\bticket |\bmap )(\d+)\b/gu,
				),
			].map((match) => match[1] as string),
		),
	]
		.sort()
		.map((issue) => ({
			title: `clockblocker/texteater#${issue}`,
			url: `https://github.com/clockblocker/texteater/issues/${issue}`,
			supports,
		}));
}

/**
 * Cites the case's ADRs, issues and sources in a record a migration writes. A
 * Reviewed record is never written.
 */
export function cite(
	file: RecordFile,
	golden: { explanation?: string; sources?: readonly Reference[] },
	supports: string,
) {
	for (const adr of citedAdrs(golden.explanation))
		if (!file.sources.adrs.includes(adr)) file.sources.adrs.push(adr);
	for (const reference of [
		...(golden.sources ?? []),
		...issueReferences(golden.explanation, supports),
	])
		if (
			!file.sources.references.some(
				(existing) => stableJson(existing) === stableJson(reference),
			)
		)
			file.sources.references.push(reference);
}

/** JSON with each object of plain values on one line, for Biome to settle. */
export function serialize(value: unknown): string {
	const write = (item: unknown, indent: string): string => {
		if (item === null || typeof item !== "object")
			return JSON.stringify(item);
		const inner = `${indent}\t`;
		const entries = Array.isArray(item)
			? item.map((element) => [undefined, element] as const)
			: Object.entries(item);
		if (entries.length === 0) return Array.isArray(item) ? "[]" : "{}";
		const plain = entries.every(
			([, element]) => element === null || typeof element !== "object",
		);
		const parts = entries.map(
			([key, element]) =>
				`${key === undefined ? "" : `${JSON.stringify(key)}: `}${write(element, inner)}`,
		);
		const [open, close] = Array.isArray(item) ? ["[", "]"] : ["{", "}"];
		if (plain)
			return Array.isArray(item)
				? `${open}${parts.join(", ")}${close}`
				: `${open} ${parts.join(", ")} ${close}`;
		return `${open}\n${parts.map((part) => inner + part).join(",\n")}\n${indent}${close}`;
	};
	return `${write(value, "")}\n`;
}

/** A file in its layout: Biome keeps the lines JSON.stringify breaks. */
export const stringify = (value: unknown) =>
	`${JSON.stringify(value, null, "\t")}\n`;

/** Text for one Markdown table cell. */
export const cell = (text: string) =>
	text.replaceAll("|", "\\|").replaceAll(/\s*\n\s*/gu, " ");
const features = (value: unknown) =>
	value && typeof value === "object"
		? Object.entries(value)
				.filter(([, feature]) => feature !== null)
				.map(([name, feature]) => `${name}=${feature}`)
				.join(",")
		: "";
/**
 * An Attestation on one line: Lemma {Core Features} · "Surface" {Inflectional
 * Features} · members/orthography · Realization Coverage · evidence.
 */
export function compact(attestation: Dumling.Attestation): string {
	const surface = attestation.surface as Record<string, unknown> & {
		normalizedSurface: string;
		lemma: Record<string, unknown> & { canonicalForm: string };
	};
	const core = features(surface.lemma.coreFeatures);
	const inflection = features(surface.inflectionalFeatures);
	const evidence: string[] = [];
	const extra = attestation as Record<string, unknown>;
	const article = extra.articleEvidence as
		| { kind: string }
		| null
		| undefined;
	if (article) evidence.push(`article ${article.kind}`);
	if (extra.expletiveEvidence) evidence.push("expletive");
	for (const slot of (extra.valencyEvidence ?? []) as {
		member: number | null;
		complement: {
			kind: string;
			case?: string;
			preposition?: { canonicalForm: string };
		};
	}[])
		evidence.push(
			`${slot.complement.preposition ? `${slot.complement.preposition.canonicalForm}+` : ""}${slot.complement.case ?? slot.complement.kind}${slot.member === null ? "" : `@${slot.member}`}`,
		);
	return [
		`${surface.lemma.canonicalForm}${core ? ` {${core}}` : ""}`,
		`"${surface.normalizedSurface}"${surface.spelling === "Canonical" ? "" : ` ${surface.spelling}`}${inflection ? ` {${inflection}}` : ""}`,
		attestation.members
			.map((member) => `${member.attested}/${member.orthography}`)
			.join(" "),
		attestation.realizationCoverage,
		...(evidence.length ? [evidence.join(", ")] : []),
	].join(" · ");
}

/** Formats written files the way Biome keeps them. */
export function formatWritten(paths: readonly string[]) {
	const biome = fileURLToPath(new URL("node_modules/.bin/biome", repository));
	Bun.spawnSync([biome, "format", "--write", ...paths]);
}
