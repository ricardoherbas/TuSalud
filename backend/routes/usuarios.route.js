const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuarios.controller');
const { validarCrearUsuario, validarActualizarUsuario } = require('../middlewares/usuarios-validator');
const verificarToken = require('../middlewares/auth.middleware');

router.post('/registro', validarCrearUsuario, usuariosController.registrarUsuario);
router.post('/login', usuariosController.iniciarSesion);
router.get('/perfil', verificarToken, usuariosController.obtenerPerfil);
router.put('/perfil', verificarToken, validarActualizarUsuario, usuariosController.actualizarPerfil);

module.exports = router;