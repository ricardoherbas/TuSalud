const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');
const { validarCrearDocumento, validarActualizarDocumento } = require('../middlewares/documentos-validator');
const verificarToken = require('../middlewares/auth.middleware');
const upload = require('../middlewares/documentos-upload');

router.get('/', verificarToken, documentosController.obtenerDocumentos);
router.get('/:id', verificarToken, documentosController.obtenerDocumentoPorId);
router.post('/', verificarToken, upload.single('archivo'), validarCrearDocumento, documentosController.crearDocumento);
router.put('/:id', verificarToken, validarActualizarDocumento, documentosController.actualizarDocumento);
router.delete('/:id', verificarToken, documentosController.eliminarDocumento);

module.exports = router;