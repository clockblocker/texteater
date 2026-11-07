import {
	cover,
	fan,
	type Place,
	type Posed,
	pile,
	place,
	row,
	type Side,
	type SlotSpec,
} from "tabletop/core";
import { NOTE_CARDS, type NoteCard, noteCard } from "./words";

/**
 * The entry's model, pure: which Region each Note Card rests in and in what
 * order, which one is open as its Region's Cover, which side each shows,
 * the Ground Deck's pose and the words dealt from a click. Every Place and
 * Slot is derived from it.
 */

/** The Ground with its Deck, and the Pane beside it across the Split. */
export const REGIONS = ["ground", "pane"] as const;
export type RegionId = (typeof REGIONS)[number];

/** A Note Card's size in rem, and the height of its heading row. */
const CARD = { w: 16, h: 9 } as const;
const TAIL_REM = 2.5;
/** deck-of-cards' Cards are 88 px high: its px scale to ours by this. */
export const TRICK_SCALE = CARD.h / (88 / 16);

export type DeckPose = "pile" | "fan";

/** A word dealt as if clicked: the form clicked, and the Note its Knowledge makes. */
export type DealtWord = {
	readonly surface: string;
	readonly card: NoteCard;
	/** Whether its Knowledge has landed; until then the Card is busy, face down. */
	readonly ready: boolean;
};

export type Scene = {
	/** Each Region's Cards, bottom first. */
	readonly cards: Readonly<Record<RegionId, readonly string[]>>;
	readonly open: Readonly<Partial<Record<RegionId, string>>>;
	readonly sides: Readonly<Record<string, Side>>;
	readonly pose: DeckPose;
	/** How wide the Ground's fan spreads, in degrees. */
	readonly spread: number;
	/** Cards thrown away, still flying out at the Place they left. */
	readonly gone: Readonly<Record<string, Place>>;
	/** The words dealt so far, by id, in the order they were dealt. */
	readonly words: Readonly<Record<string, DealtWord>>;
};

export const DEALT = NOTE_CARDS.map((card) => card.id);

export function initialScene(spread = 260): Scene {
	return {
		cards: { ground: DEALT, pane: [] },
		open: {},
		sides: {},
		pose: "pile",
		spread,
		gone: {},
		words: {},
	};
}

/** Every Card the scene holds, dealt or not, in a stable order. */
export function cardIds(scene: Scene): string[] {
	return [...DEALT, ...Object.keys(scene.words)];
}

export function cardOf(scene: Scene, id: string): NoteCard | undefined {
	return scene.words[id]?.card ?? noteCard(id);
}

/** Whether `id` is a dealt word still waiting for its Knowledge. */
export function busy(scene: Scene, id: string): boolean {
	return scene.words[id]?.ready === false;
}

/**
 * Deals `word` onto the end of the Pane's row as `id`: face up when its
 * Knowledge is already there, face down with the clicked word otherwise.
 */
export function dealWord(
	scene: Scene,
	id: string,
	word: Omit<DealtWord, "ready">,
	ready: boolean,
): Scene {
	return {
		...scene,
		cards: { ...scene.cards, pane: [...scene.cards.pane, id] },
		sides: { ...scene.sides, [id]: ready ? "front" : "back" },
		words: { ...scene.words, [id]: { ...word, ready } },
	};
}

/** `id`'s Knowledge landed: it is no longer busy, and turns face up. */
export function landWord(scene: Scene, id: string): Scene {
	const word = scene.words[id];
	if (!word || word.ready) return scene;
	return {
		...scene,
		sides: { ...scene.sides, [id]: "front" },
		words: { ...scene.words, [id]: { ...word, ready: true } },
	};
}

/** The Ground Deck's rest for `order`: a pile showing each heading, or a fan. */
export function groundPose(
	order: readonly string[],
	pose: DeckPose,
	spread: number,
): Posed[] {
	if (pose === "fan")
		return fan(order, "ground", {
			card: CARD,
			spread,
			radius: (55 / 16) * TRICK_SCALE,
		});
	return pile(order, "ground", {
		card: CARD,
		step: { u: 0, v: TAIL_REM },
		origin: { u: 0, v: (-(order.length - 1) * TAIL_REM) / 2 },
	});
}

function posesOf(scene: Scene, region: RegionId): Posed[] {
	const order = scene.cards[region];
	return region === "ground"
		? groundPose(order, scene.pose, scene.spread)
		: row(order, "pane", { card: CARD, gap: 1, inset: 1 });
}

/** Every Slot the scene's Places rest on, by Region. */
export function slotsOf(scene: Scene): Record<RegionId, SlotSpec[]> {
	const slots = {} as Record<RegionId, SlotSpec[]>;
	for (const region of REGIONS)
		slots[region] = [
			...posesOf(scene, region).map((posed) => posed.slot),
			cover(region, { maxWidth: 40, inset: 1.5 }),
		];
	return slots;
}

const COVER_Z = 50;

/** Where every Card rests. A Card keeps its Deck rank while open. */
export function placesOf(scene: Scene): Map<string, Place> {
	const places = new Map<string, Place>(Object.entries(scene.gone));
	for (const region of REGIONS)
		posesOf(scene, region).forEach((posed, index) => {
			const side = scene.sides[posed.id] ?? "front";
			places.set(
				posed.id,
				scene.open[region] === posed.id
					? place(`${region}:cover`, {
							z: COVER_Z,
							side,
							form: "cover",
						})
					: place(posed.slot.id, {
							rotate: posed.rotate,
							z: index + 1,
							side,
						}),
			);
		});
	return places;
}

export function regionOf(scene: Scene, id: string): RegionId | null {
	return REGIONS.find((region) => scene.cards[region].includes(id)) ?? null;
}

/** Opens `id` as its Region's Cover; any Card open there goes back. */
export function openCard(scene: Scene, id: string): Scene {
	const region = regionOf(scene, id);
	if (!region) return scene;
	return { ...scene, open: { ...scene.open, [region]: id } };
}

/** `id` back in its Deck, if it was open. */
export function uncover(scene: Scene, id: string): Scene {
	const region = regionOf(scene, id);
	if (!region || scene.open[region] !== id) return scene;
	const open = { ...scene.open };
	delete open[region];
	return { ...scene, open };
}

export function closeCovers(scene: Scene): Scene {
	return { ...scene, open: {} };
}

function without(scene: Scene, id: string): Scene {
	const cards = { ...scene.cards };
	const open = { ...scene.open };
	for (const region of REGIONS) {
		cards[region] = cards[region].filter((other) => other !== id);
		if (open[region] === id) delete open[region];
	}
	return { ...scene, cards, open };
}

/** `id` moves to the top of `region`. */
export function moveCard(scene: Scene, id: string, region: RegionId): Scene {
	const rest = without(scene, id);
	return {
		...rest,
		cards: { ...rest.cards, [region]: [...rest.cards[region], id] },
	};
}

/** Turns `id` over, unless it waits for its Knowledge, which turns it. */
export function turnCard(scene: Scene, id: string): Scene {
	if (busy(scene, id)) return scene;
	const side = scene.sides[id] === "back" ? "front" : "back";
	return { ...scene, sides: { ...scene.sides, [id]: side } };
}

/** Turns every Card: face down when most are up, face up otherwise. */
export function turnAll(scene: Scene): Scene {
	const ids = REGIONS.flatMap((region) => scene.cards[region]).filter(
		(id) => !busy(scene, id),
	);
	const up = ids.filter((id) => scene.sides[id] !== "back").length;
	const side: Side = up / Math.max(ids.length, 1) > 0.5 ? "back" : "front";
	return {
		...scene,
		sides: {
			...scene.sides,
			...Object.fromEntries(ids.map((id) => [id, side])),
		},
	};
}

/** `id` leaves the scene, flying on from `from` until it is forgotten. */
export function throwAway(scene: Scene, id: string, from: Place): Scene {
	return { ...without(scene, id), gone: { ...scene.gone, [id]: from } };
}

export function forget(scene: Scene, id: string): Scene {
	const gone = { ...scene.gone };
	delete gone[id];
	const words = { ...scene.words };
	delete words[id];
	return { ...scene, gone, words };
}

/** The Ground Deck takes a trick's order and pose; its Cover closes. */
export function withDeck(
	scene: Scene,
	order: readonly string[],
	pose: DeckPose,
): Scene {
	const open = { ...scene.open };
	delete open.ground;
	return { ...scene, cards: { ...scene.cards, ground: order }, pose, open };
}

/**
 * Every Note Card back in the Ground Deck, dealt order, face up. Dealt
 * words gather in the Pane and keep their side.
 */
export function redeal(scene: Scene): Scene {
	const words = Object.keys(scene.words).filter((id) => !scene.gone[id]);
	const sides: Record<string, Side> = {};
	for (const id of words) sides[id] = scene.sides[id] ?? "front";
	return {
		...initialScene(scene.spread),
		cards: { ground: DEALT, pane: words },
		sides,
		words: Object.fromEntries(
			Object.entries(scene.words).filter(([id]) => words.includes(id)),
		),
	};
}
