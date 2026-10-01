/**
 * Why a membership resolver got a gold unit's membership wrong, read from
 * its stage traces (#755). Gold is used only for scoring: it names the
 * unit's pieces, never a connection.
 *
 * Per repetition, a wrong unit is split (its pieces end in several groups)
 * or enlarged (its group takes pieces from outside), or both:
 *
 * - **not nominated**: split, and no combination of nominated connections
 *   lying inside the unit makes exactly its pieces. A connection that also
 *   takes pieces from outside does not make the gold arrangement available.
 * - **rejected**: split; the inside connections make the unit, but the ones
 *   whose judgment cleared the floor do not.
 * - **accepted**: enlarged by a judged connection that crosses the unit's
 *   boundary: a judgment supported a wrong connection.
 * - **assembly**: split although supported connections make the unit, or
 *   enlarged by an edge code drew by its own rule, or by a routing merge.
 * - **ambiguous**: the repetition's causes disagree, or the unit's
 *   repetitions do.
 *
 * A unit of a record whose gold is in review is reported as disputed gold
 * beside its cause, never relabelled.
 */
import type { Unit } from "../../evaluation/spec-corpus/segment-in-units.js";
import type { LabCase } from "./corpus.js";
import { contiguous } from "./metrics.js";
import {
	type Connection,
	type Groups,
	groupsOf,
	type StageTrace,
} from "./stages.js";

export type Cause =
	| "not nominated"
	| "rejected"
	| "accepted"
	| "assembly"
	| "ambiguous";

export const causes: readonly Cause[] = [
	"not nominated",
	"rejected",
	"accepted",
	"assembly",
	"ambiguous",
];

export type Bucket =
	| "one piece"
	| "multi-piece Lexeme"
	| "contiguous Locution"
	| "discontinuous Locution"
	| "Saying";

export const buckets: readonly Bucket[] = [
	"one piece",
	"multi-piece Lexeme",
	"contiguous Locution",
	"discontinuous Locution",
	"Saying",
];

/** One repetition of one gold unit. */
export type UnitRepetition = {
	readonly correct: boolean;
	readonly split: boolean;
	readonly enlarged: boolean;
	/** Absent when the unit is right. */
	readonly cause?: Cause;
	/**
	 * For a rejected split: the highest share or Noul among the unsupported
	 * judged connections inside the unit, how near a judgment came.
	 */
	readonly nearest?: number;
	/** The groups holding the unit's pieces, as piece ids. */
	readonly groups: Groups;
};

export type UnitAttribution = {
	readonly caseId: string;
	readonly record: string;
	readonly unit: number;
	readonly text: string;
	readonly bucket: Bucket;
	readonly pieces: readonly number[];
	/**
	 * Whether, in every repetition, nominated connections inside the unit
	 * make exactly its pieces. Nomination reads a judgment (which pieces are
	 * fixed), so it can differ between repetitions.
	 */
	readonly nominated: boolean;
	readonly repetitions: readonly UnitRepetition[];
	readonly wrongByMajority: boolean;
	/** Right in some repetitions and wrong in others. */
	readonly flips: boolean;
	/** Over its wrong repetitions; absent when it is never wrong. */
	readonly cause?: Cause;
	readonly disputedGold: boolean;
};

/** The 1-based piece ids of a unit's ResolvableText Segments. */
export function piecesOf(labCase: LabCase, unit: Unit): number[] {
	const resolvable = labCase.input.segments.flatMap(({ kind }, index) =>
		kind === "ResolvableText" ? [index] : [],
	);
	return unit.segments
		.map((segment) => resolvable.indexOf(segment) + 1)
		.filter((id) => id > 0)
		.sort((a, b) => a - b);
}

export function bucketOf(labCase: LabCase, unit: Unit, pieces: number): Bucket {
	if (pieces === 1) return "one piece";
	const family = unit.route === "Unresolved" ? "Lexeme" : unit.route.family;
	if (family === "Saying") return "Saying";
	if (family === "Locution")
		return contiguous(labCase, unit)
			? "contiguous Locution"
			: "discontinuous Locution";
	return "multi-piece Lexeme";
}

/** Whether `connections`, chained piece to piece, join all of `pieces`. */
function connects(
	pieces: readonly number[],
	connections: readonly Connection[],
): boolean {
	if (pieces.length < 2) return true;
	const edges = connections.flatMap((connection) =>
		connection.pieces
			.slice(1)
			.map((id, index) => [connection.pieces[index] ?? id, id] as const),
	);
	return groupsOf(pieces, edges).length === 1;
}

const inside = (pieces: ReadonlySet<number>, connection: Connection) =>
	connection.pieces.every((id) => pieces.has(id));

/**
 * The connections inside a unit that `admit` lets count, with each
 * conditional one counted only once it touches a piece the others reach:
 * absorption alone makes no unit.
 */
function counting(
	pieces: ReadonlySet<number>,
	connections: readonly Connection[],
	admit: (connection: Connection) => boolean,
): Connection[] {
	const within = connections.filter(
		(connection) => inside(pieces, connection) && admit(connection),
	);
	const chosen = within.filter((connection) => !connection.conditional);
	const reached = new Set(chosen.flatMap((connection) => connection.pieces));
	const waiting = within.filter((connection) => connection.conditional);
	for (let grew = true; grew; ) {
		grew = false;
		for (const connection of [...waiting])
			if (connection.pieces.some((id) => reached.has(id))) {
				chosen.push(connection);
				for (const id of connection.pieces) reached.add(id);
				waiting.splice(waiting.indexOf(connection), 1);
				grew = true;
			}
	}
	return chosen;
}

/** Whether nominated connections inside the unit make exactly its pieces. */
export function nominatedFor(
	pieces: readonly number[],
	connections: readonly Connection[],
): boolean {
	return connects(
		pieces,
		counting(new Set(pieces), connections, () => true),
	);
}

/**
 * Whether the connections a judgment or rule supported inside the unit
 * make exactly its pieces; a conditional connection counts as supported
 * once it touches them.
 */
function supportedFor(
	pieces: readonly number[],
	connections: readonly Connection[],
): boolean {
	return connects(
		pieces,
		counting(
			new Set(pieces),
			connections,
			(connection) =>
				connection.supported || connection.conditional === true,
		),
	);
}

/** One repetition of one gold unit against its trace. */
export function attributeRepetition(
	pieces: readonly number[],
	trace: StageTrace,
): UnitRepetition {
	const set = new Set(pieces);
	const groups = trace.final.filter((group) =>
		group.some((id) => set.has(id)),
	);
	const split = groups.length > 1;
	const enlarged = groups.some((group) => group.some((id) => !set.has(id)));
	if (!split && !enlarged) return { correct: true, split, enlarged, groups };
	const found = new Set<Cause>();
	let nearest: number | undefined;
	if (split) {
		if (!nominatedFor(pieces, trace.connections))
			found.add("not nominated");
		else if (!supportedFor(pieces, trace.connections)) {
			found.add("rejected");
			nearest = Math.max(
				0,
				...trace.connections
					.filter(
						(connection) =>
							connection.source === "judged" &&
							!connection.supported &&
							inside(set, connection),
					)
					.map((connection) => connection.probability ?? 0),
			);
		} else found.add("assembly");
	}
	if (enlarged) {
		const byId = new Map(
			trace.connections.map((connection) => [connection.id, connection]),
		);
		const crosses = ([a, b]: readonly [number, number]) =>
			set.has(a) !== set.has(b);
		for (const edge of trace.edges) {
			if (!crosses(edge.pieces)) continue;
			const connection =
				edge.connection === undefined
					? undefined
					: byId.get(edge.connection);
			found.add(
				connection?.source === "judged" ? "accepted" : "assembly",
			);
		}
		if (trace.merges.some((edge) => crosses(edge.pieces)))
			found.add("assembly");
	}
	const [only, ...more] = found;
	return {
		correct: false,
		split,
		enlarged,
		cause: only !== undefined && more.length === 0 ? only : "ambiguous",
		...(nearest === undefined ? {} : { nearest }),
		groups,
	};
}

/** The cause most of the wrong repetitions share, else `ambiguous`. */
export function unitCause(
	repetitions: readonly UnitRepetition[],
): Cause | undefined {
	const counts = new Map<Cause, number>();
	for (const { cause } of repetitions)
		if (cause) counts.set(cause, (counts.get(cause) ?? 0) + 1);
	const ranked = [...counts].sort((a, b) => b[1] - a[1]);
	const [top, next] = ranked;
	if (!top) return undefined;
	return next && next[1] === top[1] ? "ambiguous" : top[0];
}

export function attributeUnit(args: {
	readonly labCase: LabCase;
	readonly unit: number;
	readonly traces: readonly StageTrace[];
	readonly disputedGold: boolean;
}): UnitAttribution | undefined {
	const { labCase, traces } = args;
	const unit = labCase.idealOutput.units[args.unit];
	if (!unit) throw Error(`${labCase.id} has no unit ${args.unit}`);
	// Not scored until foreign routing and `Unresolved` are decided (#730).
	if (unit.route === "Unresolved" || unit.route.family === "Foreign")
		return undefined;
	const pieces = piecesOf(labCase, unit);
	if (pieces.length === 0) return undefined;
	if (traces.length === 0) throw Error(`${labCase.id} has no traces`);
	const repetitions = traces.map((trace) =>
		attributeRepetition(pieces, trace),
	);
	const wrong = repetitions.filter(
		(repetition) => !repetition.correct,
	).length;
	const cause = unitCause(repetitions);
	return {
		caseId: labCase.id,
		record: labCase.record,
		unit: args.unit,
		text: unit.segments
			.map((segment) => labCase.input.segments[segment]?.text ?? "")
			.join(" "),
		bucket: bucketOf(labCase, unit, pieces.length),
		pieces,
		nominated: traces.every((trace) =>
			nominatedFor(pieces, trace.connections),
		),
		repetitions,
		wrongByMajority: wrong * 2 > repetitions.length,
		flips: wrong > 0 && wrong < repetitions.length,
		...(cause ? { cause } : {}),
		disputedGold: args.disputedGold,
	};
}
