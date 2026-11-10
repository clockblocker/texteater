import type * as Result from "effect/Result";
import type { Judged } from "../canonical-form.js";
import type { MemberOrthography } from "../member-spelling.js";
import {
	type Answered,
	answerReader,
	Questionnaire,
	type ReaderBody,
} from "../questions.js";
import type { Target } from "../target.js";
import {
	type AdpositionPlan,
	askAdposition,
	readAdposition,
} from "./adposition.js";
import {
	type AdverbialPlan,
	askAdverbial,
	readAdverbial,
} from "./adverbial.js";
import { type AgreeingPlan, askAgreeing, readAgreeing } from "./agreeing.js";
import {
	askHead,
	askTail,
	type HeadPlan,
	readHead,
	readTail,
	type Spelling,
	type SurfaceFeatures,
	type TailCore,
	type TailPlan,
} from "./common.js";
import { adverbReadings, type GovernedMember } from "./governed.js";
import {
	askNominal,
	type NominalPlan,
	type OpeningArticle,
	openingArticle,
	readNominal,
} from "./nominal.js";
import {
	type AdpCase,
	routeShape,
	type Shape,
	type ValencyEvidence,
} from "./shape.js";
import {
	askVerbal,
	readVerbal,
	type VerbalPlan,
	verbalSatellites,
} from "./verbal.js";

/** Everything the first request asks, and what code fixed before it. */
export type Plan = HeadPlan & {
	readonly questionnaire: Questionnaire;
	readonly shape: Shape;
	readonly article: OpeningArticle | undefined;
	readonly verbal: VerbalPlan | undefined;
	readonly nominal: NominalPlan | undefined;
	readonly adverbial: AdverbialPlan | undefined;
	readonly agreeing: AgreeingPlan | undefined;
	readonly adposition: AdpositionPlan | undefined;
	readonly tail: TailPlan;
};

/**
 * The first request: the common head, the block of the route's shape, and
 * the common tail, in that order, which is part of what jev sees and of
 * the answer cache's key. The satellites (auxiliaries, reflexive, subject
 * es, article) are found first, so neither the prefix nor a governed
 * preposition is looked for among them.
 */
export function plan(target: Target): Plan {
	const shape = routeShape(target);
	const questionnaire = new Questionnaire();
	const article = openingArticle(target, shape);
	const satellites = verbalSatellites(target, shape);
	const head = askHead(
		questionnaire,
		target,
		shape,
		article,
		satellites.expletive,
	);
	const taken = new Set(
		[
			...satellites.auxiliaries.map(({ member }) => member),
			...(satellites.reflexive ? [satellites.reflexive] : []),
			...(satellites.reflexivePreposition
				? [satellites.reflexivePreposition.member]
				: []),
			...satellites.expletives,
			...(article ? [article.member] : []),
		].map(({ position }) => position),
	);
	const verbal = shape.verbal
		? askVerbal(questionnaire, target, shape, satellites, taken)
		: undefined;
	const nominal = shape.nounLike
		? askNominal(questionnaire, target, shape, article)
		: undefined;
	const adverbial =
		shape.adjectival || shape.adverbial
			? askAdverbial(questionnaire, target, shape)
			: undefined;
	const agreeing = shape.agreeing
		? askAgreeing(questionnaire, target)
		: undefined;
	const adposition = shape.adposition
		? askAdposition(questionnaire, target, shape)
		: undefined;
	const tail = askTail(questionnaire, target, shape, taken);
	questionnaire.cite("identity");
	return {
		...head,
		questionnaire,
		shape,
		article,
		verbal,
		nominal,
		adverbial,
		agreeing,
		adposition,
		tail,
	};
}

/** What a block's reading holds when no deciding answer stops the click. */
type Read<
	Reader extends (...args: never[]) => Result.Result<unknown, unknown>,
> = Result.Result.Success<ReturnType<Reader>>;

/**
 * What the block of a route's shape settles, by block: its Core Features
 * and inflection, typed as the block's routes take them, and its extras.
 * A shape with no block has no Core Features.
 */
type ShapeRead =
	| ({ readonly block: "verbal" } & Read<typeof readVerbal>)
	| ({ readonly block: "nominal" } & Read<typeof readNominal>)
	| ({ readonly block: "adverbial" } & Read<typeof readAdverbial>)
	| ({ readonly block: "agreeing" } & Read<typeof readAgreeing>)
	| {
			readonly block: "adposition";
			readonly core: Record<string, never>;
			readonly inflection: null | undefined;
			readonly realizedCase: AdpCase | "None";
	  }
	| {
			readonly block: "none";
			readonly core: Record<string, never>;
			readonly inflection: null | undefined;
	  };

/** What the first request settled, and what is still open. */
export type FirstRead = ShapeRead & {
	/** The Core Feature the tail settled, beside the block's. */
	readonly tailCore: TailCore;
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Spelling;
	readonly surfaceFeatures: SurfaceFeatures;
	readonly coverage: "Full" | "Partial";
	/** The readings the head and the block fixed. */
	readonly readings: ReadonlyMap<number, string>;
	readonly governed: readonly ValencyEvidence[];
	readonly governedMembers: readonly GovernedMember[];
};

/** Reads the block of the route's shape; a shape with none has no Core Features. */
const readShape = answerReader(function* (
	target: Target,
	planned: Plan,
	answered: Answered,
	cited: boolean,
): ReaderBody<ShapeRead> {
	const { shape } = planned;
	if (planned.verbal)
		return {
			block: "verbal",
			...(yield* readVerbal(
				target,
				planned.verbal,
				shape,
				planned.tail.governable,
				answered,
				cited,
			)),
		};
	if (planned.nominal)
		return {
			block: "nominal",
			...(yield* readNominal(
				shape,
				planned.article,
				planned.nominal,
				answered,
				cited,
			)),
		};
	if (planned.adverbial)
		return {
			block: "adverbial",
			...(yield* readAdverbial(planned.adverbial, answered)),
		};
	if (planned.agreeing)
		return {
			block: "agreeing",
			...(yield* readAgreeing(planned.agreeing, answered)),
		};
	const inflection = shape.inflects ? null : undefined;
	if (planned.adposition)
		return {
			block: "adposition",
			core: {},
			inflection,
			realizedCase: yield* readAdposition(planned.adposition, answered),
		};
	return { block: "none", core: {}, inflection };
});

/** Reads the first request's answers; an Unresolved deciding answer stops it. */
export const readFirst = answerReader(function* (
	target: Target,
	planned: Plan,
	answered: Answered,
): ReaderBody<FirstRead> {
	const head = yield* readHead(
		target,
		planned.article,
		planned,
		planned.adverbial?.indefinite,
		answered,
	);
	const read = yield* readShape(target, planned, answered, head.cited);
	const verbal = read.block === "verbal" ? read : undefined;
	const reflexive = verbal?.reflexive;
	const tail = yield* readTail(
		planned.tail,
		planned.shape,
		answered,
		verbal?.expletive,
		head.cited,
	);
	return {
		...read,
		tailCore: tail.core,
		orthographies: head.orthographies,
		spelling: head.spelling,
		surfaceFeatures: head.surfaceFeatures,
		coverage: tail.coverage,
		readings: new Map([
			...head.readings,
			...(verbal?.readings ?? []),
			...adverbReadings(tail.governedMembers),
		]),
		// The evidence in member order, then the free adverbs', as gold has it.
		governed: [
			...[...(reflexive ? [reflexive] : []), ...tail.governed].sort(
				(left, right) => (left.member ?? 0) - (right.member ?? 0),
			),
			...tail.free,
		],
		governedMembers: tail.governedMembers,
	};
});

/**
 * What Luna reads once jev has judged: the members' orthographies, the
 * judged features, the members outside the headword, the auxiliaries
 * judged as such, and the readings.
 */
export function judgedOf(
	planned: Plan,
	first: FirstRead,
	answered: Answered,
	outsideHeadword: ReadonlySet<number>,
): Judged {
	return {
		orthographies: first.orthographies,
		features: {
			...first.core,
			...first.tailCore,
			...(first.inflection ? { inflection: first.inflection } : {}),
		},
		outsideHeadword,
		auxiliaries: new Set(
			(planned.verbal?.auxiliaries ?? []).flatMap(
				({ member, use: asked }) => {
					const use = answered.peek(asked);
					return use === undefined || use === "Main"
						? []
						: [member.position];
				},
			),
		),
		readings: first.readings,
	};
}
