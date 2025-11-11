import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";

/**
 * 8-way 16-bit multiplexer for nand2tetris.
 *
 * Selects one of eight 16-bit inputs based on a 3-bit selector.
 *
 * Inputs: a[16], b[16], c[16], d[16], e[16], f[16], g[16], h[16], sel[3]
 * Outputs: out[16]
 * Function:
 *   if sel == 000 then out = a
 *   if sel == 001 then out = b
 *   if sel == 010 then out = c
 *   if sel == 011 then out = d
 *   if sel == 100 then out = e
 *   if sel == 101 then out = f
 *   if sel == 110 then out = g
 *   if sel == 111 then out = h
 */
export class Mux8Way16 extends CircuitElement {
  #selector: CircuitBus;

  constructor(
    a: CircuitBus,
    b: CircuitBus,
    c: CircuitBus,
    d: CircuitBus,
    e: CircuitBus,
    f: CircuitBus,
    g: CircuitBus,
    h: CircuitBus,
    output: CircuitBus,
    selector: CircuitBus
  ) {
    super("Mux8Way16Element", [a, b, c, d, e, f, g, h], [output]);
    this.#selector = selector;
  }

  resolve(): number {
    const [a, b, c, d, e, f, g, h] = this.getInputs();
    const [output] = this.getOutputs();

    const sel = this.#selector.getValue()?.toUnsigned() ?? 0;

    // Select the appropriate input based on selector value
    let selectedInput: CircuitBus;
    switch (sel) {
      case 0:
        selectedInput = a;
        break;
      case 1:
        selectedInput = b;
        break;
      case 2:
        selectedInput = c;
        break;
      case 3:
        selectedInput = d;
        break;
      case 4:
        selectedInput = e;
        break;
      case 5:
        selectedInput = f;
        break;
      case 6:
        selectedInput = g;
        break;
      case 7:
        selectedInput = h;
        break;
      default:
        throw new Error(`Mux8Way16 selector value ${sel} out of range (0-7)`);
    }

    output.setValue(selectedInput.getValue());

    return this.getPropagationDelay();
  }
}
