import { isRecord } from "common-utils";
import { ParsingError } from "common-utils/validation";
import { knowledgePolicyMask } from "./knowledge-policies.js";
import type { KnowledgeRequestMask, KnowledgeSelectionInput } from "./types.js";
import { parseSelectionShape } from "./validation.js";

/** No Knowledge Policy covers the route. Only its type is public, so callers narrow on `_tag`, not `instanceof`. */
class KnowledgePolicyUnavailable extends Error {
	readonly _tag = "KnowledgePolicyUnavailable";
	readonly route: KnowledgeSelectionInput["route"];
	constructor(route: KnowledgeSelectionInput["route"]) {
		super(
			`No Knowledge policy for ${route.language}/${route.family}/${route.kind}`,
		);
		this.route = route;
	}
}

export type { KnowledgePolicyUnavailable };
/** What `selectKnowledge` answers: the request mask, or why it has none. */
export type KnowledgeSelection =
	| { readonly success: true; readonly value: KnowledgeRequestMask }
	| {
			readonly success: false;
			readonly error:
				| ParsingError<KnowledgeSelectionInput>
				| KnowledgePolicyUnavailable;
	  };
/** Omitted setting leaves are enabled. Explicit false disables; null and unknown keys fail. */
export function selectKnowledge(
	input: KnowledgeSelectionInput,
): KnowledgeSelection {
	const parsed = parseSelectionShape(input);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed } as const;
	const { route, settings = {} } = parsed;
	const mask = knowledgePolicyMask(route);
	if (!mask)
		return {
			success: false,
			error: new KnowledgePolicyUnavailable(route),
		} as const;
	// Start from the route's mask and drop what the settings disable, so the
	// selection stays a KnowledgeRequestMask; the mask is shared, so clone it.
	const selected: KnowledgeRequestMask = structuredClone(mask);
	const aspects: Readonly<Record<string, unknown>> = selected;
	const aspectSettings: Readonly<Record<string, unknown>> = settings;
	for (const [aspect, value] of Object.entries(aspects)) {
		const setting = aspectSettings[aspect];
		if (value === null) {
			if (setting === false) Reflect.deleteProperty(selected, aspect);
		} else if (isRecord(value)) {
			for (const key of Object.keys(value))
				if (isRecord(setting) && setting[key] === false)
					Reflect.deleteProperty(value, key);
			if (Object.keys(value).length === 0)
				Reflect.deleteProperty(selected, aspect);
		} else Reflect.deleteProperty(selected, aspect);
	}
	return { success: true, value: selected } as const;
}
