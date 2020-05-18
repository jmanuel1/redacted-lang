/* Lexical structure of [REDACTED]:

Item #: SCP-<integer> | ITEM_NUMBER(<integer>)
Object Class: (Safe | Euclid | Keter | Thaumiel | Neutralized)  | OBJECT_CLASS(<class>)
Special Containment Procedures:                                 | CON_PROCS_START
Description:                                                    | DESCRIPTION_START
[[footnote]]<text>[[/footnote]]                                 | FOOTNOTE_START ... FOOTNOTE_END
Addendum <integer>[-<letter>]                                   | ADDENDUM_START(<integer>, <letter>)
*/

const { regex, string, seqMap, alt, end, optWhitespace, newline } = Parsimmon;

export class IGNORE {}
export class IDENTIFIER {
  constructor(id) {
    this.id = id;
  }
}
export class ADDENDUM_START {
  constructor(integer, letter) {
    this.integer = integer;
    this.letter = letter;
  }
}
export class ITEM_NUMBER {
  constructor(integer) {
    this.integer = integer;
  }
}
export class OBJECT_CLASS {
  constructor(cls) {
    this.cls = cls;
  }
}
export class CON_PROCS_START {}
export class DESCRIPTION_START {}
export class FOOTNOTE_START {}
export class FOOTNOTE_END {}
export class VERB {
  constructor(verb) {
    this.verb = verb;
  }
}
export class PERIOD {}
export class CONSTANT {
  constructor(constant) {
    this.constant = constant;
  }
}
export class THE {}
export class SQUARE {}
export class OF {}
export class IF {}
export class COMMA {}
export class HR {}
export class INCREMENT {}
export class GOTO {}
export class ADD {}
export class AND {}
export class LPAR {}
export class RPAR {}
export class TILDE2 {}
export class COMMENT_START {}
export class COMMENT_END {}

export const item_number = regex(/Item #: SCP-([0-9]+)/, 1).map(
  (integer) => new ITEM_NUMBER(Number(integer))
);
export const object_class = regex(
  /Object Class: (Safe|Euclid|Keter|Thaumiel|Neutralized)/,
  1
).map((cls) => new OBJECT_CLASS(cls));
export const con_procs_start = string("Special Containment Procedures:").map(
  () => new CON_PROCS_START()
);
export const description_start = string("Description:").map(
  () => new DESCRIPTION_START()
);
export const footnote_start = string("[[footnote]]").map(
  () => new FOOTNOTE_START()
);
export const footnote_end = string("[[/footnote]]").map(
  () => new FOOTNOTE_END()
);

export const addendum_start = seqMap(
  regex(/Addendum ([0-9]+)/, 1),
  regex(/-(\w)/, 1).fallback(null),
  (integer, letter) => new ADDENDUM_START(Number(integer), letter)
);

export const identifier = alt(
  regex(/SCP-[0-9]+-[0-9]+/),
  regex(/the (\w+) of/, 1)
).map((id) => new IDENTIFIER(id));

const ignore_char = regex(/./m).map(() => new IGNORE());

const verb = regex(/does|has|is/).map((verb) => new VERB(verb));

const period = string(".").map(() => new PERIOD());

const constant = alt(
  string("not cause paradoxes").map(() => 0),
  string("unique features").map(() => 1),
  string("single instance of").map(() => 1),
  regex(/GoI-(\d+)/, 1).map((int) => Number(int))
).map((constant) => new CONSTANT(constant));

const the = string("the").map(() => new THE());

const square = string("square containment chamber").map(() => new SQUARE());

const of_ = string("of").map(() => new OF());

const if_ = string("If").map(() => new IF());

const comma = string(",").map(() => new COMMA());

const hr = string("-----").map(() => new HR());

const increment = string("will generate a new instance").map(
  () => new INCREMENT()
);

const goto = string("See").map(() => new GOTO());

const add = regex(/in addition to/).map(() => new ADD());

const and = string("and").map(() => new AND());

const lpar = string("(").map(() => new LPAR());

const rpar = string(")").map(() => new RPAR());

const tilde2 = string("~~").map(() => new TILDE2());

const comment_start = string("[!--").map(() => new COMMENT_START());

const comment_end = string("--]").map(() => new COMMENT_END());

export function match(token_type, stream, index) {
  // let's just skip tokens we don't understand
  while (index < stream.length && !(stream[index] instanceof token_type)) {
    if (
      match._no_skip !== undefined &&
      stream[index] instanceof match._no_skip
    ) {
      return null;
    }
    index++;
  }
  if (index < stream.length) {
    return [stream[index], index + 1, index];
  }
  return null;
}

export function eof(stream, index) {
  if (index >= stream.length) {
    return [null, index, stream.length];
  }
  return null;
}

export function withNoSkip(token_type, f) {
  const no_skip = match._no_skip;
  match._no_skip = token_type;
  f();
  match._no_skip = no_skip;
}

export default function lex(string) {
  const tokens = alt(
    item_number,
    object_class,
    con_procs_start,
    description_start,
    footnote_start,
    footnote_end,
    addendum_start,
    identifier,
    verb,
    period,
    constant,
    the,
    square,
    of_,
    if_,
    comma,
    hr,
    increment,
    goto,
    add,
    and,
    lpar,
    rpar,
    tilde2,
    comment_start,
    comment_end,
    ignore_char
  ).many();
  return tokens
    .parse(string)
    .value.filter((token) => !(token instanceof IGNORE));
}

/* TEST */
fetch("examples/square-root-digit-sums.redacted")
  .then((response) => response.text())
  .then((text) => console.log({ text }, lex(String(text))));
