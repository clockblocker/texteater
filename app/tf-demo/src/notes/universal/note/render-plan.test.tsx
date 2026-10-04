import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { RegisteredBlockMap } from "../../renderer-registry";
import type { NoteData } from "./data";
import { renderUniversalNoteBody, renderUniversalNoteHeading } from "./render";
import { resolveRenderPlan } from "./render-plan";

const coordinates = {
	language: "de",
	noteKind: "Reading",
	family: "Lexeme",
	kind: "NOUN",
} as const;

test("omits unavailable and duplicate Blocks while applying visibility", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
		Definition: () => <p>definition</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Relations", "Missing", "Definition", "Relations"] as never,
		hidden: new Set(["Definition", "Missing"] as never),
	});

	expect(layout.order).toEqual(["Relations", "Definition"]);
	expect([...layout.hidden]).toEqual(["Definition"]);
	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual(["Relations"]);
});

test("inserts newly available Blocks in their default relative order", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
		Translations: () => <p>translations</p>,
		Definition: () => <p>definition</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Definition"],
		hidden: new Set(),
	});

	expect(layout.order).toEqual(["Definition", "Relations", "Translations"]);
	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual([
		"Definition",
		"Relations",
		"Translations",
	]);
});

test("retains a hidden Block's position while excluding it from the plan", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
		Definition: () => <p>definition</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Relations", "Definition"],
		hidden: new Set(["Relations"]),
	});

	expect(layout.order).toEqual(["Relations", "Definition"]);
	expect([...layout.hidden]).toEqual(["Relations"]);
	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual(["Definition"]);
});

test("plans the Heading Block apart from the Body's layout", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Relations"],
		hidden: new Set(["Relations"]),
	});

	expect(layout.order).toEqual(["Relations"]);
	expect(plan.heading?.blockKind).toBe("Heading");
	expect(plan.body).toEqual([]);
});

test("drops Anchor Blocks that a stale layout still names", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		SourceContexts: () => <p>source contexts</p>,
		Relations: () => <p>relations</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Relations", "SourceContexts", "Heading"] as never,
		hidden: new Set(["Heading", "SourceContexts"] as never),
	});

	expect(layout.order).toEqual(["Relations"]);
	expect([...layout.hidden]).toEqual([]);
	expect(plan.heading?.blockKind).toBe("Heading");
	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual([
		"SourceContexts",
		"Relations",
	]);
});

test("pins Source Contexts first in the Body, ahead of the layout", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
		Definition: () => <p>definition</p>,
		SourceContexts: () => <p>source contexts</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Definition", "Relations"],
		hidden: new Set(["Definition", "Relations"]),
	});

	expect(layout.order).toEqual(["Definition", "Relations"]);
	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual([
		"SourceContexts",
	]);
});

test("plans no Source Contexts for a route without that Block", () => {
	const { plan } = resolveRenderPlan(
		() => ({ Relations: () => <p>relations</p> }),
		coordinates,
		{ order: ["Relations"], hidden: new Set() },
	);

	expect(plan.body.map(({ blockKind }) => blockKind)).toEqual(["Relations"]);
});

test("plans no Heading for a route without a Heading Block", () => {
	const { plan } = resolveRenderPlan(
		() => ({ Relations: () => <p>relations</p> }),
		coordinates,
		{ order: ["Relations"], hidden: new Set() },
	);

	expect(plan.heading).toBeNull();
});

test("splits the Heading from a Body that keeps the Note's tags", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
	};
	const input = {
		noteData: readingFixture(),
		capabilities: readingCapabilities(),
		registryFor: () => registry,
	};
	const heading = renderUniversalNoteHeading(input);
	const body = renderToStaticMarkup(
		renderUniversalNoteBody({
			...input,
			layout: { order: ["Relations"], hidden: new Set() },
		}),
	);

	expect(heading && renderToStaticMarkup(heading)).toBe("<p>heading</p>");
	expect(body).not.toContain("heading");
	expect(body).toContain("relations");
	expect(body).toContain('data-slot="note-tags"');
});

test("composes the Heading first inside the Body", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => <p>heading</p>,
		Relations: () => <p>relations</p>,
		SourceContexts: () => <p>source contexts</p>,
	};
	const input = {
		noteData: readingFixture(),
		capabilities: readingCapabilities(),
		registryFor: () => registry,
	};
	const markup = renderToStaticMarkup(
		renderUniversalNoteBody({
			...input,
			layout: { order: ["Relations"], hidden: new Set() },
			heading: renderUniversalNoteHeading(input),
		}),
	);

	expect(markup).toMatch(
		/<article[^>]*><p>heading<\/p><p>source contexts<\/p><p>relations<\/p>/,
	);
});

test("leaves the Heading out of a Note that cannot render", () => {
	const input = {
		noteData: { kind: "Mystery" } as never,
		registryFor: () => null,
	};

	expect(renderUniversalNoteHeading(input)).toBeNull();
	expect(
		renderToStaticMarkup(
			renderUniversalNoteBody({
				...input,
				layout: { order: [], hidden: new Set() },
			}),
		),
	).toContain("Unknown Note kind: Mystery.");
});

test("isolates a failing block while preserving subsequent registered blocks", () => {
	const registry: RegisteredBlockMap = {
		Heading: () => {
			throw new Error("heading failed");
		},
		Relations: () => <p>relations survive</p>,
	};
	const input = {
		noteData: readingFixture(),
		capabilities: readingCapabilities(),
		registryFor: () => registry,
	};
	const markup = renderToStaticMarkup(
		renderUniversalNoteBody({
			...input,
			layout: { order: ["Relations"], hidden: new Set() },
			heading: renderUniversalNoteHeading(input),
		}),
	);

	expect(markup).toContain("Heading unavailable");
	expect(markup).toContain("relations survive");
});

function readingFixture(): NoteData {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" },
		reading: {
			ownerKey: "reading-1",
			emojiDescription: "🏃",
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "laufen",
				coreFeatures: {},
			},
		},
		knowledge: {},
		relations: [],
		relationsTruncated: false,
		pendingRelations: [],
		sourceContexts: { page: [], isDone: true },
	} as NoteData;
}

function readingCapabilities() {
	return {
		knowledgeSettings: {
			transcription: false,
			definition: false,
			translations: { en: false, ru: false },
			semanticRelations: {},
		} as never,
		sourceContexts: {
			items: [],
			hasMore: false,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		personalAnnotation: { isSaving: false, error: null, save: null },
		follow: () => {},
	};
}
