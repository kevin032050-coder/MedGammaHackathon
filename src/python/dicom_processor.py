"""
DICOM Processing Module
Handles loading, parsing, and preprocessing of DICOM files
"""

import os
import logging
from typing import Dict, List, Any, Optional
import asyncio
import base64
from io import BytesIO

try:
    import pydicom
    import numpy as np
    from PIL import Image
    DICOM_AVAILABLE = True
except ImportError:
    DICOM_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("pydicom not available - using mock mode")

logger = logging.getLogger(__name__)

class DICOMProcessor:
    """Handles DICOM file operations"""
    
    def __init__(self):
        self.studies = {}  # In-memory storage for loaded studies
        self.study_counter = 0
    
    async def load_study(self, folder_path: str) -> Dict[str, Any]:
        """
        Load DICOM study from folder
        Returns study metadata and slice information
        """
        logger.info(f"Loading DICOM study from: {folder_path}")
        
        try:
            if not DICOM_AVAILABLE:
                return await self._load_mock_study(folder_path)
            
            # Scan folder for DICOM files
            dicom_files = []
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    # Skip hidden files and common non-DICOM extensions
                    if file.startswith('.') or file.endswith(('.txt', '.pdf', '.jpg', '.png')):
                        continue
                    
                    file_path = os.path.join(root, file)
                    try:
                        # Try to read as DICOM (don't load pixels yet for speed)
                        ds = pydicom.dcmread(file_path, stop_before_pixels=True, force=True)
                        dicom_files.append(file_path)
                        logger.debug(f"Found DICOM: {file}")
                    except Exception as e:
                        logger.debug(f"Not a DICOM file: {file} - {str(e)}")
                        continue
            
            if not dicom_files:
                logger.warning(f"No DICOM files found in {folder_path}")
                return await self._load_mock_study(folder_path)
            
            logger.info(f"Found {len(dicom_files)} DICOM files")
            
            # Read first file for metadata
            first_ds = pydicom.dcmread(dicom_files[0], stop_before_pixels=True)
            
            # Sort files by Instance Number or Slice Location
            sorted_files = []
            for file_path in dicom_files:
                ds = pydicom.dcmread(file_path, stop_before_pixels=True)
                instance_number = getattr(ds, 'InstanceNumber', 0)
                slice_location = getattr(ds, 'SliceLocation', 0)
                sorted_files.append((instance_number, slice_location, file_path))
            
            sorted_files.sort(key=lambda x: (x[0], x[1]))
            sorted_file_paths = [f[2] for f in sorted_files]
            
            self.study_counter += 1
            study_id = f"STUDY_{self.study_counter:03d}"
            
            # Extract metadata
            patient_name = str(getattr(first_ds, 'PatientName', 'UNKNOWN')).replace('^', ', ')
            patient_age = str(getattr(first_ds, 'PatientAge', 'N/A')).replace('Y', '')
            patient_sex = str(getattr(first_ds, 'PatientSex', 'U'))
            study_date = str(getattr(first_ds, 'StudyDate', 'N/A'))
            study_time = str(getattr(first_ds, 'StudyTime', 'N/A'))[:6]
            modality = str(getattr(first_ds, 'Modality', 'CT'))
            body_part = str(getattr(first_ds, 'BodyPartExamined', 'HEAD'))
            
            study_data = {
                "study_id": study_id,
                "folder_path": folder_path,
                "dicom_files": sorted_file_paths,
                "patient": {
                    "id": str(getattr(first_ds, 'PatientID', 'UNKNOWN')),
                    "name": patient_name,
                    "age": int(patient_age) if patient_age.isdigit() else 0,
                    "sex": patient_sex
                },
                "study_info": {
                    "study_date": study_date,
                    "study_time": study_time,
                    "modality": modality,
                    "body_part": body_part,
                    "protocol": str(getattr(first_ds, 'StudyDescription', 'Unknown Protocol'))
                },
                "series": [
                    {
                        "series_id": str(getattr(first_ds, 'SeriesNumber', '1')),
                        "series_description": str(getattr(first_ds, 'SeriesDescription', 'Axial')),
                        "num_slices": len(sorted_file_paths),
                        "slice_thickness": float(getattr(first_ds, 'SliceThickness', 5.0)),
                        "pixel_spacing": list(getattr(first_ds, 'PixelSpacing', [0.5, 0.5]))
                    }
                ],
                "clinical_context": {
                    "indication": "Head trauma",
                    "vitals": {
                        "gcs": 14,
                        "bp": "140/90",
                        "hr": 88
                    }
                },
                "num_slices": len(sorted_file_paths)
            }
            
            # Store study
            self.studies[study_id] = study_data
            
            logger.info(f"Loaded study {study_id} with {study_data['num_slices']} slices")
            return study_data
            
        except Exception as e:
            logger.error(f"Error loading DICOM study: {str(e)}")
            raise
    
    async def _load_mock_study(self, folder_path: str) -> Dict[str, Any]:
        """Load mock study when DICOM libraries not available"""
        await asyncio.sleep(0.5)
        
        self.study_counter += 1
        study_id = f"STUDY_{self.study_counter:03d}"
        
        study_data = {
            "study_id": study_id,
            "folder_path": folder_path,
            "dicom_files": [],
            "patient": {
                "id": "12345678",
                "name": "DOE, JOHN",
                "age": 45,
                "sex": "M"
            },
            "study_info": {
                "study_date": "2024-01-15",
                "study_time": "14:30:00",
                "modality": "CT",
                "body_part": "HEAD",
                "protocol": "Trauma Protocol"
            },
            "series": [
                {
                    "series_id": "S001",
                    "series_description": "Axial CT Head",
                    "num_slices": 40,
                    "slice_thickness": 5.0,
                    "pixel_spacing": [0.5, 0.5]
                }
            ],
            "clinical_context": {
                "indication": "Head trauma",
                "vitals": {
                    "gcs": 14,
                    "bp": "140/90",
                    "hr": 88
                }
            },
            "num_slices": 40
        }
        
        self.studies[study_id] = study_data
        return study_data
    
    def get_study(self, study_id: str) -> Dict[str, Any]:
        """Get loaded study data"""
        if study_id not in self.studies:
            raise ValueError(f"Study {study_id} not found")
        return self.studies[study_id]
    
    def get_slice(self, study_id: str, slice_index: int) -> Dict[str, Any]:
        """Get specific slice data"""
        study = self.get_study(study_id)
        
        if slice_index < 0 or slice_index >= study['num_slices']:
            raise ValueError(f"Slice index {slice_index} out of range")
        
        # TODO: Implement actual slice extraction
        # Would return pixel data, metadata, etc.
        
        return {
            "study_id": study_id,
            "slice_index": slice_index,
            "slice_location": slice_index * 5.0,  # Mock location
            "image_data": None,  # Would contain actual pixel data
            "metadata": {
                "window_center": 40,
                "window_width": 80
            }
        }
    
    def convert_dicom_to_image(self, dicom_data) -> bytes:
        """
        Convert DICOM pixel data to viewable image format
        Returns PNG bytes for display in Electron
        """
        # TODO: Implement with pydicom and PIL
        # Steps:
        # 1. Apply window/level
        # 2. Normalize to 0-255
        # 3. Convert to PNG
        # 4. Return as base64 or bytes
        pass
    
    def get_slice_image(self, study_id: str, slice_index: int, window_center: int = None, window_width: int = None) -> str:
        """
        Get slice image as base64 string for display - HIGH QUALITY
        """
        if not DICOM_AVAILABLE:
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        try:
            study = self.get_study(study_id)
            if not study.get('dicom_files') or slice_index >= len(study['dicom_files']):
                logger.error(f"Invalid slice index: {slice_index}, available: {len(study.get('dicom_files', []))}")
                return None
            
            file_path = study['dicom_files'][slice_index]
            ds = pydicom.dcmread(file_path)
            
            # Get pixel array with proper data type
            pixel_array = ds.pixel_array.astype(np.float64)  # Use float64 for precision
            original_shape = pixel_array.shape
            logger.info(f"Original pixel array shape: {original_shape}, dtype: {pixel_array.dtype}")
            logger.info(f"Pixel value range: {pixel_array.min()} to {pixel_array.max()}")
            
            # Apply Rescale Slope/Intercept if present (for CT Hounsfield units)
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                pixel_array = pixel_array * float(ds.RescaleSlope) + float(ds.RescaleIntercept)
                logger.info(f"Applied rescale - new range: {pixel_array.min()} to {pixel_array.max()}")
            
            # Auto-calculate window/level if not provided
            if window_center is None or window_width is None:
                # Try to get from DICOM tags first
                if hasattr(ds, 'WindowCenter') and hasattr(ds, 'WindowWidth'):
                    if isinstance(ds.WindowCenter, (list, pydicom.multival.MultiValue)):
                        window_center = float(ds.WindowCenter[0])
                        window_width = float(ds.WindowWidth[0])
                    else:
                        window_center = float(ds.WindowCenter)
                        window_width = float(ds.WindowWidth)
                    logger.info(f"Using DICOM window/level: {window_center}/{window_width}")
                else:
                    # Auto-calculate from pixel statistics
                    p2 = np.percentile(pixel_array, 2)
                    p98 = np.percentile(pixel_array, 98)
                    window_center = (p2 + p98) / 2
                    window_width = p98 - p2
                    logger.info(f"Auto-calculated window/level: {window_center}/{window_width}")
            
            # Apply window/level with high precision
            img_array = self._apply_window_level_hq(pixel_array, window_center, window_width)
            
            # Apply PhotometricInterpretation (handle inverted images)
            if hasattr(ds, 'PhotometricInterpretation'):
                if ds.PhotometricInterpretation == "MONOCHROME1":
                    # Invert for MONOCHROME1 (lower values = brighter)
                    img_array = 255 - img_array
            
            # Convert to uint16 first for better quality, then to uint8
            img_array = np.clip(img_array, 0, 255).astype(np.uint8)
            
            # Create PIL Image
            img = Image.fromarray(img_array, mode='L')  # Keep as grayscale
            
            # Get original dimensions
            original_width, original_height = img.size
            
            # Calculate aspect ratio preserving resize to 512x512 max
            max_size = 768  # Increase from 512 for better quality
            if original_width > original_height:
                new_width = max_size
                new_height = int((original_height / original_width) * max_size)
            else:
                new_height = max_size
                new_width = int((original_width / original_height) * max_size)
            
            # Use high-quality resampling (Lanczos is best for downsampling)
            if img.size != (new_width, new_height):
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Convert to RGB for better browser compatibility
            img = img.convert('RGB')
            
            # Save as PNG with maximum quality
            buffered = BytesIO()
            img.save(buffered, format="PNG", optimize=False, compress_level=1)  # Low compression = higher quality
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            logger.info(f"Successfully converted slice {slice_index} to base64 (size: {new_width}x{new_height})")
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            logger.error(f"Error getting slice image: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def _apply_window_level_hq(self, pixel_array: np.ndarray, center: float, width: float) -> np.ndarray:
        """Apply window/level with high quality processing"""
        # Handle different array shapes
        if len(pixel_array.shape) == 3:
            if pixel_array.shape[0] == 1:
                pixel_array = pixel_array[0]
            elif pixel_array.shape[2] == 3:
                pixel_array = np.mean(pixel_array, axis=2)
            else:
                pixel_array = pixel_array[0]
        
        if len(pixel_array.shape) > 2:
            pixel_array = pixel_array.reshape(pixel_array.shape[-2], pixel_array.shape[-1])
        
        # Calculate window bounds
        img_min = center - width / 2.0
        img_max = center + width / 2.0
        
        # Apply windowing with high precision
        windowed = np.clip(pixel_array, img_min, img_max)
        
        # Normalize to 0-255 with high precision
        if width > 0:
            windowed = ((windowed - img_min) / width * 255.0)
        else:
            if windowed.max() > windowed.min():
                windowed = ((windowed - windowed.min()) / (windowed.max() - windowed.min()) * 255.0)
            else:
                windowed = np.zeros_like(windowed)
        
        return windowed
    
    def _apply_window_level(self, pixel_array: np.ndarray, center: float, width: float) -> np.ndarray:
        """Apply window/level to pixel array"""
        # Handle different array shapes
        if len(pixel_array.shape) == 3:
            # Multi-frame or color image - take first frame/channel
            if pixel_array.shape[0] == 1:
                pixel_array = pixel_array[0]  # Remove first dimension
            elif pixel_array.shape[2] == 3:
                # RGB image - convert to grayscale
                pixel_array = np.mean(pixel_array, axis=2)
            else:
                # Take first frame
                pixel_array = pixel_array[0]
        
        # Ensure 2D array
        if len(pixel_array.shape) > 2:
            pixel_array = pixel_array.reshape(pixel_array.shape[-2], pixel_array.shape[-1])
        
        # Calculate min/max from center and width
        img_min = center - width / 2
        img_max = center + width / 2
        
        # Clip values to window
        windowed = np.clip(pixel_array, img_min, img_max)
        
        # Normalize to 0-255
        if width > 0:
            windowed = ((windowed - img_min) / width * 255.0)
        else:
            # If width is 0, just normalize based on actual range
            if windowed.max() > windowed.min():
                windowed = ((windowed - windowed.min()) / (windowed.max() - windowed.min()) * 255.0)
            else:
                windowed = np.zeros_like(windowed)
        
        return windowed
    
    def extract_metadata(self, dicom_file_path: str) -> Dict[str, Any]:
        """Extract metadata from DICOM file"""
        # TODO: Implement with pydicom
        pass
    
    def list_loaded_studies(self) -> List[Dict[str, Any]]:
        """Get list of all loaded studies"""
        return [
            {
                "study_id": study_id,
                "patient_name": study["patient"]["name"],
                "modality": study["study_info"]["modality"],
                "study_date": study["study_info"]["study_date"]
            }
            for study_id, study in self.studies.items()
        ]
