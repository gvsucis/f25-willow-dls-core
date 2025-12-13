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

import { CircuitBus } from "../CircuitBus";
import { CircuitElement } from "../CircuitElement";
import { BitString } from "../BitString";
import { LogLevel, logLevelString } from "../CircuitLogger";

/**
 * The Extender is what JLS calls a "make N copies" element. It simply takes
 * an input and duplicates it to all of the connected outputs. This is pretty
 * much identical to a {@link BufferGate}, and indeed could probably be implemented
 * using that element.
 */
export class Extend extends CircuitElement {
  constructor(input: CircuitBus, output: CircuitBus) {
    super("ExtendElement", [input], [output]);
    if (input.getWidth() !== 1) {
      throw new Error("Extend input must have width 1.");
    }
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [output] = this.getOutputs();

    const inputValue = input.getValue();
    if (inputValue !== null) {
      const value = inputValue.toUnsigned();
      if (value == 0) {
        output.setValue(BitString.low(output.getWidth()));
      } else if (value == 1) {
        output.setValue(BitString.high(output.getWidth()));
      } else {
        throw new Error(`Unexpected input to Extent:  ${input.toString()}`);
      }
    }
    return this.getPropagationDelay();
  }
}
