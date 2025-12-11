/*
 * Copyright (c) 2025 Jordan Bancino <jordan@bancino.net>
 * Copyright (c) 2025 Austin Hargis <hargisa@mail.gvsu.edu>
 * Copyright (c) 2025 Aaron MacDougall <macdouaa@mail.gvsu.edu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { expect, beforeAll, test } from "@jest/globals";

import { BitString } from "../src/BitString";

test("constructor", () => {
  const str = new BitString("101010");
  expect(str.toString()).toBe("101010");
});

test("constructor truncate", () => {
  const str = new BitString("101010", 4);
  expect(str.toString()).toBe("1010");
});

test("constructor pad", () => {
  const str = new BitString("1010", 6);
  expect(str.toString()).toBe("001010");
});

test("constructor negative width", () => {
  expect(() => new BitString("1010", -6)).toThrow();
});

test("high(1)", () => {
  const str = BitString.high(1);

  expect(str.getWidth()).toBe(1);
  expect(str.toString()).toBe("1");
});

test("high(4)", () => {
  const str = BitString.high(4);

  expect(str.getWidth()).toBe(4);
  expect(str.toString()).toBe("1111");
});

test("high(8)", () => {
  const str = BitString.high(8);

  expect(str.getWidth()).toBe(8);
  expect(str.toString()).toBe("11111111");
});

test("0000.not()", () => {
  const str = new BitString("0", 4).not();

  expect(str.toString()).toBe("1111");
});

test("1111.not()", () => {
  const str = new BitString("1111").not();

  expect(str.toString()).toBe("0000");
});

test("1010.not()", () => {
  const str = new BitString("1010").not();

  expect(str.toString()).toBe("0101");
});

test("0101.not()", () => {
  const str = new BitString("0101").not();

  expect(str.toString()).toBe("1010");
});

test("not() double negation", () => {
  const str = new BitString("10110100101001001010101");
  const two = str.not();

  expect(two.not().toString()).toBe(str.toString());
});

test("1 AND 1", () => {
  const one = new BitString("1");
  const two = new BitString("1");

  expect(one.and(two).toString()).toBe("1");
});

test("0 AND 1", () => {
  const one = new BitString("0");
  const two = new BitString("1");

  expect(one.and(two).toString()).toBe("0");
});

test("1 AND 0", () => {
  const one = new BitString("1");
  const two = new BitString("0");

  expect(one.and(two).toString()).toBe("0");
});

test("00 AND 01", () => {
  const one = new BitString("00");
  const two = new BitString("01");

  expect(one.and(two).toString()).toBe("00");
});

test("11 AND 11", () => {
  const one = new BitString("11");
  const two = new BitString("11");

  expect(one.and(two).toString()).toBe("11");
});

test("01 AND 10", () => {
  const one = new BitString("01");
  const two = new BitString("10");

  expect(one.and(two).toString()).toBe("00");
});

test("10 AND 01", () => {
  const one = new BitString("10");
  const two = new BitString("01");

  expect(one.and(two).toString()).toBe("00");
});

test("00 AND 00", () => {
  const one = new BitString("00");
  const two = new BitString("00");

  expect(one.and(two).toString()).toBe("00");
});

test("1 OR 1", () => {
  const one = new BitString("1");
  const two = new BitString("1");

  expect(one.or(two).toString()).toBe("1");
});

test("0 OR 1", () => {
  const one = new BitString("0");
  const two = new BitString("1");

  expect(one.or(two).toString()).toBe("1");
});

test("1 OR 0", () => {
  const one = new BitString("1");
  const two = new BitString("0");

  expect(one.or(two).toString()).toBe("1");
});

test("00 OR 01", () => {
  const one = new BitString("00");
  const two = new BitString("01");

  expect(one.or(two).toString()).toBe("01");
});

test("11 OR 11", () => {
  const one = new BitString("11");
  const two = new BitString("11");

  expect(one.or(two).toString()).toBe("11");
});

test("01 OR 10", () => {
  const one = new BitString("01");
  const two = new BitString("10");

  expect(one.or(two).toString()).toBe("11");
});

test("10 OR 01", () => {
  const one = new BitString("10");
  const two = new BitString("01");

  expect(one.or(two).toString()).toBe("11");
});

test("00 OR 00", () => {
  const one = new BitString("00");
  const two = new BitString("00");

  expect(one.or(two).toString()).toBe("00");
});

test("And width mismatch", () => {
  const one = new BitString("010");
  const two = new BitString("0011");

  expect(() => one.and(two)).toThrow("width mismatch");

  expect(one.and("110").toString()).toBe("010");
});

test("Or width mismatch", () => {
  const one = new BitString("010");
  const two = new BitString("0011");

  expect(() => one.or(two)).toThrow("width mismatch");

  expect(one.or("110").toString()).toBe("110");
});

test("Add width mismatch", () => {
  const one = new BitString("010");
  const two = new BitString("0011");

  expect(() => one.add(two)).toThrow("width mismatch");

  expect(one.add("011").toString()).toBe("101");
});

// Converts from hex strings to binary internally, then back.
test("toString(16)", () => {
  // Whatever hex we create the string with, we should be able
  // to get it out.
  const genRanHex = (size) =>
    [...Array(size)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("");

  for (let i = 1; i < 16; i++) {
    let hex = "0x" + genRanHex(i).toUpperCase().replace(/^0+/, "");
    if (hex == "0x") {
      hex += "0";
    }

    expect(new BitString(hex).toString(16)).toBe(hex);
  }
});

test("toString(3)", () => {
  expect(() => new BitString("10").toString(3)).toThrow("Unsupported radix");
});

test("toJSON()", () => {
  const str = new BitString("00");

  expect(str.toJSON()).toBe(str.toString());
});

test("toSigned() unsigned", () => {
  const str = new BitString("0111");

  expect(str.toSigned()).toBe(7);
});

test("toSigned() signed", () => {
  const str = new BitString("1111");

  expect(str.toSigned()).toBe(-1);
});

test("equals()", () => {
  const one = new BitString("1010");
  const two = new BitString("1010");

  expect(one == two).toBe(false);
  expect(one.equals(two)).toBe(true);
  expect(one.equals("1010")).toBe(true);
});

test("truncate()", () => {
  const str = new BitString("00111100");

  expect(str.truncate(4).toString()).toBe("1100");
  expect(str.truncate(4, true).toString()).toBe("0011");

  expect(str.truncate(8).toString()).toBe(str.toString());
});

test("pad()", () => {
  const str = new BitString("110");

  expect(str.pad(3).toString()).toBe(str.toString());
  expect(str.pad(4).toString()).toBe("0110");
  expect(str.pad(8).toString()).toBe("00000110");
});

test(`0001 + 0001 => 0010`, () => {
  const one = new BitString("1", 4);
  expect(one.add(one).toString()).toBe("0010");
});

// Extra tests merged from BitString.extra.test.ts
test("constructor rejects non-binary/non-hex strings", () => {
  expect(() => new BitString("2")).toThrow("Not a hex or binary string");
});

test("hex '0x0' converts to single zero bit and back to hex", () => {
  const b = new BitString("0x0");
  expect(b.toString()).toBe("0");
  expect(b.toString(16)).toBe("0x0");
});

test("equals(null) returns false", () => {
  const b = new BitString("101");
  expect(b.equals(null)).toBe(false);
});

test("greaterThan / lessThan handle null and string inputs", () => {
  const a = new BitString("0011");
  const b = new BitString("0010");

  expect(a.greaterThan(b)).toBe(true);
  expect(b.lessThan(a)).toBe(true);

  // null handling
  expect(a.greaterThan(null)).toBe(false);
  expect(a.lessThan(null)).toBe(false);

  // string inputs
  expect(a.greaterThan("0010")).toBe(true);
  expect(b.lessThan("0011")).toBe(true);
});

test("twosCompliment edge cases and lsb/msb boundaries", () => {
  const one = new BitString("0", 1);
  // twos compliment of 0 (width 1) => not(0)=1 add 1 => 0 (wrap)
  const tc = one.twosCompliment();
  expect(tc.getWidth()).toBe(1);

  // msb/lsb when n equals width should return same string
  const s = new BitString("1010");
  expect(s.msb(4).toString()).toBe(s.toString());
  expect(s.lsb(4).toString()).toBe(s.toString());
});

test("bitSlice of length 1", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(0, 1).toString()).toBe("1");
  expect(bs.bitSlice(1, 2).toString()).toBe("0");
  expect(bs.bitSlice(2, 3).toString()).toBe("1");
  expect(bs.bitSlice(3, 4).toString()).toBe("0");
  expect(bs.bitSlice(6, 7).toString()).toBe("1");
  expect(bs.bitSlice(7, 8).toString()).toBe("0");

  const bs2 = new BitString("10011010");
  expect(bs2.bitSlice(0, 1).toString()).toBe("0");
  expect(bs2.bitSlice(1, 2).toString()).toBe("1");
  expect(bs2.bitSlice(2, 3).toString()).toBe("0");
  expect(bs2.bitSlice(3, 4).toString()).toBe("1");
  expect(bs2.bitSlice(6, 7).toString()).toBe("0");
  expect(bs2.bitSlice(7, 8).toString()).toBe("1");
});

test("bitSlice of length 2", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(0, 2).toString()).toBe("01");
  expect(bs.bitSlice(1, 3).toString()).toBe("10");
  expect(bs.bitSlice(2, 4).toString()).toBe("01");
  expect(bs.bitSlice(3, 5).toString()).toBe("00");
  expect(bs.bitSlice(5, 7).toString()).toBe("11");
  expect(bs.bitSlice(6, 8).toString()).toBe("01");

  const bs2 = new BitString("10011010");
  expect(bs2.bitSlice(0, 2).toString()).toBe("10");
  expect(bs2.bitSlice(1, 3).toString()).toBe("01");
  expect(bs2.bitSlice(2, 4).toString()).toBe("10");
  expect(bs2.bitSlice(3, 5).toString()).toBe("11");
  expect(bs2.bitSlice(5, 7).toString()).toBe("00");
  expect(bs2.bitSlice(6, 8).toString()).toBe("10");
});

test("bitSlice of length 3", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(0, 3).toString()).toBe("101");
  expect(bs.bitSlice(1, 4).toString()).toBe("010");
  expect(bs.bitSlice(2, 5).toString()).toBe("001");
  expect(bs.bitSlice(3, 6).toString()).toBe("100");
  expect(bs.bitSlice(5, 8).toString()).toBe("011");

  const bs2 = new BitString("10011010");
  expect(bs2.bitSlice(0, 3).toString()).toBe("010");
  expect(bs2.bitSlice(1, 4).toString()).toBe("101");
  expect(bs2.bitSlice(2, 5).toString()).toBe("110");
  expect(bs2.bitSlice(3, 6).toString()).toBe("011");
  expect(bs2.bitSlice(5, 8).toString()).toBe("100");
});

test("bitSlice of length 7", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(0, 7).toString()).toBe("1100101");
  expect(bs.bitSlice(1, 8).toString()).toBe("0110010");
});

test("bitSlice of length 8", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(0, 7).toString()).toBe("1100101");
  expect(bs.bitSlice(1, 8).toString()).toBe("0110010");
});

test("bitSlice with default end", () => {
  const bs = new BitString("01100101");
  expect(bs.bitSlice(7).toString()).toBe("0");
  expect(bs.bitSlice(6).toString()).toBe("01");
  expect(bs.bitSlice(5).toString()).toBe("011");
  expect(bs.bitSlice(2).toString()).toBe("011001");
  expect(bs.bitSlice(0).toString()).toBe("01100101");
});

test("make with value and default width", () => {
  expect(BitString.make(0).toString()).toBe("0");
  expect(BitString.make(1).toString()).toBe("1");
  expect(BitString.make(2).toString()).toBe("10");
  expect(BitString.make(10).toString()).toBe("1010");
  expect(BitString.make(70_244_863).toString()).toBe(
    "100001011111101100111111111"
  );
  expect(BitString.make(2_147_483_647).toString()).toBe(
    "1111111111111111111111111111111"
  );
});

test("make with value and explicit, larger width", () => {
  expect(BitString.make(0, 10).toString()).toBe("0000000000");
  expect(BitString.make(1, 12).toString()).toBe("000000000001");
  expect(BitString.make(14, 7).toString()).toBe("0001110");
});

test("make with value and explicit, smaller width", () => {
  expect(BitString.make(14, 3).toString()).toBe("110");
});

test("make with negative value", () => {
  expect(BitString.make(-2, 5).toString()).toBe("11110");
  expect(BitString.make(-8, 7).toString()).toBe("1111000");
  expect(BitString.make(-54, 7).toString()).toBe("1001010");
  expect(BitString.make(-54, 12).toString()).toBe("111111001010");
});

test("make requires width for negative value", () => {
  expect(() => BitString.make(-2)).toThrow();
});

test("make throws when given negative width", () => {
  expect(() => BitString.make(43, -2)).toThrow();
  expect(() => BitString.make(-43, -2)).toThrow();
});
