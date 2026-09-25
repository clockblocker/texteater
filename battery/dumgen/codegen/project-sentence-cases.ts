import { readFileSync } from "node:fs";
import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";
import { stableJson } from "promptsmith";
import { z } from "zod";
import { type CaseOrigin, recordOriginOf } from "./case-origin.js";

const flags = {
	demonstration: z.literal(true).optional(),
	evaluation: z.literal(true).optional(),
	slices: z.array(z.string().min(1)).min(1).optional(),
};
const recordKey = /^[a-z]{2}(?:\/[a-z0-9-]+)+$/u;

/**
 * Sentence analysis's sidecar: Dumgen's use of Full Spec Records. A case
 * served by a record is keyed by the record id and names the case id it
 * keeps, and what Dumgen owns and the record does not carry: its
 * explanation, the headword group (`Kind:headword`) of each closed-class
 * target, keyed by the target's first member offset, and its preposition
 * slots, whose absence leaves the slot layer unscored. `sentence-analysis`'s
 * `goldSchema` checks the slots. A case still in `source-data.json` is keyed
 * by its case id and holds only its flags. The order of `cases` is the order
 * of every list the stage projects.
 */
const sidecarSchema = z.strictObject({
	slices: z.record(z.string().min(1), z.string().min(1)),
	cases: z.record(
		z.string().min(1),
		z.union([
			z.strictObject({
				id: z.string().min(1),
				...flags,
				explanation: z.string().min(1).optional(),
				identities: z
					.record(z.string().regex(/^\d+$/u), z.string().min(1))
					.optional(),
				slots: z.array(z.record(z.string(), z.unknown())).optional(),
			}),
			z.strictObject(flags),
		]),
	),
});
export type SentenceSidecar = z.infer<typeof sidecarSchema>;

type MemberRole =
	| "Head"
	| "SeparableParticle"
	| "GovernedPreposition"
	| "Reflexive"
	| "Expletive"
	| "Article"
	| "Auxiliary";
type GoldTarget = {
	kind: string;
	members: { offset: number; role?: MemberRole }[];
	identity?: string;
};
export type ProjectedSentenceCase = {
	input: { segments: { kind: Dumspec.SegmentKind; text: string }[] };
	idealOutput: {
		targets?: GoldTarget[];
		phrasemes?: never[];
		slots?: Record<string, unknown>[];
	};
	explanation?: string;
};

export type ProjectedSentenceCases = {
	/**
	 * Every case id in sidecar order, then the case of each Full record the
	 * sidecar does not list.
	 */
	caseIds: string[];
	demonstrationIds: string[];
	evaluationCaseIds: string[];
	slices: Record<string, string[]>;
	/** The cases Spec Records serve; the rest stay in `source-data.json`. */
	cases: Record<string, ProjectedSentenceCase>;
	/** The Spec Record of every case projected from one. */
	origins: Record<string, CaseOrigin>;
};

/** Reads the stage's sidecar from `directory`. */
export function readSentenceSidecar(directory: URL): SentenceSidecar {
	return sidecarSchema.parse(
		JSON.parse(readFileSync(new URL("sidecar.json", directory), "utf8")),
	);
}

/** Whether a sidecar key names a Spec Record rather than a case id. */
export const isRecordKey = (key: string) => recordKey.test(key);

/** Each Segment's character offset in the Stitched Text. */
export function segmentOffsets(
	segments: readonly { text: string }[],
): number[] {
	let offset = 0;
	return segments.map(({ text }) => {
		const start = offset;
		offset += text.length;
		return start;
	});
}

const reflexivePronouns = new Set(["mich", "dich", "sich", "uns", "euch"]);
/** Forms of haben, sein and werden that stand beside a verb as its auxiliary. */
const auxiliaryForms = new Set(
	[
		"habe hast hat haben habt hatte hattest hatten hattet hätte hättest hätten hättet hätt",
		"bin bist ist sind seid war warst waren wart wäre wärst wären wärt sei seiest seien seiet sein",
		"werde wirst wird werden werdet wurde wurdest wurden wurdet würde würdest würden würdet worden",
	].flatMap((forms) => forms.split(" ")),
);

/**
 * The role of each member of a multi-member Lexeme target, where its
 * Attestation decides it: a Preposition complement's member is the
 * GovernedPreposition, an owned article the Article, the expletive's spelling
 * the Expletive, a reflexive pronoun of a lexically reflexive verb the
 * Reflexive, and the separable prefix the SeparableParticle. The one member
 * left is the Head; among several, the one that is no form of haben, sein or
 * werden is, and the rest are Auxiliaries. A role the Attestation does not
 * decide is undefined and goes unscored.
 */
export function memberRoles(
	attestation: Dumling.Attestation,
): (MemberRole | undefined)[] {
	const roles: (MemberRole | undefined)[] = attestation.members.map(
		() => undefined,
	);
	const extra = attestation as {
		articleEvidence?: { kind: string; member?: number } | null;
		expletiveEvidence?: { attested: string } | null;
		valencyEvidence?: readonly {
			member: number | null;
			complement: { kind: string };
		}[];
	};
	const core = (attestation.surface.lemma.coreFeatures ?? {}) as {
		hasSepPrefix?: string | null;
		lexicallyReflexive?: string | null;
	};
	const folded = (text: string) =>
		text.normalize("NFC").toLocaleLowerCase("de");
	const spelling = (member: number) =>
		folded(attestation.members[member]?.attested ?? "");
	const open = () => roles.flatMap((role, member) => (role ? [] : [member]));
	for (const slot of extra.valencyEvidence ?? [])
		if (slot.member !== null && slot.complement.kind === "Preposition")
			roles[slot.member] = "GovernedPreposition";
	const article = extra.articleEvidence;
	if (article?.kind === "Owned" && article.member !== undefined)
		roles[article.member] = "Article";
	const assignFirst = (
		role: MemberRole,
		matches: (member: number) => boolean,
	) => {
		const member = open().find(matches);
		if (member !== undefined && open().length > 1) roles[member] = role;
	};
	const expletive = extra.expletiveEvidence?.attested;
	if (expletive)
		assignFirst("Expletive", (m) => spelling(m) === folded(expletive));
	if (core.lexicallyReflexive === "Yes")
		assignFirst("Reflexive", (m) => reflexivePronouns.has(spelling(m)));
	const prefix = core.hasSepPrefix;
	if (prefix) assignFirst("SeparableParticle", (m) => spelling(m) === prefix);
	const rest = open();
	const lexical = rest.filter((m) => !auxiliaryForms.has(spelling(m)));
	if (rest.length === 1) roles[rest[0] as number] = "Head";
	else if (lexical.length === 1)
		for (const member of rest)
			roles[member] = member === lexical[0] ? "Head" : "Auxiliary";
	return roles;
}

/**
 * Projects a Full record's Lexeme layer: one gold target per Lexeme target,
 * in order of its first member, each member at its offset and, in a target
 * of several members, with its role. The Phraseme layer is empty when the
 * record has no Phraseme target; a record with one leaves the layer out,
 * because a Full record cannot also hold the Lexeme targets of the
 * Phraseme's words (ADR 0037), so its heads are unknown. No Target Segments
 * are in no target.
 */
export function projectSentenceCase(
	record: Dumspec.SpecRecord,
): ProjectedSentenceCase {
	if (record.coverage !== "Full")
		throw Error(`${record.id} is not Full, so it analyses no sentence`);
	const offsets = segmentOffsets(record.segments);
	const lexemes = record.targets.filter(
		(target) => target.attestation.surface.lemma.family === "Lexeme",
	);
	const targets = lexemes
		.map((target): GoldTarget => {
			const roles = memberRoles(target.attestation);
			const several = target.memberSegmentIndices.length > 1;
			return {
				kind: target.attestation.surface.lemma.kind,
				members: target.memberSegmentIndices.map((index, member) => {
					const offset = offsets[index] ?? 0;
					const role = roles[member];
					return several && role ? { offset, role } : { offset };
				}),
			};
		})
		.sort(
			(left, right) =>
				(left.members[0]?.offset ?? 0) -
				(right.members[0]?.offset ?? 0),
		);
	return {
		input: {
			segments: record.segments.map(({ kind, text }) => ({ kind, text })),
		},
		idealOutput: {
			targets,
			...(lexemes.length === record.targets.length
				? { phrasemes: [] }
				: {}),
		},
	};
}

/** The id of the case a Full record the sidecar does not list yields. */
export const unlistedCaseId = (record: Dumspec.SpecRecordId) =>
	`sentence-${record.replaceAll("/", "-")}`;

/**
 * Projects the stage's cases: each record the sidecar keys becomes the case
 * it names, with the sidecar's explanation, headword groups and slots, and
 * the lists keep the sidecar's order. Cases keyed by case id stay in
 * `source-data.json` and enter only the id lists. Every other German Full
 * record yields a case outside every list, unless its Sentence is already a
 * case's.
 */
export function projectSentenceCases(
	sidecar: SentenceSidecar,
	records: readonly Dumspec.SpecRecord[],
	remaining: Readonly<Record<string, { input: unknown }>>,
): ProjectedSentenceCases {
	const byId = new Map(records.map((record) => [record.id, record]));
	const projected: ProjectedSentenceCases = {
		caseIds: [],
		demonstrationIds: [],
		evaluationCaseIds: [],
		slices: Object.fromEntries(
			Object.keys(sidecar.slices).map((name) => [name, []]),
		),
		cases: {},
		origins: {},
	};
	const listed = new Set<string>();
	for (const [key, entry] of Object.entries(sidecar.cases)) {
		let id = key;
		if ("id" in entry) {
			id = entry.id;
			const record = isRecordKey(key) ? byId.get(key) : undefined;
			if (!record) throw Error(`No Spec Record for ${key}`);
			listed.add(record.id);
			const projectedCase = projectSentenceCase(record);
			const targets = projectedCase.idealOutput.targets ?? [];
			for (const [offset, identity] of Object.entries(
				entry.identities ?? {},
			)) {
				const target = targets.find(
					(candidate) =>
						candidate.members[0]?.offset === Number(offset),
				);
				if (!target)
					throw Error(`${key} has no target at offset ${offset}`);
				target.identity = identity;
			}
			projected.cases[id] = {
				...projectedCase,
				idealOutput: {
					...projectedCase.idealOutput,
					...(entry.slots ? { slots: entry.slots } : {}),
				},
				...(entry.explanation
					? { explanation: entry.explanation }
					: {}),
			};
			projected.origins[id] = recordOriginOf(record);
		}
		projected.caseIds.push(id);
		if (entry.demonstration) projected.demonstrationIds.push(id);
		if (entry.evaluation) projected.evaluationCaseIds.push(id);
		for (const name of entry.slices ?? []) {
			const slice = projected.slices[name];
			if (!slice) throw Error(`${key} names unknown slice ${name}`);
			slice.push(id);
		}
	}

	const inputs = new Set(
		[
			...Object.values(projected.cases),
			...projected.caseIds.flatMap((id) => remaining[id] ?? []),
		].map(({ input }) => stableJson(input)),
	);
	for (const record of records) {
		if (
			record.language !== "de" ||
			record.coverage !== "Full" ||
			listed.has(record.id)
		)
			continue;
		const projectedCase = projectSentenceCase(record);
		const input = stableJson(projectedCase.input);
		if (inputs.has(input)) continue;
		inputs.add(input);
		const id = unlistedCaseId(record.id);
		if (projected.caseIds.includes(id))
			throw Error(`${record.id} yields case id ${id}, already taken`);
		projected.caseIds.push(id);
		projected.cases[id] = projectedCase;
		projected.origins[id] = recordOriginOf(record);
	}
	return projected;
}
