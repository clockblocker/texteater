import altArts from "./data/alternate-arts.json";
import promos from "./data/promos.json";

/**
 * `src/lib/components/CardProxy.svelte`: from a card's data, works out the
 * rarity the CSS keys on and the front, foil and mask image URLs. The foils
 * and masks come from upstream's `VITE_CDN`, which its repository leaves out;
 * the live demo builds with `https://poke-holo.b-cdn.net`.
 */
const CDN = "https://poke-holo.b-cdn.net";

/** The props upstream's App passes to a CardProxy. */
export type CardProxyProps = {
	readonly id?: string;
	readonly name?: string;
	readonly number?: string;
	readonly set?: string;
	readonly types?: readonly string[];
	readonly subtypes?: readonly string[];
	readonly supertype?: string;
	readonly rarity?: string;
	readonly isReverse?: boolean;
	readonly img?: string;
	readonly back?: string;
	readonly foil?: string | false;
	readonly mask?: string | false;
	readonly showcase?: boolean;
};

/** What CardProxy hands the Card. */
export type ProxiedCard = Omit<
	CardProxyProps,
	"isReverse" | "foil" | "mask"
> & {
	readonly img: string;
	readonly foil: string;
	readonly mask: string;
};

const promoStyles: {
	readonly [id: string]:
		| { readonly style: string; readonly etch: string }
		| undefined;
} = promos;

type Kind = {
	/** Shiny Vault Card (starts with sv) */
	readonly isShiny: boolean;
	/** Trainer / Galar Gallery Card (not shiny) */
	readonly isGallery: boolean;
	/** Alternate Art Card (not shiny / gallery) */
	readonly isAlternate: boolean;
	/** Promo Card */
	readonly isPromo: boolean;
};

/** A foil's etch and style, and the rarity upstream rewrites on the way. */
type Foil = {
	readonly etch: string;
	readonly style: string;
	readonly rarity: string | undefined;
};

/* upstream's chain of `if (fRarity === …)`, whose cases never overlap */
const RARITY_FOILS: { readonly [rarity: string]: readonly [string, string] } = {
	"rare holo": ["holo", "swholo"],
	"rare holo cosmos": ["holo", "cosmos"],
	"radiant rare": ["etched", "radiantholo"],
	"rare holo v": ["holo", "sunpillar"],
	"rare holo vunion": ["holo", "sunpillar"],
	"basic v": ["holo", "sunpillar"],
	"rare holo vmax": ["etched", "sunpillar"],
	"rare ultra": ["etched", "sunpillar"],
	"rare holo vstar": ["etched", "sunpillar"],
	"amazing rare": ["etched", "swsecret"],
	"rare rainbow": ["etched", "swsecret"],
	"rare secret": ["etched", "swsecret"],
};

/** The rarity after the `isReverse`, gallery and promo rewrites at the top of CardProxy. */
function listedRarity(props: CardProxyProps, kind: Kind): string | undefined {
	const { id, subtypes } = props;
	let rarity = props.rarity;
	if (props.isReverse) {
		rarity = `${rarity} Reverse Holo`;
	}
	if (kind.isGallery) {
		if (rarity?.startsWith("Trainer Gallery")) {
			rarity = rarity.replace(/Trainer Gallery\s*/, "");
		}
		if (rarity?.includes("Rare Holo V") && subtypes?.includes("VMAX")) {
			rarity = "Rare Holo VMAX";
		}
		if (rarity?.includes("Rare Holo V") && subtypes?.includes("VSTAR")) {
			rarity = "Rare Holo VSTAR";
		}
	}
	if (kind.isPromo) {
		rarity = promoRarity(id, subtypes) ?? rarity;
	}
	return rarity;
}

function promoRarity(
	id: string | undefined,
	subtypes: readonly string[] | undefined,
): string | undefined {
	if (id === "swshp-SWSH076" || id === "swshp-SWSH077") return "Rare Secret";
	if (subtypes?.includes("V")) return "Rare Holo V";
	if (subtypes?.includes("V-UNION")) return "Rare Holo VUNION";
	if (subtypes?.includes("VMAX")) return "Rare Holo VMAX";
	if (subtypes?.includes("VSTAR")) return "Rare Holo VSTAR";
	if (subtypes?.includes("Radiant")) return "Radiant Rare";
	return undefined;
}

function shinyFoil(foil: Foil, fRarity: string, fNumber: string): Foil {
	let { rarity, style } = foil;
	const etch = "etched";
	style = "sunpillar";
	if (
		fRarity === "rare shiny v" ||
		(fRarity === "rare holo v" && fNumber.startsWith("sv"))
	) {
		rarity = "Rare Shiny V";
	}
	if (
		fRarity === "rare shiny vmax" ||
		(fRarity === "rare holo vmax" && fNumber.startsWith("sv"))
	) {
		style = "swsecret";
		rarity = "Rare Shiny VMAX";
	}
	return { etch, style, rarity };
}

function galleryFoil(foil: Foil, fRarity: string): Foil {
	let etch = "holo";
	let style = "rainbow";
	if (fRarity.includes("rare holo v") || fRarity.includes("rare ultra")) {
		etch = "etched";
		style = "sunpillar";
	}
	if (fRarity.includes("rare secret")) {
		etch = "etched";
		style = "swsecret";
	}
	return { ...foil, etch, style };
}

function alternateFoil(foil: Foil, subtypes: readonly string[]): Foil {
	if (subtypes.includes("VMAX")) {
		return {
			etch: "etched",
			style: "swsecret",
			rarity: "Rare Rainbow Alt",
		};
	}
	return { ...foil, etch: "etched", style: "sunpillar" };
}

function promoFoil(foil: Foil, id: string | undefined): Foil {
	const promoStyle = id === undefined ? undefined : promoStyles[id];
	if (!promoStyle) return foil;
	const style = promoStyle.style.toLowerCase();
	const etch = promoStyle.etch.toLowerCase();
	let rarity = foil.rarity;
	if (style === "swholo") {
		rarity = "Rare Holo";
	} else if (style === "cosmos") {
		rarity = "Rare Holo Cosmos";
	}
	return { etch, style, rarity };
}

/**
 * Upstream's `foilMaskImage`: the URL of a card's foil or mask, and the
 * rarity it rewrites along the way, which the next call and the Card read.
 */
function foilMaskImage(
	props: CardProxyProps,
	kind: Kind,
	rarity: string | undefined,
	prop: string | false | undefined,
	type: "masks" | "foils",
): { readonly url: string; readonly rarity: string | undefined } {
	const { id, number, set, subtypes, supertype } = props;
	if (prop !== undefined) {
		return { url: prop === false ? "" : prop, rarity };
	}
	if (
		rarity === undefined ||
		subtypes === undefined ||
		supertype === undefined ||
		set === undefined ||
		number === undefined
	) {
		return { url: "", rarity };
	}

	const fRarity = rarity.toLowerCase();
	const fNumber = number
		.toString()
		.toLowerCase()
		.replace("swsh", "")
		.padStart(3, "0");
	const fSet = set
		.toString()
		.toLowerCase()
		.replace(/(tg|gg|sv)/, "");
	const [etch, style] = RARITY_FOILS[fRarity] ?? ["holo", "reverse"];

	let foil: Foil = { etch, style, rarity };
	if (kind.isShiny) foil = shinyFoil(foil, fRarity, fNumber);
	if (kind.isGallery) foil = galleryFoil(foil, fRarity);
	if (kind.isAlternate) foil = alternateFoil(foil, subtypes);
	if (kind.isPromo) foil = promoFoil(foil, id);

	const ext = "webp";
	return {
		url: `${CDN}/foils/${fSet}/${type}/upscaled/${fNumber}_foil_${foil.etch}_${foil.style}_2x.${ext}`,
		rarity: foil.rarity,
	};
}

function cardImage({ img, set, number }: CardProxyProps): string {
	if (img !== undefined) return img;
	if (set !== undefined && number !== undefined) {
		return `https://images.pokemontcg.io/${set.toLowerCase()}/${number}_hires.png`;
	}
	return "";
}

export function proxyCard(props: CardProxyProps): ProxiedCard {
	const { id, number, set } = props;
	const isShiny = !!number?.toLowerCase().startsWith("sv");
	const isGallery = !!number?.match(/^[tg]g/i);
	const kind: Kind = {
		isShiny,
		isGallery,
		isAlternate:
			id !== undefined && altArts.includes(id) && !isShiny && !isGallery,
		isPromo: set === "swshp",
	};

	/* Upstream reads `rarity` into the Card's props only after building the
	   foil and then the mask, which may each rewrite it. */
	const foil = foilMaskImage(
		props,
		kind,
		listedRarity(props, kind),
		props.foil,
		"foils",
	);
	const mask = foilMaskImage(props, kind, foil.rarity, props.mask, "masks");
	return {
		img: cardImage(props),
		back: props.back,
		foil: foil.url,
		mask: mask.url,
		id,
		name: props.name,
		number,
		set,
		types: props.types,
		subtypes: props.subtypes,
		supertype: props.supertype,
		rarity: mask.rarity,
		showcase: props.showcase,
	};
}
