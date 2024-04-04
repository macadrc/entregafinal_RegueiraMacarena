
require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_URI,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  jwtSecret: process.env.JWT_SECRET,
};
