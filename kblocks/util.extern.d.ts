export default interface extern {
  copy: (src: string, dest: string) => void,
  docker: (args: (readonly (string)[]), cwd?: (string) | undefined) => string,
  generateSchemaFromWingStruct: (source: string, structName: string) => Readonly<any>,
  makeExecutable: (path: string) => void,
  mergeEnv: (resource: ResourceProps, global: OperatorsConfig) => ResourceProps,
}
export interface ResourceDefinition {
  readonly annotations?: (Readonly<Record<string, string>>) | undefined;
  readonly categories?: ((readonly (string)[])) | undefined;
  readonly group: string;
  /**  The icon to use for the resource (must have a "heroicon://" prefix) */
  readonly icon: string;
  readonly kind: string;
  readonly listKind?: (string) | undefined;
  readonly outputs?: ((readonly (string)[])) | undefined;
  readonly plural: string;
  /**  The location of the README file (usually this would be "README.md") */
  readonly readme: string;
  readonly schema?: (Readonly<any>) | undefined;
  readonly shortNames?: ((readonly (string)[])) | undefined;
  readonly singular?: (string) | undefined;
  readonly version: string;
}
export interface Permission {
  readonly apiGroups: (readonly (string)[]);
  readonly resources: (readonly (string)[]);
  readonly verbs: (readonly (string)[]);
}
export interface ResourceOperator {
  readonly env?: (Readonly<Record<string, string>>) | undefined;
  readonly envConfigMaps?: (Readonly<Record<string, string>>) | undefined;
  readonly envSecrets?: (Readonly<Record<string, string>>) | undefined;
  readonly namespace: string;
  readonly permissions: (readonly (Permission)[]);
}
export interface ResourceProps {
  readonly definition: ResourceDefinition;
  readonly engine: string;
  readonly operator: ResourceOperator;
}
export interface OperatorsConfig {
  readonly env?: (Readonly<Record<string, string>>) | undefined;
  readonly envConfigMaps?: (Readonly<Record<string, string>>) | undefined;
  readonly envSecrets?: (Readonly<Record<string, string>>) | undefined;
}