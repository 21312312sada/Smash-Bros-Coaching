const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'smashbrossecret', resave: false, saveUninitialized: true }));

let users = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'users.json')));
let lessons = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lessons.json')));

function saveUsers() {
  // fs.writeFileSync(path.join(process.cwd(), 'users.json'), JSON.stringify(users, null, 2));
  console.log('Users saved (not persisted on Vercel)');
}

function saveLessons() {
  // fs.writeFileSync(path.join(process.cwd(), 'lessons.json'), JSON.stringify(lessons, null, 2));
  console.log('Lessons saved (not persisted on Vercel)');
}

function getAuthorityForLevel(level) {
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

app.post('/login', (req, res) => {
  const { name, password } = req.body;
  const user = users.find(u => u.name === name);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const user = req.session.user;
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

app.post('/signup', (req, res) => {
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
    yearLevel: paloginrseInt(yearLevel),
    class: 'beginner',
    authority: 1
  };
  users.push(newUser);
  saveUsers();
  res.redirect('/');
});

app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.authority < 4) return res.send('Access denied');
  const usersWithAuthority = users.map(u => ({ ...u, authority: getAuthorityForClass(u.class) }));
  res.render('admin', { users: usersWithAuthority, canEditAuthority: req.session.user.authority >= 5 });
});

app.post('/admin/edit', (req, res) => {
  if (!req.session.user || req.session.user.authority < 4) return res.send('Access denied');
  const { name, class: newClass } = req.body;
  const user = users.find(u => u.name === name);
  if (user) {
    user.class = newClass;
    // Authority is always tied to class
    user.authority = getAuthorityForClass(newClass);
    saveUsers();
  }
  res.redirect('/admin');
});

app.post('/change-password', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = users.find(u => u.name === req.session.user.name);
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.render('dashboard', { user: req.session.user, practices: '', error: 'Current password is incorrect' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.render('dashboard', { user: req.session.user, practices: '', error: 'New passwords do not match' });
  }
  user.password = bcrypt.hashSync(newPassword, 10);
  saveUsers();
  req.session.user = user;
  res.render('dashboard', { user, practices: '', success: 'Password changed successfully' });
});

app.get('/lessons', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const userAuthority = req.session.user.authority;
  const filteredLessons = lessons.filter(lesson => {
    const lessonAuthority = getAuthorityForLevel(lesson.level);
    return lessonAuthority === 0 || userAuthority >= lessonAuthority;
  });
  res.render('lessons', { lessons: filteredLessons, user: req.session.user, canAdd: req.session.user.authority >= 4 });
});

app.post('/lessons/add', (req, res) => {
  if (!req.session.user || req.session.user.authority < 4) return res.send('Access denied');
  const { title, content, level } = req.body;
  const newLesson = {
    id: Date.now(),
    title,
    content,
    level,
    author: req.session.user.name,
    createdAt: new Date().toISOString()
  };
  lessons.push(newLesson);
  saveLessons();login
  res.redirect('/lessons');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
