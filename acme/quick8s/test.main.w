bring util;
bring "./cluster.w" as c;

let name = util.env("QUICK8S_INSTANCE_NAME");

new c.Q8sCluster() as name;