# Images Search API
This application is designed to allow users to search for images based on their queries. It leverages the APIs of third-party image providers, such as Pixabay, Unsplash, and Storyblocks, to fetch and return relevant images. Here’s a breakdown of how the application works:

## Key Features:
1. User Input:
Users can enter a search query (e.g., "cats", "nature", "technology") into the application.

2. API Integration:
The application connects to multiple third-party image services:
Pixabay: A free stock photo and video sharing platform that provides a vast collection of images.
Unsplash: A platform offering high-resolution photos contributed by photographers around the world.
Storyblocks: A subscription-based service that provides stock videos and images.

3. Search Functionality:
When a user submits a query, the application sends requests to the APIs of the integrated services.
Each service returns a list of images that match the user's query.

4. Response Handling:
The application processes the responses from the different APIs, consolidating the results into a single list of images.
It may filter or format the results to ensure consistency in how images are presented to the user.

5. Display Results:
The application displays the retrieved images in a user-friendly interface, allowing users to view and select images based on their preferences.

6. Error Handling:
The application includes error handling to manage issues such as network errors, or invalid queries, providing appropriate feedback to the user.

# Installation Guide

## Prerequisites
Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (version 14 or higher)
   - You can download it from [Node.js official website](https://nodejs.org).

2. **Docker** (for containerization)
   - You can download it from [Docker official website](https://www.docker.com/get-started).

3. **Git** (for version control)
   - You can download it from [Git official website](https://git-scm.com).

4. **MongoDb** (for storing username and password)
    - You can download it from [MongoDb official website](https://www.mongodb.com).

5. **Redis** (optional, for caching purpose)
    - You can download it from [Redis official website](https://www.redis.io).

## Step 1: Clone the Repository
Open your terminal and clone the repository using Git:

git clone https://github.com/yoongyy/images-search.git

cd images-search

## Step 2: Install Dependencies
Install the required dependencies by running:

npm install

## Step 3: Set Up Environment Variables
1. Copy the example environment file to create your own `.env` file:

cp .env_example .env

2. Open the `.env` file in a text editor and update the variables as needed. Make sure to set any necessary configuration values, such as database connection strings, API keys, etc. Make sure your MongoDb is running in default port 27017

## Step 4: Build and Run the Application
If your application uses Docker, you can build and run it using Docker Compose:

docker-compose up --build

If your not using Docker, run the following command(app.js is normal App, app_graphql.js is for Graphql):

node app.js or node app_grqphql.js

## Step 5: Access the Application API
Once the application is running, you can access the API:

http://localhost:3000

## Replace `3000` with the port specified and MONGODB_URI variable in your `docker-compose.yml` file if it's different.