import { beforeAll, test, expect } from "@jest/globals";
import { Circuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";
import fs from "fs";
import path from "path";

let circuit: Circuit;

beforeAll(async () => {
  // Create a resolver that can find HDL files in the same directory
  const baseDir = "tests/n2t/nand_up_chips";
  const resolver = async (chipName: string) => {
    const hdlPath = path.join(baseDir, `${chipName}.hdl`);
    if (fs.existsSync(hdlPath)) {
      return fs.createReadStream(hdlPath);
    }
    return null;
  };

  const loader = new Nand2TetrisLoader(resolver);
  const stream = fs.createReadStream("tests/n2t/nand_up_chips/FullAdder.hdl");
  const project = await loader.load(stream);
  circuit = project.getCircuitByName("FullAdder");
});

const truthTable = [
  ["000", "00"],
  ["001", "10"],
  ["010", "10"],
  ["011", "01"],
  ["100", "10"],
  ["101", "01"],
  ["110", "01"],
  ["111", "11"],
];

function genTest(inputs: { a: string; b: string; c: string }, outputs: { sum: string; carry: string }) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.sum.toString()).toStrictEqual(outputs.sum);
    expect(actualOutputs.carry.toString()).toStrictEqual(outputs.carry);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0][0],
    b: row[0][1],
    c: row[0][2],
  };

  const outputs = {
    sum: row[1][0],
    carry: row[1][1],
  };

  test(
    `N2T FullAdder [a = ${inputs.a}, b = ${inputs.b}, c = ${inputs.c}] => [sum = ${outputs.sum}, carry = ${outputs.carry}]`,
    genTest(inputs, outputs),
  );
}
