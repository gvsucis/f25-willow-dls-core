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
  const logger = new FileLogger("unusedSplitter.log");
  logger.setLevel(LogLevel.TRACE);

  circuit = await loadCircuit(
    JLSLoader,
    "tests/jls/SplitterWithUnusedOutputs3.jls",
    "SplitterWithunusedOutputs3",
    logger
  );
});

function genTest(input: BitString) {
  return () => {
    const results = circuit.run({
      Input: input,
    });

    const outputs = results.outputStrings;

    expect(outputs.Output1_2).toBe(input.bitSlice(1, 3).toString());
    expect(outputs.Output5).toBe(input.bitSlice(5, 6).toString());
  };
}

test(
  "Splitter with unused outputs 00000000",
  genTest(new BitString("00000000"))
);

test(
  "Splitter with unused outputs 00000010",
  genTest(new BitString("00000010"))
);

test(
  "Splitter with unused outputs 00000100",
  genTest(new BitString("00000100"))
);

test(
  "Splitter with unused outputs 00100010",
  genTest(new BitString("00100010"))
);

test(
  "Splitter with unused outputs 00100100",
  genTest(new BitString("00100100"))
);
