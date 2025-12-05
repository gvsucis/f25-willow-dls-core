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
    "tests/jls/Bundler.jls",
    "Bundler",
    logger
  );
});

function genTest(output: BitString) {
  return () => {
    const results = circuit.run({
      InputA0: output.bitSlice(0, 1),
      InputA1_2: output.bitSlice(1, 3),
      InputA3: output.bitSlice(3, 4),
      InputA4: output.bitSlice(4, 5),
      InputA5_7: output.bitSlice(5, 8),
    });

    expect(results.outputs.OutputA.toString()).toBe(output.toString());
  };
}

let input = BitString.low(8);

// Test with various input values to verify bit ordering is correct
while (true) {
  test(`Splitter: ${input}`, genTest(input));
  input = input.add("00000001");
  // Overflow
  if (input.toString() == "00000000") {
    break;
  }
}
