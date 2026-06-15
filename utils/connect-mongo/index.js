const mongodb = require('mongodb');
// Load the environmental variables defined in the '.env' file
const dotenv = require('dotenv').config({ quiet: true });

// Set the required environmental variables to connect to Mongo
const REQUIRED_ENV = [ 'DB_SERVER', 'DB_PORT', 'DB_NAME' ]
// Set the authentication enviornmental variables
// These variables must be either all passed or none passed
const AUTH_ENV = [ 'DB_AUTH_USER', 'DB_AUTH_PASSWORD', 'DB_AUTHSOURCE' ];

// Try to connect with the mongo db
const establishConnection = async () => {
    // Make sure we have the required enviornmental variables
    const missingRequiredEnv = REQUIRED_ENV.filter(env => !process.env[env]);
    if (missingRequiredEnv.length > 0) throw new Error(
        `Missing enviornmental variables for MongoDB authentication: ${missingRequiredEnv.join(', ')}\n` + 
        'Please define these variables in the ".env" file.');
    // Make sure we have either all or none of the authentication enviornmental variables
    const missingAuthEnv = AUTH_ENV.filter(env => !process.env[env]);
    if (missingAuthEnv.length > 0 && missingAuthEnv.length !== AUTH_ENV.length) throw new Error(
        `Missing enviornmental variables for MongoDB authentication: ${missingAuthEnv.join(', ')}\n` + 
        'Please define these variables in the ".env" file.\n' +
        'Alternatively, you may try to connect to Mongo without authentication.\n' +
        `To do so, please remove all the following variables from the ".env" file: ${AUTH_ENV.join(', ')}`);
    // Try to connect to mongo
    let client;
    try {
        client = await mongodb.MongoClient.connect(
            `mongodb://${process.env.DB_SERVER}:${process.env.DB_PORT}`,
            {
                auth: {
                    username: process.env.DB_AUTH_USER,
                    password: process.env.DB_AUTH_PASSWORD,
                },
                authSource: process.env.DB_AUTHSOURCE,
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
        );
        return client;
    } catch (error) {
        console.error('mongodb connection error');
        console.error(error);
        if (client && 'close' in client) client.close();
    }
};

module.exports = establishConnection();