import { describe, expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	type AuthoredMember,
	authoredMembers,
	authoredRealizations,
	closedVerbForms,
	subjectExpletiveEs,
} from "../src/inventories.js";

const name = ({ lemma, reading }: AuthoredMember) =>
	`${lemma.kind}/${lemma.canonicalForm} ${reading.emojiDescription} ${JSON.stringify(lemma.coreFeatures)}`;

function field(value: unknown, key: string): unknown {
	return value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;
}

/**
 * The aspects an authored member leaves incomplete (system ADR 0021): every
 * aspect the route's Knowledge policy selects is stored and marked Authored,
 * and each semantic relation is Authored with claims or ReviewedEmpty.
 */
function incompleteKnowledge(member: AuthoredMember): string[] {
	const { language, family, kind } = member.lemma;
	const selected = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
	if (!selected.success) return [selected.error.message];
	const gaps: string[] = [];
	for (const [aspect, selection] of Object.entries(selected.value)) {
		const content = field(member.knowledge, aspect);
		const coverage = field(member.coverage, aspect);
		if (selection === null) {
			if (content === undefined || coverage !== "Authored")
				gaps.push(aspect);
			continue;
		}
		for (const leaf of Object.keys(selection)) {
			const value = field(content, leaf);
			const status = field(coverage, leaf);
			const complete =
				aspect !== "semanticRelations"
					? value !== undefined && status === "Authored"
					: status === "ReviewedEmpty"
						? value === undefined ||
							(Array.isArray(value) && !value.length)
						: status === "Authored" &&
							Array.isArray(value) &&
							value.length > 0;
			if (!complete) gaps.push(`${aspect}/${leaf}`);
		}
	}
	if (
		member.coverage.semanticRelationTargetKind !==
		(member.knowledge.semanticRelations?.targetKind ?? "lemma")
	)
		gaps.push("semanticRelationTargetKind");
	return gaps;
}

describe("the German authored inventory", () => {
	test("holds every member", () => {
		expect(authoredMembers.length).toBeGreaterThan(300);
	});

	test("every Lemma and Reading parses strictly as Dumling stores it", () => {
		const failures = authoredMembers.flatMap((member) =>
			[member.lemma, member.reading].flatMap((unit) => {
				const parsed = parseUnit(unit);
				if (!parsed.success)
					return [`${name(member)}: ${parsed.error.message}`];
				return Bun.deepEquals(parsed.chain.value, unit, true)
					? []
					: [
							`${name(member)}: not stored as parseUnit normalizes it`,
						];
			}),
		);
		expect(failures).toEqual([]);
	});

	test("every Reading's Knowledge parses with Dumrel", () => {
		const failures = authoredMembers.flatMap((member) => {
			const parsed = parseReadingKnowledge({
				source: member.reading,
				knowledge: member.knowledge,
			});
			return parsed.success
				? []
				: [`${name(member)}: ${parsed.error.message}`];
		});
		expect(failures).toEqual([]);
	});

	test("every member stores all Knowledge its route selects", () => {
		const failures = authoredMembers.flatMap((member) =>
			incompleteKnowledge(member).map((gap) => `${name(member)}: ${gap}`),
		);
		expect(failures).toEqual([]);
	});

	test("no two members hold the same Reading", () => {
		const seen = new Set<string>();
		const duplicates = authoredMembers.flatMap((member) => {
			const key = JSON.stringify(member.reading);
			if (seen.has(key)) return [name(member)];
			seen.add(key);
			return [];
		});
		expect(duplicates).toEqual([]);
	});

	test("every realization spells a DET, PRON or AUX member", () => {
		for (const { member, spelled } of authoredRealizations) {
			expect(authoredMembers).toContain(member);
			expect(spelled).toBe(spelled.trim());
			expect(spelled).not.toBe("");
			expect(["DET", "PRON", "AUX"]).toContain(member.lemma.kind);
		}
	});

	test("reaches the units a Note drills down to without generation", () => {
		const realized = (spelled: string, kind: string) =>
			authoredRealizations
				.filter(
					(realization) =>
						realization.spelled === spelled &&
						realization.member.lemma.kind === kind,
				)
				.map(({ member }) => member.lemma);
		// hat in hat gekocht: the auxiliary's spelling names the AUX Lemma.
		expect(realized("hat", "AUX")).toContainEqual(
			expect.objectContaining({ canonicalForm: "haben" }),
		);
		// sich is one reflexive PRON cell per case.
		expect(
			realized("sich", "PRON").map(({ coreFeatures }) =>
				"case" in coreFeatures ? coreFeatures.case : null,
			),
		).toEqual(["Acc", "Dat"]);
		// der in der Frau is the article cell Dat.Fem.Sg.
		expect(realized("der", "DET")).toContainEqual(
			expect.objectContaining({
				coreFeatures: expect.objectContaining({
					pronType: "Art",
					case: "Dat",
					gender: "Fem",
					number: "Sing",
				}),
			}),
		);
		expect(authoredMembers).toContain(subjectExpletiveEs);
		expect(closedVerbForms.müssen).toContain("muß");
	});
});
