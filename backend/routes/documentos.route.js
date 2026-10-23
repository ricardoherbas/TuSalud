
const express = require('express');
const router = express.Router();

const documentosController = require('../controllers/documentos.controller');
const {validarCrearDocumento,validarActualizarDocumento} = require('../middlewares/documentos-validator');
const verificarToken = require('../middlewares/auth.middleware');
const upload = require('../middlewares/documentos-upload');

router.get('/compartido/:token', documentosController.obtenerDocumentoCompartido);
router.get('/', verificarToken, documentosController.obtenerDocumentos);
router.get('/:id/original', verificarToken, documentosController.mostrarOriginal);
router.get('/:id/transcripcion', verificarToken, documentosController.mostrarTranscripcion);
router.get('/:id', verificarToken, documentosController.obtenerDocumentoPorId);
router.post('/:id/compartir', verificarToken, documentosController.compartirDocumento);
router.post('/:id/qr', verificarToken, documentosController.generarQrDocumento);
router.delete('/:id/compartir', verificarToken, documentosController.revocarComparticion);
router.post('/',verificarToken, upload.single('archivo'),validarCrearDocumento,documentosController.crearDocumento);
router.put('/:id', verificarToken, validarActualizarDocumento, documentosController.actualizarDocumento);
router.delete('/:id', verificarToken, documentosController.eliminarDocumento);

module.exports = router;
