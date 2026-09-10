import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { RegisteredBlockMap } from "../../renderer-registry";
import type { NoteData } from "./data";
import { renderUniversalNote } from "./render";
import { resolveRenderPlan } from "./render-plan";

const coordinates = {
	language: "de",
	noteKind: "Reading",
	family: "Lexeme",
	kind: "NOUN",
} as const;

test("reconciles stale layouts before applying ordering and visibility", () => {
	const registry: RegisteredBlockMap = {
		Header: () => <p>header</p>,
		Relations: () => <p>relations</p>,
	};
	const { layout, plan } = resolveRenderPlan(() => registry, coordinates, {
		order: ["Relations", "Missing", "Header", "Relations"] as never,
		hidden: new Set(["Header", "Missing"] as never),
	});

	expect(layout.order).toEqual(["Relations", "Header"]);
	expect([...layout.hidden]).toEqual(["Header"]);
	expect(plan.map(({ blockKind }) => blockKind)).toEqual(["Relations"]);
});

test("isolates a failing block while preserving subsequent registered blocks", () => {
	const registry: RegisteredBlockMap = {
		Header: () => {
			throw new Error("header failed");
		},
		Relations: () => <p>relations survive</p>,
	};
	const markup = renderToStaticMarkup(
		renderUniversalNote({
			noteData: readingFixture(),
			capabilities: readingCapabilities(),
			layout: { order: ["Header", "Relations"], hidden: new Set() },
			registryFor: () => registry,
		}),
	);

	expect(markup).toContain("Header unavailable");
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
		definition: { isSaving: false, error: null, save: null },
		follow: () => {},
	};
}
