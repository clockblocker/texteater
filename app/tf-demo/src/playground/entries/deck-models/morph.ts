/**
 * MORPH — the spring a Note's box rides between forms, in one place.
 *
 * The Compass prototype animates a Note's left, top, width and height on
 * it whenever the model hands the Note a new box (deck slot, Sheet box, or
 * the hand), and the Heading's row height and title size with it. The
 * Animation workbench evaluates the same spring in closed form, so a change
 * here is the change in both.
 */
export const MORPH = { type: "spring", stiffness: 380, damping: 38 } as const;
