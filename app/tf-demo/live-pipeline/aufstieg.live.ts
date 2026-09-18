import { expect, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";

const sourceText =
	"Als der Aufstieg anstrengender wurde, sagte die Wanderführerin: „Der Weg ist das Ziel.“";

test("Aufstieg: real generation from text intake through click, persistence and Reading Note", async ({
	page,
}, testInfo) => {
	const runId = process.env.TF_DEMO_LIVE_RUN;
	const convexUrl = process.env.TF_DEMO_LIVE_CONVEX_URL;
	if (!runId || !convexUrl)
		throw new Error("Authorize with bun run test:pipeline:live first.");
	const client = new ConvexHttpClient(convexUrl);
	const visitorId = `live-pipeline:${runId}`;
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	let requestId: string | undefined;
	page.on("websocket", (socket) => {
		socket.on("framesent", ({ payload }) => {
			const message = JSON.parse(String(payload));
			if (
				message.type === "Mutation" &&
				message.udfPath === "resolutionSessions:selectSegment"
			) {
				requestId = message.args[0]?.requestId;
			}
		});
	});
	await page.addInitScript((id) => {
		localStorage.setItem(
			"tf-demo:anonymous-visitor:v1",
			JSON.stringify({ id }),
		);
		localStorage.setItem("tf-demo.route-notes-enabled.v1", "false");
	}, visitorId);

	const submitted = await client.action(api.orchestration.submitText, {
		submissionKey: `live-pipeline:${runId}:Aufstieg`,
		sourceText,
	});
	if (submitted.status !== "Accepted") throw new Error(submitted.message);
	const text = await client.query(api.textViews.get, {
		textId: submitted.textId,
		visitorId,
	});
	const sentence = text?.sentences.find((item) =>
		item.segments.some((segment) => segment.text === "Aufstieg"),
	);
	const segment = sentence?.segments.find((item) => item.text === "Aufstieg");
	if (!sentence || !segment)
		throw new Error(
			"Segmentation did not expose Aufstieg as a selectable Segment.",
		);
	expect(segment.kind).toBe("ResolvableText");
	expect(
		segment.attestationId,
		"Cached occurrences must not pass the live-generation probe",
	).toBeUndefined();

	let resolution: FunctionReturnType<
		typeof api.resolutionSessions.getResolutionNote
	> = null;
	try {
		await page.goto("/");
		await page
			.getByRole("button")
			.filter({ hasText: sourceText })
			.first()
			.click();
		await page
			.locator('[data-slot="text-reader"] [data-slot="reader-segment"]')
			.filter({ hasText: /^Aufstieg$/ })
			.click();
		await expect
			.poll(() => requestId, {
				message: "Browser click must start a Resolution Session",
			})
			.toBeTruthy();
		if (!requestId) throw new Error("Missing browser selection request.");
		const selectionRequestId = requestId;
		await expect
			.poll(
				async () => {
					resolution = await client.query(
						api.resolutionSessions.getResolutionNote,
						{ requestId: selectionRequestId },
					);
					return resolution?.activity;
				},
				{
					timeout: 120_000,
					intervals: [500, 1_000, 2_000],
					message:
						"Reading resolution must settle instead of hanging",
				},
			)
			.toBe("Terminal");
		// Read once more outside the polling callback so the terminal result is narrowed.
		const completed = await client.query(
			api.resolutionSessions.getResolutionNote,
			{ requestId: selectionRequestId },
		);
		expect(completed?.outcome).toBe("Complete");
		if (
			completed?.terminal?.kind !== "Complete" ||
			!completed.terminal.canonical
		) {
			throw new Error(
				`Resolution did not commit: ${JSON.stringify(completed)}`,
			);
		}
		expect(completed.route.sentenceId).toBe(sentence.sentenceId);
		expect(completed.route.clickedSegmentIndex).toBe(segment.index);
		expect(completed.route.selectedSegment).toBe("Aufstieg");
		const canonical = completed.terminal.canonical;
		expect(canonical.normalizedSurface).toBe("der Aufstieg");
		const nounSurfaceNote = await client.query(api.routeNotes.get, {
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "der Aufstieg",
			},
		});
		if (nounSurfaceNote?.kind !== "Surface")
			throw new Error("Missing noun Surface Note");
		const article = nounSurfaceNote.analyses[0]?.article;
		expect(article?.presented.normalizedSurface).toBe("der");
		if (!article) throw new Error("Missing article route");
		const articleNote = await client.query(api.routeNotes.get, {
			target: { ...article.target, ...article.presentationContext },
			visitorId,
		});
		if (articleNote?.kind !== "Surface")
			throw new Error("Missing DET Surface Note");
		expect(
			articleNote.analyses.find(
				({ analysisKey }) =>
					analysisKey ===
					article.presentationContext.activeAnalysisKey,
			)?.presented.lemma,
		).toMatchObject({ canonicalForm: "der", kind: "DET" });
		const note = await client.query(api.readingNotes.get, {
			readingId: canonical.readingId,
			visitorId,
		});
		expect(note?.reading.lemma).toMatchObject({
			canonicalForm: "Aufstieg",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(note?.reading.emojiDescription.length).toBeGreaterThan(0);
		const persisted = await client.query(api.textViews.get, {
			textId: submitted.textId,
			visitorId,
		});
		expect(
			persisted?.sentences
				.find((item) => item.sentenceId === sentence.sentenceId)
				?.segments.find((item) => item.index === segment.index),
		).toMatchObject({
			attestationId: canonical.attestationId,
			encountered: true,
		});
		expect(
			persisted?.sentences
				.find((item) => item.sentenceId === sentence.sentenceId)
				?.segments.find((item) => item.text === "der"),
		).toMatchObject({ attestationId: canonical.attestationId });
		await expect(
			page
				.locator('[data-note-kind="Reading"]')
				.filter({ hasText: "Aufstieg" }),
		).toBeVisible();
		await expect(page.getByLabel("Loading Reading Note")).toHaveCount(0);
		expect(browserErrors).toEqual([]);
	} finally {
		await testInfo.attach("pipeline-result", {
			body: JSON.stringify(
				{
					runId,
					textId: submitted.textId,
					sentenceId: sentence.sentenceId,
					requestId,
					resolution,
					browserErrors,
				},
				null,
				2,
			),
			contentType: "application/json",
		});
	}
});
