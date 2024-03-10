import { Db, MongoClient } from "mongodb";

const url = process.env.COSMOS_DB_CONNECTION_STRING;
const userDBNAME = process.env.COSMOS_DB_USER_DBNAME;

// let cachedUserDb: Db | null = null;

export const connectToUserDatabase = async () => {
  const client = new MongoClient(url);
  // if (cachedUserDb) {
  //   return cachedUserDb;
  // }

  await client.connect();
  const database = client.db(userDBNAME);
  // cachedUserDb = database;

  return database;
};
