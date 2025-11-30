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

import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";
import { LogLevel } from "../CircuitLogger";

/**
 * The output element is the primary means of interfacing with a circuit. It
 * allows you to extract data out of the circuit being evaluated, and makes provisions
 * for reading bus values directly in code. Well-crafted circuits will contain ample
 * outputs which can be populated with values and retrieved by label via {@link Circuit.run}.
 * See the documentation for that method for the normal way of retrieving outputs from
 * circuits.s
 */
export class Output extends CircuitElement {
  #index: number;
  #label: string;
  #value: BitString | null;

  /**
   * Constructs an instance of the OutputElement class.
   *
   * @param index The index of the output element. See {@link Input}'s `index`
   * parameter.
   * @param label A string representing the label of the output element.
   * See {@link Input}'s `label` parameter.
   * @param input The input bus connected to this output element.
   */
  constructor(index: number, label: string, input: CircuitBus) {
    super("OutputElement", [input], []);
    this.#index = index;
    this.#label = label;
    this.#value = null;
  }

  /**
   * Get the index of this output.
   * @returns The index number that was passed into the constructor.
   */
  getIndex(): number {
    return this.#index;
  }

  /**
   * Set the index of this output. This function is used to ensure the proper
   * functionality of subcircuits.
   *
   * > [!WARNING]
   * > This is intended to be used by {@link CircuitLoader}s only.
   * > You should never call this function from code outside of a loader
   * > implementation.
   *
   * @param index The new index.
   * @returns This output for method chaining.
   */
  setIndex(index: number): Output {
    this.#index = index;
    return this;
  }

  /**
   * Get the label of this output.
   * @returns The label string that was passed into the constructor.
   */
  getLabel(): string {
    return this.#label;
  }

  /**
   * Set a new value for this output, which will be back-propagated to the
   * circuit. This is a hack that allows users to set the state of sequential
   * circuits properly.
   * @param value The value to send to the input buses.
   */
  initialize(value: BitString) {
    this.#value = value;

    const inputs = this.getInputs();
    inputs.forEach((i) => i.setValue(value));
    this.log(
      LogLevel.TRACE,
      `Directly received new value ${value}, propagated to inputs.`,
    );
  }

  /**
   * Get this output's value.
   * @returns The value on the input bus connected to this output.
   */
  getValue(): BitString | null {
    return this.#value;
  }

  resolve(): number {
    const inputs = this.getInputs();
    inputs.forEach((i) => {
      const val = i.getValue();
      this.#value = val;
    });
    return this.getPropagationDelay();
  }

  getOutputs(): CircuitBus[] {
    return this.getInputs();
  }

  reset() {
    this.#value = null;
  }
}
