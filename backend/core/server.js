
const express = require('express');
const cors = require('cors');
const handError = require('../middlewares/hand-error');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.middleware();
        this.rutas();
        this.errorHandlerGlobal();
    }

    middleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    rutas() {
        this.app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'API de TuSalud funcionando correctamente.'
            });
        });

        this.app.use('/api/usuarios', require('../routes/usuarios.route'));
        this.app.use('/api/categorias-medicas', require('../routes/categoriasMedicas.route'));
        this.app.use('/api/secciones-medicas', require('../routes/seccionesMedicas.route'));
        this.app.use('/api/documentos', require('../routes/documentos.route'));

        this.app.use((req, res, next) => {
            const error = new Error('Ruta no encontrada.');
            error.statusCode = 404;
            next(error);
        });
    }

    errorHandlerGlobal() {
        this.app.use(handError);
    }

    getApp() {
        return this.app;
    }

    listen() {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`La API de TuSalud está escuchando en el puerto: ${this.port}`);
        });
    }
}

module.exports = Server;
