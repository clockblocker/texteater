import { expect } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { LunaAsk } from "../../src/luna.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { fakeDumgen } from "./../service-test-adapter.js";
import { picked } from "./hebrew-choices.js";
import { routeAnswers } from "./hebrew-route-fixture.js";

// Only identities exercised below are asserted. Other boundary fixtures abstain;
// notably multi-Head noun expressions have no supported Locution NOUN route.
const routeChoice = {
	ו: "Lexeme_CCONJ",
	"ה + ממשלה": "Lexeme_NOUN",
	"ה + בית": "Lexeme_NOUN",
	דנה: "Lexeme_PROPN",
	מ: "Lexeme_ADP",
	בית: "Lexeme_NOUN",
	ספר: "Lexeme_NOUN",
	של: "Lexeme_ADP",
	גדול: "Lexeme_ADJ",
	וְ: "Lexeme_CCONJ",
	"הַ + מֶּמְשָׁלָה": "Lexeme_NOUN",
} as const;

const noLuna: LunaAsk = async () => {
	throw Error("segmentation asked Luna");
};

const segmentChoice: Readonly<Record<string, string>> = {
	והממשלה: "Prefixes2",
	ולבית: "Prefixes2",
	מבית: "Prefixes1",
	הבית: "Prefixes1",
	הים: "Prefixes1",
	התיכון: "Prefixes1",
	הספר: "Prefixes1",
	ודנה: "Prefixes1",
	שבית: "AsWritten",
	וְהַמֶּמְשָׁלָה: "Prefixes2",
	"בית־ספר": "CompoundParts",
};

const membershipChoice: Readonly<Record<string, string>> = {
	"0:ו|1:ה": "Separate",
	"1:ה|2:ממשלה": "Join",
	"0:ו|1:ל": "Separate",
	"1:ל|2:בית": "Join",
	"0:מ|1:בית": "Join",
	"0:ה|1:בית": "Join",
	"0:ה|1:ים": "Join",
	"0:ו|1:דנה": "Separate",
	"0:וְ|1:הַ": "Separate",
	"1:הַ|2:מֶּמְשָׁלָה": "Join",
	"0:בית|2:ספר": "Join",
	"0:בית|3:ספר": "Join",
	"1:ים|4:תיכון": "Join",
	"1:ים|3:ה": "Join",
	"3:ה|4:תיכון": "Join",
	"2:ארצות|4:הברית": "Join",
	"0:בית|2:ה": "Join",
	"2:ה|3:ספר": "Join",
	"0:בית|2:גדול": "Separate",
};

/** A deterministic jev that makes the contextual policy explicit. */
function fakeHebrewJev(lowMembership = false) {
	const stages: string[] = [];
	const ask: JevAsk = async (request, { stage }) => {
		stages.push(stage);
		if (stage === "route")
			return {
				model: request.model,
				answers: routeAnswers({ ...request, stage }, routeChoice),
				usage: { input_tokens: 1, output_tokens: 1 },
			};
		expect(["segments", "units"]).toContain(stage);
		const written = request.state.written as
			| Readonly<Record<string, string>>
			| undefined;
		const source =
			written === undefined ? undefined : Object.values(written)[0];
		if (stage === "segments" && source === undefined)
			throw Error(
				`No fake answer for ${stage} ${JSON.stringify(source)}`,
			);
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => {
					expect((question as Question).type).toBe("choice");
					const choice =
						stage === "segments"
							? (segmentChoice[
									written?.[
										`w${id.slice("source_".length)}`
									] ?? ""
								] ?? "AsWritten")
							: (membershipChoice[
									(
										request.state.candidates as Readonly<
											Record<string, string>
										>
									)[id] ?? ""
								] ?? "Separate");
					return [
						id,
						picked(
							choice,
							stage === "units" && lowMembership ? 0.69 : 1,
						),
					];
				}),
			),
			usage: { input_tokens: 1, output_tokens: 1 },
		};
	};
	return { ask, stages };
}

export async function intake(sentence: string, lowMembership = false) {
	const jev = fakeHebrewJev(lowMembership);
	const text = await Effect.runPromise(
		fakeDumgen({ jev: jev.ask, luna: noLuna }).segment.inUnits({
			language: "he",
			paragraphs: [{ sentences: [sentence] }],
		}),
	);
	return { sentence: text.paragraphs[0]?.sentences[0], stages: jev.stages };
}
