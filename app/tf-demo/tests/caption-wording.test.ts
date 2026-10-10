import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { presentAttestation } from "../convex/model/presentedDumling";
import {
	attestationCaption,
	type Caption,
	type CaptionToken,
	captionText,
	lemmaTitle,
	surfaceCaption,
	unitTitleParts,
	unitTitleText,
} from "../src/notes";

/**
 * The caption wording over dumcorpus gold: each record's reviewed
 * Attestation is presented as a Note presents it, and captioned.
 */

const recordsDirectory = join(
	dirname(fileURLToPath(import.meta.resolve("dumcorpus/package.json"))),
	"records",
	"de",
);

/** A gold record's Segments and the member indices of its target `attested`. */
function goldUnit(id: string, attested: string) {
	const record = JSON.parse(
		readFileSync(join(recordsDirectory, `${id}.json`), "utf8"),
	) as GoldRecord;
	const target = record.targets.find(
		({ attestation }) =>
			attestation?.members.map((member) => member.attested).join(" ") ===
			attested,
	);
	if (!target) throw new Error(`${id} has no target attesting ${attested}.`);
	return { segments: record.segments, members: target.memberSegmentIndices };
}

type GoldRecord = {
	readonly segments: readonly { kind: string; text: string }[];
	readonly targets: readonly {
		readonly memberSegmentIndices: readonly number[];
		readonly attestation?: {
			readonly members: readonly { attested: string }[];
			readonly valencyEvidence?: readonly { member: number | null }[];
		};
	}[];
};

const languages = { ui: "en", target: "de" } as const;

/** The gold target in record `id` whose members are `attested`, presented. */
function gold(id: string, attested: string) {
	const record = JSON.parse(
		readFileSync(join(recordsDirectory, `${id}.json`), "utf8"),
	) as GoldRecord;
	const target = record.targets.find(
		({ attestation }) =>
			attestation?.members.map((member) => member.attested).join(" ") ===
			attested,
	);
	if (!target?.attestation)
		throw new Error(`${id} has no target attesting ${attested}.`);
	const presented = presentAttestation(target.attestation);
	return {
		presented,
		attestation: {
			members: presented.members,
			valencyMembers: (target.attestation.valencyEvidence ?? []).flatMap(
				({ member }) => (member === null ? [] : [member]),
			),
			kind: presented.surface.lemma.kind,
			segments: record.segments,
			memberSegmentIndices: target.memberSegmentIndices,
		},
	};
}

function text(caption: Caption | null) {
	return caption
		? {
				full: captionText(caption.full),
				compact: captionText(caption.compact),
			}
		: null;
}

/** The Surface caption of a gold target, naming its Lemma. */
function surfaceOf(id: string, attested: string) {
	const { surface } = gold(id, attested).presented;
	return text(
		surfaceCaption(surface, lemmaTitle(surface.lemma, "de"), languages),
	);
}

/** The Attestation caption of a gold target, naming its Surface. */
function attestationOf(id: string, attested: string) {
	const { presented, attestation } = gold(id, attested);
	return text(
		attestationCaption(
			attestation,
			presented.surface.normalizedSurface,
			languages,
		),
	);
}

test("a finite verb names its tense and its person by pronoun", () => {
	expect(surfaceOf("er-ging-nach-hause", "ging")).toEqual({
		full: "past, er/sie/es of gehen",
		compact: "past, er/sie/es",
	});
	expect(surfaceOf("der-laster-fuhr-das-schild-um", "fuhr um")).toEqual({
		full: "past, er/sie/es of umfahren",
		compact: "past, er/sie/es",
	});
	expect(
		surfaceOf("die-peitsche-hat-er-mitgebracht-2", "hat mitgebracht")?.full,
	).toBe("perfect, er/sie/es of mitbringen");
	expect(
		surfaceOf("wir-werden-am-freitag-abreisen", "werden abreisen")?.full,
	).toBe("future, wir of abreisen");
});

test("mood, voice and the polite imperative read in plain words", () => {
	expect(
		surfaceOf("sieh-mal-an-die-kleine-von-nebenan", "Sieh an")?.full,
	).toBe("imperative, du of ansehen");
	expect(
		surfaceOf(
			"in-suedkorea-ist-der-junge-musiker-und-schauspieler-cha-in",
			"ist aufgefunden worden",
		)?.full,
	).toBe("perfect passive, er/sie/es of auffinden");
	expect(surfaceOf("das-waere-schoen-gewesen", "wäre gewesen")?.full).toBe(
		"perfect subjunctive, er/sie/es of sein",
	);
});

test("a noun names its case unless nominative and its number when plural", () => {
	expect(
		surfaceOf("kannst-du-mich-morgen-vom-bahnhof-abholen", "m Bahnhof"),
	).toEqual({
		full: "dative of der Bahnhof",
		compact: "dative",
	});
	expect(
		surfaceOf("er-hilft-den-kindern-bei-den-aufgaben", "den Kindern")?.full,
	).toBe("dative plural of das Kind");
	expect(
		surfaceOf("auf-der-karte-sind-drei-seen-eingezeichnet", "Seen")?.full,
	).toBe("plural of der See");
});

test("a Grundform in its standard spelling says nothing", () => {
	expect(surfaceOf("draussen-faellt-starker-regen", "Regen")).toBeNull();
	expect(surfaceOf("er-ging-nach-hause", "ging")).not.toBeNull();
});

test("a closed-class form names its gender where it is not the Lemma's", () => {
	expect(
		surfaceOf(
			"aber-wie-es-auch-liegen-mag-marcell-wir-muessen-uns-nun",
			"dieser",
		)?.full,
	).toBe("dative feminine of dieser");
});

test("an adjective or adverb names its degree", () => {
	expect(surfaceOf("das-neue-buero-liegt-naeher", "näher")?.full).toBe(
		"comparative of nah",
	);
});

test("a Variant names its tags, before its inflection", () => {
	expect(
		surfaceOf(
			"als-er-die-treppe-hinunterging-wusste-er-dass-ihm-nichts-zu",
			"daß",
		)?.full,
	).toBe("older spelling of dass");
	expect(
		surfaceOf(
			"als-er-die-treppe-hinunterging-wusste-er-dass-ihm-nichts-zu",
			"wußte",
		)?.full,
	).toBe("older spelling, past, er/sie/es of wissen");
	expect(
		surfaceOf("als-die-ueberraschung-enthuellt-wurde-sagte-er-ohhh", "ohhh")
			?.full,
	).toBe("stretched for effect of oh");
});

test("an Attestation names a Typo, a Shorthand, a fused word and a split verb", () => {
	expect(attestationOf("der-fahrer-mus-sofort-bremsen", "mus")).toEqual({
		full: "typo of muss",
		compact: "typo",
	});
	expect(
		attestationOf("anna-kauft-obst-gemuese-brot-usw", "usw.")?.full,
	).toBe("short for und so weiter");
	expect(
		attestationOf(
			"die-tuer-ist-offen-ich-bin-in-der-kueche-komm-doch-rein",
			"Komm rein",
		)?.full,
	).toBe("short for komm herein");
	expect(
		attestationOf("kannst-du-mich-morgen-vom-bahnhof-abholen", "m Bahnhof"),
	).toEqual({ full: "vom = von dem", compact: "vom = von dem" });
	expect(
		attestationOf("am-naechsten-morgen-war-alles-anders", "m Morgen")?.full,
	).toBe("Am = an dem");
	expect(attestationOf("der-laster-fuhr-das-schild-um", "fuhr um")).toEqual({
		full: "split form of fuhr um",
		compact: "split form",
	});
	expect(
		attestationOf("die-peitsche-hat-er-mitgebracht-2", "hat mitgebracht")
			?.full,
	).toBe("split form of hat mitgebracht");
});

test("a governed preposition or adjacent words do not split a verb, and an article's shorthand is not the noun's", () => {
	expect(
		attestationOf(
			"als-das-gespraech-lauter-wurde-fragte-die-vorsitzende-darf",
			"um bitten",
		),
	).toBeNull();
	expect(
		attestationOf("da-steht-ne-kiste-auf-dem-flur", "ne Kiste"),
	).toBeNull();
	expect(
		attestationOf(
			"als-wir-angekommen-sind-war-die-kueche-schon-aufgeraeumt",
			"angekommen sind",
		),
	).toBeNull();
	expect(
		attestationOf("wir-werden-am-freitag-abreisen", "werden abreisen")
			?.full,
	).toBe("split form of werden abreisen");
});

test("target-language runs stay apart from the relation's words", () => {
	const { surface } = gold("er-ging-nach-hause", "ging").presented;
	const caption = surfaceCaption(surface, "gehen", languages);
	expect(caption?.full).toEqual([
		{ kind: "Word", text: "past, " },
		{ kind: "Target", text: "er/sie/es" },
		{ kind: "Word", text: " of " },
		{ kind: "Next", text: "gehen" },
	] satisfies CaptionToken[]);
});

test("an Attestation's title is its whole unit as written, a gap where other words stand", () => {
	const title = (id: string, attested: string, clicked?: number) => {
		const { segments, members } = goldUnit(id, attested);
		return unitTitleParts(segments, members, clicked);
	};
	expect(
		unitTitleText(title("der-laster-fuhr-das-schild-um", "fuhr um")),
	).toBe("fuhr … um");
	// A fused piece is spelled with its whole word.
	expect(
		unitTitleText(
			title("kannst-du-mich-morgen-vom-bahnhof-abholen", "m Bahnhof"),
		),
	).toBe("vom Bahnhof");
	expect(
		unitTitleText(
			title("am-naechsten-morgen-war-alles-anders", "m Morgen"),
		),
	).toBe("Am … Morgen");
	expect(
		unitTitleText(title("kannst-du-mich-morgen-vom-bahnhof-abholen", "vo")),
	).toBe("vom");
});

test("the clicked piece is the one marked in the title", () => {
	const { segments, members } = goldUnit(
		"der-laster-fuhr-das-schild-um",
		"fuhr um",
	);
	const clicked = unitTitleParts(segments, members, members[1]).flatMap(
		(part) => (part.kind === "Piece" && part.clicked ? [part.text] : []),
	);
	expect(clicked).toEqual(["um"]);
	expect(
		unitTitleParts(segments, members).some(
			(part) => part.kind === "Piece" && part.clicked,
		),
	).toBe(false);
});
