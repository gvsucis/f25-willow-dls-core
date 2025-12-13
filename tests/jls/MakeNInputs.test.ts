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

import { beforeAll, describe, test, expect } from "@jest/globals";
import { BitString, Circuit, loadCircuit } from "../../src";
import { JLSLoader } from "../../src/CircuitLoader/JLSLoader";
import { FileLogger } from "../../src/CircuitLogger/FileLogger";
import { LogLevel } from "../../src/CircuitLogger";

let circuit: Circuit;

describe("N copies of input", () => {
  let logger: FileLogger;
  beforeAll(async () => {
    logger = new FileLogger("jls.log");
    logger.setLevel(LogLevel.TRACE);
  });

  for (const testName of ["MakeNInputs", "MakeNInputsMultiWire"]) {
    describe(` using ${testName} with`, () => {
      beforeAll(async () => {
        circuit = await loadCircuit(
          JLSLoader,
          `tests/jls/${testName}.jls`,
          testName,
          logger
        );
      });

      test("input 0", () => {
        const results = circuit.run({
          Input: "0",
        });
        expect(results.outputs.Output.toString()).toStrictEqual("0000");
      });

      test("input 1", () => {
        const results = circuit.run({
          Input: "1",
        });
        expect(results.outputs.Output.toString()).toStrictEqual("1111");
      });
    });
  }

  const splitName = `MakeNInputsSplit`;
  describe(` using ${splitName} with`, () => {
    beforeAll(async () => {
      circuit = await loadCircuit(
        JLSLoader,
        `tests/jls/${splitName}.jls`,
        splitName,
        logger
      );
    });

    test("inputs 0, 0", () => {
      const results = circuit.run({
        Input: "0",
        Input2: "0",
      });
      expect(results.outputs.Output.toString()).toStrictEqual("0000");
      expect(results.outputs.Output2.toString()).toStrictEqual("00");
      expect(results.outputs.Output3.toString()).toStrictEqual("00");
    });

    test("inputs 0, 1", () => {
      const results = circuit.run({
        Input: "0",
        Input2: "1",
      });
      expect(results.outputs.Output.toString()).toStrictEqual("0000");
      expect(results.outputs.Output2.toString()).toStrictEqual("00");
      expect(results.outputs.Output3.toString()).toStrictEqual("11");
    });

    test("input 1, 0", () => {
      const results = circuit.run({
        Input: "1",
        Input2: "0",
      });
      expect(results.outputs.Output.toString()).toStrictEqual("1111");
      expect(results.outputs.Output2.toString()).toStrictEqual("00");
      expect(results.outputs.Output3.toString()).toStrictEqual("11");
    });

    test("input 1, 1", () => {
      const results = circuit.run({
        Input: "1",
        Input2: "1",
      });
      expect(results.outputs.Output.toString()).toStrictEqual("1111");
      expect(results.outputs.Output2.toString()).toStrictEqual("11");
      expect(results.outputs.Output3.toString()).toStrictEqual("11");
    });
  });
});
