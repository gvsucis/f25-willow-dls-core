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
 * This Decoder has a single output bus. (In contrast, Decoder has many separate, one-bit outputs.)
 */
export class JLSDecoder extends CircuitElement {
  /** The width of the enable input for the decoder. */
  readonly ENABLE_WIDTH: number = 1;

  /**
   * Creates an instance of the `Decoder` class.
   *
   * @param input The input bus which provides the signal to decode.
   * @param output An array of bus elements representing the decoder's output.
   */
  constructor(input: CircuitBus, output: CircuitBus[]) {
    super("PriorityEncoderElement", [input], output);
  }

  resolve(): number {
    const [input] = this.getInputs();
    const output = this.getOutputs();
    const inputValue = input.getValue();

    if (!inputValue) {
      // If the input is not available, set all outputs to low
      for (let i = 0; i < output.length; i++) {
        output[i].setValue(BitString.low());
      }
      return this.getPropagationDelay();
    }

    const inputString = inputValue.toString();
    const inputWidth = input.getWidth();
    const inputNum = inputValue.toUnsigned();
    this.log(LogLevel.TRACE, `Input: [width=${inputWidth}] '${inputString}' -- ${inputNum}`);

    output[0].setValue(BitString.make(1 << inputNum), inputWidth);

    return this.getPropagationDelay();
  }
}
