import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';
import bcrypt from 'bcrypt';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());

// Static frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.post('/auth/set-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.password) return res.status(400).json({ message: 'Password already set' });

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  await user.save();

  res.status(200).json({ message: 'Password set successfully' });
});


// Redirect to Google login
app.get('/auth/google', (req, res) => {
  const authURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  console.log(authURL);
  res.redirect(authURL);
});

// Callback from Google
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  console.log(code)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenRes.json();
  const idToken = tokens.id_token;

  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

  let user = await User.findOne({ googleId: payload.sub });
  console.log(user)
  if (!user) {
    user = await User.create({
      googleId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    });
  }

  res.redirect(`/welcome.html?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&picture=${encodeURIComponent(user.picture)}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

