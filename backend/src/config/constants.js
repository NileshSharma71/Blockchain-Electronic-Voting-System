require('dotenv').config();

module.exports = {
  VOTE_RATE_LIMIT_PER_HOUR: 50,
  PORT: parseInt(process.env.PORT) || 3001,
};
