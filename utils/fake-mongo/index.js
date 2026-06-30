// This library provides a fake mongo db which is useful to perform tests
// More information: https://github.com/nodkz/mongodb-memory-server
const mongodb = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set some fake projects to be uploaded
const project1 = require('./project_1.json');
const project2 = require('./project_2.json');
const reference1 = require('./reference_1.json');
const reference2 = require('./reference_2.json'); // entropies and epitopes removed for comodity

// Attempts to connect to a MongoDB URI. Returns the client on success, null on failure.
// Always closes the underlying topology on failure to avoid Jest open handle leaks.
const tryConnect = async (connectionString, options = {}) => {
    const tempClient = new mongodb.MongoClient(connectionString, { serverSelectionTimeoutMS: 2000, ...options });
    try {
        await tempClient.connect();
        return tempClient;
    } catch (error) {
        console.error(`Failed to connect to MongoDB at ${connectionString}:`, error);
        await tempClient.close(true).catch(() => {});
        return null;
    }
};

// Set up the fake server and return an available connection to this server
// DANI: This has not been maintained in a while, expect problems when trying
const establishFakeConnection = async () => {
    let client;
    try {
        // If there is a provided connection string, try to connect to it
        // WARNING: The string connection may be not valid
        const host = process.env.DB_SERVER || '127.0.0.1';
        const port = process.env.DB_PORT || '27017';
        const name = process.env.DB_NAME || 'mdposit';
        const connectionString = `mongodb://${host}:${port}/${name}?`;
        client = await tryConnect(connectionString);
        if (client) {
            console.log('The provided connection string is valid: Connected to Mongo Memory Server');
        } else {
            console.error('The provided connection string is not valid: There is no active Mongo Memory Server');
        }
        // In case  there is no connection string or it is not valid...
        // Create a new server and get the connection string
        if (!client) {
            console.log('A new instance of Mongo Memory Server will be created');
            // Note that .create() also starts the server (the constructor alone does not)
            const mongod = await MongoMemoryServer.create();
            // To debug mongodb memory server, set 'MONGOMS_DEBUG=1' in the '.env' file
            client = await tryConnect(await mongod.getUri());
            if (!client) throw new Error('Failed to connect to MongoMemoryServer');
            client._mongod = mongod; // Save the mongod instance for later cleanup
        }
        //console.log(mongod.getInstanceInfo());
        // Add data to the server to simulate the MDDB structure
        const db = client.db(process.env.DB_NAME);
        const projects = await db.createCollection('projects');
        await projects.insertOne(project1);
        await projects.insertOne(project2);
        const references = await db.createCollection('references');
        await references.insertOne(reference1);
        await references.insertOne(reference2);
        await db.createCollection('topologies');
        return client;
    } catch (error) {
        console.error('fake-mongodb connection error: ', error);
        if (client && 'close' in client) client.close();
    }
};

module.exports = establishFakeConnection();
