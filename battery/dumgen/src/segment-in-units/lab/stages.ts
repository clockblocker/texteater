/**
 * `segment.inUnits` as three stages, so a membership resolver can be swapped
 * while nomination and routing stay fixed (#755, #754):
 *
 * 1. **Nomination** lists the connections code proposes between pieces and
 *    what each judgment said about them.
 * 2. **Membership resolution** turns the nominations into a partition of
 *    the pieces. It may add edges by its own rules (assembly).
 * 3. **Routing** routes every group. It may still merge groups; every merge
 *    is recorded.
 *
 * `runStages` composes them, validates the partition and the answer, and
 * returns a trace of every step. Pieces are the 1-based ids of a Sentence's
 * ResolvableText Segments. Nothing here knows a language.
 */
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import type { ArmContext } from "../de/arm.js";
import type { Answer } from "./jev.js";
import { assertValidUnits } from "./validate.js";

/** Groups of piece ids, each sorted, ordered by first piece. */
export type Groups = readonly (readonly number[])[];

/**
 * One proposed connection: the pieces it would put in one unit. A `judged`
 * connection is `supported` when its judgment clears the resolver's floor;
 * a `rule` connection is code's own and always supported.
 */
export type Connection = {
	readonly id: string;
	readonly kind: string;
	/** Sorted piece ids. */
	readonly pieces: readonly number[];
	readonly source: "judged" | "rule";
	/** The question whose answer judged it. */
	readonly question?: string;
	/** The share or Noul the decision read. */
	readonly probability?: number;
	readonly supported: boolean;
};

/** An edge a stage drew between two pieces, and what drew it. */
export type Edge = {
	readonly pieces: readonly [number, number];
	/** The connection it realizes, if any. */
	readonly connection?: string;
	/** For an edge no connection judged: the rule that drew it. */
	readonly rule?: string;
};

export type Nomination<Evidence> = {
	readonly pieces: readonly number[];
	readonly connections: readonly Connection[];
	/** Raw judgments behind the connections, by question id. */
	readonly judgments: Readonly<Record<string, Answer>>;
	/** Whatever else the resolver and routing of this design read. */
	readonly evidence: Evidence;
};

export type Membership<Detail> = {
	readonly partition: Groups;
	/** Every edge the resolver's partition is the union of. */
	readonly edges: readonly Edge[];
	/** The resolver's own reading, for its routing stage. */
	readonly detail: Detail;
};

export type Routed = {
	readonly output: SegmentInUnitsOutput;
	/** The partition the output realizes. */
	readonly partition: Groups;
	/** Edges routing added by merging groups. */
	readonly merges: readonly Edge[];
};

export type Stages<Evidence, Detail> = {
	readonly nominate: (
		input: SegmentInUnitsInput,
		context: ArmContext,
	) => Promise<Nomination<Evidence>>;
	readonly resolve: (nomination: Nomination<Evidence>) => Membership<Detail>;
	readonly route: (
		nomination: Nomination<Evidence>,
		membership: Membership<Detail>,
		context: ArmContext,
	) => Promise<Routed>;
};

/** Everything one case and repetition went through. */
export type StageTrace = {
	readonly connections: readonly Connection[];
	readonly judgments: Readonly<Record<string, Answer>>;
	/** Connections the resolver drew an edge for. */
	readonly selected: readonly string[];
	/** Edges the resolver drew by its own rules. */
	readonly assembly: readonly Edge[];
	readonly resolved: Groups;
	/** Edges routing added. */
	readonly merges: readonly Edge[];
	readonly final: Groups;
};

export function groupsOf(
	pieces: readonly number[],
	edges: Iterable<readonly [number, number]>,
): Groups {
	const parent = new Map(pieces.map((id) => [id, id]));
	const find = (id: number): number => {
		let root = id;
		while (parent.get(root) !== root) root = parent.get(root) ?? root;
		parent.set(id, root);
		return root;
	};
	for (const [left, right] of edges) {
		const a = find(left);
		const b = find(right);
		if (a !== b) parent.set(Math.max(a, b), Math.min(a, b));
	}
	const groups = new Map<number, number[]>();
	for (const id of pieces) {
		const root = find(id);
		groups.set(root, [...(groups.get(root) ?? []), id]);
	}
	return [...groups.values()]
		.map((group) => group.sort((a, b) => a - b))
		.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
}

const key = (groups: Groups) =>
	groups.map((group) => group.join(",")).join("|");

/** Throws unless `groups` holds every piece exactly once. */
export function assertPartition(
	pieces: readonly number[],
	groups: Groups,
): void {
	const seen = new Set<number>();
	for (const group of groups)
		for (const id of group) {
			if (seen.has(id)) throw Error(`Piece ${id} is in two groups`);
			seen.add(id);
		}
	const missing = pieces.filter((id) => !seen.has(id));
	const extra = [...seen].filter((id) => !pieces.includes(id));
	if (missing.length > 0 || extra.length > 0)
		throw Error(
			`Partition misses ${missing.join(",") || "nothing"} and adds ${extra.join(",") || "nothing"}`,
		);
}

/** Runs the three stages on one case and validates every hand-over. */
export async function runStages<Evidence, Detail>(
	stages: Stages<Evidence, Detail>,
	input: SegmentInUnitsInput,
	context: ArmContext,
): Promise<{
	readonly output: SegmentInUnitsOutput;
	readonly trace: StageTrace;
}> {
	const source = input.segments.map(({ text }) => text).join("");
	const nomination = await stages.nominate(input, context);
	const ids = new Set(nomination.pieces);
	for (const connection of nomination.connections)
		if (
			connection.pieces.length < 2 ||
			connection.pieces.some((id) => !ids.has(id))
		)
			throw Error(`Connection ${connection.id} names unknown pieces`);
	const membership = stages.resolve(nomination);
	assertPartition(nomination.pieces, membership.partition);
	if (
		key(groupsOf(nomination.pieces, edgePairs(membership.edges))) !==
		key(membership.partition)
	)
		throw Error("The resolver's edges do not make its partition");
	const routed = await stages.route(nomination, membership, context);
	assertPartition(nomination.pieces, routed.partition);
	if (
		key(
			groupsOf(nomination.pieces, [
				...edgePairs(membership.edges),
				...edgePairs(routed.merges),
			]),
		) !== key(routed.partition)
	)
		throw Error("Routing changed membership beyond its recorded merges");
	assertValidUnits(input, routed.output, source);
	// Piece p is the p-th ResolvableText Segment: the output must be the
	// routed partition, unit for unit.
	const resolvable = input.segments.flatMap(({ kind }, index) =>
		kind === "ResolvableText" ? [index] : [],
	);
	const asSegments = (groups: Groups) =>
		groups
			.map((group) => group.map((id) => resolvable[id - 1]).join(","))
			.sort()
			.join("|");
	if (
		asSegments(routed.partition) !==
		routed.output.units
			.map((unit) => unit.segments.join(","))
			.sort()
			.join("|")
	)
		throw Error("The routed output is not the routed partition");
	const connectionIds = new Set(
		nomination.connections.map((connection) => connection.id),
	);
	for (const edge of membership.edges)
		if (
			edge.connection !== undefined &&
			!connectionIds.has(edge.connection)
		)
			throw Error(`Edge names unknown connection ${edge.connection}`);
	return {
		output: routed.output,
		trace: {
			connections: nomination.connections,
			judgments: nomination.judgments,
			selected: [
				...new Set(
					membership.edges.flatMap((edge) =>
						edge.connection === undefined ? [] : [edge.connection],
					),
				),
			],
			assembly: membership.edges.filter(
				(edge) => edge.connection === undefined,
			),
			resolved: membership.partition,
			merges: routed.merges,
			final: routed.partition,
		},
	};
}

export const edgePairs = (edges: readonly Edge[]) =>
	edges.map((edge) => edge.pieces);
