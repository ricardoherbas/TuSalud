const express = require('express');
const router = express.Router();

const categoriasMedicasController = require('../controllers/categoriasMedicas.controller');

router.get('/', categoriasMedicasController.obtenerCategoriasMedicas);
router.get('/:id', categoriasMedicasController.obtenerCategoriaPorId);

module.exports = router;