
import io
import os
from concurrent.futures import ThreadPoolExecutor

import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pdf2image import convert_from_bytes
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

app = FastAPI()
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 100
OCR_LANGUAGES = os.getenv("OCR_LANGUAGES", "spa+eng")
executor = ThreadPoolExecutor(max_workers=1)


def preparar_imagen(imagen: Image.Image) -> Image.Image:
    imagen = ImageOps.exif_transpose(imagen)
    imagen = ImageOps.grayscale(imagen)
    imagen = ImageOps.autocontrast(imagen)
    imagen = ImageEnhance.Contrast(imagen).enhance(1.5)
    imagen = imagen.filter(ImageFilter.SHARPEN)

    if imagen.width < 1200:
        escala = 1200 / imagen.width
        nuevo_tamano = (
            1200,
            max(1, int(imagen.height * escala))
        )
        imagen = imagen.resize(nuevo_tamano, Image.Resampling.LANCZOS)

    return imagen


def reconocer_texto(imagen: Image.Image) -> str:
    imagen = preparar_imagen(imagen)
    configuraciones = ("--oem 3 --psm 3", "--oem 3 --psm 6")
    resultados = []

    for configuracion in configuraciones:
        texto = pytesseract.image_to_string(
            imagen,
            lang=OCR_LANGUAGES,
            config=configuracion
        ).strip()

        if texto:
            resultados.append(texto)

    return max(resultados, key=len, default="")


def extraer_texto_pdf(contenido: bytes) -> str:
    lector = PdfReader(io.BytesIO(contenido))

    if len(lector.pages) > MAX_PDF_PAGES:
        raise ValueError(
            f"El PDF supera el máximo de {MAX_PDF_PAGES} páginas."
        )

    textos = []

    for pagina in lector.pages:
        texto = pagina.extract_text() or ""
        if texto.strip():
            textos.append(texto.strip())

    texto_extraido = "\n\n".join(textos)

    if texto_extraido.strip():
        return texto_extraido

    imagenes = convert_from_bytes(
        contenido,
        dpi=300,
        first_page=1,
        last_page=MAX_PDF_PAGES
    )

    resultados = []

    for imagen in imagenes:
        texto = reconocer_texto(imagen)
        if texto:
            resultados.append(texto)

    return "\n\n".join(resultados)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "tesseract",
        "languages": OCR_LANGUAGES,
        "device": "cpu"
    }


@app.post("/ocr")
async def procesar_ocr(archivo: UploadFile = File(...)):
    if not archivo.filename:
        raise HTTPException(
            status_code=400,
            detail="No se recibió un archivo válido."
        )

    nombre_archivo = archivo.filename
    extension = os.path.splitext(nombre_archivo)[1].lower()

    if extension not in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".pdf"}:
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
            texto = await run_in_threadpool(
                reconocer_texto,
                imagen
            )

        texto = texto.strip()

        return {
            "success": True,
            "archivo": nombre_archivo,
            "texto": texto,
            "hayTexto": bool(texto)
        }

    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError):
        raise HTTPException(
            status_code=422,
            detail="No se pudo procesar la imagen."
        )
    except (PdfReadError, ValueError) as error:
        raise HTTPException(
            status_code=422,
            detail=str(error) or "No se pudo procesar el archivo."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error al procesar el archivo."
        )
    finally:
        await archivo.close()
