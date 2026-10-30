// Connect to the mongo database and return the connection
// Alternatively, in 'test' context, connect to a local fake mongo database and return the connection
const databaseConnection = process.env.NODE_ENV === 'test'
    ? require('./utils/fake-mongo')
    : require('./utils/connect-mongo');

// Import collections configuration
const {
    LOCAL_COLLECTIONS,
    GLOBAL_COLLECTIONS,
    REFERENCES,
    QUERY_FIELDS,
    PATH_QUERY_FIELDS,
    OPTIONS_QUERY_FIELDS,
    STANDARD_TRAJECTORY_FILENAME,
    STANDARD_STRUCTURE_FILENAME,
    STANDARD_BOX_FILENAME,
    FIRST_ACCESSION_CODE,
    ACCESSION_CHARACTERS_LIMIT,
    ALPHANUMERIC,
} = require('./utils/constants');

// Import auxiliar functions
const { areObjectsIdentical } = require('./utils/auxiliar');

// Import additional functions
const countOptions = require('./utils/count-options');

// GridFSBucket manages the saving of files bigger than 16 Mb, splitting them into 4 Mb fragments (chunks)
const { GridFSBucket, ObjectId } = require('mongodb');

// Set the database handler class
class Database {
    constructor (client, isGlobal) {
        if (!client) throw new Error('No client');
        if (isGlobal !== false && isGlobal !== true)
            throw new Error('The "isGlobal" argument must be either true or false.');
        // Store inputs
        this.client = client;
        this.isGlobal = isGlobal;
        // Get the mongo specific database
        this.db = this.client.db(process.env.DB_NAME);
        // Set the mongo collections depending of it we are aiming for the global database
        this.COLLECTIONS = this.isGlobal ? GLOBAL_COLLECTIONS : LOCAL_COLLECTIONS;
        // Set all collections as values of the database itself
        for (const [ collectionKey, collectionConfig ] of Object.entries(this.COLLECTIONS)) {
            this[collectionKey] = this.db.collection(collectionConfig.name);
        }
        // Save additional constants just to have them available more easily
        this.QUERY_FIELDS = QUERY_FIELDS;
        this.PATH_QUERY_FIELDS = PATH_QUERY_FIELDS;
        this.OPTIONS_QUERY_FIELDS = OPTIONS_QUERY_FIELDS;
        this.STANDARD_TRAJECTORY_FILENAME = STANDARD_TRAJECTORY_FILENAME;
        this.STANDARD_STRUCTURE_FILENAME = STANDARD_STRUCTURE_FILENAME;
        this.STANDARD_BOX_FILENAME = STANDARD_BOX_FILENAME;
        this.FIRST_ACCESSION_CODE = FIRST_ACCESSION_CODE;
        this.ACCESSION_CHARACTERS_LIMIT = ACCESSION_CHARACTERS_LIMIT;
        this.ALPHANUMERIC = ALPHANUMERIC;
        // Get the available references in a single string, which may be used for logs
        this.REFERENCES = REFERENCES;
        this.AVAILABLE_REFERENCES = Object.keys(this.REFERENCES).join(', ');
        // Save some internal values
        this._bucket = undefined;
    };

    // Get the grid fs bucket
    get bucket () {
        // Return the internal value if it is already declared
        if (this._bucket !== undefined) return this._bucket;
        // Instantiate the bucket otherwise
        this._bucket = new GridFSBucket(this.db);
        return this._bucket;
    }

    // Setup the database by creating and indexing the configured collections
    // This function is shared by the loader and the monitor
    setup = async () => {
        // Check the collections already existing in the database
        const currentCollections = await this.db.listCollections().toArray()
        const currentCollectionNames = currentCollections.map(collection => collection.name);
        // Iterate over the configured collections
        for await (const [collectionKey, collectionConfig] of Object.entries(this.COLLECTIONS)) {
            // If the collection already exists then do nothing
            if (currentCollectionNames.includes(collectionConfig.name)) {
                // Get the configuration indexes for this collection
                const configIndexes = collectionConfig.indexes;
                // If there are no configuration indexes at all then we are done
                if (!configIndexes) continue;
                // Get the current collection indexes
                const currentIndexesData = await this[collectionKey].indexes();
                const currentIndexes = currentIndexesData.map(indexData => indexData.key);
                // Iterate the expected indexes
                for await (const configIndex of configIndexes) {
                    // Make sure the index exists among the current indexes
                    let found = false;
                    for (const collectionIndex of currentIndexes) {
                        // Compare indices
                        if (areObjectsIdentical(collectionIndex,  configIndex)) {
                            found = true;
                            break;
                        }
                    }
                    // If the index does not exist then we create it
                    if (!found) {
                        console.log(`🛠️  Setting a missing index in "${collectionKey}" collection: ${JSON.stringify(configIndex)}`);
                        await this[collectionKey].createIndex(configIndex);
                    }
                }
                // Proceed to the next collection
                continue;
            }
            console.log(`🛠️  Setting up ${collectionKey} collection`);
            // Create the collection
            // Note that another process (e.g. another loader) may be setting up the database at the same time
            // If so, the collection may have been created after we listed the current collections
            try {
                await this.db.createCollection(collectionConfig.name);
            } catch (error) {
                // If the collection already exists then it is fine and we still set its indices
                // Error code 48 stands for 'NamespaceExists'
                if (error.code !== 48) throw error;
            }
            // Set some indices if specified to accelerate specific queries
            if (collectionConfig.indexes) {
                for await (const index of collectionConfig.indexes) {
                    await this[collectionKey].createIndex(index);
                }
            }
        }
        // Make sure there is a counter document to track the last issued accession
        // Set the "zero" count for the counter
        // Note that this is not zero since we want the first issued accession to star with 'A'
        const zeroCount = parseInt(FIRST_ACCESSION_CODE, ALPHANUMERIC) - 1;
        // Create the counter only if it does not exist yet, in a single operation
        // Note that another process may be setting up the database at the same time
        // The upsert alone does not prevent both processes from inserting a counter
        // For this reason new counters get a fixed id, so mongo rejects the second one
        // Counters created before this fix keep their random id, but they are found anyway
        try {
            const result = await this.counters.updateOne(
                { accessions: true },
                { $setOnInsert: { _id: 'accessions', last: zeroCount } },
                { upsert: true });
            if (result.upsertedCount > 0) console.log('🛠️  Created new accession counter');
        } catch (error) {
            // If another process has just created the counter then it is fine
            // Error code 11000 stands for 'DuplicateKey'
            if (error.code !== 11000) throw error;
        }
    };

    // Set some filters in the project query depending on the context in a single query object
    getProjectsFilter = (isGlobal, isProduction, hostCollection, withAccession) => {
        // Set the published filter according to the host configuration
        // If the environment is tagged as "production" only published projects are returned from mongo
        // Note that in the global API we target projects flagged as 'posited' instead of 'published'
        const productionTargetFlag = isGlobal ? 'posited' : 'published';
        const publishedFilter = Object.seal(isProduction ? { [productionTargetFlag]: true } : {});
        // Set the collection filter according to the request URL
        // This filter is applied over the project metadata 'collections', nothing to do with mongo collections
        // Note that unknown hosts (e.g. 'localhost:8000') will get all simulations, with no filter
        const collectionFilter = Object.seal(hostCollection ? { 'metadata.COLLECTIONS': hostCollection } : {});
        // Set the starting base filter
        // This is a strict filter and it is applied even when a specific project is requested
        const baseFilter = { ...publishedFilter, ...collectionFilter };
        // If a specific project was requested then the base filter is returned as it is
        // Note that the filter above are mandatory for "privacy" reasons
        // In the sense that they are not to be skipped even if the requests asks for a specific accession
        // The filters below, in the other hand, are to discard projects which are not important
        // And they could make the query fail if the user asks for a booked/deleted entry
        if (withAccession) return baseFilter;
        // If no specific project was requested then the filter is extended
        // We hide booked and deleted projects
        // Note that these are not hidden when asking specifically for them
        // Set the booked filter to remove booked projects from the query
        // These are projects which are not yet uploaded
        const bookedFilter = Object.seal({ booked: { $ne: true } });
        // Set the deleted filter to remove deleted projects from the query
        // These are projects which were deleted but the entry is kept to preserve the persistent id
        const deletedFilter = Object.seal({ deleted: { $ne: true } });
        // Return all filters together, including also the publsihed filter
        return { ...baseFilter, ...bookedFilter, ...deletedFilter };
    };

    // Add additional functions
    countOptions = (query, fields, shouldCountMds, useSavedCounts) =>
        countOptions(this, query, fields, shouldCountMds, useSavedCounts);

    // Close the connection to mongo and delete this handler
    close = () => {
        this.client.close();
        delete this;
    }
    // Expose the ObjectId class to be used by other modules
    static ObjectId = ObjectId
}

module.exports = {
    databaseConnection,
    Database,
}