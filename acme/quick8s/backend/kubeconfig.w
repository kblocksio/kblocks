bring fs;
bring util;

struct ClusterProps {
  name: str;
  hostname: str;
}

pub class Util {
  pub static inflight renderKubeConfig(base64: str, props: ClusterProps): Json {
    let name = props.name;
    let tmpdir = fs.mkdtemp();
    let tmpfile = fs.join(tmpdir, "kubeconfig.yaml");
    fs.writeFile(tmpfile, util.base64Decode(base64));
    let kubeconfig = MutJson fs.readYaml(tmpfile)[0];
    fs.remove(tmpdir);

    let clusterCfg = kubeconfig.get("clusters").getAt(0);
    clusterCfg.get("cluster").set("server", "https://{props.hostname}:7443");
    clusterCfg.get("cluster").set("insecure-skip-tls-verify", true);
    clusterCfg.get("cluster").delete("certificate-authority-data");
    clusterCfg.set("name", name);

    kubeconfig.set("contexts", [
      {
        "name": name,
        "context": {
          "cluster": name,
          "user": name
        },
      }
    ]);

    kubeconfig.set("current-context", name);

    let userCfg = kubeconfig.get("users").getAt(0);
    userCfg.set("name", name);
    
    return Json.deepCopy(kubeconfig);
  }
}