/**
 * The concrete Valency Pattern of an occurrence (Sys ADR 0034): Luna extracts
 * the single concrete pattern `<TARGET>` realizes in `markedSentence` under
 * the Lesart `emojiDescription` names, holding only complement kinds the
 * route allows (`allowedComplementKinds`). Luna writes it in German
 * dictionary notation in case letters (`N A nach D`, `N auf dass`,
 * `valency-notation.ts`), one string a strict schema's pattern holds, read
 * back into complements. Dumrel checks them onto the pattern: a disallowed
 * complement is dropped and named in a `DroppedValencyComplements` event.
 *
 * The occurrence's `valencyEvidence` anchors governed prepositions (when
 * `anchorEvidence` is true — on a `New` Reading and on post-click valency
 * accumulation): any attested governed preposition not already covered by a
 * `Preposition` complement or a correlated `Clause.preposition` joins the
 * pattern. A preposition no governor selects stays an attributable failure.
 *
 * The Reading's 🪞 settles its Reflexive complement (ADR 0052): a 🪞 Reading
 * always includes its lexical `Reflexive` in every pattern (preferring the
 * occurrence's attested case when `anchorEvidence` is true, else Luna's). A
 * Reading without 🪞 keeps a `Reflexive` when attested in `valencyEvidence`,
 * and converts an unattested reflexive proposal into the ordinary Case object
 * (`Acc`/`Dat`) it stands for.
 */

import {
	germanGovernablePrepositions,
	reflexiveMarker,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { allowedComplementKinds, applyKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { InvalidModelOutput } from "../../errors.js";
import type {
	GermanKnowledgeChange,
	KnowledgeFailure,
	KnowledgeOrigin,
} from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedChanges,
	unusable,
	write,
} from "./context.js";
import { shared, valency } from "./prompts.js";
import {
	canonicalizeGermanPattern,
	germanPatternRegex,
	type ProposedComplement,
	parseGermanPattern,
} from "./valency-notation.js";
import { examplesParagraph, notationParagraphs } from "./valency-prompts.js";

/**
 * The German prepositions a governor can select (dumcorpus's ADP Case
 * Table); a proposal or an attestation of any other is no pattern complement.
 */
const governable = new Set<string>(germanGovernablePrepositions);

export const valencyPrompt = [
	shared.reading,
	shared.evidence,
	valency.task,
	valency.subject,
	valency.reflexive,
	valency.lesart,
	valency.freeMarker,
	valency.preposition,
	valency.route,
	valency.fixed,
	...notationParagraphs,
	examplesParagraph,
].join("\n");

/** One entry of an Attestation's `valencyEvidence`, on any route that records it. */
type ValencyEvidence = Extract<
	Dumling.Attestation<"de">,
	{ readonly valencyEvidence: unknown }
>["valencyEvidence"][number];

/**
 * The answer Luna writes under, strict: the concrete pattern as one string
 * the notation's pattern holds, so every answer reads back.
 */
const patternAnswer = { type: "string", pattern: germanPatternRegex } as const;

/**
 * The complements Luna's notation reads as, each preposition its Canonical
 * Form, or why it reads as none.
 */
function patternOf(
	stage: string,
	output: unknown,
): readonly ProposedComplement[] | InvalidModelOutput {
	if (typeof output !== "string")
		return unusable(stage, "Luna answered no valency pattern");
	const read = parseGermanPattern(output);
	return read.ok
		? read.pattern
		: unusable(
				stage,
				`Luna's valency pattern «${output.slice(0, 120)}» does not read: ${read.error}`,
			);
}

/** A preposition's ADP Lemma, as Grammatical Resolution writes it in `valencyEvidence`. */
const prepositionLemma = (
	canonicalForm: string,
): Dumling.Lemma<"de", "Lexeme", "ADP"> => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

/** A proposed complement in Dumrel's shape: a preposition becomes its ADP Lemma. */
function germanComplementOf(
	complement: ProposedComplement,
): Dumrel.GermanValencyComplement {
	if (complement.kind === "Preposition")
		return {
			...complement,
			preposition: prepositionLemma(complement.preposition),
		};
	if (complement.kind === "Reflexive" && complement.preposition !== undefined)
		return {
			...complement,
			preposition: prepositionLemma(complement.preposition),
		};
	if (complement.kind === "Reflexive")
		return { kind: "Reflexive", governedCase: complement.governedCase };
	if (complement.kind === "Clause" && complement.preposition !== undefined)
		return {
			kind: "Clause",
			form: complement.form,
			preposition: prepositionLemma(complement.preposition),
		};
	if (complement.kind === "Clause")
		return { kind: "Clause", form: complement.form };
	return complement;
}

/**
 * Whether Dumrel accepts `candidate` onto the complements kept before it;
 * `refused` hears why it does not.
 */
function acceptedComplement(
	reading: Dumling.Reading<"de">,
	kept: readonly Dumrel.GermanValencyComplement[],
	candidate: Dumrel.GermanValencyComplement,
	refused: (reason: string) => void,
): boolean {
	const applied = applyKnowledgeChange({
		source: reading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "valency",
			value: [[...kept, candidate]],
		},
	});
	if (!applied.success) refused(applied.error.message.slice(0, 200));
	return applied.success;
}

/**
 * The complements Dumrel accepts, checked one by one onto the ones kept
 * before them, and the ones it refused with why.
 */
function validPattern(
	reading: Dumling.Reading<"de">,
	proposed: readonly ProposedComplement[],
): {
	readonly kept: Dumrel.GermanValencyComplement[];
	readonly dropped: {
		readonly complement: ProposedComplement;
		readonly reason: string;
	}[];
} {
	const kept: Dumrel.GermanValencyComplement[] = [];
	const dropped: { complement: ProposedComplement; reason: string }[] = [];
	for (const complement of proposed) {
		const candidate = germanComplementOf(complement);
		if (
			acceptedComplement(reading, kept, candidate, (reason) =>
				dropped.push({ complement, reason }),
			)
		)
			kept.push(candidate);
	}
	return { kept, dropped };
}

/**
 * Governed prepositions already represented in the pattern: either directly as
 * a `Preposition` (`form/case`) or as a correlated `Clause.preposition` (`form`).
 */
function prepositionCovered(
	pattern: readonly Dumrel.GermanValencyComplement[],
	form: string,
	governedCase: "Acc" | "Dat" | "Gen",
): boolean {
	return pattern.some(
		(complement) =>
			(complement.kind === "Preposition" &&
				complement.preposition.canonicalForm === form &&
				complement.governedCase === governedCase) ||
			(complement.kind === "Clause" &&
				complement.preposition?.canonicalForm === form),
	);
}

/**
 * Governed prepositions attested in this occurrence's `valencyEvidence` that
 * Luna omitted, and any evidence Knowledge cannot hold.
 */
function attestedPrepositions(
	lemma: Dumling.Lemma<"de">,
	proposed: readonly Dumrel.GermanValencyComplement[],
	evidence: readonly ValencyEvidence[],
): {
	readonly added: Dumrel.GermanValencyComplement[];
	readonly failures: KnowledgeFailure[];
} {
	const takesPrepositions = allowedComplementKinds(lemma).some(
		(kind) => kind === "Preposition",
	);
	const added: Dumrel.GermanValencyComplement[] = [];
	const failures: KnowledgeFailure[] = [];
	for (const { complement } of evidence) {
		if (complement.kind !== "Preposition") continue;
		const form = complement.preposition.canonicalForm;
		const { governedCase } = complement;
		const unusableEvidence = (message: string) =>
			failures.push({
				aspect: "valency",
				leaf: form,
				code: "Unresolved",
				message,
			});
		if (!takesPrepositions) {
			unusableEvidence(
				`The occurrence attests ${form} + ${governedCase}, and a ${lemma.family} ${lemma.kind} pattern takes no preposition`,
			);
			continue;
		}
		if (!governable.has(form)) {
			unusableEvidence(
				`The occurrence attests ${form} + ${governedCase}, and ${form} is no preposition a governor selects`,
			);
			continue;
		}
		if (prepositionCovered([...proposed, ...added], form, governedCase))
			continue;
		added.push({
			kind: "Preposition",
			preposition: prepositionLemma(form),
			governedCase,
		});
	}
	return { added, failures };
}

type Reflexive = Extract<
	Dumrel.GermanValencyComplement,
	{ readonly kind: "Reflexive" }
>;

/**
 * The occurrence's Reflexive where its evidence names the case, which it
 * does only where the form (mich, mir) or a fixed phrase's preposition
 * shows it; after sich, uns or euch it names none (ADR 0052).
 */
function attestedReflexive(
	evidence: readonly ValencyEvidence[],
): Reflexive | undefined {
	for (const { complement } of evidence)
		if (complement.kind === "Reflexive" && "governedCase" in complement)
			return complement;
	return undefined;
}

const hasAnyReflexiveEvidence = (evidence: readonly ValencyEvidence[]) =>
	evidence.some(({ complement }) => complement.kind === "Reflexive");

/**
 * Settles the Reflexive complement of one concrete pattern using the
 * Reading's 🪞 marker and the occurrence's `valencyEvidence` (ADR 0052).
 */
function settledReflexive(
	reading: Dumling.Reading<"de">,
	pattern: readonly Dumrel.GermanValencyComplement[],
	evidence: readonly ValencyEvidence[],
	anchorEvidence: boolean,
):
	| {
			readonly pattern: Dumrel.GermanValencyComplement[];
			readonly dropped?: {
				readonly complement: unknown;
				readonly reason: string;
			};
	  }
	| { readonly failure: KnowledgeFailure } {
	const marked =
		"emojiDescription" in reading &&
		reading.emojiDescription.startsWith(reflexiveMarker);
	const proposed = pattern.find(
		(complement): complement is Reflexive =>
			complement.kind === "Reflexive",
	);
	const rest = pattern.filter((complement) => complement !== proposed);
	if (!marked) {
		if (!proposed) return { pattern: [...pattern] };
		// An attested reflexive on a non-🪞 Reading (optional reflexive like
		// ausruhen) stays Reflexive; an unattested sich is the ordinary object.
		if (hasAnyReflexiveEvidence(evidence)) return { pattern: [...pattern] };
		if (proposed.preposition !== undefined)
			return {
				pattern: rest,
				dropped: {
					complement: proposed,
					reason: `A Reading without ${reflexiveMarker} takes no fixed-phrase Reflexive unless attested`,
				},
			};
		const taken = rest.some(
			(complement) =>
				complement.kind === "Case" &&
				complement.governedCase === proposed.governedCase,
		);
		if (taken)
			return {
				pattern: rest,
				dropped: {
					complement: proposed,
					reason: `A Reading without ${reflexiveMarker} has no unattested Reflexive beside an object in ${proposed.governedCase}`,
				},
			};
		return {
			pattern: [
				...rest,
				{ kind: "Case", governedCase: proposed.governedCase },
			],
		};
	}
	const attested = attestedReflexive(evidence);
	const complement = anchorEvidence
		? (attested ?? proposed)
		: (proposed ?? attested);
	if (complement === undefined)
		return {
			failure: {
				aspect: "valency",
				leaf: "Reflexive",
				code: "Unresolved",
				message: `A ${reflexiveMarker} Reading requires a Reflexive complement in every pattern, and neither Luna nor the occurrence names its case`,
			},
		};
	return { pattern: [...rest, complement] };
}

/**
 * Extracts the single concrete Valency Pattern `<TARGET>` realizes in
 * `context.markedSentence`, anchored to `attestation.valencyEvidence` when
 * `anchorEvidence` is true, canonicalized, and checked by Dumrel.
 */
export const extractGermanValencyPattern = (
	context: AspectContext,
	options: {
		readonly anchorEvidence: boolean;
		readonly stage?: string;
	},
): Effect.Effect<
	{
		readonly pattern: Dumrel.ValencyPattern | null;
		readonly failures: KnowledgeFailure[];
	},
	AspectError
> =>
	Effect.gen(function* () {
		const stage = options.stage ?? "valency";
		const proposed = yield* write(
			context,
			stage,
			valencyPrompt,
			{ complementKinds: [...allowedComplementKinds(context.lemma)] },
			patternAnswer,
			(output) => patternOf(stage, output),
			{ strict: true },
		);
		const { kept, dropped } = validPattern(context.reading, proposed);
		if (dropped.length > 0)
			context.log.event({
				name: "DroppedValencyComplements",
				data: { dropped },
			});
		const evidence =
			"valencyEvidence" in context.attestation
				? context.attestation.valencyEvidence
				: [];
		const attested = options.anchorEvidence
			? attestedPrepositions(context.lemma, kept, evidence)
			: { added: [], failures: [] };
		const settled = settledReflexive(
			context.reading,
			[...kept, ...attested.added],
			evidence,
			options.anchorEvidence,
		);
		if ("failure" in settled)
			return {
				pattern: null,
				failures: [...attested.failures, settled.failure],
			};
		if (settled.dropped)
			context.log.event({
				name: "DroppedValencyComplements",
				data: { dropped: [settled.dropped] },
			});
		if (settled.pattern.length === 0)
			return { pattern: null, failures: attested.failures };
		const canonical = canonicalizeGermanPattern(settled.pattern);
		return {
			pattern: canonical,
			failures: attested.failures,
		};
	});

/**
 * The Reading's realized pattern from this occurrence as one Contribute
 * change (`[pattern]`), or no change when no complement is realized.
 */
export const produceValency = (
	context: AspectContext,
	origin: KnowledgeOrigin,
): Effect.Effect<
	{
		readonly changes: GermanKnowledgeChange[];
		readonly failures: KnowledgeFailure[];
	},
	AspectError
> =>
	Effect.gen(function* () {
		const { pattern, failures } = yield* extractGermanValencyPattern(
			context,
			{ anchorEvidence: origin === "New" },
		);
		if (pattern === null) return { changes: [], failures };
		const changes = checkedChanges(context, "valency", [
			{ kind: "Contribute", aspect: "valency", value: [pattern] },
		]);
		if (!Array.isArray(changes)) return yield* changes;
		return { changes, failures };
	});
