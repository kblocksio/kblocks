import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// inputs must be defined in the values.schema.json file and read as Pulumi config.
const myValue = config.require("myValue");

// outputs must be defined in kblock.yaml and exported as a variable.
export const myOutput = myValue;
