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

import { loadProject } from "../src/CircuitLoader";
import { CircuitVerseLoader } from "../src/CircuitLoader/CircuitVerseLoader";
import { BitString } from "../src/BitString";

test("Multiple inputs with the same label", async () => {
  expect(async () => {
    await loadProject(CircuitVerseLoader, "tests/cv/DuplicateInputLabels.cv");
  }).rejects.toThrow("Multiple elements with the same label");
});

test("Multiple outputs with the same label", async () => {
  expect(async () => {
    await loadProject(CircuitVerseLoader, "tests/cv/DuplicateOutputLabels.cv");
  }).rejects.toThrow("Multiple elements with the same label");
});

test("Bad inputs and outputs", async () => {
  const project = await loadProject(CircuitVerseLoader, "tests/cv/Simple.cv");
  const circuit = project.getCircuitByName("Combinatorial");

  expect(() => circuit.run({ randomInput: BitString.low() })).toThrow(
    "No elements with the given label",
  );
});

test("Infinite loop", async () => {
  // const logger = new FileLogger('Circuit.log');
  // logger.setLevel(LogLevel.TRACE);

  const project = await loadProject(
    CircuitVerseLoader,
    "tests/cv/InfiniteLoop.cv",
  );
  const circuit = project.getCircuitByName("Main");

  expect(() => circuit.run({ inp1: "1" })).toThrow("step limit exceeded");
});

test("Combinatorial AND gate returns correct output (object input)", async () => {
  const project = await loadProject(CircuitVerseLoader, "tests/cv/Simple.cv");
  const circuit = project.getCircuitByName("Combinatorial");

  const res = circuit.run({ inp1: "1", inp2: "1" });

  // object-form output should contain the named output
  const outputs = res.outputs as any;
  expect(outputs).toHaveProperty("out1");
  expect(outputs.out1).not.toBeNull();
  expect((outputs.out1 as BitString).equals(BitString.high())).toBe(true);
  expect(typeof res.propagationDelay).toBe("number");
  expect(typeof res.steps).toBe("number");
});

test("Combinatorial AND gate returns correct output (array input)", async () => {
  const project = await loadProject(CircuitVerseLoader, "tests/cv/Simple.cv");
  const circuit = project.getCircuitByName("Combinatorial");

  // When providing an array, outputs are returned as an array
  const res = circuit.run(["1", "1"] as any);

  expect(Array.isArray(res.outputs)).toBe(true);
  // single output should be high
  expect((res.outputs as (BitString | null)[])[0]).not.toBeNull();
  expect(((res.outputs as (BitString | null)[])[0] as BitString).equals(BitString.high())).toBe(true);
});

test("Clocked circuit halts with provided halt condition", async () => {
  const project = await loadProject(CircuitVerseLoader, "tests/cv/Clock.cv");
  const circuit = project.getCircuitByName("Main");

  // Circuit should contain at least one clock
  expect(circuit.getClocks().length).toBeGreaterThan(0);

  // Halt after a small number of cycles to ensure run returns
  const res = circuit.run({}, (clockHigh, clockCycles) => {
    return clockCycles >= 1;
  });

  expect(res).toBeDefined();
  expect(typeof res.propagationDelay).toBe("number");
  expect(typeof res.steps).toBe("number");
});
