/**
 * The reference arm's connections (`reference.ts`): every connection the
 * nomination requests judged, with its floors deciding which are
 * supported, and code's rule connections; which of them drew each assembled
 * edge; and the answers behind them.
 */

import { type Answer, choiceOf, noulOf } from "../../../../src/segment/ask.js";
import type { AssembledEdge } from "../../../../src/segment/de/assembly.js";
import {
	fusedSiblings,
	nounLike,
	numberRanges,
	oldSpellingCorrelators,
	sayingSpans,
	superlativeLinks,
} from "../../../../src/segment/de/candidates.js";
import {
	correlatorId,
	expressionId,
	type Nomination,
	pairId,
	reaskedIdiomId,
	sayingChoiceId,
	slotId,
} from "../../../../src/segment/de/nomination.js";
import { argmaxBesideNone } from "../../../../src/segment/de/partition.js";
import type { Connection, Edge } from "../../harness/stages.js";
import type { ReferenceFloors } from "./reference.js";

const sorted = (ids: readonly number[]) => [...ids].sort((a, b) => a - b);
const pairKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`;

/** Host options of a Choice: the `p<id>` keys, with the `none` share. */
function hostShares(answer: Extract<Answer, { type: "choice" }>) {
	const hosts = Object.entries(answer.probabilities).filter(
		([key]) => key !== "none",
	);
	return {
		hosts,
		top: argmaxBesideNone(answer.probabilities),
		none: answer.probabilities.none ?? 0,
	};
}

/**
 * Every connection the nomination requests judged, with the floors
 * deciding `supported`, and code's rule connections.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function referenceConnections(
	nomination: Nomination,
	floors: ReferenceFloors,
): Connection[] {
	const { sentence, first, final, inventory } = nomination;
	const connections: Connection[] = [];
	const reasked = new Set(
		Object.keys(final)
			.filter((id) => id.startsWith("s4_idiom_"))
			.map((id) => Number(id.slice(9))),
	);
	const hostConnections = (
		kind: string,
		piece: number,
		question: string,
		answer: Extract<Answer, { type: "choice" }>,
		floor: number,
		margin: number,
	) => {
		const { hosts, top, none } = hostShares(answer);
		for (const [key, share] of hosts) {
			const host = Number(key.slice(1));
			connections.push({
				id: `${question}>${key}`,
				kind,
				pieces: sorted([piece, host]),
				source: "judged",
				question,
				probability: share,
				supported:
					key === top?.key && share > none + margin && share >= floor,
			});
		}
	};
	for (const slot of nomination.slots) {
		if (slot.kind === "idiom" && reasked.has(slot.piece.id)) continue;
		const question = slotId(slot);
		const idiom = slot.kind === "idiom";
		hostConnections(
			slot.kind,
			slot.piece.id,
			question,
			choiceOf(first, question),
			idiom ? floors.idiom : floors.satellite,
			idiom ? 0 : floors.margin,
		);
	}
	for (const id of reasked) {
		const question = reaskedIdiomId(id);
		hostConnections(
			"idiom",
			id,
			question,
			choiceOf(final, question),
			floors.idiom,
			0,
		);
	}
	for (const pair of nomination.pairs) {
		const question = pairId(pair);
		const probability = noulOf(first, question);
		const pieces =
			pair.kind === "name"
				? sentence.pieces
						.filter(
							(piece) =>
								piece.id >= pair.left.id &&
								piece.id <= pair.right.id,
						)
						.map((piece) => piece.id)
				: [pair.left.id, pair.right.id];
		connections.push({
			id: question,
			kind: pair.kind,
			pieces,
			source: "judged",
			question,
			probability,
			supported: probability >= 0.5,
		});
	}
	for (const pair of oldSpellingCorrelators(sentence)) {
		const question = correlatorId(pair);
		const probability = noulOf(final, question);
		connections.push({
			id: question,
			kind: "correlator",
			pieces: [pair.left.id, pair.right.id],
			source: "judged",
			question,
			probability,
			supported: probability >= 0.5,
		});
	}
	for (const link of nomination.links) {
		const question = expressionId(link.left, link.right);
		connections.push({
			id: question,
			kind: "expression",
			pieces: [link.left, link.right],
			source: "judged",
			question,
			probability: link.probability,
			supported:
				link.probability >= floors.expression &&
				(nomination.fixed.get(link.left) ?? 0) >= floors.fixed &&
				(nomination.fixed.get(link.right) ?? 0) >= floors.fixed,
		});
	}
	for (const span of sayingSpans(sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		const question = sayingChoiceId(ids);
		const { probabilities } = choiceOf(final, question);
		const score =
			(probabilities.whole ?? 0) + (probabilities.fragment ?? 0);
		connections.push({
			id: question,
			kind: "saying",
			pieces: ids,
			source: "judged",
			question,
			probability: score,
			supported:
				score >= floors.saying && score > (probabilities.plus ?? 0),
		});
	}
	const rule = (
		kind: string,
		pieces: readonly number[],
		conditional = false,
	) =>
		connections.push({
			id: `${kind}_${pieces.join("_")}`,
			kind,
			pieces: sorted(pieces),
			source: "rule",
			...(conditional ? { conditional } : {}),
			supported: !conditional,
		});
	for (const range of numberRanges(sentence)) rule("range", range);
	for (const link of superlativeLinks(sentence)) rule("superlative", link);
	const runs = new Set(
		[...fusedSiblings(sentence).values()].map((run) => run.join("_")),
	);
	for (const run of runs) rule("sibling", run.split("_").map(Number), true);
	// The preposition opening a noun's phrase, before the noun or before any
	// article that may head to it: absorbed when the noun joins an expression.
	const articleSlots = nomination.slots.filter(
		(slot) => slot.kind === "article",
	);
	const prepositions = new Set<string>();
	for (const piece of sentence.pieces) {
		if (!nounLike(piece)) continue;
		const starts = [
			piece.id,
			...articleSlots
				.filter(
					(slot) =>
						slot.piece.id < piece.id &&
						slot.hosts.some((host) => host.id === piece.id),
				)
				.map((slot) => slot.piece.id),
		];
		for (const start of starts) {
			const before = sentence.pieces[start - 2];
			if (
				before &&
				before.clause === piece.clause &&
				inventory.isAdposition(before.surface)
			)
				prepositions.add(`${before.id}_${piece.id}`);
		}
	}
	for (const entry of prepositions)
		rule("preposition", entry.split("_").map(Number), true);
	return connections;
}

/** Which connection, or which rule, drew each assembled edge. */
export function edgesOf(
	assembled: readonly AssembledEdge[],
	connections: readonly Connection[],
	ranges: readonly (readonly number[])[],
): Edge[] {
	const byId = new Map(connections.map((entry) => [entry.id, entry]));
	const covering = (kinds: ReadonlySet<string>, a: number, b: number) =>
		connections.find(
			(entry) =>
				kinds.has(entry.kind) &&
				entry.pieces.includes(a) &&
				entry.pieces.includes(b),
		);
	const pairKinds = new Set([
		"split-adverb",
		"correlator",
		"circumposition",
		"name",
	]);
	const rangeOf = (a: number, b: number) =>
		ranges.find((range) => range.includes(a) && range.includes(b));
	return assembled.map(({ pieces, source }): Edge => {
		const [a, b] = pieces;
		const judged = (entry: Connection | undefined): Edge => {
			if (!entry)
				throw Error(`No connection drew the ${source} edge ${a}–${b}`);
			return { pieces, connection: entry.id };
		};
		switch (source) {
			case "satellite": {
				const entry = connections.find(
					(candidate) =>
						candidate.source === "judged" &&
						candidate.id.startsWith(`s_`) &&
						candidate.id.endsWith(`_${a}>p${b}`) &&
						candidate.kind !== "idiom",
				);
				return judged(entry);
			}
			case "pair": {
				const exact = connections.find(
					(entry) =>
						pairKinds.has(entry.kind) &&
						entry.source === "judged" &&
						pairKey(
							entry.pieces[0] ?? 0,
							entry.pieces.at(-1) ?? 0,
						) === pairKey(a, b),
				);
				return judged(exact ?? covering(pairKinds, a, b));
			}
			case "expression": {
				const range = rangeOf(a, b);
				if (range)
					return {
						pieces,
						rule: "range",
						connection: `range_${range.join("_")}`,
					};
				const entry =
					byId.get(`s4_idiom_${a}>p${b}`) ??
					byId.get(`s_idiom_${a}>p${b}`) ??
					byId.get(`e_${Math.min(a, b)}_${Math.max(a, b)}`);
				return judged(entry);
			}
			case "saying":
				return judged(covering(new Set(["saying"]), a, b));
			case "superlative":
				return {
					pieces,
					rule: "superlative",
					connection: `superlative_${a}_${b}`,
				};
			case "sibling": {
				const entry = covering(new Set(["sibling"]), a, b);
				return {
					pieces,
					rule: "sibling",
					...(entry ? { connection: entry.id } : {}),
				};
			}
			case "preposition": {
				const id = `preposition_${Math.min(a, b)}_${Math.max(a, b)}`;
				return {
					pieces,
					rule: "preposition",
					...(byId.has(id) ? { connection: id } : {}),
				};
			}
			case "rule":
			case "locution":
			case "verb":
			case "government":
				// The reference applies no code rule (#851, X3) and asks no Locution Choice (X5), Verb Choice (D4) or Government Choice (X4).
				return { pieces, rule: "code" };
		}
		throw Error(`Unknown edge source ${String(source satisfies never)}`);
	});
}

/** The answers behind the connections, and every fixedness Noul. */
export function judgmentsOf(
	nomination: Nomination,
	connections: readonly Connection[],
): Record<string, Answer> {
	const asked = new Set(
		connections.flatMap((entry) =>
			entry.question ? [entry.question] : [],
		),
	);
	const judgments: Record<string, Answer> = {};
	for (const answers of [
		nomination.first,
		nomination.second,
		nomination.final,
	])
		for (const [id, answer] of Object.entries(answers))
			if (asked.has(id) || id.startsWith("f_")) judgments[id] = answer;
	return judgments;
}
