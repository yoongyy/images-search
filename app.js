require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// User model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Environment Variables
const { UNSPLASH_KEY, PIXABAY_KEY, STORYBLOCKS_PUBLIC_KEY, STORYBLOCKS_PRIVATE_KEY, STORYBLOCKS_PROJECT_ID, JWT_SECRET, PORT } = process.env;

// Get Unsplash images
async function fetchUnsplash(query) {
  const url = `https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data.results.map(image => ({
      image_ID: image.id,
      thumbnails: image.urls.thumb,
      preview: image.urls.small,
      title: image.alt_description || 'Untitled',
      source: 'Unsplash',
      tags: image.tags ? image.tags.map(tag => tag.title) : [],
    }));
  } catch (error) {
    console.error('Error fetching from Unsplash:', error.message);
    return [];
  }
}

// Get Pixabay images
async function fetchPixabay(query) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    return response.data.hits.map(image => ({
      image_ID: image.id,
      thumbnails: image.previewURL,
      preview: image.webformatURL,
      title: image.tags.split(',')[0] || 'Untitled',
      source: 'Pixabay',
      tags: image.tags.split(',').map(tag => tag.trim()),
    }));
  } catch (error) {
    console.error('Error fetching from Pixabay:', error.message);
    return [];
  }
}

// Get StockBlocks images
async function fetchStoryblocks(query) {
  const baseUrl = 'https://api.graphicstock.com/api/v2/images/search';
  const expires = Math.floor(Date.now() / 1000) + 300; // Expiry time 5 minutes from now
  
  const hmacString = `/api/v2/images/search?project_id=${STORYBLOCKS_PROJECT_ID}&user_id=demo_user&keywords=${query}`;
  
  const hmac = crypto
    .createHmac('sha256', STORYBLOCKS_PRIVATE_KEY)
    .update(hmacString + expires)
    .digest('hex');

    try {
      const response = await axios.get(baseUrl, {
        params: {
          project_id: STORYBLOCKS_PROJECT_ID,
          user_id: 'demo_user',
          keywords: query,
          content_type: 'photos',
          page: 1,
          results_per_page: 10,
          sort_by: 'most_relevant',
          sort_order: 'DESC',
        },
        paramsSerializer: params => {
          return Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
        },
        headers: {
          Authorization: `Basic ${Buffer.from(`${STORYBLOCKS_PUBLIC_KEY}:${STORYBLOCKS_PRIVATE_KEY}`).toString('base64')}`,
          EXPIRES: expires,
          HMAC: hmac,
        },
      });
  
      return response.data.results.map(image => ({
        image_ID: image.id,
        thumbnails: image.thumbnail_url,
        preview: image.preview_url,
        title: image.title || 'Untitled',
        source: 'Storyblocks',
        tags: image.keywords || [],
      }));
    } catch (error) {
      console.error('Error fetching from Storyblocks:', error.message);
      console.error('Response Data:', error.response?.data);
      return [];
    }
}

// Registration endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ id: user._id, username: user.username });
  } catch (error) {
    if (error.code === 11000) {
        // Duplicate username
        return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send('Invalid credentials');
  }
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Logout endpoint 
app.post('/logout', (req, res) => {
  res.send('Logged out');
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
};

// Route for Image Search
app.get('/search-images', authenticateToken, async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Fetch images concurrently
    const [pixabayResults, unsplashResults, storyblocksResults] = await Promise.all([
      fetchPixabay(query),
      fetchUnsplash(query),
      fetchStoryblocks(query),
    ]);

    // Combine results
    const combinedResults = [...unsplashResults, ...pixabayResults, ...storyblocksResults];
    res.json(combinedResults);
  } catch (error) {
    console.error('Error handling search:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Image Search API running on http://localhost:${PORT}`);
});
