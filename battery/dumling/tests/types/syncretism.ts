import type { z } from "zod";
import type { lemmaSchema } from "../../src/generated/schemas/de/lexeme/pronoun.js";
import {
	isSyncreticUnit,
	isSyncretism,
	syncretismView,
	syncretize,
} from "../../src/index.js";
import type { Lemma, Syncretism, SyncretismView } from "../../src/types.js";

type Pronoun = Lemma<"de", "Lexeme", "PRON">;
type PronounSyncretism = Syncretism<"Lemma", "de", "Lexeme", "PRON">;
type PronounView = SyncretismView<"Lemma", "de", "Lexeme", "PRON">;
declare const syncretism: PronounSyncretism;
declare const view: PronounView;
declare const pronoun: Pronoun;

// A Syncretism's units are plain Lemmas, so none of them nests another.
declare const unit: PronounSyncretism["syncretized"][number];
// @ts-expect-error A unit of a Syncretism lists no open features.
unit.syncretic;
const _open: keyof Pronoun["coreFeatures"] = syncretism.syncretic[0];
// @ts-expect-error A view carries no units.
view.syncretized;
const _viewList: PronounSyncretism["syncretic"] = view.syncretic;
// Both shapes are German PRON Lemmas wherever a Lemma is named.
const _fullLemma: Pronoun = syncretism;
const _viewLemma: Pronoun = view;
// A route that has not opted in has no Syncretism.
const _noNoun: [Syncretism<"Lemma", "de", "Lexeme", "NOUN">] extends [never]
	? true
	: false = true;
const _noSurface: [Syncretism<"Surface", "de", "Lexeme", "PRON">] extends [
	never,
]
	? true
	: false = true;
// @ts-expect-error A Reading has no Syncretism of its own.
type _NoReading = Syncretism<"Reading">;

const built = syncretize([pronoun, pronoun]);
const _builtUnits: PronounSyncretism["syncretized"] = built.syncretized;
const _builtView: Omit<typeof built, "syncretized"> = syncretismView(built);
if (isSyncretism(pronoun)) {
	const _narrowed: PronounSyncretism["syncretized"] = pronoun.syncretized;
}
if (isSyncreticUnit(pronoun)) {
	const _narrowed: PronounSyncretism["syncretic"] = pronoun.syncretic;
}

// The concrete schema's parsed type is the generated Lemma type.
const _parsed: Pronoun = {} as z.output<typeof lemmaSchema>;
const _back: z.output<typeof lemmaSchema> = pronoun;
