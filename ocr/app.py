import io
import logging
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from pdf2image import convert_from_bytes
from pdf2image.exceptions import (
    PDFInfoNotInstalledError,
    PDFPageCountError,
    PDFSyntaxError,
)

from PIL import (
    Image,
    ImageOps,
    UnidentifiedImageError,
)

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from doctr.io import DocumentFile
from doctr.models import ocr_predictor


app = FastAPI()

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 100

# Cargar los modelos preentrenados de docTR.
# La primera ejecución puede descargar los pesos necesarios.
ocr = ocr_predictor(
    det_arch="db_resnet50",
    reco_arch="crnn_vgg16_bn",
    pretrained=True,
    assume_straight_pages=True,
)


def preparar_imagen(imagen: Image.Image) -> Image.Image:
    imagen = ImageOps.exif_transpose(imagen)
    imagen = ImageOps.grayscale(imagen)
    imagen = ImageOps.autocontrast(imagen)
    return imagen.convert("RGB")



def reconocer_texto(imagen: Image.Image) -> str:
    imagen = preparar_imagen(imagen)

    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG")

    documento = DocumentFile.from_images(buffer.getvalue())
    resultado = ocr(documento)
    exportado = resultado.export()

    lineas_ordenadas = []

    for pagina in exportado.get("pages", []):
        palabras_pagina = []

        for bloque in pagina.get("blocks", []):
            for linea in bloque.get("lines", []):
                for palabra in linea.get("words", []):
                    texto = palabra.get("value", "").strip()
                    geometria = palabra.get("geometry")

                    if not texto or not geometria:
                        continue

                    (x1, y1), (x2, y2) = geometria

                    palabras_pagina.append({
                        "texto": texto,
                        "x": (x1 + x2) / 2,
                        "y": (y1 + y2) / 2,
                        "alto": y2 - y1,
                    })

        # Orden inicial: de arriba hacia abajo.
        palabras_pagina.sort(key=lambda p: (p["y"], p["x"]))

        filas = []

        for palabra in palabras_pagina:
            mejor_fila = None
            menor_distancia = float("inf")

            for fila in filas:
                centro_y = sum(p["y"] for p in fila) / len(fila)
                alto_medio = sum(p["alto"] for p in fila) / len(fila)

                distancia = abs(palabra["y"] - centro_y)
                tolerancia = max(
                    0.006,
                    min(alto_medio, palabra["alto"]) * 0.6
                )

                if distancia <= tolerancia and distancia < menor_distancia:
                    mejor_fila = fila
                    menor_distancia = distancia

            if mejor_fila is None:
                filas.append([palabra])
            else:
                mejor_fila.append(palabra)

        # Ordenar las palabras de cada fila de izquierda a derecha.
        filas.sort(
            key=lambda fila: sum(p["y"] for p in fila) / len(fila)
        )

        for fila in filas:
            fila.sort(key=lambda p: p["x"])
            texto_fila = " ".join(p["texto"] for p in fila)

            if texto_fila.strip():
                lineas_ordenadas.append(texto_fila)

    return "\n".join(lineas_ordenadas)


def extraer_texto_pdf(contenido: bytes) -> str:
    lector = PdfReader(
        io.BytesIO(contenido),
        strict=True
    )

    if lector.is_encrypted:
        raise ValueError(
            "El PDF está protegido con contraseña y no se puede procesar."
        )

    cantidad_paginas = len(lector.pages)

    if cantidad_paginas > MAX_PDF_PAGES:
        raise ValueError(
            f"El PDF supera el máximo de {MAX_PDF_PAGES} páginas."
        )

    # Intentar primero extraer el texto directamente.
    textos = []

    for pagina in lector.pages:
        texto = pagina.extract_text() or ""

        if texto.strip():
            textos.append(texto.strip())

    texto_extraido = "\n\n".join(textos)

    if texto_extraido.strip():
        return texto_extraido

    # Si el PDF es escaneado, convertirlo en imágenes.
    imagenes = convert_from_bytes(
        contenido,
        dpi=200
    )

    resultados = []

    # Procesar una página por vez para limitar el consumo de memoria.
    for imagen in imagenes:
        texto = reconocer_texto(imagen)

        if texto.strip():
            resultados.append(texto)

        imagen.close()

    return "\n\n".join(resultados)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "doctr",
        "device": "cpu"
    }


@app.post("/ocr")
async def procesar_ocr(
    archivo: UploadFile = File(...)
):
    if not archivo.filename:
        raise HTTPException(
            status_code=400,
            detail="No se recibió un archivo válido."
        )

    nombre_archivo = archivo.filename
    extension = os.path.splitext(nombre_archivo)[1].lower()

    formatos_permitidos = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
        ".tif",
        ".tiff",
        ".pdf"
    }

    if extension not in formatos_permitidos:
        raise HTTPException(
            status_code=415,
            detail="Formato de archivo no compatible."
        )

    try:
        contenido = await archivo.read(MAX_FILE_SIZE + 1)

        if not contenido:
            raise HTTPException(
                status_code=400,
                detail="El archivo está vacío."
            )

        if len(contenido) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="El archivo supera el límite de 10 MB."
            )

        if extension == ".pdf":
            texto = await run_in_threadpool(
                extraer_texto_pdf,
                contenido
            )
        else:
            imagen = Image.open(io.BytesIO(contenido))
            imagen.load()

            try:
                texto = await run_in_threadpool(
                    reconocer_texto,
                    imagen
                )
            finally:
                imagen.close()

        texto = texto.strip()

        return {
            "success": True,
            "archivo": nombre_archivo,
            "texto": texto,
            "hayTexto": bool(texto)
        }

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
    ):
        raise HTTPException(
            status_code=422,
            detail="No se pudo procesar la imagen."
        )

    except (
        PdfReadError,
        PDFPageCountError,
        PDFSyntaxError,
        PDFInfoNotInstalledError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=422,
            detail=str(error) or "No se pudo procesar el archivo."
        )

    except Exception:
        logging.exception(
            "Error interno durante el procesamiento OCR"
        )

        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error interno al procesar el archivo con OCR."
        )

    finally:
        await archivo.close()