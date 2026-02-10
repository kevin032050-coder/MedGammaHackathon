"""
DICOM Image Preprocessing Module
Part 1 of the MedGamma Pipeline Architecture:
1. Clean and preprocess DICOM data
2. Prepare data for MedSIGLIP embedding
"""

import os
import logging
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from pathlib import Path

try:
    import pydicom
    from pydicom.dataset import Dataset
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False
    
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

logger = logging.getLogger(__name__)


class DICOMPreprocessor:
    """
    Preprocesses DICOM images for medical AI pipeline
    - Loads DICOM files from directory
    - Sorts slices by z-axis position
    - Normalizes intensity values
    - Resizes to standard dimensions
    - Handles different modalities (CT, MRI, etc.)
    """
    
    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """
        Initialize preprocessor
        
        Args:
            target_size: Target image size for model input (width, height)
        """
        self.target_size = target_size
        self.logger = logging.getLogger(__name__)
        
    def load_dicom_series(self, directory_path: str) -> List[Dataset]:
        """
        Load all DICOM files from directory
        
        Args:
            directory_path: Path to directory containing DICOM files
            
        Returns:
            List of pydicom Dataset objects
        """
        if not PYDICOM_AVAILABLE:
            raise ImportError("pydicom is required for DICOM preprocessing")
            
        dicom_files = []
        directory = Path(directory_path)
        
        self.logger.info(f"Scanning directory: {directory_path}")
        
        # Recursively find all DICOM files
        for file_path in directory.rglob("*"):
            if file_path.is_file():
                # Skip common non-DICOM files
                if file_path.suffix.lower() in ['.txt', '.pdf', '.jpg', '.png', '.json', '.xml']:
                    continue
                    
                try:
                    ds = pydicom.dcmread(str(file_path), force=True)
                    # Verify it has pixel data
                    if hasattr(ds, 'pixel_array'):
                        dicom_files.append(ds)
                        self.logger.debug(f"Loaded DICOM: {file_path.name}")
                except Exception as e:
                    self.logger.debug(f"Skipping {file_path.name}: {str(e)}")
                    continue
        
        self.logger.info(f"Found {len(dicom_files)} DICOM files with pixel data")
        return dicom_files
    
    def sort_by_z_axis(self, dicom_list: List[Dataset]) -> List[Dataset]:
        """
        Sort DICOM slices by z-axis position (anatomical ordering)
        
        Args:
            dicom_list: List of unsorted DICOM datasets
            
        Returns:
            List of DICOM datasets sorted by z-position
        """
        if not dicom_list:
            return []
        
        # Try multiple sorting strategies in order of preference
        sorting_info = []
        
        for ds in dicom_list:
            # Strategy 1: ImagePositionPatient (most reliable for z-axis)
            z_pos = None
            if hasattr(ds, 'ImagePositionPatient') and len(ds.ImagePositionPatient) >= 3:
                z_pos = float(ds.ImagePositionPatient[2])
            
            # Strategy 2: SliceLocation (common fallback)
            slice_location = None
            if hasattr(ds, 'SliceLocation'):
                slice_location = float(ds.SliceLocation)
            
            # Strategy 3: InstanceNumber (less reliable but common)
            instance_number = None
            if hasattr(ds, 'InstanceNumber'):
                instance_number = int(ds.InstanceNumber)
            
            # Strategy 4: Acquisition Number
            acquisition_number = None
            if hasattr(ds, 'AcquisitionNumber'):
                acquisition_number = int(ds.AcquisitionNumber)
            
            sorting_info.append({
                'dataset': ds,
                'z_position': z_pos,
                'slice_location': slice_location,
                'instance_number': instance_number,
                'acquisition_number': acquisition_number
            })
        
        # Determine which sorting key to use
        # Prefer z_position > slice_location > instance_number > acquisition_number
        if any(info['z_position'] is not None for info in sorting_info):
            sorting_info.sort(key=lambda x: (x['z_position'] is None, x['z_position'] or 0))
            self.logger.info("Sorted by ImagePositionPatient[2] (z-axis)")
        elif any(info['slice_location'] is not None for info in sorting_info):
            sorting_info.sort(key=lambda x: (x['slice_location'] is None, x['slice_location'] or 0))
            self.logger.info("Sorted by SliceLocation")
        elif any(info['instance_number'] is not None for info in sorting_info):
            sorting_info.sort(key=lambda x: (x['instance_number'] is None, x['instance_number'] or 0))
            self.logger.info("Sorted by InstanceNumber")
        elif any(info['acquisition_number'] is not None for info in sorting_info):
            sorting_info.sort(key=lambda x: (x['acquisition_number'] is None, x['acquisition_number'] or 0))
            self.logger.info("Sorted by AcquisitionNumber")
        else:
            self.logger.warning("No sorting metadata found, keeping original order")
        
        sorted_datasets = [info['dataset'] for info in sorting_info]
        return sorted_datasets
    
    def extract_pixel_array(self, ds: Dataset) -> np.ndarray:
        """
        Extract and convert pixel array to standardized format
        
        Args:
            ds: pydicom Dataset
            
        Returns:
            Numpy array with pixel data
        """
        # Get raw pixel array
        pixel_array = ds.pixel_array.astype(np.float64)
        
        # Handle multi-frame/3D arrays
        if len(pixel_array.shape) == 3:
            # Take first frame if multiple frames
            pixel_array = pixel_array[0]
        
        # Apply DICOM rescale if present (converts to Hounsfield Units for CT)
        if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
            slope = float(ds.RescaleSlope)
            intercept = float(ds.RescaleIntercept)
            pixel_array = pixel_array * slope + intercept
            self.logger.debug(f"Applied rescale: slope={slope}, intercept={intercept}")
        
        return pixel_array
    
    def normalize_intensity(self, pixel_array: np.ndarray, modality: str = 'CT',
                           window_center: Optional[float] = None,
                           window_width: Optional[float] = None) -> np.ndarray:
        """
        Normalize intensity values based on modality
        
        Args:
            pixel_array: Input pixel array
            modality: Imaging modality (CT, MR, etc.)
            window_center: Optional custom window center
            window_width: Optional custom window width
            
        Returns:
            Normalized array in range [0, 1]
        """
        if modality.upper() == 'CT':
            # For CT, use windowing
            if window_center is None or window_width is None:
                # Default brain window for head CT
                window_center = 40
                window_width = 80
            
            # Apply window/level
            img_min = window_center - window_width / 2.0
            img_max = window_center + window_width / 2.0
            
            # Clip and normalize to [0, 1]
            normalized = np.clip(pixel_array, img_min, img_max)
            normalized = (normalized - img_min) / (window_width + 1e-8)
            
            self.logger.debug(f"CT windowing: center={window_center}, width={window_width}")
            
        else:
            # For other modalities (MR, etc.), use percentile normalization
            p2 = np.percentile(pixel_array, 2)
            p98 = np.percentile(pixel_array, 98)
            
            normalized = np.clip(pixel_array, p2, p98)
            normalized = (normalized - p2) / (p98 - p2 + 1e-8)
            
            self.logger.debug(f"Percentile normalization: p2={p2:.2f}, p98={p98:.2f}")
        
        return normalized
    
    def resize_image(self, pixel_array: np.ndarray) -> np.ndarray:
        """
        Resize image to target size
        
        Args:
            pixel_array: Input array (normalized to [0, 1])
            
        Returns:
            Resized array
        """
        if not PIL_AVAILABLE:
            # Fallback: simple numpy interpolation
            from scipy.ndimage import zoom
            h, w = pixel_array.shape
            th, tw = self.target_size
            zoom_factors = (th / h, tw / w)
            resized = zoom(pixel_array, zoom_factors, order=1)
            return resized
        
        # Convert to uint8 for PIL
        img_uint8 = (pixel_array * 255).astype(np.uint8)
        
        # Use PIL for high-quality resizing
        img = Image.fromarray(img_uint8, mode='L')
        img_resized = img.resize(self.target_size, Image.Resampling.LANCZOS)
        
        # Convert back to float [0, 1]
        resized_array = np.array(img_resized, dtype=np.float32) / 255.0
        
        return resized_array
    
    def preprocess_slice(self, ds: Dataset, 
                        window_center: Optional[float] = None,
                        window_width: Optional[float] = None) -> np.ndarray:
        """
        Complete preprocessing pipeline for a single slice
        
        Args:
            ds: pydicom Dataset
            window_center: Optional custom window center
            window_width: Optional custom window width
            
        Returns:
            Preprocessed image array ready for model input
        """
        # Extract pixel data
        pixel_array = self.extract_pixel_array(ds)
        
        # Get modality
        modality = getattr(ds, 'Modality', 'CT')
        
        # Normalize intensity
        normalized = self.normalize_intensity(pixel_array, modality, window_center, window_width)
        
        # Resize to target size
        resized = self.resize_image(normalized)
        
        return resized
    
    def preprocess_series(self, directory_path: str,
                         window_center: Optional[float] = None,
                         window_width: Optional[float] = None) -> Dict[str, Any]:
        """
        Complete preprocessing pipeline for an entire DICOM series
        
        Args:
            directory_path: Path to directory containing DICOM files
            window_center: Optional custom window center  
            window_width: Optional custom window width
            
        Returns:
            Dictionary containing:
                - images: np.ndarray of shape (num_slices, height, width)
                - metadata: Dictionary with series information
        """
        # Load DICOM files
        dicom_list = self.load_dicom_series(directory_path)
        
        if not dicom_list:
            raise ValueError(f"No DICOM files found in {directory_path}")
        
        # Sort by z-axis
        sorted_dicom = self.sort_by_z_axis(dicom_list)
        
        # Preprocess each slice
        preprocessed_slices = []
        for i, ds in enumerate(sorted_dicom):
            try:
                preprocessed = self.preprocess_slice(ds, window_center, window_width)
                preprocessed_slices.append(preprocessed)
                self.logger.debug(f"Preprocessed slice {i+1}/{len(sorted_dicom)}")
            except Exception as e:
                self.logger.error(f"Error preprocessing slice {i}: {str(e)}")
                continue
        
        if not preprocessed_slices:
            raise ValueError("No slices were successfully preprocessed")
        
        # Stack into array
        images = np.stack(preprocessed_slices, axis=0)
        
        # Extract metadata from first slice
        first_ds = sorted_dicom[0]
        metadata = {
            'num_slices': len(preprocessed_slices),
            'modality': getattr(first_ds, 'Modality', 'UNKNOWN'),
            'patient_id': str(getattr(first_ds, 'PatientID', 'UNKNOWN')),
            'study_date': str(getattr(first_ds, 'StudyDate', 'UNKNOWN')),
            'series_description': str(getattr(first_ds, 'SeriesDescription', 'UNKNOWN')),
            'body_part': str(getattr(first_ds, 'BodyPartExamined', 'UNKNOWN')),
            'image_shape': (images.shape[1], images.shape[2]),
            'slice_thickness': float(getattr(first_ds, 'SliceThickness', 0.0)),
            'pixel_spacing': list(getattr(first_ds, 'PixelSpacing', [0.0, 0.0]))
        }
        
        self.logger.info(f"Preprocessing complete: {images.shape[0]} slices, shape={images.shape}")
        
        return {
            'images': images,
            'metadata': metadata
        }
    
    def save_preprocessed(self, preprocessed_data: Dict[str, Any], output_path: str):
        """
        Save preprocessed data to disk
        
        Args:
            preprocessed_data: Output from preprocess_series()
            output_path: Path to save file (.npz format)
        """
        np.savez_compressed(
            output_path,
            images=preprocessed_data['images'],
            metadata=str(preprocessed_data['metadata'])
        )
        self.logger.info(f"Saved preprocessed data to {output_path}")
    
    def load_preprocessed(self, input_path: str) -> Dict[str, Any]:
        """
        Load preprocessed data from disk
        
        Args:
            input_path: Path to .npz file
            
        Returns:
            Dictionary with images and metadata
        """
        data = np.load(input_path, allow_pickle=True)
        return {
            'images': data['images'],
            'metadata': eval(str(data['metadata']))
        }


def main():
    """Example usage"""
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage: python dicom_preprocessing.py <directory_path> [output_path]")
        sys.exit(1)
    
    directory_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "preprocessed_dicom.npz"
    
    # Create preprocessor
    preprocessor = DICOMPreprocessor(target_size=(224, 224))
    
    # Preprocess series
    print(f"Preprocessing DICOM series from: {directory_path}")
    result = preprocessor.preprocess_series(directory_path)
    
    print(f"\nPreprocessing Results:")
    print(f"  Number of slices: {result['metadata']['num_slices']}")
    print(f"  Image shape: {result['images'].shape}")
    print(f"  Modality: {result['metadata']['modality']}")
    print(f"  Body part: {result['metadata']['body_part']}")
    
    # Save results
    preprocessor.save_preprocessed(result, output_path)
    print(f"\nSaved to: {output_path}")


if __name__ == "__main__":
    main()
