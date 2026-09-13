import { ParsingError } from "common-utils";
import { DE_REL_MAP } from "./selection-policy-de.js";
import type { KnowledgeRequestMask, KnowledgeSelectionInput } from "./types.js";
import { parseSelectionShape } from "./validation.js";

export class KnowledgePolicyUnavailable extends Error {
	readonly _tag = "KnowledgePolicyUnavailable";
	constructor(readonly route: KnowledgeSelectionInput["route"]) {
		super(
			`No Knowledge policy for ${route.language}/${route.family}/${route.kind}`,
		);
	}
}
/** Omitted setting leaves are enabled. Explicit false disables; null and unknown keys fail. */
export function selectKnowledge(input: KnowledgeSelectionInput) {
	const parsed = parseSelectionShape(input);
	if (parsed instanceof ParsingError)
		return { success: false, error: parsed } as const;
	const { route, settings = {} } = parsed;
	if (route.language !== "de")
		return {
			success: false,
			error: new KnowledgePolicyUnavailable(route),
		} as const;
	const policy: Record<
		string,
		Record<string, KnowledgeRequestMask>
	> = DE_REL_MAP;
	const mask = policy[route.family]?.[route.kind];
	if (!mask)
		return {
			success: false,
			error: new KnowledgePolicyUnavailable(route),
		} as const;
	const selected: Record<string, unknown> = {};
	for (const [aspect, value] of Object.entries(mask)) {
		const setting = settings[aspect as keyof typeof settings];
		if (value === null) {
			if (setting !== false) selected[aspect] = null;
		} else if (value && typeof value === "object") {
			const leaves = Object.fromEntries(
				Object.keys(value)
					.filter(
						(key) =>
							!setting ||
							typeof setting !== "object" ||
							setting[key as keyof typeof setting] !== false,
					)
					.map((key) => [key, null]),
			);
			if (Object.keys(leaves).length) selected[aspect] = leaves;
		}
	}
	return { success: true, value: selected as KnowledgeRequestMask } as const;
}
