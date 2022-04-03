var FALSE = { type: "bool", value: false };

function InputStream(input) {
  var pos = 0,
    line = 1,
    col = 0;
  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: croak,
  };
  function next() {
    var ch = input.charAt(pos++);
    if (ch == "\n") line++, (col = 0);
    else col++;
    return ch;
  }
  function peek() {
    return input.charAt(pos);
  }
  function eof() {
    return peek() == "";
  }
  function croak(msg) {
    throw new Error(msg + " (" + line + ":" + col + ")");
  }
}

function TokenStream(input) {
  var current = null;
  var keywords = " let if then else fun true false js ";
  return {
    next: next,
    peek: peek,
    eof: eof,
    croak: input.croak,
  };
  function is_keyword(x) {
    return keywords.indexOf(" " + x + " ") >= 0;
  }
  function is_digit(ch) {
    return /^-?[0-9]\d*(\.\d+)?$/i.test(ch);
  }
  function is_id_start(ch) {
    return /[a-z_]/i.test(ch);
  }
  function is_id(ch) {
    return is_id_start(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
  }
  function is_op_char(ch) {
    return "+-*/%=&|<>!".indexOf(ch) >= 0;
  }
  function is_punc(ch) {
    return ",;(){}[]".indexOf(ch) >= 0;
  }
  function is_whitespace(ch) {
    return " \t\n".indexOf(ch) >= 0;
  }
  function read_while(predicate) {
    var str = "";
    while (!input.eof() && predicate(input.peek())) str += input.next();
    return str;
  }
  function read_number() {
    var has_dot = false;
    var is_negative = false;

    var number = read_while(function (ch) {
      if (ch == ".") {
        if (has_dot) return false;
        has_dot = true;
        return true;
      }
      return is_digit(ch);
    });
    return { type: "num", value: parseFloat(number) };
  }
  function read_ident() {
    var id = read_while(is_id);
    return {
      type: is_keyword(id) ? "kw" : "var",
      value: id,
    };
  }
  function read_escaped(end) {
    var escaped = false,
      str = "";
    input.next();
    while (!input.eof()) {
      var ch = input.next();
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch == "\\") {
        escaped = true;
      } else if (ch == end) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  }
  function read_string() {
    return { type: "str", value: read_escaped('"') };
  }
  function skip_comment() {
    read_while(function (ch) {
      return ch != "\n";
    });
    input.next();
  }
  function read_next() {
    read_while(is_whitespace);
    if (input.eof()) return null;
    var ch = input.peek();
    if (ch == "#") {
      skip_comment();
      return read_next();
    }
    if (ch == '"') return read_string();
    if (is_digit(ch)) return read_number();
    if (is_id_start(ch)) return read_ident();
    if (is_punc(ch))
      return {
        type: "punc",
        value: input.next(),
      };
    if (is_op_char(ch))
      return {
        type: "op",
        value: read_while(is_op_char),
      };
    input.croak("Can't handle character: " + ch);
  }
  function peek() {
    return current || (current = read_next());
  }
  function next() {
    var tok = current;
    current = null;
    return tok || read_next();
  }
  function eof() {
    return peek() == null;
  }
}

function parse(input) {
  var PRECEDENCE = {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "==": 7,
    "!=": 7,
    "+": 10,
    "-": 10,
    "*": 20,
    "/": 20,
    "%": 20,
  };
  return parse_toplevel();
  function is_punc(ch) {
    var tok = input.peek();
    return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
  }
  function is_kw(kw) {
    var tok = input.peek();
    return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
  }
  function is_op(op) {
    var tok = input.peek();
    return tok && tok.type == "op" && (!op || tok.value == op) && tok;
  }
  function skip_punc(ch) {
    if (is_punc(ch)) input.next();
    else input.croak('Expecting punctuation: "' + ch + '"');
  }
  function skip_kw(kw) {
    if (is_kw(kw)) input.next();
    else input.croak('Expecting keyword: "' + kw + '"');
  }
  function skip_op(op) {
    if (is_op(op)) input.next();
    else input.croak('Expecting operator: "' + op + '"');
  }
  function unexpected() {
    input.croak("Unexpected token: " + JSON.stringify(input.peek()));
  }
  function maybe_binary(left, my_prec) {
    var tok = is_op();
    if (tok) {
      var his_prec = PRECEDENCE[tok.value];
      if (his_prec > my_prec) {
        input.next();
        return maybe_binary(
          {
            type: tok.value == "=" ? "assign" : "binary",
            operator: tok.value,
            left: left,
            right: maybe_binary(parse_atom(), his_prec),
          },
          my_prec
        );
      }
    }
    return left;
  }
  function delimited(start, stop, separator, parser) {
    var a = [],
      first = true;
    skip_punc(start);
    while (!input.eof()) {
      if (is_punc(stop)) break;
      if (first) first = false;
      else skip_punc(separator);
      if (is_punc(stop)) break;
      a.push(parser());
    }
    skip_punc(stop);
    return a;
  }
  function parse_call(func) {
    return {
      type: "call",
      func: func,
      args: delimited("(", ")", ",", parse_expression),
    };
  }
  function parse_varname() {
    var name = input.next();
    if (name.type != "var") input.croak("Expecting variable name");
    return name.value;
  }
  function parse_if() {
    skip_kw("if");
    var cond = parse_expression();
    if (!is_punc("{")) skip_kw("then");
    var then = parse_expression();
    var ret = {
      type: "if",
      cond: cond,
      then: then,
    };
    if (is_kw("else")) {
      input.next();
      ret.else = parse_expression();
    }
    return ret;
  }
  function parse_fun() {
    return {
      type: "fun",
      name: input.peek().type == "var" ? input.next().value : null,
      vars: delimited("(", ")", ",", parse_varname),
      body: parse_expression(),
    };
  }

  function parse_let() {
    skip_kw("let");
    if (input.peek().type == "var") {
      var name = input.next().value;
      var defs = delimited("(", ")", ",", parse_vardef);
      return {
        type: "call",
        func: {
          type: "fun",
          name: name,
          vars: defs.map(function (def) {
            return def.name;
          }),
          body: parse_expression(),
        },
        args: defs.map(function (def) {
          return def.def || FALSE;
        }),
      };
    }

    function parse_vardef() {
      var name = parse_varname(),
        def;
      if (is_op("=")) {
        input.next();
        def = parse_expression();
      }
      return { name: name, def: def };
    }
    return {
      type: "let",
      vars: delimited("(", ")", ",", parse_vardef),
      body: parse_expression(),
    };
  }
  function parse_bool() {
    return {
      type: "bool",
      value: input.next().value == "true",
    };
  }
  function parse_raw() {
    skip_kw("js");
    if (input.peek().type != "str") input.croak("js must be a plain string");
    return {
      type: "raw",
      code: input.next().value,
    };
  }
  function maybe_call(expr) {
    expr = expr();
    return is_punc("(") ? parse_call(expr) : expr;
  }
  function parse_atom() {
    return maybe_call(function () {
      if (is_punc("(")) {
        input.next();
        var exp = parse_expression();
        skip_punc(")");
        return exp;
      }
      if (is_kw("let")) return parse_let();
      if (is_punc("{")) return parse_prog();
      if (is_kw("if")) return parse_if();
      if (is_kw("true") || is_kw("false")) return parse_bool();
      if (is_kw("js")) return parse_raw();
      if (is_kw("fun")) {
        input.next();
        return parse_fun();
      }
      var tok = input.next();
      if (tok.type == "var" || tok.type == "num" || tok.type == "str")
        return tok;
      unexpected();
    });
  }
  function parse_toplevel() {
    var prog = [];
    while (!input.eof()) {
      prog.push(parse_expression());
      if (!input.eof()) skip_punc(";");
    }
    return { type: "prog", prog: prog };
  }
  function parse_prog() {
    var prog = delimited("{", "}", ";", parse_expression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: "prog", prog: prog };
  }
  function parse_expression() {
    return maybe_call(function () {
      return maybe_binary(parse_atom(), 0);
    });
  }
}

function Environment(parent) {
  this.vars = Object.create(parent ? parent.vars : null);
  this.parent = parent;
}
Environment.prototype = {
  extend: function () {
    return new Environment(this);
  },
  lookup: function (name) {
    var scope = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) return scope;
      scope = scope.parent;
    }
  },
  get: function (name) {
    if (name in this.vars) return this.vars[name];
    throw new Error("Undefined variable " + name);
  },
  set: function (name, value) {
    var scope = this.lookup(name);
    if (!scope && this.parent) throw new Error("Undefined variable " + name);
    return ((scope || this).vars[name] = value);
  },
  def: function (name, value) {
    return (this.vars[name] = value);
  },
};

function evaluate(exp, env, callback) {
  switch (exp.type) {
    case "num":
    case "str":
    case "bool":
      callback(exp.value);
      return;

    case "var":
      callback(env.get(exp.value));
      return;

    case "assign":
      if (exp.left.type != "var")
        throw new Error("Cannot assign to " + JSON.stringify(exp.left));
      evaluate(exp.right, env, function (right) {
        callback(env.set(exp.left.value, right));
      });
      return;

    case "binary":
      evaluate(exp.left, env, function (left) {
        evaluate(exp.right, env, function (right) {
          callback(apply_op(exp.operator, left, right));
        });
      });
      return;

    case "fun":
      callback(make_fun(exp, env));
      return;

    case "if":
      evaluate(exp.cond, env, function (cond) {
        if (cond !== false) evaluate(exp.then, env, callback);
        else if (exp.else) evaluate(exp.else, env, callback);
        else callback(false);
      });
      return;

    case "prog":
      (function loop(last, i) {
        if (i < exp.prog.length)
          evaluate(exp.prog[i], env, function (val) {
            loop(val, i + 1);
          });
        else {
          callback(last);
        }
      })(false, 0);
      return;

    case "let":
      (function loop(env, i) {
        if (i < exp.vars.length) {
          var v = exp.vars[i];
          if (v.def)
            evaluate(v.def, env, function (value) {
              var scope = env.extend();
              scope.def(v.name, value);
              loop(scope, i + 1);
            });
          else {
            var scope = env.extend();
            scope.def(v.name, false);
            loop(scope, i + 1);
          }
        } else {
          evaluate(exp.body, env, callback);
        }
      })(env, 0);
      return;

    case "call":
      evaluate(exp.func, env, function (func) {
        (function loop(args, i) {
          if (i < exp.args.length)
            evaluate(exp.args[i], env, function (arg) {
              args[i + 1] = arg;
              loop(args, i + 1);
            });
          else {
            func.apply(null, args);
          }
        })([callback], 0);
      });
      return;

    default:
      throw new Error("I don't know how to evaluate " + exp.type);
  }
}

function apply_op(op, a, b) {
  function num(x) {
    if (typeof x != "number") throw new Error("Expected number but got " + x);
    return x;
  }
  function div(x) {
    if (num(x) == 0) throw new Error("Divide by zero");
    return x;
  }
  switch (op) {
    case "+":
      return num(a) + num(b);
    case "-":
      return num(a) - num(b);
    case "*":
      return num(a) * num(b);
    case "/":
      return num(a) / div(b);
    case "%":
      return num(a) % div(b);
    case "&&":
      return a !== false && b;
    case "||":
      return a !== false ? a : b;
    case "<":
      return num(a) < num(b);
    case ">":
      return num(a) > num(b);
    case "<=":
      return num(a) <= num(b);
    case ">=":
      return num(a) >= num(b);
    case "==":
      return a === b;
    case "!=":
      return a !== b;
  }
  throw new Error("Can't apply operator " + op);
}

function make_fun(env, exp) {
  if (exp.name) {
    // these
    env = env.extend(); // lines
    env.def(exp.name, fun); // are
  } // new
  function fun() {
    var names = exp.vars;
    var scope = env.extend();
    for (var i = 0; i < names.length; ++i)
      scope.def(names[i], i + 1 < arguments.length ? arguments[i + 1] : false);
    evaluate(exp.body, scope, callback);
  }
  return fun;
}
// var code = "sum = fun(x, y) x + y; print(sum(2, 3));";
// var ast = parse(TokenStream(InputStream(code)));
// var globalEnv = new Environment();

// // define the "print" primitive function
// globalEnv.def("print", function (callback, txt) {
//   console.log(txt);
//   callback(false); // call the continuation with some return value
//   // if we don't call it, the program would stop
//   // abruptly after a print!
// });

// // run the evaluator
// evaluate(ast, globalEnv, function (result) {
//   // the result of the entire program is now in "result"
// });

function make_js(exp) {
  return js(exp);

  function js(exp) {
    switch (exp.type) {
      case "num":
      case "str":
      case "bool":
        return js_atom(exp);
      case "var":
        return js_var(exp);
      case "not":
        return js_not(exp);
      case "binary":
        return js_binary(exp);
      case "assign":
        return js_assign(exp);
      case "let":
        return js_let(exp);
      case "fun":
        return js_fun(exp);
      case "if":
        return js_if(exp);
      case "prog":
        return js_prog(exp);
      case "call":
        return js_call(exp);
      case "raw":
        return js_raw(exp);
      default:
        throw new Error("Dunno how to make_js for " + JSON.stringify(exp));
    }
  }
  function js_raw(exp) {
    return "(" + exp.code + ")";
  }
  function js_atom(exp) {
    return JSON.stringify(exp.value); // cheating ;-)
  }
  function make_var(name) {
    return name;
  }
  function js_var(exp) {
    return make_var(exp.value);
  }
  function js_not(exp) {
    if (is_bool(exp.body)) return "!" + js(exp.body);
    return "(" + js(exp.body) + " === false)";
  }
  function js_binary(exp) {
    var left = js(exp.left);
    var right = js(exp.right);
    switch (exp.operator) {
      case "&&":
        if (is_bool(exp.left)) break;
        return "((" + left + " !== false) && " + right + ")";
      case "||":
        if (is_bool(exp.left)) break;
        return "((β_TMP = " + left + ") !== false ? β_TMP : " + right + ")";
    }
    return "(" + left + exp.operator + right + ")";
  }
  function js_assign(exp) {
    return js_binary(exp);
  }
  function js_fun(exp) {
    var code = "(function ",
      CC;
    if (!exp.unguarded) {
      CC = exp.name || "β_CC";
      code += make_var(CC);
    }
    code += "(" + exp.vars.map(make_var).join(", ") + ") {";
    if (exp.locs && exp.locs.length > 0) {
      code += "var " + exp.locs.join(", ") + ";";
    }
    if (!exp.unguarded) {
      code += "GUARD(arguments, " + CC + "); ";

      // 12% faster in Firefox, no effect in Chrome:
      //code += "if (--STACKLEN < 0) throw new Continuation(" + CC + ", arguments);";

      // 2x faster in Firefox, but slower in Chrome:
      //code += "if (--STACKLEN < 0) throw new Continuation(" + CC + ", [ " + exp.vars.map(make_var).join(", ") + " ]);";
    }
    code += js(exp.body) + " })";
    return code;
  }
  function js_let(exp) {
    if (exp.vars.length == 0) return js(exp.body);
    var iife = {
      type: "call",
      func: {
        type: "fun",
        vars: [exp.vars[0].name],
        body: {
          type: "let",
          vars: exp.vars.slice(1),
          body: exp.body,
        },
      },
      args: [exp.vars[0].def || FALSE],
    };
    return "(" + js(iife) + ")";
  }
  function is_bool(exp) {
    switch (exp.type) {
      case "bool":
      case "not":
        return true;
      case "if":
        return is_bool(exp.then) || (exp.else && is_bool(exp.else));
      case "binary":
        if (",<,<=,==,!=,>=,>,".indexOf("," + exp.operator + ",") >= 0)
          return true;
        if (exp.operator == "&&" || exp.operator == "||")
          return is_bool(exp.left) && is_bool(exp.right);
        break;
    }
    return false;
  }
  function js_if(exp) {
    var cond = js(exp.cond);
    if (!is_bool(exp.cond)) cond += " !== false";
    return (
      "(" + cond + " ? " + js(exp.then) + " : " + js(exp.else || FALSE) + ")"
    );
  }
  function js_prog(exp) {
    return "(" + exp.prog.map(js).join(", ") + ")";
  }
  function js_call(exp) {
    return js(exp.func) + "(" + exp.args.map(js).join(", ") + ")";
  }
}

/* -----[ CPS transformer ]----- */

var GENSYM = 0;

function gensym(name) {
  if (!name) name = "";
  name = "β_" + name;
  return name + ++GENSYM;
}

function has_side_effects(exp) {
  switch (exp.type) {
    case "call":
    case "assign":
    case "raw":
      return true;

    case "num":
    case "str":
    case "bool":
    case "var":
    case "fun":
      return false;

    case "binary":
      return has_side_effects(exp.left) || has_side_effects(exp.right);

    case "if":
      return (
        has_side_effects(exp.cond) ||
        has_side_effects(exp.then) ||
        (exp.else && has_side_effects(exp.else))
      );

    case "let":
      for (var i = 0; i < exp.vars.length; ++i) {
        var v = exp.vars[i];
        if (v.def && has_side_effects(v.def)) return true;
      }
      return has_side_effects(exp.body);

    case "prog":
      for (var i = 0; i < exp.prog.length; ++i)
        if (has_side_effects(exp.prog[i])) return true;
      return false;
  }
  return true;
}

function to_cps(exp, k) {
  return cps(exp, k);

  function cps(exp, k) {
    switch (exp.type) {
      case "raw":
      case "num":
      case "str":
      case "bool":
        return cps_atom(exp, k);

      case "assign":
      case "binary":
        return cps_binary(exp, k);

      case "not":
        return cps_not(exp, k);
      case "var":
        return cps_var(exp, k);
      case "let":
        return cps_let(exp, k);
      case "fun":
        return cps_fun(exp, k);
      case "if":
        return cps_if(exp, k);
      case "prog":
        return cps_prog(exp, k);
      case "call":
        return cps_call(exp, k);
      default:
        throw new Error("Dunno how to CPS " + JSON.stringify(exp));
    }
  }
  function cps_atom(exp, k) {
    return k(exp);
  }
  function cps_not(exp, k) {
    return cps(exp.body, function (body) {
      return k({ type: "not", body: body });
    });
  }
  function cps_var(exp, k) {
    return k(exp);
  }
  function cps_binary(exp, k) {
    return cps(exp.left, function (left) {
      return cps(exp.right, function (right) {
        return k({
          type: exp.type,
          operator: exp.operator,
          left: left,
          right: right,
        });
      });
    });
  }
  function cps_let(exp, k) {
    if (exp.vars.length == 0) return cps(exp.body, k);
    return cps(
      {
        type: "call",
        args: [exp.vars[0].def || FALSE],
        func: {
          type: "fun",
          vars: [exp.vars[0].name],
          body: {
            type: "let",
            vars: exp.vars.slice(1),
            body: exp.body,
          },
        },
      },
      k
    );
  }
  function cps_fun(exp, k) {
    var cont = gensym("K");
    var body = cps(exp.body, function (body) {
      return { type: "call", func: { type: "var", value: cont }, args: [body] };
    });
    return k({
      type: "fun",
      name: exp.name,
      vars: [cont].concat(exp.vars),
      body: body,
    });
  }
  function cps_if(exp, k) {
    return cps(exp.cond, function (cond) {
      var cvar = gensym("I");
      var cast = make_continuation(k);
      k = function (ifresult) {
        return {
          type: "call",
          func: { type: "var", value: cvar },
          args: [ifresult],
        };
      };
      return {
        type: "call",
        func: {
          type: "fun",
          vars: [cvar],
          body: {
            type: "if",
            cond: cond,
            then: cps(exp.then, k),
            else: cps(exp.else || FALSE, k),
          },
        },
        args: [cast],
      };
    });
  }
  function cps_call(exp, k) {
    return cps(exp.func, function (func) {
      return (function loop(args, i) {
        if (i == exp.args.length)
          return {
            type: "call",
            func: func,
            args: args,
          };
        return cps(exp.args[i], function (value) {
          args[i + 1] = value;
          return loop(args, i + 1);
        });
      })([make_continuation(k)], 0);
    });
  }
  function make_continuation(k) {
    var cont = gensym("R");
    return {
      type: "fun",
      vars: [cont],
      body: k({ type: "var", value: cont }),
    };
  }
  function cps_prog(exp, k) {
    return (function loop(body) {
      if (body.length == 0) return k(FALSE);
      if (body.length == 1) return cps(body[0], k);
      if (!has_side_effects(body[0])) return loop(body.slice(1));
      return cps(body[0], function (first) {
        if (has_side_effects(first))
          return {
            type: "prog",
            prog: [first, loop(body.slice(1))],
          };
        return loop(body.slice(1));
      });
    })(exp.prog);
  }
}

/* -----[ environment ]----- */

function Environment(parent) {
  this.vars = Object.create(parent ? parent.vars : null);
  this.parent = parent;
}
Environment.prototype = {
  extend: function () {
    return new Environment(this);
  },
  lookup: function (name) {
    var scope = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) return scope;
      scope = scope.parent;
    }
  },
  get: function (name) {
    if (name in this.vars) return this.vars[name];
    throw new Error("Undefined variable " + name);
  },
  set: function (name, value) {
    var scope = this.lookup(name);
    if (!scope && this.parent) throw new Error("Undefined variable " + name);
    return ((scope || this).vars[name] = value);
  },
  def: function (name, value) {
    return (this.vars[name] = value);
  },
};

/* -----[ optimizer ]----- */

function optimize(exp) {
  var changes, defun;
  do {
    changes = 0;
    make_scope(exp);
    exp = opt(exp);
  } while (changes);
  make_scope(exp);
  return exp;

  function opt(exp) {
    if (changes) return exp;
    switch (exp.type) {
      case "raw":
      case "num":
      case "str":
      case "bool":
      case "var":
        return exp;
      case "not":
        return opt_not(exp);
      case "binary":
        return opt_binary(exp);
      case "assign":
        return opt_assign(exp);
      case "if":
        return opt_if(exp);
      case "prog":
        return opt_prog(exp);
      case "call":
        return opt_call(exp);
      case "fun":
        return opt_fun(exp);
    }
    throw new Error("I don't know how to optimize " + JSON.stringify(exp));
  }

  function changed() {
    ++changes;
  }

  function is_constant(exp) {
    return exp.type == "num" || exp.type == "str" || exp.type == "bool";
  }

  function num(exp) {
    if (exp.type != "num")
      throw new Error("Not a number: " + JSON.stringify(exp));
    return exp.value;
  }

  function div(exp) {
    if (num(exp) == 0)
      throw new Error("Division by zero: " + JSON.stringify(exp));
    return exp.value;
  }

  function opt_not(exp) {
    exp.body = opt(exp.body);
    return exp;
  }

  function opt_binary(exp) {
    exp.left = opt(exp.left);
    exp.right = opt(exp.right);
    if (is_constant(exp.left) && is_constant(exp.right)) {
      switch (exp.operator) {
        case "+":
          changed();
          return {
            type: "num",
            value: num(exp.left) + num(exp.right),
          };

        case "-":
          changed();
          return {
            type: "num",
            value: num(exp.left) - num(exp.right),
          };

        case "*":
          changed();
          return {
            type: "num",
            value: num(exp.left) * num(exp.right),
          };

        case "/":
          changed();
          return {
            type: "num",
            value: num(exp.left) / div(exp.right),
          };

        case "%":
          changed();
          return {
            type: "num",
            value: num(exp.left) % div(exp.right),
          };

        case "<":
          changed();
          return {
            type: "bool",
            value: num(exp.left) < num(exp.right),
          };

        case ">":
          changed();
          return {
            type: "bool",
            value: num(exp.left) > num(exp.right),
          };

        case "<=":
          changed();
          return {
            type: "bool",
            value: num(exp.left) <= num(exp.right),
          };

        case ">=":
          changed();
          return {
            type: "bool",
            value: num(exp.left) >= num(exp.right),
          };

        case "==":
          changed();
          if (exp.left.type != exp.right.type) return FALSE;
          return {
            type: "bool",
            value: exp.left.value === exp.right.value,
          };

        case "!=":
          changed();
          if (exp.left.type != exp.right.type) return TRUE;
          return {
            type: "bool",
            value: exp.left.value !== exp.right.value,
          };

        case "||":
          changed();
          if (exp.left.value !== false) return exp.left;
          return exp.right;

        case "&&":
          changed();
          if (exp.left.value !== false) return exp.right;
          return FALSE;
      }
    }
    return exp;
  }

  function opt_assign(exp) {
    if (exp.left.type == "var") {
      if (exp.right.type == "var" && exp.right.def.cont) {
        // the var on the right never changes.  we can safely
        // replace references to exp.left with references to
        // exp.right, saving one var and the assignment.
        changed();
        exp.left.def.refs.forEach(function (node) {
          node.value = exp.right.value;
        });
        return opt(exp.right); // could be needed for the result.
      }
      if (
        exp.left.def.refs.length == exp.left.def.assigned &&
        exp.left.env.parent
      ) {
        // if assigned as many times as referenced and not a
        // global, it means the var is never used, drop the
        // assignment but keep the right side for possible
        // side effects.
        changed();
        return opt(exp.right);
      }
    }
    exp.left = opt(exp.left);
    exp.right = opt(exp.right);
    return exp;
  }

  function opt_if(exp) {
    exp.cond = opt(exp.cond);
    exp.then = opt(exp.then);
    exp.else = opt(exp.else || FALSE);
    if (is_constant(exp.cond)) {
      changed();
      if (exp.cond.value !== false) return exp.then;
      return exp.else;
    }
    return exp;
  }

  function opt_prog(exp) {
    if (exp.prog.length == 0) {
      changed();
      return FALSE;
    }
    if (exp.prog.length == 1) {
      changed();
      return opt(exp.prog[0]);
    }
    if (!has_side_effects(exp.prog[0])) {
      changed();
      return opt({
        type: "prog",
        prog: exp.prog.slice(1),
      });
    }
    if (exp.prog.length == 2)
      return {
        type: "prog",
        prog: exp.prog.map(opt),
      };
    // normalize
    return opt({
      type: "prog",
      prog: [exp.prog[0], { type: "prog", prog: exp.prog.slice(1) }],
    });
  }

  function opt_call(exp) {
    // IIFE-s will be optimized away by defining variables in the
    // containing function.  However, we don't unwrap into the
    // global scope (that's why checking for env.parent.parent).
    var func = exp.func;
    if (func.type == "fun" && !func.name) {
      if (func.env.parent.parent) return opt_iife(exp);
      // however, if in global scope we can safely unguard it.
      func.unguarded = true;
    }
    return {
      type: "call",
      func: opt(func),
      args: exp.args.map(opt),
    };
  }

  function opt_fun(f) {
    // λ(x...) y(x...)  ==>  y
    TCO: if (
      f.body.type == "call" &&
      f.body.func.type == "var" &&
      f.body.func.def.assigned == 0 &&
      f.body.func.env.parent &&
      f.vars.indexOf(f.body.func.value) < 0 &&
      f.vars.length == f.body.args.length
    ) {
      for (var i = 0; i < f.vars.length; ++i) {
        var x = f.body.args[i];
        if (x.type != "var" || x.value != f.vars[i]) break TCO;
      }
      changed();
      return opt(f.body.func);
    }
    f.locs = f.locs.filter(function (name) {
      var def = f.env.get(name);
      return def.refs.length > 0;
    });
    var save = defun;
    defun = f;
    f.body = opt(f.body);
    if (f.body.type == "call") f.unguarded = true;
    defun = save;
    return f;
  }

  // (λ(foo, bar){...body...})(fooval, barval)
  //    ==>
  // foo = fooval, bar = barval, ...body...
  function opt_iife(exp) {
    changed();
    var func = exp.func;
    var argvalues = exp.args.map(opt);
    var body = opt(func.body);
    function rename(name) {
      var sym = name in defun.env.vars ? gensym(name + "$") : name;
      defun.locs.push(sym);
      defun.env.def(sym, true);
      func.env.get(name).refs.forEach(function (ref) {
        ref.value = sym;
      });
      return sym;
    }
    var prog = func.vars.map(function (name, i) {
      return {
        type: "assign",
        operator: "=",
        left: { type: "var", value: rename(name) },
        right: argvalues[i] || FALSE,
      };
    });
    func.locs.forEach(rename);
    prog.push(body);
    return opt({
      type: "prog",
      prog: prog,
    });
  }
}

function make_scope(exp) {
  var global = new Environment();
  exp.env = global;
  (function scope(exp, env) {
    switch (exp.type) {
      case "num":
      case "str":
      case "bool":
      case "raw":
        break;

      case "var":
        var s = env.lookup(exp.value);
        if (!s) {
          exp.env = global;
          global.def(exp.value, { refs: [], assigned: 0 });
        } else {
          exp.env = s;
        }
        var def = exp.env.get(exp.value);
        def.refs.push(exp);
        exp.def = def;
        break;

      case "not":
        scope(exp.body, env);
        break;

      case "assign":
        scope(exp.left, env);
        scope(exp.right, env);
        if (exp.left.type == "var") exp.left.def.assigned++;
        break;

      case "binary":
        scope(exp.left, env);
        scope(exp.right, env);
        break;

      case "if":
        scope(exp.cond, env);
        scope(exp.then, env);
        if (exp.else) scope(exp.else, env);
        break;

      case "prog":
        exp.prog.forEach(function (exp) {
          scope(exp, env);
        });
        break;

      case "call":
        scope(exp.func, env);
        exp.args.forEach(function (exp) {
          scope(exp, env);
        });
        break;

      case "fun":
        exp.env = env = env.extend();
        if (exp.name) env.def(exp.name, { refs: [], func: true, assigned: 0 });
        exp.vars.forEach(function (name, i) {
          env.def(name, { refs: [], farg: true, assigned: 0, cont: i == 0 });
        });
        if (!exp.locs) exp.locs = [];
        exp.locs.forEach(function (name) {
          env.def(name, { refs: [], floc: true, assigned: 0 });
        });
        scope(exp.body, env);
        break;

      default:
        throw new Error("Can't handle node " + JSON.stringify(exp));
    }
  })(exp, global);
  return exp.env;
}
/* -----[ stack guard ]----- */

var STACKLEN,
  IN_EXECUTE = false;
function GUARD(args, f) {
  if (--STACKLEN < 0) throw new Continuation(f, args);
}
function Continuation(f, args) {
  this.f = f;
  this.args = args;
}
function Execute(f, args) {
  if (IN_EXECUTE) return f.apply(null, args);
  IN_EXECUTE = true;
  while (true)
    try {
      STACKLEN = 200;
      f.apply(null, args);
      break;
    } catch (ex) {
      if (ex instanceof Continuation) {
        (f = ex.f), (args = ex.args);
      } else {
        IN_EXECUTE = false;
        throw ex;
      }
    }
  IN_EXECUTE = false;
}

window.print = function (k, txt) {
  k(window.term.echo(txt));
};
var runCode = function (code) {
  // var __EVAL = (s) => eval(`void (__EVAL = ${__EVAL}); ${s}`);

  var ast = parse(TokenStream(InputStream(code)));
  var cps = to_cps(ast, function (x) {
    return {
      type: "call",
      func: { type: "var", value: "β_TOPLEVEL" },
      args: [x],
    };
  });
  var print = function (k) {
    window.term.echo([].slice.call(arguments, 1).join("\n"));
    k(false);
  };
  //console.log(sys.inspect(cps, { depth: null }));

  var opt = optimize(cps);
  //var opt = cps; make_scope(opt);
  var jsc = make_js(opt);

  jsc = "var β_TMP;\n\n" + jsc;

  if (opt.env) {
    var vars = Object.keys(opt.env.vars);
    if (vars.length > 0) {
      jsc =
        "var " +
        vars
          .map(function (name) {
            return make_js({
              type: "var",
              value: name,
            });
          })
          .join(", ") +
        ";\n\n" +
        jsc;
    }
  }
  console.log("JSC: ", jsc);
  jsc = '"use strict";\n\n' + jsc;
  var func = new Function("β_TOPLEVEL, GUARD, print, Execute", jsc);
  console.time("runtime");
  Execute(func, [
    function (result) {
      console.timeEnd("runtime");
    },
    GUARD,
    print,
    Execute,
  ]);
};

var FALSE = { type: "bool", value: false };
var TRUE = { type: "bool", value: true };

$(function () {
  Split(["#editor", "#terminal"], {
    // gutterAlign: "end",
    gutterSize: 10,
    snapOffset: 0,
    sizes: [75, 25],
    // direction: "vertical",
    // cursor: "row-resize",
  });

  // the "print" primitive
  // window.print = function (txt, k) {
  //   k(window.term.echo(txt));
  // };
  const getUsername = async () => {
    const username = await gun.user().get("profile").get("name");
    console.log(username);
    return username;
  };

  // jQuery(function ($, undefined) {

  // });
  window.term = $("#terminal").terminal(
    function (command) {
      if (command !== "") {
        try {
          var result = runCode(command);
          if (result !== undefined) {
            if (typeof result === "function" || typeof result === "boolean") {
              return;
            }
            this.echo(new String(result));
          }
          console.log("res", result);
        } catch (e) {
          console.log(e);
          this.error(new String(e));
        }
      } else {
        this.echo("");
      }
    },

    {
      greetings: "fun Interpreter",
      // height: 200,
      // prompt: prompt,
    }
  );

  var editor = $("#editor").get(0);

  window.code_editor = CodeMirror.fromTextArea(editor, {
    mode: "fun-mode",
    lineNumbers: true,
    lineWrapping: false,
    autoRefresh: true,
    theme: "material-ocean",
    autoCloseBrackets: true,
    // styleActiveLine: true,
    // fixedGutter: true,
    // lint: true,
    // coverGutterNextToScrollbar: false,
    // gutters: ["CodeMirror-lint-markers"],
    // mode: "javascript",
  });
  // code_mirror.offsetLeft = 0;
  // code_mirror.clientLeft = 0;
  // // code_mirror.gutterLeft = 6;
  window.code_editor.setSize("100%", "100%");
  // code_mirror.refresh();

  // // some test code here
  // var code = "sum = fun(x, y) x + y; print(sum(2, 3));";

  // // get the AST
  // var ast = parse(TokenStream(InputStream(code)));

  // // get JS code
  // var code = make_js(ast);

  // // additionally, if you want to see the beautified JS code using UglifyJS
  // // (or possibly other tools such as acorn/esprima + escodegen):
  // console.log(code);

  // // execute it
  // eval(code); // prints 5
});
/* -----[ entry point for NodeJS ]----- */

// var globalEnv = new Environment();

// globalEnv.def("time", function (func) {
//   try {
//     console.time("time");
//     return func();
//   } finally {
//     console.timeEnd("time");
//   }
// });

// if (typeof process != "undefined")
//   (function () {
//     var util = require("util");
//     globalEnv.def("log", function (val) {
//       util.puts(val);
//     });
//     globalEnv.def("print", function (val) {
//       util.print(val);
//     });
//     var code = "";
//     process.stdin.setEncoding("utf8");
//     process.stdin.on("readable", function () {
//       var chunk = process.stdin.read();
//       if (chunk) code += chunk;
//     });
//     process.stdin.on("end", function () {
//       var ast = parse(TokenStream(InputStream(code)));
//       evaluate(ast, globalEnv);
//     });
//   })();
