const express = require('express');
const router = express.Router();

const seccionesMedicasController = require('../controllers/seccionesMedicas.controller');

router.get('/categoria/:categoriaId', seccionesMedicasController.obtenerSeccionesPorCategoria);

module.exports = router;