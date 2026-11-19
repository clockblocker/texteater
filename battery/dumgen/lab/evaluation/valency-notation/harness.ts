/**
 * The one seam the bench drives, as the TOON bench (`../toon-valency`, in
 * its own worktree) found it: each valency-covered Reading run through the
 * production `produceValency` with the Luna `Write` the bench supplies. The
 * request production builds is what a variant rewrites; what the variant's
 * answer becomes after Dumgen's and Dumrel's checks is what gold is
 * compared with, as `knowledge.produce`'s scoring compares it.
 */
import * as Effect from "effect/Effect";
import type { CallLog } from "../../../src/call.js";
import { InvalidModelOutput } from "../../../src/errors.js";
import type { AspectContext } from "../../../src/knowledge/de/context.js";
import { produceValency } from "../../../src/knowledge/de/valency.js";
import {
	defaultLunaConfiguration,
	type LunaDraft,
	type LunaRequest,
	lunaRequestOf,
} from "../../../src/luna.js";
import type { Write } from "../../../src/luna-call.js";
import { markedSentence } from "../../../src/resolve/reading.js";
import type { KnowledgeCase } from "../knowledge/cases.js";
import { sameAspect } from "../knowledge/exact-aspects.js";

const quietLog: CallLog["Service"] = {
	sent: () => 0,
	settled: () => {},
	sentence: () => {},
	resolution: () => {},
	event: () => {},
};

function contextOf(goldCase: KnowledgeCase, write: Write): AspectContext {
	const { reading, attestation, sentence } = goldCase;
	const { lemma } = reading;
	return {
		log: quietLog,
		ask: () => Effect.die(Error("The valency bench asks no jev")),
		write,
		reading,
		lemma,
		view: {
			lemma: lemma.canonicalForm,
			kind: lemma.kind,
			family: lemma.family,
			...("emojiDescription" in reading
				? { emojiDescription: reading.emojiDescription }
				: {}),
		},
		markedSentence: markedSentence(sentence.segments, sentence.target),
		attestation,
		paradigm: { paradigm: { dimensions: {} }, readings: [reading] },
	};
}

/** What Luna answered, as a variant read it: Luna's proposal, or why none. */
export type Answered =
	| { readonly ok: true; readonly output: unknown }
	| { readonly ok: false; readonly message: string };

export type Verdict = {
	readonly correct: boolean;
	readonly failed?: string;
	readonly frame?: unknown;
};

/**
 * Runs `produceValency` on a case with `answer` standing in for Luna:
 * correct when no valency failure stands and the frame equals gold's, an
 * aspect reviewed empty being right only when nothing was produced.
 */
export function verdictOf(
	goldCase: KnowledgeCase,
	answer: (draft: LunaDraft) => Answered,
): Verdict {
	const write: Write = (stage, draft, check) => {
		const answered = answer(draft);
		if (!answered.ok)
			return Effect.fail(
				new InvalidModelOutput({ stage, message: answered.message }),
			);
		const checked = check(answered.output);
		return checked instanceof InvalidModelOutput
			? Effect.fail(checked)
			: Effect.succeed(checked);
	};
	const result = Effect.runSync(
		Effect.result(produceValency(contextOf(goldCase, write), "New")),
	);
	if (result._tag === "Failure")
		return { correct: false, failed: result.failure.message };
	const { changes, failures } = result.success;
	const [change] = changes;
	const frame = change && "value" in change ? change.value : undefined;
	const status = goldCase.gold?.coverage.valency;
	const gold = status === "Authored" ? (goldCase.gold?.knowledge ?? {}) : {};
	const produced = frame === undefined ? {} : { valency: frame };
	const correct =
		failures.length === 0 &&
		sameAspect(
			"valency",
			{ knowledge: gold, paradigm: {} },
			{
				knowledge: produced as Parameters<
					typeof sameAspect
				>[1]["knowledge"],
				paradigm: {},
			},
		);
	return {
		correct,
		...(failures.length > 0
			? { failed: failures.map(({ message }) => message).join("; ") }
			: {}),
		...(frame === undefined ? {} : { frame }),
	};
}

/** The production request of a case's valency call, as `produceValency` builds it. */
export function requestOf(goldCase: KnowledgeCase): LunaRequest {
	let captured: LunaDraft | undefined;
	verdictOf(goldCase, (draft) => {
		captured = draft;
		return { ok: true, output: { valency: [] } };
	});
	if (!captured) throw Error(`${goldCase.id} asked Luna no valency`);
	return lunaRequestOf(captured, defaultLunaConfiguration).request;
}
