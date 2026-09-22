// Generated public DTOs.
type _Output1 = "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
type _Output2 = string;
type _Output0 = { kind: _Output1; text: _Output2 };
type _Output4 = string;
type _Output5 = "de" | "en" | "he";
type _Output6 = Array<_Output0>;
type _Output3 = { id: _Output4; language: _Output5; segments: _Output6 };
type _Output9 = "Accepted";
type _Output10 = "en";
type _Output12 = "en";
type _Output11 = { id: _Output4; language: _Output12; segments: _Output6 };
type _Output8 = {
	decision: _Output9;
	language: _Output10;
	sentence: _Output11;
};
type _Output14 = "Accepted";
type _Output15 = "de";
type _Output17 = "de";
type _Output16 = { id: _Output4; language: _Output17; segments: _Output6 };
type _Output13 = {
	decision: _Output14;
	language: _Output15;
	sentence: _Output16;
};
type _Output19 = "Accepted";
type _Output20 = "he";
type _Output22 = "he";
type _Output21 = { id: _Output4; language: _Output22; segments: _Output6 };
type _Output18 = {
	decision: _Output19;
	language: _Output20;
	sentence: _Output21;
};
type _Output24 = "UnsupportedLanguage";
type _Output23 = { decision: _Output24 };
type _Output26 = "Unintelligible";
type _Output25 = { decision: _Output26 };
type _Output7 = _Output8 | _Output13 | _Output18 | _Output23 | _Output25;
type _Output30 = "de";
type _Output29 = { id: _Output4; language: _Output30; segments: _Output6 };
type _Output32 = "Lexeme";
type _Output33 = "ADJ";
type _Output35 = number;
type _Output34 = [_Output35, ...Array<_Output35>];
type _Output31 = {
	family: _Output32;
	kind: _Output33;
	memberSegmentIndices: _Output34;
};
type _Output28 = { sentence: _Output29; target: _Output31 };
type _Output38 = "de";
type _Output37 = { id: _Output4; language: _Output38; segments: _Output6 };
type _Output40 = "Lexeme";
type _Output41 = "ADP";
type _Output39 = {
	family: _Output40;
	kind: _Output41;
	memberSegmentIndices: _Output34;
};
type _Output36 = { sentence: _Output37; target: _Output39 };
type _Output44 = "de";
type _Output43 = { id: _Output4; language: _Output44; segments: _Output6 };
type _Output46 = "Lexeme";
type _Output47 = "ADV";
type _Output45 = {
	family: _Output46;
	kind: _Output47;
	memberSegmentIndices: _Output34;
};
type _Output42 = { sentence: _Output43; target: _Output45 };
type _Output50 = "de";
type _Output49 = { id: _Output4; language: _Output50; segments: _Output6 };
type _Output52 = "Lexeme";
type _Output53 = "AUX";
type _Output51 = {
	family: _Output52;
	kind: _Output53;
	memberSegmentIndices: _Output34;
};
type _Output48 = { sentence: _Output49; target: _Output51 };
type _Output56 = "de";
type _Output55 = { id: _Output4; language: _Output56; segments: _Output6 };
type _Output58 = "Lexeme";
type _Output59 = "CCONJ";
type _Output57 = {
	family: _Output58;
	kind: _Output59;
	memberSegmentIndices: _Output34;
};
type _Output54 = { sentence: _Output55; target: _Output57 };
type _Output62 = "de";
type _Output61 = { id: _Output4; language: _Output62; segments: _Output6 };
type _Output64 = "Lexeme";
type _Output65 = "DET";
type _Output63 = {
	family: _Output64;
	kind: _Output65;
	memberSegmentIndices: _Output34;
};
type _Output60 = { sentence: _Output61; target: _Output63 };
type _Output68 = "de";
type _Output67 = { id: _Output4; language: _Output68; segments: _Output6 };
type _Output70 = "Lexeme";
type _Output71 = "INTJ";
type _Output69 = {
	family: _Output70;
	kind: _Output71;
	memberSegmentIndices: _Output34;
};
type _Output66 = { sentence: _Output67; target: _Output69 };
type _Output74 = "de";
type _Output73 = { id: _Output4; language: _Output74; segments: _Output6 };
type _Output76 = "Lexeme";
type _Output77 = "NOUN";
type _Output75 = {
	family: _Output76;
	kind: _Output77;
	memberSegmentIndices: _Output34;
};
type _Output72 = { sentence: _Output73; target: _Output75 };
type _Output80 = "de";
type _Output79 = { id: _Output4; language: _Output80; segments: _Output6 };
type _Output82 = "Lexeme";
type _Output83 = "NUM";
type _Output81 = {
	family: _Output82;
	kind: _Output83;
	memberSegmentIndices: _Output34;
};
type _Output78 = { sentence: _Output79; target: _Output81 };
type _Output86 = "de";
type _Output85 = { id: _Output4; language: _Output86; segments: _Output6 };
type _Output88 = "Lexeme";
type _Output89 = "X";
type _Output87 = {
	family: _Output88;
	kind: _Output89;
	memberSegmentIndices: _Output34;
};
type _Output84 = { sentence: _Output85; target: _Output87 };
type _Output92 = "de";
type _Output91 = { id: _Output4; language: _Output92; segments: _Output6 };
type _Output94 = "Lexeme";
type _Output95 = "PART";
type _Output93 = {
	family: _Output94;
	kind: _Output95;
	memberSegmentIndices: _Output34;
};
type _Output90 = { sentence: _Output91; target: _Output93 };
type _Output98 = "de";
type _Output97 = { id: _Output4; language: _Output98; segments: _Output6 };
type _Output100 = "Lexeme";
type _Output101 = "PRON";
type _Output99 = {
	family: _Output100;
	kind: _Output101;
	memberSegmentIndices: _Output34;
};
type _Output96 = { sentence: _Output97; target: _Output99 };
type _Output104 = "de";
type _Output103 = { id: _Output4; language: _Output104; segments: _Output6 };
type _Output106 = "Lexeme";
type _Output107 = "PROPN";
type _Output105 = {
	family: _Output106;
	kind: _Output107;
	memberSegmentIndices: _Output34;
};
type _Output102 = { sentence: _Output103; target: _Output105 };
type _Output110 = "de";
type _Output109 = { id: _Output4; language: _Output110; segments: _Output6 };
type _Output112 = "Lexeme";
type _Output113 = "PUNCT";
type _Output111 = {
	family: _Output112;
	kind: _Output113;
	memberSegmentIndices: _Output34;
};
type _Output108 = { sentence: _Output109; target: _Output111 };
type _Output116 = "de";
type _Output115 = { id: _Output4; language: _Output116; segments: _Output6 };
type _Output118 = "Lexeme";
type _Output119 = "SCONJ";
type _Output117 = {
	family: _Output118;
	kind: _Output119;
	memberSegmentIndices: _Output34;
};
type _Output114 = { sentence: _Output115; target: _Output117 };
type _Output122 = "de";
type _Output121 = { id: _Output4; language: _Output122; segments: _Output6 };
type _Output124 = "Lexeme";
type _Output125 = "SYM";
type _Output123 = {
	family: _Output124;
	kind: _Output125;
	memberSegmentIndices: _Output34;
};
type _Output120 = { sentence: _Output121; target: _Output123 };
type _Output128 = "de";
type _Output127 = { id: _Output4; language: _Output128; segments: _Output6 };
type _Output130 = "Lexeme";
type _Output131 = "VERB";
type _Output129 = {
	family: _Output130;
	kind: _Output131;
	memberSegmentIndices: _Output34;
};
type _Output126 = { sentence: _Output127; target: _Output129 };
type _Output134 = "de";
type _Output133 = { id: _Output4; language: _Output134; segments: _Output6 };
type _Output136 = "Morpheme";
type _Output137 = "Circumfix";
type _Output135 = {
	family: _Output136;
	kind: _Output137;
	memberSegmentIndices: _Output34;
};
type _Output132 = { sentence: _Output133; target: _Output135 };
type _Output140 = "de";
type _Output139 = { id: _Output4; language: _Output140; segments: _Output6 };
type _Output142 = "Morpheme";
type _Output143 = "Clitic";
type _Output141 = {
	family: _Output142;
	kind: _Output143;
	memberSegmentIndices: _Output34;
};
type _Output138 = { sentence: _Output139; target: _Output141 };
type _Output146 = "de";
type _Output145 = { id: _Output4; language: _Output146; segments: _Output6 };
type _Output148 = "Morpheme";
type _Output149 = "Duplifix";
type _Output147 = {
	family: _Output148;
	kind: _Output149;
	memberSegmentIndices: _Output34;
};
type _Output144 = { sentence: _Output145; target: _Output147 };
type _Output152 = "de";
type _Output151 = { id: _Output4; language: _Output152; segments: _Output6 };
type _Output154 = "Morpheme";
type _Output155 = "Infix";
type _Output153 = {
	family: _Output154;
	kind: _Output155;
	memberSegmentIndices: _Output34;
};
type _Output150 = { sentence: _Output151; target: _Output153 };
type _Output158 = "de";
type _Output157 = { id: _Output4; language: _Output158; segments: _Output6 };
type _Output160 = "Morpheme";
type _Output161 = "Interfix";
type _Output159 = {
	family: _Output160;
	kind: _Output161;
	memberSegmentIndices: _Output34;
};
type _Output156 = { sentence: _Output157; target: _Output159 };
type _Output164 = "de";
type _Output163 = { id: _Output4; language: _Output164; segments: _Output6 };
type _Output166 = "Morpheme";
type _Output167 = "Prefix";
type _Output165 = {
	family: _Output166;
	kind: _Output167;
	memberSegmentIndices: _Output34;
};
type _Output162 = { sentence: _Output163; target: _Output165 };
type _Output170 = "de";
type _Output169 = { id: _Output4; language: _Output170; segments: _Output6 };
type _Output172 = "Morpheme";
type _Output173 = "Root";
type _Output171 = {
	family: _Output172;
	kind: _Output173;
	memberSegmentIndices: _Output34;
};
type _Output168 = { sentence: _Output169; target: _Output171 };
type _Output176 = "de";
type _Output175 = { id: _Output4; language: _Output176; segments: _Output6 };
type _Output178 = "Morpheme";
type _Output179 = "Suffix";
type _Output177 = {
	family: _Output178;
	kind: _Output179;
	memberSegmentIndices: _Output34;
};
type _Output174 = { sentence: _Output175; target: _Output177 };
type _Output182 = "de";
type _Output181 = { id: _Output4; language: _Output182; segments: _Output6 };
type _Output184 = "Morpheme";
type _Output185 = "Suffixoid";
type _Output183 = {
	family: _Output184;
	kind: _Output185;
	memberSegmentIndices: _Output34;
};
type _Output180 = { sentence: _Output181; target: _Output183 };
type _Output188 = "de";
type _Output187 = { id: _Output4; language: _Output188; segments: _Output6 };
type _Output190 = "Morpheme";
type _Output191 = "Transfix";
type _Output189 = {
	family: _Output190;
	kind: _Output191;
	memberSegmentIndices: _Output34;
};
type _Output186 = { sentence: _Output187; target: _Output189 };
type _Output194 = "de";
type _Output193 = { id: _Output4; language: _Output194; segments: _Output6 };
type _Output196 = "Phraseme";
type _Output197 = "Aphorism";
type _Output195 = {
	family: _Output196;
	kind: _Output197;
	memberSegmentIndices: _Output34;
};
type _Output192 = { sentence: _Output193; target: _Output195 };
type _Output200 = "de";
type _Output199 = { id: _Output4; language: _Output200; segments: _Output6 };
type _Output202 = "Phraseme";
type _Output203 = "Collocation";
type _Output201 = {
	family: _Output202;
	kind: _Output203;
	memberSegmentIndices: _Output34;
};
type _Output198 = { sentence: _Output199; target: _Output201 };
type _Output206 = "de";
type _Output205 = { id: _Output4; language: _Output206; segments: _Output6 };
type _Output208 = "Phraseme";
type _Output209 = "DiscourseFormula";
type _Output207 = {
	family: _Output208;
	kind: _Output209;
	memberSegmentIndices: _Output34;
};
type _Output204 = { sentence: _Output205; target: _Output207 };
type _Output212 = "de";
type _Output211 = { id: _Output4; language: _Output212; segments: _Output6 };
type _Output214 = "Phraseme";
type _Output215 = "Idiom";
type _Output213 = {
	family: _Output214;
	kind: _Output215;
	memberSegmentIndices: _Output34;
};
type _Output210 = { sentence: _Output211; target: _Output213 };
type _Output218 = "de";
type _Output217 = { id: _Output4; language: _Output218; segments: _Output6 };
type _Output220 = "Phraseme";
type _Output221 = "Proverb";
type _Output219 = {
	family: _Output220;
	kind: _Output221;
	memberSegmentIndices: _Output34;
};
type _Output216 = { sentence: _Output217; target: _Output219 };
type _Output224 = "en";
type _Output223 = { id: _Output4; language: _Output224; segments: _Output6 };
type _Output226 = "Lexeme";
type _Output227 = "ADJ";
type _Output225 = {
	family: _Output226;
	kind: _Output227;
	memberSegmentIndices: _Output34;
};
type _Output222 = { sentence: _Output223; target: _Output225 };
type _Output230 = "en";
type _Output229 = { id: _Output4; language: _Output230; segments: _Output6 };
type _Output232 = "Lexeme";
type _Output233 = "ADP";
type _Output231 = {
	family: _Output232;
	kind: _Output233;
	memberSegmentIndices: _Output34;
};
type _Output228 = { sentence: _Output229; target: _Output231 };
type _Output236 = "en";
type _Output235 = { id: _Output4; language: _Output236; segments: _Output6 };
type _Output238 = "Lexeme";
type _Output239 = "ADV";
type _Output237 = {
	family: _Output238;
	kind: _Output239;
	memberSegmentIndices: _Output34;
};
type _Output234 = { sentence: _Output235; target: _Output237 };
type _Output242 = "en";
type _Output241 = { id: _Output4; language: _Output242; segments: _Output6 };
type _Output244 = "Lexeme";
type _Output245 = "AUX";
type _Output243 = {
	family: _Output244;
	kind: _Output245;
	memberSegmentIndices: _Output34;
};
type _Output240 = { sentence: _Output241; target: _Output243 };
type _Output248 = "en";
type _Output247 = { id: _Output4; language: _Output248; segments: _Output6 };
type _Output250 = "Lexeme";
type _Output251 = "CCONJ";
type _Output249 = {
	family: _Output250;
	kind: _Output251;
	memberSegmentIndices: _Output34;
};
type _Output246 = { sentence: _Output247; target: _Output249 };
type _Output254 = "en";
type _Output253 = { id: _Output4; language: _Output254; segments: _Output6 };
type _Output256 = "Lexeme";
type _Output257 = "DET";
type _Output255 = {
	family: _Output256;
	kind: _Output257;
	memberSegmentIndices: _Output34;
};
type _Output252 = { sentence: _Output253; target: _Output255 };
type _Output260 = "en";
type _Output259 = { id: _Output4; language: _Output260; segments: _Output6 };
type _Output262 = "Lexeme";
type _Output263 = "INTJ";
type _Output261 = {
	family: _Output262;
	kind: _Output263;
	memberSegmentIndices: _Output34;
};
type _Output258 = { sentence: _Output259; target: _Output261 };
type _Output266 = "en";
type _Output265 = { id: _Output4; language: _Output266; segments: _Output6 };
type _Output268 = "Lexeme";
type _Output269 = "NOUN";
type _Output267 = {
	family: _Output268;
	kind: _Output269;
	memberSegmentIndices: _Output34;
};
type _Output264 = { sentence: _Output265; target: _Output267 };
type _Output272 = "en";
type _Output271 = { id: _Output4; language: _Output272; segments: _Output6 };
type _Output274 = "Lexeme";
type _Output275 = "NUM";
type _Output273 = {
	family: _Output274;
	kind: _Output275;
	memberSegmentIndices: _Output34;
};
type _Output270 = { sentence: _Output271; target: _Output273 };
type _Output278 = "en";
type _Output277 = { id: _Output4; language: _Output278; segments: _Output6 };
type _Output280 = "Lexeme";
type _Output281 = "X";
type _Output279 = {
	family: _Output280;
	kind: _Output281;
	memberSegmentIndices: _Output34;
};
type _Output276 = { sentence: _Output277; target: _Output279 };
type _Output284 = "en";
type _Output283 = { id: _Output4; language: _Output284; segments: _Output6 };
type _Output286 = "Lexeme";
type _Output287 = "PART";
type _Output285 = {
	family: _Output286;
	kind: _Output287;
	memberSegmentIndices: _Output34;
};
type _Output282 = { sentence: _Output283; target: _Output285 };
type _Output290 = "en";
type _Output289 = { id: _Output4; language: _Output290; segments: _Output6 };
type _Output292 = "Lexeme";
type _Output293 = "PRON";
type _Output291 = {
	family: _Output292;
	kind: _Output293;
	memberSegmentIndices: _Output34;
};
type _Output288 = { sentence: _Output289; target: _Output291 };
type _Output296 = "en";
type _Output295 = { id: _Output4; language: _Output296; segments: _Output6 };
type _Output298 = "Lexeme";
type _Output299 = "PROPN";
type _Output297 = {
	family: _Output298;
	kind: _Output299;
	memberSegmentIndices: _Output34;
};
type _Output294 = { sentence: _Output295; target: _Output297 };
type _Output302 = "en";
type _Output301 = { id: _Output4; language: _Output302; segments: _Output6 };
type _Output304 = "Lexeme";
type _Output305 = "PUNCT";
type _Output303 = {
	family: _Output304;
	kind: _Output305;
	memberSegmentIndices: _Output34;
};
type _Output300 = { sentence: _Output301; target: _Output303 };
type _Output308 = "en";
type _Output307 = { id: _Output4; language: _Output308; segments: _Output6 };
type _Output310 = "Lexeme";
type _Output311 = "SCONJ";
type _Output309 = {
	family: _Output310;
	kind: _Output311;
	memberSegmentIndices: _Output34;
};
type _Output306 = { sentence: _Output307; target: _Output309 };
type _Output314 = "en";
type _Output313 = { id: _Output4; language: _Output314; segments: _Output6 };
type _Output316 = "Lexeme";
type _Output317 = "SYM";
type _Output315 = {
	family: _Output316;
	kind: _Output317;
	memberSegmentIndices: _Output34;
};
type _Output312 = { sentence: _Output313; target: _Output315 };
type _Output320 = "en";
type _Output319 = { id: _Output4; language: _Output320; segments: _Output6 };
type _Output322 = "Lexeme";
type _Output323 = "VERB";
type _Output321 = {
	family: _Output322;
	kind: _Output323;
	memberSegmentIndices: _Output34;
};
type _Output318 = { sentence: _Output319; target: _Output321 };
type _Output326 = "en";
type _Output325 = { id: _Output4; language: _Output326; segments: _Output6 };
type _Output328 = "Morpheme";
type _Output329 = "Circumfix";
type _Output327 = {
	family: _Output328;
	kind: _Output329;
	memberSegmentIndices: _Output34;
};
type _Output324 = { sentence: _Output325; target: _Output327 };
type _Output332 = "en";
type _Output331 = { id: _Output4; language: _Output332; segments: _Output6 };
type _Output334 = "Morpheme";
type _Output335 = "Clitic";
type _Output333 = {
	family: _Output334;
	kind: _Output335;
	memberSegmentIndices: _Output34;
};
type _Output330 = { sentence: _Output331; target: _Output333 };
type _Output338 = "en";
type _Output337 = { id: _Output4; language: _Output338; segments: _Output6 };
type _Output340 = "Morpheme";
type _Output341 = "Duplifix";
type _Output339 = {
	family: _Output340;
	kind: _Output341;
	memberSegmentIndices: _Output34;
};
type _Output336 = { sentence: _Output337; target: _Output339 };
type _Output344 = "en";
type _Output343 = { id: _Output4; language: _Output344; segments: _Output6 };
type _Output346 = "Morpheme";
type _Output347 = "Infix";
type _Output345 = {
	family: _Output346;
	kind: _Output347;
	memberSegmentIndices: _Output34;
};
type _Output342 = { sentence: _Output343; target: _Output345 };
type _Output350 = "en";
type _Output349 = { id: _Output4; language: _Output350; segments: _Output6 };
type _Output352 = "Morpheme";
type _Output353 = "Interfix";
type _Output351 = {
	family: _Output352;
	kind: _Output353;
	memberSegmentIndices: _Output34;
};
type _Output348 = { sentence: _Output349; target: _Output351 };
type _Output356 = "en";
type _Output355 = { id: _Output4; language: _Output356; segments: _Output6 };
type _Output358 = "Morpheme";
type _Output359 = "Prefix";
type _Output357 = {
	family: _Output358;
	kind: _Output359;
	memberSegmentIndices: _Output34;
};
type _Output354 = { sentence: _Output355; target: _Output357 };
type _Output362 = "en";
type _Output361 = { id: _Output4; language: _Output362; segments: _Output6 };
type _Output364 = "Morpheme";
type _Output365 = "Root";
type _Output363 = {
	family: _Output364;
	kind: _Output365;
	memberSegmentIndices: _Output34;
};
type _Output360 = { sentence: _Output361; target: _Output363 };
type _Output368 = "en";
type _Output367 = { id: _Output4; language: _Output368; segments: _Output6 };
type _Output370 = "Morpheme";
type _Output371 = "Suffix";
type _Output369 = {
	family: _Output370;
	kind: _Output371;
	memberSegmentIndices: _Output34;
};
type _Output366 = { sentence: _Output367; target: _Output369 };
type _Output374 = "en";
type _Output373 = { id: _Output4; language: _Output374; segments: _Output6 };
type _Output376 = "Morpheme";
type _Output377 = "Suffixoid";
type _Output375 = {
	family: _Output376;
	kind: _Output377;
	memberSegmentIndices: _Output34;
};
type _Output372 = { sentence: _Output373; target: _Output375 };
type _Output380 = "en";
type _Output379 = { id: _Output4; language: _Output380; segments: _Output6 };
type _Output382 = "Morpheme";
type _Output383 = "ToneMarking";
type _Output381 = {
	family: _Output382;
	kind: _Output383;
	memberSegmentIndices: _Output34;
};
type _Output378 = { sentence: _Output379; target: _Output381 };
type _Output386 = "en";
type _Output385 = { id: _Output4; language: _Output386; segments: _Output6 };
type _Output388 = "Morpheme";
type _Output389 = "Transfix";
type _Output387 = {
	family: _Output388;
	kind: _Output389;
	memberSegmentIndices: _Output34;
};
type _Output384 = { sentence: _Output385; target: _Output387 };
type _Output392 = "en";
type _Output391 = { id: _Output4; language: _Output392; segments: _Output6 };
type _Output394 = "Phraseme";
type _Output395 = "Aphorism";
type _Output393 = {
	family: _Output394;
	kind: _Output395;
	memberSegmentIndices: _Output34;
};
type _Output390 = { sentence: _Output391; target: _Output393 };
type _Output398 = "en";
type _Output397 = { id: _Output4; language: _Output398; segments: _Output6 };
type _Output400 = "Phraseme";
type _Output401 = "DiscourseFormula";
type _Output399 = {
	family: _Output400;
	kind: _Output401;
	memberSegmentIndices: _Output34;
};
type _Output396 = { sentence: _Output397; target: _Output399 };
type _Output404 = "en";
type _Output403 = { id: _Output4; language: _Output404; segments: _Output6 };
type _Output406 = "Phraseme";
type _Output407 = "Idiom";
type _Output405 = {
	family: _Output406;
	kind: _Output407;
	memberSegmentIndices: _Output34;
};
type _Output402 = { sentence: _Output403; target: _Output405 };
type _Output410 = "en";
type _Output409 = { id: _Output4; language: _Output410; segments: _Output6 };
type _Output412 = "Phraseme";
type _Output413 = "Proverb";
type _Output411 = {
	family: _Output412;
	kind: _Output413;
	memberSegmentIndices: _Output34;
};
type _Output408 = { sentence: _Output409; target: _Output411 };
type _Output416 = "he";
type _Output415 = { id: _Output4; language: _Output416; segments: _Output6 };
type _Output418 = "Lexeme";
type _Output419 = "ADJ";
type _Output417 = {
	family: _Output418;
	kind: _Output419;
	memberSegmentIndices: _Output34;
};
type _Output414 = { sentence: _Output415; target: _Output417 };
type _Output422 = "he";
type _Output421 = { id: _Output4; language: _Output422; segments: _Output6 };
type _Output424 = "Lexeme";
type _Output425 = "ADP";
type _Output423 = {
	family: _Output424;
	kind: _Output425;
	memberSegmentIndices: _Output34;
};
type _Output420 = { sentence: _Output421; target: _Output423 };
type _Output428 = "he";
type _Output427 = { id: _Output4; language: _Output428; segments: _Output6 };
type _Output430 = "Lexeme";
type _Output431 = "ADV";
type _Output429 = {
	family: _Output430;
	kind: _Output431;
	memberSegmentIndices: _Output34;
};
type _Output426 = { sentence: _Output427; target: _Output429 };
type _Output434 = "he";
type _Output433 = { id: _Output4; language: _Output434; segments: _Output6 };
type _Output436 = "Lexeme";
type _Output437 = "AUX";
type _Output435 = {
	family: _Output436;
	kind: _Output437;
	memberSegmentIndices: _Output34;
};
type _Output432 = { sentence: _Output433; target: _Output435 };
type _Output440 = "he";
type _Output439 = { id: _Output4; language: _Output440; segments: _Output6 };
type _Output442 = "Lexeme";
type _Output443 = "CCONJ";
type _Output441 = {
	family: _Output442;
	kind: _Output443;
	memberSegmentIndices: _Output34;
};
type _Output438 = { sentence: _Output439; target: _Output441 };
type _Output446 = "he";
type _Output445 = { id: _Output4; language: _Output446; segments: _Output6 };
type _Output448 = "Lexeme";
type _Output449 = "DET";
type _Output447 = {
	family: _Output448;
	kind: _Output449;
	memberSegmentIndices: _Output34;
};
type _Output444 = { sentence: _Output445; target: _Output447 };
type _Output452 = "he";
type _Output451 = { id: _Output4; language: _Output452; segments: _Output6 };
type _Output454 = "Lexeme";
type _Output455 = "INTJ";
type _Output453 = {
	family: _Output454;
	kind: _Output455;
	memberSegmentIndices: _Output34;
};
type _Output450 = { sentence: _Output451; target: _Output453 };
type _Output458 = "he";
type _Output457 = { id: _Output4; language: _Output458; segments: _Output6 };
type _Output460 = "Lexeme";
type _Output461 = "NOUN";
type _Output459 = {
	family: _Output460;
	kind: _Output461;
	memberSegmentIndices: _Output34;
};
type _Output456 = { sentence: _Output457; target: _Output459 };
type _Output464 = "he";
type _Output463 = { id: _Output4; language: _Output464; segments: _Output6 };
type _Output466 = "Lexeme";
type _Output467 = "NUM";
type _Output465 = {
	family: _Output466;
	kind: _Output467;
	memberSegmentIndices: _Output34;
};
type _Output462 = { sentence: _Output463; target: _Output465 };
type _Output470 = "he";
type _Output469 = { id: _Output4; language: _Output470; segments: _Output6 };
type _Output472 = "Lexeme";
type _Output473 = "X";
type _Output471 = {
	family: _Output472;
	kind: _Output473;
	memberSegmentIndices: _Output34;
};
type _Output468 = { sentence: _Output469; target: _Output471 };
type _Output476 = "he";
type _Output475 = { id: _Output4; language: _Output476; segments: _Output6 };
type _Output478 = "Lexeme";
type _Output479 = "PART";
type _Output477 = {
	family: _Output478;
	kind: _Output479;
	memberSegmentIndices: _Output34;
};
type _Output474 = { sentence: _Output475; target: _Output477 };
type _Output482 = "he";
type _Output481 = { id: _Output4; language: _Output482; segments: _Output6 };
type _Output484 = "Lexeme";
type _Output485 = "PRON";
type _Output483 = {
	family: _Output484;
	kind: _Output485;
	memberSegmentIndices: _Output34;
};
type _Output480 = { sentence: _Output481; target: _Output483 };
type _Output488 = "he";
type _Output487 = { id: _Output4; language: _Output488; segments: _Output6 };
type _Output490 = "Lexeme";
type _Output491 = "PROPN";
type _Output489 = {
	family: _Output490;
	kind: _Output491;
	memberSegmentIndices: _Output34;
};
type _Output486 = { sentence: _Output487; target: _Output489 };
type _Output494 = "he";
type _Output493 = { id: _Output4; language: _Output494; segments: _Output6 };
type _Output496 = "Lexeme";
type _Output497 = "PUNCT";
type _Output495 = {
	family: _Output496;
	kind: _Output497;
	memberSegmentIndices: _Output34;
};
type _Output492 = { sentence: _Output493; target: _Output495 };
type _Output500 = "he";
type _Output499 = { id: _Output4; language: _Output500; segments: _Output6 };
type _Output502 = "Lexeme";
type _Output503 = "SCONJ";
type _Output501 = {
	family: _Output502;
	kind: _Output503;
	memberSegmentIndices: _Output34;
};
type _Output498 = { sentence: _Output499; target: _Output501 };
type _Output506 = "he";
type _Output505 = { id: _Output4; language: _Output506; segments: _Output6 };
type _Output508 = "Lexeme";
type _Output509 = "SYM";
type _Output507 = {
	family: _Output508;
	kind: _Output509;
	memberSegmentIndices: _Output34;
};
type _Output504 = { sentence: _Output505; target: _Output507 };
type _Output512 = "he";
type _Output511 = { id: _Output4; language: _Output512; segments: _Output6 };
type _Output514 = "Lexeme";
type _Output515 = "VERB";
type _Output513 = {
	family: _Output514;
	kind: _Output515;
	memberSegmentIndices: _Output34;
};
type _Output510 = { sentence: _Output511; target: _Output513 };
type _Output518 = "he";
type _Output517 = { id: _Output4; language: _Output518; segments: _Output6 };
type _Output520 = "Morpheme";
type _Output521 = "Circumfix";
type _Output519 = {
	family: _Output520;
	kind: _Output521;
	memberSegmentIndices: _Output34;
};
type _Output516 = { sentence: _Output517; target: _Output519 };
type _Output524 = "he";
type _Output523 = { id: _Output4; language: _Output524; segments: _Output6 };
type _Output526 = "Morpheme";
type _Output527 = "Clitic";
type _Output525 = {
	family: _Output526;
	kind: _Output527;
	memberSegmentIndices: _Output34;
};
type _Output522 = { sentence: _Output523; target: _Output525 };
type _Output530 = "he";
type _Output529 = { id: _Output4; language: _Output530; segments: _Output6 };
type _Output532 = "Morpheme";
type _Output533 = "Duplifix";
type _Output531 = {
	family: _Output532;
	kind: _Output533;
	memberSegmentIndices: _Output34;
};
type _Output528 = { sentence: _Output529; target: _Output531 };
type _Output536 = "he";
type _Output535 = { id: _Output4; language: _Output536; segments: _Output6 };
type _Output538 = "Morpheme";
type _Output539 = "Infix";
type _Output537 = {
	family: _Output538;
	kind: _Output539;
	memberSegmentIndices: _Output34;
};
type _Output534 = { sentence: _Output535; target: _Output537 };
type _Output542 = "he";
type _Output541 = { id: _Output4; language: _Output542; segments: _Output6 };
type _Output544 = "Morpheme";
type _Output545 = "Interfix";
type _Output543 = {
	family: _Output544;
	kind: _Output545;
	memberSegmentIndices: _Output34;
};
type _Output540 = { sentence: _Output541; target: _Output543 };
type _Output548 = "he";
type _Output547 = { id: _Output4; language: _Output548; segments: _Output6 };
type _Output550 = "Morpheme";
type _Output551 = "Prefix";
type _Output549 = {
	family: _Output550;
	kind: _Output551;
	memberSegmentIndices: _Output34;
};
type _Output546 = { sentence: _Output547; target: _Output549 };
type _Output554 = "he";
type _Output553 = { id: _Output4; language: _Output554; segments: _Output6 };
type _Output556 = "Morpheme";
type _Output557 = "Root";
type _Output555 = {
	family: _Output556;
	kind: _Output557;
	memberSegmentIndices: _Output34;
};
type _Output552 = { sentence: _Output553; target: _Output555 };
type _Output560 = "he";
type _Output559 = { id: _Output4; language: _Output560; segments: _Output6 };
type _Output562 = "Morpheme";
type _Output563 = "Suffix";
type _Output561 = {
	family: _Output562;
	kind: _Output563;
	memberSegmentIndices: _Output34;
};
type _Output558 = { sentence: _Output559; target: _Output561 };
type _Output566 = "he";
type _Output565 = { id: _Output4; language: _Output566; segments: _Output6 };
type _Output568 = "Morpheme";
type _Output569 = "Suffixoid";
type _Output567 = {
	family: _Output568;
	kind: _Output569;
	memberSegmentIndices: _Output34;
};
type _Output564 = { sentence: _Output565; target: _Output567 };
type _Output572 = "he";
type _Output571 = { id: _Output4; language: _Output572; segments: _Output6 };
type _Output574 = "Morpheme";
type _Output575 = "ToneMarking";
type _Output573 = {
	family: _Output574;
	kind: _Output575;
	memberSegmentIndices: _Output34;
};
type _Output570 = { sentence: _Output571; target: _Output573 };
type _Output578 = "he";
type _Output577 = { id: _Output4; language: _Output578; segments: _Output6 };
type _Output580 = "Morpheme";
type _Output581 = "Transfix";
type _Output579 = {
	family: _Output580;
	kind: _Output581;
	memberSegmentIndices: _Output34;
};
type _Output576 = { sentence: _Output577; target: _Output579 };
type _Output584 = "he";
type _Output583 = { id: _Output4; language: _Output584; segments: _Output6 };
type _Output586 = "Phraseme";
type _Output587 = "Aphorism";
type _Output585 = {
	family: _Output586;
	kind: _Output587;
	memberSegmentIndices: _Output34;
};
type _Output582 = { sentence: _Output583; target: _Output585 };
type _Output590 = "he";
type _Output589 = { id: _Output4; language: _Output590; segments: _Output6 };
type _Output592 = "Phraseme";
type _Output593 = "DiscourseFormula";
type _Output591 = {
	family: _Output592;
	kind: _Output593;
	memberSegmentIndices: _Output34;
};
type _Output588 = { sentence: _Output589; target: _Output591 };
type _Output596 = "he";
type _Output595 = { id: _Output4; language: _Output596; segments: _Output6 };
type _Output598 = "Phraseme";
type _Output599 = "Idiom";
type _Output597 = {
	family: _Output598;
	kind: _Output599;
	memberSegmentIndices: _Output34;
};
type _Output594 = { sentence: _Output595; target: _Output597 };
type _Output602 = "he";
type _Output601 = { id: _Output4; language: _Output602; segments: _Output6 };
type _Output604 = "Phraseme";
type _Output605 = "Proverb";
type _Output603 = {
	family: _Output604;
	kind: _Output605;
	memberSegmentIndices: _Output34;
};
type _Output600 = { sentence: _Output601; target: _Output603 };
type _Output27 =
	| _Output28
	| _Output36
	| _Output42
	| _Output48
	| _Output54
	| _Output60
	| _Output66
	| _Output72
	| _Output78
	| _Output84
	| _Output90
	| _Output96
	| _Output102
	| _Output108
	| _Output114
	| _Output120
	| _Output126
	| _Output132
	| _Output138
	| _Output144
	| _Output150
	| _Output156
	| _Output162
	| _Output168
	| _Output174
	| _Output180
	| _Output186
	| _Output192
	| _Output198
	| _Output204
	| _Output210
	| _Output216
	| _Output222
	| _Output228
	| _Output234
	| _Output240
	| _Output246
	| _Output252
	| _Output258
	| _Output264
	| _Output270
	| _Output276
	| _Output282
	| _Output288
	| _Output294
	| _Output300
	| _Output306
	| _Output312
	| _Output318
	| _Output324
	| _Output330
	| _Output336
	| _Output342
	| _Output348
	| _Output354
	| _Output360
	| _Output366
	| _Output372
	| _Output378
	| _Output384
	| _Output390
	| _Output396
	| _Output402
	| _Output408
	| _Output414
	| _Output420
	| _Output426
	| _Output432
	| _Output438
	| _Output444
	| _Output450
	| _Output456
	| _Output462
	| _Output468
	| _Output474
	| _Output480
	| _Output486
	| _Output492
	| _Output498
	| _Output504
	| _Output510
	| _Output516
	| _Output522
	| _Output528
	| _Output534
	| _Output540
	| _Output546
	| _Output552
	| _Output558
	| _Output564
	| _Output570
	| _Output576
	| _Output582
	| _Output588
	| _Output594
	| _Output600;
type _Output609 = "Lemma";
type _Output610 = "de";
type _Output611 = string;
type _Output614 = "Yes";
type _Output613 = _Output614 | null;
type _Output616 = "Yes";
type _Output615 = _Output616 | null;
type _Output618 = "Card" | "Ord";
type _Output617 = _Output618 | null;
type _Output620 = "Short";
type _Output619 = _Output620 | null;
type _Output612 = {
	abbr: _Output613;
	foreign: _Output615;
	numType: _Output617;
	variant: _Output619;
};
type _Output608 = {
	unitKind: _Output609;
	language: _Output610;
	family: _Output32;
	kind: _Output33;
	canonicalForm: _Output611;
	coreFeatures: _Output612;
};
type _Output607 = { encounter: _Output28; lemma: _Output608 };
type _Output623 = "Lemma";
type _Output624 = "de";
type _Output626 = _Output614 | null;
type _Output628 = "Circ" | "Post" | "Prep";
type _Output627 = _Output628 | null;
type _Output630 = "ADV" | "SCONJ";
type _Output629 = _Output630 | null;
type _Output631 = _Output616 | null;
type _Output633 =
	| "Acc"
	| "Abe"
	| "Ben"
	| "Cau"
	| "Cmp"
	| "Cns"
	| "Com"
	| "Dat"
	| "Dis"
	| "Equ"
	| "Gen"
	| "Ins"
	| "Par"
	| "Tem"
	| "Abl"
	| "Add"
	| "Ade"
	| "All"
	| "Del"
	| "Ela"
	| "Ess"
	| "Ill"
	| "Ine"
	| "Lat"
	| "Loc"
	| "Nom"
	| "Per"
	| "Sbe"
	| "Sbl"
	| "Spl"
	| "Sub"
	| "Sup"
	| "Ter";
type _Output632 = _Output633 | null;
type _Output635 = "Vbp";
type _Output634 = _Output635 | null;
type _Output625 = {
	abbr: _Output626;
	adpType: _Output627;
	extPos: _Output629;
	foreign: _Output631;
	governedCase: _Output632;
	partType: _Output634;
};
type _Output622 = {
	unitKind: _Output623;
	language: _Output624;
	family: _Output40;
	kind: _Output41;
	canonicalForm: _Output611;
	coreFeatures: _Output625;
};
type _Output621 = { encounter: _Output36; lemma: _Output622 };
type _Output638 = "Lemma";
type _Output639 = "de";
type _Output641 = _Output616 | null;
type _Output643 = "Card" | "Mult";
type _Output642 = _Output643 | null;
type _Output645 = "Dem" | "Ind" | "Int" | "Neg" | "Rel";
type _Output644 = _Output645 | null;
type _Output640 = {
	foreign: _Output641;
	numType: _Output642;
	pronType: _Output644;
};
type _Output637 = {
	unitKind: _Output638;
	language: _Output639;
	family: _Output46;
	kind: _Output47;
	canonicalForm: _Output611;
	coreFeatures: _Output640;
};
type _Output636 = { encounter: _Output42; lemma: _Output637 };
type _Output648 = "Lemma";
type _Output649 = "de";
type _Output652 = "Mod";
type _Output651 = _Output652 | null;
type _Output650 = { verbType: _Output651 };
type _Output647 = {
	unitKind: _Output648;
	language: _Output649;
	family: _Output52;
	kind: _Output53;
	canonicalForm: _Output611;
	coreFeatures: _Output650;
};
type _Output646 = { encounter: _Output48; lemma: _Output647 };
type _Output655 = "Lemma";
type _Output656 = "de";
type _Output659 = "Comp";
type _Output658 = _Output659 | null;
type _Output657 = { conjType: _Output658 };
type _Output654 = {
	unitKind: _Output655;
	language: _Output656;
	family: _Output58;
	kind: _Output59;
	canonicalForm: _Output611;
	coreFeatures: _Output657;
};
type _Output653 = { encounter: _Output54; lemma: _Output654 };
type _Output662 = "Lemma";
type _Output663 = "de";
type _Output666 = "Def" | "Ind";
type _Output665 = _Output666 | null;
type _Output668 = "ADV" | "DET";
type _Output667 = _Output668 | null;
type _Output669 = _Output616 | null;
type _Output671 = "Card" | "Ord";
type _Output670 = _Output671 | null;
type _Output673 = "1" | "2" | "3";
type _Output672 = _Output673 | null;
type _Output675 = "Form" | "Infm";
type _Output674 = _Output675 | null;
type _Output677 = "Yes";
type _Output676 = _Output677 | null;
type _Output679 =
	| "Art"
	| "Dem"
	| "Emp"
	| "Exc"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rel"
	| "Tot";
type _Output678 = _Output679 | null;
type _Output664 = {
	definite: _Output665;
	extPos: _Output667;
	foreign: _Output669;
	numType: _Output670;
	person: _Output672;
	polite: _Output674;
	poss: _Output676;
	pronType: _Output678;
};
type _Output661 = {
	unitKind: _Output662;
	language: _Output663;
	family: _Output64;
	kind: _Output65;
	canonicalForm: _Output611;
	coreFeatures: _Output664;
};
type _Output660 = { encounter: _Output60; lemma: _Output661 };
type _Output682 = "Lemma";
type _Output683 = "de";
type _Output686 = "Res";
type _Output685 = _Output686 | null;
type _Output684 = { partType: _Output685 };
type _Output681 = {
	unitKind: _Output682;
	language: _Output683;
	family: _Output70;
	kind: _Output71;
	canonicalForm: _Output611;
	coreFeatures: _Output684;
};
type _Output680 = { encounter: _Output66; lemma: _Output681 };
type _Output689 = "Lemma";
type _Output690 = "de";
type _Output693 = "Fem" | "Masc" | "Neut";
type _Output692 = _Output693 | null;
type _Output695 = "Yes";
type _Output694 = _Output695 | null;
type _Output691 = { gender: _Output692; hyph: _Output694 };
type _Output688 = {
	unitKind: _Output689;
	language: _Output690;
	family: _Output76;
	kind: _Output77;
	canonicalForm: _Output611;
	coreFeatures: _Output691;
};
type _Output687 = { encounter: _Output72; lemma: _Output688 };
type _Output698 = "Lemma";
type _Output699 = "de";
type _Output701 = _Output614 | null;
type _Output702 = _Output616 | null;
type _Output704 = "Card" | "Frac" | "Mult" | "Range";
type _Output703 = _Output704 | null;
type _Output700 = {
	abbr: _Output701;
	foreign: _Output702;
	numType: _Output703;
};
type _Output697 = {
	unitKind: _Output698;
	language: _Output699;
	family: _Output82;
	kind: _Output83;
	canonicalForm: _Output611;
	coreFeatures: _Output700;
};
type _Output696 = { encounter: _Output78; lemma: _Output697 };
type _Output707 = "Lemma";
type _Output708 = "de";
type _Output710 = _Output614 | null;
type _Output711 = _Output616 | null;
type _Output712 = _Output695 | null;
type _Output714 = "Card" | "Mult" | "Range";
type _Output713 = _Output714 | null;
type _Output709 = {
	abbr: _Output710;
	foreign: _Output711;
	hyph: _Output712;
	numType: _Output713;
};
type _Output706 = {
	unitKind: _Output707;
	language: _Output708;
	family: _Output88;
	kind: _Output89;
	canonicalForm: _Output611;
	coreFeatures: _Output709;
};
type _Output705 = { encounter: _Output84; lemma: _Output706 };
type _Output717 = "Lemma";
type _Output718 = "de";
type _Output720 = _Output614 | null;
type _Output721 = _Output616 | null;
type _Output723 = "Inf";
type _Output722 = _Output723 | null;
type _Output725 = "Neg" | "Pos";
type _Output724 = _Output725 | null;
type _Output719 = {
	abbr: _Output720;
	foreign: _Output721;
	partType: _Output722;
	polarity: _Output724;
};
type _Output716 = {
	unitKind: _Output717;
	language: _Output718;
	family: _Output94;
	kind: _Output95;
	canonicalForm: _Output611;
	coreFeatures: _Output719;
};
type _Output715 = { encounter: _Output90; lemma: _Output716 };
type _Output728 = "Lemma";
type _Output729 = "de";
type _Output732 = "Acc" | "Dat" | "Gen" | "Nom";
type _Output731 = _Output732 | null;
type _Output734 = "Plur" | "Sing";
type _Output733 = _Output734 | null;
type _Output736 = "Fem" | "Masc" | "Neut";
type _Output735 = _Output736 | null;
type _Output738 = "DET";
type _Output737 = _Output738 | null;
type _Output739 = _Output616 | null;
type _Output741 = "1" | "2" | "3";
type _Output740 = _Output741 | null;
type _Output743 = "Form" | "Infm";
type _Output742 = _Output743 | null;
type _Output744 = _Output677 | null;
type _Output746 = "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot";
type _Output745 = _Output746 | null;
type _Output748 = "Fem" | "Masc" | "Neut";
type _Output747 = _Output748 | null;
type _Output750 = "Plur" | "Sing";
type _Output749 = _Output750 | null;
type _Output730 = {
	case: _Output731;
	number: _Output733;
	"gender[psor]": _Output735;
	extPos: _Output737;
	foreign: _Output739;
	person: _Output740;
	polite: _Output742;
	poss: _Output744;
	pronType: _Output745;
	gender: _Output747;
	referenceNumber: _Output749;
};
type _Output727 = {
	unitKind: _Output728;
	language: _Output729;
	family: _Output100;
	kind: _Output101;
	canonicalForm: _Output611;
	coreFeatures: _Output730;
};
type _Output726 = { encounter: _Output96; lemma: _Output727 };
type _Output753 = "Lemma";
type _Output754 = "de";
type _Output756 = _Output614 | null;
type _Output757 = _Output616 | null;
type _Output759 = "Fem" | "Masc" | "Neut";
type _Output758 = _Output759 | null;
type _Output755 = { abbr: _Output756; foreign: _Output757; gender: _Output758 };
type _Output752 = {
	unitKind: _Output753;
	language: _Output754;
	family: _Output106;
	kind: _Output107;
	canonicalForm: _Output611;
	coreFeatures: _Output755;
};
type _Output751 = { encounter: _Output102; lemma: _Output752 };
type _Output762 = "Lemma";
type _Output763 = "de";
type _Output766 =
	| "Brck"
	| "Colo"
	| "Comm"
	| "Dash"
	| "Elip"
	| "Excl"
	| "Peri"
	| "Qest"
	| "Quot";
type _Output765 = _Output766 | null;
type _Output764 = { punctType: _Output765 };
type _Output761 = {
	unitKind: _Output762;
	language: _Output763;
	family: _Output112;
	kind: _Output113;
	canonicalForm: _Output611;
	coreFeatures: _Output764;
};
type _Output760 = { encounter: _Output108; lemma: _Output761 };
type _Output769 = "Lemma";
type _Output770 = "de";
type _Output773 = "Comp";
type _Output772 = _Output773 | null;
type _Output771 = { conjType: _Output772 };
type _Output768 = {
	unitKind: _Output769;
	language: _Output770;
	family: _Output118;
	kind: _Output119;
	canonicalForm: _Output611;
	coreFeatures: _Output771;
};
type _Output767 = { encounter: _Output114; lemma: _Output768 };
type _Output776 = "Lemma";
type _Output777 = "de";
type _Output779 = _Output616 | null;
type _Output781 = "Card" | "Range";
type _Output780 = _Output781 | null;
type _Output778 = { foreign: _Output779; numType: _Output780 };
type _Output775 = {
	unitKind: _Output776;
	language: _Output777;
	family: _Output124;
	kind: _Output125;
	canonicalForm: _Output611;
	coreFeatures: _Output778;
};
type _Output774 = { encounter: _Output120; lemma: _Output775 };
type _Output784 = "Lemma";
type _Output785 = "de";
type _Output788 = string;
type _Output787 = _Output788 | null;
type _Output790 = "Yes";
type _Output789 = _Output790 | null;
type _Output791 = _Output652 | null;
type _Output786 = {
	hasSepPrefix: _Output787;
	lexicallyReflexive: _Output789;
	verbType: _Output791;
};
type _Output783 = {
	unitKind: _Output784;
	language: _Output785;
	family: _Output130;
	kind: _Output131;
	canonicalForm: _Output611;
	coreFeatures: _Output786;
};
type _Output782 = { encounter: _Output126; lemma: _Output783 };
type _Output794 = "Lemma";
type _Output795 = "de";
type _Output796 = Record<string, never>;
type _Output793 = {
	unitKind: _Output794;
	language: _Output795;
	family: _Output136;
	kind: _Output137;
	canonicalForm: _Output611;
	coreFeatures: _Output796;
};
type _Output792 = { encounter: _Output132; lemma: _Output793 };
type _Output799 = "Lemma";
type _Output800 = "de";
type _Output801 = Record<string, never>;
type _Output798 = {
	unitKind: _Output799;
	language: _Output800;
	family: _Output142;
	kind: _Output143;
	canonicalForm: _Output611;
	coreFeatures: _Output801;
};
type _Output797 = { encounter: _Output138; lemma: _Output798 };
type _Output804 = "Lemma";
type _Output805 = "de";
type _Output806 = Record<string, never>;
type _Output803 = {
	unitKind: _Output804;
	language: _Output805;
	family: _Output148;
	kind: _Output149;
	canonicalForm: _Output611;
	coreFeatures: _Output806;
};
type _Output802 = { encounter: _Output144; lemma: _Output803 };
type _Output809 = "Lemma";
type _Output810 = "de";
type _Output811 = Record<string, never>;
type _Output808 = {
	unitKind: _Output809;
	language: _Output810;
	family: _Output154;
	kind: _Output155;
	canonicalForm: _Output611;
	coreFeatures: _Output811;
};
type _Output807 = { encounter: _Output150; lemma: _Output808 };
type _Output814 = "Lemma";
type _Output815 = "de";
type _Output816 = Record<string, never>;
type _Output813 = {
	unitKind: _Output814;
	language: _Output815;
	family: _Output160;
	kind: _Output161;
	canonicalForm: _Output611;
	coreFeatures: _Output816;
};
type _Output812 = { encounter: _Output156; lemma: _Output813 };
type _Output819 = "Lemma";
type _Output820 = "de";
type _Output822 = _Output788 | null;
type _Output821 = { hasSepPrefix: _Output822 };
type _Output818 = {
	unitKind: _Output819;
	language: _Output820;
	family: _Output166;
	kind: _Output167;
	canonicalForm: _Output611;
	coreFeatures: _Output821;
};
type _Output817 = { encounter: _Output162; lemma: _Output818 };
type _Output825 = "Lemma";
type _Output826 = "de";
type _Output827 = Record<string, never>;
type _Output824 = {
	unitKind: _Output825;
	language: _Output826;
	family: _Output172;
	kind: _Output173;
	canonicalForm: _Output611;
	coreFeatures: _Output827;
};
type _Output823 = { encounter: _Output168; lemma: _Output824 };
type _Output830 = "Lemma";
type _Output831 = "de";
type _Output832 = Record<string, never>;
type _Output829 = {
	unitKind: _Output830;
	language: _Output831;
	family: _Output178;
	kind: _Output179;
	canonicalForm: _Output611;
	coreFeatures: _Output832;
};
type _Output828 = { encounter: _Output174; lemma: _Output829 };
type _Output835 = "Lemma";
type _Output836 = "de";
type _Output837 = Record<string, never>;
type _Output834 = {
	unitKind: _Output835;
	language: _Output836;
	family: _Output184;
	kind: _Output185;
	canonicalForm: _Output611;
	coreFeatures: _Output837;
};
type _Output833 = { encounter: _Output180; lemma: _Output834 };
type _Output840 = "Lemma";
type _Output841 = "de";
type _Output842 = Record<string, never>;
type _Output839 = {
	unitKind: _Output840;
	language: _Output841;
	family: _Output190;
	kind: _Output191;
	canonicalForm: _Output611;
	coreFeatures: _Output842;
};
type _Output838 = { encounter: _Output186; lemma: _Output839 };
type _Output845 = "Lemma";
type _Output846 = "de";
type _Output847 = Record<string, never>;
type _Output844 = {
	unitKind: _Output845;
	language: _Output846;
	family: _Output196;
	kind: _Output197;
	canonicalForm: _Output611;
	coreFeatures: _Output847;
};
type _Output843 = { encounter: _Output192; lemma: _Output844 };
type _Output850 = "Lemma";
type _Output851 = "de";
type _Output852 = Record<string, never>;
type _Output849 = {
	unitKind: _Output850;
	language: _Output851;
	family: _Output202;
	kind: _Output203;
	canonicalForm: _Output611;
	coreFeatures: _Output852;
};
type _Output848 = { encounter: _Output198; lemma: _Output849 };
type _Output855 = "Lemma";
type _Output856 = "de";
type _Output859 =
	| "Greeting"
	| "Farewell"
	| "Apology"
	| "Thanks"
	| "Acknowledgment"
	| "Refusal"
	| "Request"
	| "Reaction"
	| "Initiation"
	| "Transition";
type _Output858 = _Output859 | null;
type _Output857 = { discourseFormulaRole: _Output858 };
type _Output854 = {
	unitKind: _Output855;
	language: _Output856;
	family: _Output208;
	kind: _Output209;
	canonicalForm: _Output611;
	coreFeatures: _Output857;
};
type _Output853 = { encounter: _Output204; lemma: _Output854 };
type _Output862 = "Lemma";
type _Output863 = "de";
type _Output864 = Record<string, never>;
type _Output861 = {
	unitKind: _Output862;
	language: _Output863;
	family: _Output214;
	kind: _Output215;
	canonicalForm: _Output611;
	coreFeatures: _Output864;
};
type _Output860 = { encounter: _Output210; lemma: _Output861 };
type _Output867 = "Lemma";
type _Output868 = "de";
type _Output869 = Record<string, never>;
type _Output866 = {
	unitKind: _Output867;
	language: _Output868;
	family: _Output220;
	kind: _Output221;
	canonicalForm: _Output611;
	coreFeatures: _Output869;
};
type _Output865 = { encounter: _Output216; lemma: _Output866 };
type _Output872 = "Lemma";
type _Output873 = "en";
type _Output875 = _Output614 | null;
type _Output877 = "ADP" | "ADV" | "SCONJ";
type _Output876 = _Output877 | null;
type _Output879 = "Combi" | "Word";
type _Output878 = _Output879 | null;
type _Output881 = "Frac" | "Ord";
type _Output880 = _Output881 | null;
type _Output883 = "Expr";
type _Output882 = _Output883 | null;
type _Output874 = {
	abbr: _Output875;
	extPos: _Output876;
	numForm: _Output878;
	numType: _Output880;
	style: _Output882;
};
type _Output871 = {
	unitKind: _Output872;
	language: _Output873;
	family: _Output226;
	kind: _Output227;
	canonicalForm: _Output611;
	coreFeatures: _Output874;
};
type _Output870 = { encounter: _Output222; lemma: _Output871 };
type _Output886 = "Lemma";
type _Output887 = "en";
type _Output889 = _Output614 | null;
type _Output891 = "ADP" | "ADV" | "SCONJ";
type _Output890 = _Output891 | null;
type _Output888 = { abbr: _Output889; extPos: _Output890 };
type _Output885 = {
	unitKind: _Output886;
	language: _Output887;
	family: _Output232;
	kind: _Output233;
	canonicalForm: _Output611;
	coreFeatures: _Output888;
};
type _Output884 = { encounter: _Output228; lemma: _Output885 };
type _Output894 = "Lemma";
type _Output895 = "en";
type _Output897 = _Output614 | null;
type _Output899 = "ADP" | "ADV" | "CCONJ" | "SCONJ";
type _Output898 = _Output899 | null;
type _Output901 = "Word";
type _Output900 = _Output901 | null;
type _Output903 = "Frac" | "Mult" | "Ord";
type _Output902 = _Output903 | null;
type _Output906 = "Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot";
type _Output907 = [_Output906, ...Array<_Output906>];
type _Output905 = _Output906 | _Output907;
type _Output904 = _Output905 | null;
type _Output909 = "Expr" | "Slng";
type _Output908 = _Output909 | null;
type _Output896 = {
	abbr: _Output897;
	extPos: _Output898;
	numForm: _Output900;
	numType: _Output902;
	pronType: _Output904;
	style: _Output908;
};
type _Output893 = {
	unitKind: _Output894;
	language: _Output895;
	family: _Output238;
	kind: _Output239;
	canonicalForm: _Output611;
	coreFeatures: _Output896;
};
type _Output892 = { encounter: _Output234; lemma: _Output893 };
type _Output912 = "Lemma";
type _Output913 = "en";
type _Output915 = _Output614 | null;
type _Output917 = "Arch" | "Vrnc";
type _Output916 = _Output917 | null;
type _Output914 = { abbr: _Output915; style: _Output916 };
type _Output911 = {
	unitKind: _Output912;
	language: _Output913;
	family: _Output244;
	kind: _Output245;
	canonicalForm: _Output611;
	coreFeatures: _Output914;
};
type _Output910 = { encounter: _Output240; lemma: _Output911 };
type _Output920 = "Lemma";
type _Output921 = "en";
type _Output923 = _Output614 | null;
type _Output925 = "Neg";
type _Output924 = _Output925 | null;
type _Output922 = { abbr: _Output923; polarity: _Output924 };
type _Output919 = {
	unitKind: _Output920;
	language: _Output921;
	family: _Output250;
	kind: _Output251;
	canonicalForm: _Output611;
	coreFeatures: _Output922;
};
type _Output918 = { encounter: _Output246; lemma: _Output919 };
type _Output928 = "Lemma";
type _Output929 = "en";
type _Output931 = _Output614 | null;
type _Output933 = "Def" | "Ind";
type _Output932 = _Output933 | null;
type _Output935 = "ADV" | "PRON";
type _Output934 = _Output935 | null;
type _Output937 = "Word";
type _Output936 = _Output937 | null;
type _Output939 = "Frac";
type _Output938 = _Output939 | null;
type _Output942 = "Art" | "Dem" | "Ind" | "Int" | "Neg" | "Rcp" | "Rel" | "Tot";
type _Output943 = [_Output942, ...Array<_Output942>];
type _Output941 = _Output942 | _Output943;
type _Output940 = _Output941 | null;
type _Output945 = "Vrnc";
type _Output944 = _Output945 | null;
type _Output930 = {
	abbr: _Output931;
	definite: _Output932;
	extPos: _Output934;
	numForm: _Output936;
	numType: _Output938;
	pronType: _Output940;
	style: _Output944;
};
type _Output927 = {
	unitKind: _Output928;
	language: _Output929;
	family: _Output256;
	kind: _Output257;
	canonicalForm: _Output611;
	coreFeatures: _Output930;
};
type _Output926 = { encounter: _Output252; lemma: _Output927 };
type _Output948 = "Lemma";
type _Output949 = "en";
type _Output951 = _Output614 | null;
type _Output952 = _Output616 | null;
type _Output954 = "Neg" | "Pos";
type _Output953 = _Output954 | null;
type _Output956 = "Expr";
type _Output955 = _Output956 | null;
type _Output950 = {
	abbr: _Output951;
	foreign: _Output952;
	polarity: _Output953;
	style: _Output955;
};
type _Output947 = {
	unitKind: _Output948;
	language: _Output949;
	family: _Output262;
	kind: _Output263;
	canonicalForm: _Output611;
	coreFeatures: _Output950;
};
type _Output946 = { encounter: _Output258; lemma: _Output947 };
type _Output959 = "Lemma";
type _Output960 = "en";
type _Output962 = _Output614 | null;
type _Output964 = "ADV" | "PROPN";
type _Output963 = _Output964 | null;
type _Output965 = _Output616 | null;
type _Output967 = "Combi" | "Digit" | "Word";
type _Output966 = _Output967 | null;
type _Output969 = "Card" | "Frac" | "Ord";
type _Output968 = _Output969 | null;
type _Output971 = "Expr" | "Vrnc";
type _Output970 = _Output971 | null;
type _Output961 = {
	abbr: _Output962;
	extPos: _Output963;
	foreign: _Output965;
	numForm: _Output966;
	numType: _Output968;
	style: _Output970;
};
type _Output958 = {
	unitKind: _Output959;
	language: _Output960;
	family: _Output268;
	kind: _Output269;
	canonicalForm: _Output611;
	coreFeatures: _Output961;
};
type _Output957 = { encounter: _Output264; lemma: _Output958 };
type _Output974 = "Lemma";
type _Output975 = "en";
type _Output977 = _Output614 | null;
type _Output979 = "PROPN";
type _Output978 = _Output979 | null;
type _Output981 = "Digit" | "Roman" | "Word";
type _Output980 = _Output981 | null;
type _Output983 = "Card" | "Frac";
type _Output982 = _Output983 | null;
type _Output976 = {
	abbr: _Output977;
	extPos: _Output978;
	numForm: _Output980;
	numType: _Output982;
};
type _Output973 = {
	unitKind: _Output974;
	language: _Output975;
	family: _Output274;
	kind: _Output275;
	canonicalForm: _Output611;
	coreFeatures: _Output976;
};
type _Output972 = { encounter: _Output270; lemma: _Output973 };
type _Output986 = "Lemma";
type _Output987 = "en";
type _Output990 = "PROPN";
type _Output989 = _Output990 | null;
type _Output991 = _Output616 | null;
type _Output988 = { extPos: _Output989; foreign: _Output991 };
type _Output985 = {
	unitKind: _Output986;
	language: _Output987;
	family: _Output280;
	kind: _Output281;
	canonicalForm: _Output611;
	coreFeatures: _Output988;
};
type _Output984 = { encounter: _Output276; lemma: _Output985 };
type _Output994 = "Lemma";
type _Output995 = "en";
type _Output997 = _Output614 | null;
type _Output999 = "CCONJ";
type _Output998 = _Output999 | null;
type _Output1001 = "Neg";
type _Output1000 = _Output1001 | null;
type _Output996 = {
	abbr: _Output997;
	extPos: _Output998;
	polarity: _Output1000;
};
type _Output993 = {
	unitKind: _Output994;
	language: _Output995;
	family: _Output286;
	kind: _Output287;
	canonicalForm: _Output611;
	coreFeatures: _Output996;
};
type _Output992 = { encounter: _Output282; lemma: _Output993 };
type _Output1004 = "Lemma";
type _Output1005 = "en";
type _Output1007 = _Output614 | null;
type _Output1009 = "ADV" | "PRON";
type _Output1008 = _Output1009 | null;
type _Output1011 = "1" | "2" | "3";
type _Output1010 = _Output1011 | null;
type _Output1012 = _Output677 | null;
type _Output1015 =
	| "Dem"
	| "Emp"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1016 = [_Output1015, ...Array<_Output1015>];
type _Output1014 = _Output1015 | _Output1016;
type _Output1013 = _Output1014 | null;
type _Output1018 = "Arch" | "Coll" | "Expr" | "Slng" | "Vrnc";
type _Output1017 = _Output1018 | null;
type _Output1006 = {
	abbr: _Output1007;
	extPos: _Output1008;
	person: _Output1010;
	poss: _Output1012;
	pronType: _Output1013;
	style: _Output1017;
};
type _Output1003 = {
	unitKind: _Output1004;
	language: _Output1005;
	family: _Output292;
	kind: _Output293;
	canonicalForm: _Output611;
	coreFeatures: _Output1006;
};
type _Output1002 = { encounter: _Output288; lemma: _Output1003 };
type _Output1021 = "Lemma";
type _Output1022 = "en";
type _Output1024 = _Output614 | null;
type _Output1026 = "PROPN";
type _Output1025 = _Output1026 | null;
type _Output1028 = "Expr";
type _Output1027 = _Output1028 | null;
type _Output1023 = {
	abbr: _Output1024;
	extPos: _Output1025;
	style: _Output1027;
};
type _Output1020 = {
	unitKind: _Output1021;
	language: _Output1022;
	family: _Output298;
	kind: _Output299;
	canonicalForm: _Output611;
	coreFeatures: _Output1023;
};
type _Output1019 = { encounter: _Output294; lemma: _Output1020 };
type _Output1031 = "Lemma";
type _Output1032 = "en";
type _Output1033 = Record<string, never>;
type _Output1030 = {
	unitKind: _Output1031;
	language: _Output1032;
	family: _Output304;
	kind: _Output305;
	canonicalForm: _Output611;
	coreFeatures: _Output1033;
};
type _Output1029 = { encounter: _Output300; lemma: _Output1030 };
type _Output1036 = "Lemma";
type _Output1037 = "en";
type _Output1039 = _Output614 | null;
type _Output1041 = "ADP" | "SCONJ";
type _Output1040 = _Output1041 | null;
type _Output1043 = "Vrnc";
type _Output1042 = _Output1043 | null;
type _Output1038 = {
	abbr: _Output1039;
	extPos: _Output1040;
	style: _Output1042;
};
type _Output1035 = {
	unitKind: _Output1036;
	language: _Output1037;
	family: _Output310;
	kind: _Output311;
	canonicalForm: _Output611;
	coreFeatures: _Output1038;
};
type _Output1034 = { encounter: _Output306; lemma: _Output1035 };
type _Output1046 = "Lemma";
type _Output1047 = "en";
type _Output1049 = _Output614 | null;
type _Output1051 = "ADP" | "PROPN";
type _Output1050 = _Output1051 | null;
type _Output1048 = { abbr: _Output1049; extPos: _Output1050 };
type _Output1045 = {
	unitKind: _Output1046;
	language: _Output1047;
	family: _Output316;
	kind: _Output317;
	canonicalForm: _Output611;
	coreFeatures: _Output1048;
};
type _Output1044 = { encounter: _Output312; lemma: _Output1045 };
type _Output1054 = "Lemma";
type _Output1055 = "en";
type _Output1057 = _Output614 | null;
type _Output1059 = "ADP" | "CCONJ" | "PROPN";
type _Output1058 = _Output1059 | null;
type _Output1061 = "Yes";
type _Output1060 = _Output1061 | null;
type _Output1063 = "Expr" | "Vrnc";
type _Output1062 = _Output1063 | null;
type _Output1056 = {
	abbr: _Output1057;
	extPos: _Output1058;
	phrasal: _Output1060;
	style: _Output1062;
};
type _Output1053 = {
	unitKind: _Output1054;
	language: _Output1055;
	family: _Output322;
	kind: _Output323;
	canonicalForm: _Output611;
	coreFeatures: _Output1056;
};
type _Output1052 = { encounter: _Output318; lemma: _Output1053 };
type _Output1066 = "Lemma";
type _Output1067 = "en";
type _Output1068 = Record<string, never>;
type _Output1065 = {
	unitKind: _Output1066;
	language: _Output1067;
	family: _Output328;
	kind: _Output329;
	canonicalForm: _Output611;
	coreFeatures: _Output1068;
};
type _Output1064 = { encounter: _Output324; lemma: _Output1065 };
type _Output1071 = "Lemma";
type _Output1072 = "en";
type _Output1073 = Record<string, never>;
type _Output1070 = {
	unitKind: _Output1071;
	language: _Output1072;
	family: _Output334;
	kind: _Output335;
	canonicalForm: _Output611;
	coreFeatures: _Output1073;
};
type _Output1069 = { encounter: _Output330; lemma: _Output1070 };
type _Output1076 = "Lemma";
type _Output1077 = "en";
type _Output1078 = Record<string, never>;
type _Output1075 = {
	unitKind: _Output1076;
	language: _Output1077;
	family: _Output340;
	kind: _Output341;
	canonicalForm: _Output611;
	coreFeatures: _Output1078;
};
type _Output1074 = { encounter: _Output336; lemma: _Output1075 };
type _Output1081 = "Lemma";
type _Output1082 = "en";
type _Output1083 = Record<string, never>;
type _Output1080 = {
	unitKind: _Output1081;
	language: _Output1082;
	family: _Output346;
	kind: _Output347;
	canonicalForm: _Output611;
	coreFeatures: _Output1083;
};
type _Output1079 = { encounter: _Output342; lemma: _Output1080 };
type _Output1086 = "Lemma";
type _Output1087 = "en";
type _Output1088 = Record<string, never>;
type _Output1085 = {
	unitKind: _Output1086;
	language: _Output1087;
	family: _Output352;
	kind: _Output353;
	canonicalForm: _Output611;
	coreFeatures: _Output1088;
};
type _Output1084 = { encounter: _Output348; lemma: _Output1085 };
type _Output1091 = "Lemma";
type _Output1092 = "en";
type _Output1093 = Record<string, never>;
type _Output1090 = {
	unitKind: _Output1091;
	language: _Output1092;
	family: _Output358;
	kind: _Output359;
	canonicalForm: _Output611;
	coreFeatures: _Output1093;
};
type _Output1089 = { encounter: _Output354; lemma: _Output1090 };
type _Output1096 = "Lemma";
type _Output1097 = "en";
type _Output1098 = Record<string, never>;
type _Output1095 = {
	unitKind: _Output1096;
	language: _Output1097;
	family: _Output364;
	kind: _Output365;
	canonicalForm: _Output611;
	coreFeatures: _Output1098;
};
type _Output1094 = { encounter: _Output360; lemma: _Output1095 };
type _Output1101 = "Lemma";
type _Output1102 = "en";
type _Output1103 = Record<string, never>;
type _Output1100 = {
	unitKind: _Output1101;
	language: _Output1102;
	family: _Output370;
	kind: _Output371;
	canonicalForm: _Output611;
	coreFeatures: _Output1103;
};
type _Output1099 = { encounter: _Output366; lemma: _Output1100 };
type _Output1106 = "Lemma";
type _Output1107 = "en";
type _Output1108 = Record<string, never>;
type _Output1105 = {
	unitKind: _Output1106;
	language: _Output1107;
	family: _Output376;
	kind: _Output377;
	canonicalForm: _Output611;
	coreFeatures: _Output1108;
};
type _Output1104 = { encounter: _Output372; lemma: _Output1105 };
type _Output1111 = "Lemma";
type _Output1112 = "en";
type _Output1113 = Record<string, never>;
type _Output1110 = {
	unitKind: _Output1111;
	language: _Output1112;
	family: _Output382;
	kind: _Output383;
	canonicalForm: _Output611;
	coreFeatures: _Output1113;
};
type _Output1109 = { encounter: _Output378; lemma: _Output1110 };
type _Output1116 = "Lemma";
type _Output1117 = "en";
type _Output1118 = Record<string, never>;
type _Output1115 = {
	unitKind: _Output1116;
	language: _Output1117;
	family: _Output388;
	kind: _Output389;
	canonicalForm: _Output611;
	coreFeatures: _Output1118;
};
type _Output1114 = { encounter: _Output384; lemma: _Output1115 };
type _Output1121 = "Lemma";
type _Output1122 = "en";
type _Output1123 = Record<string, never>;
type _Output1120 = {
	unitKind: _Output1121;
	language: _Output1122;
	family: _Output394;
	kind: _Output395;
	canonicalForm: _Output611;
	coreFeatures: _Output1123;
};
type _Output1119 = { encounter: _Output390; lemma: _Output1120 };
type _Output1126 = "Lemma";
type _Output1127 = "en";
type _Output1129 = _Output859 | null;
type _Output1128 = { discourseFormulaRole: _Output1129 };
type _Output1125 = {
	unitKind: _Output1126;
	language: _Output1127;
	family: _Output400;
	kind: _Output401;
	canonicalForm: _Output611;
	coreFeatures: _Output1128;
};
type _Output1124 = { encounter: _Output396; lemma: _Output1125 };
type _Output1132 = "Lemma";
type _Output1133 = "en";
type _Output1134 = Record<string, never>;
type _Output1131 = {
	unitKind: _Output1132;
	language: _Output1133;
	family: _Output406;
	kind: _Output407;
	canonicalForm: _Output611;
	coreFeatures: _Output1134;
};
type _Output1130 = { encounter: _Output402; lemma: _Output1131 };
type _Output1137 = "Lemma";
type _Output1138 = "en";
type _Output1139 = Record<string, never>;
type _Output1136 = {
	unitKind: _Output1137;
	language: _Output1138;
	family: _Output412;
	kind: _Output413;
	canonicalForm: _Output611;
	coreFeatures: _Output1139;
};
type _Output1135 = { encounter: _Output408; lemma: _Output1136 };
type _Output1142 = "Lemma";
type _Output1143 = "he";
type _Output1145 = _Output614 | null;
type _Output1144 = { abbr: _Output1145 };
type _Output1141 = {
	unitKind: _Output1142;
	language: _Output1143;
	family: _Output418;
	kind: _Output419;
	canonicalForm: _Output611;
	coreFeatures: _Output1144;
};
type _Output1140 = { encounter: _Output414; lemma: _Output1141 };
type _Output1148 = "Lemma";
type _Output1149 = "he";
type _Output1151 = _Output614 | null;
type _Output1153 = "Acc" | "Gen";
type _Output1152 = _Output1153 | null;
type _Output1150 = { abbr: _Output1151; case: _Output1152 };
type _Output1147 = {
	unitKind: _Output1148;
	language: _Output1149;
	family: _Output424;
	kind: _Output425;
	canonicalForm: _Output611;
	coreFeatures: _Output1150;
};
type _Output1146 = { encounter: _Output420; lemma: _Output1147 };
type _Output1156 = "Lemma";
type _Output1157 = "he";
type _Output1160 = "Yes";
type _Output1159 = _Output1160 | null;
type _Output1158 = { prefix: _Output1159 };
type _Output1155 = {
	unitKind: _Output1156;
	language: _Output1157;
	family: _Output430;
	kind: _Output431;
	canonicalForm: _Output611;
	coreFeatures: _Output1158;
};
type _Output1154 = { encounter: _Output426; lemma: _Output1155 };
type _Output1163 = "Lemma";
type _Output1164 = "he";
type _Output1167 = "Cop" | "Mod";
type _Output1166 = _Output1167 | null;
type _Output1165 = { verbType: _Output1166 };
type _Output1162 = {
	unitKind: _Output1163;
	language: _Output1164;
	family: _Output436;
	kind: _Output437;
	canonicalForm: _Output611;
	coreFeatures: _Output1165;
};
type _Output1161 = { encounter: _Output432; lemma: _Output1162 };
type _Output1170 = "Lemma";
type _Output1171 = "he";
type _Output1172 = Record<string, never>;
type _Output1169 = {
	unitKind: _Output1170;
	language: _Output1171;
	family: _Output442;
	kind: _Output443;
	canonicalForm: _Output611;
	coreFeatures: _Output1172;
};
type _Output1168 = { encounter: _Output438; lemma: _Output1169 };
type _Output1175 = "Lemma";
type _Output1176 = "he";
type _Output1179 = "Art" | "Int";
type _Output1178 = _Output1179 | null;
type _Output1177 = { pronType: _Output1178 };
type _Output1174 = {
	unitKind: _Output1175;
	language: _Output1176;
	family: _Output448;
	kind: _Output449;
	canonicalForm: _Output611;
	coreFeatures: _Output1177;
};
type _Output1173 = { encounter: _Output444; lemma: _Output1174 };
type _Output1182 = "Lemma";
type _Output1183 = "he";
type _Output1184 = Record<string, never>;
type _Output1181 = {
	unitKind: _Output1182;
	language: _Output1183;
	family: _Output454;
	kind: _Output455;
	canonicalForm: _Output611;
	coreFeatures: _Output1184;
};
type _Output1180 = { encounter: _Output450; lemma: _Output1181 };
type _Output1187 = "Lemma";
type _Output1188 = "he";
type _Output1190 = _Output614 | null;
type _Output1193 = "Fem" | "Masc";
type _Output1194 = [_Output1193, ...Array<_Output1193>];
type _Output1192 = _Output1193 | _Output1194;
type _Output1191 = _Output1192 | null;
type _Output1189 = { abbr: _Output1190; gender: _Output1191 };
type _Output1186 = {
	unitKind: _Output1187;
	language: _Output1188;
	family: _Output460;
	kind: _Output461;
	canonicalForm: _Output611;
	coreFeatures: _Output1189;
};
type _Output1185 = { encounter: _Output456; lemma: _Output1186 };
type _Output1197 = "Lemma";
type _Output1198 = "he";
type _Output1199 = Record<string, never>;
type _Output1196 = {
	unitKind: _Output1197;
	language: _Output1198;
	family: _Output466;
	kind: _Output467;
	canonicalForm: _Output611;
	coreFeatures: _Output1199;
};
type _Output1195 = { encounter: _Output462; lemma: _Output1196 };
type _Output1202 = "Lemma";
type _Output1203 = "he";
type _Output1204 = Record<string, never>;
type _Output1201 = {
	unitKind: _Output1202;
	language: _Output1203;
	family: _Output472;
	kind: _Output473;
	canonicalForm: _Output611;
	coreFeatures: _Output1204;
};
type _Output1200 = { encounter: _Output468; lemma: _Output1201 };
type _Output1207 = "Lemma";
type _Output1208 = "he";
type _Output1209 = Record<string, never>;
type _Output1206 = {
	unitKind: _Output1207;
	language: _Output1208;
	family: _Output478;
	kind: _Output479;
	canonicalForm: _Output611;
	coreFeatures: _Output1209;
};
type _Output1205 = { encounter: _Output474; lemma: _Output1206 };
type _Output1212 = "Lemma";
type _Output1213 = "he";
type _Output1216 = "Def";
type _Output1215 = _Output1216 | null;
type _Output1218 = "Dem" | "Ind" | "Int" | "Prs";
type _Output1217 = _Output1218 | null;
type _Output1220 = "Yes";
type _Output1219 = _Output1220 | null;
type _Output1214 = {
	definite: _Output1215;
	pronType: _Output1217;
	reflex: _Output1219;
};
type _Output1211 = {
	unitKind: _Output1212;
	language: _Output1213;
	family: _Output484;
	kind: _Output485;
	canonicalForm: _Output611;
	coreFeatures: _Output1214;
};
type _Output1210 = { encounter: _Output480; lemma: _Output1211 };
type _Output1223 = "Lemma";
type _Output1224 = "he";
type _Output1226 = _Output614 | null;
type _Output1229 = "Fem" | "Masc";
type _Output1230 = [_Output1229, ...Array<_Output1229>];
type _Output1228 = _Output1229 | _Output1230;
type _Output1227 = _Output1228 | null;
type _Output1225 = { abbr: _Output1226; gender: _Output1227 };
type _Output1222 = {
	unitKind: _Output1223;
	language: _Output1224;
	family: _Output490;
	kind: _Output491;
	canonicalForm: _Output611;
	coreFeatures: _Output1225;
};
type _Output1221 = { encounter: _Output486; lemma: _Output1222 };
type _Output1233 = "Lemma";
type _Output1234 = "he";
type _Output1235 = Record<string, never>;
type _Output1232 = {
	unitKind: _Output1233;
	language: _Output1234;
	family: _Output496;
	kind: _Output497;
	canonicalForm: _Output611;
	coreFeatures: _Output1235;
};
type _Output1231 = { encounter: _Output492; lemma: _Output1232 };
type _Output1238 = "Lemma";
type _Output1239 = "he";
type _Output1242 = "Tem";
type _Output1241 = _Output1242 | null;
type _Output1240 = { case: _Output1241 };
type _Output1237 = {
	unitKind: _Output1238;
	language: _Output1239;
	family: _Output502;
	kind: _Output503;
	canonicalForm: _Output611;
	coreFeatures: _Output1240;
};
type _Output1236 = { encounter: _Output498; lemma: _Output1237 };
type _Output1245 = "Lemma";
type _Output1246 = "he";
type _Output1247 = Record<string, never>;
type _Output1244 = {
	unitKind: _Output1245;
	language: _Output1246;
	family: _Output508;
	kind: _Output509;
	canonicalForm: _Output611;
	coreFeatures: _Output1247;
};
type _Output1243 = { encounter: _Output504; lemma: _Output1244 };
type _Output1250 = "Lemma";
type _Output1251 = "he";
type _Output1254 =
	| "HIFIL"
	| "HITPAEL"
	| "HUFAL"
	| "NIFAL"
	| "PAAL"
	| "PIEL"
	| "PUAL";
type _Output1253 = _Output1254 | null;
type _Output1256 = "Yes";
type _Output1255 = _Output1256 | null;
type _Output1252 = { hebBinyan: _Output1253; hebExistential: _Output1255 };
type _Output1249 = {
	unitKind: _Output1250;
	language: _Output1251;
	family: _Output514;
	kind: _Output515;
	canonicalForm: _Output611;
	coreFeatures: _Output1252;
};
type _Output1248 = { encounter: _Output510; lemma: _Output1249 };
type _Output1259 = "Lemma";
type _Output1260 = "he";
type _Output1261 = Record<string, never>;
type _Output1258 = {
	unitKind: _Output1259;
	language: _Output1260;
	family: _Output520;
	kind: _Output521;
	canonicalForm: _Output611;
	coreFeatures: _Output1261;
};
type _Output1257 = { encounter: _Output516; lemma: _Output1258 };
type _Output1264 = "Lemma";
type _Output1265 = "he";
type _Output1266 = Record<string, never>;
type _Output1263 = {
	unitKind: _Output1264;
	language: _Output1265;
	family: _Output526;
	kind: _Output527;
	canonicalForm: _Output611;
	coreFeatures: _Output1266;
};
type _Output1262 = { encounter: _Output522; lemma: _Output1263 };
type _Output1269 = "Lemma";
type _Output1270 = "he";
type _Output1271 = Record<string, never>;
type _Output1268 = {
	unitKind: _Output1269;
	language: _Output1270;
	family: _Output532;
	kind: _Output533;
	canonicalForm: _Output611;
	coreFeatures: _Output1271;
};
type _Output1267 = { encounter: _Output528; lemma: _Output1268 };
type _Output1274 = "Lemma";
type _Output1275 = "he";
type _Output1276 = Record<string, never>;
type _Output1273 = {
	unitKind: _Output1274;
	language: _Output1275;
	family: _Output538;
	kind: _Output539;
	canonicalForm: _Output611;
	coreFeatures: _Output1276;
};
type _Output1272 = { encounter: _Output534; lemma: _Output1273 };
type _Output1279 = "Lemma";
type _Output1280 = "he";
type _Output1281 = Record<string, never>;
type _Output1278 = {
	unitKind: _Output1279;
	language: _Output1280;
	family: _Output544;
	kind: _Output545;
	canonicalForm: _Output611;
	coreFeatures: _Output1281;
};
type _Output1277 = { encounter: _Output540; lemma: _Output1278 };
type _Output1284 = "Lemma";
type _Output1285 = "he";
type _Output1286 = Record<string, never>;
type _Output1283 = {
	unitKind: _Output1284;
	language: _Output1285;
	family: _Output550;
	kind: _Output551;
	canonicalForm: _Output611;
	coreFeatures: _Output1286;
};
type _Output1282 = { encounter: _Output546; lemma: _Output1283 };
type _Output1289 = "Lemma";
type _Output1290 = "he";
type _Output1291 = Record<string, never>;
type _Output1288 = {
	unitKind: _Output1289;
	language: _Output1290;
	family: _Output556;
	kind: _Output557;
	canonicalForm: _Output611;
	coreFeatures: _Output1291;
};
type _Output1287 = { encounter: _Output552; lemma: _Output1288 };
type _Output1294 = "Lemma";
type _Output1295 = "he";
type _Output1296 = Record<string, never>;
type _Output1293 = {
	unitKind: _Output1294;
	language: _Output1295;
	family: _Output562;
	kind: _Output563;
	canonicalForm: _Output611;
	coreFeatures: _Output1296;
};
type _Output1292 = { encounter: _Output558; lemma: _Output1293 };
type _Output1299 = "Lemma";
type _Output1300 = "he";
type _Output1301 = Record<string, never>;
type _Output1298 = {
	unitKind: _Output1299;
	language: _Output1300;
	family: _Output568;
	kind: _Output569;
	canonicalForm: _Output611;
	coreFeatures: _Output1301;
};
type _Output1297 = { encounter: _Output564; lemma: _Output1298 };
type _Output1304 = "Lemma";
type _Output1305 = "he";
type _Output1306 = Record<string, never>;
type _Output1303 = {
	unitKind: _Output1304;
	language: _Output1305;
	family: _Output574;
	kind: _Output575;
	canonicalForm: _Output611;
	coreFeatures: _Output1306;
};
type _Output1302 = { encounter: _Output570; lemma: _Output1303 };
type _Output1309 = "Lemma";
type _Output1310 = "he";
type _Output1311 = Record<string, never>;
type _Output1308 = {
	unitKind: _Output1309;
	language: _Output1310;
	family: _Output580;
	kind: _Output581;
	canonicalForm: _Output611;
	coreFeatures: _Output1311;
};
type _Output1307 = { encounter: _Output576; lemma: _Output1308 };
type _Output1314 = "Lemma";
type _Output1315 = "he";
type _Output1316 = Record<string, never>;
type _Output1313 = {
	unitKind: _Output1314;
	language: _Output1315;
	family: _Output586;
	kind: _Output587;
	canonicalForm: _Output611;
	coreFeatures: _Output1316;
};
type _Output1312 = { encounter: _Output582; lemma: _Output1313 };
type _Output1319 = "Lemma";
type _Output1320 = "he";
type _Output1321 = Record<string, never>;
type _Output1318 = {
	unitKind: _Output1319;
	language: _Output1320;
	family: _Output592;
	kind: _Output593;
	canonicalForm: _Output611;
	coreFeatures: _Output1321;
};
type _Output1317 = { encounter: _Output588; lemma: _Output1318 };
type _Output1324 = "Lemma";
type _Output1325 = "he";
type _Output1326 = Record<string, never>;
type _Output1323 = {
	unitKind: _Output1324;
	language: _Output1325;
	family: _Output598;
	kind: _Output599;
	canonicalForm: _Output611;
	coreFeatures: _Output1326;
};
type _Output1322 = { encounter: _Output594; lemma: _Output1323 };
type _Output1329 = "Lemma";
type _Output1330 = "he";
type _Output1331 = Record<string, never>;
type _Output1328 = {
	unitKind: _Output1329;
	language: _Output1330;
	family: _Output604;
	kind: _Output605;
	canonicalForm: _Output611;
	coreFeatures: _Output1331;
};
type _Output1327 = { encounter: _Output600; lemma: _Output1328 };
type _Output606 =
	| _Output607
	| _Output621
	| _Output636
	| _Output646
	| _Output653
	| _Output660
	| _Output680
	| _Output687
	| _Output696
	| _Output705
	| _Output715
	| _Output726
	| _Output751
	| _Output760
	| _Output767
	| _Output774
	| _Output782
	| _Output792
	| _Output797
	| _Output802
	| _Output807
	| _Output812
	| _Output817
	| _Output823
	| _Output828
	| _Output833
	| _Output838
	| _Output843
	| _Output848
	| _Output853
	| _Output860
	| _Output865
	| _Output870
	| _Output884
	| _Output892
	| _Output910
	| _Output918
	| _Output926
	| _Output946
	| _Output957
	| _Output972
	| _Output984
	| _Output992
	| _Output1002
	| _Output1019
	| _Output1029
	| _Output1034
	| _Output1044
	| _Output1052
	| _Output1064
	| _Output1069
	| _Output1074
	| _Output1079
	| _Output1084
	| _Output1089
	| _Output1094
	| _Output1099
	| _Output1104
	| _Output1109
	| _Output1114
	| _Output1119
	| _Output1124
	| _Output1130
	| _Output1135
	| _Output1140
	| _Output1146
	| _Output1154
	| _Output1161
	| _Output1168
	| _Output1173
	| _Output1180
	| _Output1185
	| _Output1195
	| _Output1200
	| _Output1205
	| _Output1210
	| _Output1221
	| _Output1231
	| _Output1236
	| _Output1243
	| _Output1248
	| _Output1257
	| _Output1262
	| _Output1267
	| _Output1272
	| _Output1277
	| _Output1282
	| _Output1287
	| _Output1292
	| _Output1297
	| _Output1302
	| _Output1307
	| _Output1312
	| _Output1317
	| _Output1322
	| _Output1327;
type _Output1335 = string;
type _Output1334 = Array<_Output1335>;
type _Output1333 = {
	encounter: _Output28;
	lemma: _Output608;
	candidates: _Output1334;
};
type _Output1337 = Array<_Output1335>;
type _Output1336 = {
	encounter: _Output36;
	lemma: _Output622;
	candidates: _Output1337;
};
type _Output1339 = Array<_Output1335>;
type _Output1338 = {
	encounter: _Output42;
	lemma: _Output637;
	candidates: _Output1339;
};
type _Output1341 = Array<_Output1335>;
type _Output1340 = {
	encounter: _Output48;
	lemma: _Output647;
	candidates: _Output1341;
};
type _Output1343 = Array<_Output1335>;
type _Output1342 = {
	encounter: _Output54;
	lemma: _Output654;
	candidates: _Output1343;
};
type _Output1345 = Array<_Output1335>;
type _Output1344 = {
	encounter: _Output60;
	lemma: _Output661;
	candidates: _Output1345;
};
type _Output1347 = Array<_Output1335>;
type _Output1346 = {
	encounter: _Output66;
	lemma: _Output681;
	candidates: _Output1347;
};
type _Output1349 = Array<_Output1335>;
type _Output1348 = {
	encounter: _Output72;
	lemma: _Output688;
	candidates: _Output1349;
};
type _Output1351 = Array<_Output1335>;
type _Output1350 = {
	encounter: _Output78;
	lemma: _Output697;
	candidates: _Output1351;
};
type _Output1353 = Array<_Output1335>;
type _Output1352 = {
	encounter: _Output84;
	lemma: _Output706;
	candidates: _Output1353;
};
type _Output1355 = Array<_Output1335>;
type _Output1354 = {
	encounter: _Output90;
	lemma: _Output716;
	candidates: _Output1355;
};
type _Output1357 = Array<_Output1335>;
type _Output1356 = {
	encounter: _Output96;
	lemma: _Output727;
	candidates: _Output1357;
};
type _Output1359 = Array<_Output1335>;
type _Output1358 = {
	encounter: _Output102;
	lemma: _Output752;
	candidates: _Output1359;
};
type _Output1361 = Array<_Output1335>;
type _Output1360 = {
	encounter: _Output108;
	lemma: _Output761;
	candidates: _Output1361;
};
type _Output1363 = Array<_Output1335>;
type _Output1362 = {
	encounter: _Output114;
	lemma: _Output768;
	candidates: _Output1363;
};
type _Output1365 = Array<_Output1335>;
type _Output1364 = {
	encounter: _Output120;
	lemma: _Output775;
	candidates: _Output1365;
};
type _Output1367 = Array<_Output1335>;
type _Output1366 = {
	encounter: _Output126;
	lemma: _Output783;
	candidates: _Output1367;
};
type _Output1369 = Array<_Output1335>;
type _Output1368 = {
	encounter: _Output132;
	lemma: _Output793;
	candidates: _Output1369;
};
type _Output1371 = Array<_Output1335>;
type _Output1370 = {
	encounter: _Output138;
	lemma: _Output798;
	candidates: _Output1371;
};
type _Output1373 = Array<_Output1335>;
type _Output1372 = {
	encounter: _Output144;
	lemma: _Output803;
	candidates: _Output1373;
};
type _Output1375 = Array<_Output1335>;
type _Output1374 = {
	encounter: _Output150;
	lemma: _Output808;
	candidates: _Output1375;
};
type _Output1377 = Array<_Output1335>;
type _Output1376 = {
	encounter: _Output156;
	lemma: _Output813;
	candidates: _Output1377;
};
type _Output1379 = Array<_Output1335>;
type _Output1378 = {
	encounter: _Output162;
	lemma: _Output818;
	candidates: _Output1379;
};
type _Output1381 = Array<_Output1335>;
type _Output1380 = {
	encounter: _Output168;
	lemma: _Output824;
	candidates: _Output1381;
};
type _Output1383 = Array<_Output1335>;
type _Output1382 = {
	encounter: _Output174;
	lemma: _Output829;
	candidates: _Output1383;
};
type _Output1385 = Array<_Output1335>;
type _Output1384 = {
	encounter: _Output180;
	lemma: _Output834;
	candidates: _Output1385;
};
type _Output1387 = Array<_Output1335>;
type _Output1386 = {
	encounter: _Output186;
	lemma: _Output839;
	candidates: _Output1387;
};
type _Output1389 = Array<_Output1335>;
type _Output1388 = {
	encounter: _Output192;
	lemma: _Output844;
	candidates: _Output1389;
};
type _Output1391 = Array<_Output1335>;
type _Output1390 = {
	encounter: _Output198;
	lemma: _Output849;
	candidates: _Output1391;
};
type _Output1393 = Array<_Output1335>;
type _Output1392 = {
	encounter: _Output204;
	lemma: _Output854;
	candidates: _Output1393;
};
type _Output1395 = Array<_Output1335>;
type _Output1394 = {
	encounter: _Output210;
	lemma: _Output861;
	candidates: _Output1395;
};
type _Output1397 = Array<_Output1335>;
type _Output1396 = {
	encounter: _Output216;
	lemma: _Output866;
	candidates: _Output1397;
};
type _Output1399 = Array<_Output1335>;
type _Output1398 = {
	encounter: _Output222;
	lemma: _Output871;
	candidates: _Output1399;
};
type _Output1401 = Array<_Output1335>;
type _Output1400 = {
	encounter: _Output228;
	lemma: _Output885;
	candidates: _Output1401;
};
type _Output1403 = Array<_Output1335>;
type _Output1402 = {
	encounter: _Output234;
	lemma: _Output893;
	candidates: _Output1403;
};
type _Output1405 = Array<_Output1335>;
type _Output1404 = {
	encounter: _Output240;
	lemma: _Output911;
	candidates: _Output1405;
};
type _Output1407 = Array<_Output1335>;
type _Output1406 = {
	encounter: _Output246;
	lemma: _Output919;
	candidates: _Output1407;
};
type _Output1409 = Array<_Output1335>;
type _Output1408 = {
	encounter: _Output252;
	lemma: _Output927;
	candidates: _Output1409;
};
type _Output1411 = Array<_Output1335>;
type _Output1410 = {
	encounter: _Output258;
	lemma: _Output947;
	candidates: _Output1411;
};
type _Output1413 = Array<_Output1335>;
type _Output1412 = {
	encounter: _Output264;
	lemma: _Output958;
	candidates: _Output1413;
};
type _Output1415 = Array<_Output1335>;
type _Output1414 = {
	encounter: _Output270;
	lemma: _Output973;
	candidates: _Output1415;
};
type _Output1417 = Array<_Output1335>;
type _Output1416 = {
	encounter: _Output276;
	lemma: _Output985;
	candidates: _Output1417;
};
type _Output1419 = Array<_Output1335>;
type _Output1418 = {
	encounter: _Output282;
	lemma: _Output993;
	candidates: _Output1419;
};
type _Output1421 = Array<_Output1335>;
type _Output1420 = {
	encounter: _Output288;
	lemma: _Output1003;
	candidates: _Output1421;
};
type _Output1423 = Array<_Output1335>;
type _Output1422 = {
	encounter: _Output294;
	lemma: _Output1020;
	candidates: _Output1423;
};
type _Output1425 = Array<_Output1335>;
type _Output1424 = {
	encounter: _Output300;
	lemma: _Output1030;
	candidates: _Output1425;
};
type _Output1427 = Array<_Output1335>;
type _Output1426 = {
	encounter: _Output306;
	lemma: _Output1035;
	candidates: _Output1427;
};
type _Output1429 = Array<_Output1335>;
type _Output1428 = {
	encounter: _Output312;
	lemma: _Output1045;
	candidates: _Output1429;
};
type _Output1431 = Array<_Output1335>;
type _Output1430 = {
	encounter: _Output318;
	lemma: _Output1053;
	candidates: _Output1431;
};
type _Output1433 = Array<_Output1335>;
type _Output1432 = {
	encounter: _Output324;
	lemma: _Output1065;
	candidates: _Output1433;
};
type _Output1435 = Array<_Output1335>;
type _Output1434 = {
	encounter: _Output330;
	lemma: _Output1070;
	candidates: _Output1435;
};
type _Output1437 = Array<_Output1335>;
type _Output1436 = {
	encounter: _Output336;
	lemma: _Output1075;
	candidates: _Output1437;
};
type _Output1439 = Array<_Output1335>;
type _Output1438 = {
	encounter: _Output342;
	lemma: _Output1080;
	candidates: _Output1439;
};
type _Output1441 = Array<_Output1335>;
type _Output1440 = {
	encounter: _Output348;
	lemma: _Output1085;
	candidates: _Output1441;
};
type _Output1443 = Array<_Output1335>;
type _Output1442 = {
	encounter: _Output354;
	lemma: _Output1090;
	candidates: _Output1443;
};
type _Output1445 = Array<_Output1335>;
type _Output1444 = {
	encounter: _Output360;
	lemma: _Output1095;
	candidates: _Output1445;
};
type _Output1447 = Array<_Output1335>;
type _Output1446 = {
	encounter: _Output366;
	lemma: _Output1100;
	candidates: _Output1447;
};
type _Output1449 = Array<_Output1335>;
type _Output1448 = {
	encounter: _Output372;
	lemma: _Output1105;
	candidates: _Output1449;
};
type _Output1451 = Array<_Output1335>;
type _Output1450 = {
	encounter: _Output378;
	lemma: _Output1110;
	candidates: _Output1451;
};
type _Output1453 = Array<_Output1335>;
type _Output1452 = {
	encounter: _Output384;
	lemma: _Output1115;
	candidates: _Output1453;
};
type _Output1455 = Array<_Output1335>;
type _Output1454 = {
	encounter: _Output390;
	lemma: _Output1120;
	candidates: _Output1455;
};
type _Output1457 = Array<_Output1335>;
type _Output1456 = {
	encounter: _Output396;
	lemma: _Output1125;
	candidates: _Output1457;
};
type _Output1459 = Array<_Output1335>;
type _Output1458 = {
	encounter: _Output402;
	lemma: _Output1131;
	candidates: _Output1459;
};
type _Output1461 = Array<_Output1335>;
type _Output1460 = {
	encounter: _Output408;
	lemma: _Output1136;
	candidates: _Output1461;
};
type _Output1463 = Array<_Output1335>;
type _Output1462 = {
	encounter: _Output414;
	lemma: _Output1141;
	candidates: _Output1463;
};
type _Output1465 = Array<_Output1335>;
type _Output1464 = {
	encounter: _Output420;
	lemma: _Output1147;
	candidates: _Output1465;
};
type _Output1467 = Array<_Output1335>;
type _Output1466 = {
	encounter: _Output426;
	lemma: _Output1155;
	candidates: _Output1467;
};
type _Output1469 = Array<_Output1335>;
type _Output1468 = {
	encounter: _Output432;
	lemma: _Output1162;
	candidates: _Output1469;
};
type _Output1471 = Array<_Output1335>;
type _Output1470 = {
	encounter: _Output438;
	lemma: _Output1169;
	candidates: _Output1471;
};
type _Output1473 = Array<_Output1335>;
type _Output1472 = {
	encounter: _Output444;
	lemma: _Output1174;
	candidates: _Output1473;
};
type _Output1475 = Array<_Output1335>;
type _Output1474 = {
	encounter: _Output450;
	lemma: _Output1181;
	candidates: _Output1475;
};
type _Output1477 = Array<_Output1335>;
type _Output1476 = {
	encounter: _Output456;
	lemma: _Output1186;
	candidates: _Output1477;
};
type _Output1479 = Array<_Output1335>;
type _Output1478 = {
	encounter: _Output462;
	lemma: _Output1196;
	candidates: _Output1479;
};
type _Output1481 = Array<_Output1335>;
type _Output1480 = {
	encounter: _Output468;
	lemma: _Output1201;
	candidates: _Output1481;
};
type _Output1483 = Array<_Output1335>;
type _Output1482 = {
	encounter: _Output474;
	lemma: _Output1206;
	candidates: _Output1483;
};
type _Output1485 = Array<_Output1335>;
type _Output1484 = {
	encounter: _Output480;
	lemma: _Output1211;
	candidates: _Output1485;
};
type _Output1487 = Array<_Output1335>;
type _Output1486 = {
	encounter: _Output486;
	lemma: _Output1222;
	candidates: _Output1487;
};
type _Output1489 = Array<_Output1335>;
type _Output1488 = {
	encounter: _Output492;
	lemma: _Output1232;
	candidates: _Output1489;
};
type _Output1491 = Array<_Output1335>;
type _Output1490 = {
	encounter: _Output498;
	lemma: _Output1237;
	candidates: _Output1491;
};
type _Output1493 = Array<_Output1335>;
type _Output1492 = {
	encounter: _Output504;
	lemma: _Output1244;
	candidates: _Output1493;
};
type _Output1495 = Array<_Output1335>;
type _Output1494 = {
	encounter: _Output510;
	lemma: _Output1249;
	candidates: _Output1495;
};
type _Output1497 = Array<_Output1335>;
type _Output1496 = {
	encounter: _Output516;
	lemma: _Output1258;
	candidates: _Output1497;
};
type _Output1499 = Array<_Output1335>;
type _Output1498 = {
	encounter: _Output522;
	lemma: _Output1263;
	candidates: _Output1499;
};
type _Output1501 = Array<_Output1335>;
type _Output1500 = {
	encounter: _Output528;
	lemma: _Output1268;
	candidates: _Output1501;
};
type _Output1503 = Array<_Output1335>;
type _Output1502 = {
	encounter: _Output534;
	lemma: _Output1273;
	candidates: _Output1503;
};
type _Output1505 = Array<_Output1335>;
type _Output1504 = {
	encounter: _Output540;
	lemma: _Output1278;
	candidates: _Output1505;
};
type _Output1507 = Array<_Output1335>;
type _Output1506 = {
	encounter: _Output546;
	lemma: _Output1283;
	candidates: _Output1507;
};
type _Output1509 = Array<_Output1335>;
type _Output1508 = {
	encounter: _Output552;
	lemma: _Output1288;
	candidates: _Output1509;
};
type _Output1511 = Array<_Output1335>;
type _Output1510 = {
	encounter: _Output558;
	lemma: _Output1293;
	candidates: _Output1511;
};
type _Output1513 = Array<_Output1335>;
type _Output1512 = {
	encounter: _Output564;
	lemma: _Output1298;
	candidates: _Output1513;
};
type _Output1515 = Array<_Output1335>;
type _Output1514 = {
	encounter: _Output570;
	lemma: _Output1303;
	candidates: _Output1515;
};
type _Output1517 = Array<_Output1335>;
type _Output1516 = {
	encounter: _Output576;
	lemma: _Output1308;
	candidates: _Output1517;
};
type _Output1519 = Array<_Output1335>;
type _Output1518 = {
	encounter: _Output582;
	lemma: _Output1313;
	candidates: _Output1519;
};
type _Output1521 = Array<_Output1335>;
type _Output1520 = {
	encounter: _Output588;
	lemma: _Output1318;
	candidates: _Output1521;
};
type _Output1523 = Array<_Output1335>;
type _Output1522 = {
	encounter: _Output594;
	lemma: _Output1323;
	candidates: _Output1523;
};
type _Output1525 = Array<_Output1335>;
type _Output1524 = {
	encounter: _Output600;
	lemma: _Output1328;
	candidates: _Output1525;
};
type _Output1332 =
	| _Output1333
	| _Output1336
	| _Output1338
	| _Output1340
	| _Output1342
	| _Output1344
	| _Output1346
	| _Output1348
	| _Output1350
	| _Output1352
	| _Output1354
	| _Output1356
	| _Output1358
	| _Output1360
	| _Output1362
	| _Output1364
	| _Output1366
	| _Output1368
	| _Output1370
	| _Output1372
	| _Output1374
	| _Output1376
	| _Output1378
	| _Output1380
	| _Output1382
	| _Output1384
	| _Output1386
	| _Output1388
	| _Output1390
	| _Output1392
	| _Output1394
	| _Output1396
	| _Output1398
	| _Output1400
	| _Output1402
	| _Output1404
	| _Output1406
	| _Output1408
	| _Output1410
	| _Output1412
	| _Output1414
	| _Output1416
	| _Output1418
	| _Output1420
	| _Output1422
	| _Output1424
	| _Output1426
	| _Output1428
	| _Output1430
	| _Output1432
	| _Output1434
	| _Output1436
	| _Output1438
	| _Output1440
	| _Output1442
	| _Output1444
	| _Output1446
	| _Output1448
	| _Output1450
	| _Output1452
	| _Output1454
	| _Output1456
	| _Output1458
	| _Output1460
	| _Output1462
	| _Output1464
	| _Output1466
	| _Output1468
	| _Output1470
	| _Output1472
	| _Output1474
	| _Output1476
	| _Output1478
	| _Output1480
	| _Output1482
	| _Output1484
	| _Output1486
	| _Output1488
	| _Output1490
	| _Output1492
	| _Output1494
	| _Output1496
	| _Output1498
	| _Output1500
	| _Output1502
	| _Output1504
	| _Output1506
	| _Output1508
	| _Output1510
	| _Output1512
	| _Output1514
	| _Output1516
	| _Output1518
	| _Output1520
	| _Output1522
	| _Output1524;
type _Output1529 = "Reading";
type _Output1528 = {
	unitKind: _Output1529;
	lemma: _Output608;
	emojiDescription: _Output1335;
};
type _Output1532 = null;
type _Output1531 = _Output1532 | undefined;
type _Output1534 = { en?: _Output1531; ru?: _Output1531 };
type _Output1533 = _Output1534 | undefined;
type _Output1536 = {
	synonym?: _Output1531;
	nearSynonym?: _Output1531;
	antonym?: _Output1531;
	nearAntonym?: _Output1531;
	hypernym?: _Output1531;
	hyponym?: _Output1531;
	meronym?: _Output1531;
	holonym?: _Output1531;
};
type _Output1535 = _Output1536 | undefined;
type _Output1530 = {
	transcription?: _Output1531;
	definition?: _Output1531;
	morphologicalTree?: _Output1531;
	lexicalBreakdown?: _Output1531;
	translations?: _Output1533;
	semanticRelations?: _Output1535;
};
type _Output1527 = {
	encounter: _Output28;
	reading: _Output1528;
	request: _Output1530;
};
type _Output1539 = "Reading";
type _Output1538 = {
	unitKind: _Output1539;
	lemma: _Output622;
	emojiDescription: _Output1335;
};
type _Output1537 = {
	encounter: _Output36;
	reading: _Output1538;
	request: _Output1530;
};
type _Output1542 = "Reading";
type _Output1541 = {
	unitKind: _Output1542;
	lemma: _Output637;
	emojiDescription: _Output1335;
};
type _Output1540 = {
	encounter: _Output42;
	reading: _Output1541;
	request: _Output1530;
};
type _Output1545 = "Reading";
type _Output1544 = {
	unitKind: _Output1545;
	lemma: _Output647;
	emojiDescription: _Output1335;
};
type _Output1543 = {
	encounter: _Output48;
	reading: _Output1544;
	request: _Output1530;
};
type _Output1548 = "Reading";
type _Output1547 = {
	unitKind: _Output1548;
	lemma: _Output654;
	emojiDescription: _Output1335;
};
type _Output1546 = {
	encounter: _Output54;
	reading: _Output1547;
	request: _Output1530;
};
type _Output1551 = "Reading";
type _Output1550 = {
	unitKind: _Output1551;
	lemma: _Output661;
	emojiDescription: _Output1335;
};
type _Output1549 = {
	encounter: _Output60;
	reading: _Output1550;
	request: _Output1530;
};
type _Output1554 = "Reading";
type _Output1553 = {
	unitKind: _Output1554;
	lemma: _Output681;
	emojiDescription: _Output1335;
};
type _Output1552 = {
	encounter: _Output66;
	reading: _Output1553;
	request: _Output1530;
};
type _Output1557 = "Reading";
type _Output1556 = {
	unitKind: _Output1557;
	lemma: _Output688;
	emojiDescription: _Output1335;
};
type _Output1555 = {
	encounter: _Output72;
	reading: _Output1556;
	request: _Output1530;
};
type _Output1560 = "Reading";
type _Output1559 = {
	unitKind: _Output1560;
	lemma: _Output697;
	emojiDescription: _Output1335;
};
type _Output1558 = {
	encounter: _Output78;
	reading: _Output1559;
	request: _Output1530;
};
type _Output1563 = "Reading";
type _Output1562 = {
	unitKind: _Output1563;
	lemma: _Output706;
	emojiDescription: _Output1335;
};
type _Output1561 = {
	encounter: _Output84;
	reading: _Output1562;
	request: _Output1530;
};
type _Output1566 = "Reading";
type _Output1565 = {
	unitKind: _Output1566;
	lemma: _Output716;
	emojiDescription: _Output1335;
};
type _Output1564 = {
	encounter: _Output90;
	reading: _Output1565;
	request: _Output1530;
};
type _Output1569 = "Reading";
type _Output1568 = {
	unitKind: _Output1569;
	lemma: _Output727;
	emojiDescription: _Output1335;
};
type _Output1567 = {
	encounter: _Output96;
	reading: _Output1568;
	request: _Output1530;
};
type _Output1572 = "Reading";
type _Output1571 = {
	unitKind: _Output1572;
	lemma: _Output752;
	emojiDescription: _Output1335;
};
type _Output1570 = {
	encounter: _Output102;
	reading: _Output1571;
	request: _Output1530;
};
type _Output1575 = "Reading";
type _Output1574 = {
	unitKind: _Output1575;
	lemma: _Output761;
	emojiDescription: _Output1335;
};
type _Output1573 = {
	encounter: _Output108;
	reading: _Output1574;
	request: _Output1530;
};
type _Output1578 = "Reading";
type _Output1577 = {
	unitKind: _Output1578;
	lemma: _Output768;
	emojiDescription: _Output1335;
};
type _Output1576 = {
	encounter: _Output114;
	reading: _Output1577;
	request: _Output1530;
};
type _Output1581 = "Reading";
type _Output1580 = {
	unitKind: _Output1581;
	lemma: _Output775;
	emojiDescription: _Output1335;
};
type _Output1579 = {
	encounter: _Output120;
	reading: _Output1580;
	request: _Output1530;
};
type _Output1584 = "Reading";
type _Output1583 = {
	unitKind: _Output1584;
	lemma: _Output783;
	emojiDescription: _Output1335;
};
type _Output1582 = {
	encounter: _Output126;
	reading: _Output1583;
	request: _Output1530;
};
type _Output1587 = "Reading";
type _Output1586 = {
	unitKind: _Output1587;
	lemma: _Output793;
	emojiDescription: _Output1335;
};
type _Output1585 = {
	encounter: _Output132;
	reading: _Output1586;
	request: _Output1530;
};
type _Output1590 = "Reading";
type _Output1589 = {
	unitKind: _Output1590;
	lemma: _Output798;
	emojiDescription: _Output1335;
};
type _Output1588 = {
	encounter: _Output138;
	reading: _Output1589;
	request: _Output1530;
};
type _Output1593 = "Reading";
type _Output1592 = {
	unitKind: _Output1593;
	lemma: _Output803;
	emojiDescription: _Output1335;
};
type _Output1591 = {
	encounter: _Output144;
	reading: _Output1592;
	request: _Output1530;
};
type _Output1596 = "Reading";
type _Output1595 = {
	unitKind: _Output1596;
	lemma: _Output808;
	emojiDescription: _Output1335;
};
type _Output1594 = {
	encounter: _Output150;
	reading: _Output1595;
	request: _Output1530;
};
type _Output1599 = "Reading";
type _Output1598 = {
	unitKind: _Output1599;
	lemma: _Output813;
	emojiDescription: _Output1335;
};
type _Output1597 = {
	encounter: _Output156;
	reading: _Output1598;
	request: _Output1530;
};
type _Output1602 = "Reading";
type _Output1601 = {
	unitKind: _Output1602;
	lemma: _Output818;
	emojiDescription: _Output1335;
};
type _Output1600 = {
	encounter: _Output162;
	reading: _Output1601;
	request: _Output1530;
};
type _Output1605 = "Reading";
type _Output1604 = {
	unitKind: _Output1605;
	lemma: _Output824;
	emojiDescription: _Output1335;
};
type _Output1603 = {
	encounter: _Output168;
	reading: _Output1604;
	request: _Output1530;
};
type _Output1608 = "Reading";
type _Output1607 = {
	unitKind: _Output1608;
	lemma: _Output829;
	emojiDescription: _Output1335;
};
type _Output1606 = {
	encounter: _Output174;
	reading: _Output1607;
	request: _Output1530;
};
type _Output1611 = "Reading";
type _Output1610 = {
	unitKind: _Output1611;
	lemma: _Output834;
	emojiDescription: _Output1335;
};
type _Output1609 = {
	encounter: _Output180;
	reading: _Output1610;
	request: _Output1530;
};
type _Output1614 = "Reading";
type _Output1613 = {
	unitKind: _Output1614;
	lemma: _Output839;
	emojiDescription: _Output1335;
};
type _Output1612 = {
	encounter: _Output186;
	reading: _Output1613;
	request: _Output1530;
};
type _Output1617 = "Reading";
type _Output1616 = {
	unitKind: _Output1617;
	lemma: _Output844;
	emojiDescription: _Output1335;
};
type _Output1615 = {
	encounter: _Output192;
	reading: _Output1616;
	request: _Output1530;
};
type _Output1620 = "Reading";
type _Output1619 = {
	unitKind: _Output1620;
	lemma: _Output849;
	emojiDescription: _Output1335;
};
type _Output1618 = {
	encounter: _Output198;
	reading: _Output1619;
	request: _Output1530;
};
type _Output1623 = "Reading";
type _Output1622 = {
	unitKind: _Output1623;
	lemma: _Output854;
	emojiDescription: _Output1335;
};
type _Output1621 = {
	encounter: _Output204;
	reading: _Output1622;
	request: _Output1530;
};
type _Output1626 = "Reading";
type _Output1625 = {
	unitKind: _Output1626;
	lemma: _Output861;
	emojiDescription: _Output1335;
};
type _Output1624 = {
	encounter: _Output210;
	reading: _Output1625;
	request: _Output1530;
};
type _Output1629 = "Reading";
type _Output1628 = {
	unitKind: _Output1629;
	lemma: _Output866;
	emojiDescription: _Output1335;
};
type _Output1627 = {
	encounter: _Output216;
	reading: _Output1628;
	request: _Output1530;
};
type _Output1632 = "Reading";
type _Output1631 = {
	unitKind: _Output1632;
	lemma: _Output871;
	emojiDescription: _Output1335;
};
type _Output1630 = {
	encounter: _Output222;
	reading: _Output1631;
	request: _Output1530;
};
type _Output1635 = "Reading";
type _Output1634 = {
	unitKind: _Output1635;
	lemma: _Output885;
	emojiDescription: _Output1335;
};
type _Output1633 = {
	encounter: _Output228;
	reading: _Output1634;
	request: _Output1530;
};
type _Output1638 = "Reading";
type _Output1637 = {
	unitKind: _Output1638;
	lemma: _Output893;
	emojiDescription: _Output1335;
};
type _Output1636 = {
	encounter: _Output234;
	reading: _Output1637;
	request: _Output1530;
};
type _Output1641 = "Reading";
type _Output1640 = {
	unitKind: _Output1641;
	lemma: _Output911;
	emojiDescription: _Output1335;
};
type _Output1639 = {
	encounter: _Output240;
	reading: _Output1640;
	request: _Output1530;
};
type _Output1644 = "Reading";
type _Output1643 = {
	unitKind: _Output1644;
	lemma: _Output919;
	emojiDescription: _Output1335;
};
type _Output1642 = {
	encounter: _Output246;
	reading: _Output1643;
	request: _Output1530;
};
type _Output1647 = "Reading";
type _Output1646 = {
	unitKind: _Output1647;
	lemma: _Output927;
	emojiDescription: _Output1335;
};
type _Output1645 = {
	encounter: _Output252;
	reading: _Output1646;
	request: _Output1530;
};
type _Output1650 = "Reading";
type _Output1649 = {
	unitKind: _Output1650;
	lemma: _Output947;
	emojiDescription: _Output1335;
};
type _Output1648 = {
	encounter: _Output258;
	reading: _Output1649;
	request: _Output1530;
};
type _Output1653 = "Reading";
type _Output1652 = {
	unitKind: _Output1653;
	lemma: _Output958;
	emojiDescription: _Output1335;
};
type _Output1651 = {
	encounter: _Output264;
	reading: _Output1652;
	request: _Output1530;
};
type _Output1656 = "Reading";
type _Output1655 = {
	unitKind: _Output1656;
	lemma: _Output973;
	emojiDescription: _Output1335;
};
type _Output1654 = {
	encounter: _Output270;
	reading: _Output1655;
	request: _Output1530;
};
type _Output1659 = "Reading";
type _Output1658 = {
	unitKind: _Output1659;
	lemma: _Output985;
	emojiDescription: _Output1335;
};
type _Output1657 = {
	encounter: _Output276;
	reading: _Output1658;
	request: _Output1530;
};
type _Output1662 = "Reading";
type _Output1661 = {
	unitKind: _Output1662;
	lemma: _Output993;
	emojiDescription: _Output1335;
};
type _Output1660 = {
	encounter: _Output282;
	reading: _Output1661;
	request: _Output1530;
};
type _Output1665 = "Reading";
type _Output1664 = {
	unitKind: _Output1665;
	lemma: _Output1003;
	emojiDescription: _Output1335;
};
type _Output1663 = {
	encounter: _Output288;
	reading: _Output1664;
	request: _Output1530;
};
type _Output1668 = "Reading";
type _Output1667 = {
	unitKind: _Output1668;
	lemma: _Output1020;
	emojiDescription: _Output1335;
};
type _Output1666 = {
	encounter: _Output294;
	reading: _Output1667;
	request: _Output1530;
};
type _Output1671 = "Reading";
type _Output1670 = {
	unitKind: _Output1671;
	lemma: _Output1030;
	emojiDescription: _Output1335;
};
type _Output1669 = {
	encounter: _Output300;
	reading: _Output1670;
	request: _Output1530;
};
type _Output1674 = "Reading";
type _Output1673 = {
	unitKind: _Output1674;
	lemma: _Output1035;
	emojiDescription: _Output1335;
};
type _Output1672 = {
	encounter: _Output306;
	reading: _Output1673;
	request: _Output1530;
};
type _Output1677 = "Reading";
type _Output1676 = {
	unitKind: _Output1677;
	lemma: _Output1045;
	emojiDescription: _Output1335;
};
type _Output1675 = {
	encounter: _Output312;
	reading: _Output1676;
	request: _Output1530;
};
type _Output1680 = "Reading";
type _Output1679 = {
	unitKind: _Output1680;
	lemma: _Output1053;
	emojiDescription: _Output1335;
};
type _Output1678 = {
	encounter: _Output318;
	reading: _Output1679;
	request: _Output1530;
};
type _Output1683 = "Reading";
type _Output1682 = {
	unitKind: _Output1683;
	lemma: _Output1065;
	emojiDescription: _Output1335;
};
type _Output1681 = {
	encounter: _Output324;
	reading: _Output1682;
	request: _Output1530;
};
type _Output1686 = "Reading";
type _Output1685 = {
	unitKind: _Output1686;
	lemma: _Output1070;
	emojiDescription: _Output1335;
};
type _Output1684 = {
	encounter: _Output330;
	reading: _Output1685;
	request: _Output1530;
};
type _Output1689 = "Reading";
type _Output1688 = {
	unitKind: _Output1689;
	lemma: _Output1075;
	emojiDescription: _Output1335;
};
type _Output1687 = {
	encounter: _Output336;
	reading: _Output1688;
	request: _Output1530;
};
type _Output1692 = "Reading";
type _Output1691 = {
	unitKind: _Output1692;
	lemma: _Output1080;
	emojiDescription: _Output1335;
};
type _Output1690 = {
	encounter: _Output342;
	reading: _Output1691;
	request: _Output1530;
};
type _Output1695 = "Reading";
type _Output1694 = {
	unitKind: _Output1695;
	lemma: _Output1085;
	emojiDescription: _Output1335;
};
type _Output1693 = {
	encounter: _Output348;
	reading: _Output1694;
	request: _Output1530;
};
type _Output1698 = "Reading";
type _Output1697 = {
	unitKind: _Output1698;
	lemma: _Output1090;
	emojiDescription: _Output1335;
};
type _Output1696 = {
	encounter: _Output354;
	reading: _Output1697;
	request: _Output1530;
};
type _Output1701 = "Reading";
type _Output1700 = {
	unitKind: _Output1701;
	lemma: _Output1095;
	emojiDescription: _Output1335;
};
type _Output1699 = {
	encounter: _Output360;
	reading: _Output1700;
	request: _Output1530;
};
type _Output1704 = "Reading";
type _Output1703 = {
	unitKind: _Output1704;
	lemma: _Output1100;
	emojiDescription: _Output1335;
};
type _Output1702 = {
	encounter: _Output366;
	reading: _Output1703;
	request: _Output1530;
};
type _Output1707 = "Reading";
type _Output1706 = {
	unitKind: _Output1707;
	lemma: _Output1105;
	emojiDescription: _Output1335;
};
type _Output1705 = {
	encounter: _Output372;
	reading: _Output1706;
	request: _Output1530;
};
type _Output1710 = "Reading";
type _Output1709 = {
	unitKind: _Output1710;
	lemma: _Output1110;
	emojiDescription: _Output1335;
};
type _Output1708 = {
	encounter: _Output378;
	reading: _Output1709;
	request: _Output1530;
};
type _Output1713 = "Reading";
type _Output1712 = {
	unitKind: _Output1713;
	lemma: _Output1115;
	emojiDescription: _Output1335;
};
type _Output1711 = {
	encounter: _Output384;
	reading: _Output1712;
	request: _Output1530;
};
type _Output1716 = "Reading";
type _Output1715 = {
	unitKind: _Output1716;
	lemma: _Output1120;
	emojiDescription: _Output1335;
};
type _Output1714 = {
	encounter: _Output390;
	reading: _Output1715;
	request: _Output1530;
};
type _Output1719 = "Reading";
type _Output1718 = {
	unitKind: _Output1719;
	lemma: _Output1125;
	emojiDescription: _Output1335;
};
type _Output1717 = {
	encounter: _Output396;
	reading: _Output1718;
	request: _Output1530;
};
type _Output1722 = "Reading";
type _Output1721 = {
	unitKind: _Output1722;
	lemma: _Output1131;
	emojiDescription: _Output1335;
};
type _Output1720 = {
	encounter: _Output402;
	reading: _Output1721;
	request: _Output1530;
};
type _Output1725 = "Reading";
type _Output1724 = {
	unitKind: _Output1725;
	lemma: _Output1136;
	emojiDescription: _Output1335;
};
type _Output1723 = {
	encounter: _Output408;
	reading: _Output1724;
	request: _Output1530;
};
type _Output1728 = "Reading";
type _Output1727 = {
	unitKind: _Output1728;
	lemma: _Output1141;
	emojiDescription: _Output1335;
};
type _Output1726 = {
	encounter: _Output414;
	reading: _Output1727;
	request: _Output1530;
};
type _Output1731 = "Reading";
type _Output1730 = {
	unitKind: _Output1731;
	lemma: _Output1147;
	emojiDescription: _Output1335;
};
type _Output1729 = {
	encounter: _Output420;
	reading: _Output1730;
	request: _Output1530;
};
type _Output1734 = "Reading";
type _Output1733 = {
	unitKind: _Output1734;
	lemma: _Output1155;
	emojiDescription: _Output1335;
};
type _Output1732 = {
	encounter: _Output426;
	reading: _Output1733;
	request: _Output1530;
};
type _Output1737 = "Reading";
type _Output1736 = {
	unitKind: _Output1737;
	lemma: _Output1162;
	emojiDescription: _Output1335;
};
type _Output1735 = {
	encounter: _Output432;
	reading: _Output1736;
	request: _Output1530;
};
type _Output1740 = "Reading";
type _Output1739 = {
	unitKind: _Output1740;
	lemma: _Output1169;
	emojiDescription: _Output1335;
};
type _Output1738 = {
	encounter: _Output438;
	reading: _Output1739;
	request: _Output1530;
};
type _Output1743 = "Reading";
type _Output1742 = {
	unitKind: _Output1743;
	lemma: _Output1174;
	emojiDescription: _Output1335;
};
type _Output1741 = {
	encounter: _Output444;
	reading: _Output1742;
	request: _Output1530;
};
type _Output1746 = "Reading";
type _Output1745 = {
	unitKind: _Output1746;
	lemma: _Output1181;
	emojiDescription: _Output1335;
};
type _Output1744 = {
	encounter: _Output450;
	reading: _Output1745;
	request: _Output1530;
};
type _Output1749 = "Reading";
type _Output1748 = {
	unitKind: _Output1749;
	lemma: _Output1186;
	emojiDescription: _Output1335;
};
type _Output1747 = {
	encounter: _Output456;
	reading: _Output1748;
	request: _Output1530;
};
type _Output1752 = "Reading";
type _Output1751 = {
	unitKind: _Output1752;
	lemma: _Output1196;
	emojiDescription: _Output1335;
};
type _Output1750 = {
	encounter: _Output462;
	reading: _Output1751;
	request: _Output1530;
};
type _Output1755 = "Reading";
type _Output1754 = {
	unitKind: _Output1755;
	lemma: _Output1201;
	emojiDescription: _Output1335;
};
type _Output1753 = {
	encounter: _Output468;
	reading: _Output1754;
	request: _Output1530;
};
type _Output1758 = "Reading";
type _Output1757 = {
	unitKind: _Output1758;
	lemma: _Output1206;
	emojiDescription: _Output1335;
};
type _Output1756 = {
	encounter: _Output474;
	reading: _Output1757;
	request: _Output1530;
};
type _Output1761 = "Reading";
type _Output1760 = {
	unitKind: _Output1761;
	lemma: _Output1211;
	emojiDescription: _Output1335;
};
type _Output1759 = {
	encounter: _Output480;
	reading: _Output1760;
	request: _Output1530;
};
type _Output1764 = "Reading";
type _Output1763 = {
	unitKind: _Output1764;
	lemma: _Output1222;
	emojiDescription: _Output1335;
};
type _Output1762 = {
	encounter: _Output486;
	reading: _Output1763;
	request: _Output1530;
};
type _Output1767 = "Reading";
type _Output1766 = {
	unitKind: _Output1767;
	lemma: _Output1232;
	emojiDescription: _Output1335;
};
type _Output1765 = {
	encounter: _Output492;
	reading: _Output1766;
	request: _Output1530;
};
type _Output1770 = "Reading";
type _Output1769 = {
	unitKind: _Output1770;
	lemma: _Output1237;
	emojiDescription: _Output1335;
};
type _Output1768 = {
	encounter: _Output498;
	reading: _Output1769;
	request: _Output1530;
};
type _Output1773 = "Reading";
type _Output1772 = {
	unitKind: _Output1773;
	lemma: _Output1244;
	emojiDescription: _Output1335;
};
type _Output1771 = {
	encounter: _Output504;
	reading: _Output1772;
	request: _Output1530;
};
type _Output1776 = "Reading";
type _Output1775 = {
	unitKind: _Output1776;
	lemma: _Output1249;
	emojiDescription: _Output1335;
};
type _Output1774 = {
	encounter: _Output510;
	reading: _Output1775;
	request: _Output1530;
};
type _Output1779 = "Reading";
type _Output1778 = {
	unitKind: _Output1779;
	lemma: _Output1258;
	emojiDescription: _Output1335;
};
type _Output1777 = {
	encounter: _Output516;
	reading: _Output1778;
	request: _Output1530;
};
type _Output1782 = "Reading";
type _Output1781 = {
	unitKind: _Output1782;
	lemma: _Output1263;
	emojiDescription: _Output1335;
};
type _Output1780 = {
	encounter: _Output522;
	reading: _Output1781;
	request: _Output1530;
};
type _Output1785 = "Reading";
type _Output1784 = {
	unitKind: _Output1785;
	lemma: _Output1268;
	emojiDescription: _Output1335;
};
type _Output1783 = {
	encounter: _Output528;
	reading: _Output1784;
	request: _Output1530;
};
type _Output1788 = "Reading";
type _Output1787 = {
	unitKind: _Output1788;
	lemma: _Output1273;
	emojiDescription: _Output1335;
};
type _Output1786 = {
	encounter: _Output534;
	reading: _Output1787;
	request: _Output1530;
};
type _Output1791 = "Reading";
type _Output1790 = {
	unitKind: _Output1791;
	lemma: _Output1278;
	emojiDescription: _Output1335;
};
type _Output1789 = {
	encounter: _Output540;
	reading: _Output1790;
	request: _Output1530;
};
type _Output1794 = "Reading";
type _Output1793 = {
	unitKind: _Output1794;
	lemma: _Output1283;
	emojiDescription: _Output1335;
};
type _Output1792 = {
	encounter: _Output546;
	reading: _Output1793;
	request: _Output1530;
};
type _Output1797 = "Reading";
type _Output1796 = {
	unitKind: _Output1797;
	lemma: _Output1288;
	emojiDescription: _Output1335;
};
type _Output1795 = {
	encounter: _Output552;
	reading: _Output1796;
	request: _Output1530;
};
type _Output1800 = "Reading";
type _Output1799 = {
	unitKind: _Output1800;
	lemma: _Output1293;
	emojiDescription: _Output1335;
};
type _Output1798 = {
	encounter: _Output558;
	reading: _Output1799;
	request: _Output1530;
};
type _Output1803 = "Reading";
type _Output1802 = {
	unitKind: _Output1803;
	lemma: _Output1298;
	emojiDescription: _Output1335;
};
type _Output1801 = {
	encounter: _Output564;
	reading: _Output1802;
	request: _Output1530;
};
type _Output1806 = "Reading";
type _Output1805 = {
	unitKind: _Output1806;
	lemma: _Output1303;
	emojiDescription: _Output1335;
};
type _Output1804 = {
	encounter: _Output570;
	reading: _Output1805;
	request: _Output1530;
};
type _Output1809 = "Reading";
type _Output1808 = {
	unitKind: _Output1809;
	lemma: _Output1308;
	emojiDescription: _Output1335;
};
type _Output1807 = {
	encounter: _Output576;
	reading: _Output1808;
	request: _Output1530;
};
type _Output1812 = "Reading";
type _Output1811 = {
	unitKind: _Output1812;
	lemma: _Output1313;
	emojiDescription: _Output1335;
};
type _Output1810 = {
	encounter: _Output582;
	reading: _Output1811;
	request: _Output1530;
};
type _Output1815 = "Reading";
type _Output1814 = {
	unitKind: _Output1815;
	lemma: _Output1318;
	emojiDescription: _Output1335;
};
type _Output1813 = {
	encounter: _Output588;
	reading: _Output1814;
	request: _Output1530;
};
type _Output1818 = "Reading";
type _Output1817 = {
	unitKind: _Output1818;
	lemma: _Output1323;
	emojiDescription: _Output1335;
};
type _Output1816 = {
	encounter: _Output594;
	reading: _Output1817;
	request: _Output1530;
};
type _Output1821 = "Reading";
type _Output1820 = {
	unitKind: _Output1821;
	lemma: _Output1328;
	emojiDescription: _Output1335;
};
type _Output1819 = {
	encounter: _Output600;
	reading: _Output1820;
	request: _Output1530;
};
type _Output1526 =
	| _Output1527
	| _Output1537
	| _Output1540
	| _Output1543
	| _Output1546
	| _Output1549
	| _Output1552
	| _Output1555
	| _Output1558
	| _Output1561
	| _Output1564
	| _Output1567
	| _Output1570
	| _Output1573
	| _Output1576
	| _Output1579
	| _Output1582
	| _Output1585
	| _Output1588
	| _Output1591
	| _Output1594
	| _Output1597
	| _Output1600
	| _Output1603
	| _Output1606
	| _Output1609
	| _Output1612
	| _Output1615
	| _Output1618
	| _Output1621
	| _Output1624
	| _Output1627
	| _Output1630
	| _Output1633
	| _Output1636
	| _Output1639
	| _Output1642
	| _Output1645
	| _Output1648
	| _Output1651
	| _Output1654
	| _Output1657
	| _Output1660
	| _Output1663
	| _Output1666
	| _Output1669
	| _Output1672
	| _Output1675
	| _Output1678
	| _Output1681
	| _Output1684
	| _Output1687
	| _Output1690
	| _Output1693
	| _Output1696
	| _Output1699
	| _Output1702
	| _Output1705
	| _Output1708
	| _Output1711
	| _Output1714
	| _Output1717
	| _Output1720
	| _Output1723
	| _Output1726
	| _Output1729
	| _Output1732
	| _Output1735
	| _Output1738
	| _Output1741
	| _Output1744
	| _Output1747
	| _Output1750
	| _Output1753
	| _Output1756
	| _Output1759
	| _Output1762
	| _Output1765
	| _Output1768
	| _Output1771
	| _Output1774
	| _Output1777
	| _Output1780
	| _Output1783
	| _Output1786
	| _Output1789
	| _Output1792
	| _Output1795
	| _Output1798
	| _Output1801
	| _Output1804
	| _Output1807
	| _Output1810
	| _Output1813
	| _Output1816
	| _Output1819;
type _Output1824 = string;
type _Output1823 = [_Output1824, ...Array<_Output1824>];
type _Output1822 = { sourceSentences: _Output1823 };
type _Output1829 = "Contribute" | "Correct";
type _Output1830 = "transcription" | "definition";
type _Output1831 = string;
type _Output1828 = {
	kind: _Output1829;
	aspect: _Output1830;
	value: _Output1831;
};
type _Output1833 = "Retract";
type _Output1832 = { kind: _Output1833; aspect: _Output1830 };
type _Output1835 = "translations";
type _Output1836 = "en" | "ru";
type _Output1837 = Array<_Output1831>;
type _Output1834 = {
	kind: _Output1829;
	aspect: _Output1835;
	language: _Output1836;
	value: _Output1837;
};
type _Output1839 = "Retract";
type _Output1840 = "translations";
type _Output1838 = {
	kind: _Output1839;
	aspect: _Output1840;
	language: _Output1836;
};
type _Output1842 = "semanticRelations";
type _Output1843 = "synonym";
type _Output1844 = "reading";
type _Output1846 =
	| _Output1528
	| _Output1538
	| _Output1541
	| _Output1544
	| _Output1547
	| _Output1550
	| _Output1553
	| _Output1556
	| _Output1559
	| _Output1562
	| _Output1565
	| _Output1568
	| _Output1571
	| _Output1574
	| _Output1577
	| _Output1580
	| _Output1583
	| _Output1586
	| _Output1589
	| _Output1592
	| _Output1595
	| _Output1598
	| _Output1601
	| _Output1604
	| _Output1607
	| _Output1610
	| _Output1613
	| _Output1616
	| _Output1619
	| _Output1622
	| _Output1625
	| _Output1628
	| _Output1631
	| _Output1634
	| _Output1637
	| _Output1640
	| _Output1643
	| _Output1646
	| _Output1649
	| _Output1652
	| _Output1655
	| _Output1658
	| _Output1661
	| _Output1664
	| _Output1667
	| _Output1670
	| _Output1673
	| _Output1676
	| _Output1679
	| _Output1682
	| _Output1685
	| _Output1688
	| _Output1691
	| _Output1694
	| _Output1697
	| _Output1700
	| _Output1703
	| _Output1706
	| _Output1709
	| _Output1712
	| _Output1715
	| _Output1718
	| _Output1721
	| _Output1724
	| _Output1727
	| _Output1730
	| _Output1733
	| _Output1736
	| _Output1739
	| _Output1742
	| _Output1745
	| _Output1748
	| _Output1751
	| _Output1754
	| _Output1757
	| _Output1760
	| _Output1763
	| _Output1766
	| _Output1769
	| _Output1772
	| _Output1775
	| _Output1778
	| _Output1781
	| _Output1784
	| _Output1787
	| _Output1790
	| _Output1793
	| _Output1796
	| _Output1799
	| _Output1802
	| _Output1805
	| _Output1808
	| _Output1811
	| _Output1814
	| _Output1817
	| _Output1820;
type _Output1845 = Array<_Output1846>;
type _Output1841 = {
	kind: _Output1829;
	aspect: _Output1842;
	relation: _Output1843;
	targetKind: _Output1844;
	value: _Output1845;
};
type _Output1848 = "semanticRelations";
type _Output1849 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
type _Output1851 = "lemma";
type _Output1850 = _Output1851 | undefined;
type _Output1853 =
	| _Output608
	| _Output622
	| _Output637
	| _Output647
	| _Output654
	| _Output661
	| _Output681
	| _Output688
	| _Output697
	| _Output706
	| _Output716
	| _Output727
	| _Output752
	| _Output761
	| _Output768
	| _Output775
	| _Output783
	| _Output793
	| _Output798
	| _Output803
	| _Output808
	| _Output813
	| _Output818
	| _Output824
	| _Output829
	| _Output834
	| _Output839
	| _Output844
	| _Output849
	| _Output854
	| _Output861
	| _Output866
	| _Output871
	| _Output885
	| _Output893
	| _Output911
	| _Output919
	| _Output927
	| _Output947
	| _Output958
	| _Output973
	| _Output985
	| _Output993
	| _Output1003
	| _Output1020
	| _Output1030
	| _Output1035
	| _Output1045
	| _Output1053
	| _Output1065
	| _Output1070
	| _Output1075
	| _Output1080
	| _Output1085
	| _Output1090
	| _Output1095
	| _Output1100
	| _Output1105
	| _Output1110
	| _Output1115
	| _Output1120
	| _Output1125
	| _Output1131
	| _Output1136
	| _Output1141
	| _Output1147
	| _Output1155
	| _Output1162
	| _Output1169
	| _Output1174
	| _Output1181
	| _Output1186
	| _Output1196
	| _Output1201
	| _Output1206
	| _Output1211
	| _Output1222
	| _Output1232
	| _Output1237
	| _Output1244
	| _Output1249
	| _Output1258
	| _Output1263
	| _Output1268
	| _Output1273
	| _Output1278
	| _Output1283
	| _Output1288
	| _Output1293
	| _Output1298
	| _Output1303
	| _Output1308
	| _Output1313
	| _Output1318
	| _Output1323
	| _Output1328;
type _Output1852 = Array<_Output1853>;
type _Output1847 = {
	kind: _Output1829;
	aspect: _Output1848;
	relation: _Output1849;
	targetKind?: _Output1850;
	value: _Output1852;
};
type _Output1855 = "Retract";
type _Output1856 = "semanticRelations";
type _Output1857 = "synonym";
type _Output1858 = "reading";
type _Output1854 = {
	kind: _Output1855;
	aspect: _Output1856;
	relation: _Output1857;
	targetKind: _Output1858;
};
type _Output1860 = "Retract";
type _Output1861 = "semanticRelations";
type _Output1863 = "lemma";
type _Output1862 = _Output1863 | undefined;
type _Output1859 = {
	kind: _Output1860;
	aspect: _Output1861;
	relation: _Output1849;
	targetKind?: _Output1862;
};
type _Output1865 = "morphologicalTree";
type _Output1868 = "structure";
type _Output1873 = "morphemeReading";
type _Output1874 =
	| _Output1586
	| _Output1589
	| _Output1592
	| _Output1595
	| _Output1598
	| _Output1601
	| _Output1604
	| _Output1607
	| _Output1610
	| _Output1613
	| _Output1682
	| _Output1685
	| _Output1688
	| _Output1691
	| _Output1694
	| _Output1697
	| _Output1700
	| _Output1703
	| _Output1706
	| _Output1709
	| _Output1712
	| _Output1778
	| _Output1781
	| _Output1784
	| _Output1787
	| _Output1790
	| _Output1793
	| _Output1796
	| _Output1799
	| _Output1802
	| _Output1805
	| _Output1808;
type _Output1872 = { nodeKind: _Output1873; reading: _Output1874 };
type _Output1876 = "unitShadow";
type _Output1879 = string;
type _Output1878 = {
	language: _Output610;
	canonicalForm: _Output1879;
	family: _Output32;
	kind: _Output33;
};
type _Output1880 = {
	language: _Output624;
	canonicalForm: _Output1879;
	family: _Output40;
	kind: _Output41;
};
type _Output1881 = {
	language: _Output639;
	canonicalForm: _Output1879;
	family: _Output46;
	kind: _Output47;
};
type _Output1882 = {
	language: _Output649;
	canonicalForm: _Output1879;
	family: _Output52;
	kind: _Output53;
};
type _Output1883 = {
	language: _Output656;
	canonicalForm: _Output1879;
	family: _Output58;
	kind: _Output59;
};
type _Output1884 = {
	language: _Output663;
	canonicalForm: _Output1879;
	family: _Output64;
	kind: _Output65;
};
type _Output1885 = {
	language: _Output683;
	canonicalForm: _Output1879;
	family: _Output70;
	kind: _Output71;
};
type _Output1886 = {
	language: _Output690;
	canonicalForm: _Output1879;
	family: _Output76;
	kind: _Output77;
};
type _Output1887 = {
	language: _Output699;
	canonicalForm: _Output1879;
	family: _Output82;
	kind: _Output83;
};
type _Output1888 = {
	language: _Output708;
	canonicalForm: _Output1879;
	family: _Output88;
	kind: _Output89;
};
type _Output1889 = {
	language: _Output718;
	canonicalForm: _Output1879;
	family: _Output94;
	kind: _Output95;
};
type _Output1890 = {
	language: _Output729;
	canonicalForm: _Output1879;
	family: _Output100;
	kind: _Output101;
};
type _Output1891 = {
	language: _Output754;
	canonicalForm: _Output1879;
	family: _Output106;
	kind: _Output107;
};
type _Output1892 = {
	language: _Output763;
	canonicalForm: _Output1879;
	family: _Output112;
	kind: _Output113;
};
type _Output1893 = {
	language: _Output770;
	canonicalForm: _Output1879;
	family: _Output118;
	kind: _Output119;
};
type _Output1894 = {
	language: _Output777;
	canonicalForm: _Output1879;
	family: _Output124;
	kind: _Output125;
};
type _Output1895 = {
	language: _Output785;
	canonicalForm: _Output1879;
	family: _Output130;
	kind: _Output131;
};
type _Output1896 = {
	language: _Output846;
	canonicalForm: _Output1879;
	family: _Output196;
	kind: _Output197;
};
type _Output1897 = {
	language: _Output851;
	canonicalForm: _Output1879;
	family: _Output202;
	kind: _Output203;
};
type _Output1898 = {
	language: _Output856;
	canonicalForm: _Output1879;
	family: _Output208;
	kind: _Output209;
};
type _Output1899 = {
	language: _Output863;
	canonicalForm: _Output1879;
	family: _Output214;
	kind: _Output215;
};
type _Output1900 = {
	language: _Output868;
	canonicalForm: _Output1879;
	family: _Output220;
	kind: _Output221;
};
type _Output1901 = {
	language: _Output873;
	canonicalForm: _Output1879;
	family: _Output226;
	kind: _Output227;
};
type _Output1902 = {
	language: _Output887;
	canonicalForm: _Output1879;
	family: _Output232;
	kind: _Output233;
};
type _Output1903 = {
	language: _Output895;
	canonicalForm: _Output1879;
	family: _Output238;
	kind: _Output239;
};
type _Output1904 = {
	language: _Output913;
	canonicalForm: _Output1879;
	family: _Output244;
	kind: _Output245;
};
type _Output1905 = {
	language: _Output921;
	canonicalForm: _Output1879;
	family: _Output250;
	kind: _Output251;
};
type _Output1906 = {
	language: _Output929;
	canonicalForm: _Output1879;
	family: _Output256;
	kind: _Output257;
};
type _Output1907 = {
	language: _Output949;
	canonicalForm: _Output1879;
	family: _Output262;
	kind: _Output263;
};
type _Output1908 = {
	language: _Output960;
	canonicalForm: _Output1879;
	family: _Output268;
	kind: _Output269;
};
type _Output1909 = {
	language: _Output975;
	canonicalForm: _Output1879;
	family: _Output274;
	kind: _Output275;
};
type _Output1910 = {
	language: _Output987;
	canonicalForm: _Output1879;
	family: _Output280;
	kind: _Output281;
};
type _Output1911 = {
	language: _Output995;
	canonicalForm: _Output1879;
	family: _Output286;
	kind: _Output287;
};
type _Output1912 = {
	language: _Output1005;
	canonicalForm: _Output1879;
	family: _Output292;
	kind: _Output293;
};
type _Output1913 = {
	language: _Output1022;
	canonicalForm: _Output1879;
	family: _Output298;
	kind: _Output299;
};
type _Output1914 = {
	language: _Output1032;
	canonicalForm: _Output1879;
	family: _Output304;
	kind: _Output305;
};
type _Output1915 = {
	language: _Output1037;
	canonicalForm: _Output1879;
	family: _Output310;
	kind: _Output311;
};
type _Output1916 = {
	language: _Output1047;
	canonicalForm: _Output1879;
	family: _Output316;
	kind: _Output317;
};
type _Output1917 = {
	language: _Output1055;
	canonicalForm: _Output1879;
	family: _Output322;
	kind: _Output323;
};
type _Output1918 = {
	language: _Output1122;
	canonicalForm: _Output1879;
	family: _Output394;
	kind: _Output395;
};
type _Output1919 = {
	language: _Output1127;
	canonicalForm: _Output1879;
	family: _Output400;
	kind: _Output401;
};
type _Output1920 = {
	language: _Output1133;
	canonicalForm: _Output1879;
	family: _Output406;
	kind: _Output407;
};
type _Output1921 = {
	language: _Output1138;
	canonicalForm: _Output1879;
	family: _Output412;
	kind: _Output413;
};
type _Output1922 = {
	language: _Output1143;
	canonicalForm: _Output1879;
	family: _Output418;
	kind: _Output419;
};
type _Output1923 = {
	language: _Output1149;
	canonicalForm: _Output1879;
	family: _Output424;
	kind: _Output425;
};
type _Output1924 = {
	language: _Output1157;
	canonicalForm: _Output1879;
	family: _Output430;
	kind: _Output431;
};
type _Output1925 = {
	language: _Output1164;
	canonicalForm: _Output1879;
	family: _Output436;
	kind: _Output437;
};
type _Output1926 = {
	language: _Output1171;
	canonicalForm: _Output1879;
	family: _Output442;
	kind: _Output443;
};
type _Output1927 = {
	language: _Output1176;
	canonicalForm: _Output1879;
	family: _Output448;
	kind: _Output449;
};
type _Output1928 = {
	language: _Output1183;
	canonicalForm: _Output1879;
	family: _Output454;
	kind: _Output455;
};
type _Output1929 = {
	language: _Output1188;
	canonicalForm: _Output1879;
	family: _Output460;
	kind: _Output461;
};
type _Output1930 = {
	language: _Output1198;
	canonicalForm: _Output1879;
	family: _Output466;
	kind: _Output467;
};
type _Output1931 = {
	language: _Output1203;
	canonicalForm: _Output1879;
	family: _Output472;
	kind: _Output473;
};
type _Output1932 = {
	language: _Output1208;
	canonicalForm: _Output1879;
	family: _Output478;
	kind: _Output479;
};
type _Output1933 = {
	language: _Output1213;
	canonicalForm: _Output1879;
	family: _Output484;
	kind: _Output485;
};
type _Output1934 = {
	language: _Output1224;
	canonicalForm: _Output1879;
	family: _Output490;
	kind: _Output491;
};
type _Output1935 = {
	language: _Output1234;
	canonicalForm: _Output1879;
	family: _Output496;
	kind: _Output497;
};
type _Output1936 = {
	language: _Output1239;
	canonicalForm: _Output1879;
	family: _Output502;
	kind: _Output503;
};
type _Output1937 = {
	language: _Output1246;
	canonicalForm: _Output1879;
	family: _Output508;
	kind: _Output509;
};
type _Output1938 = {
	language: _Output1251;
	canonicalForm: _Output1879;
	family: _Output514;
	kind: _Output515;
};
type _Output1939 = {
	language: _Output1315;
	canonicalForm: _Output1879;
	family: _Output586;
	kind: _Output587;
};
type _Output1940 = {
	language: _Output1320;
	canonicalForm: _Output1879;
	family: _Output592;
	kind: _Output593;
};
type _Output1941 = {
	language: _Output1325;
	canonicalForm: _Output1879;
	family: _Output598;
	kind: _Output599;
};
type _Output1942 = {
	language: _Output1330;
	canonicalForm: _Output1879;
	family: _Output604;
	kind: _Output605;
};
type _Output1877 =
	| _Output1878
	| _Output1880
	| _Output1881
	| _Output1882
	| _Output1883
	| _Output1884
	| _Output1885
	| _Output1886
	| _Output1887
	| _Output1888
	| _Output1889
	| _Output1890
	| _Output1891
	| _Output1892
	| _Output1893
	| _Output1894
	| _Output1895
	| _Output1896
	| _Output1897
	| _Output1898
	| _Output1899
	| _Output1900
	| _Output1901
	| _Output1902
	| _Output1903
	| _Output1904
	| _Output1905
	| _Output1906
	| _Output1907
	| _Output1908
	| _Output1909
	| _Output1910
	| _Output1911
	| _Output1912
	| _Output1913
	| _Output1914
	| _Output1915
	| _Output1916
	| _Output1917
	| _Output1918
	| _Output1919
	| _Output1920
	| _Output1921
	| _Output1922
	| _Output1923
	| _Output1924
	| _Output1925
	| _Output1926
	| _Output1927
	| _Output1928
	| _Output1929
	| _Output1930
	| _Output1931
	| _Output1932
	| _Output1933
	| _Output1934
	| _Output1935
	| _Output1936
	| _Output1937
	| _Output1938
	| _Output1939
	| _Output1940
	| _Output1941
	| _Output1942;
type _Output1875 = { nodeKind: _Output1876; unitShadow: _Output1877 };
type _Output1944 = "structure";
type _Output1945 = Array<_Output1870>;
type _Output1943 = { nodeKind: _Output1944; children: _Output1945 };
type _Output1871 = _Output1872 | _Output1875 | _Output1943;
type _Output1870 = _Output1871;
type _Output1869 = Array<_Output1870>;
type _Output1867 = { nodeKind: _Output1868; children: _Output1869 };
type _Output1866 = { root: _Output1867 };
type _Output1864 = {
	kind: _Output1829;
	aspect: _Output1865;
	value: _Output1866;
};
type _Output1947 = "lexicalBreakdown";
type _Output1950 = {
	language: _Output610;
	canonicalForm: _Output1879;
	family: _Output32;
	kind: _Output33;
};
type _Output1951 = {
	language: _Output624;
	canonicalForm: _Output1879;
	family: _Output40;
	kind: _Output41;
};
type _Output1952 = {
	language: _Output639;
	canonicalForm: _Output1879;
	family: _Output46;
	kind: _Output47;
};
type _Output1953 = {
	language: _Output649;
	canonicalForm: _Output1879;
	family: _Output52;
	kind: _Output53;
};
type _Output1954 = {
	language: _Output656;
	canonicalForm: _Output1879;
	family: _Output58;
	kind: _Output59;
};
type _Output1955 = {
	language: _Output663;
	canonicalForm: _Output1879;
	family: _Output64;
	kind: _Output65;
};
type _Output1956 = {
	language: _Output683;
	canonicalForm: _Output1879;
	family: _Output70;
	kind: _Output71;
};
type _Output1957 = {
	language: _Output690;
	canonicalForm: _Output1879;
	family: _Output76;
	kind: _Output77;
};
type _Output1958 = {
	language: _Output699;
	canonicalForm: _Output1879;
	family: _Output82;
	kind: _Output83;
};
type _Output1959 = {
	language: _Output708;
	canonicalForm: _Output1879;
	family: _Output88;
	kind: _Output89;
};
type _Output1960 = {
	language: _Output718;
	canonicalForm: _Output1879;
	family: _Output94;
	kind: _Output95;
};
type _Output1961 = {
	language: _Output729;
	canonicalForm: _Output1879;
	family: _Output100;
	kind: _Output101;
};
type _Output1962 = {
	language: _Output754;
	canonicalForm: _Output1879;
	family: _Output106;
	kind: _Output107;
};
type _Output1963 = {
	language: _Output763;
	canonicalForm: _Output1879;
	family: _Output112;
	kind: _Output113;
};
type _Output1964 = {
	language: _Output770;
	canonicalForm: _Output1879;
	family: _Output118;
	kind: _Output119;
};
type _Output1965 = {
	language: _Output777;
	canonicalForm: _Output1879;
	family: _Output124;
	kind: _Output125;
};
type _Output1966 = {
	language: _Output785;
	canonicalForm: _Output1879;
	family: _Output130;
	kind: _Output131;
};
type _Output1967 = {
	language: _Output873;
	canonicalForm: _Output1879;
	family: _Output226;
	kind: _Output227;
};
type _Output1968 = {
	language: _Output887;
	canonicalForm: _Output1879;
	family: _Output232;
	kind: _Output233;
};
type _Output1969 = {
	language: _Output895;
	canonicalForm: _Output1879;
	family: _Output238;
	kind: _Output239;
};
type _Output1970 = {
	language: _Output913;
	canonicalForm: _Output1879;
	family: _Output244;
	kind: _Output245;
};
type _Output1971 = {
	language: _Output921;
	canonicalForm: _Output1879;
	family: _Output250;
	kind: _Output251;
};
type _Output1972 = {
	language: _Output929;
	canonicalForm: _Output1879;
	family: _Output256;
	kind: _Output257;
};
type _Output1973 = {
	language: _Output949;
	canonicalForm: _Output1879;
	family: _Output262;
	kind: _Output263;
};
type _Output1974 = {
	language: _Output960;
	canonicalForm: _Output1879;
	family: _Output268;
	kind: _Output269;
};
type _Output1975 = {
	language: _Output975;
	canonicalForm: _Output1879;
	family: _Output274;
	kind: _Output275;
};
type _Output1976 = {
	language: _Output987;
	canonicalForm: _Output1879;
	family: _Output280;
	kind: _Output281;
};
type _Output1977 = {
	language: _Output995;
	canonicalForm: _Output1879;
	family: _Output286;
	kind: _Output287;
};
type _Output1978 = {
	language: _Output1005;
	canonicalForm: _Output1879;
	family: _Output292;
	kind: _Output293;
};
type _Output1979 = {
	language: _Output1022;
	canonicalForm: _Output1879;
	family: _Output298;
	kind: _Output299;
};
type _Output1980 = {
	language: _Output1032;
	canonicalForm: _Output1879;
	family: _Output304;
	kind: _Output305;
};
type _Output1981 = {
	language: _Output1037;
	canonicalForm: _Output1879;
	family: _Output310;
	kind: _Output311;
};
type _Output1982 = {
	language: _Output1047;
	canonicalForm: _Output1879;
	family: _Output316;
	kind: _Output317;
};
type _Output1983 = {
	language: _Output1055;
	canonicalForm: _Output1879;
	family: _Output322;
	kind: _Output323;
};
type _Output1984 = {
	language: _Output1143;
	canonicalForm: _Output1879;
	family: _Output418;
	kind: _Output419;
};
type _Output1985 = {
	language: _Output1149;
	canonicalForm: _Output1879;
	family: _Output424;
	kind: _Output425;
};
type _Output1986 = {
	language: _Output1157;
	canonicalForm: _Output1879;
	family: _Output430;
	kind: _Output431;
};
type _Output1987 = {
	language: _Output1164;
	canonicalForm: _Output1879;
	family: _Output436;
	kind: _Output437;
};
type _Output1988 = {
	language: _Output1171;
	canonicalForm: _Output1879;
	family: _Output442;
	kind: _Output443;
};
type _Output1989 = {
	language: _Output1176;
	canonicalForm: _Output1879;
	family: _Output448;
	kind: _Output449;
};
type _Output1990 = {
	language: _Output1183;
	canonicalForm: _Output1879;
	family: _Output454;
	kind: _Output455;
};
type _Output1991 = {
	language: _Output1188;
	canonicalForm: _Output1879;
	family: _Output460;
	kind: _Output461;
};
type _Output1992 = {
	language: _Output1198;
	canonicalForm: _Output1879;
	family: _Output466;
	kind: _Output467;
};
type _Output1993 = {
	language: _Output1203;
	canonicalForm: _Output1879;
	family: _Output472;
	kind: _Output473;
};
type _Output1994 = {
	language: _Output1208;
	canonicalForm: _Output1879;
	family: _Output478;
	kind: _Output479;
};
type _Output1995 = {
	language: _Output1213;
	canonicalForm: _Output1879;
	family: _Output484;
	kind: _Output485;
};
type _Output1996 = {
	language: _Output1224;
	canonicalForm: _Output1879;
	family: _Output490;
	kind: _Output491;
};
type _Output1997 = {
	language: _Output1234;
	canonicalForm: _Output1879;
	family: _Output496;
	kind: _Output497;
};
type _Output1998 = {
	language: _Output1239;
	canonicalForm: _Output1879;
	family: _Output502;
	kind: _Output503;
};
type _Output1999 = {
	language: _Output1246;
	canonicalForm: _Output1879;
	family: _Output508;
	kind: _Output509;
};
type _Output2000 = {
	language: _Output1251;
	canonicalForm: _Output1879;
	family: _Output514;
	kind: _Output515;
};
type _Output1949 =
	| _Output1950
	| _Output1951
	| _Output1952
	| _Output1953
	| _Output1954
	| _Output1955
	| _Output1956
	| _Output1957
	| _Output1958
	| _Output1959
	| _Output1960
	| _Output1961
	| _Output1962
	| _Output1963
	| _Output1964
	| _Output1965
	| _Output1966
	| _Output1967
	| _Output1968
	| _Output1969
	| _Output1970
	| _Output1971
	| _Output1972
	| _Output1973
	| _Output1974
	| _Output1975
	| _Output1976
	| _Output1977
	| _Output1978
	| _Output1979
	| _Output1980
	| _Output1981
	| _Output1982
	| _Output1983
	| _Output1984
	| _Output1985
	| _Output1986
	| _Output1987
	| _Output1988
	| _Output1989
	| _Output1990
	| _Output1991
	| _Output1992
	| _Output1993
	| _Output1994
	| _Output1995
	| _Output1996
	| _Output1997
	| _Output1998
	| _Output1999
	| _Output2000;
type _Output1948 = [_Output1949, _Output1949, ...Array<_Output1949>];
type _Output1946 = {
	kind: _Output1829;
	aspect: _Output1947;
	value: _Output1948;
};
type _Output2002 = "Retract";
type _Output2003 = "morphologicalTree" | "lexicalBreakdown";
type _Output2001 = { kind: _Output2002; aspect: _Output2003 };
type _Output1827 =
	| _Output1828
	| _Output1832
	| _Output1834
	| _Output1838
	| _Output1841
	| _Output1847
	| _Output1854
	| _Output1859
	| _Output1864
	| _Output1946
	| _Output2001;
type _Output1826 = Array<_Output1827>;
type _Output2007 = {
	language: _Output610;
	canonicalForm: _Output1879;
	family: _Output32;
	kind: _Output33;
};
type _Output2008 = {
	language: _Output624;
	canonicalForm: _Output1879;
	family: _Output40;
	kind: _Output41;
};
type _Output2009 = {
	language: _Output639;
	canonicalForm: _Output1879;
	family: _Output46;
	kind: _Output47;
};
type _Output2010 = {
	language: _Output649;
	canonicalForm: _Output1879;
	family: _Output52;
	kind: _Output53;
};
type _Output2011 = {
	language: _Output656;
	canonicalForm: _Output1879;
	family: _Output58;
	kind: _Output59;
};
type _Output2012 = {
	language: _Output663;
	canonicalForm: _Output1879;
	family: _Output64;
	kind: _Output65;
};
type _Output2013 = {
	language: _Output683;
	canonicalForm: _Output1879;
	family: _Output70;
	kind: _Output71;
};
type _Output2014 = {
	language: _Output690;
	canonicalForm: _Output1879;
	family: _Output76;
	kind: _Output77;
};
type _Output2015 = {
	language: _Output699;
	canonicalForm: _Output1879;
	family: _Output82;
	kind: _Output83;
};
type _Output2016 = {
	language: _Output708;
	canonicalForm: _Output1879;
	family: _Output88;
	kind: _Output89;
};
type _Output2017 = {
	language: _Output718;
	canonicalForm: _Output1879;
	family: _Output94;
	kind: _Output95;
};
type _Output2018 = {
	language: _Output729;
	canonicalForm: _Output1879;
	family: _Output100;
	kind: _Output101;
};
type _Output2019 = {
	language: _Output754;
	canonicalForm: _Output1879;
	family: _Output106;
	kind: _Output107;
};
type _Output2020 = {
	language: _Output763;
	canonicalForm: _Output1879;
	family: _Output112;
	kind: _Output113;
};
type _Output2021 = {
	language: _Output770;
	canonicalForm: _Output1879;
	family: _Output118;
	kind: _Output119;
};
type _Output2022 = {
	language: _Output777;
	canonicalForm: _Output1879;
	family: _Output124;
	kind: _Output125;
};
type _Output2023 = {
	language: _Output785;
	canonicalForm: _Output1879;
	family: _Output130;
	kind: _Output131;
};
type _Output2024 = {
	language: _Output795;
	canonicalForm: _Output1879;
	family: _Output136;
	kind: _Output137;
};
type _Output2025 = {
	language: _Output800;
	canonicalForm: _Output1879;
	family: _Output142;
	kind: _Output143;
};
type _Output2026 = {
	language: _Output805;
	canonicalForm: _Output1879;
	family: _Output148;
	kind: _Output149;
};
type _Output2027 = {
	language: _Output810;
	canonicalForm: _Output1879;
	family: _Output154;
	kind: _Output155;
};
type _Output2028 = {
	language: _Output815;
	canonicalForm: _Output1879;
	family: _Output160;
	kind: _Output161;
};
type _Output2029 = {
	language: _Output820;
	canonicalForm: _Output1879;
	family: _Output166;
	kind: _Output167;
};
type _Output2030 = {
	language: _Output826;
	canonicalForm: _Output1879;
	family: _Output172;
	kind: _Output173;
};
type _Output2031 = {
	language: _Output831;
	canonicalForm: _Output1879;
	family: _Output178;
	kind: _Output179;
};
type _Output2032 = {
	language: _Output836;
	canonicalForm: _Output1879;
	family: _Output184;
	kind: _Output185;
};
type _Output2033 = {
	language: _Output841;
	canonicalForm: _Output1879;
	family: _Output190;
	kind: _Output191;
};
type _Output2034 = {
	language: _Output846;
	canonicalForm: _Output1879;
	family: _Output196;
	kind: _Output197;
};
type _Output2035 = {
	language: _Output851;
	canonicalForm: _Output1879;
	family: _Output202;
	kind: _Output203;
};
type _Output2036 = {
	language: _Output856;
	canonicalForm: _Output1879;
	family: _Output208;
	kind: _Output209;
};
type _Output2037 = {
	language: _Output863;
	canonicalForm: _Output1879;
	family: _Output214;
	kind: _Output215;
};
type _Output2038 = {
	language: _Output868;
	canonicalForm: _Output1879;
	family: _Output220;
	kind: _Output221;
};
type _Output2039 = {
	language: _Output873;
	canonicalForm: _Output1879;
	family: _Output226;
	kind: _Output227;
};
type _Output2040 = {
	language: _Output887;
	canonicalForm: _Output1879;
	family: _Output232;
	kind: _Output233;
};
type _Output2041 = {
	language: _Output895;
	canonicalForm: _Output1879;
	family: _Output238;
	kind: _Output239;
};
type _Output2042 = {
	language: _Output913;
	canonicalForm: _Output1879;
	family: _Output244;
	kind: _Output245;
};
type _Output2043 = {
	language: _Output921;
	canonicalForm: _Output1879;
	family: _Output250;
	kind: _Output251;
};
type _Output2044 = {
	language: _Output929;
	canonicalForm: _Output1879;
	family: _Output256;
	kind: _Output257;
};
type _Output2045 = {
	language: _Output949;
	canonicalForm: _Output1879;
	family: _Output262;
	kind: _Output263;
};
type _Output2046 = {
	language: _Output960;
	canonicalForm: _Output1879;
	family: _Output268;
	kind: _Output269;
};
type _Output2047 = {
	language: _Output975;
	canonicalForm: _Output1879;
	family: _Output274;
	kind: _Output275;
};
type _Output2048 = {
	language: _Output987;
	canonicalForm: _Output1879;
	family: _Output280;
	kind: _Output281;
};
type _Output2049 = {
	language: _Output995;
	canonicalForm: _Output1879;
	family: _Output286;
	kind: _Output287;
};
type _Output2050 = {
	language: _Output1005;
	canonicalForm: _Output1879;
	family: _Output292;
	kind: _Output293;
};
type _Output2051 = {
	language: _Output1022;
	canonicalForm: _Output1879;
	family: _Output298;
	kind: _Output299;
};
type _Output2052 = {
	language: _Output1032;
	canonicalForm: _Output1879;
	family: _Output304;
	kind: _Output305;
};
type _Output2053 = {
	language: _Output1037;
	canonicalForm: _Output1879;
	family: _Output310;
	kind: _Output311;
};
type _Output2054 = {
	language: _Output1047;
	canonicalForm: _Output1879;
	family: _Output316;
	kind: _Output317;
};
type _Output2055 = {
	language: _Output1055;
	canonicalForm: _Output1879;
	family: _Output322;
	kind: _Output323;
};
type _Output2056 = {
	language: _Output1067;
	canonicalForm: _Output1879;
	family: _Output328;
	kind: _Output329;
};
type _Output2057 = {
	language: _Output1072;
	canonicalForm: _Output1879;
	family: _Output334;
	kind: _Output335;
};
type _Output2058 = {
	language: _Output1077;
	canonicalForm: _Output1879;
	family: _Output340;
	kind: _Output341;
};
type _Output2059 = {
	language: _Output1082;
	canonicalForm: _Output1879;
	family: _Output346;
	kind: _Output347;
};
type _Output2060 = {
	language: _Output1087;
	canonicalForm: _Output1879;
	family: _Output352;
	kind: _Output353;
};
type _Output2061 = {
	language: _Output1092;
	canonicalForm: _Output1879;
	family: _Output358;
	kind: _Output359;
};
type _Output2062 = {
	language: _Output1097;
	canonicalForm: _Output1879;
	family: _Output364;
	kind: _Output365;
};
type _Output2063 = {
	language: _Output1102;
	canonicalForm: _Output1879;
	family: _Output370;
	kind: _Output371;
};
type _Output2064 = {
	language: _Output1107;
	canonicalForm: _Output1879;
	family: _Output376;
	kind: _Output377;
};
type _Output2065 = {
	language: _Output1112;
	canonicalForm: _Output1879;
	family: _Output382;
	kind: _Output383;
};
type _Output2066 = {
	language: _Output1117;
	canonicalForm: _Output1879;
	family: _Output388;
	kind: _Output389;
};
type _Output2067 = {
	language: _Output1122;
	canonicalForm: _Output1879;
	family: _Output394;
	kind: _Output395;
};
type _Output2068 = {
	language: _Output1127;
	canonicalForm: _Output1879;
	family: _Output400;
	kind: _Output401;
};
type _Output2069 = {
	language: _Output1133;
	canonicalForm: _Output1879;
	family: _Output406;
	kind: _Output407;
};
type _Output2070 = {
	language: _Output1138;
	canonicalForm: _Output1879;
	family: _Output412;
	kind: _Output413;
};
type _Output2071 = {
	language: _Output1143;
	canonicalForm: _Output1879;
	family: _Output418;
	kind: _Output419;
};
type _Output2072 = {
	language: _Output1149;
	canonicalForm: _Output1879;
	family: _Output424;
	kind: _Output425;
};
type _Output2073 = {
	language: _Output1157;
	canonicalForm: _Output1879;
	family: _Output430;
	kind: _Output431;
};
type _Output2074 = {
	language: _Output1164;
	canonicalForm: _Output1879;
	family: _Output436;
	kind: _Output437;
};
type _Output2075 = {
	language: _Output1171;
	canonicalForm: _Output1879;
	family: _Output442;
	kind: _Output443;
};
type _Output2076 = {
	language: _Output1176;
	canonicalForm: _Output1879;
	family: _Output448;
	kind: _Output449;
};
type _Output2077 = {
	language: _Output1183;
	canonicalForm: _Output1879;
	family: _Output454;
	kind: _Output455;
};
type _Output2078 = {
	language: _Output1188;
	canonicalForm: _Output1879;
	family: _Output460;
	kind: _Output461;
};
type _Output2079 = {
	language: _Output1198;
	canonicalForm: _Output1879;
	family: _Output466;
	kind: _Output467;
};
type _Output2080 = {
	language: _Output1203;
	canonicalForm: _Output1879;
	family: _Output472;
	kind: _Output473;
};
type _Output2081 = {
	language: _Output1208;
	canonicalForm: _Output1879;
	family: _Output478;
	kind: _Output479;
};
type _Output2082 = {
	language: _Output1213;
	canonicalForm: _Output1879;
	family: _Output484;
	kind: _Output485;
};
type _Output2083 = {
	language: _Output1224;
	canonicalForm: _Output1879;
	family: _Output490;
	kind: _Output491;
};
type _Output2084 = {
	language: _Output1234;
	canonicalForm: _Output1879;
	family: _Output496;
	kind: _Output497;
};
type _Output2085 = {
	language: _Output1239;
	canonicalForm: _Output1879;
	family: _Output502;
	kind: _Output503;
};
type _Output2086 = {
	language: _Output1246;
	canonicalForm: _Output1879;
	family: _Output508;
	kind: _Output509;
};
type _Output2087 = {
	language: _Output1251;
	canonicalForm: _Output1879;
	family: _Output514;
	kind: _Output515;
};
type _Output2088 = {
	language: _Output1260;
	canonicalForm: _Output1879;
	family: _Output520;
	kind: _Output521;
};
type _Output2089 = {
	language: _Output1265;
	canonicalForm: _Output1879;
	family: _Output526;
	kind: _Output527;
};
type _Output2090 = {
	language: _Output1270;
	canonicalForm: _Output1879;
	family: _Output532;
	kind: _Output533;
};
type _Output2091 = {
	language: _Output1275;
	canonicalForm: _Output1879;
	family: _Output538;
	kind: _Output539;
};
type _Output2092 = {
	language: _Output1280;
	canonicalForm: _Output1879;
	family: _Output544;
	kind: _Output545;
};
type _Output2093 = {
	language: _Output1285;
	canonicalForm: _Output1879;
	family: _Output550;
	kind: _Output551;
};
type _Output2094 = {
	language: _Output1290;
	canonicalForm: _Output1879;
	family: _Output556;
	kind: _Output557;
};
type _Output2095 = {
	language: _Output1295;
	canonicalForm: _Output1879;
	family: _Output562;
	kind: _Output563;
};
type _Output2096 = {
	language: _Output1300;
	canonicalForm: _Output1879;
	family: _Output568;
	kind: _Output569;
};
type _Output2097 = {
	language: _Output1305;
	canonicalForm: _Output1879;
	family: _Output574;
	kind: _Output575;
};
type _Output2098 = {
	language: _Output1310;
	canonicalForm: _Output1879;
	family: _Output580;
	kind: _Output581;
};
type _Output2099 = {
	language: _Output1315;
	canonicalForm: _Output1879;
	family: _Output586;
	kind: _Output587;
};
type _Output2100 = {
	language: _Output1320;
	canonicalForm: _Output1879;
	family: _Output592;
	kind: _Output593;
};
type _Output2101 = {
	language: _Output1325;
	canonicalForm: _Output1879;
	family: _Output598;
	kind: _Output599;
};
type _Output2102 = {
	language: _Output1330;
	canonicalForm: _Output1879;
	family: _Output604;
	kind: _Output605;
};
type _Output2006 =
	| _Output2007
	| _Output2008
	| _Output2009
	| _Output2010
	| _Output2011
	| _Output2012
	| _Output2013
	| _Output2014
	| _Output2015
	| _Output2016
	| _Output2017
	| _Output2018
	| _Output2019
	| _Output2020
	| _Output2021
	| _Output2022
	| _Output2023
	| _Output2024
	| _Output2025
	| _Output2026
	| _Output2027
	| _Output2028
	| _Output2029
	| _Output2030
	| _Output2031
	| _Output2032
	| _Output2033
	| _Output2034
	| _Output2035
	| _Output2036
	| _Output2037
	| _Output2038
	| _Output2039
	| _Output2040
	| _Output2041
	| _Output2042
	| _Output2043
	| _Output2044
	| _Output2045
	| _Output2046
	| _Output2047
	| _Output2048
	| _Output2049
	| _Output2050
	| _Output2051
	| _Output2052
	| _Output2053
	| _Output2054
	| _Output2055
	| _Output2056
	| _Output2057
	| _Output2058
	| _Output2059
	| _Output2060
	| _Output2061
	| _Output2062
	| _Output2063
	| _Output2064
	| _Output2065
	| _Output2066
	| _Output2067
	| _Output2068
	| _Output2069
	| _Output2070
	| _Output2071
	| _Output2072
	| _Output2073
	| _Output2074
	| _Output2075
	| _Output2076
	| _Output2077
	| _Output2078
	| _Output2079
	| _Output2080
	| _Output2081
	| _Output2082
	| _Output2083
	| _Output2084
	| _Output2085
	| _Output2086
	| _Output2087
	| _Output2088
	| _Output2089
	| _Output2090
	| _Output2091
	| _Output2092
	| _Output2093
	| _Output2094
	| _Output2095
	| _Output2096
	| _Output2097
	| _Output2098
	| _Output2099
	| _Output2100
	| _Output2101
	| _Output2102;
type _Output2005 = { relation: _Output1849; target: _Output2006 };
type _Output2004 = Array<_Output2005>;
type _Output2105 =
	| "transcription"
	| "definition"
	| "translations"
	| "semanticRelations"
	| "morphologicalTree"
	| "lexicalBreakdown";
type _Output2107 = string;
type _Output2106 = _Output2107 | undefined;
type _Output2109 = string;
type _Output2108 = _Output2109 | undefined;
type _Output2110 =
	| "InvalidInput"
	| "ProviderFailure"
	| "InvalidModelOutput"
	| "Unresolved"
	| "NotImplemented"
	| "CatalogMiss";
type _Output2111 = string;
type _Output2104 = {
	aspect: _Output2105;
	leaf?: _Output2106;
	candidate?: _Output2108;
	code: _Output2110;
	message: _Output2111;
};
type _Output2103 = Array<_Output2104>;
type _Output1825 = {
	changes: _Output1826;
	pendingRelations: _Output2004;
	failures: _Output2103;
};
export type Segment = _Output0;
export type SegmentedSentence = _Output3;
export type SegmentationDecision = _Output7;
export type Encounter = _Output27;
export type GenerationInput = _Output606;
export type ComparisonInput = _Output1332;
export type KnowledgeInput = _Output1526;
export type SegmentInput = _Output1822;
export type KnowledgeProduction = _Output1825;
