import { lexemeANFixtures } from "./lexeme-a-n";
import { lexemePZFixtures } from "./lexeme-p-z";
import { morphemeFixtures } from "./morpheme";
import { phrasemeFixtures } from "./phraseme";

export const NOTE_STUDY_FIXTURES = [
	...lexemeANFixtures,
	...lexemePZFixtures,
	...phrasemeFixtures,
	...morphemeFixtures,
] as const;
