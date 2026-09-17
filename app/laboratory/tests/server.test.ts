import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeOutput } from "../../../battery/dumgen/tests/execution-fixture.js";
import { grammarFixture } from "../../../battery/dumgen/tests/grammar-fixture.js";
import { startLaboratoryServer } from "../src/server";

test("HTTP workbench retains session isolation, supplied targets, retry diagnostics and current logs", async () => {
	const directory = await mkdtemp(join(tmpdir(), "laboratory-http-"));
	const stages: string[] = [];
	let failReading = true;
	const grammar = {
		memberOrthographies: ["Standard"],
		normalizedMembers: ["Bank"],
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Sing" },
		},
		lemma: {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		realizationCoverage: "Full",
	};
	const server = startLaboratoryServer({
		port: 0,
		sessionDirectory: directory,
		configuration: { model: "controlled" },
		judge: (request, options) => {
			stages.push("resolveGrammar");
			return grammarFixture(grammar).judge(request, options);
		},
		execute: executeOutput(async (request) => {
			stages.push(request.stage);
			if (request.stage === "segment")
				return {
					language: "de",
					items: [
						{
							id: "0",
							decision: "Accepted",
							language: "de",
							stitchedText: "Bank",
						},
					],
				};

			if (request.stage === "resolveOrGenerateReadingEmojiDescription") {
				if (failReading) {
					failReading = false;
					throw new Error("controlled provider failure");
				}
				return { emojiDescription: "🏦" };
			}
			throw new Error(`Unexpected stage ${request.stage}`);
		}),
	});
	const post = (path: string, body: unknown) =>
		fetch(new URL(path, server.url), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
	try {
		const { sessionId } = await (
			await fetch(new URL("/api/session", server.url))
		).json();
		const segmented = await (
			await post("/api/segment", { text: "Bank" })
		).json();
		const input = {
			segmentedSentenceId: segmented.sentence.id,
			clickedSegmentIndex: 0,
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [0],
			},
		};
		const failed = await post("/api/resolve", input);
		expect(failed.status).toBe(502);
		expect(await failed.json()).toMatchObject({
			error: "controlled provider failure",
		});
		const response = await post("/api/resolve", input);
		expect(response.status).toBe(200);
		const resolved = await response.json();
		expect(resolved).toMatchObject({
			decision: "Resolved",
			entity: { reading: { unitKind: "Reading" } },
			encounter: { target: input.target },
			stages: { grammatical: { traceOrigin: "cached" } },
		});
		expect(stages).toEqual([
			"segment",
			"resolveGrammar",
			"resolveOrGenerateReadingEmojiDescription",
			"resolveOrGenerateReadingEmojiDescription",
		]);
		expect(
			(await (await post("/api/resolve", input)).json()).generation
				.modelCalls,
		).toBe(0);
		const events = (
			await readFile(join(directory, sessionId, "events.jsonl"), "utf8")
		)
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(
			events.some(
				(event) =>
					event.applicationResult.status === 502 &&
					event.trace.modelExchanges.some(
						(exchange: { failure?: string }) =>
							exchange.failure === "controlled provider failure",
					),
			),
		).toBe(true);
		const reset = await (await post("/api/session", {})).json();
		expect(reset.sessionId).not.toBe(sessionId);
		expect((await post("/api/resolve", input)).status).toBe(404);
	} finally {
		await server.stop(true);
		await rm(directory, { recursive: true, force: true });
	}
});
