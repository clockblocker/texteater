import { describe, expect, test } from "bun:test";

import {
	hrefFor,
	type NavigationTarget,
	targetFromLocation,
} from "../src/lib/navigation";

const targets = [
	{ kind: "Library" },
	{ kind: "Settings" },
	{ kind: "Settings", textId: "text_123" },
	{ kind: "Text", textId: "text_123" },
	{
		kind: "Text",
		textId: "text_123",
		focusAttestationId: "attestation_456",
	},
	{ kind: "UnitReadingNote", readingId: "reading_123" },
	{ kind: "RouteNote", routeKind: "Attestation", id: "attestation_123" },
	{ kind: "RouteNote", routeKind: "Surface", id: "surface_123" },
	{ kind: "RouteNote", routeKind: "Lemma", id: "lemma_123" },
	{ kind: "ShadowNote", shadowId: "shadow_123" },
	{ kind: "Resolution", requestId: "01991ebc-d169-75f2-995d-1243660b0ab1" },
] as const satisfies readonly NavigationTarget[];

describe("Navigation", () => {
	for (const target of targets) {
		test(`round trips ${target.kind}`, () => {
			const href = hrefFor(target);
			const url = new URL(href, "https://tf-demo.test");
			expect(
				targetFromLocation({
					pathname: url.pathname,
					search: url.search,
				}),
			).toEqual(target);
		});
	}

	test("rejects unknown Route Note kinds and malformed identifiers", () => {
		expect(
			targetFromLocation({
				pathname: "/note/route/reading/reading_123",
				search: "",
			}),
		).toBeNull();
		expect(
			targetFromLocation({
				pathname: "/note/reading/not%2Fa%2Freading",
				search: "",
			}),
		).toBeNull();
		expect(
			targetFromLocation({
				pathname: "/text/text_123",
				search: "?at=attestation_123&at=attestation_456",
			}),
		).toBeNull();
	});

	test("rejects non-canonical paths and query parameters", () => {
		expect(
			targetFromLocation({ pathname: "/library/", search: "" }),
		).toBeNull();
		expect(
			targetFromLocation({
				pathname: "/note/reading/reading_123",
				search: "?from=text",
			}),
		).toBeNull();
		expect(
			targetFromLocation({
				pathname: "/settings",
				search: "?text=text_123&text=text_456",
			}),
		).toBeNull();
	});
});
