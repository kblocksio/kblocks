export default interface extern {
  cleanupSchema: (schema: Readonly<any>) => Readonly<any>,
  copy: (src: string, dest: string) => void,
  docker: (args: (readonly (string)[]), cwd?: (string) | undefined) => string,
  makeExecutable: (path: string) => void,
}
