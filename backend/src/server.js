require('dotenv').config();

const cors = require('cors');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'BLAuth backend',
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist.',
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: err.status ? 'Request Error' : 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred.' : err.message,
  });
});

app.listen(port, () => {
  console.log(`BLAuth backend is running on port ${port}`);
});
