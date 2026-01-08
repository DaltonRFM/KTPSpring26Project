// <!-- Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server.

// // <!-- Connect to DB -->
// // *****************************************************

// ---- Handlebars / views setup ----
app.engine(
  "hbs",
  handlebars.engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials") // optional, only if you create partials
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));


// // database configuration
// const dbConfig = {
//   host: 'db', // the database server
//   port: 5432, // the database port
//   database: process.env.POSTGRES_DB, // the database name
//   user: process.env.POSTGRES_USER, // the user account to connect with
//   password: process.env.POSTGRES_PASSWORD, // the password of the user account
// };

// const db = pgp(dbConfig);

// // test database
// db.connect()
//   .then(obj => {
//     console.log('Database connection successful'); // In the docker logs
//     obj.done(); // success, release the connection;
//   })
//   .catch(error => {
//     console.log('ERROR:', error.message || error);
//   });

// // <!--  App Settings -->
// // *****************************************************

// // Register `hbs` as our view engine using its bound `engine()` function.
// app.engine('hbs', hbs.engine);
// app.set('view engine', 'hbs');
// app.set('views', path.join(__dirname, 'views'));
// app.use(bodyParser.json()); 

// // initialize session variables
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     saveUninitialized: false,
//     resave: false,
//   })
// );

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

// <!-- API Routes -->
// *****************************************************

app.get('/', (req, res) => {
  res.redirect('/login'); // redirect to log in if errors
});

app.get('/login', (req, res) => {
  res.render('pages/login'); // this one should work I think
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

//add more in the future for each page

// DB connection (example)
const db = pgp({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// POST /register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.none(
      "INSERT INTO users(username, password_hash) VALUES($1, $2)",
      [username, hash]
    );
    res.redirect("/login");
  } catch (err) {

    res.status(400).render("pages/register", { error: "Username already exists." });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.oneOrNone(
      "SELECT username, password_hash FROM users WHERE username = $1",
      [username]
    );

    if (!user) {
      return res.status(401).render("pages/login", { error: "Invalid username or password." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).render("pages/login", { error: "Invalid username or password." });
    }

    req.session.user = { username: user.username };
    res.redirect("home"); // wherever you want after login
  } catch (err) {
    res.status(500).render("pages/login", { error: "Server error. Try again." });
  }
});



// <!--  Start Server-->
// *****************************************************

// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');