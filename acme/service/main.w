bring "./service.w" as service;

new service.Service({
  repo: {
    name: "test-repo",
    owner: "monadaco",
    public: true,
  },
});
