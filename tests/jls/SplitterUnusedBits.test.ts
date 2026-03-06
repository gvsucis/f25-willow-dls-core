/*
 * Copyright (c) 2025 Zachary Kurmas
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
import { FileLogger } from "../../src/CircuitLogger/FileLogger";
import { LogLevel } from "../../src/CircuitLogger";
import { MainCircuitRunResult } from "../../src/Circuit";

let circuit: Circuit;

beforeAll(async () => {
  const logger = new FileLogger("jls.log");
  logger.setLevel(LogLevel.TRACE);

  circuit = await loadCircuit(
    JLSLoader,
    "tests/jls/SplitterUnusedBits.jls",
    "SplitterUnusedBits",
    logger
  );
});

function genTest(input: BitString) {
  return () => {
    const results = circuit.run({
      Input: input,
    });

    const outputs = results.outputStrings;

    expect(outputs.Low).toBe(input.bitSlice(0, 1).toString());
    expect(outputs.Middle).toBe(input.bitSlice(4, 5).toString());
    expect(outputs.High).toBe(input.bitSlice(7, 8).toString());
  };
}

test("Unused split bits 00000000", genTest(new BitString("00000000")));
test("Unused split bits 00101001", genTest(new BitString("00101001")));
test("Unused split bits 01010000", genTest(new BitString("01010000")));
test("Unused split bits 00010001", genTest(new BitString("00010001")));
test("Unused split bits 10000000", genTest(new BitString("10000000")));
test("Unused split bits 10000001", genTest(new BitString("10000001")));
test("Unused split bits 10010000", genTest(new BitString("10010000")));
test("Unused split bits 10010001", genTest(new BitString("00010001")));
