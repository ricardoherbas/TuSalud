
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const carpetaAlmacenamiento = path.resolve(__dirname, '../storage');

fs.mkdirSync(carpetaAlmacenamiento, { recursive: true });

const tiposPermitidos = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png'
};

const almacenamiento = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, carpetaAlmacenamiento);
    },
    filename: (req, file, callback) => {
        const extension = tiposPermitidos[file.mimetype];

        callback(null, `${randomUUID()}${extension}`);
    }
});

const filtrarArchivo = (req, file, callback) => {
    if (!tiposPermitidos[file.mimetype]) {
        const error = new Error('El archivo debe ser PDF, JPG o PNG.');
        error.statusCode = 400;
        return callback(error);
    }

    callback(null, true);
};

const upload = multer({
    storage: almacenamiento,
    fileFilter: filtrarArchivo,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});

module.exports = upload;
