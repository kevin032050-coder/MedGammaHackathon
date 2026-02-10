"""
Test script for DICOM preprocessing module
Demonstrates usage and validates functionality
"""

import sys
import os
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from dicom_preprocessing import DICOMPreprocessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def test_preprocessing(sample_directory: str):
    """Test the preprocessing pipeline"""
    
    logger.info("="*60)
    logger.info("DICOM Preprocessing Test")
    logger.info("="*60)
    
    # Initialize preprocessor with target size for MedSIGLIP (typically 224x224)
    preprocessor = DICOMPreprocessor(target_size=(224, 224))
    
    logger.info(f"\nInput directory: {sample_directory}")
    
    try:
        # Run full preprocessing pipeline
        result = preprocessor.preprocess_series(sample_directory)
        
        # Display results
        logger.info("\n" + "="*60)
        logger.info("Preprocessing Results")
        logger.info("="*60)
        logger.info(f"Number of slices: {result['metadata']['num_slices']}")
        logger.info(f"Image array shape: {result['images'].shape}")
        logger.info(f"Image dtype: {result['images'].dtype}")
        logger.info(f"Value range: [{result['images'].min():.4f}, {result['images'].max():.4f}]")
        logger.info(f"\nMetadata:")
        for key, value in result['metadata'].items():
            logger.info(f"  {key}: {value}")
        
        # Save preprocessed data
        output_path = "preprocessed_test.npz"
        preprocessor.save_preprocessed(result, output_path)
        logger.info(f"\nSaved preprocessed data to: {output_path}")
        
        # Test loading
        loaded = preprocessor.load_preprocessed(output_path)
        logger.info(f"Successfully loaded data: {loaded['images'].shape}")
        
        # Clean up
        if os.path.exists(output_path):
            os.remove(output_path)
            logger.info(f"Cleaned up test file: {output_path}")
        
        logger.info("\n" + "="*60)
        logger.info("✓ All tests passed!")
        logger.info("="*60)
        
        return True
        
    except Exception as e:
        logger.error(f"\n✗ Test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def main():
    """Main entry point"""
    
    if len(sys.argv) < 2:
        print("\nDICOM Preprocessing Test Script")
        print("="*60)
        print("\nUsage:")
        print("  python test_preprocessing.py <dicom_directory>")
        print("\nExample:")
        print("  python test_preprocessing.py ../../sample-data/dicom")
        print("\nThis will:")
        print("  1. Load all DICOM files from the directory")
        print("  2. Sort them by z-axis position")
        print("  3. Preprocess each slice (normalize, resize)")
        print("  4. Save to .npz format")
        print("  5. Test loading the saved data")
        print("="*60)
        sys.exit(1)
    
    sample_directory = sys.argv[1]
    
    if not os.path.exists(sample_directory):
        logger.error(f"Directory not found: {sample_directory}")
        sys.exit(1)
    
    success = test_preprocessing(sample_directory)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
