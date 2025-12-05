// src/CircuitElement/BitMergeElement.ts
import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";


export class BitMergeElement extends CircuitElement {
    private readonly source: CircuitBus;
    private readonly base: CircuitBus;
    private readonly bitIndex: number;

    constructor(source: CircuitBus, base: CircuitBus, bitIndex: number) {
        // Value flows from source -> base.
        super("BitMerge", [source], [base]);
        this.source = source;
        this.base = base;
        this.bitIndex = bitIndex;
    }

    resolve(): number {
        const sourceVal = this.source.getValue();
        const lastUpdate = this.source.getLastUpdate();

        // If source is undefined, propagate null to the base to match
        // the "unknown propagates" semantics of BitSliceElement.
        if (!sourceVal) {
            this.base.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }

        const baseWidth = this.base.getWidth();
        const sourceStr = sourceVal.toString(); // width should be 1

        if (sourceStr.length !== 1) {
            throw new Error(
                `[BitMergeElement] expected 1-bit source, got length=${sourceStr.length}`,
            );
        }

        let baseStr = this.base.getValue()?.toString() ?? "".padStart(baseWidth, "0");

        if (baseStr.length !== baseWidth) {
            baseStr = new BitString(baseStr, baseWidth).toString();
        }

        // Map Nand2Tetris index (LSB = 0) → internal index (MSB = 0)
        const idxFromLeft = baseWidth - 1 - this.bitIndex;

        if (idxFromLeft < 0 || idxFromLeft >= baseWidth) {
            throw new Error(
                `[BitMergeElement] bitIndex=${this.bitIndex} (mapped=${idxFromLeft}) out of range for baseWidth=${baseWidth}`,
            );
        }

        const before = baseStr.substring(0, idxFromLeft);
        const after = baseStr.substring(idxFromLeft + 1);

        const mergedStr = before + sourceStr + after;
        const merged = new BitString(mergedStr, baseWidth);

        this.base.setValue(merged, lastUpdate);
        return this.getPropagationDelay();
    }
}
