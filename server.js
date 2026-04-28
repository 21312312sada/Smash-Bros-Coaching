const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('smashbrossecret'));

const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

async function loadUsers() {
  let data = await kv.get('users');
  if (!data) {
    data = fs.readFileSync(path.join(process.cwd(), 'users.json'), 'utf8');
    await kv.set('users', data);
  }
  return JSON.parse(data);
}

async function loadLessons() {
  let data = await kv.get('lessons');
  if (!data) {
    data = fs.readFileSync(path.join(process.cwd(), 'lessons.json'), 'utf8');
    await kv.set('lessons', data);
  }
  return JSON.parse(data);
}

async function saveUsers(users) {
  await kv.set('users', JSON.stringify(users));
}

async function saveLessons(lessons) {
  await kv.set('lessons', JSON.stringify(lessons));
}

app.use(async (req, res, next) => {
  const token = req.cookies.session;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'smashbrossecret');
      const users = await loadUsers();
      req.user = users.find(u => u.name === decoded.userId);
    } catch (e) {
      // invalid token
    }
  }
  next();
});
  switch(level) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    case 'coach': return 4;
    case 'admin': return 5;
    case 'all': return 0; // all can see
    default: return 0;
  }
}

function getAuthorityForClass(className) {
  switch(className) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    case 'coach': return 4;
    case 'admin': return 5;
    default: return 1;
  }
}

app.get('/', (req, res) => {
  res.render('login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const users = await loadUsers();
  const { name, password } = req.body;
  const user = users.find(u => u.name === name);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.name }, 'smashbrossecret');
    res.cookie('session', token, { httpOnly: true });
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.user) return res.redirect('/');
  const user = req.user;
  let practices = '';
  if (user.class === 'beginner') {
    practices = 'Recommended for beginners: Practice basic combos and spacing.';
  } else if (user.class === 'intermediate') {
    practices = 'Recommended for intermediates: Work on advanced techniques and mind games.';
  } else if (user.class === 'advanced') {
    practices = 'Recommended for advanced: Focus on competitive strategies and counterplay.';
  } else if (user.class === 'coach') {
    practices = 'As a coach, you can access admin features.';
  } else if (user.class === 'admin') {
    practices = 'As an admin, you have full access to all features.';
  }
  res.render('dashboard', { user, practices });
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const users = await loadUsers();
  const { name, password, confirmPassword, hasSwitch, yearLevel } = req.body;
  if (password !== confirmPassword) {
    return res.render('signup', { error: 'Passwords do not match' });
  }
  const existingUser = users.find(u => u.name === name);
  if (existingUser) {
    return res.render('signup', { error: 'Username already exists' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    name,
    password: hashedPassword,
    hasSwitch: hasSwitch === 'on',
    yearLevel: parseInt(yearLevel),
    class: 'beginner',
    authority: 1
  };
  users.push(newUser);
  await saveUsers(users);
  res.redirect('/');
});

app.get('/admin', async (req, res) => {
  if (!req.user || req.user.authority < 4) return res.send('Access denied');
  const users = await loadUsers();
  const usersWithAuthority = users.map(u => ({ ...u, authority: getAuthorityForClass(u.class) }));
  res.render('admin', { users: usersWithAuthority, canEditAuthority: req.user.authority >= 5 });
});

app.post('/admin/edit', async (req, res) => {
  if (!req.user || req.user.authority < 4) return res.send('Access denied');
  const users = await loadUsers();
  const { name, class: newClass } = req.body;
  const user = users.find(u => u.name === name);
  if (user) {
    user.class = newClass;
    // Authority is always tied to class
    user.authority = getAuthorityForClass(newClass);
    await saveUsers(users);
  }
  res.redirect('/admin');
});

app.post('/change-password', async (req, res) => {
  if (!req.user) return res.redirect('/');
  const users = await loadUsers();
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = users.find(u => u.name === req.user.name);
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.render('dashboard', { user: req.user, practices: '', error: 'Current password is incorrect' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.render('dashboard', { user: req.user, practices: '', error: 'New passwords do not match' });
  }
  user.password = bcrypt.hashSync(newPassword, 10);
  await saveUsers(users);
  // Update req.user
  req.user = user;
  res.render('dashboard', { user, practices: '', success: 'Password changed successfully' });
});

app.get('/lessons', async (req, res) => {
  if (!req.user) return res.redirect('/');
  const lessons = await loadLessons();
  const userAuthority = req.user.authority;
  const filteredLessons = lessons.filter(lesson => {
    const lessonAuthority = getAuthorityForLevel(lesson.level);
    return lessonAuthority === 0 || userAuthority >= lessonAuthority;
  });
  res.render('lessons', { lessons: filteredLessons, user: req.user, canAdd: req.user.authority >= 4 });
});

app.post('/lessons/add', async (req, res) => {
  if (!req.user || req.user.authority < 4) return res.send('Access denied');
  const lessons = await loadLessons();
  const { title, content, level } = req.body;
  const newLesson = {
    id: Date.now(),
    title,
    content,
    level,
    author: req.user.name,
    createdAt: new Date().toISOString()
  };
  lessons.push(newLesson);
  await saveLessons(lessons);
  res.redirect('/lessons');
});

app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
