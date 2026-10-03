/**
 * Luna's one call per open-route click (#862, #639): it writes the
 * unit's Canonical Form and each member's spelling, in lexical casing,
 * with the stored Lemma candidates as hints. jev has already judged the
 * route's features and which members are Typos; Luna only writes text.
 * Code keeps the members aligned and refuses an answer that changes a
 * Standard member's letters, and no code lowercases by position.
 */
import { foldCase } from "dumling";
import { InvalidModelOutput } from "../../errors.js";
import type { LunaRequest } from "../../luna.js";
import type { LemmaCandidate } from "../types.js";
import type { MemberOrthography } from "./member-spelling.js";
import { canonicalForm, routeGuidance } from "./prompts.js";
import { fixedSpelling, type Target, targetState } from "./target.js";

/** What grammar fixed before Luna writes: the judged features and what stays out of the headword. */
export type Judged = {
	readonly orthographies: readonly MemberOrthography[];
	/** The judged Core Features and Surface features Luna's headword must fit. */
	readonly features: Readonly<Record<string, unknown>>;
	/** Members that are no part of the headword: an owned article, a governed preposition. */
	readonly outsideHeadword: ReadonlySet<number>;
	/** The word each ambiguous fused piece or shorthand stands for, by Segment. */
	readonly readings: ReadonlyMap<number, string>;
};

/** What Luna wrote: the Canonical Form and every member's spelling, aligned. */
export type Written = {
	readonly canonicalForm: string;
	readonly members: readonly string[];
};

const discontinuous = new Set([
	"Lexeme/ADP",
	"Lexeme/CCONJ",
	"Lexeme/SCONJ",
	"Locution/ADP",
	"Locution/CCONJ",
	"Locution/SCONJ",
]);

/** A fragment ending in a hyphen, which a coordinated compound completes. */
const suspendedFragment = /^(.+)[-‐‑]$/u;

/** The system prompt: the task, the casing and member lines, and the route's line. */
function systemPrompt(target: Target): string {
	const key = `${target.route.family}/${target.route.kind}`;
	const guidance =
		routeGuidance[key] ??
		(target.route.family === "Locution"
			? routeGuidance.Locution
			: undefined);
	return [
		canonicalForm.task,
		canonicalForm.headword,
		canonicalForm.members,
		...(target.members.some(({ text }) => suspendedFragment.test(text))
			? [canonicalForm.suspended]
			: []),
		...(discontinuous.has(key) || target.route.family === "Locution"
			? [canonicalForm.slot]
			: []),
		...(guidance ? [guidance] : []),
	].join("\n");
}

/**
 * The stored Lemmas that may name the unit: found under one of its
 * members' words, compared without case, on its own route.
 */
export function hintsFor(
	target: Target,
	candidates: readonly LemmaCandidate[],
): readonly LemmaCandidate[] {
	const words = new Set(
		target.members.flatMap((member) => {
			const fixed = fixedSpelling(member);
			return [member.text, ...(fixed ? [fixed] : [])].map((text) =>
				foldCase(text, "de"),
			);
		}),
	);
	return candidates.filter(
		({ lemma, foundUnder }) =>
			lemma.family === target.route.family &&
			lemma.kind === target.route.kind &&
			foundUnder.some((text) =>
				text
					.split(/\s+/u)
					.some((word) => words.has(foldCase(word, "de"))),
			),
	);
}

/** The Canonical Form request, without its configuration. */
export function canonicalFormRequest(
	target: Target,
	judged: Judged,
	hints: readonly LemmaCandidate[],
): Omit<LunaRequest, "configuration"> {
	const state = targetState(target);
	const fixedMembers = Object.fromEntries(
		target.members.flatMap((member) => {
			const fixed = fixedSpelling(member, judged.readings);
			return fixed === undefined ? [] : [[`m${member.position}`, fixed]];
		}),
	);
	return {
		systemPrompt: systemPrompt(target),
		input: {
			route: state.route,
			sentence: state.sentence,
			marked: state.marked,
			members: target.members.map((member) => ({
				member: `m${member.position}`,
				text: member.text,
				orthography: judged.orthographies[member.position],
			})),
			...(Object.keys(fixedMembers).length ? { fixedMembers } : {}),
			judged: judged.features,
			...(judged.outsideHeadword.size
				? {
						outsideHeadword: [...judged.outsideHeadword].map(
							(position) => `m${position}`,
						),
					}
				: {}),
			...(hints.length
				? {
						lemmaCandidates: hints.map(({ lemma }) => ({
							canonicalForm: lemma.canonicalForm,
							coreFeatures: lemma.coreFeatures,
						})),
					}
				: {}),
		},
		outputSchema: {
			type: "object",
			properties: {
				canonicalForm: { type: "string", minLength: 1 },
				members: {
					type: "array",
					items: { type: "string", minLength: 1 },
					minItems: target.members.length,
					maxItems: target.members.length,
				},
			},
			required: ["canonicalForm", "members"],
			additionalProperties: false,
		},
	};
}

/** ASCII `...` and a bare … become … with a space on each side (#705). */
export const normalizedSlots = (form: string) =>
	form
		.replace(/\s*(?:\.\.\.|…)\s*/gu, " … ")
		.replace(/\s+/gu, " ")
		.trim();

/**
 * Luna's answer, when it is one Canonical Form and one spelling per
 * member, a Standard member changed at most in casing; a member the table
 * spells keeps the table's spelling.
 */
export function checkWritten(
	target: Target,
	judged: Judged,
	output: unknown,
): Written | InvalidModelOutput {
	const unusable = (message: string) =>
		new InvalidModelOutput({ stage: "canonical", message });
	const value = output as { canonicalForm?: unknown; members?: unknown };
	if (
		typeof value?.canonicalForm !== "string" ||
		!Array.isArray(value.members)
	)
		return unusable("Luna answered without a Canonical Form and members");
	const form = normalizedSlots(value.canonicalForm);
	if (!form || /\n/u.test(value.canonicalForm))
		return unusable("Luna answered no single-line Canonical Form");
	if (value.members.length !== target.members.length)
		return unusable(
			`Luna spelled ${value.members.length} members, not ${target.members.length}`,
		);
	const members: string[] = [];
	for (const member of target.members) {
		const written = value.members[member.position];
		const fixed = fixedSpelling(member, judged.readings);
		if (fixed !== undefined) {
			members.push(fixed);
			continue;
		}
		const orthography = judged.orthographies[member.position];
		if (
			typeof written !== "string" ||
			!written.trim() ||
			(orthography !== "Shorthand" && /\s/u.test(written))
		)
			return unusable(`Luna spelled m${member.position} as no one word`);
		// A suspended fragment is completed from its compound (Ein- is Eingang).
		const fragment = suspendedFragment.exec(member.text)?.[1];
		const kept =
			fragment === undefined
				? foldCase(written, "de") === foldCase(member.text, "de")
				: foldCase(written, "de").startsWith(foldCase(fragment, "de"));
		if (orthography === "Standard" && !kept)
			return unusable(
				`Luna changed the letters of the Standard member m${member.position}`,
			);
		members.push(written.trim());
	}
	return { canonicalForm: form, members };
}
