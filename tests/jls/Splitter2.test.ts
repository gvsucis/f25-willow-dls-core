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
    "tests/jls/Splitter2.jls",
    "Splitter2",
    logger
  );
});

function genTest(input: BitString) {
  return () => {
    const results = circuit.run({
      InputA: input,
    });

    expect(results.outputs.Output0.toString()).toBe(
      input.bitSlice(0, 1).toString()
    );
    expect(results.outputs.Output1.toString()).toBe(
      input.bitSlice(1, 2).toString()
    );
    expect(results.outputs.Output3_1.toString()).toBe(
      input.bitSlice(1, 4).toString()
    );
    expect(results.outputs.Output4.toString()).toBe(
      input.bitSlice(4, 5).toString()
    );
    expect(results.outputs.Output2_0.toString()).toBe(
      input.bitSlice(0, 3).toString()
    );
    expect(results.outputs.Output5.toString()).toBe(
      input.bitSlice(5, 6).toString()
    );
    expect(results.outputs.Output7_6.toString()).toBe(
      input.bitSlice(6, 8).toString()
    );
    expect(results.outputs.Output3.toString()).toBe(
      input.bitSlice(3, 4).toString()
    );
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
