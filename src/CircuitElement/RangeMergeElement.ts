// src/CircuitElement/RangeMergeElement.ts
import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * RangeMergeElement "writes" a multi-bit source bus into a contiguous range
 * [lo..hi] on a wider base bus.
 *
 * Conceptually: base[lo..hi] := source
 */
export class RangeMergeElement extends CircuitElement {
    private readonly source: CircuitBus;
    private readonly base: CircuitBus;
    private readonly lo: number;
    private readonly hi: number;

    constructor(source: CircuitBus, base: CircuitBus, lo: number, hi: number) {
        // Value flows from source -> base.
        super("RangeMerge", [source], [base]);
        this.source = source;
        this.base = base;
        this.lo = lo;
        this.hi = hi;
    }

   resolve(): number {
        const sourceVal = this.source.getValue();
        const lastUpdate = this.source.getLastUpdate();

        if (!sourceVal) {
            this.base.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }

        const baseWidth = this.base.getWidth();
        const sourceStr = sourceVal.toString();

        let baseStr = this.base.getValue()?.toString() ?? "".padStart(baseWidth, "0");

        if (baseStr.length !== baseWidth) {
            baseStr = new BitString(baseStr, baseWidth).toString();
        }

        const loN = Math.min(this.lo, this.hi);
        const hiN = Math.max(this.lo, this.hi);

        // Map N2T [lo..hi] (LSB=0) to internal substring indices (MSB=0)
        const start = baseWidth - 1 - hiN;
        const endExclusive = baseWidth - loN;

        if (start < 0 || endExclusive > baseWidth || start >= endExclusive) {
            throw new Error(
                `[RangeMergeElement] invalid slice lo=${this.lo}, hi=${this.hi} `
                + `mapped to [${start}, ${endExclusive}) for baseWidth=${baseWidth}`,
            );
        }

        if (sourceStr.length !== endExclusive - start) {
            throw new Error(
                `[RangeMergeElement] source width ${sourceStr.length} does not `
                + `match target range size ${endExclusive - start} (lo=${this.lo}, hi=${this.hi})`,
            );
        }

        const before = baseStr.substring(0, start);
        const after = baseStr.substring(endExclusive);

        const mergedStr = before + sourceStr + after;
        const merged = new BitString(mergedStr, baseWidth);

        this.base.setValue(merged, lastUpdate);
        return this.getPropagationDelay();
    }
}
