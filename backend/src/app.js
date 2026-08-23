const cors = require('cors');
const express = require('express');

const identityRoutes = require('./routes/identityRoutes');
const developerRoutes = require('./routes/developerRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'BLAuth backend',
  });
});

app.use('/identity', identityRoutes);
app.use('/developer', developerRoutes);
app.use('/verify', verificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist.',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;

  if (status >= 500) {
    console.error('Unexpected server error', {
      name: err.name,
      code: err.code || 'UNKNOWN',
    });

    return res.status(500).json({
      error: 'Internal server error',
    });
  }

  res.status(status).json({
    error: 'Request Error',
    message: err.message,
  });
});

module.exports = app;
