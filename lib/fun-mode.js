/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */

CodeMirror.defineSimpleMode("fun-mode", {
  // The start state contains the rules that are initially used
  start: [
    // The regex matches the token, the token property contains the type
    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string" },
    // You can match multiple tokens at once. Note that the captured
    // groups must span the whole string in this case

    // Rules are matched in the order in which they appear, so there is
    // no ambiguity between this one and the one above
    {
      regex: /(?:fun|if|then|else|let|print)\b/,
      token: "keyword",
    },
    { regex: /true|false/, token: "atom" },
    {
      regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
      token: "number",
    },
    { regex: /\/(?:[^\\]|\\.)*?\//, token: "variable-3" },
    // A next property will cause the mode to move to a different state
    { regex: /#.*/, token: "comment" },
    { regex: /[-+\/*=<>!]+/, token: "operator" },
    // indent and dedent properties guide autoindentation
    { regex: /[\{\[\(]/, indent: true },
    { regex: /[\}\]\)]/, dedent: true },
    {
      regex: /[\u1200-\u135f\u1369-\u137ca-zA-Z0-9_]/,
      token: "variable",
    },
    // You can embed other modes with the mode property. This rule
    // causes all code between << and >> to be highlighted with the XML
    // mode.
  ],
  // The multi-line comment state.

  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ["comment"],
    lineComment: "#",
  },
});
