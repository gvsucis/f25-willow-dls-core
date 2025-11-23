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

import { beforeAll, test, expect } from "@jest/globals";
import { BitString, Circuit, loadCircuit } from "../../src";
import { JLSLoader } from "../../src/CircuitLoader/JLSLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    JLSLoader,
    "tests/jls/AddVector.jls",
    "AddVector",
  );
});

test("Test Memory", () => {
  const initialState = [
    "0x0",
    "0x10",
    "0x20",
    "0x30",
    "0x40",
    "0x50",

    "0x60",
    "0x70",
    "0x80",
    "0x90",
    "0xa0",
    "0xb0",
    "0xc0",

    "0xd0",
    "0xe0",
    "0xf0",
  ].map((val) => new BitString(val, 16));

  circuit.writeMemory("TheMemory", 0, initialState);

  circuit.run(
    {
      Offset: "0101",
      Counter: "0011",
    },
    // (clockHigh, clockCycles, { outputs: { Halt } }) => {
    //   console.log(`${clockHigh}, ${clockCycles}`);
    //   return (clockCycles > 1 && Halt.toString() == "1") || clockCycles > 1000;
    // },
    // 3000,
  );

  const finalState = circuit.readMemory("TheMemory", 0, 16);

  expect(finalState.map((b) => b.toString())).toStrictEqual(
    initialState.map((b) => b.toString()),
  );
});
