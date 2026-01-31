from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import logging

# Import our custom modules
from med_gemma import MedGemmaModel
from dicom_processor import DICOMProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MedGemma Radiology API", version="1.0.0")

# CORS middleware for Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
dicom_processor = DICOMProcessor()
med_gemma_model = None  # Will be initialized on startup

# Request/Response Models
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

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "med_gemma_loaded": med_gemma_model is not None and med_gemma_model.is_loaded()
    }

@app.post("/api/load-study")
async def load_study(request: LoadStudyRequest):
    """Load and parse DICOM study from folder"""
    try:
        logger.info(f"Loading DICOM study from: {request.path}")
        study_data = await dicom_processor.load_study(request.path)
        return {
            "success": True,
            "study": study_data
        }
    except Exception as e:
        logger.error(f"Error loading study: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-study")
async def analyze_study(request: AnalyzeStudyRequest):
    """Analyze entire study with Med Gemma"""
    try:
        logger.info(f"Analyzing study: {request.study_id}")
        
        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")
        
        study_data = dicom_processor.get_study(request.study_id)
        analysis = await med_gemma_model.analyze_study(study_data)
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing study: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-slice")
async def analyze_slice(request: AnalyzeSliceRequest):
    """Analyze specific slice with Med Gemma"""
    try:
        logger.info(f"Analyzing slice {request.slice_index} of study {request.study_id}")
        
        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")
        
        slice_data = dicom_processor.get_slice(request.study_id, request.slice_index)
        analysis = await med_gemma_model.analyze_slice(slice_data)
        
        return {
            "success": True,
            "slice_analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing slice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Handle chat queries with Med Gemma"""
    try:
        logger.info(f"Chat query: {request.query}")
        
        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")
        
        response = await med_gemma_model.chat(request.query, request.context)
        
        return {
            "success": True,
            "response": response
        }
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/incidental-findings")
async def get_incidental_findings(request: IncidentalFindingsRequest):
    """Detect incidental findings in study"""
    try:
        logger.info(f"Getting incidental findings for study: {request.study_id}")
        
        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")
        
        study_data = dicom_processor.get_study(request.study_id)
        findings = await med_gemma_model.detect_incidental_findings(study_data)
        
        return {
            "success": True,
            "incidental_findings": findings
        }
    except Exception as e:
        logger.error(f"Error detecting incidental findings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-report")
async def generate_report(request: GenerateReportRequest):
    """Generate structured report from findings"""
    try:
        logger.info(f"Generating report for study: {request.study_id}")
        
        if med_gemma_model is None:
            raise HTTPException(status_code=503, detail="Med Gemma model not loaded")
        
        study_data = dicom_processor.get_study(request.study_id)
        report = await med_gemma_model.generate_report(study_data, request.findings)
        
        return {
            "success": True,
            "report": report
        }
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit radiologist feedback for model improvement"""
    try:
        logger.info(f"Feedback received for study: {request.study_id}")
        
        # Log feedback for future model training
        feedback_log = {
            "study_id": request.study_id,
            "agreed": request.agreed,
            "correction": request.correction,
            "timestamp": None  # Add timestamp
        }
        
        # TODO: Save to feedback database/file
        
        return {
            "success": True,
            "message": "Feedback logged for model improvement (simulated)"
        }
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/get-slice-image")
async def get_slice_image(request: GetSliceImageRequest):
    """Get slice image as base64 for display"""
    try:
        logger.info(f"Getting slice image: study={request.study_id}, slice={request.slice_index}, preset={request.window_preset}")
        
        image_data = dicom_processor.get_slice_image(
            request.study_id, 
            request.slice_index,
            request.window_center,
            request.window_width,
            request.window_preset
        )
        
        return {
            "success": True,
            "image_data": image_data
        }
    except Exception as e:
        logger.error(f"Error getting slice image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/get-dicom-file-data")
async def get_dicom_file_data(request: AnalyzeStudyRequest):
    """Get all DICOM files as base64 for direct loading"""
    try:
        logger.info(f"Getting DICOM file data for study: {request.study_id}")
        
        study_data = dicom_processor.get_study(request.study_id)
        dicom_files = study_data.get('dicom_files', [])
        
        # Read all files and encode as base64
        import base64
        file_data = []
        for filepath in dicom_files:
            with open(filepath, 'rb') as f:
                content = f.read()
                encoded = base64.b64encode(content).decode('utf-8')
                file_data.append(encoded)
        
        logger.info(f"Returning {len(file_data)} files")
        
        return {
            "success": True,
            "files": file_data
        }
    except Exception as e:
        logger.error(f"Error getting DICOM file data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/get-dicom-urls")
async def get_dicom_urls(request: AnalyzeStudyRequest):
    """Get DICOM file URLs for DWV to load directly"""
    try:
        logger.info(f"Getting DICOM URLs for study: {request.study_id}")
        
        study_data = dicom_processor.get_study(request.study_id)
        dicom_files = study_data.get('dicom_files', [])
        
        # Return URLs to backend endpoints instead of file:// URLs
        urls = [f"http://localhost:8000/api/dicom-file/{request.study_id}/{i}" 
                for i in range(len(dicom_files))]
        
        return {
            "success": True,
            "urls": urls
        }
    except Exception as e:
        logger.error(f"Error getting DICOM URLs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dicom-file/{study_id}/{file_index}")
async def get_dicom_file(study_id: str, file_index: int):
    """Serve raw DICOM file for DWV"""
    try:
        logger.info(f"Serving DICOM file: study={study_id}, index={file_index}")
        
        study_data = dicom_processor.get_study(study_id)
        dicom_files = study_data.get('dicom_files', [])
        
        if file_index >= len(dicom_files):
            logger.error(f"File index {file_index} out of range (max: {len(dicom_files)-1})")
            raise HTTPException(status_code=404, detail="File not found")
        
        filepath = dicom_files[file_index]
        logger.info(f"Reading file: {filepath}")
        
        # Read and return raw DICOM file
        with open(filepath, 'rb') as f:
            content = f.read()
        
        logger.info(f"Serving {len(content)} bytes")
        
        return Response(
            content=content, 
            media_type="application/dicom",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
    except FileNotFoundError as e:
        logger.error(f"File not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error serving DICOM file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Initialize Med Gemma model on startup"""
    global med_gemma_model
    logger.info("Starting Med Gemma Radiology API...")
    
    try:
        med_gemma_model = MedGemmaModel()
        await med_gemma_model.load_model()
        logger.info("Med Gemma model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load Med Gemma model: {str(e)}")
        logger.warning("API will run without Med Gemma - using mock responses")
        med_gemma_model = None

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
