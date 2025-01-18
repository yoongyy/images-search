require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { ApolloServer, gql } = require('apollo-server-express');

// Environment Variables
const { UNSPLASH_KEY, PIXABAY_KEY, STORYBLOCKS_PUBLIC_KEY, STORYBLOCKS_PRIVATE_KEY, STORYBLOCKS_PROJECT_ID, JWT_SECRET, PORT, MONGODB_URI } = process.env;

const app = express();
app.use(express.json());

// Connect MongoDB
mongoose.connect(MONGODB_URI, {})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// User model
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Define GraphQL schema
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
  }

  type Image {
    image_ID: String!
    thumbnails: String!
    preview: String!
    title: String!
    source: String!
    tags: [String!]!
  }

  type Query {
    # Placeholder for future queries
    _: String # This is a hack to allow an empty Query type
  }

  type Mutation {
    register(username: String!, password: String!): User
    login(username: String!, password: String!): String
    logout: String
  }
`;

// Define resolvers
const resolvers = {
  Mutation: {
    register: async (_, { username, password }) => {
      // Check if the username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();

      return newUser; // Return the newly created user
    },
    login: async (_, { username, password }) => {
      // Find the user by username
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('User not found');
      }

      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Generate a JWT token
      const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      return token; 
    },
    logout: async (_, __, { user }) => {
      return "Logged out successfully";
    },
  },
};

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

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    return { user: req.user };
  },
});

// Start the server and apply middleware
async function startServer() {
  await server.start(); 
  server.applyMiddleware({ app }); 
}

// Apply authentication middleware only to search images routes
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

// Start Apollo Server
startServer();

// Start Server
app.listen(PORT, () => {
  console.log(`Image Search API running on http://localhost:${PORT}`);
});
