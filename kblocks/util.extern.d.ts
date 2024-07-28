export default interface extern {
  copy: (src: string, dest: string) => void,
  docker: (args: (readonly (string)[]), cwd?: (string) | undefined) => string,
  generateSchemaFromWingStruct: (source: string, structName: string) => Readonly<any>,
  makeExecutable: (path: string) => void,
}
