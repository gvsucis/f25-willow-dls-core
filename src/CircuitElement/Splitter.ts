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
import { LogLevel } from "../CircuitLogger";

/**
 * A bi-directional bus splitter that either combines multiple buses into
 * a single output bus, or splits a bus into multiple output buses.
 *
 * > [!NOTE]
 * > This element is complex and its implementation is convoluted. Despite its
 * > seemingly simple visual representation in circuit simulators such as
 * > CircuitVerse, this element has been the source of many bugs and many
 * > internal workarounds are necessary to make it work. If your circuit is
 * > misbehaving in this engine and it contains splitter elements, double check
 * > that the splitters are not causing issues. If they are, open a bug
 * > report.
 */
export class Splitter extends CircuitElement {
  #split: number[];
  #bitMappings: number[][] | undefined; // Optional: for non-contiguous bit extraction
  #prevInput: BitString | null;
  #prevOutputs: (BitString | null)[] | null;
  #lastOp: string | null;

  #bitStringsEqual(a: (BitString | null)[], b: (BitString | null)[]): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
      if (a[i] == b[i]) {
        continue;
      }

      if (a[i] == null || b[i] == null) {
        return false;
      }

      // Can't be null because they're not the same and neither are
      // null.
      if (!(a[i] as BitString).equals(b[i])) return false;
    }
    return true;
  }

  #nullOutputs(a: (BitString | null)[]): boolean {
    for (const x of a) {
      if (x == null) {
        return true;
      }
    }
    return false;
  }

  #earliestOutput(): number {
    let o = -1;
    for (const x of super.getOutputs().slice(1)) {
      if (x == null) {
        continue;
      }

      o = Math.min(o, x.getLastUpdate());
    }

    return o;
  }

  // Check if input and outputs are consistent (represent the same data)
  #areConsistent(input: BitString, outputs: (BitString | null)[]): boolean {
    if (this.#bitMappings) {
      // With bit mappings, we need to check if extracting the bits from input
      // matches what's in the outputs
      const inputWidth = input.getWidth();
      for (let s = 0; s < this.#split.length; s++) {
        let i = this.#split.length - 1 - s;
        const bitIndices = this.#bitMappings[i];
        const output = outputs[i];

        if (!output) return false;

        // Extract the expected bits from input
        // bitIndices contain logical bit positions (0 = LSB, 7 = MSB)
        // but BitString.substring uses string indices (0 = MSB, 7 = LSB)
        // so we need to convert: stringIndex = inputWidth - 1 - bitIndex
        // We iterate in reverse order to match the extraction order in #propOut
        let expectedValue = "";
        for (let j = bitIndices.length - 1; j >= 0; j--) {
          const bitIndex = bitIndices[j];
          const stringIndex = inputWidth - 1 - bitIndex;
          expectedValue += input.substring(stringIndex, stringIndex + 1).toString();
        }

        if (expectedValue !== output.toString()) {
          return false;
        }
      }
      return true;
    } else {
      // Without bit mappings, use the original sequential join check
      return input.equals(new BitString(outputs.join("")));
    }
  }

  #propOut(input: BitString) {
    this.log(LogLevel.TRACE, `Splitting input ${input} into outputs...`);

    if (this.#bitMappings) {
      // Non-contiguous bit extraction mode: use bit mappings
      const inputWidth = input.getWidth();
      for (const s in this.#split) {
        // IMPORTANT: CircuitVerse (and therefore this loader/constructor) stores
        // splitter output indices in a reversed order compared to the natural
        // left-to-right visual ordering. The implementation below intentionally
        // computes the output index as (length - 1 - s) so that the first slice
        // of the input (offset 0..n) maps to the last output bus in the
        // underlying bus array. This mirrors CircuitVerse's ordering so that
        // loaded circuits behave the same as they did in the source tool.
        //
        // Do not change this mapping lightly — it's an intentional compatibility
        // decision and tests rely on this behavior.
        let i = this.#split.length - 1 - parseInt(s);

        const bitIndices = this.#bitMappings[i];
        const output = super.getOutputs().slice(1)[i];

        this.log(LogLevel.TRACE, `Extracting bits ${bitIndices.join(',')} from ${input}...`);

        // Extract the specified bits and concatenate them
        // bitIndices contain logical bit positions (0 = LSB, 7 = MSB)
        // but BitString.substring uses string indices (0 = MSB, 7 = LSB)
        // so we need to convert: stringIndex = inputWidth - 1 - bitIndex
        // We iterate in reverse order so that higher bit indices appear first in the output string
        let value = "";
        for (let j = bitIndices.length - 1; j >= 0; j--) {
          const bitIndex = bitIndices[j];
          const stringIndex = inputWidth - 1 - bitIndex;
          value += input.substring(stringIndex, stringIndex + 1).toString();
        }

        const bitString = new BitString(value);
        this.log(
          LogLevel.TRACE,
          `Got value: ${bitString} (width = ${bitString.getWidth()})`,
        );
        this.log(LogLevel.TRACE, `Output bus width: ${output.getWidth()}`);
        output.setValue(bitString);
      }
    } else {
      // Sequential contiguous extraction mode (original behavior)
      let off = 0;

      for (const s in this.#split) {
        let i = this.#split.length - 1 - parseInt(s);

        const split = this.#split[i];
        const output = super.getOutputs().slice(1)[i];

        this.log(LogLevel.TRACE, `Computing ${input}[${off}:${off + split}]...`);
        const value = input.substring(off, off + split);
        this.log(
          LogLevel.TRACE,
          `Got value: ${value} (width = ${value.getWidth()})`,
        );
        this.log(LogLevel.TRACE, `Output bus width: ${output.getWidth()}`);
        output.setValue(value);

        off += split;
      }
    }

    this.#lastOp = "propOut";
  }

  #propIn() {
    const outputs = super.getOutputs().slice(1).map((o) => o.getValue());
    this.log(LogLevel.TRACE, `Combining outputs ${outputs} into input...`);

    if (this.#bitMappings) {
      // Non-contiguous bit combination mode: use bit mappings
      // We need to determine the input width by finding the maximum bit index
      let maxBitIndex = -1;
      for (const bitIndices of this.#bitMappings) {
        for (const bitIndex of bitIndices) {
          maxBitIndex = Math.max(maxBitIndex, bitIndex);
        }
      }
      const inputWidth = maxBitIndex + 1;

      // Initialize input bits array with null (to detect conflicts)
      const inputBits: (string | null)[] = new Array(inputWidth).fill(null);

      // Place each output's bits into the input array
      for (let s in this.#split) {
        let i = this.#split.length - 1 - parseInt(s); // Same reversal as propOut
        const bitIndices: number[] = this.#bitMappings[i];
        const output = super.getOutputs().slice(1)[i];
        const val = output.getValue();

        if (!val) {
          this.log(LogLevel.TRACE, `Output ${i} has no value, using zeros.`);
          continue;
        }

        if (val.getWidth() != bitIndices.length) {
          throw new Error(
            `SplitterElement bus width error: Output ${i} received ${val.getWidth()}-bit value but expected ${bitIndices.length} bits.`,
          );
        }

        // Map each bit from the output to its position in the input
        // The output string is in reverse order (highest bit index first) to match #propOut
        const valStr = val.toString();
        for (let j = 0; j < bitIndices.length; j++) {
          const bitIndex = bitIndices[bitIndices.length - 1 - j];
          const bitValue = valStr[j];

          if (inputBits[bitIndex] !== null && inputBits[bitIndex] !== bitValue) {
            throw new Error(
              `SplitterElement conflict: Bit ${bitIndex} is being set to both '${inputBits[bitIndex]}' and '${bitValue}'.`,
            );
          }

          inputBits[bitIndex] = bitValue;
        }
      }

      // Build the final input string (high to low bit order)
      let newOut = "";
      for (let i = inputWidth - 1; i >= 0; i--) {
        newOut += inputBits[i] ?? "0";
      }

      this.log(LogLevel.TRACE, `Propagating '${newOut}' to input.`);
      this.getInputs()[0].setValue(new BitString(newOut));
    } else {
      // Sequential contiguous combination mode (original behavior)
      let newOut = "";

      for (let s in this.#split) {
        let i = this.#split.length - 1 - parseInt(s);
        const split = this.#split[i];
        const output = super.getOutputs().slice(1)[i];
        const val = output.getValue();

        if (output.getWidth() != split) {
          throw new Error(
            `SplitterElement bus width error: Received ${output.getWidth()}-bit value on ${split}-bit bus.`,
          );
        }

        newOut += val?.toString() ?? BitString.low(output.getWidth());
      }

      this.log(LogLevel.TRACE, `Propagating '${newOut}' to input.`);
      this.getInputs()[0].setValue(new BitString(newOut));
    }

    this.#lastOp = "propIn";
  }

  #getValues(): [BitString | null, (BitString | null)[]] {
    const input: BitString | null = this.getInputs()[0].getValue();
    const outputs: (BitString | null)[] = super
      .getOutputs()
      .slice(1)
      .map((o) => o.getValue());
    return [input, outputs];
  }

  /**
   * Construct a new splitter. Remember that even though we use the terminology
   * `input` and `outputs`, this element is bi-directional and will work both ways.
   * The former of which referring to the single bus that
   * gets split and the latter referring to the multiple buses that will get combined.
   * @param split An array of numbers detailing the bus splits. The number of
   * elements in this array is the number of buses that the input bus will be
   * split into (and should thus match the length of `outputs`) and the values
   * are the number of bits wide each split is. The sum of these should equal
   * the width of the `input` bus (unless bitMappings is provided for non-contiguous splits).
   * @param input The input bus to split into the outputs.
   * @param outputs The output bus to combine into the inputs.
   * @param bitMappings Optional array of bit index arrays. If provided, enables non-contiguous
   * bit extraction where each output can extract arbitrary bits from the input. Each inner
   * array contains the bit indices (from high to low) for that output.
   */
  constructor(split: number[], input: CircuitBus, outputs: CircuitBus[], bitMappings?: number[][]) {
    // This is a bi-directional element, so it's behavior depends on whether
    // the input changed (split input into outputs) or an output changed (combine
    // outputs into input.)
    // Therefore, both the inputs and outputs function as the other as well
    // and must be connected as such so that resolve() is called when either
    // the inputs OR the outputs change. We will detect which happened in
    // the abomination which is below.
    super("SplitterElement", [input, ...outputs], [input, ...outputs]);

    if (split.length != outputs.length) {
      throw new Error(
        `Splitter: split array must be the same length as the outputs array: ${split.length} != ${outputs.length}`,
      );
    }

    if (bitMappings && bitMappings.length !== split.length) {
      throw new Error(
        `Splitter: bitMappings array must be the same length as split array: ${bitMappings.length} != ${split.length}`,
      );
    }

    // Note: The sum of split widths can exceed input.getWidth() when bits are duplicated
    // across multiple outputs (when using bitMappings). We only check that split array
    // length matches outputs length. Individual bit extraction bounds are checked during resolve().

    this.#split = split;
    this.#bitMappings = bitMappings;
    this.#prevInput = null;
    this.#prevOutputs = null;
    this.#lastOp = null;
  }

  resolve(): number {
    const [input, outputs] = this.#getValues();

    this.log(LogLevel.TRACE, `Input: ${input}`);
    this.log(LogLevel.TRACE, `Outputs: ${outputs}`);

    // if (!this.#prevInput || !this.#prevOutputs) {
    //   this.#prevInput = input;
    //   this.#prevOutputs = outputs;
    // }

    if (!input) {
      if (!this.#nullOutputs(outputs)) {
        this.log(LogLevel.TRACE, `No input, but all outputs are present.`);
        this.#propIn();
        [this.#prevInput, this.#prevOutputs] = this.#getValues();
      } else {
        this.log(
          LogLevel.TRACE,
          `No input value and there are missing output values.`,
        );
        this.log(LogLevel.TRACE, `Doing nothing.`);
      }
    } else {
      if (this.#nullOutputs(outputs)) {
        this.log(
          LogLevel.TRACE,
          `Input provided, and some outputs are missing.`,
        );
        this.#propOut(input);
        [this.#prevInput, this.#prevOutputs] = this.#getValues();
      } else {
        this.log(
          LogLevel.TRACE,
          `Both input and all outputs are present, seeing what changed...`,
        );

        // First check if input and outputs are already consistent
        // If they are, we don't need to propagate anything
        if (this.#areConsistent(input, outputs)) {
          this.log(LogLevel.TRACE, `Input and outputs are consistent, NOT propagating.`);
          [this.#prevInput, this.#prevOutputs] = this.#getValues();
          return this.getPropagationDelay();
        }

        const inputUpdate = this.getInputs()[0].getLastUpdate();
        const outputUpdate = this.#earliestOutput();

        const inputChanged = this.#prevInput === null || !input.equals(this.#prevInput);
        const outputsChanged = this.#prevOutputs === null || !this.#bitStringsEqual(
          this.#prevOutputs,
          outputs,
        );

        this.log(
          LogLevel.TRACE,
          `Inputs changed: ${inputChanged}, last update = ${inputUpdate}`,
        );
        this.log(
          LogLevel.TRACE,
          `Outputs changed: ${outputsChanged}, last update = ${outputUpdate}`,
        );

        if (inputChanged && inputUpdate < outputUpdate) {
          this.#propOut(input);
        } else if (outputsChanged && outputUpdate < inputUpdate) {
          this.#propIn();
        } else {
          if (inputUpdate == outputUpdate) {
            throw new Error(
              `Splitter contention: Both inputs and outputs were set and have changed at the same time but are inconsistent: ${input} vs ${JSON.stringify(outputs)}`,
            );
          } else {
            if (inputUpdate > outputUpdate) {
              this.#propOut(input);
            } else if (outputUpdate > inputUpdate) {
              this.#propIn();
            }
          }
        }

        // Always update prev values after this path, to ensure subsequent calls
        // don't incorrectly think values changed
        [this.#prevInput, this.#prevOutputs] = this.#getValues();
      }
    }

    return this.getPropagationDelay();
  }

  reset() {
    // Manually clear all buses because the Splitter uses both inputs and outputs
    // as bidirectional buses, and the parent reset() only clears based on getOutputs()
    // which returns different buses depending on #lastOp
    this.getInputs().forEach((i) => i.setValue(null, -1));
    super.getOutputs().forEach((o) => o.setValue(null, -1));

    this.#prevInput = null;
    this.#prevOutputs = null;
    this.#lastOp = null;
  }

  getOutputs(): CircuitBus[] {
    if (this.#lastOp == "propIn") {
      return [this.getInputs()[0]];
    } else {
      return super.getOutputs().slice(1);
    }
  }
}
