/* ============================================================================
   tsdark.js — ตัวไล่สี TypeScript โทน VS Code Dark+ สำหรับ Code Dojo
   ใช้ร่วมกันระหว่าง dojo-site/index.html (โจทย์ 21 ด่าน) กับ room.html (ห้องโค้ด)

   ทำไมต้องเขียนเอง ไม่ใช้ Prism/highlight.js:
     สิ่งที่ user ขอคือ "อ่านวงเล็บออก" = bracket pair colorization ซึ่งเป็น
     ฟีเจอร์เฉพาะของ VS Code — ไลบรารีไล่สีทั่วไปไม่มีให้

   กฎเหล็กของไฟล์นี้ (มีตัวตรวจบังคับที่ tools/check-tsdark.js):
     ถอดแท็กออกจากผลลัพธ์ของ highlight() แล้วต้องได้ข้อความต้นฉบับกลับมา
     "เป๊ะทุกตัวอักษร" — ตัวไล่สีห้ามทำตัวหนังสือหาย/เกิน/สลับที่เด็ดขาด
     เพราะเด็กพิมพ์โค้ดส่งจริงบนนี้ และ room.html วัดตำแหน่งเคอร์เซอร์ของ
     เพื่อนร่วมห้องจาก text node ของชั้นไล่สีตัวนี้โดยตรง

   สิ่งที่จงใจไม่ทำ:
     ไม่มีเส้นหยักแดง ไม่มี linter ไม่มีการระบายวงเล็บที่ไม่มีคู่เป็นสีแดง
     user สั่งเอง — "มันมองออกง่ายเกิน" คือจงใจให้เด็กหาบั๊กด้วยตาตัวเอง

   ที่มาของสีทุกบรรทัดในไฟล์นี้ (2026-09-06):
     อ่านจากไฟล์จริงในเครื่องนี้ ไม่ได้เดาจากความจำ
       ธีม   resources/app/extensions/theme-defaults/themes/dark_plus.json + dark_vs.json
       ไวยากรณ์ resources/app/extensions/typescript-basics/syntaxes/TypeScript.tmLanguage.json
     สรุปกฎที่ใช้:
       keyword.control.*            -> #C586C0 (ชมพู)  = if/return/import/from/as/...
       storage.type|storage.modifier-> #569CD6 (ฟ้า)   = const/let/class/async/=>/...
       keyword.operator.expression.*-> #569CD6         = typeof/instanceof/in/of/delete
       constant.language / variable.language -> #569CD6 = true/false/null/this/super
       support.type / entity.name.type -> #4EC9B0 (เขียวมิ้นต์)
       entity.name.function         -> #DCDCAA (เหลือง)
       variable / meta.object-literal.key -> #9CDCFE (ฟ้าอ่อน)
       variable.other.constant / enummember -> #4FC1FF (ฟ้าสว่าง) <- ตัวแปร const
       constant.character.escape    -> #D7BA7D (ทอง)   = \n \t ในสตริง
       punctuation.definition.template-expression -> #569CD6 = ${ }
   ========================================================================== */
(function (global) {
  "use strict";

  /* ---------------------------------------------------------------------
     คำสงวน แยกตามสีที่ VS Code ให้จริง
     --------------------------------------------------------------------- */

  /* ชมพู #C586C0 — keyword.control.*
     หมายเหตุ: import/export/from/as/satisfies อยู่กลุ่มนี้ ไม่ใช่กลุ่มฟ้า
     (export มีเงื่อนไข ดู exportIsControl) */
  var KW_CTRL = word2map(
    "if else for while do return break continue switch case default " +
    "try catch finally throw await yield with package " +
    "import from as satisfies"
  );

  /* ฟ้า #569CD6 — storage.type / storage.modifier / keyword.operator.expression /
     constant.language / variable.language */
  var KW_DECL = word2map(
    "const let var function class interface enum namespace module declare using " +
    "abstract override public private protected readonly static async " +
    "get set accessor constructor extends implements " +
    "new delete in of instanceof typeof keyof infer is " +
    "true false null undefined NaN Infinity " +
    "this super arguments globalThis debugger " +
    "export type"
  );

  /* เขียวมิ้นต์ #4EC9B0 กลุ่มที่ 1 — ชนิดข้อมูลพื้นฐาน (support.type.primitive)
     กลุ่มนี้ชนะ "ตามด้วยวงเล็บ" เพราะไม่มีใครเรียก number() เป็นฟังก์ชัน */
  var TYPE_PRIM = word2map(
    "string number bigint boolean symbol any void never unknown object"
  );

  /* เขียวมิ้นต์ #4EC9B0 กลุ่มที่ 2 — คลาส/เนมสเปซมาตรฐาน
     กลุ่มนี้ "แพ้" การถูกเรียกเป็นฟังก์ชัน เพราะ VS Code ให้ Number("5") เป็นสีฟังก์ชัน
     แต่ Math.floor() ตัว Math ยังเขียว (มันไม่ได้ถูกเรียกเอง) */
  var TYPE_LIB = word2map(
    "Array Object String Number Boolean Math JSON Date Map Set WeakMap WeakSet " +
    "Promise RegExp Error TypeError RangeError SyntaxError EvalError " +
    "ReferenceError URIError Function Symbol BigInt Proxy Reflect Intl " +
    "ArrayBuffer SharedArrayBuffer DataView Int8Array Uint8Array Uint8ClampedArray " +
    "Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array " +
    "BigInt64Array BigUint64Array Generator Iterator AsyncIterator Awaited " +
    "Partial Required Readonly Record Pick Omit Exclude Extract NonNullable " +
    "Parameters ReturnType InstanceType ThisType Uppercase Lowercase " +
    "Capitalize Uncapitalize"
  );

  /* สีพื้น #D4D4D4 — keyword.operator.* (VS Code ให้สีเดียวกับตัวหนังสือทั่วไป) */
  var KW_PLAIN = word2map("asserts");

  /* คำที่ "อ่อน" พอจะถูกใช้เป็นชื่อฟังก์ชันได้จริง
     ถ้าตามด้วย ( ให้ถือว่าเป็นการเรียกฟังก์ชัน ไม่ใช่คำสงวน
     (VS Code ก็ทำแบบนี้ เพราะกฎของมันผูกกับบริบท ไม่ใช่ตัวคำ) */
  var SOFT_KW = word2map(
    "get set accessor type is as from of in satisfies asserts " +
    "declare namespace module using keyof infer assert"
  );

  /* คำที่ตามหลัง export แล้วทำให้ export กลายเป็น "ตัวปรับ" (ฟ้า) แทน keyword.control (ชมพู)
     ลอกจาก negative lookahead ของกฎ meta.export.ts ในไวยากรณ์จริง */
  var EXPORT_BLUE_NEXT = word2map(
    "abstract async await break case catch class const continue declare do else " +
    "enum export finally function for goto if import interface let module " +
    "namespace switch return throw try type using var while"
  );

  function word2map(s) {
    var m = Object.create(null), a = s.split(" ");
    for (var i = 0; i < a.length; i++) if (a[i]) m[a[i]] = true;
    return m;
  }

  /* escape เฉพาะ 3 ตัวที่จำเป็นต่อ HTML — น้อยที่สุดเท่าที่ปลอดภัย
     เพื่อให้การถอดกลับ (ตอนตรวจ round-trip) ตรงไปตรงมา */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function span(cls, text) {
    if (text === "") return "";
    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  /* ตัวระบุของ JS/TS ใช้ตัวอักษรยูนิโคดได้ ไม่ใช่แค่ A-Z
     เว็บนี้เป็นภาษาไทย และโค้ดตัวอย่างของห้องเองก็ใช้ชื่อไทย (const ชื่อ: string)
     ถ้าจำกัดแค่ ASCII ตัวแปรไทยจะไม่ได้สีเลยสักตัว
     สร้างด้วย new RegExp เพื่อไม่ให้ \p{...} กลายเป็น syntax error ตอน parse
     บนเบราว์เซอร์เก่า (ถ้าพังจริงก็ตกไปใช้ช่วงกว้างแทน ไม่ทำทั้งไฟล์ล่ม) */
  var ID_START, ID_PART;
  try {
    ID_START = new RegExp("[$_\\p{ID_Start}]", "u");
    ID_PART = new RegExp("[$_\\u200C\\u200D\\p{ID_Continue}]", "u");
  } catch (e) {
    ID_START = new RegExp("[A-Za-z_$\u00AA-\u02FF\u0370-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]");
    ID_PART = new RegExp("[A-Za-z0-9_$\u00AA-\u02FF\u0300-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]");
  }
  var DIGIT = /[0-9]/;
  var WS = /[ \t\r\n]/;

  /* วงเล็บ: VS Code นับความลึกรวมกันทุกชนิด ( [ { แล้ววนสี 3 สี */
  function bcls(d) {
    return "tsd-b" + (((d % 3) + 3) % 3);
  }

  /* ---------------------------------------------------------------------
     รอบสำรวจก่อนไล่สี — เก็บชื่อที่ประกาศไว้ในไฟล์
       consts : ชื่อที่ประกาศด้วย const และสมาชิกของ enum  -> #4FC1FF
       types  : ชื่อ class / interface / type / enum / namespace / type parameter -> #4EC9B0
     VS Code ได้ข้อมูลนี้จาก semantic highlighting ของ TypeScript จริง
     เราไม่มีคอมไพเลอร์ให้ถาม เลยกวาดเอาจากตัวประกาศตรง ๆ
     ผิดได้ในเคสบังชื่อ (shadowing) ซึ่งทั้งสองสีเป็นโทนฟ้าเหมือนกัน จึงไม่สะดุดตา
     --------------------------------------------------------------------- */
  function collectSymbols(src) {
    var consts = Object.create(null), types = Object.create(null);
    var enums = Object.create(null), enumMembers = Object.create(null);
    var toks = lexLite(src);

    for (var t = 0; t < toks.length; t++) {
      var tk = toks[t];
      if (tk.p) continue;
      var pv = toks[t - 1];
      if (pv && pv.p && pv.w === ".") continue;      // a.const ไม่ใช่การประกาศ

      var w = tk.w;
      if (w === "const") {
        // const enum X {}  -> เป็นการประกาศชนิด ไม่ใช่ตัวแปร
        if (toks[t + 1] && !toks[t + 1].p && toks[t + 1].w === "enum") continue;
        readBindingNames(toks, t + 1, consts);
      } else if (w === "class" || w === "interface" || w === "enum" ||
                 w === "namespace" || w === "module") {
        var nx = toks[t + 1];
        if (nx && !nx.p) {
          types[nx.w] = true;
          readTypeParams(toks, t + 2, types);
          if (w === "enum") {
            enums[nx.w] = true;
            readEnumMembers(toks, t + 2, consts);
            readEnumMembers(toks, t + 2, enumMembers);
          }
        }
      } else if (w === "type") {
        var nt = toks[t + 1];
        var af = toks[t + 2];
        if (nt && !nt.p && af && af.p && (af.w === "=" || af.w === "<")) {
          types[nt.w] = true;
          readTypeParams(toks, t + 2, types);
          readAliasRefs(toks, t + 2, types);
        }
      } else if (w === "function") {
        var nf = toks[t + 1];
        if (nf && !nf.p) readTypeParams(toks, t + 2, types);
      } else if (w === "extends" || w === "implements") {
        // class A extends B  ·  interface A extends B, C   ตัวที่ 2 เป็นต้นไปก็เป็นชนิด
        readNameList(toks, t + 1, types);
      }
    }
    return { consts: consts, types: types, enums: enums, enumMembers: enumMembers };
  }

  /* ตัวแยกคำแบบย่อ — สนใจแค่ "คำ" กับ "เครื่องหมายตัวเดียว"
     ข้ามคอมเมนต์/สตริง/เทมเพลตทิ้ง เพราะข้างในไม่ใช่การประกาศ */
  function lexLite(src) {
    var n = src.length, i = 0, out = [];
    while (i < n) {
      var c = src[i];
      if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") {
        i += 2;
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
        i = Math.min(n, i + 2); continue;
      }
      if (c === "'" || c === '"') {
        var q = c; i++;
        while (i < n) {
          if (src[i] === "\\") { i += 2; continue; }
          if (src[i] === q) { i++; break; }
          if (src[i] === "\n") break;
          i++;
        }
        continue;
      }
      if (c === "`") { i = skipTemplateLite(src, i); continue; }
      if (WS.test(c)) { i++; continue; }
      if (DIGIT.test(c)) { i = scanNumber(src, i); continue; }
      if (c === "#" && ID_START.test(src[i + 1] || "")) {
        var s0 = i; i += 2;
        while (i < n && ID_PART.test(src[i])) i++;
        out.push({ w: src.slice(s0, i), p: false }); continue;
      }
      if (ID_START.test(c)) {
        var s1 = i; i++;
        while (i < n && ID_PART.test(src[i])) i++;
        out.push({ w: src.slice(s1, i), p: false }); continue;
      }
      out.push({ w: c, p: true }); i++;
    }
    return out;
  }

  function skipTemplateLite(src, i) {
    var n = src.length, j = i + 1;
    while (j < n) {
      if (src[j] === "\\") { j += 2; continue; }
      if (src[j] === "`") return j + 1;
      if (src[j] === "$" && src[j + 1] === "{") {
        var d = 1; j += 2;
        while (j < n && d > 0) {
          if (src[j] === "\\") { j += 2; continue; }
          if (src[j] === "{") d++;
          else if (src[j] === "}") d--;
          else if (src[j] === "`") { j = skipTemplateLite(src, j); continue; }
          j++;
        }
        continue;
      }
      j++;
    }
    return n;
  }

  /* อ่านชื่อที่ถูกผูกค่าหลัง const — รองรับ
       const a = 1, b = 2
       const { x, y: z, w = 3, ...rest } = obj
       const [a, , b] = arr
       for (const item of list)  */
  function readBindingNames(toks, from, out) {
    // inInit = อยู่ในค่าตั้งต้น (หลัง =) หรือในคำอธิบายชนิด (หลัง : ที่ระดับบนสุด)
    // ช่วงนั้นห้ามเก็บชื่อ ไม่งั้นพารามิเตอร์ของ arrow function จะหลุดเข้ามาเป็น const
    // ang = ความลึกของวงเล็บแหลมในคำอธิบายชนิด  const m: Map<string, Array<number>>
    // ต้องนับแยกจาก d ไม่งั้นคอมมาข้างใน <> จะถูกอ่านว่าเป็นตัวแปรตัวถัดไป
    var d = 0, ang = 0, expect = true, inInit = false, initD = 0, guard = 0;
    for (var k = from; k < toks.length && guard < 400; k++, guard++) {
      var t = toks[k];
      if (t.p) {
        if (t.w === "{" || t.w === "[" || t.w === "(") { d++; if (!inInit) expect = true; continue; }
        if (t.w === "}" || t.w === "]" || t.w === ")") {
          d--;
          if (inInit && d < initD) inInit = false;
          if (d < 0) return;
          continue;
        }
        if (t.w === ";") return;
        if (t.w === ",") {
          if (inInit && d <= initD && ang === 0) inInit = false;
          if (!inInit) expect = true;
          continue;
        }
        if (t.w === "=") { inInit = true; initD = d; expect = false; continue; }
        if (t.w === ":") {
          // ในวงเล็บปีกกา = เปลี่ยนชื่อ { key: binding } · ที่ระดับบนสุด = คำอธิบายชนิด
          if (d > 0) { if (!inInit) expect = true; }
          else { inInit = true; initD = 0; expect = false; }
          continue;
        }
        if (t.w === "<") { ang++; continue; }
        if (t.w === ">") { if (ang > 0) ang--; continue; }
        if (t.w === ".") continue;   // จุดของ spread  const [h, ...t] = arr  ต้องไม่ล้าง expect
        expect = false;
        continue;
      }
      if (inInit || !expect) continue;
      // { key: binding } — ตัวก่อน : คือชื่อ property ไม่ใช่ตัวแปร (เฉพาะในรูปแบบแยกส่วน)
      var nx = toks[k + 1];
      if (nx && nx.p && nx.w === ":" && d > 0) { expect = true; continue; }
      if (t.w === "of" || t.w === "in") return;
      out[t.w] = true;
      expect = false;
    }
  }

  function readEnumMembers(toks, from, out) {
    var k = from, guard = 0;
    while (k < toks.length && toks[k].p && toks[k].w !== "{") k++;
    if (!toks[k] || toks[k].w !== "{") return;
    k++;
    var d = 1, expect = true;
    for (; k < toks.length && guard < 600; k++, guard++) {
      var t = toks[k];
      if (t.p) {
        if (t.w === "{" || t.w === "[" || t.w === "(") d++;
        else if (t.w === "}" || t.w === "]" || t.w === ")") { d--; if (d === 0) return; }
        else if (t.w === "," && d === 1) expect = true;
        else if (t.w === "=") expect = false;
        continue;
      }
      if (expect && d === 1) { out[t.w] = true; expect = false; }
    }
  }

  /* รายชื่อคั่นคอมมาหลัง extends / implements  (ข้าม <...> ที่ติดมากับแต่ละชื่อ) */
  function readNameList(toks, from, out) {
    var k = from, guard = 0;
    while (k < toks.length && guard < 80) {
      var t = toks[k];
      if (t.p) return;
      out[t.w] = true;
      k++;
      if (toks[k] && toks[k].p && toks[k].w === "<") {   // B<T>
        var d = 0;
        while (k < toks.length && guard < 80) {
          if (toks[k].p && toks[k].w === "<") d++;
          else if (toks[k].p && toks[k].w === ">") { d--; if (d === 0) { k++; break; } }
          k++; guard++;
        }
      }
      if (!toks[k] || !toks[k].p || toks[k].w !== ",") return;
      k++; guard++;
    }
  }

  /* ชื่อชนิดที่ถูกอ้างถึงทางขวาของ type alias:  type T = A & B | C
     เก็บเฉพาะตัวที่ตามหลัง = | & ทันที เพื่อไม่ให้ไปโดนชื่อคีย์ใน { a: number } */
  function readAliasRefs(toks, from, out) {
    var expect = false, guard = 0;
    for (var k = from; k < toks.length && guard < 200; k++, guard++) {
      var t = toks[k];
      if (t.p) {
        if (t.w === ";") return;
        expect = (t.w === "=" || t.w === "|" || t.w === "&");
        continue;
      }
      if (expect) { out[t.w] = true; expect = false; }
    }
  }

  /* <T>, <K, V extends object> ที่ตามหลังชื่อ class/interface/type/function */
  function readTypeParams(toks, from, out) {
    var t0 = toks[from];
    if (!t0 || !t0.p || t0.w !== "<") return;
    var d = 0, expect = true, guard = 0;
    for (var k = from; k < toks.length && guard < 200; k++, guard++) {
      var t = toks[k];
      if (t.p) {
        if (t.w === "<") { d++; if (d === 1) expect = true; continue; }
        if (t.w === ">") { d--; if (d === 0) return; continue; }
        if (t.w === "," && d === 1) { expect = true; continue; }
        expect = false;
        continue;
      }
      if (expect && d === 1) { out[t.w] = true; expect = false; }
    }
  }

  /* ---------------------------------------------------------------------
     ตัวไล่สีหลัก
     --------------------------------------------------------------------- */
  /**
   * แปลงซอร์ส TypeScript เป็น HTML ที่ระบายสีแล้ว
   * @param {string} src
   * @param {number} [startDepth] ความลึกวงเล็บตั้งต้น (ใช้ตอนเรียกซ้ำใน `${}`)
   * @param {object} [ctx] ตารางชื่อที่สำรวจไว้ (ภายใน — เรียกจากข้างนอกไม่ต้องส่ง)
   */
  function highlight(src, startDepth, ctx) {
    src = String(src == null ? "" : src);
    if (!ctx) ctx = collectSymbols(src);

    var out = "";
    var i = 0, n = src.length;
    var depth = startDepth || 0;
    var prev = "";           // token ก่อนหน้าที่มีความหมาย — ใช้แยก regex ออกจากการหาร
    var impLine = false;     // อยู่ในประโยค import/export หรือเปล่า (ทำให้ from/assert เป็นชมพู)

    while (i < n) {
      var c = src[i];

      /* ---- ช่องว่าง / ขึ้นบรรทัด: ปล่อยผ่าน ไม่เปลี่ยน prev ---- */
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        if (c === "\n" && prev === "str") impLine = false;   // ...from "x"⏎ จบประโยคแล้ว
        out += esc(c); i++; continue;
      }

      /* ---- คอมเมนต์บรรทัดเดียว ---- */
      if (c === "/" && src[i + 1] === "/") {
        var e = i; while (e < n && src[e] !== "\n") e++;
        out += span("tsd-com", src.slice(i, e)); i = e; continue;
      }

      /* ---- คอมเมนต์บล็อก (ไม่ปิดก็กินถึงท้ายไฟล์ ไม่ทำข้อความหาย) ---- */
      if (c === "/" && src[i + 1] === "*") {
        var e2 = i + 2;
        while (e2 < n && !(src[e2] === "*" && src[e2 + 1] === "/")) e2++;
        e2 = Math.min(n, e2 + 2);
        out += emitComment(src, i, e2); i = e2; continue;
      }

      /* ---- สตริง ' หรือ " (หยุดที่ขึ้นบรรทัดถ้าลืมปิด) ---- */
      if (c === "'" || c === '"') {
        var e3 = i + 1;
        while (e3 < n) {
          if (src[e3] === "\\") { e3 += 2; continue; }
          if (src[e3] === c) { e3++; break; }
          if (src[e3] === "\n") break;
          e3++;
        }
        e3 = Math.min(e3, n);
        out += emitStr(src, i, e3, "tsd-str");
        i = e3; prev = "str"; continue;
      }

      /* ---- template literal: เนื้อเป็นสตริง แต่ข้างใน ${...} ไล่สีเป็นโค้ด ---- */
      if (c === "`") {
        var res = scanTemplate(src, i, depth, ctx);
        out += res.html; i = res.end; prev = "str"; continue;
      }

      /* ---- ตัวเลข: ทศนิยม / 0x 0b 0o / เลขยกกำลัง / _ คั่น / n ต่อท้าย ---- */
      if (DIGIT.test(c) || (c === "." && DIGIT.test(src[i + 1] || ""))) {
        var e4 = scanNumber(src, i);
        out += span("tsd-num", src.slice(i, e4)); i = e4; prev = "num"; continue;
      }

      /* ---- ตัวระบุ / คำสงวน / ฟิลด์ส่วนตัว #name ---- */
      if (ID_START.test(c) || (c === "#" && ID_START.test(src[i + 1] || ""))) {
        var e5 = (c === "#") ? i + 2 : i + 1;
        while (e5 < n && ID_PART.test(src[e5])) e5++;
        var w = src.slice(i, e5);
        var cls = classifyWord(src, i, e5, w, prev, ctx, impLine);
        if (w === "import" || w === "export") impLine = true;
        out += span(cls, w); i = e5; prev = w; continue;
      }

      /* ---- regex literal — แยกจากเครื่องหมายหารด้วย token ก่อนหน้า ---- */
      if (c === "/" && canBeRegex(prev)) {
        var rx = scanRegex(src, i);
        if (rx) {
          out += emitRegex(src, i, rx); i = rx.end; prev = "rex"; continue;
        }
      }

      /* ---- ลูกศรฟังก์ชัน => เป็นสีฟ้า (storage.type.function.arrow.ts) ---- */
      if (c === "=" && src[i + 1] === ">") {
        out += span("tsd-kw", "=>"); i += 2; prev = "=>"; continue;
      }

      /* ---- วงเล็บ: ระบายสีวนตามความลึก ---- */
      if (c === "(" || c === "[" || c === "{") {
        out += span(bcls(depth), c); depth++; i++; prev = c; continue;
      }
      if (c === ")" || c === "]" || c === "}") {
        depth = Math.max(0, depth - 1);
        out += span(bcls(depth), c); i++; prev = c; continue;
      }

      /* ---- ที่เหลือ (ตัวดำเนินการ ฯลฯ) ใช้สีพื้นของเอดิเตอร์ ---- */
      if (c === ";") impLine = false;
      out += esc(c); i++; prev = c;
    }

    return out;
  }

  /* ---------- ตัดสินสีของคำหนึ่งคำ ----------
     ลำดับสำคัญมาก — เขียนเรียงตามที่ VS Code ตัดสินจริง
     1. ตามหลังจุด            -> property / method
     2. ดูคำข้างหน้า           -> new Person / class Dog / function f
     3. คำสงวนชมพู            -> if / import / from
     4. คำสงวนฟ้า             -> const / async / true
     5. ชนิดพื้นฐาน            -> number / string
     6. ชนิดที่ประกาศในไฟล์นี้   -> class Dog แล้วใช้ Dog ที่อื่น
     7. ตามด้วย (             -> เรียกฟังก์ชัน
     8. ตัวแปร const           -> #4FC1FF
     9. คลาสมาตรฐาน           -> Math / JSON
    10. PascalCase             -> เดาว่าเป็นชนิด
    11. ที่เหลือ               -> ตัวแปร                                        */
  function classifyWord(src, i, e5, w, prev, ctx, impLine) {
    var n = src.length;

    // มองไปข้างหน้า: ตัวอักษรถัดไปที่ไม่ใช่ช่องว่าง + มีวงเล็บเปิดตามไหม
    var f = e5; while (f < n && WS.test(src[f])) f++;
    var nextCh = src[f] || "";
    // arr.map<string>(f) และ first<T>(x) ก็คือการเรียกฟังก์ชัน — ต้องข้าม <...> ก่อน
    var isCall = nextCh === "(" || (nextCh === "<" && afterTypeArgsIsCall(src, f));

    // มองย้อนหลัง: ตามหลัง . หรือ ?. ไหม (= property ไม่ใช่คำสงวน)
    // ข้ามช่องว่างและขึ้นบรรทัดด้วย เพราะเชนหลายบรรทัดคือของปกติ  obj⏎  .map(...)
    var b = i - 1; while (b >= 0 && WS.test(src[b])) b--;
    var afterDot = b >= 0 && src[b] === "." && src[b - 1] !== ".";

    /* 1 */
    if (afterDot) {
      if (isCall) return "tsd-fn";
      // Color.Red — สมาชิกของ enum ได้สีเดียวกับตัวแปร const (variable.other.enummember)
      if (ctx.enumMembers[w] && objectBeforeDotIsEnum(src, b, ctx)) return "tsd-cst";
      return "tsd-var";
    }

    /* 2 */
    if (prev === "new" || prev === "class" || prev === "interface" ||
        prev === "enum" || prev === "namespace" || prev === "module" ||
        prev === "extends" || prev === "implements") return "tsd-typ";
    if (prev === "function") return "tsd-fn";
    if (prev === "@") return "tsd-fn";
    if (prev === "type" && nextCh === "=") return "tsd-typ";

    /* คำที่ถูกใช้เป็นชื่อ property ในออบเจกต์:  { type: "json", in: 1 }
       ยกเว้น case/default ที่ตามด้วย : ใน switch */
    if ((prev === "{" || prev === ",") && nextCh === ":" &&
        w !== "case" && w !== "default" && (KW_CTRL[w] || KW_DECL[w])) return "tsd-var";

    /* คำ "อ่อน" ที่ถูกเรียกเป็นฟังก์ชัน  is(x) / type(x) / get(x) */
    if (SOFT_KW[w] && isCall) return "tsd-fn";

    /* 3 — ชมพู */
    if (KW_CTRL[w]) {
      // import("./x") แบบไดนามิกเป็น keyword.operator.expression -> ฟ้า
      if (w === "import" && isCall) return "tsd-kw";
      // from เป็นคำสงวนเฉพาะในประโยค import/export เท่านั้น  const from = 1 คือตัวแปร
      if (w === "from" && !impLine) return fallbackWord(w, isCall, ctx);
      return "tsd-ctl";
    }
    if (w === "assert" && impLine) return "tsd-ctl";

    /* 4 — ฟ้า (มีคำที่ต้องดูบริบท) */
    if (KW_DECL[w]) {
      if (w === "export") return exportIsControl(src, e5) ? "tsd-ctl" : "tsd-kw";
      if (w === "type") {
        if (prev === "import" || prev === "export") return "tsd-ctl";
        // type X = ... / type X<T> = ...   ต้องตามด้วยชื่อจริง ๆ ถึงจะเป็นคำสงวน
        var nw = wordAt(src, f);
        if (!nw) return isCall ? "tsd-fn" : "tsd-var";
        return "tsd-kw";
      }
      if (w === "get" || w === "set" || w === "accessor") {
        // get name() {}  เท่านั้นที่เป็นคำสงวน — const set = new Set() ไม่ใช่
        if (!(ID_START.test(nextCh) || nextCh === "[" || nextCh === '"' ||
              nextCh === "'" || nextCh === "*" || nextCh === "#")) {
          return fallbackWord(w, isCall, ctx);
        }
      }
      return "tsd-kw";
    }

    /* 5 */
    if (TYPE_PRIM[w] && !ctx.consts[w]) return "tsd-typ";

    /* 6 */
    if (ctx.types[w]) return "tsd-typ";

    /* 7 */
    if (isCall) return "tsd-fn";

    /* 8 */
    if (ctx.consts[w]) return "tsd-cst";

    /* 9 */
    if (TYPE_LIB[w]) return "tsd-typ";

    /* 10 */
    if (KW_PLAIN[w]) return "tsd-fg";

    /* 11 */
    if (/^[A-Z]/.test(w) && /[a-z]/.test(w)) return "tsd-typ";
    return "tsd-var";
  }

  function fallbackWord(w, isCall, ctx) {
    if (isCall) return "tsd-fn";
    if (ctx.consts[w]) return "tsd-cst";
    return "tsd-var";
  }

  /* มองข้าม <...> ที่เป็นอาร์กิวเมนต์ชนิด แล้วดูว่าตามด้วย ( ไหม
     จำกัดความยาวและห้ามข้ามบรรทัด/เซมิโคลอน เพื่อไม่ให้ a < b > (c) ถูกอ่านผิด */
  function afterTypeArgsIsCall(src, at) {
    var n = src.length, d = 0, k = at, guard = 0;
    while (k < n && guard < 160) {
      var c = src[k];
      if (c === "<") d++;
      else if (c === ">") {
        d--;
        if (d === 0) {
          k++;
          while (k < n && WS.test(src[k])) k++;
          return src[k] === "(";
        }
      } else if (c === "\n" || c === ";" || c === "{" || c === "}") return false;
      k++; guard++;
    }
    return false;
  }

  /* ตัวที่อยู่ก่อนจุดเป็นชื่อ enum หรือเปล่า (b ชี้ที่ตัว . พอดี) */
  function objectBeforeDotIsEnum(src, b, ctx) {
    var k = b - 1;
    while (k >= 0 && WS.test(src[k])) k--;
    if (k < 0 || !ID_PART.test(src[k])) return false;
    var e = k + 1;
    while (k >= 0 && ID_PART.test(src[k])) k--;
    return !!ctx.enums[src.slice(k + 1, e)];
  }

  function wordAt(src, j) {
    if (j >= src.length || !ID_START.test(src[j])) return "";
    var k = j + 1;
    while (k < src.length && ID_PART.test(src[k])) k++;
    return src.slice(j, k);
  }

  /* export เป็นชมพูเฉพาะรูปที่ไวยากรณ์ TS ถือว่าเป็น keyword.control.export
       export { a }      export * from "x"     export default foo     export type T = ...
     ส่วน export const / export function / export class ฯลฯ VS Code ให้ "ฟ้า"
     (มันเป็น storage.modifier ไม่ใช่ keyword.control) — ตรวจจากไฟล์ไวยากรณ์จริงแล้ว */
  function exportIsControl(src, afterExport) {
    var n = src.length, j = afterExport;
    while (j < n && WS.test(src[j])) j++;
    var w = wordAt(src, j);
    if (w === "type") {                       // export type ... = ชมพูทั้งคู่
      var k = j + w.length;
      while (k < n && WS.test(src[k])) k++;
      if (src[k] === "{" || src[k] === "*") return true;
      return !!wordAt(src, k);
    }
    if (src[j] === "{" || src[j] === "*") return true;
    if (!w) return false;
    if (EXPORT_BLUE_NEXT[w]) return false;
    var after = src[j + w.length] || "";
    return WS.test(after) || after === ",";
  }

  /* ---------- ตัวช่วย ---------- */

  function scanNumber(src, i) {
    var n = src.length, j = i;
    if (src[j] === "0" && /[xXbBoO]/.test(src[j + 1] || "")) {
      j += 2;
      while (j < n && /[0-9a-fA-F_]/.test(src[j])) j++;
    } else {
      while (j < n && /[0-9_]/.test(src[j])) j++;
      if (src[j] === ".") { j++; while (j < n && /[0-9_]/.test(src[j])) j++; }
      if (/[eE]/.test(src[j] || "")) {
        var k = j + 1;
        if (/[+-]/.test(src[k] || "")) k++;
        if (DIGIT.test(src[k] || "")) { j = k; while (j < n && /[0-9_]/.test(src[j])) j++; }
      }
    }
    if (src[j] === "n") j++;   // BigInt
    return j;
  }

  /* หลัง token พวกนี้ "/" คือการหาร ไม่ใช่ regex */
  function canBeRegex(prev) {
    if (!prev) return true;
    if (prev === "num" || prev === "str" || prev === "rex") return false;
    if (prev === ")" || prev === "]" || prev === "}") return false;
    if (ID_START.test(prev[0])) return !!(KW_CTRL[prev] || KW_DECL[prev]);
    return true;
  }

  /* คืน {body:index ของ / ปิด, end:index หลัง flags} หรือ null ถ้าไม่ใช่ regex */
  function scanRegex(src, i) {
    var n = src.length, j = i + 1, inClass = false;
    if (src[j] === "/" || src[j] === "*" || j >= n) return null;
    while (j < n) {
      var c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "\n") return null;            // ขึ้นบรรทัด = ไม่ใช่ regex
      if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      else if (c === "/" && !inClass) break;
      j++;
    }
    if (j >= n || src[j] !== "/") return null;
    var body = j;
    j++;
    while (j < n && /[a-z]/.test(src[j])) j++;   // flags
    return { body: body, end: j };
  }

  /* ระบายข้างใน regex ตามที่ VS Code ทำ
       ตัวอักษรทั่วไป / flags -> #D16969   วงเล็บกลุ่มกับ | และ [ ] -> #CE9178
       ตัวคูณ * + ? {n,m} กับ \escape -> #D7BA7D    ^ $ \b \B -> #DCDCAA */
  function emitRegex(src, i, rx) {
    var body = rx.body, out = span("tsd-rex", "/");
    var k = i + 1, seg = k, inClass = false;
    var BREAK = "\\[]()|^$*+?{";

    function flush(to) {
      // เนื้อในคลาสอักขระ [abc] ใช้สีเดียวกับตัวอักษรทั่วไปตามธีม Dark+
      if (to > seg) out += span("tsd-rex", src.slice(seg, to));
      seg = to;
    }

    while (k < body) {
      var c = src[k];
      if (c === "\\") {
        flush(k);
        var nx = src[k + 1] || "";
        var cls = (!inClass && (nx === "b" || nx === "B")) ? "tsd-rexa" : "tsd-rexq";
        var len = Math.min(2, body - k);
        out += span(cls, src.slice(k, k + len));
        k += len; seg = k; continue;
      }
      if (inClass) {
        if (c === "]") { flush(k); out += span("tsd-rexg", "]"); inClass = false; k++; seg = k; continue; }
        k++; continue;
      }
      if (c === "[") {
        flush(k);
        var open = "[";
        if (src[k + 1] === "^") open = "[^";
        out += span("tsd-rexg", open);
        k += open.length; seg = k; inClass = true; continue;
      }
      if (c === "(") {
        flush(k);
        var g = "(", m = k + 1;
        if (src[m] === "?") {
          var q = src[m + 1] || "";
          if (q === ":" || q === "=" || q === "!") g = src.slice(k, m + 2);
          else if (q === "<") {
            var close = src.indexOf(">", m + 2);
            if (src[m + 2] === "=" || src[m + 2] === "!") g = src.slice(k, m + 3);
            else if (close > 0 && close < body) g = src.slice(k, close + 1);
          }
        }
        out += span("tsd-rexg", g);
        k += g.length; seg = k; continue;
      }
      if (c === ")" || c === "|") {
        flush(k); out += span("tsd-rexg", c); k++; seg = k; continue;
      }
      if (c === "^" || c === "$") {
        flush(k); out += span("tsd-rexa", c); k++; seg = k; continue;
      }
      if (c === "*" || c === "+" || c === "?") {
        flush(k); out += span("tsd-rexq", c); k++; seg = k; continue;
      }
      if (c === "{") {
        var q2 = k + 1;
        while (q2 < body && /[0-9,]/.test(src[q2])) q2++;
        if (src[q2] === "}" && q2 > k + 1) {
          flush(k); out += span("tsd-rexq", src.slice(k, q2 + 1)); k = q2 + 1; seg = k; continue;
        }
        k++; continue;
      }
      // เดินยาว ๆ จนเจอตัวที่ต้องแยกสี — ลดจำนวน span
      var s0 = k;
      while (k < body && BREAK.indexOf(src[k]) < 0) k++;
      if (k === s0) k++;
      continue;
    }
    flush(body);
    out += span("tsd-rex", src.slice(body, rx.end));
    return out;
  }

  /* สตริง: ตัว escape เช่น ขึ้นบรรทัด/แท็บ/อัญประกาศหนี เป็นสีทองแยกจากเนื้อสตริง
     (constant.character.escape -> #D7BA7D ใน Dark+) */
  function emitStr(src, i, end, cls) {
    var out = "", seg = i, k = i;
    while (k < end) {
      if (src[k] === "\\" && k + 1 < end) {
        if (k > seg) out += span(cls, src.slice(seg, k));
        var nx = src[k + 1], len = 2;
        if (nx === "u" && src[k + 2] === "{") {
          var close = src.indexOf("}", k + 3);
          len = (close > 0 && close < end) ? (close - k + 1) : 2;
        } else if (nx === "u") len = 6;
        else if (nx === "x") len = 4;
        if (k + len > end) len = end - k;
        out += span("tsd-esc", src.slice(k, k + len));
        k += len; seg = k; continue;
      }
      k++;
    }
    if (k > seg) out += span(cls, src.slice(seg, k));
    return out;
  }

  /* คอมเมนต์บล็อก — ถ้าเป็น JSDoc ( /** ) ให้ @tag เป็นฟ้า และ {Type} เป็นเขียว
     เหมือน VS Code ที่ใช้ไวยากรณ์ jsdoc ซ้อนเข้ามา */
  function emitComment(src, i, end) {
    var isDoc = src[i + 1] === "*" && src[i + 2] === "*";
    if (!isDoc) return span("tsd-com", src.slice(i, end));

    var out = "", seg = i, k = i;
    while (k < end) {
      var c = src[k];
      if (c === "@" && ID_START.test(src[k + 1] || "")) {
        if (k > seg) out += span("tsd-com", src.slice(seg, k));
        var t = k + 1;
        while (t < end && ID_PART.test(src[t])) t++;
        out += span("tsd-kw", src.slice(k, t));
        k = t; seg = k; continue;
      }
      if (c === "{") {
        var close = src.indexOf("}", k + 1);
        if (close > 0 && close < end && src.slice(k, close).indexOf("\n") < 0) {
          if (k > seg) out += span("tsd-com", src.slice(seg, k));
          out += span("tsd-typ", src.slice(k, close + 1));
          k = close + 1; seg = k; continue;
        }
      }
      k++;
    }
    if (k > seg) out += span("tsd-com", src.slice(seg, end));
    return out;
  }

  /* template literal — คืน {html, end}
     ข้างใน ${...} เรียก highlight() ซ้ำ โดยส่งความลึกวงเล็บต่อไปให้สีวนถูกลำดับ
     ตัว ${ กับ } เป็นสีฟ้า (punctuation.definition.template-expression ใน Dark+) */
  function scanTemplate(src, start, depth, ctx) {
    var n = src.length;
    var html = "";
    var seg = start;          // ต้นของช่วงที่ยังเป็นตัวหนังสือล้วน
    var j = start + 1;

    while (j < n) {
      var c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") { j++; break; }

      if (c === "$" && src[j + 1] === "{") {
        html += emitStr(src, seg, j, "tsd-str");

        // หา } ที่คู่กัน โดยข้ามสตริงซ้อนและวงเล็บปีกกาซ้อน
        var k = j + 2, d = 1, closed = false;
        while (k < n) {
          var ck = src[k];
          if (ck === "\\") { k += 2; continue; }
          if (ck === "'" || ck === '"' || ck === "`") {
            var q = ck; k++;
            while (k < n) {
              if (src[k] === "\\") { k += 2; continue; }
              if (src[k] === q) { k++; break; }
              k++;
            }
            continue;
          }
          if (ck === "{") d++;
          else if (ck === "}") { d--; if (d === 0) { closed = true; break; } }
          k++;
        }

        var innerEnd = closed ? k : n;
        html += span("tsd-kw", "${");
        html += highlight(src.slice(j + 2, innerEnd), depth, ctx);
        if (closed) { html += span("tsd-kw", "}"); j = k + 1; }
        else j = n;
        seg = j;
        continue;
      }
      j++;
    }

    j = Math.min(j, n);
    html += emitStr(src, seg, j, "tsd-str");
    return { html: html, end: j };
  }

  /* ---------- CSS ---------- */
  /* ฉีดเองเพื่อให้ index.html แก้น้อยที่สุด และ room.html ได้ของชุดเดียวกันฟรี
     พื้นหลังปรับได้ผ่าน --tsdark-bg (เว็บเดิมใช้โทนกรมท่าของ Dojo,
     ห้องโค้ดใช้ #1E1E1E ของ VS Code จริง) */
  var CSS = [
    ":root{",
    "--tsd-com:#6A9955;--tsd-str:#CE9178;--tsd-num:#B5CEA8;--tsd-ctl:#C586C0;",
    "--tsd-kw:#569CD6;--tsd-var:#9CDCFE;--tsd-fn:#DCDCAA;--tsd-typ:#4EC9B0;",
    "--tsd-cst:#4FC1FF;--tsd-esc:#D7BA7D;",
    "--tsd-rex:#D16969;--tsd-rexg:#CE9178;--tsd-rexq:#D7BA7D;--tsd-rexa:#DCDCAA;",
    "--tsd-fg:#D4D4D4;--tsd-caret:#AEAFAD;--tsd-sel:#264F78;",
    "--tsd-b0:#FFD700;--tsd-b1:#DA70D6;--tsd-b2:#179FFF;",
    "}",
    ".tsd-com{color:var(--tsd-com)}",
    ".tsd-str{color:var(--tsd-str)}",
    ".tsd-esc{color:var(--tsd-esc)}",
    ".tsd-num{color:var(--tsd-num)}",
    ".tsd-ctl{color:var(--tsd-ctl)}",
    ".tsd-kw{color:var(--tsd-kw)}",
    ".tsd-var{color:var(--tsd-var)}",
    ".tsd-cst{color:var(--tsd-cst)}",
    ".tsd-fn{color:var(--tsd-fn)}",
    ".tsd-typ{color:var(--tsd-typ)}",
    ".tsd-fg{color:var(--tsd-fg)}",
    ".tsd-rex{color:var(--tsd-rex)}",
    ".tsd-rexg{color:var(--tsd-rexg)}",
    ".tsd-rexq{color:var(--tsd-rexq)}",
    ".tsd-rexa{color:var(--tsd-rexa)}",
    ".tsd-b0{color:var(--tsd-b0)}",
    ".tsd-b1{color:var(--tsd-b1)}",
    ".tsd-b2{color:var(--tsd-b2)}",
    /* pre.code ที่โชว์โจทย์ ใช้สีพื้นเดียวกับเอดิเตอร์ */
    "pre.code{color:var(--tsd-fg)}",
    /* --- ชั้นไล่สีทับ textarea --- */
    ".edWrap{position:relative}",
    ".edWrap>.edHl{",
    "position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;",
    "margin:0;color:var(--tsd-fg);background:var(--tsdark-bg,var(--code-bg,#0e1219));",
    "box-shadow:inset 0 2px 10px rgba(0,0,0,.4);",
    /* ทุกค่าข้างล่างต้องตรงกับ textarea.ed เป๊ะ ไม่งั้นตัวหนังสือ 2 ชั้นเหลื่อมกัน */
    "font-family:var(--mono);font-size:14px;line-height:1.6;",
    "padding:12px 14px;border:2px solid transparent;border-radius:10px;",
    "tab-size:4;-moz-tab-size:4;white-space:pre;word-wrap:normal;overflow-wrap:normal;",
    "}",
    ".edWrap>textarea.ed{",
    "position:relative;z-index:1;background:transparent;color:transparent;",
    "caret-color:var(--tsd-caret);box-shadow:none;",
    "}",
    ".edWrap>textarea.ed::selection{background:var(--tsd-sel);color:transparent}",
    ".edWrap>textarea.ed::-moz-selection{background:var(--tsd-sel);color:transparent}"
  ].join("");

  var cssDone = false;
  function ensureCSS() {
    if (cssDone || typeof document === "undefined") return;
    cssDone = true;
    var st = document.createElement("style");
    st.id = "tsdark-css";
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- ผูกชั้นไล่สีเข้ากับ textarea ---------- */
  /**
   * ห่อ textarea ไว้ในกล่องที่มีชั้นไล่สีอยู่ข้างหลัง แล้วคืนกล่องนั้น
   * ตัว textarea ตัวเดิมไม่ถูกเปลี่ยน — โค้ดที่อ่าน ta.value อยู่แล้วทำงานเหมือนเดิมทุกอย่าง
   */
  function attach(ta) {
    if (!ta) return ta;
    if (ta._tsdark) return ta.parentNode;
    ensureCSS();

    var wrap = document.createElement("div");
    wrap.className = "edWrap";
    var pre = document.createElement("pre");
    pre.className = "edHl";
    pre.setAttribute("aria-hidden", "true");

    if (ta.parentNode) ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(pre);
    wrap.appendChild(ta);

    var raf = 0, lastVal = null;

    function sync() { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }

    function paint() {
      raf = 0;
      var v = ta.value;
      if (v !== lastVal) {
        lastVal = v;
        // เติม \n ท้าย เพื่อให้บรรทัดว่างสุดท้ายสูงเท่ากับใน textarea
        pre.innerHTML = highlight(v) + "\n";
      }
      sync();
    }

    function schedule() {
      if (!raf) raf = (global.requestAnimationFrame || setTimeout)(paint, 16);
    }

    ta.addEventListener("input", schedule);
    // keydown จำเป็น เพราะ wireCodeEditor ใน index.html เขียน ta.value ตรง ๆ
    // 6 จุด (Tab / auto-close / Alt+Shift+ลูกศร / Enter ฉลาด / Backspace คู่)
    // โดยไม่ยิง event input — rAF ที่ตั้งจากตรงนี้จะทำงานหลัง handler นั้นเสร็จ
    ta.addEventListener("keydown", schedule);
    ta.addEventListener("paste", schedule);
    ta.addEventListener("cut", schedule);
    ta.addEventListener("focus", schedule);
    ta.addEventListener("scroll", sync);

    ta._tsdark = { refresh: schedule, pre: pre, wrap: wrap };
    paint();
    return wrap;
  }

  /* ---------- ไล่สี pre.code ที่ฝังอยู่ในเนื้อหาบทเรียน ----------
     teach ของแต่ละด่านเป็นสตริง HTML ที่มี <pre class="code"> ฝังอยู่ 90 ก้อน
     ซึ่งไม่ได้ผ่าน codePre() จึงต้องกวาดทีหลัง

     ข้ามก้อนที่:
       - มีมาร์กอัปข้างในอยู่แล้ว (เช่น <span> จางๆ ที่คนเขียนใส่เอง) — ไล่สีทับจะทำมันหาย
       - มี {{ }} ซึ่งเป็น placeholder ของโจทย์เติมคำ — ไล่สีก่อนจะทำ renderBlank พัง */
  function paintAll(root) {
    if (typeof document === "undefined") return;
    ensureCSS();
    var list = (root || document).querySelectorAll("pre.code");
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.getAttribute("data-tsd")) continue;
      p.setAttribute("data-tsd", "1");
      if (p.children.length) continue;
      var t = p.textContent;
      if (!t || t.indexOf("{{") >= 0) continue;
      p.innerHTML = highlight(t);
    }
  }

  /* ฉีด CSS ทันทีที่โหลด ไม่รอเรียกใช้ครั้งแรก
     กันจังหวะที่โจทย์ถูก render ก่อน แล้วตัวหนังสือกระพริบเปลี่ยนสี */
  if (typeof document !== "undefined") {
    if (document.head) ensureCSS();
    else document.addEventListener("DOMContentLoaded", ensureCSS);
  }

  global.TSDark = {
    highlight: highlight,
    attach: attach,
    paintAll: paintAll,
    ensureCSS: ensureCSS,
    symbols: collectSymbols,
    _css: CSS
  };
})(typeof window !== "undefined" ? window : globalThis);
