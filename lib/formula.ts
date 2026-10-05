// A small, safe evaluator for allocation-method formulas (WIPO Connect's
// "Work Allocation Method" / "Right Owner Allocation Method"). No eval, no
// access to anything but the variables handed in.
//
//   numbers            1   0.5   2e3
//   strings            'CA'
//   variables          $Weight$   $Role$   $Work$.shares   $Ro$.affiliated
//   operators          + - * / % ^   ==  !=  <  <=  >  >=   and  or  not   - (unary)
//   functions          sqrt log ln log10 exp abs min max round floor ceil pow if(cond, a, b)
//
// A formula returns a number (the weight). Anything that is not a finite number,
// or is negative, is treated as 0 by the caller.

export type Value = number | string;
export type FormulaVars = {
  Weight: number;
  Role?: string;
  Work?: Record<string, Value>;
  Ro?: Record<string, Value>;
};

type Tok = { t: "num" | "str" | "var" | "id" | "op" | "(" | ")" | ","; v: string };

const MAX_LEN = 1000;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error(`Unexpected "${c}"`);
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (c === "'") {
      const j = src.indexOf("'", i + 1);
      if (j < 0) throw new Error("A quoted value is not closed");
      out.push({ t: "str", v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$(Weight|Role|Work|Ro)\$(?:\.([A-Za-z_][A-Za-z0-9_]*))?/.exec(src.slice(i));
      if (!m) throw new Error(`Unknown field near "${src.slice(i, i + 12)}"`);
      out.push({ t: "var", v: m[2] ? `${m[1]}.${m[2]}` : m[1] });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: "id", v: m[0].toLowerCase() });
      i += m[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/%^<>!".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      out.push({ t: c, v: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected "${c}"`);
  }
  return out;
}

type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "var"; name: string }
  | { k: "un"; op: string; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] };

const FUNCS: Record<string, { min: number; max: number }> = {
  sqrt: { min: 1, max: 1 },
  log: { min: 1, max: 1 },
  ln: { min: 1, max: 1 },
  log10: { min: 1, max: 1 },
  exp: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
  round: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  pow: { min: 2, max: 2 },
  min: { min: 1, max: 8 },
  max: { min: 1, max: 8 },
  if: { min: 3, max: 3 },
};

export function parseFormula(src: string): Node {
  if (src.length > MAX_LEN) throw new Error(`A formula can be at most ${MAX_LEN} characters`);
  const toks = tokenize(src);
  if (toks.length === 0) throw new Error("The formula is empty");
  let p = 0;
  const peek = () => toks[p];
  const eat = () => toks[p++];
  const isOp = (...ops: string[]) => peek()?.t === "op" && ops.includes(peek().v);
  const isId = (...ids: string[]) => peek()?.t === "id" && ids.includes(peek().v);

  const parseOr = (): Node => {
    let a = parseAnd();
    while (isOp("||") || isId("or")) {
      eat();
      a = { k: "bin", op: "||", a, b: parseAnd() };
    }
    return a;
  };
  const parseAnd = (): Node => {
    let a = parseCmp();
    while (isOp("&&") || isId("and")) {
      eat();
      a = { k: "bin", op: "&&", a, b: parseCmp() };
    }
    return a;
  };
  const parseCmp = (): Node => {
    let a = parseAdd();
    while (isOp("==", "!=", "<", "<=", ">", ">=")) {
      const op = eat().v;
      a = { k: "bin", op, a, b: parseAdd() };
    }
    return a;
  };
  const parseAdd = (): Node => {
    let a = parseMul();
    while (isOp("+", "-")) {
      const op = eat().v;
      a = { k: "bin", op, a, b: parseMul() };
    }
    return a;
  };
  const parseMul = (): Node => {
    let a = parseUnary();
    while (isOp("*", "/", "%")) {
      const op = eat().v;
      a = { k: "bin", op, a, b: parseUnary() };
    }
    return a;
  };
  const parseUnary = (): Node => {
    if (isOp("-")) {
      eat();
      return { k: "un", op: "-", a: parseUnary() };
    }
    if (isOp("!") || isId("not")) {
      eat();
      return { k: "un", op: "!", a: parseUnary() };
    }
    return parsePow();
  };
  const parsePow = (): Node => {
    const a = parsePrimary();
    if (isOp("^")) {
      eat();
      return { k: "bin", op: "^", a, b: parseUnary() }; // right-associative
    }
    return a;
  };
  const parsePrimary = (): Node => {
    const t = eat();
    if (!t) throw new Error("The formula ends too soon");
    if (t.t === "num") return { k: "num", v: Number(t.v) };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "var") return { k: "var", name: t.v };
    if (t.t === "(") {
      const e = parseOr();
      if (eat()?.t !== ")") throw new Error('Missing a closing ")"');
      return e;
    }
    if (t.t === "id") {
      if (t.v === "true") return { k: "num", v: 1 };
      if (t.v === "false") return { k: "num", v: 0 };
      const f = FUNCS[t.v];
      if (!f) throw new Error(`Unknown function "${t.v}"`);
      if (eat()?.t !== "(") throw new Error(`${t.v} needs brackets, e.g. ${t.v}(...)`);
      const args: Node[] = [];
      if (peek()?.t !== ")") {
        args.push(parseOr());
        while (peek()?.t === ",") {
          eat();
          args.push(parseOr());
        }
      }
      if (eat()?.t !== ")") throw new Error('Missing a closing ")"');
      if (args.length < f.min || args.length > f.max) throw new Error(`${t.v} takes ${f.min === f.max ? f.min : `${f.min} to ${f.max}`} value${f.max === 1 ? "" : "s"}`);
      return { k: "call", fn: t.v, args };
    }
    throw new Error(`Unexpected "${t.v}"`);
  };

  const tree = parseOr();
  if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}"`);
  return tree;
}

const num = (v: Value): number => (typeof v === "number" ? v : Number.isFinite(Number(v)) && v !== "" ? Number(v) : NaN);

function run(n: Node, vars: FormulaVars): Value {
  switch (n.k) {
    case "num":
    case "str":
      return n.v;
    case "var": {
      if (n.name === "Weight") return vars.Weight;
      if (n.name === "Role") return vars.Role ?? "";
      const [group, field] = n.name.split(".");
      const bag = group === "Work" ? vars.Work : vars.Ro;
      const v = bag?.[field];
      if (v === undefined) throw new Error(`There is no field "${n.name}"`);
      return v;
    }
    case "un": {
      const a = run(n.a, vars);
      return n.op === "-" ? -num(a) : num(a) ? 0 : 1;
    }
    case "bin": {
      const a = run(n.a, vars);
      if (n.op === "&&") return num(a) && num(run(n.b, vars)) ? 1 : 0;
      if (n.op === "||") return num(a) || num(run(n.b, vars)) ? 1 : 0;
      const b = run(n.b, vars);
      switch (n.op) {
        case "+": return num(a) + num(b);
        case "-": return num(a) - num(b);
        case "*": return num(a) * num(b);
        case "/": return num(b) === 0 ? NaN : num(a) / num(b);
        case "%": return num(b) === 0 ? NaN : num(a) % num(b);
        case "^": return Math.pow(num(a), num(b));
        case "==": return String(a).toLowerCase() === String(b).toLowerCase() ? 1 : 0;
        case "!=": return String(a).toLowerCase() !== String(b).toLowerCase() ? 1 : 0;
        case "<": return num(a) < num(b) ? 1 : 0;
        case "<=": return num(a) <= num(b) ? 1 : 0;
        case ">": return num(a) > num(b) ? 1 : 0;
        case ">=": return num(a) >= num(b) ? 1 : 0;
      }
      throw new Error("Unsupported operator");
    }
    case "call": {
      if (n.fn === "if") return num(run(n.args[0], vars)) ? run(n.args[1], vars) : run(n.args[2], vars);
      const a = n.args.map((x) => num(run(x, vars)));
      switch (n.fn) {
        case "sqrt": return Math.sqrt(a[0]);
        case "log":
        case "ln": return Math.log(a[0]);
        case "log10": return Math.log10(a[0]);
        case "exp": return Math.exp(a[0]);
        case "abs": return Math.abs(a[0]);
        case "round": return Math.round(a[0]);
        case "floor": return Math.floor(a[0]);
        case "ceil": return Math.ceil(a[0]);
        case "pow": return Math.pow(a[0], a[1]);
        case "min": return Math.min(...a);
        case "max": return Math.max(...a);
      }
      throw new Error(`Unknown function "${n.fn}"`);
    }
  }
}

// Compile once, evaluate many times. The result is always a finite number >= 0
// (anything else becomes 0, so one bad row cannot poison an allocation).
export function compileFormula(src: string): (vars: FormulaVars) => number {
  const tree = parseFormula(src);
  return (vars) => {
    try {
      const v = num(run(tree, vars));
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch {
      return 0;
    }
  };
}

// For saving a method: parse it and try it on sample values so a typo is caught
// when the method is saved, not half-way through a distribution.
export const SAMPLE_VARS: FormulaVars = {
  Weight: 1,
  Role: "CA",
  Work: { title: "SAMPLE", genre: "GOSPEL", iswc: "", status: "VALID", shares: 2, domestic: 1, year: 2024 },
  Ro: { affiliated: 1, kind: "Person", share: 50 },
};

export function checkFormula(src: string): { ok: true; sample: number } | { ok: false; error: string } {
  try {
    const tree = parseFormula(src);
    const v = num(run(tree, SAMPLE_VARS));
    return { ok: true, sample: Number.isFinite(v) ? Math.round(v * 10000) / 10000 : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The formula could not be read" };
  }
}
