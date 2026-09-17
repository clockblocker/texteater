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
type _Output32 = "Construction";
type _Output33 = "Fusion";
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
type _Output41 = "ADJ";
type _Output39 = {
	family: _Output40;
	kind: _Output41;
	memberSegmentIndices: _Output34;
};
type _Output36 = { sentence: _Output37; target: _Output39 };
type _Output44 = "de";
type _Output43 = { id: _Output4; language: _Output44; segments: _Output6 };
type _Output46 = "Lexeme";
type _Output47 = "ADP";
type _Output45 = {
	family: _Output46;
	kind: _Output47;
	memberSegmentIndices: _Output34;
};
type _Output42 = { sentence: _Output43; target: _Output45 };
type _Output50 = "de";
type _Output49 = { id: _Output4; language: _Output50; segments: _Output6 };
type _Output52 = "Lexeme";
type _Output53 = "ADV";
type _Output51 = {
	family: _Output52;
	kind: _Output53;
	memberSegmentIndices: _Output34;
};
type _Output48 = { sentence: _Output49; target: _Output51 };
type _Output56 = "de";
type _Output55 = { id: _Output4; language: _Output56; segments: _Output6 };
type _Output58 = "Lexeme";
type _Output59 = "AUX";
type _Output57 = {
	family: _Output58;
	kind: _Output59;
	memberSegmentIndices: _Output34;
};
type _Output54 = { sentence: _Output55; target: _Output57 };
type _Output62 = "de";
type _Output61 = { id: _Output4; language: _Output62; segments: _Output6 };
type _Output64 = "Lexeme";
type _Output65 = "CCONJ";
type _Output63 = {
	family: _Output64;
	kind: _Output65;
	memberSegmentIndices: _Output34;
};
type _Output60 = { sentence: _Output61; target: _Output63 };
type _Output68 = "de";
type _Output67 = { id: _Output4; language: _Output68; segments: _Output6 };
type _Output70 = "Lexeme";
type _Output71 = "DET";
type _Output69 = {
	family: _Output70;
	kind: _Output71;
	memberSegmentIndices: _Output34;
};
type _Output66 = { sentence: _Output67; target: _Output69 };
type _Output74 = "de";
type _Output73 = { id: _Output4; language: _Output74; segments: _Output6 };
type _Output76 = "Lexeme";
type _Output77 = "INTJ";
type _Output75 = {
	family: _Output76;
	kind: _Output77;
	memberSegmentIndices: _Output34;
};
type _Output72 = { sentence: _Output73; target: _Output75 };
type _Output80 = "de";
type _Output79 = { id: _Output4; language: _Output80; segments: _Output6 };
type _Output82 = "Lexeme";
type _Output83 = "NOUN";
type _Output81 = {
	family: _Output82;
	kind: _Output83;
	memberSegmentIndices: _Output34;
};
type _Output78 = { sentence: _Output79; target: _Output81 };
type _Output86 = "de";
type _Output85 = { id: _Output4; language: _Output86; segments: _Output6 };
type _Output88 = "Lexeme";
type _Output89 = "NUM";
type _Output87 = {
	family: _Output88;
	kind: _Output89;
	memberSegmentIndices: _Output34;
};
type _Output84 = { sentence: _Output85; target: _Output87 };
type _Output92 = "de";
type _Output91 = { id: _Output4; language: _Output92; segments: _Output6 };
type _Output94 = "Lexeme";
type _Output95 = "X";
type _Output93 = {
	family: _Output94;
	kind: _Output95;
	memberSegmentIndices: _Output34;
};
type _Output90 = { sentence: _Output91; target: _Output93 };
type _Output98 = "de";
type _Output97 = { id: _Output4; language: _Output98; segments: _Output6 };
type _Output100 = "Lexeme";
type _Output101 = "PART";
type _Output99 = {
	family: _Output100;
	kind: _Output101;
	memberSegmentIndices: _Output34;
};
type _Output96 = { sentence: _Output97; target: _Output99 };
type _Output104 = "de";
type _Output103 = { id: _Output4; language: _Output104; segments: _Output6 };
type _Output106 = "Lexeme";
type _Output107 = "PRON";
type _Output105 = {
	family: _Output106;
	kind: _Output107;
	memberSegmentIndices: _Output34;
};
type _Output102 = { sentence: _Output103; target: _Output105 };
type _Output110 = "de";
type _Output109 = { id: _Output4; language: _Output110; segments: _Output6 };
type _Output112 = "Lexeme";
type _Output113 = "PROPN";
type _Output111 = {
	family: _Output112;
	kind: _Output113;
	memberSegmentIndices: _Output34;
};
type _Output108 = { sentence: _Output109; target: _Output111 };
type _Output116 = "de";
type _Output115 = { id: _Output4; language: _Output116; segments: _Output6 };
type _Output118 = "Lexeme";
type _Output119 = "PUNCT";
type _Output117 = {
	family: _Output118;
	kind: _Output119;
	memberSegmentIndices: _Output34;
};
type _Output114 = { sentence: _Output115; target: _Output117 };
type _Output122 = "de";
type _Output121 = { id: _Output4; language: _Output122; segments: _Output6 };
type _Output124 = "Lexeme";
type _Output125 = "SCONJ";
type _Output123 = {
	family: _Output124;
	kind: _Output125;
	memberSegmentIndices: _Output34;
};
type _Output120 = { sentence: _Output121; target: _Output123 };
type _Output128 = "de";
type _Output127 = { id: _Output4; language: _Output128; segments: _Output6 };
type _Output130 = "Lexeme";
type _Output131 = "SYM";
type _Output129 = {
	family: _Output130;
	kind: _Output131;
	memberSegmentIndices: _Output34;
};
type _Output126 = { sentence: _Output127; target: _Output129 };
type _Output134 = "de";
type _Output133 = { id: _Output4; language: _Output134; segments: _Output6 };
type _Output136 = "Lexeme";
type _Output137 = "VERB";
type _Output135 = {
	family: _Output136;
	kind: _Output137;
	memberSegmentIndices: _Output34;
};
type _Output132 = { sentence: _Output133; target: _Output135 };
type _Output140 = "de";
type _Output139 = { id: _Output4; language: _Output140; segments: _Output6 };
type _Output142 = "Morpheme";
type _Output143 = "Circumfix";
type _Output141 = {
	family: _Output142;
	kind: _Output143;
	memberSegmentIndices: _Output34;
};
type _Output138 = { sentence: _Output139; target: _Output141 };
type _Output146 = "de";
type _Output145 = { id: _Output4; language: _Output146; segments: _Output6 };
type _Output148 = "Morpheme";
type _Output149 = "Clitic";
type _Output147 = {
	family: _Output148;
	kind: _Output149;
	memberSegmentIndices: _Output34;
};
type _Output144 = { sentence: _Output145; target: _Output147 };
type _Output152 = "de";
type _Output151 = { id: _Output4; language: _Output152; segments: _Output6 };
type _Output154 = "Morpheme";
type _Output155 = "Duplifix";
type _Output153 = {
	family: _Output154;
	kind: _Output155;
	memberSegmentIndices: _Output34;
};
type _Output150 = { sentence: _Output151; target: _Output153 };
type _Output158 = "de";
type _Output157 = { id: _Output4; language: _Output158; segments: _Output6 };
type _Output160 = "Morpheme";
type _Output161 = "Infix";
type _Output159 = {
	family: _Output160;
	kind: _Output161;
	memberSegmentIndices: _Output34;
};
type _Output156 = { sentence: _Output157; target: _Output159 };
type _Output164 = "de";
type _Output163 = { id: _Output4; language: _Output164; segments: _Output6 };
type _Output166 = "Morpheme";
type _Output167 = "Interfix";
type _Output165 = {
	family: _Output166;
	kind: _Output167;
	memberSegmentIndices: _Output34;
};
type _Output162 = { sentence: _Output163; target: _Output165 };
type _Output170 = "de";
type _Output169 = { id: _Output4; language: _Output170; segments: _Output6 };
type _Output172 = "Morpheme";
type _Output173 = "Prefix";
type _Output171 = {
	family: _Output172;
	kind: _Output173;
	memberSegmentIndices: _Output34;
};
type _Output168 = { sentence: _Output169; target: _Output171 };
type _Output176 = "de";
type _Output175 = { id: _Output4; language: _Output176; segments: _Output6 };
type _Output178 = "Morpheme";
type _Output179 = "Root";
type _Output177 = {
	family: _Output178;
	kind: _Output179;
	memberSegmentIndices: _Output34;
};
type _Output174 = { sentence: _Output175; target: _Output177 };
type _Output182 = "de";
type _Output181 = { id: _Output4; language: _Output182; segments: _Output6 };
type _Output184 = "Morpheme";
type _Output185 = "Suffix";
type _Output183 = {
	family: _Output184;
	kind: _Output185;
	memberSegmentIndices: _Output34;
};
type _Output180 = { sentence: _Output181; target: _Output183 };
type _Output188 = "de";
type _Output187 = { id: _Output4; language: _Output188; segments: _Output6 };
type _Output190 = "Morpheme";
type _Output191 = "Suffixoid";
type _Output189 = {
	family: _Output190;
	kind: _Output191;
	memberSegmentIndices: _Output34;
};
type _Output186 = { sentence: _Output187; target: _Output189 };
type _Output194 = "de";
type _Output193 = { id: _Output4; language: _Output194; segments: _Output6 };
type _Output196 = "Morpheme";
type _Output197 = "Transfix";
type _Output195 = {
	family: _Output196;
	kind: _Output197;
	memberSegmentIndices: _Output34;
};
type _Output192 = { sentence: _Output193; target: _Output195 };
type _Output200 = "de";
type _Output199 = { id: _Output4; language: _Output200; segments: _Output6 };
type _Output202 = "Phraseme";
type _Output203 = "Aphorism";
type _Output201 = {
	family: _Output202;
	kind: _Output203;
	memberSegmentIndices: _Output34;
};
type _Output198 = { sentence: _Output199; target: _Output201 };
type _Output206 = "de";
type _Output205 = { id: _Output4; language: _Output206; segments: _Output6 };
type _Output208 = "Phraseme";
type _Output209 = "Collocation";
type _Output207 = {
	family: _Output208;
	kind: _Output209;
	memberSegmentIndices: _Output34;
};
type _Output204 = { sentence: _Output205; target: _Output207 };
type _Output212 = "de";
type _Output211 = { id: _Output4; language: _Output212; segments: _Output6 };
type _Output214 = "Phraseme";
type _Output215 = "DiscourseFormula";
type _Output213 = {
	family: _Output214;
	kind: _Output215;
	memberSegmentIndices: _Output34;
};
type _Output210 = { sentence: _Output211; target: _Output213 };
type _Output218 = "de";
type _Output217 = { id: _Output4; language: _Output218; segments: _Output6 };
type _Output220 = "Phraseme";
type _Output221 = "Idiom";
type _Output219 = {
	family: _Output220;
	kind: _Output221;
	memberSegmentIndices: _Output34;
};
type _Output216 = { sentence: _Output217; target: _Output219 };
type _Output224 = "de";
type _Output223 = { id: _Output4; language: _Output224; segments: _Output6 };
type _Output226 = "Phraseme";
type _Output227 = "Proverb";
type _Output225 = {
	family: _Output226;
	kind: _Output227;
	memberSegmentIndices: _Output34;
};
type _Output222 = { sentence: _Output223; target: _Output225 };
type _Output230 = "en";
type _Output229 = { id: _Output4; language: _Output230; segments: _Output6 };
type _Output232 = "Construction";
type _Output233 = "Fusion";
type _Output231 = {
	family: _Output232;
	kind: _Output233;
	memberSegmentIndices: _Output34;
};
type _Output228 = { sentence: _Output229; target: _Output231 };
type _Output236 = "en";
type _Output235 = { id: _Output4; language: _Output236; segments: _Output6 };
type _Output238 = "Lexeme";
type _Output239 = "ADJ";
type _Output237 = {
	family: _Output238;
	kind: _Output239;
	memberSegmentIndices: _Output34;
};
type _Output234 = { sentence: _Output235; target: _Output237 };
type _Output242 = "en";
type _Output241 = { id: _Output4; language: _Output242; segments: _Output6 };
type _Output244 = "Lexeme";
type _Output245 = "ADP";
type _Output243 = {
	family: _Output244;
	kind: _Output245;
	memberSegmentIndices: _Output34;
};
type _Output240 = { sentence: _Output241; target: _Output243 };
type _Output248 = "en";
type _Output247 = { id: _Output4; language: _Output248; segments: _Output6 };
type _Output250 = "Lexeme";
type _Output251 = "ADV";
type _Output249 = {
	family: _Output250;
	kind: _Output251;
	memberSegmentIndices: _Output34;
};
type _Output246 = { sentence: _Output247; target: _Output249 };
type _Output254 = "en";
type _Output253 = { id: _Output4; language: _Output254; segments: _Output6 };
type _Output256 = "Lexeme";
type _Output257 = "AUX";
type _Output255 = {
	family: _Output256;
	kind: _Output257;
	memberSegmentIndices: _Output34;
};
type _Output252 = { sentence: _Output253; target: _Output255 };
type _Output260 = "en";
type _Output259 = { id: _Output4; language: _Output260; segments: _Output6 };
type _Output262 = "Lexeme";
type _Output263 = "CCONJ";
type _Output261 = {
	family: _Output262;
	kind: _Output263;
	memberSegmentIndices: _Output34;
};
type _Output258 = { sentence: _Output259; target: _Output261 };
type _Output266 = "en";
type _Output265 = { id: _Output4; language: _Output266; segments: _Output6 };
type _Output268 = "Lexeme";
type _Output269 = "DET";
type _Output267 = {
	family: _Output268;
	kind: _Output269;
	memberSegmentIndices: _Output34;
};
type _Output264 = { sentence: _Output265; target: _Output267 };
type _Output272 = "en";
type _Output271 = { id: _Output4; language: _Output272; segments: _Output6 };
type _Output274 = "Lexeme";
type _Output275 = "INTJ";
type _Output273 = {
	family: _Output274;
	kind: _Output275;
	memberSegmentIndices: _Output34;
};
type _Output270 = { sentence: _Output271; target: _Output273 };
type _Output278 = "en";
type _Output277 = { id: _Output4; language: _Output278; segments: _Output6 };
type _Output280 = "Lexeme";
type _Output281 = "NOUN";
type _Output279 = {
	family: _Output280;
	kind: _Output281;
	memberSegmentIndices: _Output34;
};
type _Output276 = { sentence: _Output277; target: _Output279 };
type _Output284 = "en";
type _Output283 = { id: _Output4; language: _Output284; segments: _Output6 };
type _Output286 = "Lexeme";
type _Output287 = "NUM";
type _Output285 = {
	family: _Output286;
	kind: _Output287;
	memberSegmentIndices: _Output34;
};
type _Output282 = { sentence: _Output283; target: _Output285 };
type _Output290 = "en";
type _Output289 = { id: _Output4; language: _Output290; segments: _Output6 };
type _Output292 = "Lexeme";
type _Output293 = "X";
type _Output291 = {
	family: _Output292;
	kind: _Output293;
	memberSegmentIndices: _Output34;
};
type _Output288 = { sentence: _Output289; target: _Output291 };
type _Output296 = "en";
type _Output295 = { id: _Output4; language: _Output296; segments: _Output6 };
type _Output298 = "Lexeme";
type _Output299 = "PART";
type _Output297 = {
	family: _Output298;
	kind: _Output299;
	memberSegmentIndices: _Output34;
};
type _Output294 = { sentence: _Output295; target: _Output297 };
type _Output302 = "en";
type _Output301 = { id: _Output4; language: _Output302; segments: _Output6 };
type _Output304 = "Lexeme";
type _Output305 = "PRON";
type _Output303 = {
	family: _Output304;
	kind: _Output305;
	memberSegmentIndices: _Output34;
};
type _Output300 = { sentence: _Output301; target: _Output303 };
type _Output308 = "en";
type _Output307 = { id: _Output4; language: _Output308; segments: _Output6 };
type _Output310 = "Lexeme";
type _Output311 = "PROPN";
type _Output309 = {
	family: _Output310;
	kind: _Output311;
	memberSegmentIndices: _Output34;
};
type _Output306 = { sentence: _Output307; target: _Output309 };
type _Output314 = "en";
type _Output313 = { id: _Output4; language: _Output314; segments: _Output6 };
type _Output316 = "Lexeme";
type _Output317 = "PUNCT";
type _Output315 = {
	family: _Output316;
	kind: _Output317;
	memberSegmentIndices: _Output34;
};
type _Output312 = { sentence: _Output313; target: _Output315 };
type _Output320 = "en";
type _Output319 = { id: _Output4; language: _Output320; segments: _Output6 };
type _Output322 = "Lexeme";
type _Output323 = "SCONJ";
type _Output321 = {
	family: _Output322;
	kind: _Output323;
	memberSegmentIndices: _Output34;
};
type _Output318 = { sentence: _Output319; target: _Output321 };
type _Output326 = "en";
type _Output325 = { id: _Output4; language: _Output326; segments: _Output6 };
type _Output328 = "Lexeme";
type _Output329 = "SYM";
type _Output327 = {
	family: _Output328;
	kind: _Output329;
	memberSegmentIndices: _Output34;
};
type _Output324 = { sentence: _Output325; target: _Output327 };
type _Output332 = "en";
type _Output331 = { id: _Output4; language: _Output332; segments: _Output6 };
type _Output334 = "Lexeme";
type _Output335 = "VERB";
type _Output333 = {
	family: _Output334;
	kind: _Output335;
	memberSegmentIndices: _Output34;
};
type _Output330 = { sentence: _Output331; target: _Output333 };
type _Output338 = "en";
type _Output337 = { id: _Output4; language: _Output338; segments: _Output6 };
type _Output340 = "Morpheme";
type _Output341 = "Circumfix";
type _Output339 = {
	family: _Output340;
	kind: _Output341;
	memberSegmentIndices: _Output34;
};
type _Output336 = { sentence: _Output337; target: _Output339 };
type _Output344 = "en";
type _Output343 = { id: _Output4; language: _Output344; segments: _Output6 };
type _Output346 = "Morpheme";
type _Output347 = "Clitic";
type _Output345 = {
	family: _Output346;
	kind: _Output347;
	memberSegmentIndices: _Output34;
};
type _Output342 = { sentence: _Output343; target: _Output345 };
type _Output350 = "en";
type _Output349 = { id: _Output4; language: _Output350; segments: _Output6 };
type _Output352 = "Morpheme";
type _Output353 = "Duplifix";
type _Output351 = {
	family: _Output352;
	kind: _Output353;
	memberSegmentIndices: _Output34;
};
type _Output348 = { sentence: _Output349; target: _Output351 };
type _Output356 = "en";
type _Output355 = { id: _Output4; language: _Output356; segments: _Output6 };
type _Output358 = "Morpheme";
type _Output359 = "Infix";
type _Output357 = {
	family: _Output358;
	kind: _Output359;
	memberSegmentIndices: _Output34;
};
type _Output354 = { sentence: _Output355; target: _Output357 };
type _Output362 = "en";
type _Output361 = { id: _Output4; language: _Output362; segments: _Output6 };
type _Output364 = "Morpheme";
type _Output365 = "Interfix";
type _Output363 = {
	family: _Output364;
	kind: _Output365;
	memberSegmentIndices: _Output34;
};
type _Output360 = { sentence: _Output361; target: _Output363 };
type _Output368 = "en";
type _Output367 = { id: _Output4; language: _Output368; segments: _Output6 };
type _Output370 = "Morpheme";
type _Output371 = "Prefix";
type _Output369 = {
	family: _Output370;
	kind: _Output371;
	memberSegmentIndices: _Output34;
};
type _Output366 = { sentence: _Output367; target: _Output369 };
type _Output374 = "en";
type _Output373 = { id: _Output4; language: _Output374; segments: _Output6 };
type _Output376 = "Morpheme";
type _Output377 = "Root";
type _Output375 = {
	family: _Output376;
	kind: _Output377;
	memberSegmentIndices: _Output34;
};
type _Output372 = { sentence: _Output373; target: _Output375 };
type _Output380 = "en";
type _Output379 = { id: _Output4; language: _Output380; segments: _Output6 };
type _Output382 = "Morpheme";
type _Output383 = "Suffix";
type _Output381 = {
	family: _Output382;
	kind: _Output383;
	memberSegmentIndices: _Output34;
};
type _Output378 = { sentence: _Output379; target: _Output381 };
type _Output386 = "en";
type _Output385 = { id: _Output4; language: _Output386; segments: _Output6 };
type _Output388 = "Morpheme";
type _Output389 = "Suffixoid";
type _Output387 = {
	family: _Output388;
	kind: _Output389;
	memberSegmentIndices: _Output34;
};
type _Output384 = { sentence: _Output385; target: _Output387 };
type _Output392 = "en";
type _Output391 = { id: _Output4; language: _Output392; segments: _Output6 };
type _Output394 = "Morpheme";
type _Output395 = "ToneMarking";
type _Output393 = {
	family: _Output394;
	kind: _Output395;
	memberSegmentIndices: _Output34;
};
type _Output390 = { sentence: _Output391; target: _Output393 };
type _Output398 = "en";
type _Output397 = { id: _Output4; language: _Output398; segments: _Output6 };
type _Output400 = "Morpheme";
type _Output401 = "Transfix";
type _Output399 = {
	family: _Output400;
	kind: _Output401;
	memberSegmentIndices: _Output34;
};
type _Output396 = { sentence: _Output397; target: _Output399 };
type _Output404 = "en";
type _Output403 = { id: _Output4; language: _Output404; segments: _Output6 };
type _Output406 = "Phraseme";
type _Output407 = "Aphorism";
type _Output405 = {
	family: _Output406;
	kind: _Output407;
	memberSegmentIndices: _Output34;
};
type _Output402 = { sentence: _Output403; target: _Output405 };
type _Output410 = "en";
type _Output409 = { id: _Output4; language: _Output410; segments: _Output6 };
type _Output412 = "Phraseme";
type _Output413 = "DiscourseFormula";
type _Output411 = {
	family: _Output412;
	kind: _Output413;
	memberSegmentIndices: _Output34;
};
type _Output408 = { sentence: _Output409; target: _Output411 };
type _Output416 = "en";
type _Output415 = { id: _Output4; language: _Output416; segments: _Output6 };
type _Output418 = "Phraseme";
type _Output419 = "Idiom";
type _Output417 = {
	family: _Output418;
	kind: _Output419;
	memberSegmentIndices: _Output34;
};
type _Output414 = { sentence: _Output415; target: _Output417 };
type _Output422 = "en";
type _Output421 = { id: _Output4; language: _Output422; segments: _Output6 };
type _Output424 = "Phraseme";
type _Output425 = "Proverb";
type _Output423 = {
	family: _Output424;
	kind: _Output425;
	memberSegmentIndices: _Output34;
};
type _Output420 = { sentence: _Output421; target: _Output423 };
type _Output428 = "he";
type _Output427 = { id: _Output4; language: _Output428; segments: _Output6 };
type _Output430 = "Construction";
type _Output431 = "Fusion";
type _Output429 = {
	family: _Output430;
	kind: _Output431;
	memberSegmentIndices: _Output34;
};
type _Output426 = { sentence: _Output427; target: _Output429 };
type _Output434 = "he";
type _Output433 = { id: _Output4; language: _Output434; segments: _Output6 };
type _Output436 = "Lexeme";
type _Output437 = "ADJ";
type _Output435 = {
	family: _Output436;
	kind: _Output437;
	memberSegmentIndices: _Output34;
};
type _Output432 = { sentence: _Output433; target: _Output435 };
type _Output440 = "he";
type _Output439 = { id: _Output4; language: _Output440; segments: _Output6 };
type _Output442 = "Lexeme";
type _Output443 = "ADP";
type _Output441 = {
	family: _Output442;
	kind: _Output443;
	memberSegmentIndices: _Output34;
};
type _Output438 = { sentence: _Output439; target: _Output441 };
type _Output446 = "he";
type _Output445 = { id: _Output4; language: _Output446; segments: _Output6 };
type _Output448 = "Lexeme";
type _Output449 = "ADV";
type _Output447 = {
	family: _Output448;
	kind: _Output449;
	memberSegmentIndices: _Output34;
};
type _Output444 = { sentence: _Output445; target: _Output447 };
type _Output452 = "he";
type _Output451 = { id: _Output4; language: _Output452; segments: _Output6 };
type _Output454 = "Lexeme";
type _Output455 = "AUX";
type _Output453 = {
	family: _Output454;
	kind: _Output455;
	memberSegmentIndices: _Output34;
};
type _Output450 = { sentence: _Output451; target: _Output453 };
type _Output458 = "he";
type _Output457 = { id: _Output4; language: _Output458; segments: _Output6 };
type _Output460 = "Lexeme";
type _Output461 = "CCONJ";
type _Output459 = {
	family: _Output460;
	kind: _Output461;
	memberSegmentIndices: _Output34;
};
type _Output456 = { sentence: _Output457; target: _Output459 };
type _Output464 = "he";
type _Output463 = { id: _Output4; language: _Output464; segments: _Output6 };
type _Output466 = "Lexeme";
type _Output467 = "DET";
type _Output465 = {
	family: _Output466;
	kind: _Output467;
	memberSegmentIndices: _Output34;
};
type _Output462 = { sentence: _Output463; target: _Output465 };
type _Output470 = "he";
type _Output469 = { id: _Output4; language: _Output470; segments: _Output6 };
type _Output472 = "Lexeme";
type _Output473 = "INTJ";
type _Output471 = {
	family: _Output472;
	kind: _Output473;
	memberSegmentIndices: _Output34;
};
type _Output468 = { sentence: _Output469; target: _Output471 };
type _Output476 = "he";
type _Output475 = { id: _Output4; language: _Output476; segments: _Output6 };
type _Output478 = "Lexeme";
type _Output479 = "NOUN";
type _Output477 = {
	family: _Output478;
	kind: _Output479;
	memberSegmentIndices: _Output34;
};
type _Output474 = { sentence: _Output475; target: _Output477 };
type _Output482 = "he";
type _Output481 = { id: _Output4; language: _Output482; segments: _Output6 };
type _Output484 = "Lexeme";
type _Output485 = "NUM";
type _Output483 = {
	family: _Output484;
	kind: _Output485;
	memberSegmentIndices: _Output34;
};
type _Output480 = { sentence: _Output481; target: _Output483 };
type _Output488 = "he";
type _Output487 = { id: _Output4; language: _Output488; segments: _Output6 };
type _Output490 = "Lexeme";
type _Output491 = "X";
type _Output489 = {
	family: _Output490;
	kind: _Output491;
	memberSegmentIndices: _Output34;
};
type _Output486 = { sentence: _Output487; target: _Output489 };
type _Output494 = "he";
type _Output493 = { id: _Output4; language: _Output494; segments: _Output6 };
type _Output496 = "Lexeme";
type _Output497 = "PART";
type _Output495 = {
	family: _Output496;
	kind: _Output497;
	memberSegmentIndices: _Output34;
};
type _Output492 = { sentence: _Output493; target: _Output495 };
type _Output500 = "he";
type _Output499 = { id: _Output4; language: _Output500; segments: _Output6 };
type _Output502 = "Lexeme";
type _Output503 = "PRON";
type _Output501 = {
	family: _Output502;
	kind: _Output503;
	memberSegmentIndices: _Output34;
};
type _Output498 = { sentence: _Output499; target: _Output501 };
type _Output506 = "he";
type _Output505 = { id: _Output4; language: _Output506; segments: _Output6 };
type _Output508 = "Lexeme";
type _Output509 = "PROPN";
type _Output507 = {
	family: _Output508;
	kind: _Output509;
	memberSegmentIndices: _Output34;
};
type _Output504 = { sentence: _Output505; target: _Output507 };
type _Output512 = "he";
type _Output511 = { id: _Output4; language: _Output512; segments: _Output6 };
type _Output514 = "Lexeme";
type _Output515 = "PUNCT";
type _Output513 = {
	family: _Output514;
	kind: _Output515;
	memberSegmentIndices: _Output34;
};
type _Output510 = { sentence: _Output511; target: _Output513 };
type _Output518 = "he";
type _Output517 = { id: _Output4; language: _Output518; segments: _Output6 };
type _Output520 = "Lexeme";
type _Output521 = "SCONJ";
type _Output519 = {
	family: _Output520;
	kind: _Output521;
	memberSegmentIndices: _Output34;
};
type _Output516 = { sentence: _Output517; target: _Output519 };
type _Output524 = "he";
type _Output523 = { id: _Output4; language: _Output524; segments: _Output6 };
type _Output526 = "Lexeme";
type _Output527 = "SYM";
type _Output525 = {
	family: _Output526;
	kind: _Output527;
	memberSegmentIndices: _Output34;
};
type _Output522 = { sentence: _Output523; target: _Output525 };
type _Output530 = "he";
type _Output529 = { id: _Output4; language: _Output530; segments: _Output6 };
type _Output532 = "Lexeme";
type _Output533 = "VERB";
type _Output531 = {
	family: _Output532;
	kind: _Output533;
	memberSegmentIndices: _Output34;
};
type _Output528 = { sentence: _Output529; target: _Output531 };
type _Output536 = "he";
type _Output535 = { id: _Output4; language: _Output536; segments: _Output6 };
type _Output538 = "Morpheme";
type _Output539 = "Circumfix";
type _Output537 = {
	family: _Output538;
	kind: _Output539;
	memberSegmentIndices: _Output34;
};
type _Output534 = { sentence: _Output535; target: _Output537 };
type _Output542 = "he";
type _Output541 = { id: _Output4; language: _Output542; segments: _Output6 };
type _Output544 = "Morpheme";
type _Output545 = "Clitic";
type _Output543 = {
	family: _Output544;
	kind: _Output545;
	memberSegmentIndices: _Output34;
};
type _Output540 = { sentence: _Output541; target: _Output543 };
type _Output548 = "he";
type _Output547 = { id: _Output4; language: _Output548; segments: _Output6 };
type _Output550 = "Morpheme";
type _Output551 = "Duplifix";
type _Output549 = {
	family: _Output550;
	kind: _Output551;
	memberSegmentIndices: _Output34;
};
type _Output546 = { sentence: _Output547; target: _Output549 };
type _Output554 = "he";
type _Output553 = { id: _Output4; language: _Output554; segments: _Output6 };
type _Output556 = "Morpheme";
type _Output557 = "Infix";
type _Output555 = {
	family: _Output556;
	kind: _Output557;
	memberSegmentIndices: _Output34;
};
type _Output552 = { sentence: _Output553; target: _Output555 };
type _Output560 = "he";
type _Output559 = { id: _Output4; language: _Output560; segments: _Output6 };
type _Output562 = "Morpheme";
type _Output563 = "Interfix";
type _Output561 = {
	family: _Output562;
	kind: _Output563;
	memberSegmentIndices: _Output34;
};
type _Output558 = { sentence: _Output559; target: _Output561 };
type _Output566 = "he";
type _Output565 = { id: _Output4; language: _Output566; segments: _Output6 };
type _Output568 = "Morpheme";
type _Output569 = "Prefix";
type _Output567 = {
	family: _Output568;
	kind: _Output569;
	memberSegmentIndices: _Output34;
};
type _Output564 = { sentence: _Output565; target: _Output567 };
type _Output572 = "he";
type _Output571 = { id: _Output4; language: _Output572; segments: _Output6 };
type _Output574 = "Morpheme";
type _Output575 = "Root";
type _Output573 = {
	family: _Output574;
	kind: _Output575;
	memberSegmentIndices: _Output34;
};
type _Output570 = { sentence: _Output571; target: _Output573 };
type _Output578 = "he";
type _Output577 = { id: _Output4; language: _Output578; segments: _Output6 };
type _Output580 = "Morpheme";
type _Output581 = "Suffix";
type _Output579 = {
	family: _Output580;
	kind: _Output581;
	memberSegmentIndices: _Output34;
};
type _Output576 = { sentence: _Output577; target: _Output579 };
type _Output584 = "he";
type _Output583 = { id: _Output4; language: _Output584; segments: _Output6 };
type _Output586 = "Morpheme";
type _Output587 = "Suffixoid";
type _Output585 = {
	family: _Output586;
	kind: _Output587;
	memberSegmentIndices: _Output34;
};
type _Output582 = { sentence: _Output583; target: _Output585 };
type _Output590 = "he";
type _Output589 = { id: _Output4; language: _Output590; segments: _Output6 };
type _Output592 = "Morpheme";
type _Output593 = "ToneMarking";
type _Output591 = {
	family: _Output592;
	kind: _Output593;
	memberSegmentIndices: _Output34;
};
type _Output588 = { sentence: _Output589; target: _Output591 };
type _Output596 = "he";
type _Output595 = { id: _Output4; language: _Output596; segments: _Output6 };
type _Output598 = "Morpheme";
type _Output599 = "Transfix";
type _Output597 = {
	family: _Output598;
	kind: _Output599;
	memberSegmentIndices: _Output34;
};
type _Output594 = { sentence: _Output595; target: _Output597 };
type _Output602 = "he";
type _Output601 = { id: _Output4; language: _Output602; segments: _Output6 };
type _Output604 = "Phraseme";
type _Output605 = "Aphorism";
type _Output603 = {
	family: _Output604;
	kind: _Output605;
	memberSegmentIndices: _Output34;
};
type _Output600 = { sentence: _Output601; target: _Output603 };
type _Output608 = "he";
type _Output607 = { id: _Output4; language: _Output608; segments: _Output6 };
type _Output610 = "Phraseme";
type _Output611 = "DiscourseFormula";
type _Output609 = {
	family: _Output610;
	kind: _Output611;
	memberSegmentIndices: _Output34;
};
type _Output606 = { sentence: _Output607; target: _Output609 };
type _Output614 = "he";
type _Output613 = { id: _Output4; language: _Output614; segments: _Output6 };
type _Output616 = "Phraseme";
type _Output617 = "Idiom";
type _Output615 = {
	family: _Output616;
	kind: _Output617;
	memberSegmentIndices: _Output34;
};
type _Output612 = { sentence: _Output613; target: _Output615 };
type _Output620 = "he";
type _Output619 = { id: _Output4; language: _Output620; segments: _Output6 };
type _Output622 = "Phraseme";
type _Output623 = "Proverb";
type _Output621 = {
	family: _Output622;
	kind: _Output623;
	memberSegmentIndices: _Output34;
};
type _Output618 = { sentence: _Output619; target: _Output621 };
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
	| _Output600
	| _Output606
	| _Output612
	| _Output618;
type _Output627 = "Lemma";
type _Output628 = "de";
type _Output629 = string;
type _Output630 = Record<string, never>;
type _Output626 = {
	unitKind: _Output627;
	language: _Output628;
	family: _Output32;
	kind: _Output33;
	canonicalForm: _Output629;
	coreFeatures: _Output630;
};
type _Output625 = { encounter: _Output28; lemma: _Output626 };
type _Output633 = "Lemma";
type _Output634 = "de";
type _Output637 = "Yes";
type _Output636 = _Output637 | null;
type _Output639 = "Yes";
type _Output638 = _Output639 | null;
type _Output641 = "Card" | "Ord";
type _Output640 = _Output641 | null;
type _Output643 = "Short";
type _Output642 = _Output643 | null;
type _Output635 = {
	abbr: _Output636;
	foreign: _Output638;
	numType: _Output640;
	variant: _Output642;
};
type _Output632 = {
	unitKind: _Output633;
	language: _Output634;
	family: _Output40;
	kind: _Output41;
	canonicalForm: _Output629;
	coreFeatures: _Output635;
};
type _Output631 = { encounter: _Output36; lemma: _Output632 };
type _Output646 = "Lemma";
type _Output647 = "de";
type _Output649 = _Output637 | null;
type _Output651 = "Circ" | "Post" | "Prep";
type _Output650 = _Output651 | null;
type _Output653 = "ADV" | "SCONJ";
type _Output652 = _Output653 | null;
type _Output654 = _Output639 | null;
type _Output656 =
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
type _Output655 = _Output656 | null;
type _Output658 = "Vbp";
type _Output657 = _Output658 | null;
type _Output648 = {
	abbr: _Output649;
	adpType: _Output650;
	extPos: _Output652;
	foreign: _Output654;
	governedCase: _Output655;
	partType: _Output657;
};
type _Output645 = {
	unitKind: _Output646;
	language: _Output647;
	family: _Output46;
	kind: _Output47;
	canonicalForm: _Output629;
	coreFeatures: _Output648;
};
type _Output644 = { encounter: _Output42; lemma: _Output645 };
type _Output661 = "Lemma";
type _Output662 = "de";
type _Output664 = _Output639 | null;
type _Output666 = "Card" | "Mult";
type _Output665 = _Output666 | null;
type _Output668 = "Dem" | "Ind" | "Int" | "Neg" | "Rel";
type _Output667 = _Output668 | null;
type _Output663 = {
	foreign: _Output664;
	numType: _Output665;
	pronType: _Output667;
};
type _Output660 = {
	unitKind: _Output661;
	language: _Output662;
	family: _Output52;
	kind: _Output53;
	canonicalForm: _Output629;
	coreFeatures: _Output663;
};
type _Output659 = { encounter: _Output48; lemma: _Output660 };
type _Output671 = "Lemma";
type _Output672 = "de";
type _Output675 = "Mod";
type _Output674 = _Output675 | null;
type _Output673 = { verbType: _Output674 };
type _Output670 = {
	unitKind: _Output671;
	language: _Output672;
	family: _Output58;
	kind: _Output59;
	canonicalForm: _Output629;
	coreFeatures: _Output673;
};
type _Output669 = { encounter: _Output54; lemma: _Output670 };
type _Output678 = "Lemma";
type _Output679 = "de";
type _Output682 = "Comp";
type _Output681 = _Output682 | null;
type _Output680 = { conjType: _Output681 };
type _Output677 = {
	unitKind: _Output678;
	language: _Output679;
	family: _Output64;
	kind: _Output65;
	canonicalForm: _Output629;
	coreFeatures: _Output680;
};
type _Output676 = { encounter: _Output60; lemma: _Output677 };
type _Output685 = "Lemma";
type _Output686 = "de";
type _Output689 = "Def" | "Ind";
type _Output688 = _Output689 | null;
type _Output691 = "ADV" | "DET";
type _Output690 = _Output691 | null;
type _Output692 = _Output639 | null;
type _Output694 = "Card" | "Ord";
type _Output693 = _Output694 | null;
type _Output696 = "1" | "2" | "3";
type _Output695 = _Output696 | null;
type _Output698 = "Form" | "Infm";
type _Output697 = _Output698 | null;
type _Output700 = "Yes";
type _Output699 = _Output700 | null;
type _Output702 =
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
type _Output701 = _Output702 | null;
type _Output687 = {
	definite: _Output688;
	extPos: _Output690;
	foreign: _Output692;
	numType: _Output693;
	person: _Output695;
	polite: _Output697;
	poss: _Output699;
	pronType: _Output701;
};
type _Output684 = {
	unitKind: _Output685;
	language: _Output686;
	family: _Output70;
	kind: _Output71;
	canonicalForm: _Output629;
	coreFeatures: _Output687;
};
type _Output683 = { encounter: _Output66; lemma: _Output684 };
type _Output705 = "Lemma";
type _Output706 = "de";
type _Output709 = "Res";
type _Output708 = _Output709 | null;
type _Output707 = { partType: _Output708 };
type _Output704 = {
	unitKind: _Output705;
	language: _Output706;
	family: _Output76;
	kind: _Output77;
	canonicalForm: _Output629;
	coreFeatures: _Output707;
};
type _Output703 = { encounter: _Output72; lemma: _Output704 };
type _Output712 = "Lemma";
type _Output713 = "de";
type _Output716 = "Fem" | "Masc" | "Neut";
type _Output715 = _Output716 | null;
type _Output718 = "Yes";
type _Output717 = _Output718 | null;
type _Output714 = { gender: _Output715; hyph: _Output717 };
type _Output711 = {
	unitKind: _Output712;
	language: _Output713;
	family: _Output82;
	kind: _Output83;
	canonicalForm: _Output629;
	coreFeatures: _Output714;
};
type _Output710 = { encounter: _Output78; lemma: _Output711 };
type _Output721 = "Lemma";
type _Output722 = "de";
type _Output724 = _Output637 | null;
type _Output725 = _Output639 | null;
type _Output727 = "Card" | "Frac" | "Mult" | "Range";
type _Output726 = _Output727 | null;
type _Output723 = {
	abbr: _Output724;
	foreign: _Output725;
	numType: _Output726;
};
type _Output720 = {
	unitKind: _Output721;
	language: _Output722;
	family: _Output88;
	kind: _Output89;
	canonicalForm: _Output629;
	coreFeatures: _Output723;
};
type _Output719 = { encounter: _Output84; lemma: _Output720 };
type _Output730 = "Lemma";
type _Output731 = "de";
type _Output733 = _Output637 | null;
type _Output734 = _Output639 | null;
type _Output735 = _Output718 | null;
type _Output737 = "Card" | "Mult" | "Range";
type _Output736 = _Output737 | null;
type _Output732 = {
	abbr: _Output733;
	foreign: _Output734;
	hyph: _Output735;
	numType: _Output736;
};
type _Output729 = {
	unitKind: _Output730;
	language: _Output731;
	family: _Output94;
	kind: _Output95;
	canonicalForm: _Output629;
	coreFeatures: _Output732;
};
type _Output728 = { encounter: _Output90; lemma: _Output729 };
type _Output740 = "Lemma";
type _Output741 = "de";
type _Output743 = _Output637 | null;
type _Output744 = _Output639 | null;
type _Output746 = "Inf";
type _Output745 = _Output746 | null;
type _Output748 = "Neg" | "Pos";
type _Output747 = _Output748 | null;
type _Output742 = {
	abbr: _Output743;
	foreign: _Output744;
	partType: _Output745;
	polarity: _Output747;
};
type _Output739 = {
	unitKind: _Output740;
	language: _Output741;
	family: _Output100;
	kind: _Output101;
	canonicalForm: _Output629;
	coreFeatures: _Output742;
};
type _Output738 = { encounter: _Output96; lemma: _Output739 };
type _Output751 = "Lemma";
type _Output752 = "de";
type _Output755 = "Acc" | "Dat" | "Gen" | "Nom";
type _Output754 = _Output755 | null;
type _Output757 = "Plur" | "Sing";
type _Output756 = _Output757 | null;
type _Output759 = "Fem" | "Masc" | "Neut";
type _Output758 = _Output759 | null;
type _Output761 = "DET";
type _Output760 = _Output761 | null;
type _Output762 = _Output639 | null;
type _Output764 = "1" | "2" | "3";
type _Output763 = _Output764 | null;
type _Output766 = "Form" | "Infm";
type _Output765 = _Output766 | null;
type _Output767 = _Output700 | null;
type _Output769 = "Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot";
type _Output768 = _Output769 | null;
type _Output771 = "Fem" | "Masc" | "Neut";
type _Output770 = _Output771 | null;
type _Output773 = "Plur" | "Sing";
type _Output772 = _Output773 | null;
type _Output753 = {
	case: _Output754;
	number: _Output756;
	"gender[psor]": _Output758;
	extPos: _Output760;
	foreign: _Output762;
	person: _Output763;
	polite: _Output765;
	poss: _Output767;
	pronType: _Output768;
	gender: _Output770;
	referenceNumber: _Output772;
};
type _Output750 = {
	unitKind: _Output751;
	language: _Output752;
	family: _Output106;
	kind: _Output107;
	canonicalForm: _Output629;
	coreFeatures: _Output753;
};
type _Output749 = { encounter: _Output102; lemma: _Output750 };
type _Output776 = "Lemma";
type _Output777 = "de";
type _Output779 = _Output637 | null;
type _Output780 = _Output639 | null;
type _Output782 = "Fem" | "Masc" | "Neut";
type _Output781 = _Output782 | null;
type _Output778 = { abbr: _Output779; foreign: _Output780; gender: _Output781 };
type _Output775 = {
	unitKind: _Output776;
	language: _Output777;
	family: _Output112;
	kind: _Output113;
	canonicalForm: _Output629;
	coreFeatures: _Output778;
};
type _Output774 = { encounter: _Output108; lemma: _Output775 };
type _Output785 = "Lemma";
type _Output786 = "de";
type _Output789 =
	| "Brck"
	| "Colo"
	| "Comm"
	| "Dash"
	| "Elip"
	| "Excl"
	| "Peri"
	| "Qest"
	| "Quot";
type _Output788 = _Output789 | null;
type _Output787 = { punctType: _Output788 };
type _Output784 = {
	unitKind: _Output785;
	language: _Output786;
	family: _Output118;
	kind: _Output119;
	canonicalForm: _Output629;
	coreFeatures: _Output787;
};
type _Output783 = { encounter: _Output114; lemma: _Output784 };
type _Output792 = "Lemma";
type _Output793 = "de";
type _Output796 = "Comp";
type _Output795 = _Output796 | null;
type _Output794 = { conjType: _Output795 };
type _Output791 = {
	unitKind: _Output792;
	language: _Output793;
	family: _Output124;
	kind: _Output125;
	canonicalForm: _Output629;
	coreFeatures: _Output794;
};
type _Output790 = { encounter: _Output120; lemma: _Output791 };
type _Output799 = "Lemma";
type _Output800 = "de";
type _Output802 = _Output639 | null;
type _Output804 = "Card" | "Range";
type _Output803 = _Output804 | null;
type _Output801 = { foreign: _Output802; numType: _Output803 };
type _Output798 = {
	unitKind: _Output799;
	language: _Output800;
	family: _Output130;
	kind: _Output131;
	canonicalForm: _Output629;
	coreFeatures: _Output801;
};
type _Output797 = { encounter: _Output126; lemma: _Output798 };
type _Output807 = "Lemma";
type _Output808 = "de";
type _Output811 = string;
type _Output810 = _Output811 | null;
type _Output813 = string;
type _Output812 = _Output813 | null;
type _Output815 = "Yes";
type _Output814 = _Output815 | null;
type _Output816 = _Output675 | null;
type _Output809 = {
	hasGovPrep: _Output810;
	hasSepPrefix: _Output812;
	lexicallyReflexive: _Output814;
	verbType: _Output816;
};
type _Output806 = {
	unitKind: _Output807;
	language: _Output808;
	family: _Output136;
	kind: _Output137;
	canonicalForm: _Output629;
	coreFeatures: _Output809;
};
type _Output805 = { encounter: _Output132; lemma: _Output806 };
type _Output819 = "Lemma";
type _Output820 = "de";
type _Output821 = Record<string, never>;
type _Output818 = {
	unitKind: _Output819;
	language: _Output820;
	family: _Output142;
	kind: _Output143;
	canonicalForm: _Output629;
	coreFeatures: _Output821;
};
type _Output817 = { encounter: _Output138; lemma: _Output818 };
type _Output824 = "Lemma";
type _Output825 = "de";
type _Output826 = Record<string, never>;
type _Output823 = {
	unitKind: _Output824;
	language: _Output825;
	family: _Output148;
	kind: _Output149;
	canonicalForm: _Output629;
	coreFeatures: _Output826;
};
type _Output822 = { encounter: _Output144; lemma: _Output823 };
type _Output829 = "Lemma";
type _Output830 = "de";
type _Output831 = Record<string, never>;
type _Output828 = {
	unitKind: _Output829;
	language: _Output830;
	family: _Output154;
	kind: _Output155;
	canonicalForm: _Output629;
	coreFeatures: _Output831;
};
type _Output827 = { encounter: _Output150; lemma: _Output828 };
type _Output834 = "Lemma";
type _Output835 = "de";
type _Output836 = Record<string, never>;
type _Output833 = {
	unitKind: _Output834;
	language: _Output835;
	family: _Output160;
	kind: _Output161;
	canonicalForm: _Output629;
	coreFeatures: _Output836;
};
type _Output832 = { encounter: _Output156; lemma: _Output833 };
type _Output839 = "Lemma";
type _Output840 = "de";
type _Output841 = Record<string, never>;
type _Output838 = {
	unitKind: _Output839;
	language: _Output840;
	family: _Output166;
	kind: _Output167;
	canonicalForm: _Output629;
	coreFeatures: _Output841;
};
type _Output837 = { encounter: _Output162; lemma: _Output838 };
type _Output844 = "Lemma";
type _Output845 = "de";
type _Output847 = _Output813 | null;
type _Output846 = { hasSepPrefix: _Output847 };
type _Output843 = {
	unitKind: _Output844;
	language: _Output845;
	family: _Output172;
	kind: _Output173;
	canonicalForm: _Output629;
	coreFeatures: _Output846;
};
type _Output842 = { encounter: _Output168; lemma: _Output843 };
type _Output850 = "Lemma";
type _Output851 = "de";
type _Output852 = Record<string, never>;
type _Output849 = {
	unitKind: _Output850;
	language: _Output851;
	family: _Output178;
	kind: _Output179;
	canonicalForm: _Output629;
	coreFeatures: _Output852;
};
type _Output848 = { encounter: _Output174; lemma: _Output849 };
type _Output855 = "Lemma";
type _Output856 = "de";
type _Output857 = Record<string, never>;
type _Output854 = {
	unitKind: _Output855;
	language: _Output856;
	family: _Output184;
	kind: _Output185;
	canonicalForm: _Output629;
	coreFeatures: _Output857;
};
type _Output853 = { encounter: _Output180; lemma: _Output854 };
type _Output860 = "Lemma";
type _Output861 = "de";
type _Output862 = Record<string, never>;
type _Output859 = {
	unitKind: _Output860;
	language: _Output861;
	family: _Output190;
	kind: _Output191;
	canonicalForm: _Output629;
	coreFeatures: _Output862;
};
type _Output858 = { encounter: _Output186; lemma: _Output859 };
type _Output865 = "Lemma";
type _Output866 = "de";
type _Output867 = Record<string, never>;
type _Output864 = {
	unitKind: _Output865;
	language: _Output866;
	family: _Output196;
	kind: _Output197;
	canonicalForm: _Output629;
	coreFeatures: _Output867;
};
type _Output863 = { encounter: _Output192; lemma: _Output864 };
type _Output870 = "Lemma";
type _Output871 = "de";
type _Output872 = Record<string, never>;
type _Output869 = {
	unitKind: _Output870;
	language: _Output871;
	family: _Output202;
	kind: _Output203;
	canonicalForm: _Output629;
	coreFeatures: _Output872;
};
type _Output868 = { encounter: _Output198; lemma: _Output869 };
type _Output875 = "Lemma";
type _Output876 = "de";
type _Output877 = Record<string, never>;
type _Output874 = {
	unitKind: _Output875;
	language: _Output876;
	family: _Output208;
	kind: _Output209;
	canonicalForm: _Output629;
	coreFeatures: _Output877;
};
type _Output873 = { encounter: _Output204; lemma: _Output874 };
type _Output880 = "Lemma";
type _Output881 = "de";
type _Output884 =
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
type _Output883 = _Output884 | null;
type _Output882 = { discourseFormulaRole: _Output883 };
type _Output879 = {
	unitKind: _Output880;
	language: _Output881;
	family: _Output214;
	kind: _Output215;
	canonicalForm: _Output629;
	coreFeatures: _Output882;
};
type _Output878 = { encounter: _Output210; lemma: _Output879 };
type _Output887 = "Lemma";
type _Output888 = "de";
type _Output889 = Record<string, never>;
type _Output886 = {
	unitKind: _Output887;
	language: _Output888;
	family: _Output220;
	kind: _Output221;
	canonicalForm: _Output629;
	coreFeatures: _Output889;
};
type _Output885 = { encounter: _Output216; lemma: _Output886 };
type _Output892 = "Lemma";
type _Output893 = "de";
type _Output894 = Record<string, never>;
type _Output891 = {
	unitKind: _Output892;
	language: _Output893;
	family: _Output226;
	kind: _Output227;
	canonicalForm: _Output629;
	coreFeatures: _Output894;
};
type _Output890 = { encounter: _Output222; lemma: _Output891 };
type _Output897 = "Lemma";
type _Output898 = "en";
type _Output899 = Record<string, never>;
type _Output896 = {
	unitKind: _Output897;
	language: _Output898;
	family: _Output232;
	kind: _Output233;
	canonicalForm: _Output629;
	coreFeatures: _Output899;
};
type _Output895 = { encounter: _Output228; lemma: _Output896 };
type _Output902 = "Lemma";
type _Output903 = "en";
type _Output905 = _Output637 | null;
type _Output907 = "ADP" | "ADV" | "SCONJ";
type _Output906 = _Output907 | null;
type _Output909 = "Combi" | "Word";
type _Output908 = _Output909 | null;
type _Output911 = "Frac" | "Ord";
type _Output910 = _Output911 | null;
type _Output913 = "Expr";
type _Output912 = _Output913 | null;
type _Output904 = {
	abbr: _Output905;
	extPos: _Output906;
	numForm: _Output908;
	numType: _Output910;
	style: _Output912;
};
type _Output901 = {
	unitKind: _Output902;
	language: _Output903;
	family: _Output238;
	kind: _Output239;
	canonicalForm: _Output629;
	coreFeatures: _Output904;
};
type _Output900 = { encounter: _Output234; lemma: _Output901 };
type _Output916 = "Lemma";
type _Output917 = "en";
type _Output919 = _Output637 | null;
type _Output921 = "ADP" | "ADV" | "SCONJ";
type _Output920 = _Output921 | null;
type _Output918 = { abbr: _Output919; extPos: _Output920 };
type _Output915 = {
	unitKind: _Output916;
	language: _Output917;
	family: _Output244;
	kind: _Output245;
	canonicalForm: _Output629;
	coreFeatures: _Output918;
};
type _Output914 = { encounter: _Output240; lemma: _Output915 };
type _Output924 = "Lemma";
type _Output925 = "en";
type _Output927 = _Output637 | null;
type _Output929 = "ADP" | "ADV" | "CCONJ" | "SCONJ";
type _Output928 = _Output929 | null;
type _Output931 = "Word";
type _Output930 = _Output931 | null;
type _Output933 = "Frac" | "Mult" | "Ord";
type _Output932 = _Output933 | null;
type _Output936 = "Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot";
type _Output937 = [_Output936, ...Array<_Output936>];
type _Output935 = _Output936 | _Output937;
type _Output934 = _Output935 | null;
type _Output939 = "Expr" | "Slng";
type _Output938 = _Output939 | null;
type _Output926 = {
	abbr: _Output927;
	extPos: _Output928;
	numForm: _Output930;
	numType: _Output932;
	pronType: _Output934;
	style: _Output938;
};
type _Output923 = {
	unitKind: _Output924;
	language: _Output925;
	family: _Output250;
	kind: _Output251;
	canonicalForm: _Output629;
	coreFeatures: _Output926;
};
type _Output922 = { encounter: _Output246; lemma: _Output923 };
type _Output942 = "Lemma";
type _Output943 = "en";
type _Output945 = _Output637 | null;
type _Output947 = "Arch" | "Vrnc";
type _Output946 = _Output947 | null;
type _Output944 = { abbr: _Output945; style: _Output946 };
type _Output941 = {
	unitKind: _Output942;
	language: _Output943;
	family: _Output256;
	kind: _Output257;
	canonicalForm: _Output629;
	coreFeatures: _Output944;
};
type _Output940 = { encounter: _Output252; lemma: _Output941 };
type _Output950 = "Lemma";
type _Output951 = "en";
type _Output953 = _Output637 | null;
type _Output955 = "Neg";
type _Output954 = _Output955 | null;
type _Output952 = { abbr: _Output953; polarity: _Output954 };
type _Output949 = {
	unitKind: _Output950;
	language: _Output951;
	family: _Output262;
	kind: _Output263;
	canonicalForm: _Output629;
	coreFeatures: _Output952;
};
type _Output948 = { encounter: _Output258; lemma: _Output949 };
type _Output958 = "Lemma";
type _Output959 = "en";
type _Output961 = _Output637 | null;
type _Output963 = "Def" | "Ind";
type _Output962 = _Output963 | null;
type _Output965 = "ADV" | "PRON";
type _Output964 = _Output965 | null;
type _Output967 = "Word";
type _Output966 = _Output967 | null;
type _Output969 = "Frac";
type _Output968 = _Output969 | null;
type _Output972 = "Art" | "Dem" | "Ind" | "Int" | "Neg" | "Rcp" | "Rel" | "Tot";
type _Output973 = [_Output972, ...Array<_Output972>];
type _Output971 = _Output972 | _Output973;
type _Output970 = _Output971 | null;
type _Output975 = "Vrnc";
type _Output974 = _Output975 | null;
type _Output960 = {
	abbr: _Output961;
	definite: _Output962;
	extPos: _Output964;
	numForm: _Output966;
	numType: _Output968;
	pronType: _Output970;
	style: _Output974;
};
type _Output957 = {
	unitKind: _Output958;
	language: _Output959;
	family: _Output268;
	kind: _Output269;
	canonicalForm: _Output629;
	coreFeatures: _Output960;
};
type _Output956 = { encounter: _Output264; lemma: _Output957 };
type _Output978 = "Lemma";
type _Output979 = "en";
type _Output981 = _Output637 | null;
type _Output982 = _Output639 | null;
type _Output984 = "Neg" | "Pos";
type _Output983 = _Output984 | null;
type _Output986 = "Expr";
type _Output985 = _Output986 | null;
type _Output980 = {
	abbr: _Output981;
	foreign: _Output982;
	polarity: _Output983;
	style: _Output985;
};
type _Output977 = {
	unitKind: _Output978;
	language: _Output979;
	family: _Output274;
	kind: _Output275;
	canonicalForm: _Output629;
	coreFeatures: _Output980;
};
type _Output976 = { encounter: _Output270; lemma: _Output977 };
type _Output989 = "Lemma";
type _Output990 = "en";
type _Output992 = _Output637 | null;
type _Output994 = "ADV" | "PROPN";
type _Output993 = _Output994 | null;
type _Output995 = _Output639 | null;
type _Output997 = "Combi" | "Digit" | "Word";
type _Output996 = _Output997 | null;
type _Output999 = "Card" | "Frac" | "Ord";
type _Output998 = _Output999 | null;
type _Output1001 = "Expr" | "Vrnc";
type _Output1000 = _Output1001 | null;
type _Output991 = {
	abbr: _Output992;
	extPos: _Output993;
	foreign: _Output995;
	numForm: _Output996;
	numType: _Output998;
	style: _Output1000;
};
type _Output988 = {
	unitKind: _Output989;
	language: _Output990;
	family: _Output280;
	kind: _Output281;
	canonicalForm: _Output629;
	coreFeatures: _Output991;
};
type _Output987 = { encounter: _Output276; lemma: _Output988 };
type _Output1004 = "Lemma";
type _Output1005 = "en";
type _Output1007 = _Output637 | null;
type _Output1009 = "PROPN";
type _Output1008 = _Output1009 | null;
type _Output1011 = "Digit" | "Roman" | "Word";
type _Output1010 = _Output1011 | null;
type _Output1013 = "Card" | "Frac";
type _Output1012 = _Output1013 | null;
type _Output1006 = {
	abbr: _Output1007;
	extPos: _Output1008;
	numForm: _Output1010;
	numType: _Output1012;
};
type _Output1003 = {
	unitKind: _Output1004;
	language: _Output1005;
	family: _Output286;
	kind: _Output287;
	canonicalForm: _Output629;
	coreFeatures: _Output1006;
};
type _Output1002 = { encounter: _Output282; lemma: _Output1003 };
type _Output1016 = "Lemma";
type _Output1017 = "en";
type _Output1020 = "PROPN";
type _Output1019 = _Output1020 | null;
type _Output1021 = _Output639 | null;
type _Output1018 = { extPos: _Output1019; foreign: _Output1021 };
type _Output1015 = {
	unitKind: _Output1016;
	language: _Output1017;
	family: _Output292;
	kind: _Output293;
	canonicalForm: _Output629;
	coreFeatures: _Output1018;
};
type _Output1014 = { encounter: _Output288; lemma: _Output1015 };
type _Output1024 = "Lemma";
type _Output1025 = "en";
type _Output1027 = _Output637 | null;
type _Output1029 = "CCONJ";
type _Output1028 = _Output1029 | null;
type _Output1031 = "Neg";
type _Output1030 = _Output1031 | null;
type _Output1026 = {
	abbr: _Output1027;
	extPos: _Output1028;
	polarity: _Output1030;
};
type _Output1023 = {
	unitKind: _Output1024;
	language: _Output1025;
	family: _Output298;
	kind: _Output299;
	canonicalForm: _Output629;
	coreFeatures: _Output1026;
};
type _Output1022 = { encounter: _Output294; lemma: _Output1023 };
type _Output1034 = "Lemma";
type _Output1035 = "en";
type _Output1037 = _Output637 | null;
type _Output1039 = "ADV" | "PRON";
type _Output1038 = _Output1039 | null;
type _Output1041 = "1" | "2" | "3";
type _Output1040 = _Output1041 | null;
type _Output1042 = _Output700 | null;
type _Output1045 =
	| "Dem"
	| "Emp"
	| "Ind"
	| "Int"
	| "Neg"
	| "Prs"
	| "Rcp"
	| "Rel"
	| "Tot";
type _Output1046 = [_Output1045, ...Array<_Output1045>];
type _Output1044 = _Output1045 | _Output1046;
type _Output1043 = _Output1044 | null;
type _Output1048 = "Arch" | "Coll" | "Expr" | "Slng" | "Vrnc";
type _Output1047 = _Output1048 | null;
type _Output1036 = {
	abbr: _Output1037;
	extPos: _Output1038;
	person: _Output1040;
	poss: _Output1042;
	pronType: _Output1043;
	style: _Output1047;
};
type _Output1033 = {
	unitKind: _Output1034;
	language: _Output1035;
	family: _Output304;
	kind: _Output305;
	canonicalForm: _Output629;
	coreFeatures: _Output1036;
};
type _Output1032 = { encounter: _Output300; lemma: _Output1033 };
type _Output1051 = "Lemma";
type _Output1052 = "en";
type _Output1054 = _Output637 | null;
type _Output1056 = "PROPN";
type _Output1055 = _Output1056 | null;
type _Output1058 = "Expr";
type _Output1057 = _Output1058 | null;
type _Output1053 = {
	abbr: _Output1054;
	extPos: _Output1055;
	style: _Output1057;
};
type _Output1050 = {
	unitKind: _Output1051;
	language: _Output1052;
	family: _Output310;
	kind: _Output311;
	canonicalForm: _Output629;
	coreFeatures: _Output1053;
};
type _Output1049 = { encounter: _Output306; lemma: _Output1050 };
type _Output1061 = "Lemma";
type _Output1062 = "en";
type _Output1063 = Record<string, never>;
type _Output1060 = {
	unitKind: _Output1061;
	language: _Output1062;
	family: _Output316;
	kind: _Output317;
	canonicalForm: _Output629;
	coreFeatures: _Output1063;
};
type _Output1059 = { encounter: _Output312; lemma: _Output1060 };
type _Output1066 = "Lemma";
type _Output1067 = "en";
type _Output1069 = _Output637 | null;
type _Output1071 = "ADP" | "SCONJ";
type _Output1070 = _Output1071 | null;
type _Output1073 = "Vrnc";
type _Output1072 = _Output1073 | null;
type _Output1068 = {
	abbr: _Output1069;
	extPos: _Output1070;
	style: _Output1072;
};
type _Output1065 = {
	unitKind: _Output1066;
	language: _Output1067;
	family: _Output322;
	kind: _Output323;
	canonicalForm: _Output629;
	coreFeatures: _Output1068;
};
type _Output1064 = { encounter: _Output318; lemma: _Output1065 };
type _Output1076 = "Lemma";
type _Output1077 = "en";
type _Output1079 = _Output637 | null;
type _Output1081 = "ADP" | "PROPN";
type _Output1080 = _Output1081 | null;
type _Output1078 = { abbr: _Output1079; extPos: _Output1080 };
type _Output1075 = {
	unitKind: _Output1076;
	language: _Output1077;
	family: _Output328;
	kind: _Output329;
	canonicalForm: _Output629;
	coreFeatures: _Output1078;
};
type _Output1074 = { encounter: _Output324; lemma: _Output1075 };
type _Output1084 = "Lemma";
type _Output1085 = "en";
type _Output1087 = _Output637 | null;
type _Output1089 = "ADP" | "CCONJ" | "PROPN";
type _Output1088 = _Output1089 | null;
type _Output1090 = _Output811 | null;
type _Output1092 = "Yes";
type _Output1091 = _Output1092 | null;
type _Output1094 = "Expr" | "Vrnc";
type _Output1093 = _Output1094 | null;
type _Output1086 = {
	abbr: _Output1087;
	extPos: _Output1088;
	hasGovPrep: _Output1090;
	phrasal: _Output1091;
	style: _Output1093;
};
type _Output1083 = {
	unitKind: _Output1084;
	language: _Output1085;
	family: _Output334;
	kind: _Output335;
	canonicalForm: _Output629;
	coreFeatures: _Output1086;
};
type _Output1082 = { encounter: _Output330; lemma: _Output1083 };
type _Output1097 = "Lemma";
type _Output1098 = "en";
type _Output1099 = Record<string, never>;
type _Output1096 = {
	unitKind: _Output1097;
	language: _Output1098;
	family: _Output340;
	kind: _Output341;
	canonicalForm: _Output629;
	coreFeatures: _Output1099;
};
type _Output1095 = { encounter: _Output336; lemma: _Output1096 };
type _Output1102 = "Lemma";
type _Output1103 = "en";
type _Output1104 = Record<string, never>;
type _Output1101 = {
	unitKind: _Output1102;
	language: _Output1103;
	family: _Output346;
	kind: _Output347;
	canonicalForm: _Output629;
	coreFeatures: _Output1104;
};
type _Output1100 = { encounter: _Output342; lemma: _Output1101 };
type _Output1107 = "Lemma";
type _Output1108 = "en";
type _Output1109 = Record<string, never>;
type _Output1106 = {
	unitKind: _Output1107;
	language: _Output1108;
	family: _Output352;
	kind: _Output353;
	canonicalForm: _Output629;
	coreFeatures: _Output1109;
};
type _Output1105 = { encounter: _Output348; lemma: _Output1106 };
type _Output1112 = "Lemma";
type _Output1113 = "en";
type _Output1114 = Record<string, never>;
type _Output1111 = {
	unitKind: _Output1112;
	language: _Output1113;
	family: _Output358;
	kind: _Output359;
	canonicalForm: _Output629;
	coreFeatures: _Output1114;
};
type _Output1110 = { encounter: _Output354; lemma: _Output1111 };
type _Output1117 = "Lemma";
type _Output1118 = "en";
type _Output1119 = Record<string, never>;
type _Output1116 = {
	unitKind: _Output1117;
	language: _Output1118;
	family: _Output364;
	kind: _Output365;
	canonicalForm: _Output629;
	coreFeatures: _Output1119;
};
type _Output1115 = { encounter: _Output360; lemma: _Output1116 };
type _Output1122 = "Lemma";
type _Output1123 = "en";
type _Output1124 = Record<string, never>;
type _Output1121 = {
	unitKind: _Output1122;
	language: _Output1123;
	family: _Output370;
	kind: _Output371;
	canonicalForm: _Output629;
	coreFeatures: _Output1124;
};
type _Output1120 = { encounter: _Output366; lemma: _Output1121 };
type _Output1127 = "Lemma";
type _Output1128 = "en";
type _Output1129 = Record<string, never>;
type _Output1126 = {
	unitKind: _Output1127;
	language: _Output1128;
	family: _Output376;
	kind: _Output377;
	canonicalForm: _Output629;
	coreFeatures: _Output1129;
};
type _Output1125 = { encounter: _Output372; lemma: _Output1126 };
type _Output1132 = "Lemma";
type _Output1133 = "en";
type _Output1134 = Record<string, never>;
type _Output1131 = {
	unitKind: _Output1132;
	language: _Output1133;
	family: _Output382;
	kind: _Output383;
	canonicalForm: _Output629;
	coreFeatures: _Output1134;
};
type _Output1130 = { encounter: _Output378; lemma: _Output1131 };
type _Output1137 = "Lemma";
type _Output1138 = "en";
type _Output1139 = Record<string, never>;
type _Output1136 = {
	unitKind: _Output1137;
	language: _Output1138;
	family: _Output388;
	kind: _Output389;
	canonicalForm: _Output629;
	coreFeatures: _Output1139;
};
type _Output1135 = { encounter: _Output384; lemma: _Output1136 };
type _Output1142 = "Lemma";
type _Output1143 = "en";
type _Output1144 = Record<string, never>;
type _Output1141 = {
	unitKind: _Output1142;
	language: _Output1143;
	family: _Output394;
	kind: _Output395;
	canonicalForm: _Output629;
	coreFeatures: _Output1144;
};
type _Output1140 = { encounter: _Output390; lemma: _Output1141 };
type _Output1147 = "Lemma";
type _Output1148 = "en";
type _Output1149 = Record<string, never>;
type _Output1146 = {
	unitKind: _Output1147;
	language: _Output1148;
	family: _Output400;
	kind: _Output401;
	canonicalForm: _Output629;
	coreFeatures: _Output1149;
};
type _Output1145 = { encounter: _Output396; lemma: _Output1146 };
type _Output1152 = "Lemma";
type _Output1153 = "en";
type _Output1154 = Record<string, never>;
type _Output1151 = {
	unitKind: _Output1152;
	language: _Output1153;
	family: _Output406;
	kind: _Output407;
	canonicalForm: _Output629;
	coreFeatures: _Output1154;
};
type _Output1150 = { encounter: _Output402; lemma: _Output1151 };
type _Output1157 = "Lemma";
type _Output1158 = "en";
type _Output1160 = _Output884 | null;
type _Output1159 = { discourseFormulaRole: _Output1160 };
type _Output1156 = {
	unitKind: _Output1157;
	language: _Output1158;
	family: _Output412;
	kind: _Output413;
	canonicalForm: _Output629;
	coreFeatures: _Output1159;
};
type _Output1155 = { encounter: _Output408; lemma: _Output1156 };
type _Output1163 = "Lemma";
type _Output1164 = "en";
type _Output1165 = Record<string, never>;
type _Output1162 = {
	unitKind: _Output1163;
	language: _Output1164;
	family: _Output418;
	kind: _Output419;
	canonicalForm: _Output629;
	coreFeatures: _Output1165;
};
type _Output1161 = { encounter: _Output414; lemma: _Output1162 };
type _Output1168 = "Lemma";
type _Output1169 = "en";
type _Output1170 = Record<string, never>;
type _Output1167 = {
	unitKind: _Output1168;
	language: _Output1169;
	family: _Output424;
	kind: _Output425;
	canonicalForm: _Output629;
	coreFeatures: _Output1170;
};
type _Output1166 = { encounter: _Output420; lemma: _Output1167 };
type _Output1173 = "Lemma";
type _Output1174 = "he";
type _Output1175 = Record<string, never>;
type _Output1172 = {
	unitKind: _Output1173;
	language: _Output1174;
	family: _Output430;
	kind: _Output431;
	canonicalForm: _Output629;
	coreFeatures: _Output1175;
};
type _Output1171 = { encounter: _Output426; lemma: _Output1172 };
type _Output1178 = "Lemma";
type _Output1179 = "he";
type _Output1181 = _Output637 | null;
type _Output1180 = { abbr: _Output1181 };
type _Output1177 = {
	unitKind: _Output1178;
	language: _Output1179;
	family: _Output436;
	kind: _Output437;
	canonicalForm: _Output629;
	coreFeatures: _Output1180;
};
type _Output1176 = { encounter: _Output432; lemma: _Output1177 };
type _Output1184 = "Lemma";
type _Output1185 = "he";
type _Output1187 = _Output637 | null;
type _Output1189 = "Acc" | "Gen";
type _Output1188 = _Output1189 | null;
type _Output1186 = { abbr: _Output1187; case: _Output1188 };
type _Output1183 = {
	unitKind: _Output1184;
	language: _Output1185;
	family: _Output442;
	kind: _Output443;
	canonicalForm: _Output629;
	coreFeatures: _Output1186;
};
type _Output1182 = { encounter: _Output438; lemma: _Output1183 };
type _Output1192 = "Lemma";
type _Output1193 = "he";
type _Output1196 = "Yes";
type _Output1195 = _Output1196 | null;
type _Output1194 = { prefix: _Output1195 };
type _Output1191 = {
	unitKind: _Output1192;
	language: _Output1193;
	family: _Output448;
	kind: _Output449;
	canonicalForm: _Output629;
	coreFeatures: _Output1194;
};
type _Output1190 = { encounter: _Output444; lemma: _Output1191 };
type _Output1199 = "Lemma";
type _Output1200 = "he";
type _Output1203 = "Cop" | "Mod";
type _Output1202 = _Output1203 | null;
type _Output1201 = { verbType: _Output1202 };
type _Output1198 = {
	unitKind: _Output1199;
	language: _Output1200;
	family: _Output454;
	kind: _Output455;
	canonicalForm: _Output629;
	coreFeatures: _Output1201;
};
type _Output1197 = { encounter: _Output450; lemma: _Output1198 };
type _Output1206 = "Lemma";
type _Output1207 = "he";
type _Output1208 = Record<string, never>;
type _Output1205 = {
	unitKind: _Output1206;
	language: _Output1207;
	family: _Output460;
	kind: _Output461;
	canonicalForm: _Output629;
	coreFeatures: _Output1208;
};
type _Output1204 = { encounter: _Output456; lemma: _Output1205 };
type _Output1211 = "Lemma";
type _Output1212 = "he";
type _Output1215 = "Art" | "Int";
type _Output1214 = _Output1215 | null;
type _Output1213 = { pronType: _Output1214 };
type _Output1210 = {
	unitKind: _Output1211;
	language: _Output1212;
	family: _Output466;
	kind: _Output467;
	canonicalForm: _Output629;
	coreFeatures: _Output1213;
};
type _Output1209 = { encounter: _Output462; lemma: _Output1210 };
type _Output1218 = "Lemma";
type _Output1219 = "he";
type _Output1220 = Record<string, never>;
type _Output1217 = {
	unitKind: _Output1218;
	language: _Output1219;
	family: _Output472;
	kind: _Output473;
	canonicalForm: _Output629;
	coreFeatures: _Output1220;
};
type _Output1216 = { encounter: _Output468; lemma: _Output1217 };
type _Output1223 = "Lemma";
type _Output1224 = "he";
type _Output1226 = _Output637 | null;
type _Output1229 = "Fem" | "Masc";
type _Output1230 = [_Output1229, ...Array<_Output1229>];
type _Output1228 = _Output1229 | _Output1230;
type _Output1227 = _Output1228 | null;
type _Output1225 = { abbr: _Output1226; gender: _Output1227 };
type _Output1222 = {
	unitKind: _Output1223;
	language: _Output1224;
	family: _Output478;
	kind: _Output479;
	canonicalForm: _Output629;
	coreFeatures: _Output1225;
};
type _Output1221 = { encounter: _Output474; lemma: _Output1222 };
type _Output1233 = "Lemma";
type _Output1234 = "he";
type _Output1235 = Record<string, never>;
type _Output1232 = {
	unitKind: _Output1233;
	language: _Output1234;
	family: _Output484;
	kind: _Output485;
	canonicalForm: _Output629;
	coreFeatures: _Output1235;
};
type _Output1231 = { encounter: _Output480; lemma: _Output1232 };
type _Output1238 = "Lemma";
type _Output1239 = "he";
type _Output1240 = Record<string, never>;
type _Output1237 = {
	unitKind: _Output1238;
	language: _Output1239;
	family: _Output490;
	kind: _Output491;
	canonicalForm: _Output629;
	coreFeatures: _Output1240;
};
type _Output1236 = { encounter: _Output486; lemma: _Output1237 };
type _Output1243 = "Lemma";
type _Output1244 = "he";
type _Output1245 = Record<string, never>;
type _Output1242 = {
	unitKind: _Output1243;
	language: _Output1244;
	family: _Output496;
	kind: _Output497;
	canonicalForm: _Output629;
	coreFeatures: _Output1245;
};
type _Output1241 = { encounter: _Output492; lemma: _Output1242 };
type _Output1248 = "Lemma";
type _Output1249 = "he";
type _Output1252 = "Def";
type _Output1251 = _Output1252 | null;
type _Output1254 = "Dem" | "Ind" | "Int" | "Prs";
type _Output1253 = _Output1254 | null;
type _Output1256 = "Yes";
type _Output1255 = _Output1256 | null;
type _Output1250 = {
	definite: _Output1251;
	pronType: _Output1253;
	reflex: _Output1255;
};
type _Output1247 = {
	unitKind: _Output1248;
	language: _Output1249;
	family: _Output502;
	kind: _Output503;
	canonicalForm: _Output629;
	coreFeatures: _Output1250;
};
type _Output1246 = { encounter: _Output498; lemma: _Output1247 };
type _Output1259 = "Lemma";
type _Output1260 = "he";
type _Output1262 = _Output637 | null;
type _Output1265 = "Fem" | "Masc";
type _Output1266 = [_Output1265, ...Array<_Output1265>];
type _Output1264 = _Output1265 | _Output1266;
type _Output1263 = _Output1264 | null;
type _Output1261 = { abbr: _Output1262; gender: _Output1263 };
type _Output1258 = {
	unitKind: _Output1259;
	language: _Output1260;
	family: _Output508;
	kind: _Output509;
	canonicalForm: _Output629;
	coreFeatures: _Output1261;
};
type _Output1257 = { encounter: _Output504; lemma: _Output1258 };
type _Output1269 = "Lemma";
type _Output1270 = "he";
type _Output1271 = Record<string, never>;
type _Output1268 = {
	unitKind: _Output1269;
	language: _Output1270;
	family: _Output514;
	kind: _Output515;
	canonicalForm: _Output629;
	coreFeatures: _Output1271;
};
type _Output1267 = { encounter: _Output510; lemma: _Output1268 };
type _Output1274 = "Lemma";
type _Output1275 = "he";
type _Output1278 = "Tem";
type _Output1277 = _Output1278 | null;
type _Output1276 = { case: _Output1277 };
type _Output1273 = {
	unitKind: _Output1274;
	language: _Output1275;
	family: _Output520;
	kind: _Output521;
	canonicalForm: _Output629;
	coreFeatures: _Output1276;
};
type _Output1272 = { encounter: _Output516; lemma: _Output1273 };
type _Output1281 = "Lemma";
type _Output1282 = "he";
type _Output1283 = Record<string, never>;
type _Output1280 = {
	unitKind: _Output1281;
	language: _Output1282;
	family: _Output526;
	kind: _Output527;
	canonicalForm: _Output629;
	coreFeatures: _Output1283;
};
type _Output1279 = { encounter: _Output522; lemma: _Output1280 };
type _Output1286 = "Lemma";
type _Output1287 = "he";
type _Output1290 =
	| "HIFIL"
	| "HITPAEL"
	| "HUFAL"
	| "NIFAL"
	| "PAAL"
	| "PIEL"
	| "PUAL";
type _Output1289 = _Output1290 | null;
type _Output1292 = "Yes";
type _Output1291 = _Output1292 | null;
type _Output1288 = { hebBinyan: _Output1289; hebExistential: _Output1291 };
type _Output1285 = {
	unitKind: _Output1286;
	language: _Output1287;
	family: _Output532;
	kind: _Output533;
	canonicalForm: _Output629;
	coreFeatures: _Output1288;
};
type _Output1284 = { encounter: _Output528; lemma: _Output1285 };
type _Output1295 = "Lemma";
type _Output1296 = "he";
type _Output1297 = Record<string, never>;
type _Output1294 = {
	unitKind: _Output1295;
	language: _Output1296;
	family: _Output538;
	kind: _Output539;
	canonicalForm: _Output629;
	coreFeatures: _Output1297;
};
type _Output1293 = { encounter: _Output534; lemma: _Output1294 };
type _Output1300 = "Lemma";
type _Output1301 = "he";
type _Output1302 = Record<string, never>;
type _Output1299 = {
	unitKind: _Output1300;
	language: _Output1301;
	family: _Output544;
	kind: _Output545;
	canonicalForm: _Output629;
	coreFeatures: _Output1302;
};
type _Output1298 = { encounter: _Output540; lemma: _Output1299 };
type _Output1305 = "Lemma";
type _Output1306 = "he";
type _Output1307 = Record<string, never>;
type _Output1304 = {
	unitKind: _Output1305;
	language: _Output1306;
	family: _Output550;
	kind: _Output551;
	canonicalForm: _Output629;
	coreFeatures: _Output1307;
};
type _Output1303 = { encounter: _Output546; lemma: _Output1304 };
type _Output1310 = "Lemma";
type _Output1311 = "he";
type _Output1312 = Record<string, never>;
type _Output1309 = {
	unitKind: _Output1310;
	language: _Output1311;
	family: _Output556;
	kind: _Output557;
	canonicalForm: _Output629;
	coreFeatures: _Output1312;
};
type _Output1308 = { encounter: _Output552; lemma: _Output1309 };
type _Output1315 = "Lemma";
type _Output1316 = "he";
type _Output1317 = Record<string, never>;
type _Output1314 = {
	unitKind: _Output1315;
	language: _Output1316;
	family: _Output562;
	kind: _Output563;
	canonicalForm: _Output629;
	coreFeatures: _Output1317;
};
type _Output1313 = { encounter: _Output558; lemma: _Output1314 };
type _Output1320 = "Lemma";
type _Output1321 = "he";
type _Output1322 = Record<string, never>;
type _Output1319 = {
	unitKind: _Output1320;
	language: _Output1321;
	family: _Output568;
	kind: _Output569;
	canonicalForm: _Output629;
	coreFeatures: _Output1322;
};
type _Output1318 = { encounter: _Output564; lemma: _Output1319 };
type _Output1325 = "Lemma";
type _Output1326 = "he";
type _Output1327 = Record<string, never>;
type _Output1324 = {
	unitKind: _Output1325;
	language: _Output1326;
	family: _Output574;
	kind: _Output575;
	canonicalForm: _Output629;
	coreFeatures: _Output1327;
};
type _Output1323 = { encounter: _Output570; lemma: _Output1324 };
type _Output1330 = "Lemma";
type _Output1331 = "he";
type _Output1332 = Record<string, never>;
type _Output1329 = {
	unitKind: _Output1330;
	language: _Output1331;
	family: _Output580;
	kind: _Output581;
	canonicalForm: _Output629;
	coreFeatures: _Output1332;
};
type _Output1328 = { encounter: _Output576; lemma: _Output1329 };
type _Output1335 = "Lemma";
type _Output1336 = "he";
type _Output1337 = Record<string, never>;
type _Output1334 = {
	unitKind: _Output1335;
	language: _Output1336;
	family: _Output586;
	kind: _Output587;
	canonicalForm: _Output629;
	coreFeatures: _Output1337;
};
type _Output1333 = { encounter: _Output582; lemma: _Output1334 };
type _Output1340 = "Lemma";
type _Output1341 = "he";
type _Output1342 = Record<string, never>;
type _Output1339 = {
	unitKind: _Output1340;
	language: _Output1341;
	family: _Output592;
	kind: _Output593;
	canonicalForm: _Output629;
	coreFeatures: _Output1342;
};
type _Output1338 = { encounter: _Output588; lemma: _Output1339 };
type _Output1345 = "Lemma";
type _Output1346 = "he";
type _Output1347 = Record<string, never>;
type _Output1344 = {
	unitKind: _Output1345;
	language: _Output1346;
	family: _Output598;
	kind: _Output599;
	canonicalForm: _Output629;
	coreFeatures: _Output1347;
};
type _Output1343 = { encounter: _Output594; lemma: _Output1344 };
type _Output1350 = "Lemma";
type _Output1351 = "he";
type _Output1352 = Record<string, never>;
type _Output1349 = {
	unitKind: _Output1350;
	language: _Output1351;
	family: _Output604;
	kind: _Output605;
	canonicalForm: _Output629;
	coreFeatures: _Output1352;
};
type _Output1348 = { encounter: _Output600; lemma: _Output1349 };
type _Output1355 = "Lemma";
type _Output1356 = "he";
type _Output1357 = Record<string, never>;
type _Output1354 = {
	unitKind: _Output1355;
	language: _Output1356;
	family: _Output610;
	kind: _Output611;
	canonicalForm: _Output629;
	coreFeatures: _Output1357;
};
type _Output1353 = { encounter: _Output606; lemma: _Output1354 };
type _Output1360 = "Lemma";
type _Output1361 = "he";
type _Output1362 = Record<string, never>;
type _Output1359 = {
	unitKind: _Output1360;
	language: _Output1361;
	family: _Output616;
	kind: _Output617;
	canonicalForm: _Output629;
	coreFeatures: _Output1362;
};
type _Output1358 = { encounter: _Output612; lemma: _Output1359 };
type _Output1365 = "Lemma";
type _Output1366 = "he";
type _Output1367 = Record<string, never>;
type _Output1364 = {
	unitKind: _Output1365;
	language: _Output1366;
	family: _Output622;
	kind: _Output623;
	canonicalForm: _Output629;
	coreFeatures: _Output1367;
};
type _Output1363 = { encounter: _Output618; lemma: _Output1364 };
type _Output624 =
	| _Output625
	| _Output631
	| _Output644
	| _Output659
	| _Output669
	| _Output676
	| _Output683
	| _Output703
	| _Output710
	| _Output719
	| _Output728
	| _Output738
	| _Output749
	| _Output774
	| _Output783
	| _Output790
	| _Output797
	| _Output805
	| _Output817
	| _Output822
	| _Output827
	| _Output832
	| _Output837
	| _Output842
	| _Output848
	| _Output853
	| _Output858
	| _Output863
	| _Output868
	| _Output873
	| _Output878
	| _Output885
	| _Output890
	| _Output895
	| _Output900
	| _Output914
	| _Output922
	| _Output940
	| _Output948
	| _Output956
	| _Output976
	| _Output987
	| _Output1002
	| _Output1014
	| _Output1022
	| _Output1032
	| _Output1049
	| _Output1059
	| _Output1064
	| _Output1074
	| _Output1082
	| _Output1095
	| _Output1100
	| _Output1105
	| _Output1110
	| _Output1115
	| _Output1120
	| _Output1125
	| _Output1130
	| _Output1135
	| _Output1140
	| _Output1145
	| _Output1150
	| _Output1155
	| _Output1161
	| _Output1166
	| _Output1171
	| _Output1176
	| _Output1182
	| _Output1190
	| _Output1197
	| _Output1204
	| _Output1209
	| _Output1216
	| _Output1221
	| _Output1231
	| _Output1236
	| _Output1241
	| _Output1246
	| _Output1257
	| _Output1267
	| _Output1272
	| _Output1279
	| _Output1284
	| _Output1293
	| _Output1298
	| _Output1303
	| _Output1308
	| _Output1313
	| _Output1318
	| _Output1323
	| _Output1328
	| _Output1333
	| _Output1338
	| _Output1343
	| _Output1348
	| _Output1353
	| _Output1358
	| _Output1363;
type _Output1371 = string;
type _Output1370 = Array<_Output1371>;
type _Output1369 = {
	encounter: _Output28;
	lemma: _Output626;
	candidates: _Output1370;
};
type _Output1373 = Array<_Output1371>;
type _Output1372 = {
	encounter: _Output36;
	lemma: _Output632;
	candidates: _Output1373;
};
type _Output1375 = Array<_Output1371>;
type _Output1374 = {
	encounter: _Output42;
	lemma: _Output645;
	candidates: _Output1375;
};
type _Output1377 = Array<_Output1371>;
type _Output1376 = {
	encounter: _Output48;
	lemma: _Output660;
	candidates: _Output1377;
};
type _Output1379 = Array<_Output1371>;
type _Output1378 = {
	encounter: _Output54;
	lemma: _Output670;
	candidates: _Output1379;
};
type _Output1381 = Array<_Output1371>;
type _Output1380 = {
	encounter: _Output60;
	lemma: _Output677;
	candidates: _Output1381;
};
type _Output1383 = Array<_Output1371>;
type _Output1382 = {
	encounter: _Output66;
	lemma: _Output684;
	candidates: _Output1383;
};
type _Output1385 = Array<_Output1371>;
type _Output1384 = {
	encounter: _Output72;
	lemma: _Output704;
	candidates: _Output1385;
};
type _Output1387 = Array<_Output1371>;
type _Output1386 = {
	encounter: _Output78;
	lemma: _Output711;
	candidates: _Output1387;
};
type _Output1389 = Array<_Output1371>;
type _Output1388 = {
	encounter: _Output84;
	lemma: _Output720;
	candidates: _Output1389;
};
type _Output1391 = Array<_Output1371>;
type _Output1390 = {
	encounter: _Output90;
	lemma: _Output729;
	candidates: _Output1391;
};
type _Output1393 = Array<_Output1371>;
type _Output1392 = {
	encounter: _Output96;
	lemma: _Output739;
	candidates: _Output1393;
};
type _Output1395 = Array<_Output1371>;
type _Output1394 = {
	encounter: _Output102;
	lemma: _Output750;
	candidates: _Output1395;
};
type _Output1397 = Array<_Output1371>;
type _Output1396 = {
	encounter: _Output108;
	lemma: _Output775;
	candidates: _Output1397;
};
type _Output1399 = Array<_Output1371>;
type _Output1398 = {
	encounter: _Output114;
	lemma: _Output784;
	candidates: _Output1399;
};
type _Output1401 = Array<_Output1371>;
type _Output1400 = {
	encounter: _Output120;
	lemma: _Output791;
	candidates: _Output1401;
};
type _Output1403 = Array<_Output1371>;
type _Output1402 = {
	encounter: _Output126;
	lemma: _Output798;
	candidates: _Output1403;
};
type _Output1405 = Array<_Output1371>;
type _Output1404 = {
	encounter: _Output132;
	lemma: _Output806;
	candidates: _Output1405;
};
type _Output1407 = Array<_Output1371>;
type _Output1406 = {
	encounter: _Output138;
	lemma: _Output818;
	candidates: _Output1407;
};
type _Output1409 = Array<_Output1371>;
type _Output1408 = {
	encounter: _Output144;
	lemma: _Output823;
	candidates: _Output1409;
};
type _Output1411 = Array<_Output1371>;
type _Output1410 = {
	encounter: _Output150;
	lemma: _Output828;
	candidates: _Output1411;
};
type _Output1413 = Array<_Output1371>;
type _Output1412 = {
	encounter: _Output156;
	lemma: _Output833;
	candidates: _Output1413;
};
type _Output1415 = Array<_Output1371>;
type _Output1414 = {
	encounter: _Output162;
	lemma: _Output838;
	candidates: _Output1415;
};
type _Output1417 = Array<_Output1371>;
type _Output1416 = {
	encounter: _Output168;
	lemma: _Output843;
	candidates: _Output1417;
};
type _Output1419 = Array<_Output1371>;
type _Output1418 = {
	encounter: _Output174;
	lemma: _Output849;
	candidates: _Output1419;
};
type _Output1421 = Array<_Output1371>;
type _Output1420 = {
	encounter: _Output180;
	lemma: _Output854;
	candidates: _Output1421;
};
type _Output1423 = Array<_Output1371>;
type _Output1422 = {
	encounter: _Output186;
	lemma: _Output859;
	candidates: _Output1423;
};
type _Output1425 = Array<_Output1371>;
type _Output1424 = {
	encounter: _Output192;
	lemma: _Output864;
	candidates: _Output1425;
};
type _Output1427 = Array<_Output1371>;
type _Output1426 = {
	encounter: _Output198;
	lemma: _Output869;
	candidates: _Output1427;
};
type _Output1429 = Array<_Output1371>;
type _Output1428 = {
	encounter: _Output204;
	lemma: _Output874;
	candidates: _Output1429;
};
type _Output1431 = Array<_Output1371>;
type _Output1430 = {
	encounter: _Output210;
	lemma: _Output879;
	candidates: _Output1431;
};
type _Output1433 = Array<_Output1371>;
type _Output1432 = {
	encounter: _Output216;
	lemma: _Output886;
	candidates: _Output1433;
};
type _Output1435 = Array<_Output1371>;
type _Output1434 = {
	encounter: _Output222;
	lemma: _Output891;
	candidates: _Output1435;
};
type _Output1437 = Array<_Output1371>;
type _Output1436 = {
	encounter: _Output228;
	lemma: _Output896;
	candidates: _Output1437;
};
type _Output1439 = Array<_Output1371>;
type _Output1438 = {
	encounter: _Output234;
	lemma: _Output901;
	candidates: _Output1439;
};
type _Output1441 = Array<_Output1371>;
type _Output1440 = {
	encounter: _Output240;
	lemma: _Output915;
	candidates: _Output1441;
};
type _Output1443 = Array<_Output1371>;
type _Output1442 = {
	encounter: _Output246;
	lemma: _Output923;
	candidates: _Output1443;
};
type _Output1445 = Array<_Output1371>;
type _Output1444 = {
	encounter: _Output252;
	lemma: _Output941;
	candidates: _Output1445;
};
type _Output1447 = Array<_Output1371>;
type _Output1446 = {
	encounter: _Output258;
	lemma: _Output949;
	candidates: _Output1447;
};
type _Output1449 = Array<_Output1371>;
type _Output1448 = {
	encounter: _Output264;
	lemma: _Output957;
	candidates: _Output1449;
};
type _Output1451 = Array<_Output1371>;
type _Output1450 = {
	encounter: _Output270;
	lemma: _Output977;
	candidates: _Output1451;
};
type _Output1453 = Array<_Output1371>;
type _Output1452 = {
	encounter: _Output276;
	lemma: _Output988;
	candidates: _Output1453;
};
type _Output1455 = Array<_Output1371>;
type _Output1454 = {
	encounter: _Output282;
	lemma: _Output1003;
	candidates: _Output1455;
};
type _Output1457 = Array<_Output1371>;
type _Output1456 = {
	encounter: _Output288;
	lemma: _Output1015;
	candidates: _Output1457;
};
type _Output1459 = Array<_Output1371>;
type _Output1458 = {
	encounter: _Output294;
	lemma: _Output1023;
	candidates: _Output1459;
};
type _Output1461 = Array<_Output1371>;
type _Output1460 = {
	encounter: _Output300;
	lemma: _Output1033;
	candidates: _Output1461;
};
type _Output1463 = Array<_Output1371>;
type _Output1462 = {
	encounter: _Output306;
	lemma: _Output1050;
	candidates: _Output1463;
};
type _Output1465 = Array<_Output1371>;
type _Output1464 = {
	encounter: _Output312;
	lemma: _Output1060;
	candidates: _Output1465;
};
type _Output1467 = Array<_Output1371>;
type _Output1466 = {
	encounter: _Output318;
	lemma: _Output1065;
	candidates: _Output1467;
};
type _Output1469 = Array<_Output1371>;
type _Output1468 = {
	encounter: _Output324;
	lemma: _Output1075;
	candidates: _Output1469;
};
type _Output1471 = Array<_Output1371>;
type _Output1470 = {
	encounter: _Output330;
	lemma: _Output1083;
	candidates: _Output1471;
};
type _Output1473 = Array<_Output1371>;
type _Output1472 = {
	encounter: _Output336;
	lemma: _Output1096;
	candidates: _Output1473;
};
type _Output1475 = Array<_Output1371>;
type _Output1474 = {
	encounter: _Output342;
	lemma: _Output1101;
	candidates: _Output1475;
};
type _Output1477 = Array<_Output1371>;
type _Output1476 = {
	encounter: _Output348;
	lemma: _Output1106;
	candidates: _Output1477;
};
type _Output1479 = Array<_Output1371>;
type _Output1478 = {
	encounter: _Output354;
	lemma: _Output1111;
	candidates: _Output1479;
};
type _Output1481 = Array<_Output1371>;
type _Output1480 = {
	encounter: _Output360;
	lemma: _Output1116;
	candidates: _Output1481;
};
type _Output1483 = Array<_Output1371>;
type _Output1482 = {
	encounter: _Output366;
	lemma: _Output1121;
	candidates: _Output1483;
};
type _Output1485 = Array<_Output1371>;
type _Output1484 = {
	encounter: _Output372;
	lemma: _Output1126;
	candidates: _Output1485;
};
type _Output1487 = Array<_Output1371>;
type _Output1486 = {
	encounter: _Output378;
	lemma: _Output1131;
	candidates: _Output1487;
};
type _Output1489 = Array<_Output1371>;
type _Output1488 = {
	encounter: _Output384;
	lemma: _Output1136;
	candidates: _Output1489;
};
type _Output1491 = Array<_Output1371>;
type _Output1490 = {
	encounter: _Output390;
	lemma: _Output1141;
	candidates: _Output1491;
};
type _Output1493 = Array<_Output1371>;
type _Output1492 = {
	encounter: _Output396;
	lemma: _Output1146;
	candidates: _Output1493;
};
type _Output1495 = Array<_Output1371>;
type _Output1494 = {
	encounter: _Output402;
	lemma: _Output1151;
	candidates: _Output1495;
};
type _Output1497 = Array<_Output1371>;
type _Output1496 = {
	encounter: _Output408;
	lemma: _Output1156;
	candidates: _Output1497;
};
type _Output1499 = Array<_Output1371>;
type _Output1498 = {
	encounter: _Output414;
	lemma: _Output1162;
	candidates: _Output1499;
};
type _Output1501 = Array<_Output1371>;
type _Output1500 = {
	encounter: _Output420;
	lemma: _Output1167;
	candidates: _Output1501;
};
type _Output1503 = Array<_Output1371>;
type _Output1502 = {
	encounter: _Output426;
	lemma: _Output1172;
	candidates: _Output1503;
};
type _Output1505 = Array<_Output1371>;
type _Output1504 = {
	encounter: _Output432;
	lemma: _Output1177;
	candidates: _Output1505;
};
type _Output1507 = Array<_Output1371>;
type _Output1506 = {
	encounter: _Output438;
	lemma: _Output1183;
	candidates: _Output1507;
};
type _Output1509 = Array<_Output1371>;
type _Output1508 = {
	encounter: _Output444;
	lemma: _Output1191;
	candidates: _Output1509;
};
type _Output1511 = Array<_Output1371>;
type _Output1510 = {
	encounter: _Output450;
	lemma: _Output1198;
	candidates: _Output1511;
};
type _Output1513 = Array<_Output1371>;
type _Output1512 = {
	encounter: _Output456;
	lemma: _Output1205;
	candidates: _Output1513;
};
type _Output1515 = Array<_Output1371>;
type _Output1514 = {
	encounter: _Output462;
	lemma: _Output1210;
	candidates: _Output1515;
};
type _Output1517 = Array<_Output1371>;
type _Output1516 = {
	encounter: _Output468;
	lemma: _Output1217;
	candidates: _Output1517;
};
type _Output1519 = Array<_Output1371>;
type _Output1518 = {
	encounter: _Output474;
	lemma: _Output1222;
	candidates: _Output1519;
};
type _Output1521 = Array<_Output1371>;
type _Output1520 = {
	encounter: _Output480;
	lemma: _Output1232;
	candidates: _Output1521;
};
type _Output1523 = Array<_Output1371>;
type _Output1522 = {
	encounter: _Output486;
	lemma: _Output1237;
	candidates: _Output1523;
};
type _Output1525 = Array<_Output1371>;
type _Output1524 = {
	encounter: _Output492;
	lemma: _Output1242;
	candidates: _Output1525;
};
type _Output1527 = Array<_Output1371>;
type _Output1526 = {
	encounter: _Output498;
	lemma: _Output1247;
	candidates: _Output1527;
};
type _Output1529 = Array<_Output1371>;
type _Output1528 = {
	encounter: _Output504;
	lemma: _Output1258;
	candidates: _Output1529;
};
type _Output1531 = Array<_Output1371>;
type _Output1530 = {
	encounter: _Output510;
	lemma: _Output1268;
	candidates: _Output1531;
};
type _Output1533 = Array<_Output1371>;
type _Output1532 = {
	encounter: _Output516;
	lemma: _Output1273;
	candidates: _Output1533;
};
type _Output1535 = Array<_Output1371>;
type _Output1534 = {
	encounter: _Output522;
	lemma: _Output1280;
	candidates: _Output1535;
};
type _Output1537 = Array<_Output1371>;
type _Output1536 = {
	encounter: _Output528;
	lemma: _Output1285;
	candidates: _Output1537;
};
type _Output1539 = Array<_Output1371>;
type _Output1538 = {
	encounter: _Output534;
	lemma: _Output1294;
	candidates: _Output1539;
};
type _Output1541 = Array<_Output1371>;
type _Output1540 = {
	encounter: _Output540;
	lemma: _Output1299;
	candidates: _Output1541;
};
type _Output1543 = Array<_Output1371>;
type _Output1542 = {
	encounter: _Output546;
	lemma: _Output1304;
	candidates: _Output1543;
};
type _Output1545 = Array<_Output1371>;
type _Output1544 = {
	encounter: _Output552;
	lemma: _Output1309;
	candidates: _Output1545;
};
type _Output1547 = Array<_Output1371>;
type _Output1546 = {
	encounter: _Output558;
	lemma: _Output1314;
	candidates: _Output1547;
};
type _Output1549 = Array<_Output1371>;
type _Output1548 = {
	encounter: _Output564;
	lemma: _Output1319;
	candidates: _Output1549;
};
type _Output1551 = Array<_Output1371>;
type _Output1550 = {
	encounter: _Output570;
	lemma: _Output1324;
	candidates: _Output1551;
};
type _Output1553 = Array<_Output1371>;
type _Output1552 = {
	encounter: _Output576;
	lemma: _Output1329;
	candidates: _Output1553;
};
type _Output1555 = Array<_Output1371>;
type _Output1554 = {
	encounter: _Output582;
	lemma: _Output1334;
	candidates: _Output1555;
};
type _Output1557 = Array<_Output1371>;
type _Output1556 = {
	encounter: _Output588;
	lemma: _Output1339;
	candidates: _Output1557;
};
type _Output1559 = Array<_Output1371>;
type _Output1558 = {
	encounter: _Output594;
	lemma: _Output1344;
	candidates: _Output1559;
};
type _Output1561 = Array<_Output1371>;
type _Output1560 = {
	encounter: _Output600;
	lemma: _Output1349;
	candidates: _Output1561;
};
type _Output1563 = Array<_Output1371>;
type _Output1562 = {
	encounter: _Output606;
	lemma: _Output1354;
	candidates: _Output1563;
};
type _Output1565 = Array<_Output1371>;
type _Output1564 = {
	encounter: _Output612;
	lemma: _Output1359;
	candidates: _Output1565;
};
type _Output1567 = Array<_Output1371>;
type _Output1566 = {
	encounter: _Output618;
	lemma: _Output1364;
	candidates: _Output1567;
};
type _Output1368 =
	| _Output1369
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
	| _Output1524
	| _Output1526
	| _Output1528
	| _Output1530
	| _Output1532
	| _Output1534
	| _Output1536
	| _Output1538
	| _Output1540
	| _Output1542
	| _Output1544
	| _Output1546
	| _Output1548
	| _Output1550
	| _Output1552
	| _Output1554
	| _Output1556
	| _Output1558
	| _Output1560
	| _Output1562
	| _Output1564
	| _Output1566;
type _Output1571 = "Reading";
type _Output1570 = {
	unitKind: _Output1571;
	lemma: _Output626;
	emojiDescription: _Output1371;
};
type _Output1574 = null;
type _Output1573 = _Output1574 | undefined;
type _Output1576 = { en?: _Output1573; ru?: _Output1573 };
type _Output1575 = _Output1576 | undefined;
type _Output1578 = {
	synonym?: _Output1573;
	nearSynonym?: _Output1573;
	antonym?: _Output1573;
	nearAntonym?: _Output1573;
	hypernym?: _Output1573;
	hyponym?: _Output1573;
	meronym?: _Output1573;
	holonym?: _Output1573;
};
type _Output1577 = _Output1578 | undefined;
type _Output1572 = {
	transcription?: _Output1573;
	definition?: _Output1573;
	morphologicalTree?: _Output1573;
	lexicalBreakdown?: _Output1573;
	translations?: _Output1575;
	semanticRelations?: _Output1577;
};
type _Output1569 = {
	encounter: _Output28;
	reading: _Output1570;
	request: _Output1572;
};
type _Output1581 = "Reading";
type _Output1580 = {
	unitKind: _Output1581;
	lemma: _Output632;
	emojiDescription: _Output1371;
};
type _Output1579 = {
	encounter: _Output36;
	reading: _Output1580;
	request: _Output1572;
};
type _Output1584 = "Reading";
type _Output1583 = {
	unitKind: _Output1584;
	lemma: _Output645;
	emojiDescription: _Output1371;
};
type _Output1582 = {
	encounter: _Output42;
	reading: _Output1583;
	request: _Output1572;
};
type _Output1587 = "Reading";
type _Output1586 = {
	unitKind: _Output1587;
	lemma: _Output660;
	emojiDescription: _Output1371;
};
type _Output1585 = {
	encounter: _Output48;
	reading: _Output1586;
	request: _Output1572;
};
type _Output1590 = "Reading";
type _Output1589 = {
	unitKind: _Output1590;
	lemma: _Output670;
	emojiDescription: _Output1371;
};
type _Output1588 = {
	encounter: _Output54;
	reading: _Output1589;
	request: _Output1572;
};
type _Output1593 = "Reading";
type _Output1592 = {
	unitKind: _Output1593;
	lemma: _Output677;
	emojiDescription: _Output1371;
};
type _Output1591 = {
	encounter: _Output60;
	reading: _Output1592;
	request: _Output1572;
};
type _Output1596 = "Reading";
type _Output1595 = {
	unitKind: _Output1596;
	lemma: _Output684;
	emojiDescription: _Output1371;
};
type _Output1594 = {
	encounter: _Output66;
	reading: _Output1595;
	request: _Output1572;
};
type _Output1599 = "Reading";
type _Output1598 = {
	unitKind: _Output1599;
	lemma: _Output704;
	emojiDescription: _Output1371;
};
type _Output1597 = {
	encounter: _Output72;
	reading: _Output1598;
	request: _Output1572;
};
type _Output1602 = "Reading";
type _Output1601 = {
	unitKind: _Output1602;
	lemma: _Output711;
	emojiDescription: _Output1371;
};
type _Output1600 = {
	encounter: _Output78;
	reading: _Output1601;
	request: _Output1572;
};
type _Output1605 = "Reading";
type _Output1604 = {
	unitKind: _Output1605;
	lemma: _Output720;
	emojiDescription: _Output1371;
};
type _Output1603 = {
	encounter: _Output84;
	reading: _Output1604;
	request: _Output1572;
};
type _Output1608 = "Reading";
type _Output1607 = {
	unitKind: _Output1608;
	lemma: _Output729;
	emojiDescription: _Output1371;
};
type _Output1606 = {
	encounter: _Output90;
	reading: _Output1607;
	request: _Output1572;
};
type _Output1611 = "Reading";
type _Output1610 = {
	unitKind: _Output1611;
	lemma: _Output739;
	emojiDescription: _Output1371;
};
type _Output1609 = {
	encounter: _Output96;
	reading: _Output1610;
	request: _Output1572;
};
type _Output1614 = "Reading";
type _Output1613 = {
	unitKind: _Output1614;
	lemma: _Output750;
	emojiDescription: _Output1371;
};
type _Output1612 = {
	encounter: _Output102;
	reading: _Output1613;
	request: _Output1572;
};
type _Output1617 = "Reading";
type _Output1616 = {
	unitKind: _Output1617;
	lemma: _Output775;
	emojiDescription: _Output1371;
};
type _Output1615 = {
	encounter: _Output108;
	reading: _Output1616;
	request: _Output1572;
};
type _Output1620 = "Reading";
type _Output1619 = {
	unitKind: _Output1620;
	lemma: _Output784;
	emojiDescription: _Output1371;
};
type _Output1618 = {
	encounter: _Output114;
	reading: _Output1619;
	request: _Output1572;
};
type _Output1623 = "Reading";
type _Output1622 = {
	unitKind: _Output1623;
	lemma: _Output791;
	emojiDescription: _Output1371;
};
type _Output1621 = {
	encounter: _Output120;
	reading: _Output1622;
	request: _Output1572;
};
type _Output1626 = "Reading";
type _Output1625 = {
	unitKind: _Output1626;
	lemma: _Output798;
	emojiDescription: _Output1371;
};
type _Output1624 = {
	encounter: _Output126;
	reading: _Output1625;
	request: _Output1572;
};
type _Output1629 = "Reading";
type _Output1628 = {
	unitKind: _Output1629;
	lemma: _Output806;
	emojiDescription: _Output1371;
};
type _Output1627 = {
	encounter: _Output132;
	reading: _Output1628;
	request: _Output1572;
};
type _Output1632 = "Reading";
type _Output1631 = {
	unitKind: _Output1632;
	lemma: _Output818;
	emojiDescription: _Output1371;
};
type _Output1630 = {
	encounter: _Output138;
	reading: _Output1631;
	request: _Output1572;
};
type _Output1635 = "Reading";
type _Output1634 = {
	unitKind: _Output1635;
	lemma: _Output823;
	emojiDescription: _Output1371;
};
type _Output1633 = {
	encounter: _Output144;
	reading: _Output1634;
	request: _Output1572;
};
type _Output1638 = "Reading";
type _Output1637 = {
	unitKind: _Output1638;
	lemma: _Output828;
	emojiDescription: _Output1371;
};
type _Output1636 = {
	encounter: _Output150;
	reading: _Output1637;
	request: _Output1572;
};
type _Output1641 = "Reading";
type _Output1640 = {
	unitKind: _Output1641;
	lemma: _Output833;
	emojiDescription: _Output1371;
};
type _Output1639 = {
	encounter: _Output156;
	reading: _Output1640;
	request: _Output1572;
};
type _Output1644 = "Reading";
type _Output1643 = {
	unitKind: _Output1644;
	lemma: _Output838;
	emojiDescription: _Output1371;
};
type _Output1642 = {
	encounter: _Output162;
	reading: _Output1643;
	request: _Output1572;
};
type _Output1647 = "Reading";
type _Output1646 = {
	unitKind: _Output1647;
	lemma: _Output843;
	emojiDescription: _Output1371;
};
type _Output1645 = {
	encounter: _Output168;
	reading: _Output1646;
	request: _Output1572;
};
type _Output1650 = "Reading";
type _Output1649 = {
	unitKind: _Output1650;
	lemma: _Output849;
	emojiDescription: _Output1371;
};
type _Output1648 = {
	encounter: _Output174;
	reading: _Output1649;
	request: _Output1572;
};
type _Output1653 = "Reading";
type _Output1652 = {
	unitKind: _Output1653;
	lemma: _Output854;
	emojiDescription: _Output1371;
};
type _Output1651 = {
	encounter: _Output180;
	reading: _Output1652;
	request: _Output1572;
};
type _Output1656 = "Reading";
type _Output1655 = {
	unitKind: _Output1656;
	lemma: _Output859;
	emojiDescription: _Output1371;
};
type _Output1654 = {
	encounter: _Output186;
	reading: _Output1655;
	request: _Output1572;
};
type _Output1659 = "Reading";
type _Output1658 = {
	unitKind: _Output1659;
	lemma: _Output864;
	emojiDescription: _Output1371;
};
type _Output1657 = {
	encounter: _Output192;
	reading: _Output1658;
	request: _Output1572;
};
type _Output1662 = "Reading";
type _Output1661 = {
	unitKind: _Output1662;
	lemma: _Output869;
	emojiDescription: _Output1371;
};
type _Output1660 = {
	encounter: _Output198;
	reading: _Output1661;
	request: _Output1572;
};
type _Output1665 = "Reading";
type _Output1664 = {
	unitKind: _Output1665;
	lemma: _Output874;
	emojiDescription: _Output1371;
};
type _Output1663 = {
	encounter: _Output204;
	reading: _Output1664;
	request: _Output1572;
};
type _Output1668 = "Reading";
type _Output1667 = {
	unitKind: _Output1668;
	lemma: _Output879;
	emojiDescription: _Output1371;
};
type _Output1666 = {
	encounter: _Output210;
	reading: _Output1667;
	request: _Output1572;
};
type _Output1671 = "Reading";
type _Output1670 = {
	unitKind: _Output1671;
	lemma: _Output886;
	emojiDescription: _Output1371;
};
type _Output1669 = {
	encounter: _Output216;
	reading: _Output1670;
	request: _Output1572;
};
type _Output1674 = "Reading";
type _Output1673 = {
	unitKind: _Output1674;
	lemma: _Output891;
	emojiDescription: _Output1371;
};
type _Output1672 = {
	encounter: _Output222;
	reading: _Output1673;
	request: _Output1572;
};
type _Output1677 = "Reading";
type _Output1676 = {
	unitKind: _Output1677;
	lemma: _Output896;
	emojiDescription: _Output1371;
};
type _Output1675 = {
	encounter: _Output228;
	reading: _Output1676;
	request: _Output1572;
};
type _Output1680 = "Reading";
type _Output1679 = {
	unitKind: _Output1680;
	lemma: _Output901;
	emojiDescription: _Output1371;
};
type _Output1678 = {
	encounter: _Output234;
	reading: _Output1679;
	request: _Output1572;
};
type _Output1683 = "Reading";
type _Output1682 = {
	unitKind: _Output1683;
	lemma: _Output915;
	emojiDescription: _Output1371;
};
type _Output1681 = {
	encounter: _Output240;
	reading: _Output1682;
	request: _Output1572;
};
type _Output1686 = "Reading";
type _Output1685 = {
	unitKind: _Output1686;
	lemma: _Output923;
	emojiDescription: _Output1371;
};
type _Output1684 = {
	encounter: _Output246;
	reading: _Output1685;
	request: _Output1572;
};
type _Output1689 = "Reading";
type _Output1688 = {
	unitKind: _Output1689;
	lemma: _Output941;
	emojiDescription: _Output1371;
};
type _Output1687 = {
	encounter: _Output252;
	reading: _Output1688;
	request: _Output1572;
};
type _Output1692 = "Reading";
type _Output1691 = {
	unitKind: _Output1692;
	lemma: _Output949;
	emojiDescription: _Output1371;
};
type _Output1690 = {
	encounter: _Output258;
	reading: _Output1691;
	request: _Output1572;
};
type _Output1695 = "Reading";
type _Output1694 = {
	unitKind: _Output1695;
	lemma: _Output957;
	emojiDescription: _Output1371;
};
type _Output1693 = {
	encounter: _Output264;
	reading: _Output1694;
	request: _Output1572;
};
type _Output1698 = "Reading";
type _Output1697 = {
	unitKind: _Output1698;
	lemma: _Output977;
	emojiDescription: _Output1371;
};
type _Output1696 = {
	encounter: _Output270;
	reading: _Output1697;
	request: _Output1572;
};
type _Output1701 = "Reading";
type _Output1700 = {
	unitKind: _Output1701;
	lemma: _Output988;
	emojiDescription: _Output1371;
};
type _Output1699 = {
	encounter: _Output276;
	reading: _Output1700;
	request: _Output1572;
};
type _Output1704 = "Reading";
type _Output1703 = {
	unitKind: _Output1704;
	lemma: _Output1003;
	emojiDescription: _Output1371;
};
type _Output1702 = {
	encounter: _Output282;
	reading: _Output1703;
	request: _Output1572;
};
type _Output1707 = "Reading";
type _Output1706 = {
	unitKind: _Output1707;
	lemma: _Output1015;
	emojiDescription: _Output1371;
};
type _Output1705 = {
	encounter: _Output288;
	reading: _Output1706;
	request: _Output1572;
};
type _Output1710 = "Reading";
type _Output1709 = {
	unitKind: _Output1710;
	lemma: _Output1023;
	emojiDescription: _Output1371;
};
type _Output1708 = {
	encounter: _Output294;
	reading: _Output1709;
	request: _Output1572;
};
type _Output1713 = "Reading";
type _Output1712 = {
	unitKind: _Output1713;
	lemma: _Output1033;
	emojiDescription: _Output1371;
};
type _Output1711 = {
	encounter: _Output300;
	reading: _Output1712;
	request: _Output1572;
};
type _Output1716 = "Reading";
type _Output1715 = {
	unitKind: _Output1716;
	lemma: _Output1050;
	emojiDescription: _Output1371;
};
type _Output1714 = {
	encounter: _Output306;
	reading: _Output1715;
	request: _Output1572;
};
type _Output1719 = "Reading";
type _Output1718 = {
	unitKind: _Output1719;
	lemma: _Output1060;
	emojiDescription: _Output1371;
};
type _Output1717 = {
	encounter: _Output312;
	reading: _Output1718;
	request: _Output1572;
};
type _Output1722 = "Reading";
type _Output1721 = {
	unitKind: _Output1722;
	lemma: _Output1065;
	emojiDescription: _Output1371;
};
type _Output1720 = {
	encounter: _Output318;
	reading: _Output1721;
	request: _Output1572;
};
type _Output1725 = "Reading";
type _Output1724 = {
	unitKind: _Output1725;
	lemma: _Output1075;
	emojiDescription: _Output1371;
};
type _Output1723 = {
	encounter: _Output324;
	reading: _Output1724;
	request: _Output1572;
};
type _Output1728 = "Reading";
type _Output1727 = {
	unitKind: _Output1728;
	lemma: _Output1083;
	emojiDescription: _Output1371;
};
type _Output1726 = {
	encounter: _Output330;
	reading: _Output1727;
	request: _Output1572;
};
type _Output1731 = "Reading";
type _Output1730 = {
	unitKind: _Output1731;
	lemma: _Output1096;
	emojiDescription: _Output1371;
};
type _Output1729 = {
	encounter: _Output336;
	reading: _Output1730;
	request: _Output1572;
};
type _Output1734 = "Reading";
type _Output1733 = {
	unitKind: _Output1734;
	lemma: _Output1101;
	emojiDescription: _Output1371;
};
type _Output1732 = {
	encounter: _Output342;
	reading: _Output1733;
	request: _Output1572;
};
type _Output1737 = "Reading";
type _Output1736 = {
	unitKind: _Output1737;
	lemma: _Output1106;
	emojiDescription: _Output1371;
};
type _Output1735 = {
	encounter: _Output348;
	reading: _Output1736;
	request: _Output1572;
};
type _Output1740 = "Reading";
type _Output1739 = {
	unitKind: _Output1740;
	lemma: _Output1111;
	emojiDescription: _Output1371;
};
type _Output1738 = {
	encounter: _Output354;
	reading: _Output1739;
	request: _Output1572;
};
type _Output1743 = "Reading";
type _Output1742 = {
	unitKind: _Output1743;
	lemma: _Output1116;
	emojiDescription: _Output1371;
};
type _Output1741 = {
	encounter: _Output360;
	reading: _Output1742;
	request: _Output1572;
};
type _Output1746 = "Reading";
type _Output1745 = {
	unitKind: _Output1746;
	lemma: _Output1121;
	emojiDescription: _Output1371;
};
type _Output1744 = {
	encounter: _Output366;
	reading: _Output1745;
	request: _Output1572;
};
type _Output1749 = "Reading";
type _Output1748 = {
	unitKind: _Output1749;
	lemma: _Output1126;
	emojiDescription: _Output1371;
};
type _Output1747 = {
	encounter: _Output372;
	reading: _Output1748;
	request: _Output1572;
};
type _Output1752 = "Reading";
type _Output1751 = {
	unitKind: _Output1752;
	lemma: _Output1131;
	emojiDescription: _Output1371;
};
type _Output1750 = {
	encounter: _Output378;
	reading: _Output1751;
	request: _Output1572;
};
type _Output1755 = "Reading";
type _Output1754 = {
	unitKind: _Output1755;
	lemma: _Output1136;
	emojiDescription: _Output1371;
};
type _Output1753 = {
	encounter: _Output384;
	reading: _Output1754;
	request: _Output1572;
};
type _Output1758 = "Reading";
type _Output1757 = {
	unitKind: _Output1758;
	lemma: _Output1141;
	emojiDescription: _Output1371;
};
type _Output1756 = {
	encounter: _Output390;
	reading: _Output1757;
	request: _Output1572;
};
type _Output1761 = "Reading";
type _Output1760 = {
	unitKind: _Output1761;
	lemma: _Output1146;
	emojiDescription: _Output1371;
};
type _Output1759 = {
	encounter: _Output396;
	reading: _Output1760;
	request: _Output1572;
};
type _Output1764 = "Reading";
type _Output1763 = {
	unitKind: _Output1764;
	lemma: _Output1151;
	emojiDescription: _Output1371;
};
type _Output1762 = {
	encounter: _Output402;
	reading: _Output1763;
	request: _Output1572;
};
type _Output1767 = "Reading";
type _Output1766 = {
	unitKind: _Output1767;
	lemma: _Output1156;
	emojiDescription: _Output1371;
};
type _Output1765 = {
	encounter: _Output408;
	reading: _Output1766;
	request: _Output1572;
};
type _Output1770 = "Reading";
type _Output1769 = {
	unitKind: _Output1770;
	lemma: _Output1162;
	emojiDescription: _Output1371;
};
type _Output1768 = {
	encounter: _Output414;
	reading: _Output1769;
	request: _Output1572;
};
type _Output1773 = "Reading";
type _Output1772 = {
	unitKind: _Output1773;
	lemma: _Output1167;
	emojiDescription: _Output1371;
};
type _Output1771 = {
	encounter: _Output420;
	reading: _Output1772;
	request: _Output1572;
};
type _Output1776 = "Reading";
type _Output1775 = {
	unitKind: _Output1776;
	lemma: _Output1172;
	emojiDescription: _Output1371;
};
type _Output1774 = {
	encounter: _Output426;
	reading: _Output1775;
	request: _Output1572;
};
type _Output1779 = "Reading";
type _Output1778 = {
	unitKind: _Output1779;
	lemma: _Output1177;
	emojiDescription: _Output1371;
};
type _Output1777 = {
	encounter: _Output432;
	reading: _Output1778;
	request: _Output1572;
};
type _Output1782 = "Reading";
type _Output1781 = {
	unitKind: _Output1782;
	lemma: _Output1183;
	emojiDescription: _Output1371;
};
type _Output1780 = {
	encounter: _Output438;
	reading: _Output1781;
	request: _Output1572;
};
type _Output1785 = "Reading";
type _Output1784 = {
	unitKind: _Output1785;
	lemma: _Output1191;
	emojiDescription: _Output1371;
};
type _Output1783 = {
	encounter: _Output444;
	reading: _Output1784;
	request: _Output1572;
};
type _Output1788 = "Reading";
type _Output1787 = {
	unitKind: _Output1788;
	lemma: _Output1198;
	emojiDescription: _Output1371;
};
type _Output1786 = {
	encounter: _Output450;
	reading: _Output1787;
	request: _Output1572;
};
type _Output1791 = "Reading";
type _Output1790 = {
	unitKind: _Output1791;
	lemma: _Output1205;
	emojiDescription: _Output1371;
};
type _Output1789 = {
	encounter: _Output456;
	reading: _Output1790;
	request: _Output1572;
};
type _Output1794 = "Reading";
type _Output1793 = {
	unitKind: _Output1794;
	lemma: _Output1210;
	emojiDescription: _Output1371;
};
type _Output1792 = {
	encounter: _Output462;
	reading: _Output1793;
	request: _Output1572;
};
type _Output1797 = "Reading";
type _Output1796 = {
	unitKind: _Output1797;
	lemma: _Output1217;
	emojiDescription: _Output1371;
};
type _Output1795 = {
	encounter: _Output468;
	reading: _Output1796;
	request: _Output1572;
};
type _Output1800 = "Reading";
type _Output1799 = {
	unitKind: _Output1800;
	lemma: _Output1222;
	emojiDescription: _Output1371;
};
type _Output1798 = {
	encounter: _Output474;
	reading: _Output1799;
	request: _Output1572;
};
type _Output1803 = "Reading";
type _Output1802 = {
	unitKind: _Output1803;
	lemma: _Output1232;
	emojiDescription: _Output1371;
};
type _Output1801 = {
	encounter: _Output480;
	reading: _Output1802;
	request: _Output1572;
};
type _Output1806 = "Reading";
type _Output1805 = {
	unitKind: _Output1806;
	lemma: _Output1237;
	emojiDescription: _Output1371;
};
type _Output1804 = {
	encounter: _Output486;
	reading: _Output1805;
	request: _Output1572;
};
type _Output1809 = "Reading";
type _Output1808 = {
	unitKind: _Output1809;
	lemma: _Output1242;
	emojiDescription: _Output1371;
};
type _Output1807 = {
	encounter: _Output492;
	reading: _Output1808;
	request: _Output1572;
};
type _Output1812 = "Reading";
type _Output1811 = {
	unitKind: _Output1812;
	lemma: _Output1247;
	emojiDescription: _Output1371;
};
type _Output1810 = {
	encounter: _Output498;
	reading: _Output1811;
	request: _Output1572;
};
type _Output1815 = "Reading";
type _Output1814 = {
	unitKind: _Output1815;
	lemma: _Output1258;
	emojiDescription: _Output1371;
};
type _Output1813 = {
	encounter: _Output504;
	reading: _Output1814;
	request: _Output1572;
};
type _Output1818 = "Reading";
type _Output1817 = {
	unitKind: _Output1818;
	lemma: _Output1268;
	emojiDescription: _Output1371;
};
type _Output1816 = {
	encounter: _Output510;
	reading: _Output1817;
	request: _Output1572;
};
type _Output1821 = "Reading";
type _Output1820 = {
	unitKind: _Output1821;
	lemma: _Output1273;
	emojiDescription: _Output1371;
};
type _Output1819 = {
	encounter: _Output516;
	reading: _Output1820;
	request: _Output1572;
};
type _Output1824 = "Reading";
type _Output1823 = {
	unitKind: _Output1824;
	lemma: _Output1280;
	emojiDescription: _Output1371;
};
type _Output1822 = {
	encounter: _Output522;
	reading: _Output1823;
	request: _Output1572;
};
type _Output1827 = "Reading";
type _Output1826 = {
	unitKind: _Output1827;
	lemma: _Output1285;
	emojiDescription: _Output1371;
};
type _Output1825 = {
	encounter: _Output528;
	reading: _Output1826;
	request: _Output1572;
};
type _Output1830 = "Reading";
type _Output1829 = {
	unitKind: _Output1830;
	lemma: _Output1294;
	emojiDescription: _Output1371;
};
type _Output1828 = {
	encounter: _Output534;
	reading: _Output1829;
	request: _Output1572;
};
type _Output1833 = "Reading";
type _Output1832 = {
	unitKind: _Output1833;
	lemma: _Output1299;
	emojiDescription: _Output1371;
};
type _Output1831 = {
	encounter: _Output540;
	reading: _Output1832;
	request: _Output1572;
};
type _Output1836 = "Reading";
type _Output1835 = {
	unitKind: _Output1836;
	lemma: _Output1304;
	emojiDescription: _Output1371;
};
type _Output1834 = {
	encounter: _Output546;
	reading: _Output1835;
	request: _Output1572;
};
type _Output1839 = "Reading";
type _Output1838 = {
	unitKind: _Output1839;
	lemma: _Output1309;
	emojiDescription: _Output1371;
};
type _Output1837 = {
	encounter: _Output552;
	reading: _Output1838;
	request: _Output1572;
};
type _Output1842 = "Reading";
type _Output1841 = {
	unitKind: _Output1842;
	lemma: _Output1314;
	emojiDescription: _Output1371;
};
type _Output1840 = {
	encounter: _Output558;
	reading: _Output1841;
	request: _Output1572;
};
type _Output1845 = "Reading";
type _Output1844 = {
	unitKind: _Output1845;
	lemma: _Output1319;
	emojiDescription: _Output1371;
};
type _Output1843 = {
	encounter: _Output564;
	reading: _Output1844;
	request: _Output1572;
};
type _Output1848 = "Reading";
type _Output1847 = {
	unitKind: _Output1848;
	lemma: _Output1324;
	emojiDescription: _Output1371;
};
type _Output1846 = {
	encounter: _Output570;
	reading: _Output1847;
	request: _Output1572;
};
type _Output1851 = "Reading";
type _Output1850 = {
	unitKind: _Output1851;
	lemma: _Output1329;
	emojiDescription: _Output1371;
};
type _Output1849 = {
	encounter: _Output576;
	reading: _Output1850;
	request: _Output1572;
};
type _Output1854 = "Reading";
type _Output1853 = {
	unitKind: _Output1854;
	lemma: _Output1334;
	emojiDescription: _Output1371;
};
type _Output1852 = {
	encounter: _Output582;
	reading: _Output1853;
	request: _Output1572;
};
type _Output1857 = "Reading";
type _Output1856 = {
	unitKind: _Output1857;
	lemma: _Output1339;
	emojiDescription: _Output1371;
};
type _Output1855 = {
	encounter: _Output588;
	reading: _Output1856;
	request: _Output1572;
};
type _Output1860 = "Reading";
type _Output1859 = {
	unitKind: _Output1860;
	lemma: _Output1344;
	emojiDescription: _Output1371;
};
type _Output1858 = {
	encounter: _Output594;
	reading: _Output1859;
	request: _Output1572;
};
type _Output1863 = "Reading";
type _Output1862 = {
	unitKind: _Output1863;
	lemma: _Output1349;
	emojiDescription: _Output1371;
};
type _Output1861 = {
	encounter: _Output600;
	reading: _Output1862;
	request: _Output1572;
};
type _Output1866 = "Reading";
type _Output1865 = {
	unitKind: _Output1866;
	lemma: _Output1354;
	emojiDescription: _Output1371;
};
type _Output1864 = {
	encounter: _Output606;
	reading: _Output1865;
	request: _Output1572;
};
type _Output1869 = "Reading";
type _Output1868 = {
	unitKind: _Output1869;
	lemma: _Output1359;
	emojiDescription: _Output1371;
};
type _Output1867 = {
	encounter: _Output612;
	reading: _Output1868;
	request: _Output1572;
};
type _Output1872 = "Reading";
type _Output1871 = {
	unitKind: _Output1872;
	lemma: _Output1364;
	emojiDescription: _Output1371;
};
type _Output1870 = {
	encounter: _Output618;
	reading: _Output1871;
	request: _Output1572;
};
type _Output1568 =
	| _Output1569
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
	| _Output1819
	| _Output1822
	| _Output1825
	| _Output1828
	| _Output1831
	| _Output1834
	| _Output1837
	| _Output1840
	| _Output1843
	| _Output1846
	| _Output1849
	| _Output1852
	| _Output1855
	| _Output1858
	| _Output1861
	| _Output1864
	| _Output1867
	| _Output1870;
type _Output1875 = string;
type _Output1874 = [_Output1875, ...Array<_Output1875>];
type _Output1873 = { sourceSentences: _Output1874 };
type _Output1880 = "Contribute" | "Correct";
type _Output1881 = "transcription" | "definition";
type _Output1882 = string;
type _Output1879 = {
	kind: _Output1880;
	aspect: _Output1881;
	value: _Output1882;
};
type _Output1884 = "Retract";
type _Output1883 = { kind: _Output1884; aspect: _Output1881 };
type _Output1886 = "translations";
type _Output1887 = "en" | "ru";
type _Output1888 = Array<_Output1882>;
type _Output1885 = {
	kind: _Output1880;
	aspect: _Output1886;
	language: _Output1887;
	value: _Output1888;
};
type _Output1890 = "Retract";
type _Output1891 = "translations";
type _Output1889 = {
	kind: _Output1890;
	aspect: _Output1891;
	language: _Output1887;
};
type _Output1893 = "semanticRelations";
type _Output1894 = "synonym";
type _Output1895 = "reading";
type _Output1897 =
	| _Output1570
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
	| _Output1820
	| _Output1823
	| _Output1826
	| _Output1829
	| _Output1832
	| _Output1835
	| _Output1838
	| _Output1841
	| _Output1844
	| _Output1847
	| _Output1850
	| _Output1853
	| _Output1856
	| _Output1859
	| _Output1862
	| _Output1865
	| _Output1868
	| _Output1871;
type _Output1896 = Array<_Output1897>;
type _Output1892 = {
	kind: _Output1880;
	aspect: _Output1893;
	relation: _Output1894;
	targetKind: _Output1895;
	value: _Output1896;
};
type _Output1899 = "semanticRelations";
type _Output1900 =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "nearAntonym"
	| "hypernym"
	| "holonym";
type _Output1902 = "lemma";
type _Output1901 = _Output1902 | undefined;
type _Output1904 =
	| _Output626
	| _Output632
	| _Output645
	| _Output660
	| _Output670
	| _Output677
	| _Output684
	| _Output704
	| _Output711
	| _Output720
	| _Output729
	| _Output739
	| _Output750
	| _Output775
	| _Output784
	| _Output791
	| _Output798
	| _Output806
	| _Output818
	| _Output823
	| _Output828
	| _Output833
	| _Output838
	| _Output843
	| _Output849
	| _Output854
	| _Output859
	| _Output864
	| _Output869
	| _Output874
	| _Output879
	| _Output886
	| _Output891
	| _Output896
	| _Output901
	| _Output915
	| _Output923
	| _Output941
	| _Output949
	| _Output957
	| _Output977
	| _Output988
	| _Output1003
	| _Output1015
	| _Output1023
	| _Output1033
	| _Output1050
	| _Output1060
	| _Output1065
	| _Output1075
	| _Output1083
	| _Output1096
	| _Output1101
	| _Output1106
	| _Output1111
	| _Output1116
	| _Output1121
	| _Output1126
	| _Output1131
	| _Output1136
	| _Output1141
	| _Output1146
	| _Output1151
	| _Output1156
	| _Output1162
	| _Output1167
	| _Output1172
	| _Output1177
	| _Output1183
	| _Output1191
	| _Output1198
	| _Output1205
	| _Output1210
	| _Output1217
	| _Output1222
	| _Output1232
	| _Output1237
	| _Output1242
	| _Output1247
	| _Output1258
	| _Output1268
	| _Output1273
	| _Output1280
	| _Output1285
	| _Output1294
	| _Output1299
	| _Output1304
	| _Output1309
	| _Output1314
	| _Output1319
	| _Output1324
	| _Output1329
	| _Output1334
	| _Output1339
	| _Output1344
	| _Output1349
	| _Output1354
	| _Output1359
	| _Output1364;
type _Output1903 = Array<_Output1904>;
type _Output1898 = {
	kind: _Output1880;
	aspect: _Output1899;
	relation: _Output1900;
	targetKind?: _Output1901;
	value: _Output1903;
};
type _Output1906 = "Retract";
type _Output1907 = "semanticRelations";
type _Output1908 = "synonym";
type _Output1909 = "reading";
type _Output1905 = {
	kind: _Output1906;
	aspect: _Output1907;
	relation: _Output1908;
	targetKind: _Output1909;
};
type _Output1911 = "Retract";
type _Output1912 = "semanticRelations";
type _Output1914 = "lemma";
type _Output1913 = _Output1914 | undefined;
type _Output1910 = {
	kind: _Output1911;
	aspect: _Output1912;
	relation: _Output1900;
	targetKind?: _Output1913;
};
type _Output1916 = "morphologicalTree";
type _Output1919 = "structure";
type _Output1924 = "morphemeReading";
type _Output1925 =
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
	| _Output1829
	| _Output1832
	| _Output1835
	| _Output1838
	| _Output1841
	| _Output1844
	| _Output1847
	| _Output1850
	| _Output1853
	| _Output1856
	| _Output1859;
type _Output1923 = { nodeKind: _Output1924; reading: _Output1925 };
type _Output1927 = "unitShadow";
type _Output1930 = string;
type _Output1929 = {
	language: _Output634;
	canonicalForm: _Output1930;
	family: _Output40;
	kind: _Output41;
};
type _Output1931 = {
	language: _Output647;
	canonicalForm: _Output1930;
	family: _Output46;
	kind: _Output47;
};
type _Output1932 = {
	language: _Output662;
	canonicalForm: _Output1930;
	family: _Output52;
	kind: _Output53;
};
type _Output1933 = {
	language: _Output672;
	canonicalForm: _Output1930;
	family: _Output58;
	kind: _Output59;
};
type _Output1934 = {
	language: _Output679;
	canonicalForm: _Output1930;
	family: _Output64;
	kind: _Output65;
};
type _Output1935 = {
	language: _Output686;
	canonicalForm: _Output1930;
	family: _Output70;
	kind: _Output71;
};
type _Output1936 = {
	language: _Output706;
	canonicalForm: _Output1930;
	family: _Output76;
	kind: _Output77;
};
type _Output1937 = {
	language: _Output713;
	canonicalForm: _Output1930;
	family: _Output82;
	kind: _Output83;
};
type _Output1938 = {
	language: _Output722;
	canonicalForm: _Output1930;
	family: _Output88;
	kind: _Output89;
};
type _Output1939 = {
	language: _Output731;
	canonicalForm: _Output1930;
	family: _Output94;
	kind: _Output95;
};
type _Output1940 = {
	language: _Output741;
	canonicalForm: _Output1930;
	family: _Output100;
	kind: _Output101;
};
type _Output1941 = {
	language: _Output752;
	canonicalForm: _Output1930;
	family: _Output106;
	kind: _Output107;
};
type _Output1942 = {
	language: _Output777;
	canonicalForm: _Output1930;
	family: _Output112;
	kind: _Output113;
};
type _Output1943 = {
	language: _Output786;
	canonicalForm: _Output1930;
	family: _Output118;
	kind: _Output119;
};
type _Output1944 = {
	language: _Output793;
	canonicalForm: _Output1930;
	family: _Output124;
	kind: _Output125;
};
type _Output1945 = {
	language: _Output800;
	canonicalForm: _Output1930;
	family: _Output130;
	kind: _Output131;
};
type _Output1946 = {
	language: _Output808;
	canonicalForm: _Output1930;
	family: _Output136;
	kind: _Output137;
};
type _Output1947 = {
	language: _Output871;
	canonicalForm: _Output1930;
	family: _Output202;
	kind: _Output203;
};
type _Output1948 = {
	language: _Output876;
	canonicalForm: _Output1930;
	family: _Output208;
	kind: _Output209;
};
type _Output1949 = {
	language: _Output881;
	canonicalForm: _Output1930;
	family: _Output214;
	kind: _Output215;
};
type _Output1950 = {
	language: _Output888;
	canonicalForm: _Output1930;
	family: _Output220;
	kind: _Output221;
};
type _Output1951 = {
	language: _Output893;
	canonicalForm: _Output1930;
	family: _Output226;
	kind: _Output227;
};
type _Output1952 = {
	language: _Output903;
	canonicalForm: _Output1930;
	family: _Output238;
	kind: _Output239;
};
type _Output1953 = {
	language: _Output917;
	canonicalForm: _Output1930;
	family: _Output244;
	kind: _Output245;
};
type _Output1954 = {
	language: _Output925;
	canonicalForm: _Output1930;
	family: _Output250;
	kind: _Output251;
};
type _Output1955 = {
	language: _Output943;
	canonicalForm: _Output1930;
	family: _Output256;
	kind: _Output257;
};
type _Output1956 = {
	language: _Output951;
	canonicalForm: _Output1930;
	family: _Output262;
	kind: _Output263;
};
type _Output1957 = {
	language: _Output959;
	canonicalForm: _Output1930;
	family: _Output268;
	kind: _Output269;
};
type _Output1958 = {
	language: _Output979;
	canonicalForm: _Output1930;
	family: _Output274;
	kind: _Output275;
};
type _Output1959 = {
	language: _Output990;
	canonicalForm: _Output1930;
	family: _Output280;
	kind: _Output281;
};
type _Output1960 = {
	language: _Output1005;
	canonicalForm: _Output1930;
	family: _Output286;
	kind: _Output287;
};
type _Output1961 = {
	language: _Output1017;
	canonicalForm: _Output1930;
	family: _Output292;
	kind: _Output293;
};
type _Output1962 = {
	language: _Output1025;
	canonicalForm: _Output1930;
	family: _Output298;
	kind: _Output299;
};
type _Output1963 = {
	language: _Output1035;
	canonicalForm: _Output1930;
	family: _Output304;
	kind: _Output305;
};
type _Output1964 = {
	language: _Output1052;
	canonicalForm: _Output1930;
	family: _Output310;
	kind: _Output311;
};
type _Output1965 = {
	language: _Output1062;
	canonicalForm: _Output1930;
	family: _Output316;
	kind: _Output317;
};
type _Output1966 = {
	language: _Output1067;
	canonicalForm: _Output1930;
	family: _Output322;
	kind: _Output323;
};
type _Output1967 = {
	language: _Output1077;
	canonicalForm: _Output1930;
	family: _Output328;
	kind: _Output329;
};
type _Output1968 = {
	language: _Output1085;
	canonicalForm: _Output1930;
	family: _Output334;
	kind: _Output335;
};
type _Output1969 = {
	language: _Output1153;
	canonicalForm: _Output1930;
	family: _Output406;
	kind: _Output407;
};
type _Output1970 = {
	language: _Output1158;
	canonicalForm: _Output1930;
	family: _Output412;
	kind: _Output413;
};
type _Output1971 = {
	language: _Output1164;
	canonicalForm: _Output1930;
	family: _Output418;
	kind: _Output419;
};
type _Output1972 = {
	language: _Output1169;
	canonicalForm: _Output1930;
	family: _Output424;
	kind: _Output425;
};
type _Output1973 = {
	language: _Output1179;
	canonicalForm: _Output1930;
	family: _Output436;
	kind: _Output437;
};
type _Output1974 = {
	language: _Output1185;
	canonicalForm: _Output1930;
	family: _Output442;
	kind: _Output443;
};
type _Output1975 = {
	language: _Output1193;
	canonicalForm: _Output1930;
	family: _Output448;
	kind: _Output449;
};
type _Output1976 = {
	language: _Output1200;
	canonicalForm: _Output1930;
	family: _Output454;
	kind: _Output455;
};
type _Output1977 = {
	language: _Output1207;
	canonicalForm: _Output1930;
	family: _Output460;
	kind: _Output461;
};
type _Output1978 = {
	language: _Output1212;
	canonicalForm: _Output1930;
	family: _Output466;
	kind: _Output467;
};
type _Output1979 = {
	language: _Output1219;
	canonicalForm: _Output1930;
	family: _Output472;
	kind: _Output473;
};
type _Output1980 = {
	language: _Output1224;
	canonicalForm: _Output1930;
	family: _Output478;
	kind: _Output479;
};
type _Output1981 = {
	language: _Output1234;
	canonicalForm: _Output1930;
	family: _Output484;
	kind: _Output485;
};
type _Output1982 = {
	language: _Output1239;
	canonicalForm: _Output1930;
	family: _Output490;
	kind: _Output491;
};
type _Output1983 = {
	language: _Output1244;
	canonicalForm: _Output1930;
	family: _Output496;
	kind: _Output497;
};
type _Output1984 = {
	language: _Output1249;
	canonicalForm: _Output1930;
	family: _Output502;
	kind: _Output503;
};
type _Output1985 = {
	language: _Output1260;
	canonicalForm: _Output1930;
	family: _Output508;
	kind: _Output509;
};
type _Output1986 = {
	language: _Output1270;
	canonicalForm: _Output1930;
	family: _Output514;
	kind: _Output515;
};
type _Output1987 = {
	language: _Output1275;
	canonicalForm: _Output1930;
	family: _Output520;
	kind: _Output521;
};
type _Output1988 = {
	language: _Output1282;
	canonicalForm: _Output1930;
	family: _Output526;
	kind: _Output527;
};
type _Output1989 = {
	language: _Output1287;
	canonicalForm: _Output1930;
	family: _Output532;
	kind: _Output533;
};
type _Output1990 = {
	language: _Output1351;
	canonicalForm: _Output1930;
	family: _Output604;
	kind: _Output605;
};
type _Output1991 = {
	language: _Output1356;
	canonicalForm: _Output1930;
	family: _Output610;
	kind: _Output611;
};
type _Output1992 = {
	language: _Output1361;
	canonicalForm: _Output1930;
	family: _Output616;
	kind: _Output617;
};
type _Output1993 = {
	language: _Output1366;
	canonicalForm: _Output1930;
	family: _Output622;
	kind: _Output623;
};
type _Output1928 =
	| _Output1929
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
	| _Output1942
	| _Output1943
	| _Output1944
	| _Output1945
	| _Output1946
	| _Output1947
	| _Output1948
	| _Output1949
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
	| _Output1993;
type _Output1926 = { nodeKind: _Output1927; unitShadow: _Output1928 };
type _Output1995 = "structure";
type _Output1996 = Array<_Output1921>;
type _Output1994 = { nodeKind: _Output1995; children: _Output1996 };
type _Output1922 = _Output1923 | _Output1926 | _Output1994;
type _Output1921 = _Output1922;
type _Output1920 = Array<_Output1921>;
type _Output1918 = { nodeKind: _Output1919; children: _Output1920 };
type _Output1917 = { root: _Output1918 };
type _Output1915 = {
	kind: _Output1880;
	aspect: _Output1916;
	value: _Output1917;
};
type _Output1998 = "lexicalBreakdown";
type _Output2001 = {
	language: _Output634;
	canonicalForm: _Output1930;
	family: _Output40;
	kind: _Output41;
};
type _Output2002 = {
	language: _Output647;
	canonicalForm: _Output1930;
	family: _Output46;
	kind: _Output47;
};
type _Output2003 = {
	language: _Output662;
	canonicalForm: _Output1930;
	family: _Output52;
	kind: _Output53;
};
type _Output2004 = {
	language: _Output672;
	canonicalForm: _Output1930;
	family: _Output58;
	kind: _Output59;
};
type _Output2005 = {
	language: _Output679;
	canonicalForm: _Output1930;
	family: _Output64;
	kind: _Output65;
};
type _Output2006 = {
	language: _Output686;
	canonicalForm: _Output1930;
	family: _Output70;
	kind: _Output71;
};
type _Output2007 = {
	language: _Output706;
	canonicalForm: _Output1930;
	family: _Output76;
	kind: _Output77;
};
type _Output2008 = {
	language: _Output713;
	canonicalForm: _Output1930;
	family: _Output82;
	kind: _Output83;
};
type _Output2009 = {
	language: _Output722;
	canonicalForm: _Output1930;
	family: _Output88;
	kind: _Output89;
};
type _Output2010 = {
	language: _Output731;
	canonicalForm: _Output1930;
	family: _Output94;
	kind: _Output95;
};
type _Output2011 = {
	language: _Output741;
	canonicalForm: _Output1930;
	family: _Output100;
	kind: _Output101;
};
type _Output2012 = {
	language: _Output752;
	canonicalForm: _Output1930;
	family: _Output106;
	kind: _Output107;
};
type _Output2013 = {
	language: _Output777;
	canonicalForm: _Output1930;
	family: _Output112;
	kind: _Output113;
};
type _Output2014 = {
	language: _Output786;
	canonicalForm: _Output1930;
	family: _Output118;
	kind: _Output119;
};
type _Output2015 = {
	language: _Output793;
	canonicalForm: _Output1930;
	family: _Output124;
	kind: _Output125;
};
type _Output2016 = {
	language: _Output800;
	canonicalForm: _Output1930;
	family: _Output130;
	kind: _Output131;
};
type _Output2017 = {
	language: _Output808;
	canonicalForm: _Output1930;
	family: _Output136;
	kind: _Output137;
};
type _Output2018 = {
	language: _Output903;
	canonicalForm: _Output1930;
	family: _Output238;
	kind: _Output239;
};
type _Output2019 = {
	language: _Output917;
	canonicalForm: _Output1930;
	family: _Output244;
	kind: _Output245;
};
type _Output2020 = {
	language: _Output925;
	canonicalForm: _Output1930;
	family: _Output250;
	kind: _Output251;
};
type _Output2021 = {
	language: _Output943;
	canonicalForm: _Output1930;
	family: _Output256;
	kind: _Output257;
};
type _Output2022 = {
	language: _Output951;
	canonicalForm: _Output1930;
	family: _Output262;
	kind: _Output263;
};
type _Output2023 = {
	language: _Output959;
	canonicalForm: _Output1930;
	family: _Output268;
	kind: _Output269;
};
type _Output2024 = {
	language: _Output979;
	canonicalForm: _Output1930;
	family: _Output274;
	kind: _Output275;
};
type _Output2025 = {
	language: _Output990;
	canonicalForm: _Output1930;
	family: _Output280;
	kind: _Output281;
};
type _Output2026 = {
	language: _Output1005;
	canonicalForm: _Output1930;
	family: _Output286;
	kind: _Output287;
};
type _Output2027 = {
	language: _Output1017;
	canonicalForm: _Output1930;
	family: _Output292;
	kind: _Output293;
};
type _Output2028 = {
	language: _Output1025;
	canonicalForm: _Output1930;
	family: _Output298;
	kind: _Output299;
};
type _Output2029 = {
	language: _Output1035;
	canonicalForm: _Output1930;
	family: _Output304;
	kind: _Output305;
};
type _Output2030 = {
	language: _Output1052;
	canonicalForm: _Output1930;
	family: _Output310;
	kind: _Output311;
};
type _Output2031 = {
	language: _Output1062;
	canonicalForm: _Output1930;
	family: _Output316;
	kind: _Output317;
};
type _Output2032 = {
	language: _Output1067;
	canonicalForm: _Output1930;
	family: _Output322;
	kind: _Output323;
};
type _Output2033 = {
	language: _Output1077;
	canonicalForm: _Output1930;
	family: _Output328;
	kind: _Output329;
};
type _Output2034 = {
	language: _Output1085;
	canonicalForm: _Output1930;
	family: _Output334;
	kind: _Output335;
};
type _Output2035 = {
	language: _Output1179;
	canonicalForm: _Output1930;
	family: _Output436;
	kind: _Output437;
};
type _Output2036 = {
	language: _Output1185;
	canonicalForm: _Output1930;
	family: _Output442;
	kind: _Output443;
};
type _Output2037 = {
	language: _Output1193;
	canonicalForm: _Output1930;
	family: _Output448;
	kind: _Output449;
};
type _Output2038 = {
	language: _Output1200;
	canonicalForm: _Output1930;
	family: _Output454;
	kind: _Output455;
};
type _Output2039 = {
	language: _Output1207;
	canonicalForm: _Output1930;
	family: _Output460;
	kind: _Output461;
};
type _Output2040 = {
	language: _Output1212;
	canonicalForm: _Output1930;
	family: _Output466;
	kind: _Output467;
};
type _Output2041 = {
	language: _Output1219;
	canonicalForm: _Output1930;
	family: _Output472;
	kind: _Output473;
};
type _Output2042 = {
	language: _Output1224;
	canonicalForm: _Output1930;
	family: _Output478;
	kind: _Output479;
};
type _Output2043 = {
	language: _Output1234;
	canonicalForm: _Output1930;
	family: _Output484;
	kind: _Output485;
};
type _Output2044 = {
	language: _Output1239;
	canonicalForm: _Output1930;
	family: _Output490;
	kind: _Output491;
};
type _Output2045 = {
	language: _Output1244;
	canonicalForm: _Output1930;
	family: _Output496;
	kind: _Output497;
};
type _Output2046 = {
	language: _Output1249;
	canonicalForm: _Output1930;
	family: _Output502;
	kind: _Output503;
};
type _Output2047 = {
	language: _Output1260;
	canonicalForm: _Output1930;
	family: _Output508;
	kind: _Output509;
};
type _Output2048 = {
	language: _Output1270;
	canonicalForm: _Output1930;
	family: _Output514;
	kind: _Output515;
};
type _Output2049 = {
	language: _Output1275;
	canonicalForm: _Output1930;
	family: _Output520;
	kind: _Output521;
};
type _Output2050 = {
	language: _Output1282;
	canonicalForm: _Output1930;
	family: _Output526;
	kind: _Output527;
};
type _Output2051 = {
	language: _Output1287;
	canonicalForm: _Output1930;
	family: _Output532;
	kind: _Output533;
};
type _Output2000 =
	| _Output2001
	| _Output2002
	| _Output2003
	| _Output2004
	| _Output2005
	| _Output2006
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
	| _Output2051;
type _Output1999 = [_Output2000, _Output2000, ...Array<_Output2000>];
type _Output1997 = {
	kind: _Output1880;
	aspect: _Output1998;
	value: _Output1999;
};
type _Output2053 = "Retract";
type _Output2054 = "morphologicalTree" | "lexicalBreakdown";
type _Output2052 = { kind: _Output2053; aspect: _Output2054 };
type _Output1878 =
	| _Output1879
	| _Output1883
	| _Output1885
	| _Output1889
	| _Output1892
	| _Output1898
	| _Output1905
	| _Output1910
	| _Output1915
	| _Output1997
	| _Output2052;
type _Output1877 = Array<_Output1878>;
type _Output2058 = {
	language: _Output628;
	canonicalForm: _Output1930;
	family: _Output32;
	kind: _Output33;
};
type _Output2059 = {
	language: _Output634;
	canonicalForm: _Output1930;
	family: _Output40;
	kind: _Output41;
};
type _Output2060 = {
	language: _Output647;
	canonicalForm: _Output1930;
	family: _Output46;
	kind: _Output47;
};
type _Output2061 = {
	language: _Output662;
	canonicalForm: _Output1930;
	family: _Output52;
	kind: _Output53;
};
type _Output2062 = {
	language: _Output672;
	canonicalForm: _Output1930;
	family: _Output58;
	kind: _Output59;
};
type _Output2063 = {
	language: _Output679;
	canonicalForm: _Output1930;
	family: _Output64;
	kind: _Output65;
};
type _Output2064 = {
	language: _Output686;
	canonicalForm: _Output1930;
	family: _Output70;
	kind: _Output71;
};
type _Output2065 = {
	language: _Output706;
	canonicalForm: _Output1930;
	family: _Output76;
	kind: _Output77;
};
type _Output2066 = {
	language: _Output713;
	canonicalForm: _Output1930;
	family: _Output82;
	kind: _Output83;
};
type _Output2067 = {
	language: _Output722;
	canonicalForm: _Output1930;
	family: _Output88;
	kind: _Output89;
};
type _Output2068 = {
	language: _Output731;
	canonicalForm: _Output1930;
	family: _Output94;
	kind: _Output95;
};
type _Output2069 = {
	language: _Output741;
	canonicalForm: _Output1930;
	family: _Output100;
	kind: _Output101;
};
type _Output2070 = {
	language: _Output752;
	canonicalForm: _Output1930;
	family: _Output106;
	kind: _Output107;
};
type _Output2071 = {
	language: _Output777;
	canonicalForm: _Output1930;
	family: _Output112;
	kind: _Output113;
};
type _Output2072 = {
	language: _Output786;
	canonicalForm: _Output1930;
	family: _Output118;
	kind: _Output119;
};
type _Output2073 = {
	language: _Output793;
	canonicalForm: _Output1930;
	family: _Output124;
	kind: _Output125;
};
type _Output2074 = {
	language: _Output800;
	canonicalForm: _Output1930;
	family: _Output130;
	kind: _Output131;
};
type _Output2075 = {
	language: _Output808;
	canonicalForm: _Output1930;
	family: _Output136;
	kind: _Output137;
};
type _Output2076 = {
	language: _Output820;
	canonicalForm: _Output1930;
	family: _Output142;
	kind: _Output143;
};
type _Output2077 = {
	language: _Output825;
	canonicalForm: _Output1930;
	family: _Output148;
	kind: _Output149;
};
type _Output2078 = {
	language: _Output830;
	canonicalForm: _Output1930;
	family: _Output154;
	kind: _Output155;
};
type _Output2079 = {
	language: _Output835;
	canonicalForm: _Output1930;
	family: _Output160;
	kind: _Output161;
};
type _Output2080 = {
	language: _Output840;
	canonicalForm: _Output1930;
	family: _Output166;
	kind: _Output167;
};
type _Output2081 = {
	language: _Output845;
	canonicalForm: _Output1930;
	family: _Output172;
	kind: _Output173;
};
type _Output2082 = {
	language: _Output851;
	canonicalForm: _Output1930;
	family: _Output178;
	kind: _Output179;
};
type _Output2083 = {
	language: _Output856;
	canonicalForm: _Output1930;
	family: _Output184;
	kind: _Output185;
};
type _Output2084 = {
	language: _Output861;
	canonicalForm: _Output1930;
	family: _Output190;
	kind: _Output191;
};
type _Output2085 = {
	language: _Output866;
	canonicalForm: _Output1930;
	family: _Output196;
	kind: _Output197;
};
type _Output2086 = {
	language: _Output871;
	canonicalForm: _Output1930;
	family: _Output202;
	kind: _Output203;
};
type _Output2087 = {
	language: _Output876;
	canonicalForm: _Output1930;
	family: _Output208;
	kind: _Output209;
};
type _Output2088 = {
	language: _Output881;
	canonicalForm: _Output1930;
	family: _Output214;
	kind: _Output215;
};
type _Output2089 = {
	language: _Output888;
	canonicalForm: _Output1930;
	family: _Output220;
	kind: _Output221;
};
type _Output2090 = {
	language: _Output893;
	canonicalForm: _Output1930;
	family: _Output226;
	kind: _Output227;
};
type _Output2091 = {
	language: _Output898;
	canonicalForm: _Output1930;
	family: _Output232;
	kind: _Output233;
};
type _Output2092 = {
	language: _Output903;
	canonicalForm: _Output1930;
	family: _Output238;
	kind: _Output239;
};
type _Output2093 = {
	language: _Output917;
	canonicalForm: _Output1930;
	family: _Output244;
	kind: _Output245;
};
type _Output2094 = {
	language: _Output925;
	canonicalForm: _Output1930;
	family: _Output250;
	kind: _Output251;
};
type _Output2095 = {
	language: _Output943;
	canonicalForm: _Output1930;
	family: _Output256;
	kind: _Output257;
};
type _Output2096 = {
	language: _Output951;
	canonicalForm: _Output1930;
	family: _Output262;
	kind: _Output263;
};
type _Output2097 = {
	language: _Output959;
	canonicalForm: _Output1930;
	family: _Output268;
	kind: _Output269;
};
type _Output2098 = {
	language: _Output979;
	canonicalForm: _Output1930;
	family: _Output274;
	kind: _Output275;
};
type _Output2099 = {
	language: _Output990;
	canonicalForm: _Output1930;
	family: _Output280;
	kind: _Output281;
};
type _Output2100 = {
	language: _Output1005;
	canonicalForm: _Output1930;
	family: _Output286;
	kind: _Output287;
};
type _Output2101 = {
	language: _Output1017;
	canonicalForm: _Output1930;
	family: _Output292;
	kind: _Output293;
};
type _Output2102 = {
	language: _Output1025;
	canonicalForm: _Output1930;
	family: _Output298;
	kind: _Output299;
};
type _Output2103 = {
	language: _Output1035;
	canonicalForm: _Output1930;
	family: _Output304;
	kind: _Output305;
};
type _Output2104 = {
	language: _Output1052;
	canonicalForm: _Output1930;
	family: _Output310;
	kind: _Output311;
};
type _Output2105 = {
	language: _Output1062;
	canonicalForm: _Output1930;
	family: _Output316;
	kind: _Output317;
};
type _Output2106 = {
	language: _Output1067;
	canonicalForm: _Output1930;
	family: _Output322;
	kind: _Output323;
};
type _Output2107 = {
	language: _Output1077;
	canonicalForm: _Output1930;
	family: _Output328;
	kind: _Output329;
};
type _Output2108 = {
	language: _Output1085;
	canonicalForm: _Output1930;
	family: _Output334;
	kind: _Output335;
};
type _Output2109 = {
	language: _Output1098;
	canonicalForm: _Output1930;
	family: _Output340;
	kind: _Output341;
};
type _Output2110 = {
	language: _Output1103;
	canonicalForm: _Output1930;
	family: _Output346;
	kind: _Output347;
};
type _Output2111 = {
	language: _Output1108;
	canonicalForm: _Output1930;
	family: _Output352;
	kind: _Output353;
};
type _Output2112 = {
	language: _Output1113;
	canonicalForm: _Output1930;
	family: _Output358;
	kind: _Output359;
};
type _Output2113 = {
	language: _Output1118;
	canonicalForm: _Output1930;
	family: _Output364;
	kind: _Output365;
};
type _Output2114 = {
	language: _Output1123;
	canonicalForm: _Output1930;
	family: _Output370;
	kind: _Output371;
};
type _Output2115 = {
	language: _Output1128;
	canonicalForm: _Output1930;
	family: _Output376;
	kind: _Output377;
};
type _Output2116 = {
	language: _Output1133;
	canonicalForm: _Output1930;
	family: _Output382;
	kind: _Output383;
};
type _Output2117 = {
	language: _Output1138;
	canonicalForm: _Output1930;
	family: _Output388;
	kind: _Output389;
};
type _Output2118 = {
	language: _Output1143;
	canonicalForm: _Output1930;
	family: _Output394;
	kind: _Output395;
};
type _Output2119 = {
	language: _Output1148;
	canonicalForm: _Output1930;
	family: _Output400;
	kind: _Output401;
};
type _Output2120 = {
	language: _Output1153;
	canonicalForm: _Output1930;
	family: _Output406;
	kind: _Output407;
};
type _Output2121 = {
	language: _Output1158;
	canonicalForm: _Output1930;
	family: _Output412;
	kind: _Output413;
};
type _Output2122 = {
	language: _Output1164;
	canonicalForm: _Output1930;
	family: _Output418;
	kind: _Output419;
};
type _Output2123 = {
	language: _Output1169;
	canonicalForm: _Output1930;
	family: _Output424;
	kind: _Output425;
};
type _Output2124 = {
	language: _Output1174;
	canonicalForm: _Output1930;
	family: _Output430;
	kind: _Output431;
};
type _Output2125 = {
	language: _Output1179;
	canonicalForm: _Output1930;
	family: _Output436;
	kind: _Output437;
};
type _Output2126 = {
	language: _Output1185;
	canonicalForm: _Output1930;
	family: _Output442;
	kind: _Output443;
};
type _Output2127 = {
	language: _Output1193;
	canonicalForm: _Output1930;
	family: _Output448;
	kind: _Output449;
};
type _Output2128 = {
	language: _Output1200;
	canonicalForm: _Output1930;
	family: _Output454;
	kind: _Output455;
};
type _Output2129 = {
	language: _Output1207;
	canonicalForm: _Output1930;
	family: _Output460;
	kind: _Output461;
};
type _Output2130 = {
	language: _Output1212;
	canonicalForm: _Output1930;
	family: _Output466;
	kind: _Output467;
};
type _Output2131 = {
	language: _Output1219;
	canonicalForm: _Output1930;
	family: _Output472;
	kind: _Output473;
};
type _Output2132 = {
	language: _Output1224;
	canonicalForm: _Output1930;
	family: _Output478;
	kind: _Output479;
};
type _Output2133 = {
	language: _Output1234;
	canonicalForm: _Output1930;
	family: _Output484;
	kind: _Output485;
};
type _Output2134 = {
	language: _Output1239;
	canonicalForm: _Output1930;
	family: _Output490;
	kind: _Output491;
};
type _Output2135 = {
	language: _Output1244;
	canonicalForm: _Output1930;
	family: _Output496;
	kind: _Output497;
};
type _Output2136 = {
	language: _Output1249;
	canonicalForm: _Output1930;
	family: _Output502;
	kind: _Output503;
};
type _Output2137 = {
	language: _Output1260;
	canonicalForm: _Output1930;
	family: _Output508;
	kind: _Output509;
};
type _Output2138 = {
	language: _Output1270;
	canonicalForm: _Output1930;
	family: _Output514;
	kind: _Output515;
};
type _Output2139 = {
	language: _Output1275;
	canonicalForm: _Output1930;
	family: _Output520;
	kind: _Output521;
};
type _Output2140 = {
	language: _Output1282;
	canonicalForm: _Output1930;
	family: _Output526;
	kind: _Output527;
};
type _Output2141 = {
	language: _Output1287;
	canonicalForm: _Output1930;
	family: _Output532;
	kind: _Output533;
};
type _Output2142 = {
	language: _Output1296;
	canonicalForm: _Output1930;
	family: _Output538;
	kind: _Output539;
};
type _Output2143 = {
	language: _Output1301;
	canonicalForm: _Output1930;
	family: _Output544;
	kind: _Output545;
};
type _Output2144 = {
	language: _Output1306;
	canonicalForm: _Output1930;
	family: _Output550;
	kind: _Output551;
};
type _Output2145 = {
	language: _Output1311;
	canonicalForm: _Output1930;
	family: _Output556;
	kind: _Output557;
};
type _Output2146 = {
	language: _Output1316;
	canonicalForm: _Output1930;
	family: _Output562;
	kind: _Output563;
};
type _Output2147 = {
	language: _Output1321;
	canonicalForm: _Output1930;
	family: _Output568;
	kind: _Output569;
};
type _Output2148 = {
	language: _Output1326;
	canonicalForm: _Output1930;
	family: _Output574;
	kind: _Output575;
};
type _Output2149 = {
	language: _Output1331;
	canonicalForm: _Output1930;
	family: _Output580;
	kind: _Output581;
};
type _Output2150 = {
	language: _Output1336;
	canonicalForm: _Output1930;
	family: _Output586;
	kind: _Output587;
};
type _Output2151 = {
	language: _Output1341;
	canonicalForm: _Output1930;
	family: _Output592;
	kind: _Output593;
};
type _Output2152 = {
	language: _Output1346;
	canonicalForm: _Output1930;
	family: _Output598;
	kind: _Output599;
};
type _Output2153 = {
	language: _Output1351;
	canonicalForm: _Output1930;
	family: _Output604;
	kind: _Output605;
};
type _Output2154 = {
	language: _Output1356;
	canonicalForm: _Output1930;
	family: _Output610;
	kind: _Output611;
};
type _Output2155 = {
	language: _Output1361;
	canonicalForm: _Output1930;
	family: _Output616;
	kind: _Output617;
};
type _Output2156 = {
	language: _Output1366;
	canonicalForm: _Output1930;
	family: _Output622;
	kind: _Output623;
};
type _Output2057 =
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
	| _Output2102
	| _Output2103
	| _Output2104
	| _Output2105
	| _Output2106
	| _Output2107
	| _Output2108
	| _Output2109
	| _Output2110
	| _Output2111
	| _Output2112
	| _Output2113
	| _Output2114
	| _Output2115
	| _Output2116
	| _Output2117
	| _Output2118
	| _Output2119
	| _Output2120
	| _Output2121
	| _Output2122
	| _Output2123
	| _Output2124
	| _Output2125
	| _Output2126
	| _Output2127
	| _Output2128
	| _Output2129
	| _Output2130
	| _Output2131
	| _Output2132
	| _Output2133
	| _Output2134
	| _Output2135
	| _Output2136
	| _Output2137
	| _Output2138
	| _Output2139
	| _Output2140
	| _Output2141
	| _Output2142
	| _Output2143
	| _Output2144
	| _Output2145
	| _Output2146
	| _Output2147
	| _Output2148
	| _Output2149
	| _Output2150
	| _Output2151
	| _Output2152
	| _Output2153
	| _Output2154
	| _Output2155
	| _Output2156;
type _Output2056 = { relation: _Output1900; target: _Output2057 };
type _Output2055 = Array<_Output2056>;
type _Output2159 =
	| "transcription"
	| "definition"
	| "translations"
	| "semanticRelations"
	| "morphologicalTree"
	| "lexicalBreakdown";
type _Output2161 = string;
type _Output2160 = _Output2161 | undefined;
type _Output2163 = string;
type _Output2162 = _Output2163 | undefined;
type _Output2164 =
	| "InvalidInput"
	| "ProviderFailure"
	| "InvalidModelOutput"
	| "Unresolved"
	| "NotImplemented"
	| "CatalogMiss";
type _Output2165 = string;
type _Output2158 = {
	aspect: _Output2159;
	leaf?: _Output2160;
	candidate?: _Output2162;
	code: _Output2164;
	message: _Output2165;
};
type _Output2157 = Array<_Output2158>;
type _Output1876 = {
	changes: _Output1877;
	pendingRelations: _Output2055;
	failures: _Output2157;
};
export type Segment = _Output0;
export type SegmentedSentence = _Output3;
export type SegmentationDecision = _Output7;
export type Encounter = _Output27;
export type GenerationInput = _Output624;
export type ComparisonInput = _Output1368;
export type KnowledgeInput = _Output1568;
export type SegmentInput = _Output1873;
export type KnowledgeProduction = _Output1876;
