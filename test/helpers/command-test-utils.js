const path = require("node:path");

function resolveFromProject(modulePath) {
    return require.resolve(path.resolve(process.cwd(), modulePath));
}

function createFakeInteraction({
    user = { id: "user-1", username: "Tester", toString: () => "<@user-1>" },
    options = {},
} = {}) {
    const calls = {
        reply: [],
        deferReply: 0,
        editReply: [],
    };

    return {
        user,
        options: {
            getString(name) {
                return options[name] ?? null;
            },
        },
        calls,
        async reply(payload) {
            calls.reply.push(payload);
            if (payload?.fetchReply) {
                return { id: "message-1", ...payload };
            }

            return payload;
        },
        async deferReply() {
            calls.deferReply += 1;
        },
        async editReply(payload) {
            calls.editReply.push(payload);
            return { id: "message-1", ...payload };
        },
    };
}

function requireFresh(modulePath) {
    const resolvedPath = resolveFromProject(modulePath);
    delete require.cache[resolvedPath];
    return require(resolvedPath);
}

function mockModuleExports(modulePath, overrides) {
    const resolvedPath = resolveFromProject(modulePath);
    const moduleExports = require(resolvedPath);
    const originalValues = {};

    for (const [key, value] of Object.entries(overrides)) {
        originalValues[key] = moduleExports[key];
        moduleExports[key] = value;
    }

    return () => {
        for (const [key, value] of Object.entries(originalValues)) {
            moduleExports[key] = value;
        }
    };
}

module.exports = {
    createFakeInteraction,
    mockModuleExports,
    requireFresh,
};
