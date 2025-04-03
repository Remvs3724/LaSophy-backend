const path = require("path");
const Database = require("better-sqlite3");

// Define the correct path to create 'LaSophy.db' in 'backend/'
const dbPath = path.join(__dirname, "LaSophy.db");

// Create or open the database at the specified path
const db = new Database(dbPath);
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      bookId INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      year TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      collect INTEGER NOT NULL,
      views INTEGER NOT NULL
    );
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS bookcomments (
      commentId INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      cmt_book TEXT NOT NULL,
      parentId INTEGER,
      like INTEGER NOT NULL
    );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS userinf (
    userInfId INTEGER PRIMARY KEY AUTOINCREMENT,
    uni_code TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    bio TEXT ,
    ideology TEXT,
    collection TEXT
  );
`);
db.exec(`
CREATE TABLE IF NOT EXISTS likes (
  uni_code TEXT,
  pdf_path TEXT,
  username TEXT,
  PRIMARY KEY (uni_code, pdf_path),
  FOREIGN KEY (uni_code) REFERENCES users(uni_code),
  FOREIGN KEY (pdf_path) REFERENCES books(pdf_path)
);
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS recommend (
  uni_code TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  username TEXT NOT NULL,
  recommend TEXT NOT NULL
  );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
    admin_userId INTEGER PRIMARY KEY AUTOINCREMENT,
      uni_code TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      admin_user BOOLEAN NOT NULL
    );
    `);
  db.exec(`
      CREATE TABLE IF NOT EXISTS maps (
        mapId INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        year TEXT NOT NULL,
        pdf_path TEXT NOT NULL,
        img_path TEXT NOT NULL
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS books_new (
        bookId INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        year TEXT,
        pdf_path TEXT NOT NULL,
        img_path TEXT NOT NULL
      );
    `);
  db.close()