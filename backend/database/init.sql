BEGIN;

CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias_medicas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    orden SMALLINT NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE secciones_medicas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    orden SMALLINT NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categorias_secciones (
    categoria_id BIGINT NOT NULL
        REFERENCES categorias_medicas(id) ON DELETE CASCADE,
    seccion_id BIGINT NOT NULL
        REFERENCES secciones_medicas(id) ON DELETE CASCADE,
    PRIMARY KEY (categoria_id, seccion_id)
);

CREATE TABLE documentos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    usuario_id BIGINT NOT NULL
        REFERENCES usuarios(id) ON DELETE CASCADE,

    categoria_id BIGINT NOT NULL,
    seccion_id BIGINT NOT NULL,

    titulo VARCHAR(200) NOT NULL,
    nombre_archivo_original VARCHAR(255) NOT NULL,
    fecha_documento DATE,
    institucion VARCHAR(200),
    profesional VARCHAR(200),

    storage_key VARCHAR(255) NOT NULL UNIQUE,

    tipo_mime VARCHAR(100) NOT NULL
        CHECK (
            tipo_mime IN (
                'application/pdf',
                'image/jpeg',
                'image/png'
            )
        ),

    tamano_bytes BIGINT NOT NULL
        CHECK (tamano_bytes > 0),

    hash_sha256 VARCHAR(64)
        CHECK (
            hash_sha256 IS NULL
            OR (
                LENGTH(hash_sha256) = 64
                AND hash_sha256 ~ '^[a-fA-F0-9]{64}$'
            )
        ),

    texto_ocr TEXT,
    resumen_ia TEXT,

    token_comparticion_hash VARCHAR(64) UNIQUE
        CHECK (
            token_comparticion_hash IS NULL
            OR (
                LENGTH(token_comparticion_hash) = 64
                AND token_comparticion_hash ~ '^[a-fA-F0-9]{64}$'
            )
        ),

    compartido_hasta TIMESTAMPTZ,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_documentos_categoria_seccion
        FOREIGN KEY (categoria_id, seccion_id)
        REFERENCES categorias_secciones (categoria_id, seccion_id)
);

CREATE FUNCTION actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_actualizado_en
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

CREATE TRIGGER trg_documentos_actualizado_en
BEFORE UPDATE ON documentos
FOR EACH ROW
EXECUTE FUNCTION actualizar_actualizado_en();

INSERT INTO categorias_medicas (nombre, descripcion, orden) VALUES
    ('Corazón y circulación', 'Corazón, sangre y sistema circulatorio.', 1),
    ('Cerebro y sistema nervioso', 'Cerebro, nervios y sistema nervioso.', 2),
    ('Pulmones y respiración', 'Pulmones y sistema respiratorio.', 3),
    ('Estómago y digestión', 'Estómago, intestinos y sistema digestivo.', 4),
    ('Huesos, músculos y articulaciones', 'Sistema óseo, músculos y articulaciones.', 5),
    ('Ojos y visión', 'Ojos y sistema visual.', 6),
    ('Oídos, nariz y garganta', 'Oídos y vías respiratorias superiores.', 7),
    ('Piel', 'Piel y afecciones dermatológicas.', 8),
    ('Riñones y vías urinarias', 'Riñones, vejiga y vías urinarias.', 9),
    ('Salud hormonal y metabólica', 'Hormonas, tiroides y metabolismo.', 10),
    ('Salud reproductiva', 'Órganos reproductivos y salud relacionada.', 11),
    ('Salud general y otros documentos', 'Documentos médicos generales o que no corresponden a otra categoría.', 12);

INSERT INTO secciones_medicas (nombre, descripcion, orden) VALUES
    ('Imágenes', 'Estudios visuales, como radiografías, ecografías, tomografías y resonancias.', 1),
    ('Informes', 'Informes médicos, diagnósticos, consultas y otros documentos clínicos.', 2),
    ('Laboratorios', 'Análisis clínicos y resultados de laboratorio.', 3);

INSERT INTO categorias_secciones (categoria_id, seccion_id)
SELECT c.id, s.id
FROM categorias_medicas AS c
CROSS JOIN secciones_medicas AS s;

COMMIT;