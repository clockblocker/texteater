/**
 * What the resolve.reading tests share: a one-member Attestation of a
 * Lemma, the Schloss click they read by default, Luna writing a fixed
 * description, one reading with its trace, and an authored Lemma's
 * Readings.
 */
import { authoredFor, authoredMembers } from "dumcorpus/inventories";
import { parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type {
	ReadingResolution,
	ResolveReadingInput,
} from "../../src/resolve/types.js";
import { liveOver } from "../live-over.js";
import { type fakeJev, fakeLuna, sentenceOf, unitOf } from "./support.js";

/** The fields of an Attestation's route beyond its Surface's Lemma, spelling and members. */
type RouteFields = {
	readonly inflectionalFeatures?: null;
	readonly articleEvidence?: null;
	readonly valencyEvidence?: readonly [];
};

/**
 * A one-member, canonically spelled Attestation of `lemma`, as far as
 * resolve.reading reads it: its Lemma. `fields` are its route's own, and
 * Dumling checks the whole on the Lemma's route.
 */
export function attestationOf(
	lemma: Dumling.Lemma<"de">,
	{ inflectionalFeatures, ...fields }: RouteFields = {},
): Dumling.Attestation<"de"> {
	const parsed = parseUnit(
		{
			unitKind: "Attestation",
			surface: {
				unitKind: "Surface",
				language: "de",
				lemma,
				normalizedSurface: lemma.canonicalForm,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				...(inflectionalFeatures === undefined
					? {}
					: { inflectionalFeatures }),
			},
			members: [
				{ attested: lemma.canonicalForm, orthography: "Standard" },
			],
			realizationCoverage: "Full",
			...fields,
		},
		{ unitKind: "Attestation", ...routeOf(lemma) },
	);
	if (!parsed.success) throw parsed.error;
	return parsed.chain.value;
}

const schloss: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Schloss",
	coreFeatures: { gender: "Neut" },
};
export const schlossAttestation = attestationOf(schloss, {
	inflectionalFeatures: null,
	articleEvidence: null,
	valencyEvidence: [],
});
export const sentence = sentenceOf("Das Schloss klemmt.");
export const nounUnit = unitOf([2], "Lexeme/NOUN");

/** Luna writing `emojiDescription`, keeping what it was sent. */
export const writes = (emojiDescription: unknown) =>
	fakeLuna(() => emojiDescription);

export async function readOnce(
	jev: ReturnType<typeof fakeJev>,
	luna: ReturnType<typeof fakeLuna>,
	input: Partial<ResolveReadingInput> & {
		readonly candidates: readonly string[];
	},
): Promise<{ result: ReadingResolution; trace: OperationTrace | undefined }> {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		operations.resolve
			.reading({
				attestation: schlossAttestation,
				sentence,
				unit: nounUnit,
				...input,
			})
			.pipe(
				Effect.provide(
					liveOver({
						jev: jev.ask,
						luna: luna.ask,
						onOperation: (trace) => traces.push(trace),
					}),
				),
			),
	);
	return { result, trace: traces[0] };
}

/** An authored Lemma and its authored Emoji Descriptions. */
export const authoredLemma = (canonicalForm: string, kind: string) => {
	const first = authoredMembers.find(
		({ lemma }) =>
			lemma.canonicalForm === canonicalForm && lemma.kind === kind,
	);
	if (!first) throw Error(`No authored ${kind} ${canonicalForm}`);
	return {
		lemma: first.lemma,
		readings: authoredFor(first.lemma).map(
			({ reading }) => reading.emojiDescription,
		),
	};
};
