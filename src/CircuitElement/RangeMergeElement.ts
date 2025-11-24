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
        const lo = Math.min(this.lo, this.hi);
        const hi = Math.max(this.lo, this.hi);

        if (lo < 0 || hi >= baseWidth) {
            throw new Error(
                `[RangeMergeElement] range [${lo}..${hi}] out of bounds for baseWidth=${baseWidth}`,
            );
        }

        const sliceWidth = hi - lo + 1;
        const sourceStr = sourceVal.toString();

        if (sourceStr.length !== sliceWidth) {
            throw new Error(
                `[RangeMergeElement] Expected source width=${sliceWidth}, got width=${sourceVal.getWidth()}`,
            );
        }

        const existing = this.base.getValue();
        let baseStr = existing
            ? existing.toString()
            : BitString.low(baseWidth).toString();

        if (baseStr.length !== baseWidth) {
            baseStr = new BitString(baseStr, baseWidth).toString();
        }

        const before = baseStr.substring(0, lo);
        const after = baseStr.substring(hi + 1);

        const mergedStr = before + sourceStr + after;
        const merged = new BitString(mergedStr, baseWidth);

        this.base.setValue(merged, lastUpdate);
        return this.getPropagationDelay();
    }
}
