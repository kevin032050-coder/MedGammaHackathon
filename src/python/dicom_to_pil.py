# src/python/dicom_to_pil.py (or inside dicom_processor.py)
import numpy as np
from PIL import Image

def to_grayscale_pil(pixel_array: np.ndarray) -> Image.Image:
    """
    Convert raw HU / pixel array into a displayable 8-bit PIL image.
    Use a simple robust normalization for triage (not diagnostic).
    """
    arr = pixel_array.astype(np.float32)

    # Robust normalize using percentiles (helps across different studies)
    lo, hi = np.percentile(arr, (1, 99))
    if hi <= lo:
        hi = lo + 1.0
    arr = np.clip(arr, lo, hi)
    arr = (arr - lo) / (hi - lo) * 255.0
    arr8 = arr.astype(np.uint8)

    return Image.fromarray(arr8, mode="L").convert("RGB")