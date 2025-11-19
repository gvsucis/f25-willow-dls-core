import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/DMux8Way.hdl",
    "DMux8Way",
  );
});

const truthTable = [
  ["0000", "10000000"],
  ["0001", "01000000"],
  ["0010", "00100000"],
  ["0011", "00010000"],
  ["0100", "00001000"],
  ["0101", "00000100"],
  ["0110", "00000010"],
  ["0111", "00000001"],
  ["1000", "00000000"],
  ["1001", "00000000"],
  ["1010", "00000000"],
  ["1011", "00000000"],
  ["1100", "00000000"],
  ["1101", "00000000"],
  ["1110", "00000000"],
  ["1111", "00000000"],
];

function genTest(
  inputs: { in: string; sel: string },
  outputs: { a: string; b: string; c: string; d: string; e: string; f: string; g: string; h: string }
) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.a.toString()).toStrictEqual(outputs.a);
    expect(actualOutputs.b.toString()).toStrictEqual(outputs.b);
    expect(actualOutputs.c.toString()).toStrictEqual(outputs.c);
    expect(actualOutputs.d.toString()).toStrictEqual(outputs.d);
    expect(actualOutputs.e.toString()).toStrictEqual(outputs.e);
    expect(actualOutputs.f.toString()).toStrictEqual(outputs.f);
    expect(actualOutputs.g.toString()).toStrictEqual(outputs.g);
    expect(actualOutputs.h.toString()).toStrictEqual(outputs.h);
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
    e: row[1][4],
    f: row[1][5],
    g: row[1][6],
    h: row[1][7],
  };

  test(
    `N2T DMux8Way [in = ${inputs.in}, sel = ${inputs.sel}] => [a=${outputs.a}, b=${outputs.b}, c=${outputs.c}, d=${outputs.d}, e=${outputs.e}, f=${outputs.f}, g=${outputs.g}, h=${outputs.h}]`,
    genTest(inputs, outputs),
  );
}
