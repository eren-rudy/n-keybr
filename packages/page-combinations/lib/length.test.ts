import { test } from "node:test";
import { equal } from "rich-assert";
import { parseLength } from "./length.ts";

test("parse a sequence length", () => {
  equal(parseLength("1"), 1);
  equal(parseLength(" 12 "), 12);
  equal(parseLength("100"), 100);
  equal(parseLength(""), null);
  equal(parseLength("0"), null);
  equal(parseLength("101"), null);
  equal(parseLength("-1"), null);
  equal(parseLength("1.5"), null);
  equal(parseLength("2e1"), null);
  equal(parseLength("abc"), null);
});
