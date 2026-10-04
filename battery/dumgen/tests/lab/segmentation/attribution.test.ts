import { expect, test } from "bun:test";
import {
	attributeRepetition,
	nominatedFor,
	unitCause,
} from "../../../lab/segmentation/harness/attribution.js";
import type {
	Connection,
	Edge,
	StageTrace,
} from "../../../lab/segmentation/harness/stages.js";

const judged = (
	id: string,
	pieces: number[],
	supported: boolean,
): Connection => ({ id, kind: "test", pieces, source: "judged", supported });
const absorb = (id: string, pieces: number[]): Connection => ({
	id,
	kind: "sibling",
	pieces,
	source: "rule",
	conditional: true,
	supported: false,
});

function trace(args: {
	readonly connections: readonly Connection[];
	readonly final: readonly (readonly number[])[];
	readonly edges?: readonly Edge[];
	readonly merges?: readonly Edge[];
}): StageTrace {
	return {
		connections: args.connections,
		judgments: {},
		selected: [],
		edges: args.edges ?? [],
		assembly: [],
		resolved: args.final,
		merges: args.merges ?? [],
		final: args.final,
	};
}

// Gold unit: pieces 2, 3, 4 ("zu", "m", "Beispiel").
const gold = [2, 3, 4];

test("a right unit has no cause", () => {
	const repetition = attributeRepetition(
		gold,
		trace({ connections: [], final: [[1], [2, 3, 4], [5]] }),
	);
	expect(repetition).toMatchObject({ correct: true });
	expect(repetition.cause).toBeUndefined();
});

test("split with no inside connection making the unit: not nominated", () => {
	const repetition = attributeRepetition(
		gold,
		trace({
			connections: [
				judged("a", [2, 3], false),
				judged("x", [4, 5], true),
			],
			final: [[1], [2], [3], [4, 5]],
		}),
	);
	expect(repetition).toMatchObject({ split: true, cause: "not nominated" });
});

test("a connection crossing the boundary does not make the gold arrangement available", () => {
	expect(
		nominatedFor(gold, [
			judged("a", [2, 3], true),
			judged("b", [3, 4, 5], true),
		]),
	).toBe(false);
});

test("absorption alone nominates nothing; beside a judged connection it counts", () => {
	expect(nominatedFor(gold, [absorb("s", [2, 3])])).toBe(false);
	expect(
		nominatedFor(gold, [absorb("s", [2, 3]), judged("e", [3, 4], false)]),
	).toBe(true);
});

test("nominated but its judgment fell under the floor: rejected", () => {
	const repetition = attributeRepetition(
		gold,
		trace({
			connections: [absorb("s", [2, 3]), judged("e", [3, 4], false)],
			final: [[1], [2], [3], [4], [5]],
		}),
	);
	expect(repetition.cause).toBe("rejected");
});

test("supported but not drawn: assembly", () => {
	const repetition = attributeRepetition(
		gold,
		trace({
			connections: [absorb("s", [2, 3]), judged("e", [3, 4], true)],
			final: [[1], [2, 3], [4], [5]],
		}),
	);
	expect(repetition.cause).toBe("assembly");
});

test("enlarged by a judged connection: accepted; by a rule or a merge: assembly", () => {
	const connections = [judged("e", [2, 4], true), judged("x", [4, 5], true)];
	const edges: Edge[] = [
		{ pieces: [2, 4], connection: "e" },
		{ pieces: [3, 4], rule: "sibling" },
	];
	expect(
		attributeRepetition(
			gold,
			trace({
				connections,
				edges: [...edges, { pieces: [4, 5], connection: "x" }],
				final: [[1], [2, 3, 4, 5]],
			}),
		).cause,
	).toBe("accepted");
	expect(
		attributeRepetition(
			gold,
			trace({
				connections,
				edges,
				merges: [{ pieces: [4, 5], rule: "interjection" }],
				final: [[1], [2, 3, 4, 5]],
			}),
		).cause,
	).toBe("assembly");
});

test("split and enlarged for different reasons: ambiguous", () => {
	const repetition = attributeRepetition(
		gold,
		trace({
			connections: [
				judged("e", [3, 4], false),
				judged("x", [4, 5], true),
			],
			edges: [{ pieces: [4, 5], connection: "x" }],
			final: [[1], [2], [3], [4, 5]],
		}),
	);
	expect(repetition).toMatchObject({
		split: true,
		enlarged: true,
		cause: "ambiguous",
	});
});

test("a unit's cause is its wrong repetitions' majority, a tie ambiguous", () => {
	const wrong = (cause: "rejected" | "assembly") => ({
		correct: false,
		split: true,
		enlarged: false,
		cause,
		groups: [],
	});
	const right = { correct: true, split: false, enlarged: false, groups: [] };
	expect(
		unitCause([wrong("rejected"), wrong("rejected"), wrong("assembly")]),
	).toBe("rejected");
	expect(unitCause([wrong("rejected"), wrong("assembly"), right])).toBe(
		"ambiguous",
	);
	expect(unitCause([right, right, right])).toBeUndefined();
});
