/** The playground's own crib sheet: every move, and what it means. */

export const RULES = [
	{
		move: "Click a word",
		means: "Deals a Deck that belongs to the Sheet it was clicked in: the Text, or a Source Context inside a Note.",
	},
	{
		move: "Click a link",
		means: "Pushes a Cover over this Pane. Go to source pushes the Text, scrolled to the Sentence.",
	},
	{
		move: "Drag a word or link",
		means: "Lifts a Held Card. Drop on a side for a new Pane, in the band around its Deck to put it back, anywhere else in a Pane for a Cover. A lifted Sheet dropped in its own Pane goes back to its Deck, or closes if it has none.",
	},
	{
		move: "Drag ↑ a Card",
		means: "Takes it in hand. Far enough up, or flicked up, a ghost Cover shows where it opens, and letting go opens it; back down on the Deck, it rests. Any drag but a swipe is in hand at once, and a release does what the ghost and the Card's border show. Thrown right, it goes back on its Deck.",
	},
	{
		move: "Drag ← a Card",
		means: "Swipes the whole Deck, when the switch is on: it follows the finger and turns red past the line. Let go there, or throw it, and it is swept; short of it, it springs back. Pull well up, down or back right, or carry it slowly far left, and the Card tears loose: the Deck springs back and the Card is a plain drag. A throw drifts and still sweeps.",
	},
	{
		move: "← on a Cover",
		means: "Collapses it to its Card if that Card is still in a live Deck, else closes it.",
	},
	{
		move: "← on the Ground",
		means: "Steps one rung down the line: Text › Library › Menu. The Text's Deck goes with it.",
	},
	{
		move: "X",
		means: "Closes a Floating Pane. Its Note collapses back to its Card if the Deck is still live.",
	},
	{
		move: "× on a Cover",
		means: "Every Cover in the Pane leaves at once, each as its ← would, and the Ground shows.",
	},
	{
		move: "Click beside a Cover",
		means: "The gap between a Pane and its Covers is the Cover's ×.",
	},
	{
		move: "Drag a Cover's Heading",
		means: "Lifts the Cover into a Held Card. A Floating Ground lifts by its Pane bar the same way, and its Pane closes behind it.",
	},
	{
		move: "Hold the Pane bar",
		means: "About a second on a Rooted Ground's bar lifts the Text; the Pane steps down to the Library.",
	},
	{
		move: "Click the page, Esc",
		means: "Sweeps the top Sheet's Deck.",
	},
];
