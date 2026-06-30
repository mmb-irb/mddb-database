// Tests for the fake mongo connection helper
// The module exports the promise returned by establishFakeConnection()
const connectionPromise = require('./index');

describe('fake-mongo establishFakeConnection', () => {
    let client;

    // Establishing the connection spins up a Mongo Memory Server, which can be slow
    // (it may need to download the mongod binary on the first run)
    beforeAll(async () => {
        client = await connectionPromise;
    }, 5000);

    afterAll(async () => {
        if (client && 'close' in client) await client.close();
        if (client && client._mongod) await client._mongod.stop();
    });

    it('resolves to a connected mongo client', async () => {
        expect(client).toBeDefined();
        // A connected client should answer a ping
        const admin = client.db(process.env.DB_NAME).admin();
        const result = await admin.ping();
        expect(result.ok).toBe(1);
    });

    it('seeds the expected collections', async () => {
        const db = client.db(process.env.DB_NAME);
        const collections = await db.listCollections().toArray();
        const names = collections.map(collection => collection.name);
        expect(names).toEqual(expect.arrayContaining(['projects', 'references', 'topologies']));
    });

    it('seeds the fake projects and references', async () => {
        const db = client.db(process.env.DB_NAME);
        expect(await db.collection('projects').countDocuments()).toBe(2);
        expect(await db.collection('references').countDocuments()).toBe(2);
    });
});
