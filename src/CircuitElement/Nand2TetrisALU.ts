import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * Nand2Tetris ALU (Arithmetic Logic Unit).
 *
 * The ALU computes a function on two 16-bit inputs based on 6 control bits.
 *
 * Inputs:
 *   - x[16], y[16]: 16-bit data inputs
 *   - zx: zero the x input
 *   - nx: negate the x input (bitwise NOT)
 *   - zy: zero the y input
 *   - ny: negate the y input (bitwise NOT)
 *   - f: function (1 = add, 0 = and)
 *   - no: negate the output (bitwise NOT)
 *
 * Outputs:
 *   - out[16]: 16-bit output
 *   - zr: 1 if out == 0, 0 otherwise
 *   - ng: 1 if out < 0 (MSB is 1 in 2's complement), 0 otherwise
 *
 * Processing order:
 * 1. if zx then x = 0
 * 2. if nx then x = !x
 * 3. if zy then y = 0
 * 4. if ny then y = !y
 * 5. if f then out = x + y else out = x & y
 * 6. if no then out = !out
 */
export class Nand2TetrisALU extends CircuitElement {
  #zx: CircuitBus;
  #nx: CircuitBus;
  #zy: CircuitBus;
  #ny: CircuitBus;
  #f: CircuitBus;
  #no: CircuitBus;

  constructor(
    x: CircuitBus,
    y: CircuitBus,
    zx: CircuitBus,
    nx: CircuitBus,
    zy: CircuitBus,
    ny: CircuitBus,
    f: CircuitBus,
    no: CircuitBus,
    out: CircuitBus,
    zr: CircuitBus,
    ng: CircuitBus
  ) {
    super("Nand2TetrisALUElement", [x, y], [out, zr, ng]);
    this.#zx = zx;
    this.#nx = nx;
    this.#zy = zy;
    this.#ny = ny;
    this.#f = f;
    this.#no = no;
  }

  resolve(): number {
    const [xBus, yBus] = this.getInputs();
    const [outBus, zrBus, ngBus] = this.getOutputs();

    let x = xBus.getValue() ?? BitString.low(16);
    let y = yBus.getValue() ?? BitString.low(16);

    // Get control bits
    const zxVal = this.#zx.getValue()?.toUnsigned() ?? 0;
    const nxVal = this.#nx.getValue()?.toUnsigned() ?? 0;
    const zyVal = this.#zy.getValue()?.toUnsigned() ?? 0;
    const nyVal = this.#ny.getValue()?.toUnsigned() ?? 0;
    const fVal = this.#f.getValue()?.toUnsigned() ?? 0;
    const noVal = this.#no.getValue()?.toUnsigned() ?? 0;

    // Step 1: if zx then x = 0
    if (zxVal) {
      x = BitString.low(16);
    }

    // Step 2: if nx then x = !x
    if (nxVal) {
      x = x.not();
    }

    // Step 3: if zy then y = 0
    if (zyVal) {
      y = BitString.low(16);
    }

    // Step 4: if ny then y = !y
    if (nyVal) {
      y = y.not();
    }

    // Step 5: if f then out = x + y, else out = x & y
    let out: BitString;
    if (fVal) {
      out = x.add(y);
    } else {
      out = x.and(y);
    }

    // Step 6: if no then out = !out
    if (noVal) {
      out = out.not();
    }

    // Set output
    outBus.setValue(out);

    // Set zr flag: 1 if out == 0
    const isZero = out.toUnsigned() === 0;
    zrBus.setValue(new BitString(isZero ? "1" : "0", 1));

    // Set ng flag: 1 if out < 0 (check MSB in 2's complement)
    // In 2's complement, the MSB (bit 15) indicates sign
    const isNegative = out.msb(1).toString() === "1";
    ngBus.setValue(new BitString(isNegative ? "1" : "0", 1));

    return this.getPropagationDelay();
  }
}
