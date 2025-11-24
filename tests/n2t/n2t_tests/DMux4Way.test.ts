import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/DMux4Way/DMux4Way.hdl",
    "DMux4Way",
  );
});

const truthTable = [
  ["000", "0000"], // in=0 sel=00
  ["001", "0000"], // in=0 sel=01
  ["010", "0000"], // in=0 sel=10
  ["011", "0000"], // in=0 sel=11
  ["100", "1000"], // in=1 sel=00
  ["101", "0100"], // in=1 sel=01
  ["110", "0010"], // in=1 sel=10
  ["111", "0001"], // in=1 sel=11
];

function genTest(
  inputs: { in: string; sel: string },
  outputs: { a: string; b: string; c: string; d: string }
) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.a.toString()).toStrictEqual(outputs.a);
    expect(actualOutputs.b.toString()).toStrictEqual(outputs.b);
    expect(actualOutputs.c.toString()).toStrictEqual(outputs.c);
    expect(actualOutputs.d.toString()).toStrictEqual(outputs.d);
  };
}

for (const row of truthTable) {
  const inputs = {
    in: row[0][0],
    sel: row[0].substring(1),
  };

  const outputs = {
    a: row[1][0],
    b: row[1][1],
    c: row[1][2],
    d: row[1][3],
  };

  test(
    `N2T DMux4Way [in = ${inputs.in}, sel = ${inputs.sel}] => [a = ${outputs.a}, b = ${outputs.b}, c = ${outputs.c}, d = ${outputs.d}]`,
    genTest(inputs, outputs),
  );
}
