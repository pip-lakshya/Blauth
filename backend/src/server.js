require('dotenv').config();

const app = require('./app');
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`BLAuth backend is running on port ${port}`);
});
