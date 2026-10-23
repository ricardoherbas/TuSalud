const express = require('express');
const router = express.Router();
const tratamientosController = require('../controllers/tratamientos.controller');
const {validarTratamiento,validarActualizacionTratamiento,validarIdTratamiento} = require('../middlewares/tratamientos-validator');
const verificarToken = require('../middlewares/auth.middleware');
const upload = require('../middlewares/documentos-upload');

router.get('/', verificarToken, tratamientosController.obtenerTratamientos);
router.get('/:id', verificarToken, validarIdTratamiento, tratamientosController.obtenerTratamientoPorId);
router.get('/:id/archivos/:archivoId', verificarToken, validarIdTratamiento, tratamientosController.obtenerArchivoTratamiento);
router.post('/', verificarToken, upload.fields([{ name: 'imagen', maxCount: 1 }, { name: 'receta', maxCount: 1 }]), validarTratamiento, tratamientosController.crearTratamiento);
router.put('/:id', verificarToken, upload.fields([{ name: 'imagen', maxCount: 1 }, { name: 'receta', maxCount: 1 }]), validarIdTratamiento, validarActualizacionTratamiento, tratamientosController.actualizarTratamiento);
router.delete('/:id', verificarToken, validarIdTratamiento, tratamientosController.eliminarTratamiento);

module.exports = router;