/**
 * Luna's one call per open-route click (#862, #639): it writes the
 * unit's Canonical Form and each member's spelling, in lexical casing,
 * with the stored Lemma candidates as hints. jev has already judged the
 * route's features and which members are Typos; Luna only writes text.
 * Luna's letters are taken only for a member judged Typo or Shorthand and
 * for a suspended fragment; a Standard member keeps its own letters, in
 * the casing Luna gave it when Luna wrote the same word, so a member Luna
 * dropped or wrote as its headword never loses the click (#876). No code
 * lowercases by position.
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
	/**
	 * A verbal unit's members judged auxiliaries: part of its Surface, never
	 * of its headword (Rule de/auxiliary-joins-the-verb-it-serves).
	 */
	readonly auxiliaries?: ReadonlySet<number>;
	/** The word each ambiguous fused piece or shorthand stands for, by Segment. */
	readonly readings: ReadonlyMap<number, string>;
};

/** What Luna wrote: the Canonical Form and every member's spelling, aligned. */
export type Written = {
	readonly canonicalForm: string;
	readonly members: readonly string[];
	/** A NOUN's definite article in the nominative singular, or none (#876). */
	readonly article?: "der" | "die" | "das" | "none";
};

/** Whether Luna writes the unit's article beside its headword: a common NOUN Lexeme. */
export const writesArticle = (target: Target) =>
	target.route.family === "Lexeme" && target.route.kind === "NOUN";

const nounArticles = ["der", "die", "das", "none"] as const;

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
		...(writesArticle(target) ? [routeGuidance.nounArticle] : []),
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
			...(judged.auxiliaries?.size
				? {
						auxiliaries: [...judged.auxiliaries].map(
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
				...(writesArticle(target)
					? { article: { type: "string", enum: [...nounArticles] } }
					: {}),
			},
			required: [
				"canonicalForm",
				"members",
				...(writesArticle(target) ? ["article"] : []),
			],
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
 * Luna's spellings matched to the members. One per member is read by
 * position. Otherwise each member that keeps its letters finds its own
 * word, compared without case, in order, and the words left over go in
 * order to the members Luna writes; undefined when they do not fit.
 */
function alignedWritten(
	target: Target,
	written: readonly unknown[],
	keeps: (member: Target["members"][number]) => string | undefined,
): readonly unknown[] | undefined {
	if (written.length === target.members.length) return written;
	const aligned: unknown[] = target.members.map(() => undefined);
	const leftOver: unknown[] = [];
	const writing: number[] = [];
	let next = 0;
	for (const member of target.members) {
		const own = keeps(member);
		if (own === undefined) {
			writing.push(member.position);
			continue;
		}
		const found = written.findIndex(
			(word, index) =>
				index >= next &&
				typeof word === "string" &&
				foldCase(word.trim(), "de") === foldCase(own, "de"),
		);
		if (found < 0) continue;
		leftOver.push(...written.slice(next, found));
		aligned[member.position] = written[found];
		next = found + 1;
	}
	leftOver.push(...written.slice(next));
	if (writing.length === 0) return aligned;
	if (leftOver.length !== writing.length) return undefined;
	for (const [index, position] of writing.entries())
		aligned[position] = leftOver[index];
	return aligned;
}

/**
 * Luna's answer, when it is one Canonical Form and a spelling for each
 * member it writes: a Typo, a Shorthand the table leaves open, a
 * suspended fragment. A member the table spells keeps the table's
 * spelling; a Standard member keeps its letters, cased as Luna wrote the
 * same word, else as the Canonical Form when it is that word.
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
	const keeps = (member: Target["members"][number]) => {
		const fixed = fixedSpelling(member, judged.readings);
		if (fixed !== undefined) return fixed;
		return judged.orthographies[member.position] === "Standard" &&
			!suspendedFragment.test(member.text)
			? member.text
			: undefined;
	};
	const aligned = alignedWritten(target, value.members, keeps);
	if (!aligned)
		return unusable(
			`Luna spelled ${value.members.length} members, not ${target.members.length}`,
		);
	const members: string[] = [];
	for (const member of target.members) {
		const written = aligned[member.position];
		const word = typeof written === "string" ? written.trim() : "";
		const fixed = fixedSpelling(member, judged.readings);
		if (fixed !== undefined) {
			members.push(fixed);
			continue;
		}
		const own = keeps(member);
		if (own !== undefined) {
			const cased = [word, form].find(
				(candidate) =>
					foldCase(candidate, "de") === foldCase(own, "de"),
			);
			members.push(cased ?? own);
			continue;
		}
		const orthography = judged.orthographies[member.position];
		if (!word || (orthography !== "Shorthand" && /\s/u.test(word)))
			return unusable(`Luna spelled m${member.position} as no one word`);
		// A suspended fragment is completed from its compound (Ein- is Eingang).
		const fragment = suspendedFragment.exec(member.text)?.[1];
		if (
			orthography === "Standard" &&
			fragment !== undefined &&
			!foldCase(word, "de").startsWith(foldCase(fragment, "de"))
		)
			return unusable(
				`Luna changed the letters of the Standard member m${member.position}`,
			);
		members.push(word);
	}
	const article = (value as { article?: unknown }).article;
	return {
		canonicalForm: form,
		members,
		...(writesArticle(target) &&
		typeof article === "string" &&
		(nounArticles as readonly string[]).includes(article)
			? { article: article as Written["article"] & string }
			: {}),
	};
}
