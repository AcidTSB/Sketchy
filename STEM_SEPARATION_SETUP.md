# 🎵 Stem Separation Setup Guide

## Error: `Demucs process exited with code 3221225477`

This error (0xC0000005 = Access Violation on Windows) typically occurs when:

- Python/Demucs is not installed properly
- Missing dependencies (torch, demucs)
- Memory issues (RAM không đủ)
- Missing Visual C++ Redistributables

---

## ✅ Solution: Install Demucs Properly

### Step 1: Check Python Installation

```bash
# Check Python version (requires Python 3.8+)
python --version

# If not installed, download from: https://www.python.org/downloads/
```

### Step 2: Install Demucs + PyTorch

**Option A: CPU-only (Recommended for most users)**

```bash
# Install PyTorch CPU version
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Demucs
pip install demucs
```

**Option B: GPU (CUDA) - Faster but requires NVIDIA GPU**

```bash
# Install PyTorch with CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Demucs
pip install demucs
```

### Step 3: Verify Installation

```bash
# Test Demucs
python -c "import demucs; print('Demucs installed successfully!')"

# Test torch
python -c "import torch; print('Torch version:', torch.__version__)"
```

### Step 4: Install Visual C++ Redistributables (Windows)

If you still get the error, install:

- [Visual C++ Redistributable 2015-2022 (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe)

---

## 🧪 Test Stem Separation

```bash
# Navigate to scripts folder
cd electron/scripts

# Test with sample audio
python demucs_separate.py "path/to/audio.mp3" "output_folder"
```

**Expected output:**

```json
{"type": "status", "message": "Loading Demucs model..."}
{"type": "status", "message": "Loading audio file..."}
{"type": "status", "message": "Separating stems..."}
{"type": "stem_complete", "stem": "vocals", "path": "output_folder/vocals.wav"}
{"type": "stem_complete", "stem": "drums", "path": "output_folder/drums.wav"}
{"type": "stem_complete", "stem": "bass", "path": "output_folder/bass.wav"}
{"type": "stem_complete", "stem": "other", "path": "output_folder/other.wav"}
{"type": "complete", "success": true}
```

---

## 🐛 Troubleshooting

### Error: "ImportError: No module named 'demucs'"

**Solution:**

```bash
pip install demucs
```

### Error: "Out of memory"

**Solution:**

- Close other applications
- Use shorter audio files (< 5 minutes)
- Upgrade RAM (minimum 8GB recommended)

### Error: "CUDA out of memory" (GPU users)

**Solution:**

```bash
# Reinstall CPU version instead
pip uninstall torch
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Error: Process hangs or freezes

**Solution:**

1. Check Task Manager for memory usage
2. Kill stuck Python processes
3. Restart the app

---

## 📊 Performance Tips

| Audio Length | RAM Required | Processing Time (CPU) |
| ------------ | ------------ | --------------------- |
| 3 minutes    | ~4GB         | ~2-3 minutes          |
| 5 minutes    | ~6GB         | ~4-5 minutes          |
| 10 minutes   | ~8GB         | ~8-10 minutes         |

**Recommendations:**

- ✅ Use CPU mode (more compatible)
- ✅ Process one file at a time
- ✅ Close other heavy applications
- ❌ Don't use GPU if you don't have NVIDIA GPU

---

## 🔧 Debugging Commands

```bash
# Check installed packages
pip list | grep -i demucs
pip list | grep -i torch

# Check Python path
python -c "import sys; print(sys.executable)"

# Test imports
python -c "from demucs.pretrained import get_model; print('OK')"
```

---

## 📝 Notes

- **Model download**: First run will download ~300MB model (htdemucs_ft)
- **Storage**: Each separation creates ~4x original file size (4 stems)
- **Quality**: htdemucs_ft provides good quality with reasonable speed
- **Formats**: Input supports MP3, WAV, FLAC, M4A; Output is always WAV

---

## ✅ Verification Checklist

- [ ] Python 3.8+ installed
- [ ] `pip install torch` successful
- [ ] `pip install demucs` successful
- [ ] Visual C++ Redistributables installed (Windows)
- [ ] Test script runs without errors
- [ ] At least 8GB RAM available

---

If you still encounter issues after following this guide, check:

1. Python version compatibility
2. Antivirus blocking Python execution
3. Disk space (need ~2GB for model + output)
4. File permissions on output directory
