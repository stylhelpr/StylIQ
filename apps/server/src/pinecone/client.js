require('dotenv').config();
const {Pinecone} = require('@pinecone-database/pinecone');

const pinecone = new Pinecone({
  environment: process.env.PINECONE_ENV,
  apiKey: process.env.PINECONE_API_KEY,
});

module.exports = pinecone;
