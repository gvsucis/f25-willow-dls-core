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

import { Circuit } from "../Circuit";
import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { LogLevel } from "../CircuitLogger";
import { Clock } from "./Clock";

/**
 * Most circuit simulation libraries support the concept of "subcircuits," which are
 * a way to embed an entire circuit as an element in another circuit. This class implements
 * that functionality, allowing an entire {@link Circuit} to be added as an element in another
 * {@link Circuit}.
 */
export class SubCircuit extends CircuitElement {
  #circuit: Circuit;

  /**
   * Create a new subcircuit.
   * @param circuit The circuit to convert to a circuit element.
   * @param inputs The subcircuit inputs.
   * @param outputs The subcircuit outputs.
   */
  constructor(circuit: Circuit, inputs: CircuitBus[], outputs: CircuitBus[]) {
    super("SubCircuitElement", inputs, outputs);
    this.#circuit = circuit;
  }

  resolve(): number {
    this.log(
      LogLevel.DEBUG,
      `Executing Subcircuit: [id = ${this.#circuit.getId()}, name = '${this.#circuit.getName()}']`,
    );

    const inputs = this.getInputs();
    const outputs = this.getOutputs();

    const result = this.#circuit.resolve(inputs.map((node) => node.getValue()));

    result.outputs.forEach((value, index) => {
      outputs[index].setValue(value);
    });

    this.log(
      LogLevel.DEBUG,
      `Subcircuit complete: [id = ${this.#circuit.getId()}, name = '${this.#circuit.getName()}']`,
      result,
    );

    return result.propagationDelay;
  }

  /**
   * Retrieve an array of all the clocks in this subcircuit, recursively.
   * @returns All of the clocks in this circuit, so they can be set properly by the
   * {@link Circuit.run} function.
   */
  getClocks(): Clock[] {
    return this.#circuit.getClocks();
  }
}
