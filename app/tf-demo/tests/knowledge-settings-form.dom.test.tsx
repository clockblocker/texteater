import "./support/dom";
import { expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import {
	DEFAULT_KNOWLEDGE_SETTINGS,
	type KnowledgePreferences,
} from "../shared/knowledge-preferences";
import { KnowledgeSettingsForm } from "../src/views/unit-reading-knowledge-settings";

/** A Convex client whose every mutation is answered by `mutation`. */
function convexClient(
	mutation: (args: unknown) => Promise<unknown>,
): ConvexReactClient {
	const client: Pick<ConvexReactClient, "mutation"> = {
		mutation: (_reference, args) => mutation(args),
	};
	return client as ConvexReactClient;
}

function form(client: ConvexReactClient, settings: KnowledgePreferences) {
	return (
		<ConvexProvider client={client}>
			<KnowledgeSettingsForm
				visitorId="visitor"
				initialSettings={settings}
			/>
		</ConvexProvider>
	);
}

test("a failed save shows the prop's settings and the error", async () => {
	let rejectSave: (cause: unknown) => void = () => {};
	const client = convexClient(
		() =>
			new Promise((_resolve, reject) => {
				rejectSave = reject;
			}),
	);
	const view = render(form(client, DEFAULT_KNOWLEDGE_SETTINGS));
	const transcription = view.getByRole("checkbox", { name: "Transcription" });
	expect(transcription.getAttribute("aria-checked")).toBe("true");

	fireEvent.click(transcription);
	expect(transcription.getAttribute("aria-checked")).toBe("false");

	rejectSave(new ConvexError({ message: "Settings are read-only today." }));
	expect((await view.findByRole("alert")).textContent).toBe(
		"Settings are read-only today.",
	);
	expect(transcription.getAttribute("aria-checked")).toBe("true");
});

test("a new initialSettings prop shows at once", () => {
	const client = convexClient(async () => null);
	const view = render(form(client, DEFAULT_KNOWLEDGE_SETTINGS));
	const transcription = view.getByRole("checkbox", { name: "Transcription" });
	expect(transcription.getAttribute("aria-checked")).toBe("true");

	view.rerender(
		form(client, { ...DEFAULT_KNOWLEDGE_SETTINGS, transcription: false }),
	);
	expect(transcription.getAttribute("aria-checked")).toBe("false");
});
