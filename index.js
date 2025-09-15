const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define schemas and models
// *TODO* if this was for real, pull out to separate files
let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  _id: { type: String, required: true }
});

let User = mongoose.model('User', userSchema);

let exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

let Exercise = mongoose.model('Exercise', exerciseSchema);









app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
 
  let newUser = new User({
    username: req.body.username,
    _id: new mongoose.Types.ObjectId().toString()
  });

  newUser.save((err, savedUser) => {
    if (err) return res.status(500).json({error: 'Error saving user'});
    res.json({username: savedUser.username, _id: savedUser._id});
  });
  
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  
  let userId = req.params._id;
  let { description, duration, date } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  if (!date) {
    date = new Date();
  } else {
    date = new Date(date);
  }

  let newExercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date 
  });

  newExercise.save((err, savedExercise) => {
    if (err) return res.status(500).json({error: 'Error saving exercise'});
    User.findById(userId, (err, user) => {
      if (err || !user) return res.status(400).json({error: 'User not found'});
      res.json({
        _id: user._id,
        username: user.username,
        date: savedExercise.date.toDateString(),
        duration: savedExercise.duration,
        description: savedExercise.description
      });
    });
  });
  
});


app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const filter = { userId: user._id };
  const dateFilter = {};
  if (from) {
    const d = new Date(from + 'T00:00:00.000Z');
    if (!Number.isNaN(d.getTime())) dateFilter.$gte = d;
  }
  if (to) {
    const d = new Date(to + 'T23:59:59.999Z');
    if (!Number.isNaN(d.getTime())) dateFilter.$lte = d;
  }
  if (Object.keys(dateFilter).length) filter.date = dateFilter;

  let q = Exercise.find(filter).select('description duration date').sort({ date: 1 });
  if (limit) {
    const n = parseInt(limit, 10);
    if (!Number.isNaN(n)) q = q.limit(n);
  }

  const exercises = await q.exec();

  res.json({
    _id: user._id.toString(),
    username: user.username,
    count: exercises.length,
    log: exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  });
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).json({error: 'Error retrieving users'});
    res.json(users.map(u => ({username: u.username, _id: u._id})));
  });
});






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
