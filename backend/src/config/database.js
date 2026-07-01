const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '../../database/db.json');

const defaultData = {
  users: [],
  downloads: [],
  uploads: []
};

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

const initDb = async () => {
  await db.read();
  if (!db.data.users) db.data.users = [];
  if (!db.data.downloads) db.data.downloads = [];
  if (!db.data.uploads) db.data.uploads = [];
  await db.write();
  console.log('Connected to lowdb database');
};

initDb();

module.exports = db;
