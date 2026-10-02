/**
 * Membership, the unit stage's second step: code turns the nominated
 * judgments into a partition of the pieces under floors, with no request
 * of its own. Satellites (an article, particle, auxiliary, reflexive,
 * expletive es or governed preposition) join their host; idiom hosts,
 * expression pairs, number ranges and Saying spans make multiword units;
 * inside one, the other pieces of a split word and the preposition opening
 * a member noun's phrase are absorbed. The Family comes from how a unit was
 * built: a Saying span makes a Saying, an expression link a Locution.
 *
 * Step 0 adds the rules candidates4 found missing: a symbol takes no
 * article, number `Komma`/`bis` number is one Locution, a re-asked idiom
 * host replaces the first answer, and `so … daß` joins.
 */
import { type Answers, choiceOf } from "../ask.js";
import {
	fusedSiblings,
	isSymbolPiece,
	nounLike,
	numberRanges,
	type PairCandidate,
	sayingSpans,
	superlativeLinks,
} from "./candidates.js";
import {
	type Nomination,
	oneSatellitePerHost,
	reaskedIdiomId,
	sayingChoiceId,
	selectedSayings,
	slotLinks,
} from "./nomination.js";
import { argmax, groupKey, type Partition, partitionOf } from "./partition.js";

export type Family = "Lexeme" | "Locution" | "Saying";

/** Where membership turns a judgment into a link. */
export type Floors = {
	/** A satellite's top host share (article, particle, auxiliary, reflexive, expletive es, governed preposition). */
	readonly satellite: number;
	/** How far a satellite's top host share must exceed `none`'s. */
	readonly margin: number;
	/** An idiom host's share, the first and the re-asked one. */
	readonly idiom: number;
	/** An expression pair's Noul. */
	readonly expression: number;
	/** The fixedness Noul both pieces of an expression pair need. */
	readonly fixed: number;
};

/**
 * Which Saying spans become Saying units: a span counts when its whole and
 * fragment shares, and with `maxim` its general-maxim share, add up to the
 * floor and beat its saying-plus-other-words share. The most probable span
 * wins an overlap.
 */
export type SayingAssembly = {
	readonly floor: number;
	readonly maxim: boolean;
};

/** One of candidates v3's named assembly policies. */
export type Policy = {
	readonly satellite: number;
	readonly idiom: number | null;
	readonly expression: number | null;
	/** The floor of the v3 Saying Noul. */
	readonly saying: number | null;
	readonly absorb: boolean;
	/** The fixedness both pieces of an expression pair need; 0.5 unless set. */
	readonly fixed?: number;
};

/**
 * Candidates v3's policies. Production assembles under its own floors; the
 * route requests still cover every group these build, as the lab's batches
 * did, so cached answers replay.
 */
export const v3Policies: Readonly<Record<string, Policy>> = {
	sat: {
		satellite: 0.5,
		idiom: null,
		expression: null,
		saying: null,
		absorb: false,
	},
	"sat+idiom": {
		satellite: 0.5,
		idiom: 0.5,
		expression: null,
		saying: null,
		absorb: true,
	},
	"sat+idiom+expr": {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: null,
		absorb: true,
	},
	full: {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: 0.5,
		absorb: true,
	},
	"full-noabsorb": {
		satellite: 0.5,
		idiom: 0.5,
		expression: 0.5,
		saying: 0.5,
		absorb: false,
	},
	"full@0.7": {
		satellite: 0.5,
		idiom: 0.7,
		expression: 0.7,
		saying: 0.7,
		absorb: true,
	},
	"full@0.3": {
		satellite: 0.5,
		idiom: 0.3,
		expression: 0.5,
		saying: 0.3,
		absorb: true,
	},
};

export const full07 = v3Policies["full@0.7"] as Policy;

/** Everything one assembly links; each edge list is already thresholded. */
export type AssemblyInput = {
	/** Satellite links (article, particle, auxiliary, …): Lexeme structure. */
	readonly satellites: readonly (readonly [number, number])[];
	/** Accepted code-proposed pairs; correlators and circumpositions mark a Locution. */
	readonly accepted: Nomination["accepted"];
	/** Expression links (idiom hosts, expression pairs, number ranges): Locution. */
	readonly expression: readonly (readonly [number, number])[];
	/** Saying spans, each a list of piece ids. */
	readonly sayings: readonly (readonly number[])[];
	readonly absorb: boolean;
};

/** Where an assembled edge came from. */
type EdgeSource =
	| "satellite"
	| "pair"
	| "superlative"
	| "expression"
	| "saying"
	| "sibling"
	| "preposition"
	/** A code rule's link (`code-rules.ts`). */
	| "rule";

export type AssembledEdge = {
	readonly pieces: readonly [number, number];
	readonly source: EdgeSource;
};

export type Assembly = {
	readonly partition: Partition;
	readonly familyOf: (group: readonly number[]) => Family;
	/** Every edge, with where it came from; the partition is their union. */
	readonly edges: readonly AssembledEdge[];
};

/**
 * Connected components of every link, with fused siblings and a member
 * noun's opening preposition absorbed into expressions, and the Family each
 * group was built as.
 */
export function assemble(
	nomination: Pick<Nomination, "sentence" | "inventory">,
	articleOf: ReadonlyMap<number, number>,
	input: AssemblyInput,
): Assembly {
	const { sentence, inventory } = nomination;
	const ids = sentence.pieces.map((piece) => piece.id);
	const siblings = fusedSiblings(sentence);
	const tagged: AssembledEdge[] = [
		...input.satellites.map(
			([a, b]) => ({ pieces: [a, b], source: "satellite" }) as const,
		),
		...input.accepted.map(
			([a, b]) => ({ pieces: [a, b], source: "pair" }) as const,
		),
		...superlativeLinks(sentence).map(
			([a, b]) => ({ pieces: [a, b], source: "superlative" }) as const,
		),
		...input.expression.map(
			([a, b]) => ({ pieces: [a, b], source: "expression" }) as const,
		),
	];
	const locutionPieces = new Set<number>();
	for (const [left, right, kind] of input.accepted)
		if (kind === "correlator" || kind === "circumposition") {
			locutionPieces.add(left);
			locutionPieces.add(right);
		}
	const sayingPieces = new Set<number>();
	const expression: (readonly [number, number])[] = [...input.expression];
	for (const span of input.sayings)
		for (const id of span) {
			sayingPieces.add(id);
			expression.push([span[0] ?? id, id]);
			tagged.push({ pieces: [span[0] ?? id, id], source: "saying" });
		}
	if (input.absorb) {
		const members = new Set(expression.flat());
		for (const id of [...members]) {
			for (const sibling of siblings.get(id) ?? []) {
				expression.push([id, sibling]);
				tagged.push({ pieces: [id, sibling], source: "sibling" });
			}
			const piece = sentence.pieces[id - 1];
			if (!piece || !nounLike(piece)) continue;
			const start = Math.min(articleOf.get(id) ?? id, id);
			const before = sentence.pieces[start - 2];
			if (
				before &&
				before.clause === piece.clause &&
				inventory.isAdposition(before.surface)
			) {
				expression.push([id, before.id]);
				tagged.push({ pieces: [id, before.id], source: "preposition" });
				for (const sibling of siblings.get(before.id) ?? []) {
					expression.push([id, sibling]);
					tagged.push({ pieces: [id, sibling], source: "sibling" });
				}
			}
		}
	}
	for (const id of expression.flat()) locutionPieces.add(id);
	return {
		edges: tagged,
		partition: partitionOf(
			ids,
			tagged.map(({ pieces }) => pieces),
		),
		familyOf: (group) =>
			group.length === 1
				? "Lexeme"
				: group.some((id) => sayingPieces.has(id))
					? "Saying"
					: group.some((id) => locutionPieces.has(id))
						? "Locution"
						: "Lexeme",
	};
}

/** Candidates v3's assembly input for one of its policies. */
export function policyInput(
	nomination: Nomination,
	policy: Policy,
): AssemblyInput {
	const expression: (readonly [number, number])[] = [];
	if (policy.idiom !== null) {
		const floor = policy.idiom;
		for (const link of nomination.slotAnswers)
			if (link.kind === "idiom" && link.share >= floor)
				expression.push([link.from, link.to]);
	}
	const fixed = policy.fixed ?? 0.5;
	if (policy.expression !== null)
		for (const link of nomination.links)
			if (
				link.probability >= policy.expression &&
				(nomination.fixed.get(link.left) ?? 0) >= fixed &&
				(nomination.fixed.get(link.right) ?? 0) >= fixed
			)
				expression.push([link.left, link.right]);
	return {
		satellites: nomination.slotAnswers
			.filter(
				(link) =>
					link.kind !== "idiom" && link.share >= policy.satellite,
			)
			.map((link) => [link.from, link.to] as const),
		accepted: nomination.accepted,
		expression,
		sayings:
			policy.saying === null
				? []
				: selectedSayings(nomination, policy.saying),
		absorb: policy.absorb,
	};
}

/** Each article's noun, from the article slots' links. */
export const articleHosts = (nomination: Pick<Nomination, "slotAnswers">) =>
	new Map(
		nomination.slotAnswers
			.filter((link) => link.kind === "article")
			.map((link) => [link.to, link.from]),
	);

/** The nomination as a satellite margin reads it: its satellite hosts re-read. */
function underMargin(nomination: Nomination, margin: number): Nomination {
	if (margin === 0) return nomination;
	return {
		...nomination,
		slotAnswers: oneSatellitePerHost(
			slotLinks(nomination.slots, nomination.first, margin),
		),
	};
}

/** An assembly input with step 0 applied over it, and the number ranges it joined. */
export function stepZeroInput(
	nomination: Nomination,
	base: AssemblyInput,
	idiomFloor: number,
): { input: AssemblyInput; ranges: (readonly number[])[] } {
	const { sentence, final: answers } = nomination;
	const ranges = numberRanges(sentence);
	const inRange = new Set(ranges.flat());
	const symbol = (id: number) => {
		const piece = sentence.pieces[id - 1];
		return piece !== undefined && isSymbolPiece(piece);
	};
	const articleLinks = new Set(
		nomination.slotAnswers
			.filter((link) => link.kind === "article")
			.map((link) => `${link.from}>${link.to}`),
	);
	const satellites = base.satellites.filter(
		([from, to]) =>
			!inRange.has(from) &&
			!inRange.has(to) &&
			!(articleLinks.has(`${from}>${to}`) && symbol(to)),
	);
	// Idiom links: a re-asked slot replaces the first answer for that noun.
	const reasked = new Set(
		Object.keys(answers)
			.filter((id) => id.startsWith("s4_idiom_"))
			.map((id) => Number(id.slice(9))),
	);
	const idiomLinks = new Set(
		nomination.slotAnswers
			.filter((link) => link.kind === "idiom")
			.map((link) => `${link.from}>${link.to}`),
	);
	const expression = base.expression.filter(
		([from, to]) => !(reasked.has(from) && idiomLinks.has(`${from}>${to}`)),
	);
	for (const id of reasked) {
		const answer = choiceOf(answers, reaskedIdiomId(id));
		const hosts = Object.fromEntries(
			Object.entries(answer.probabilities).filter(
				([key]) => key !== "none",
			),
		);
		const top = argmax(hosts);
		if (
			top.key &&
			top.share > (answer.probabilities.none ?? 0) &&
			top.share >= idiomFloor
		)
			expression.push([id, Number(top.key.slice(1))]);
	}
	for (const range of ranges)
		for (const id of range.slice(1)) expression.push([range[0] ?? id, id]);
	const accepted: (readonly [number, number, PairCandidate["kind"]])[] = [
		...base.accepted,
	];
	for (const [id, answer] of Object.entries(answers))
		if (
			id.startsWith("c4_") &&
			answer.type === "noul" &&
			answer.noul >= 0.5
		) {
			const [, left, right] = id.split("_").map(Number);
			if (left && right) accepted.push([left, right, "correlator"]);
		}
	return { input: { ...base, satellites, expression, accepted }, ranges };
}

/** The Saying spans the Saying Choice makes Sayings under `saying`, disjoint. */
export function sayingsOf(
	nomination: Pick<Nomination, "sentence" | "final">,
	saying: SayingAssembly,
): number[][] {
	const answers: Answers = nomination.final;
	const scored = sayingSpans(nomination.sentence)
		.map((span) => {
			const ids = span.pieces.map((piece) => piece.id);
			const answer = answers[sayingChoiceId(ids)];
			const probabilities =
				answer?.type === "choice" ? answer.probabilities : {};
			const score =
				(probabilities.whole ?? 0) +
				(probabilities.fragment ?? 0) +
				(saying.maxim ? (probabilities.maxim ?? 0) : 0);
			return { ids, score, plus: probabilities.plus ?? 0 };
		})
		.filter(({ score, plus }) => score >= saying.floor && score > plus)
		.sort((a, b) => b.score - a.score || a.ids.length - b.ids.length);
	const used = new Set<number>();
	const chosen: number[][] = [];
	for (const { ids } of scored) {
		if (ids.some((id) => used.has(id))) continue;
		for (const id of ids) used.add(id);
		chosen.push(ids);
	}
	return chosen;
}

/** A partition of the pieces, each group's Family, and every edge behind it. */
export type Membership = Assembly & {
	/** The number ranges step 0 joined; each is a Locution. */
	readonly ranges: readonly (readonly number[])[];
};

/** The assembly of step 0 plus a Saying assembly, with number ranges as Locutions. */
export function stepZeroMembership(
	nomination: Nomination,
	input: AssemblyInput,
	ranges: readonly (readonly number[])[],
	saying: SayingAssembly | undefined,
): Membership {
	const built = assemble(nomination, articleHosts(nomination), {
		...input,
		...(saying ? { sayings: sayingsOf(nomination, saying) } : {}),
	});
	const rangeKeys = new Set(ranges.map((range) => groupKey(range)));
	return {
		...built,
		familyOf: (group) =>
			rangeKeys.has(groupKey(group)) ? "Locution" : built.familyOf(group),
		ranges,
	};
}

/** Membership under floors and a Saying assembly: step 0 over v3, Sayings from the Choice. */
export function membershipOf(
	nomination: Nomination,
	floors: Floors,
	saying: SayingAssembly,
): Membership {
	const read = underMargin(nomination, floors.margin);
	const { input, ranges } = stepZeroInput(
		read,
		policyInput(read, {
			...full07,
			satellite: floors.satellite,
			idiom: floors.idiom,
			expression: floors.expression,
			fixed: floors.fixed,
		}),
		floors.idiom,
	);
	return stepZeroMembership(read, input, ranges, saying);
}
