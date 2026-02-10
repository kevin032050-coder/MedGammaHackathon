# DICOM Preprocessing Module

Part 1 of the MedGamma Pipeline Architecture for medical image analysis.

## Overview

This module handles the preprocessing of DICOM medical images to prepare them for downstream AI models (MedSIGLIP, MLP, MedGemma).

## Pipeline Architecture

```
1. Clean and Preprocess Data (THIS MODULE) ✓
   ├── Load DICOM files
   ├── Sort by z-axis position
   ├── Normalize intensity values
   └── Resize to standard dimensions

2. MedSIGLIP Embedding (TODO)
   └── Generate image embeddings

3. MLP Criticalness Score (TODO)
   └── Predict critical vs non-critical

4. MedGemma Analysis (TODO)
   └── Generate detailed reports for critical cases
```

## Features

### ✓ DICOM Loading
- Recursively scans directories for DICOM files
- Validates files have pixel data
- Handles multi-frame and 3D volumes

### ✓ Z-Axis Sorting
Automatically sorts slices using multiple strategies (in order of preference):
1. **ImagePositionPatient[2]** - Most reliable for anatomical ordering
2. **SliceLocation** - Common fallback
3. **InstanceNumber** - Basic ordering
4. **AcquisitionNumber** - Last resort

### ✓ Intensity Normalization
- **CT scans**: Window/level adjustment (default: brain window)
- **MRI scans**: Percentile-based normalization
- Applies DICOM rescale slope/intercept (Hounsfield units for CT)

### ✓ Image Resizing
- Configurable target size (default: 224x224 for MedSIGLIP)
- High-quality Lanczos resampling
- Maintains aspect ratio information in metadata

### ✓ Metadata Extraction
Preserves important DICOM metadata:
- Patient ID, study date
- Modality, body part examined
- Series description
- Slice thickness, pixel spacing
- Number of slices

## Installation

```bash
cd src/python
python -m pip install -r requirements.txt
```

Required packages:
- `pydicom` - DICOM file parsing
- `numpy` - Numerical operations
- `pillow` - Image processing
- `scipy` - Advanced interpolation

## Usage

### Basic Usage

```python
from dicom_preprocessing import DICOMPreprocessor

# Initialize preprocessor
preprocessor = DICOMPreprocessor(target_size=(224, 224))

# Preprocess entire series
result = preprocessor.preprocess_series('path/to/dicom/folder')

# Access preprocessed data
images = result['images']  # Shape: (num_slices, height, width)
metadata = result['metadata']

print(f"Loaded {metadata['num_slices']} slices")
print(f"Shape: {images.shape}")
```

### Custom Windowing (CT scans)

```python
# Use custom window/level settings
result = preprocessor.preprocess_series(
    'path/to/dicom/folder',
    window_center=40,   # Brain window
    window_width=80
)
```

### Save/Load Preprocessed Data

```python
# Save to compressed format
preprocessor.save_preprocessed(result, 'output.npz')

# Load later
loaded_data = preprocessor.load_preprocessed('output.npz')
```

### Command Line Usage

```bash
# Preprocess a directory
python dicom_preprocessing.py path/to/dicom output.npz

# Run tests
python test_preprocessing.py path/to/dicom
```

## API Reference

### `DICOMPreprocessor`

Main preprocessing class.

#### `__init__(target_size=(224, 224))`
Initialize preprocessor with target image dimensions.

#### `preprocess_series(directory_path, window_center=None, window_width=None)`
Complete preprocessing pipeline for a DICOM series.

**Args:**
- `directory_path` (str): Path to folder containing DICOM files
- `window_center` (float, optional): CT window center
- `window_width` (float, optional): CT window width

**Returns:**
- Dictionary with:
  - `images`: numpy array of shape (N, H, W) with values in [0, 1]
  - `metadata`: Dictionary with series information

#### `load_dicom_series(directory_path)`
Load all DICOM files from directory.

#### `sort_by_z_axis(dicom_list)`
Sort DICOM slices by anatomical z-position.

#### `preprocess_slice(ds, window_center=None, window_width=None)`
Preprocess a single DICOM slice.

#### `save_preprocessed(data, output_path)`
Save preprocessed data to .npz file.

#### `load_preprocessed(input_path)`
Load preprocessed data from .npz file.

## Output Format

### Images Array
- **Shape**: `(num_slices, height, width)`
- **Type**: `numpy.float32`
- **Range**: `[0, 1]` (normalized)
- **Order**: Sorted by z-axis (anatomical ordering)

### Metadata Dictionary
```python
{
    'num_slices': 120,
    'modality': 'CT',
    'patient_id': 'ABC123',
    'study_date': '20240115',
    'series_description': 'CT HEAD ROUTINE',
    'body_part': 'HEAD',
    'image_shape': (224, 224),
    'slice_thickness': 5.0,
    'pixel_spacing': [0.488, 0.488]
}
```

## Common Window/Level Presets

For CT scans, common presets:

| Preset | Window Center | Window Width | Use Case |
|--------|---------------|--------------|----------|
| Brain | 40 | 80 | Head CT, stroke |
| Subdural | 80 | 200 | Subdural hematoma |
| Bone | 400 | 1800 | Fractures |
| Lung | -600 | 1500 | Chest CT |
| Abdomen | 40 | 400 | Abdominal CT |
| Liver | 30 | 150 | Liver lesions |

## Integration with MedSIGLIP

The preprocessed images are ready for MedSIGLIP embedding:

```python
# Preprocess DICOM
preprocessor = DICOMPreprocessor(target_size=(224, 224))
result = preprocessor.preprocess_series('dicom_folder')

# Images are now in correct format for MedSIGLIP
images = result['images']  # Shape: (N, 224, 224), Range: [0, 1]

# TODO: Feed into MedSIGLIP model
# embeddings = medsiglip_model(images)
```

## Error Handling

The module handles common issues:
- Missing DICOM tags (uses defaults)
- Unsorted slices (automatic z-axis sorting)
- Multi-frame DICOM files (extracts first frame)
- Missing rescale parameters (uses raw values)
- Non-square pixels (handles via resizing)

## Testing

Run the test suite:

```bash
cd src/python
python test_preprocessing.py ../../sample-data/dicom
```

Expected output:
```
Preprocessing Results
============================================================
Number of slices: 40
Image array shape: (40, 224, 224)
Image dtype: float32
Value range: [0.0000, 1.0000]
```

## Next Steps

After preprocessing (Part 1), the pipeline continues:

1. ✓ **Preprocessing** (this module)
2. **MedSIGLIP** - Generate embeddings for each slice
3. **MLP** - Score each slice for criticalness
4. **MedGemma** - Generate detailed analysis for critical findings

## Contributing

When adding features:
- Maintain backward compatibility
- Add logging for debugging
- Handle edge cases gracefully
- Update tests and documentation

## License

MIT
