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
import { BitString, Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";
import { FileLogger } from "../../../src/CircuitLogger/FileLogger";
import { LogLevel } from "../../../src/CircuitLogger";

let circuit: Circuit;

beforeAll(async () => {
  // const logger = new FileLogger("jls.log");
  // logger.setLevel(LogLevel.TRACE);

  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/HalfAdder.hdl",
    "HalfAdder",
    // logger,
  );
});

const truthTable = [
  ["00", "00"],
  ["01", "10"],
  ["10", "10"],
  ["11", "01"],
];

function genTest(inputs, outputs) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.sum.toString()).toStrictEqual(outputs.sum);
    expect(actualOutputs.carry.toString()).toStrictEqual(outputs.carry);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0][0],
    b: row[0][1],
  };

  const outputs = {
    sum: row[1][0],
    carry: row[1][1],
  };

  test(
    `N2T Half Adder(non-builtin) [a = ${inputs.a}, b = ${inputs.b}] => [sum = ${outputs.sum}, carry = ${outputs.carry}]`,
    genTest(inputs, outputs),
  );
}
