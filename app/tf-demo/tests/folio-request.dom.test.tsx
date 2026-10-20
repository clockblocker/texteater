import "./support/dom";
import { expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { FolioRequest, folioOpenings } from "../src/views/folio-request";

/*
 * The control a book passage not yet processed opens with (#1216), and
 * where the reader puts it.
 */

type State = "Unprocessed" | "Processing" | "Processed" | "Failed";

const folio = (index: number, start: number, end: number, state: State) => ({
	folioId: `folio-${index.toString()}` as Id<"folios">,
	start,
	end,
	state,
});

/** A Convex client whose every mutation is answered by `mutation`. */
function convexClient(
	mutation: (args: unknown) => Promise<unknown>,
): ConvexReactClient {
	const client: Pick<ConvexReactClient, "mutation"> = {
		mutation: (_reference, args) => mutation(args),
	};
	return client as ConvexReactClient;
}

test("each Folio not processed opens at its first loaded Sentence", () => {
	const sentences = [3, 4, 5, 6, 7, 8, 9].map((position) => ({
		sentenceId: `s${position.toString()}`,
		position,
	}));
	const folios = [
		folio(0, 0, 5, "Unprocessed"),
		folio(1, 5, 7, "Processed"),
		folio(2, 7, 9, "Failed"),
		folio(3, 9, 12, "Processing"),
	];
	const openings = folioOpenings(sentences, folios);
	expect(
		[...openings].map(([sentenceId, { folioId }]) => [sentenceId, folioId]),
	).toEqual([
		// Its start is not loaded: it opens where it begins to show.
		["s3", "folio-0"],
		["s7", "folio-2"],
		["s9", "folio-3"],
	]);
	expect(folioOpenings(sentences, undefined).size).toBe(0);
});

test("asking runs at once, and a failed passage offers to try again", async () => {
	const asked: unknown[] = [];
	const client = convexClient(async (args) => {
		asked.push(args);
		return null;
	});
	const control = (state: State) => (
		<ConvexProvider client={client}>
			<FolioRequest folio={folio(0, 0, 5, state)} />
		</ConvexProvider>
	);
	const view = render(control("Unprocessed"));
	fireEvent.click(
		view.getByRole("button", { name: "Make this passage clickable" }),
	);
	expect(asked).toEqual([
		{ folioId: "folio-0", visitorId: expect.any(String) },
	]);
	const running = view.getByRole("button", {
		name: "Making this passage clickable…",
	});
	expect(running.getAttribute("aria-disabled")).toBe("true");

	view.rerender(control("Processing"));
	fireEvent.click(running);
	expect(asked).toHaveLength(1);

	view.rerender(control("Failed"));
	expect(
		view.getByText("Couldn’t make this passage clickable."),
	).toBeTruthy();
	fireEvent.click(view.getByRole("button", { name: "Try again" }));
	expect(asked).toHaveLength(2);
	expect(
		view.getByRole("button", { name: "Making this passage clickable…" }),
	).toBeTruthy();
});

test("a refused request shows as failed", async () => {
	const client = convexClient(() => Promise.reject(new Error("offline")));
	const view = render(
		<ConvexProvider client={client}>
			<FolioRequest folio={folio(0, 0, 5, "Unprocessed")} />
		</ConvexProvider>,
	);
	fireEvent.click(
		view.getByRole("button", { name: "Make this passage clickable" }),
	);
	expect(await view.findByRole("button", { name: "Try again" })).toBeTruthy();
});
