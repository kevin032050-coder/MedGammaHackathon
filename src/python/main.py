# src/python/main.py

from __future__ import annotations

import base64
import logging
from typing import Optional, List, Dict, Any, Tuple

import numpy as np
import uvicorn
from PIL import Image  # ✅ correct (NOT tkinter)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# ---- Your modules ----
from dicom_to_pil import to_grayscale_pil
from dicom_processor import DICOMProcessor

# Old model wrapper (your existing mock/async pipeline)
from med_gemma2 import MedGemmaModel

# New MedGemma triage wrapper (Transformers-based)
from med_gemma import MedGemmaClient


# -----------------------------
# Logging
# -----------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medgemma_api")


# -----------------------------
# App
# -----------------------------
app = FastAPI(title="MedGemma Radiology API", version="1.0.0")

# CORS middleware for Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
dicom_processor = DICOMProcessor()

# Legacy async model (used by analyze-slice/chat/report endpoints)
med_gemma_model: Optional[MedGemmaModel] = None

# New triage client (used by analyze-study)
medgemma = MedGemmaClient()


# -----------------------------
# Request Models
# -----------------------------
class LoadStudyRequest(BaseModel):
    path: str


class AnalyzeStudyRequest(BaseModel):
    study_id: str


class AnalyzeSliceRequest(BaseModel):
    study_id: str
    slice_index: int


class ChatRequest(BaseModel):
    query: str
    context: Dict[str, Any]


class IncidentalFindingsRequest(BaseModel):
    study_id: str


class GenerateReportRequest(BaseModel):
    study_id: str
    findings: Optional[str] = None


class FeedbackRequest(BaseModel):
    study_id: str
    agreed: bool
    correction: Optional[str] = None


class GetSliceImageRequest(BaseModel):
    study_id: str
    slice_index: int
    window_center: Optional[int] = None
    window_width: Optional[int] = None
    window_preset: Optional[str] = None


# -----------------------------
# Helpers
# -----------------------------
def _decode_float32_base64(b64: str) -> np.ndarray:
    """
    Decode base64 string that represents Float32 bytes into a numpy float32 vector.
    """
    raw = base64.b64decode(b64.encode("utf-8"))
    arr = np.frombuffer(raw, dtype=np.float32)
    return arr


def _pixels_payload_to_2d_array(payload: Dict[str, Any]) -> Tuple[np.ndarray, int, int]:
    """
    Convert dicom_processor.get_slice_pixels payload -> (pixels_2d, width, height)

    Expected payload fields:
      - "pixels": base64 of Float32 bytes
      - "width": int
      - "height": int
    """
    if "pixels" not in payload or "width" not in payload or "height" not in payload:
        raise ValueError(f"get_slice_pixels payload missing keys. Got: {list(payload.keys())}")

    width = int(payload["width"])
    height = int(payload["height"])

    vec = _decode_float32_base64(payload["pixels"])
    expected = width * height
    if vec.size != expected:
        raise ValueError(f"Float32 length mismatch: got {vec.size}, expected {expected} ({width}x{height})")

    img2d = vec.reshape((height, width))
    return img2d, width, height


def _get_num_slices(study_data: Dict[str, Any]) -> int:
    """
    Your study dict likely has "num_slices" at top-level (matching frontend usage).
    Add defensive fallback if your structure differs.
    """
    if isinstance(study_data, dict):
        if "num_slices" in study_data:
            return int(study_data["num_slices"])
        if "study" in study_data and isinstance(study_data["study"], dict) and "num_slices" in study_data["study"]:
            return int(study_data["study"]["num_slices"])
    raise ValueError(f"Could not determine num_slices from study_data keys: {list(study_data.keys())}")


# -----------------------------
# Health
# -----------------------------
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "legacy_med_gemma_loaded": med_gemma_model is not None,
        "triage_client_ready": True,  # model loads lazily inside MedGemmaClient
    }


# -----------------------------
# Load Study
# -----------------------------
@app.post("/api/load-study")
async def load_study(request: LoadStudyRequest):
    try:
        logger.info(f"Loading DICOM study from: {request.path}")
        study_data = await dicom_processor.load_study(request.path)
        return {"success": True, "study": study_data}
    except Exception as e:
        logger.exception("Error loading study")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Analyze Study (MedGemma triage)
# -----------------------------
@app.post("/api/analyze-study")
def analyze_study(req: AnalyzeStudyRequest) -> Dict[str, Any]:
    """
    Study-level triage:
      1) sample slices
      2) convert pixels -> PIL
      3) MedGemmaClient.triage_study
      4) return patient + slice priorities + attention areas
    """
    study_id = req.study_id

    try:
        study_data = dicom_processor.get_study(study_id)
        num_slices = _get_num_slices(study_data)

        # Build list of (slice_index, PIL.Image)
        # For speed: sample up to 24 slices evenly across the stack.
        per_slice_limit = 24
        if num_slices <= per_slice_limit:
            indices = list(range(num_slices))
        else:
            step = max(1, num_slices // per_slice_limit)
            indices = list(range(0, num_slices, step))[:per_slice_limit]

        images_by_index: List[Tuple[int, Image.Image]] = []

        for idx in indices:
            pixel_payload = dicom_processor.get_slice_pixels(study_id, idx)
            pixels2d, _, _ = _pixels_payload_to_2d_array(pixel_payload)

            # Your to_grayscale_pil should accept numpy array;
            # if it expects different shape, adjust here.
            pil_img = to_grayscale_pil(pixels2d)
            images_by_index.append((idx, pil_img))

        triage = medgemma.triage_study(images_by_index, per_slice_limit=per_slice_limit)

        # Build full per-slice priority map (default ROUTINE)
        priority_map = [{"slice_index": i, "priority": "ROUTINE"} for i in range(num_slices)]
        for r in triage.get("slice_triage", []):
            si = r.get("slice_index")
            pr = r.get("priority", "ROUTINE")
            if isinstance(si, int) and 0 <= si < num_slices:
                priority_map[si] = {"slice_index": si, "priority": pr}

        return {
            "success": True,
            "study_id": study_id,
            "analysis": {
                "priority": triage["patient_priority"],
                "confidence": 0.5,  # placeholder until you compute one
                "reasoning": triage["patient_rationale"],
                "slice_priority_map": priority_map,
                "slice_triage": triage["slice_triage"],
                }
            }

    except Exception as e:
        logger.exception("Error analyzing study")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Analyze Slice (legacy model)
# -----------------------------
@app.post("/api/analyze-slice")
async def analyze_slice(request: AnalyzeSliceRequest):
    try:
        logger.info(f"Analyzing slice {request.slice_index} of study {request.study_id}")

        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")

        slice_data = dicom_processor.get_slice(request.study_id, request.slice_index)
        analysis = await med_gemma_model.analyze_slice(slice_data)

        return {"success": True, "slice_analysis": analysis}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error analyzing slice")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Chat (legacy model)
# Keep both routes: /api/chat and /api/chat-query
# -----------------------------
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        logger.info(f"Chat query: {request.query}")

        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")

        response = await med_gemma_model.chat(request.query, request.context)
        return {"success": True, "response": response}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in chat")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat-query")
async def chat_query_alias(request: ChatRequest):
    return await chat(request)


# -----------------------------
# Incidental Findings (legacy model)
# -----------------------------
@app.post("/api/incidental-findings")
async def get_incidental_findings(request: IncidentalFindingsRequest):
    try:
        logger.info(f"Getting incidental findings for study: {request.study_id}")

        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")

        study_data = dicom_processor.get_study(request.study_id)
        findings = await med_gemma_model.detect_incidental_findings(study_data)

        return {"success": True, "incidental_findings": findings}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error detecting incidental findings")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Generate Report (legacy model)
# -----------------------------
@app.post("/api/generate-report")
async def generate_report(request: GenerateReportRequest):
    try:
        logger.info(f"Generating report for study: {request.study_id}")

        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")

        study_data = dicom_processor.get_study(request.study_id)
        report = await med_gemma_model.generate_report(study_data, request.findings)

        return {"success": True, "report": report}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error generating report")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Feedback (keep both route names)
# -----------------------------
@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    try:
        logger.info(f"Feedback received for study: {request.study_id}")
        feedback_log = {
            "study_id": request.study_id,
            "agreed": request.agreed,
            "correction": request.correction,
            "timestamp": None,
        }
        # TODO: persist feedback_log
        return {"success": True, "message": "Feedback logged for model improvement (simulated)"}
    except Exception as e:
        logger.exception("Error submitting feedback")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/submit-feedback")
async def submit_feedback_alias(request: FeedbackRequest):
    return await submit_feedback(request)


# -----------------------------
# Slice pixels / image
# -----------------------------
@app.post("/api/get-slice-pixels")
async def get_slice_pixels(request: GetSliceImageRequest):
    try:
        logger.info(f"Getting raw pixels: study={request.study_id}, slice={request.slice_index}")
        pixel_data = dicom_processor.get_slice_pixels(request.study_id, request.slice_index)
        return pixel_data
    except Exception as e:
        logger.exception("Error getting slice pixels")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get-slice-image")
async def get_slice_image(request: GetSliceImageRequest):
    try:
        logger.info(
            f"Getting slice image: study={request.study_id}, slice={request.slice_index}, preset={request.window_preset}"
        )
        image_data = dicom_processor.get_slice_image(
            request.study_id,
            request.slice_index,
            request.window_center,
            request.window_width,
            request.window_preset,
        )
        return {"success": True, "image_data": image_data}
    except Exception as e:
        logger.exception("Error getting slice image")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# DICOM file data for DWV
# -----------------------------
@app.post("/api/get-dicom-file-data")
async def get_dicom_file_data(request: AnalyzeStudyRequest):
    try:
        logger.info(f"Getting DICOM file data for study: {request.study_id}")

        study_data = dicom_processor.get_study(request.study_id)
        dicom_files = study_data.get("dicom_files", [])

        file_data: List[str] = []
        for filepath in dicom_files:
            with open(filepath, "rb") as f:
                content = f.read()
            file_data.append(base64.b64encode(content).decode("utf-8"))

        logger.info(f"Returning {len(file_data)} files")
        return {"success": True, "files": file_data}

    except Exception as e:
        logger.exception("Error getting DICOM file data")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get-dicom-urls")
async def get_dicom_urls(request: AnalyzeStudyRequest):
    try:
        logger.info(f"Getting DICOM URLs for study: {request.study_id}")

        study_data = dicom_processor.get_study(request.study_id)
        dicom_files = study_data.get("dicom_files", [])

        # Backend-served URLs (DWV-friendly)
        urls = [f"http://localhost:8000/api/dicom-file/{request.study_id}/{i}" for i in range(len(dicom_files))]

        return {"success": True, "urls": urls}

    except Exception as e:
        logger.exception("Error getting DICOM URLs")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dicom-file/{study_id}/{file_index}")
async def get_dicom_file(study_id: str, file_index: int):
    try:
        logger.info(f"Serving DICOM file: study={study_id}, index={file_index}")

        study_data = dicom_processor.get_study(study_id)
        dicom_files = study_data.get("dicom_files", [])

        if file_index >= len(dicom_files):
            raise HTTPException(status_code=404, detail="File not found")

        filepath = dicom_files[file_index]
        with open(filepath, "rb") as f:
            content = f.read()

        return Response(
            content=content,
            media_type="application/dicom",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Error serving DICOM file")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# Startup (legacy model load)
# -----------------------------
import os

@app.on_event("startup")
async def startup_event():
    global med_gemma_model
    logger.info("Starting Med Gemma Radiology API...")

    # ✅ Don’t block server startup.
    # Only load legacy model if explicitly enabled.
    if os.getenv("LOAD_LEGACY_MODEL", "0") != "1":
        logger.info("Skipping legacy MedGemmaModel load (set LOAD_LEGACY_MODEL=1 to enable).")
        med_gemma_model = None
        return

    try:
        med_gemma_model = MedGemmaModel()
        await med_gemma_model.load_model()
        logger.info("Legacy MedGemma model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load legacy MedGemma model: {str(e)}")
        logger.warning("API will run without legacy model")
        med_gemma_model = None


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")