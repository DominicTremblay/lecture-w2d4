const express = require('express');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const port = 8080;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
// app.use(cookieParser());
app.use(
  cookieSession({
    name: 'session',
    keys: ['ManualLabor'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

const users = {
  'eb849b1f-4642-4c16-a77b-71ac2f90996f': {
    id: 'eb849b1f-4642-4c16-a77b-71ac2f90996f',
    name: 'Kent Cook',
    email: 'really.kent.cook@kitchen.com',
    password: 'cookinglessons',
  },
  '1dc937ec-7d71-4f37-9560-eef9d998a9b7': {
    id: '1dc937ec-7d71-4f37-9560-eef9d998a9b7',
    name: 'Phil A. Mignon',
    email: 'good.philamignon@steak.com',
    password: 'meatlover',
  },
};

const quotesDb = {
  'd9424e04-9df6-4b76-86cc-9069ca8ee4bb': {
    id: 'd9424e04-9df6-4b76-86cc-9069ca8ee4bb',
    quote: 'It’s not a bug. It’s an undocumented feature!',
  },
  '27b03e95-27d3-4ad1-9781-f4556c1dee3e': {
    id: '27b03e95-27d3-4ad1-9781-f4556c1dee3e',
    quote:
      'Software Developer” – An organism that turns caffeine into software',
  },
  '5b2cdbcb-7b77-4b23-939f-5096300e1100': {
    id: '5b2cdbcb-7b77-4b23-939f-5096300e1100',
    quote:
      'If debugging is the process of removing software bugs, then programming must be the process of putting them in',
  },
  '917d445c-e8ae-4ed9-8609-4bf305de8ba8': {
    id: '917d445c-e8ae-4ed9-8609-4bf305de8ba8',
    quote:
      'A user interface is like a joke. If you have to explain it, it’s not that good.',
  },
  '4ad11feb-a76a-42ae-a1c6-8e30dc12c3fe': {
    id: '4ad11feb-a76a-42ae-a1c6-8e30dc12c3fe',
    quote: 'If at first you don’t succeed; call it version 1.0',
  },
};

const quoteComments = {
  '70fcf8bd-6cb0-42f3-9887-77aa9db4f0ac': {
    id: '70fcf8bd-6cb0-42f3-9887-77aa9db4f0ac',
    comment: 'So awesome comment!',
    quoteId: 'd9424e04-9df6-4b76-86cc-9069ca8ee4bb',
  },
};

const quoteList = () => {
  const quotes = {};

  for (const quoteId in quotesDb) {
    quotes[quoteId] = quotesDb[quoteId];
    quotes[quoteId].comments = Object.keys(quoteComments)
      .filter(commentId => quoteComments[commentId].quoteId === quoteId)
      .map(commentId => quoteComments[commentId]);
  }
  return quotes;
};

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.redirect('/quotes');
});

// END POINTS

// logPayload Middleware
function logPayload(req, res, next) {
  console.log(`Method: ${req.method} Url: ${req.url}`);
  console.log('URL Params: ', req.params);
  console.log('Query Params: ', req.query);
  console.log('Body Payload: ', req.body);
  next();
}

function findUser(email) {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return false;
}

function authenticateUser(email, password) {
  // for in

  // filter
  const [userId] = Object.keys(users).filter(
    id =>
      users[id].email === email &&
      bcrypt.compareSync(password, users[id].password)
  );

  return userId;
}

function addNewUser(name, email, password) {
  // create a new user object in db
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, saltRounds);
  users[id] = {
    id,
    name,
    email,
    password: hash,
  };
  console.log(users[id]);
  return id;
}

// app.use(logPayload);

app.get('/login', (req, res) => {
  // Retrieve the current user
  const { userId } = req.session;
  // const userId = req.session.userId;
  const currentUser = users[userId];
  res.render('login', { currentUser });
});

app.post('/login', (req, res) => {
  // get the info from the form
  const { email, password } = req.body;
  // Authenticate the user
  const userId = authenticateUser(email, password);

  // if authenticate
  if (userId) {
    req.session.userId = userId;
    // set the cookie -> store the id
    res.redirect('/quotes');
  } else {
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  const { userId } = req.session;
  const currentUser = users[userId];
  res.render('register', { currentUser });
});

app.post('/register', (req, res) => {
  //Get data from the form
  const { name, email, password } = req.body;
  // check if user does't already exist
  const user = findUser(email);

  if (!user) {
    // add new user
    const userId = addNewUser(name, email, password);
    // set cookie
    req.session.userId = userId;
    res.redirect('/quotes');
  } else {
    // redirect
    res.status(401).send('User already exists!');
  }
});

// DISPLAY A LIST OF QUOTES

app.get('/quotes', (req, res) => {
  const quotes = Object.values(quoteList());

  // Retrieve the current user
  const { userId } = req.session;
  // const userId = req.session.userId;
  const currentUser = users[userId];

  res.render('quotes', { quotes, currentUser });
});

app.get('/quotes.json', (req, res) => {
  const quotes = Object.values(quoteList());
  res.json(quotes);
});

// DISPLAY THE FORM TO CREATE A NEW QUOTE
// quote_new

app.get('/quotes/new', (req, res) => {
  res.render('quote_new');
});

// CREATE QUOTE
app.post('/quotes', (req, res) => {
  const { quote } = req.body;
  const id = uuidv4();
  quotesDb[id] = {
    id,
    quote,
  };
  res.redirect('/quotes');
});

// DISPLAY FORM TO EDIT QUOTE
app.get('/quotes/:id/', (req, res) => {
  const { id } = req.params;
  const quote = quotesDb[id];
  res.render('quote_show', { quote });
});

// UPDATE A QUOTE
app.put('/quotes/:id', (req, res) => {
  const { id } = req.params;
  const { quote } = req.body;
  quotesDb[id].quote = quote;
  res.redirect('/quotes');
});

// DISPLAY THE FORM TO CREATE A NEW COMMENT
app.get('/quotes/:id/comments/new', (req, res) => {
  const { id: quoteId } = req.params;

  res.render('comment_new', { quoteId });
});

// CREATE A COMMENT
app.post('/quotes/:id/comments', (req, res) => {
  const { id: quoteId } = req.params;
  const { comment } = req.body;
  const id = uuidv4();
  quoteComments[id] = {
    id,
    comment,
    quoteId,
  };
  res.redirect('/quotes');
});

// DISPLAY THE FORM TO EDIT COMMENT
app.get('/comments/:id/update', (req, res) => {
  const { id } = req.params;
  res.render('comment_show', { content: quoteComments[id] });
});

// UPDATE THE COMMENT
app.put('/comments/:id', (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  quoteComments[id].comment = comment;

  res.redirect('/quotes');
});

// DELETE A QUOTE
app.delete('/quotes/:id', (req, res) => {
  const { id } = req.params;
  delete quotesDb[id];
  res.redirect('/quotes');
});

// DELETE A COMMENT
app.delete('/comments/:id', (req, res) => {
  const { id } = req.params;
  delete quoteComments[id];
  res.redirect('/quotes');
});

// DELETE THE COOKIE
app.delete('/login', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.listen(port, () => console.log(`Express server running on port ${port}`));
