
from io import BytesIO
from urllib.parse import urlparse

import qrcode
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="TuSalud - Servicio QR")


class SolicitudQR(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/qr")
def generar_qr(solicitud: SolicitudQR):
    url = solicitud.url.strip()
    parsed_url = urlparse(url)

    if (
        parsed_url.scheme not in ("http", "https")
        or not parsed_url.netloc
        or any(character.isspace() for character in url)
    ):
        raise HTTPException(
            status_code=400,
            detail="La URL proporcionada no es válida."
        )

    codigo_qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    codigo_qr.add_data(url)
    codigo_qr.make(fit=True)

    imagen = codigo_qr.make_image(
        fill_color="black",
        back_color="white"
    )

    buffer = BytesIO()
    imagen.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": 'inline; filename="codigo-qr.png"'
        }
    )
