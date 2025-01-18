# Installation Guide

## Prerequisites
Before you begin, ensure you have the following installed on your machine:

1. **Node.js** (version 14 or higher)
   - You can download it from [Node.js official website](https://nodejs.org/).

2. **Docker** (for containerization)
   - You can download it from [Docker official website](https://www.docker.com/get-started).

3. **Git** (for version control)
   - You can download it from [Git official website](https://git-scm.com/).

4. **MongoDb** (for storing username and password)
    - You can download it from [MongoDb official website](https://www.mongodb.com/).

## Step 1: Clone the Repository
Open your terminal and clone the repository using Git. Replace `<repository-url>` with the actual URL of your repository.
    git clone <repository-url>
    cd <repository-name>

## Step 2: Install Dependencies
If your application uses Node.js, install the required dependencies by running:
npm install

## Step 3: Set Up Environment Variables
1. Copy the example environment file to create your own `.env` file:
cp .env_example .env

2. Open the `.env` file in a text editor and update the variables as needed. Make sure to set any necessary configuration values, such as database connection strings, API keys, etc.

## Make sure your MongoDb is running in default port 27017 and there is one DB called test

## Step 4: Build and Run the Application
If your application uses Docker, you can build and run it using Docker Compose:
docker-compose up --build

If your not using Docker, run the following command(app.js is normal App, app_graphql.js is for Graphql):
node app.js or node app_grqphql.js

## Step 5: Access the Application
Once the application is running, you can access it in your web browser. The default URL is usually:
http://localhost:3000

Replace `3000` with the port specified in your `docker-compose.yml` file if it's different.