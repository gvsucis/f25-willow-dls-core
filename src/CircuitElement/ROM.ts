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

import { BitString } from "../BitString";
import { CircuitBus } from "../CircuitBus";
import { CircuitElement } from "../CircuitElement";

export class ROM extends CircuitElement {
  #data: BitString[];

  constructor(
    address: CircuitBus,
    output: CircuitBus,
    enable: CircuitBus,
    data: BitString[],
    size: number,
  ) {
    super("ROMElement", [address, enable], [output]);

    data.forEach((str) => {
      if (str.getWidth() != 8) {
        throw new Error("The ROM only supports 8-byte data words.");
      }
    });

    this.#data = new Array(size).fill(BitString.low(8));
    data.forEach((value, index) => {
      this.#data[index] = value.truncate(8).pad(8);
    });
  }

  resolve(): number {
    const [address, enable] = this.getInputs();
    const [output] = this.getOutputs();

    if (BitString.high().equals(enable.getValue())) {
      const idx = address.getValue()?.toUnsigned();
      if (idx !== undefined && idx !== null && idx < this.#data.length) {
        const value = this.#data[idx];
        output.setValue(value);
      }
    }

    return this.getPropagationDelay();
  }
}
