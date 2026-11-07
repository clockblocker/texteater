import type { CardProxyProps } from "./card-proxy";
import cardsJson from "./data/cards.json";

/** An entry of upstream's `public/data/cards.json`. */
type CardData = {
	readonly id: string;
	readonly set: string;
	readonly name: string;
	readonly supertype: string;
	readonly subtypes: readonly string[];
	readonly types?: readonly string[];
	readonly number: string;
	readonly rarity: string;
	readonly images: { readonly small: string; readonly large: string };
};

const cards: readonly CardData[] = cardsJson;

/* The props each list of `src/App.svelte` hands its CardProxies. */
const basic = (card: CardData): CardProxyProps => ({
	id: card.id,
	name: card.name,
	img: card.images.large,
	number: card.number,
	types: card.types,
	supertype: card.supertype,
	subtypes: card.subtypes,
});
const rare = (card: CardData): CardProxyProps => ({
	id: card.id,
	name: card.name,
	number: card.number,
	set: card.set,
	types: card.types,
	supertype: card.supertype,
	subtypes: card.subtypes,
	rarity: card.rarity,
});
const reverse = (card: CardData): CardProxyProps => ({
	...rare(card),
	isReverse: true,
});

/** `cards[0]`, the header's Card that runs the intro animation. */
export const SHOWCASE: CardProxyProps = {
	...rare(cards[0] as CardData),
	showcase: true,
};

export type Section = {
	/** Upstream's anchor, `⚓-<key>`. */
	readonly key: string;
	readonly title: string;
	readonly sup?: string;
	readonly cards: readonly CardProxyProps[];
	/** Upstream's paragraphs under the heading, for the inspector. */
	readonly copy: readonly string[];
};

/**
 * The page's sections in upstream's order, with the slices of `cards.json`
 * its `loadCards` deals them (cards 34 to 36 are in no section).
 */
export const SECTIONS: readonly Section[] = [
	{
		key: "common",
		title: "Common & Uncommon",
		cards: cards.slice(1, 4).map(basic),
		copy: [
			"All cards get a 3d rotation with CSS based on the cursor position. The default basic non-holo cards simply apply a flare/glare effect to the card which follows the mouse.",
		],
	},
	{
		key: "reverse",
		title: "Reverse Holo non-rares",
		cards: [...cards.slice(4, 7), ...cards.slice(70, 76)].map(reverse),
		copy: [
			"Reverse holo cards come in many shapes and sizes (trainer, stage1, and different energy types). Therefore there are a few examples here to show the different variations. The background uses a foil and a mask layer along with a glare. I also clip the glare into the image window to treat the image and the holofoil differently.",
		],
	},
	{
		key: "holo",
		title: "Holofoil Rare",
		cards: cards.slice(7, 13).map(rare),
		copy: [
			"Holo cards have an additional vertical beam holo effect. This uses a combintation of repeating gradients and filters, with clip-path to mask the holo areas for each stage. To get the holo effect to change while rotating the card I set the background-position of each gradient layer based on cursor.",
		],
	},
	{
		key: "galaxy",
		title: "Galaxy/Cosmos Holofoil",
		cards: cards.slice(13, 16).map(rare),
		copy: [
			"Similar to the Holofoil, but this uses a special image background of a galaxy effect with a gradient rainbow set to color-dodge & color-burn on top.",
			"An instant classic for any PTCG fan!",
		],
	},
	{
		key: "amazing",
		title: "Holofoil Amazing Rare",
		cards: cards.slice(76, 85).map(rare),
		copy: [
			"Amazing Rare cards have a very unique shiny foil that extends past the frame and is much shinier than a regular holo effect, and textured. We achieve this by using a mask and applying a glitter effect with a lighten filter.",
		],
	},
	{
		key: "radiant",
		title: "Radiant Holofoil",
		cards: cards.slice(16, 19).map(rare),
		copy: [
			"The newest holofoil added to the series! The radiant effect proved very difficult to emulate without crazy math, so I settled with a criss-cross linear gradient pattern that moves across the card.",
		],
	},
	{
		key: "trainer-gallery-holo",
		title: "Trainer Gallery Holofoil",
		cards: cards.slice(19, 22).map(rare),
		copy: [
			"The effect for Trainer Gallery holofoils gives it a kind of metallic effect with iridescent shine. This is achieved with a large color dodge linear gradient, and a hard-light radial gradient on top, at the cursor position, to give the shimmer.",
		],
	},
	{
		key: "v",
		title: "Pokemon V",
		cards: cards.slice(22, 25).map(rare),
		copy: [
			"V cards have a diagonal holographic effect which that appears to travel in opposite directions when you tilt the card into the light.",
			"This effect is achieved with multiple background gradients and I change the background positions based on the cursor x/y. The gradients are set to color-dodge, and there's a subtle svg noise effect.",
		],
	},
	{
		key: "v-full-art",
		title: "Pokemon V",
		sup: "(Full Art)",
		cards: cards.slice(25, 28).map(rare),
		copy: [
			"Similar to the Pokemon V effect, Full-Art cards use diagonal gradients, but they have additional texture when looked at from certain angles. This is achieved with an additional background image with an exclusion filter. The effect is also more vibrant which adds to the metallic look.",
			"The texture effect is not identical to reality as the real cards each have a unique pattern that follows the art.",
		],
	},
	{
		key: "v-alternate-art",
		title: "Pokemon V",
		sup: "(Alternate Art)",
		cards: cards.slice(28, 34).map(rare),
		copy: [
			"Alternate Art Pokemon V cards have practically the same holo effect as the Ultra Rare (Full Art) cards. The only difference is the pattern texture.",
			"The effect looks somewhat different though due to the type of artwork.",
		],
	},
	{
		key: "v-max",
		title: "VMax",
		cards: cards.slice(37, 40).map(rare),
		copy: [
			"The gradient effect of Pokemon VMax is more subtle, using a larger background gradient which moves more slowly. But the texture effect is more pronounced.",
		],
	},
	{
		key: "v-max-alternate",
		title: "VMax",
		sup: "(Alternate/Rainbow)",
		cards: cards.slice(40, 43).map(rare),
		copy: [
			"There's some VMax cards that show a full, or alternate artwork. These are classed as \"rainbow rare\" and have a similar effect to the rainbow cards. It's a really vibrant and glittery overlay.",
			"This is achieved with a background image of glitter/sparkles, and a texture pattern background image, sandwiching the usual linear gradients.",
		],
	},
	{
		key: "v-star",
		title: "VStar",
		cards: cards.slice(43, 46).map(rare),
		copy: [
			"Again back to the diagonal gradients overlaying a texture, VStar are quite similar to the Ultra Rare (Full/Alt) cards. The cards are generally brighter with a pastel hue, though, which makes the gradient and texture more subtle.",
		],
	},
	{
		key: "trainer-full-art",
		title: "Trainer Holo",
		sup: "(Full Art / Trainer Gallery)",
		cards: cards.slice(46, 52).map(rare),
		copy: [
			"Again back to the diagonal gradients overlaying a texture, VStar are quite similar to the Ultra Rare (Full/Alt) cards. The cards are generally brighter with a pastel hue, though, which makes the gradient and texture more subtle.",
		],
	},
	{
		key: "rainbow-rare",
		title: "Rainbow Rare",
		sup: "(VMax, VStar)",
		cards: cards.slice(52, 58).map(rare),
		copy: [
			"The Rainbow Rare is a super glittery effect on top of pastel gradients. This is achieved with a background image of glitter/sparkles and a color-burn/hard-light background blend for some pastel gradients.",
		],
	},
	{
		key: "secret-rare",
		title: "Secret Rare",
		sup: "(Gold)",
		cards: cards.slice(58, 64).map(rare),
		copy: [
			"GOLD! Here we apply two glitter layers on top of each other with a overlay effect and slide the two layers in opposite directions. We also mask the foil image with a gadient so that foil and glitter layers are mutually exclusive. The resulting effect is a shimmering glitter layer!",
		],
	},
	{
		key: "trainer-gallery-v",
		title: "Trainer Gallery",
		sup: "(V / VMax)",
		cards: cards.slice(64, 70).map(rare),
		copy: [
			"The V and VMax cards in the Trainer Gallery are generally quite similar to the normal V and VMax cards, so here I've just tweaked the values a little and added a different background texture.",
		],
	},
	{
		key: "shiny-vault",
		title: "Shiny Vault",
		sup: "(Basic / Stage 1 / V / VMax)",
		cards: cards.slice(85, 91).map(rare),
		copy: [
			"Shiny Vault cards have quite a unique effect in whereby the foil background is a shiny silver color. To achieve this we apply the foil image with some radial gradients to darken the foil over the background. This creates a slightly silver effect on top of the white card background. This effect works best in Firefox.",
		],
	},
];
