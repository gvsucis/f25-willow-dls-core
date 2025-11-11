import { CircuitBus } from "../CircuitBus";
import { Multiplexer } from "./Multiplexer";

/**
 * A 16-bit 2-way multiplexer.
 *
 * In nand2tetris, Mux16 selects between two 16-bit inputs based on a selector bit.
 *
 * Inputs: a[16], b[16], sel (1 bit)
 * Output: out[16]
 * Function: if (sel == 0) out = a else out = b
 */
export class Mux16 extends Multiplexer {
  constructor(
    a: CircuitBus,      // First 16-bit input
    b: CircuitBus,      // Second 16-bit input
    output: CircuitBus, // 16-bit output
    selector: CircuitBus // 1-bit selector
  ) {
    // Pass [a, b] as inputs array, [output] as outputs array, and selector as control signal
    super([a, b], [output], selector);
  }
}
