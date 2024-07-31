bring "./" as lib;

log(Json.stringify(Json.parse(lib.WorkloadSpec.schema().asStr()), indent: 2));