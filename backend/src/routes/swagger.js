const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../openapi.json');

router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar {
      background-color: #4f46e5;
    }
    .swagger-ui .topbar .swagger-ui-wrapper .topbar-title {
      color: white;
    }
    .swagger-ui .info .title {
      color: #4f46e5;
    }
  `,
  customSiteTitle: '下载管理系统 API',
  swaggerOptions: {
    supportedSubmitMethods: ['get', 'post', 'put', 'delete'],
  },
}));

router.get('/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

module.exports = router;