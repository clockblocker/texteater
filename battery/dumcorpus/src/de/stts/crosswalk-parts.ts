/** The helpers the German STTS crosswalk rows are written with. */
import type * as Dumling from "dumling/types";
import type {
	SttsBecomes,
	SttsGap,
	SttsRoute,
	SttsShowing,
	SttsStatus,
} from "./types.js";

type DeRoute<F extends Dumling.Family<"de">> = Extract<
	SttsRoute,
	{ family: F }
>;

/** A German Lexeme route of `kind`. */
export const lexeme = (
	kind: Dumling.Kind<"de", "Lexeme">,
): DeRoute<"Lexeme"> => ({
	family: "Lexeme",
	kind,
});
/** A German Locution route of `kind`. */
export const locution = (
	kind: Dumling.Kind<"de", "Locution">,
): DeRoute<"Locution"> => ({
	family: "Locution",
	kind,
});
/** The token is the whole target, alone. */
export const alone = (route: SttsRoute): SttsBecomes => ({
	role: "Target",
	route,
});
/** The token's word is the target, whose Head may own other members. */
export const head = (route: SttsRoute): SttsBecomes => ({
	role: "Target",
	route,
	satellites: true,
});
export const member = (route: SttsRoute): SttsBecomes => ({
	role: "Member",
	route,
});
export const reflexive = (route: SttsRoute): SttsBecomes => ({
	role: "Reflexive",
	route,
});
export const component = (route: SttsRoute): SttsBecomes => ({
	role: "Component",
	route,
});
export const show = (
	record: string,
	word: string,
	lemma?: string,
	nth?: number,
): SttsShowing => ({
	record: `de/${record}`,
	word,
	...(lemma === undefined ? {} : { lemma }),
	...(nth === undefined ? {} : { nth }),
});

export const modeled: SttsStatus = { status: "Yes" };
export const partial = (...gaps: SttsGap[]): SttsStatus => ({
	status: "Partial",
	gaps,
});
/** Dumgen builds nothing until segment.inUnits is rewritten. */
export const waitsOnDumgen: SttsStatus = {
	status: "No",
	gaps: [
		{
			gap: "Dumgen's segment.inUnits is being rewritten against dumcorpus and doesn't build yet",
			issue: 701,
		},
	],
};
export const noRecord = (gap: string, issue?: number): SttsGap => ({
	gap,
	...(issue === undefined ? {} : { issue }),
});
