require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'vidyasetu_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donation');
const expenseRoutes = require('./routes/expense');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'signup.html')));
app.get('/verify-otp', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'verify_otp.html')));
app.get('/donor-dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'donor_dashboard.html')));
app.get('/ngo-dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html')));
app.get('/donate', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'donate.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'forgot_password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '../frontend', 'reset_password.html')));
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ success: false, reply: 'No message received.' });
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: `You are Setu, a friendly AI assistant for VidyaSetu — a Smart Education Donation Platform in India. Help users with donations, fund tracking, OTP login, receipts, impact scores and platform features. Every Rs 150 helps one student. Keep answers short, friendly and use emojis. Reply in the same language the user uses.` }]
        },
        contents: [{ parts: [{ text: message }] }]
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      res.json({ success: true, reply: data.candidates[0].content.parts[0].text });
    } else {
      console.error('Gemini error:', JSON.stringify(data));
      res.json({ success: false, reply: 'I am a little busy right now! Please wait 30 seconds and try again 😊' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.json({ success: false, reply: 'Sorry, I am having trouble connecting. Please try again! 😊' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ VidyaSetu running at http://localhost:${PORT}`);
});