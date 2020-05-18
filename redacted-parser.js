/* Grammar of [REDACTED]:

The parser skips over anything it does not understand.

The parser does not use Parsimmon because Parsimmon supports only strings and
buffers as input, not arrays of tokens. */

import lex, {
  IDENTIFIER,
  VERB,
  CONSTANT,
  PERIOD,
  ADDENDUM_START,
  THE,
  SQUARE,
  OF,
  ITEM_NUMBER,
  OBJECT_CLASS,
  CON_PROCS_START,
  IF,
  COMMA,
  DESCRIPTION_START,
  HR,
  INCREMENT,
  GOTO,
  ADD,
  AND,
  TILDE2,
  LPAR,
  RPAR,
  COMMENT_START,
  COMMENT_END,
  match,
  withNoSkip,
  eof,
} from "./redacted-lexer.js";
import do_ from "./util/maybe.js";

class Label {
  constructor(label) {
    this.label = label;
  }
}

class Assignment {
  constructor(id, constant) {
    this.id = id;
    this.constant = constant;
  }
}

class Variable {
  constructor(id) {
    this.id = id;
  }
}

class Square {
  constructor(id) {
    this.id = id;
  }
}

class Equality {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
}

class ExpressionStatement {
  constructor(expr) {
    this.expr = expr;
  }
}

class SCP {
  constructor(number, cls, parts) {
    this.number = number;
    this.cls = cls;
    this.parts = parts;
  }
}

class Block {
  constructor(stmts) {
    this.stmts = stmts;
  }
}

class InvalidStatement {}

class If {
  constructor(eql, blk) {
    this.eql = eql;
    this.blk = blk;
  }
}

class Increment {
  constructor(target) {
    this.target = target;
  }
}

class GoTo {
  constructor(label) {
    this.label = label;
  }
}

class Add {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
}

class Constant {
  constructor(constant) {
    this.constant = constant;
  }
}

class FunctionCall {
  constructor(name, args) {
    this.name = name;
    this.args = args;
  }
}

class Comment {}

function or(...results) {
  let nearest = null;
  for (let result of results) {
    let deprioritize = false;
    if (result === null) {
      continue;
    }
    if (result.deprioritize !== undefined) {
      result = result.deprioritize;
      deprioritize = true;
    }
    // if (deprioritize) {
    //   if (nearest === null)
    // }
    if (nearest === null || result[2] < nearest[2]) {
      nearest = result;
    } else if (
      result[2] === nearest[2] &&
      result[1] < nearest[1] &&
      !deprioritize
    ) {
      nearest = result;
    }
  }
  return nearest;
}

function or_max(...results) {
  let nearest = null;
  for (let result of results) {
    if (result === null) {
      continue;
    }
    if (nearest === null || result[2] < nearest[2]) {
      nearest = result;
    } else if (result[2] === nearest[2] && result[1] > nearest[1]) {
      nearest = result;
    }
  }
  return nearest;
}

function is(stream, index) {
  return do_(function* () {
    let result = yield match(VERB, stream, index);
    let verb = result[0],
      start = result[2];
    if (verb.verb === "is") {
      return [verb, index, start];
    }
    return null;
  });
}

function assignment(stream, index) {
  return do_(function* () {
    let id, constant, start;
    // console.debug('stream slice', stream.slice(index));
    // console.debug('in assignment before identifier');
    [id, index, start] = yield match(IDENTIFIER, stream, index);
    index = (yield match(VERB, stream, index))[1];
    [constant, index] = yield match(CONSTANT, stream, index);
    index = (yield match(PERIOD, stream, index))[1];
    // console.debug('after parsing assignment');
    return [new Assignment(id, constant), index, start];
  });
}

function reverse_assignment(stream, index) {
  return do_(function* () {
    let id, expr, start;
    [expr, index, start] = yield expression(stream, index);
    index = (yield match(VERB, stream, index))[1];
    [id, index] = yield match(IDENTIFIER, stream, index);
    index = (yield match(PERIOD, stream, index))[1];
    return [new Assignment(id, expr), index, start];
  });
}

function label(stream, index) {
  return do_(function* () {
    let label, start;
    console.debug("stream slice in label", stream.slice(index));
    [label, index, start] = yield or(
      match(ADDENDUM_START, stream, index),
      match(DESCRIPTION_START, stream, index)
    );
    return [new Label(label), index, start];
  });
}

function square(stream, index) {
  return do_(function* () {
    let result, start;
    result = match(THE, stream, index);
    if (result !== null) {
      start = result[2];
      index = result[1];
    }
    // console.debug('in square parser before SQUARE, slice', stream.slice(index));
    result = yield match(SQUARE, stream, index);
    if (start === undefined) {
      start = result[2];
      index = result[1];
    }
    index = (result = match(OF, stream, index)) !== null ? result[1] : index;
    let id;
    [id, index] = yield match(IDENTIFIER, stream, index);
    return [new Square(id), index, start];
  });
}

function add(stream, index) {
  return do_(function* () {
    let i = index,
      start,
      left,
      right;
    [left, i, start] = yield match(IDENTIFIER, stream, i);
    i = (yield match(ADD, stream, i))[1];
    [right, i] = yield expression(stream, i);
    return [new Add(left, right), i, start];
  });
}

function constant(stream, index) {
  return do_(function* () {
    let i = index,
      start,
      constant;
    [constant, i, start] = yield match(CONSTANT, stream, i);
    return [new Constant(constant), i, start];
  });
}

function function_call(stream, index) {
  return do_(function* () {
    let i = index,
      start,
      name,
      args = [];
    console.debug("in function call parser");
    [i, start] = (yield match(LPAR, stream, i)).slice(1);
    console.debug("in function call parser after lpar");
    [name, i] = yield match(IDENTIFIER, stream, i);
    console.debug("in function call parser after identifier");
    [args[0], i] = yield expression(stream, i);
    console.debug("in function call parser after first arg");
    while (true) {
      let value;
      [value, i] = yield or(match(AND, stream, i), match(RPAR, stream, i));
      if (value instanceof RPAR) {
        console.debug("in function call parser after rpar");
        break;
      }
      [value, i] = yield expression(stream, i);
      console.debug("in function call parser after an argument");
      args.push(value);
    }
    console.debug("leaving function call parser");
    return [new FunctionCall(name, args), i, start];
  });
}

function expression(stream, index) {
  let result;
  withNoSkip(
    PERIOD,
    () =>
      (result = or(
        square(stream, index),
        add(stream, index),
        constant(stream, index),
        function_call(stream, index),
        {
          deprioritize: do_(function* () {
            let id, start;
            [id, index, start] = yield match(IDENTIFIER, stream, index);
            return [new Variable(id), index, start];
          }),
        }
      ))
  );
  return result;
}

function equality(stream, index) {
  return do_(function* () {
    let left, right, start;
    // console.debug('in equality parser before left expression, slice', stream.slice(index));
    [left, index, start] = yield expression(stream, index);
    let temp;
    // console.debug('in equality parser before is, slice', stream.slice(index));
    index = (yield is(stream, index))[1];
    // console.debug('in equality parser before right expression, slice', stream.slice(index));
    [right, index] = yield expression(stream, index);
    return [new Equality(left, right), index, start];
  });
}

function increment(stream, index) {
  return do_(function* () {
    let i = index,
      start,
      target;
    console.debug(
      "in increment parser before identifier, slice",
      stream.slice(i)
    );
    [target, i, start] = yield match(IDENTIFIER, stream, i);
    i = (yield match(INCREMENT, stream, i))[1];
    i = (yield match(PERIOD, stream, i))[1];
    return [new Increment(target), i, start];
  });
}

function goto(stream, index) {
  return do_(function* () {
    let i = index,
      start,
      lbl;
    [i, start] = (yield match(GOTO, stream, i)).slice(1);
    [lbl, i] = yield label(stream, i);
    i = (yield match(PERIOD, stream, i))[1];
    return [new GoTo(lbl), i, start];
  });
}

function statement(stream, index) {
  return do_(function* () {
    return or(
      if_statement(stream, index),
      assignment(stream, index),
      increment(stream, index),
      goto(stream, index),
      do_(function* () {
        let expr,
          i = index,
          start;
        [expr, i, start] = yield expression(stream, index);
        i = (yield match(PERIOD, stream, i))[1];
        return [new ExpressionStatement(expr), i, start];
      }),
      do_(function* () {
        let [i, start] = (yield match(COMMENT_START, stream, index)).slice(1);
        i = (yield match(COMMENT_END, stream, i))[1];
        return [new Comment(), i, start];
      }),
      do_(function* () {
        const [i, start] = (yield match(PERIOD, stream, index)).slice(1);
        return [new InvalidStatement(), i, start];
      })
    );
  });
}

function block(stream, index) {
  return do_(function* () {
    const stmts = [];
    let start;
    console.debug("in block parser, slice", stream.slice(index));
    [stmts[0], index, start] = yield statement(stream, index);
    let result;
    const block_end = (s, i) =>
      or(match(HR, stream, index), eof(stream, index));
    while (true) {
      result = yield or(statement(stream, index), block_end(stream, index));
      if (result[0] instanceof HR || result[0] === null) {
        break;
      }
      stmts.push(result[0]);
      index = result[1];
    }
    return [new Block(stmts), index, start];
  });
}

function if_statement(stream, index) {
  return do_(function* () {
    let start;
    console.debug("in if parser, slice", stream.slice(index));
    [index, start] = (yield match(IF, stream, index)).slice(1);
    let eql, blk, temp;
    console.debug("in if parser before equality, slice", stream.slice(index));
    temp = yield equality(stream, index);
    [eql, index] = temp;
    console.debug("in if parser before comma, slice", stream.slice(index));
    index = (yield match(COMMA, stream, index))[1];
    [blk, index] = yield block(stream, index);
    return [new If(eql, blk), index, start];
  });
}

function scp(stream, index) {
  return do_(function* () {
    let number, cls, start, result;
    console.debug({ match });
    [number, index, start] = yield match(ITEM_NUMBER, stream, index);
    [cls, index] = yield match(OBJECT_CLASS, stream, index);
    index = (yield match(CON_PROCS_START, stream, index))[1];
    const parts = [];
    while (true) {
      const result = or(block(stream, index), label(stream, index));
      if (result === null) {
        break;
      }
      parts.push(result[0]);
      index = result[1];
    }
    return [new SCP(number, cls, parts), index, start];
  });
}

/* TEST */
fetch("examples/square-root-digit-sums.redacted")
  .then((response) => response.text())
  .then((text) => {
    textarea.defaultValue = text;
    parse_and_display_ast(text);
  });

const textarea = document.getElementById("program-display");

function parse_and_display_ast(text) {
  const tree = scp(lex(String(text)), 0);
  const pretty = JSON.stringify(tree, undefined, 4);
  document.getElementById("tree-display").textContent = pretty;
}

document
  .querySelector("[name=parse-button]")
  .addEventListener("click", function () {
    const text = textarea.value;
    parse_and_display_ast(text);
  });
