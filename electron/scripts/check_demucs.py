#!/usr/bin/env python3
"""
Check if Demucs and dependencies are properly installed
Run this script to diagnose stem separation issues
"""
import sys
import json

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"✓ Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ ERROR: Python 3.8+ is required")
        return False
    
    return True

def check_module(module_name):
    """Check if a module is installed"""
    try:
        __import__(module_name)
        print(f"✓ {module_name} is installed")
        return True
    except ImportError:
        print(f"❌ {module_name} is NOT installed")
        return False

def check_torch_details():
    """Check PyTorch installation details"""
    try:
        import torch
        print(f"✓ PyTorch version: {torch.__version__}")
        print(f"  - CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"  - CUDA version: {torch.version.cuda}")
            print(f"  - GPU device: {torch.cuda.get_device_name(0)}")
        return True
    except Exception as e:
        print(f"❌ Error checking PyTorch: {e}")
        return False

def check_demucs_models():
    """Check if Demucs models can be loaded"""
    try:
        from demucs.pretrained import get_model
        print("✓ Testing Demucs model loading...")
        
        # Try to load model (will download if not exists)
        model = get_model('htdemucs_ft')
        print(f"✓ Model 'htdemucs_ft' loaded successfully")
        print(f"  - Model sources: {model.sources}")
        return True
    except Exception as e:
        print(f"❌ Error loading Demucs model: {e}")
        return False

def main():
    print("=" * 60)
    print("DEMUCS INSTALLATION CHECK")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Check Python version
    print("1. Checking Python version...")
    if not check_python_version():
        all_ok = False
    print()
    
    # Check required modules
    print("2. Checking required packages...")
    required_modules = ['torch', 'demucs', 'numpy', 'tqdm']
    for module in required_modules:
        if not check_module(module):
            all_ok = False
    print()
    
    # Check PyTorch details
    print("3. Checking PyTorch configuration...")
    if not check_torch_details():
        all_ok = False
    print()
    
    # Check Demucs models
    print("4. Checking Demucs models...")
    if not check_demucs_models():
        all_ok = False
    print()
    
    # Final result
    print("=" * 60)
    if all_ok:
        print("✅ ALL CHECKS PASSED! Demucs is ready to use.")
        print()
        print("You can now use stem separation in the app.")
    else:
        print("❌ SOME CHECKS FAILED!")
        print()
        print("To fix:")
        print("1. Install missing packages:")
        print("   pip install torch demucs")
        print()
        print("2. If still failing, try:")
        print("   pip install --upgrade torch demucs")
        print()
        print("3. For more help, see: STEM_SEPARATION_SETUP.md")
    print("=" * 60)
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
