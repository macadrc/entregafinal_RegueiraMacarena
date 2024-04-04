
const express = require('express');

const mockingRouter = express.Router();

mockingRouter.get('/mockingproducts', (req, res) => {
  const mockProducts = Array.from({ length: 100 }, (_, index) => ({
    _id: `mockProductId${index + 1}`,
    name: `Mock Product ${index + 1}`,
    price: Math.floor(Math.random() * 100) + 1,
  }));

  res.json(mockProducts);
});

module.exports = mockingRouter;
