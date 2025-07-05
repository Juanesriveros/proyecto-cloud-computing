const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
// trust proxy para entornos cloud Codespaces
app.set('trust proxy', 1);


// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-proyecto.onrender.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting para protección contra ataques
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde',
    resetTime: '15 minutos'
  }
});
app.use(limiter);

// Contador global de requests para métricas
let requestCount = 0;
let errorCount = 0;

app.use((req, res, next) => {
  requestCount++;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request #${requestCount}`);
  next();
});

// Rutas principales
app.use('/', require('../routes/index'));

// Manejo de errores
app.use((err, req, res, next) => {
  errorCount++;
  console.error(`Error #${errorCount}:`, err.message);
  res.status(500).json({
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    requestId: requestCount
  });
});

// Manejo de rutas no encontradas (404)
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /metrics',
      'GET /dashboard',
      'GET /api/demo'
    ]
  });
});


// Función para mantener la app activa (evita que Render la suspenda)
if (process.env.NODE_ENV === 'production') {
  const keepAlive = () => {
    fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`)
      .then(res => console.log(`Keep-alive ping: ${res.status}`))
      .catch(err => console.log(`Keep-alive failed: ${err.message}`));
  };
  
  // Ping cada 14 minutos
  setInterval(keepAlive, 14 * 60 * 1000);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Métricas: http://localhost:${PORT}/metrics`);
});

// Exportar para testing
module.exports = app;
