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

let circuit: Circuit;

beforeAll(async () => {
  const logger = new FileLogger("jls.log");
  logger.setLevel(LogLevel.TRACE);

  circuit = await loadCircuit(
    JLSLoader,
    "tests/jls/DiscreteSplitter.jls",
    "DiscreteSplitter",
    logger
  );
});

function genTest(input: BitString) {
  return () => {
    const results = circuit.run({
      InputA: input.bitSlice(0, 6),
      InputB: input.bitSlice(6, 13),
      InputC: new BitString("0101010101010"),
    });

    const mappingA = [6, 0, 2, 7, 9, 4, 11];
    const expA = new BitString(
      mappingA.map((i) => input.bitSlice(i, i + 1).toString()).join()
    ).toString();
    expect(results.outputs.OutputA.toString()).toBe(expA);

    const mappingB = [8, 9, 1, 12, 3, 5];
    const expB = new BitString(
      mappingB.map((i) => input.bitSlice(i, i + 1).toString()).join()
    ).toString();
    expect(results.outputs.OutputB.toString()).toBe(expB);
  };
}

let input = BitString.low(13);

// Test with various input values to verify bit ordering is correct

// Willow currently can't handle JLS bundlers where the
// components are not consecutive.
test.skip(`Splitter: ${input}`, genTest(input));

/* Uncomment when splitter has been updated.
while (true) {
  test(`Splitter: ${input}`, genTest(input));
  input = input.add("0000000000011");
  // Overflow
  if (input.toString() == "0000000000001") {
    break;
  }
}
  */
