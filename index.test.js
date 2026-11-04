// Tests for the database handler
// Note that jest sets NODE_ENV to 'test', so the database connection is a fake mongo
const { databaseConnection, Database } = require('./index');
const { FIRST_ACCESSION_CODE, ALPHANUMERIC } = require('./utils/constants');

// Set the expected value of a new accession counter
const zeroCount = parseInt(FIRST_ACCESSION_CODE, ALPHANUMERIC) - 1;

afterAll(async () => {
    const client = await databaseConnection;
    if (client && 'close' in client) await client.close();
    if (client && client._mongod) await client._mongod.stop();
});

describe.each([false, true])('Database setup (isGlobal: %s)', isGlobal => {
    let databases;

    beforeAll(async () => {
        const client = await databaseConnection;
        // Use a new database so we start with no collections at all
        // Note that the fake mongo has already set some collections in its own database
        // Note also that jest gives every test file its own copy of the environment
        process.env.DB_NAME = `setup_test_${isGlobal ? 'global' : 'local'}_${Date.now()}`;
        // Set several handlers to simulate several processes (e.g. loaders) using the same database
        databases = Array.from({ length: 4 }, () => new Database(client, isGlobal));
    }, 60000);

    afterEach(() => jest.restoreAllMocks());

    afterAll(async () => {
        if (databases) await databases[0].db.dropDatabase();
    });

    it('succeeds when run by several processes at the same time on an empty database', async () => {
        await Promise.all(databases.map(database => database.setup()));
        // Make sure all configured collections and indexes are there
        const currentCollections = await databases[0].db.listCollections().toArray();
        const currentCollectionNames = currentCollections.map(collection => collection.name);
        for (const [ collectionKey, collectionConfig ] of Object.entries(databases[0].COLLECTIONS)) {
            expect(currentCollectionNames).toContain(collectionConfig.name);
            if (!collectionConfig.indexes) continue;
            const currentIndexesData = await databases[0][collectionKey].indexes();
            const currentIndexes = currentIndexesData.map(indexData => indexData.key);
            expect(currentIndexes).toEqual(expect.arrayContaining(collectionConfig.indexes));
        }
        // Make sure there is one and only one accession counter
        const counters = await databases[0].counters.find({ accessions: true }).toArray();
        expect(counters).toHaveLength(1);
        expect(counters[0].last).toBe(zeroCount);
    });

    it('does not reset an existing accession counter', async () => {
        await databases[0].counters.updateOne({ accessions: true }, { $inc: { last: 5 } });
        await databases[1].setup();
        const counters = await databases[0].counters.find({ accessions: true }).toArray();
        expect(counters).toHaveLength(1);
        expect(counters[0].last).toBe(zeroCount + 5);
    });

    it('creates a single accession counter when several processes find it missing at the same time', async () => {
        await databases[0].counters.deleteMany({ accessions: true });
        // Hold the counter creation of every process until all of them get there
        // Otherwise they rarely reach mongo at the same exact time, which is when duplicates happen
        let releaseCounters;
        const countersReleased = new Promise(resolve => { releaseCounters = resolve; });
        let waitingCounters = 0;
        for (const database of databases) {
            const updateOne = database.counters.updateOne.bind(database.counters);
            jest.spyOn(database.counters, 'updateOne').mockImplementation(async (...args) => {
                waitingCounters += 1;
                if (waitingCounters === databases.length) releaseCounters();
                await countersReleased;
                return updateOne(...args);
            });
        }
        await Promise.all(databases.map(database => database.setup()));
        const counters = await databases[0].counters.find({ accessions: true }).toArray();
        expect(counters).toHaveLength(1);
        expect(counters[0].last).toBe(zeroCount);
    });
});
