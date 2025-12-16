#!/usr/bin/env python3
"""
Demucs Stem Separation Wrapper
Separates audio into stems using Demucs
"""
import sys
import os
import json
import traceback

def check_dependencies():
    """Check if required dependencies are available"""
    missing = []
    
    try:
        import torch
    except ImportError:
        missing.append("torch")
    
    try:
        import demucs
    except ImportError:
        missing.append("demucs")
    
    if missing:
        print(json.dumps({
            "success": False,
            "error": f"Missing required packages: {', '.join(missing)}. Please install them: pip install demucs torch"
        }), flush=True)
        return False
    
    return True

def separate_stems(input_path, output_dir, stems=None, model="htdemucs"):
    """
    Separate audio file into stems using Demucs
    """
    try:
        import demucs.separate
        from demucs.apply import apply_model
        from demucs.pretrained import get_model
        from demucs.audio import AudioFile, save_audio
        import torch
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Load model
        print(json.dumps({"type": "status", "message": "Loading Demucs model..."}), flush=True)
        try:
            model_instance = get_model(model)
            model_instance.cpu()  # Force CPU to avoid CUDA issues (Exit code 3221225477)
            model_instance.eval()
        except Exception as e:
            return {"success": False, "error": f"Failed to load Demucs model: {str(e)}"}
        
        # Load audio
        print(json.dumps({"type": "status", "message": "Loading audio file..."}), flush=True)
        try:
            wav = AudioFile(input_path).read(
                streams=0,
                samplerate=model_instance.samplerate,
                channels=model_instance.audio_channels
            )
        except Exception as e:
            return {"success": False, "error": f"Failed to load audio file: {str(e)}"}
        
        # Apply model
        print(json.dumps({"type": "status", "message": "Separating stems..."}), flush=True)
        try:
            ref = wav.mean(0)
            wav = (wav - ref.mean()) / ref.std()
            
            sources = apply_model(
                model_instance,
                wav[None],
                device='cpu',
                shifts=1,
                split=True,
                overlap=0.25,
                progress=False
            )[0]
            
            sources = sources * ref.std() + ref.mean()
        except Exception as e:
            return {"success": False, "error": f"Failed to separate stems: {str(e)}"}
        
        # Save stems
        stem_names = model_instance.sources
        output_paths = {}
        
        for i, stem_name in enumerate(stem_names):
            print(json.dumps({
                "type": "status",
                "message": f"Saving {stem_name}...",
                "stem": stem_name
            }), flush=True)
            
            try:
                output_path = os.path.join(output_dir, f"{stem_name}.wav")
                save_audio(sources[i], output_path, samplerate=model_instance.samplerate)
                output_paths[stem_name] = output_path
                
                print(json.dumps({
                    "type": "stem_complete",
                    "stem": stem_name,
                    "path": output_path
                }), flush=True)
            except Exception as e:
                return {"success": False, "error": f"Failed to save {stem_name}: {str(e)}"}
        
        return {
            "success": True,
            "output_paths": output_paths,
            "model": model
        }
        
    except Exception as e:
        # Catch-all for any other errors
        error_msg = f"Unexpected error: {str(e)}\n{traceback.format_exc()}"
        return {"success": False, "error": error_msg}

if __name__ == "__main__":
    # Ensure stdout uses utf-8 encoding for JSON
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python demucs_separate.py <input_path> <output_dir> [stems_json]"
        }), flush=True)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    stems = None
    
    if len(sys.argv) > 3:
        try:
            stems = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            pass # Ignore invalid stems JSON, use defaults
    
    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)
    
    # Validate input file
    if not os.path.exists(input_path):
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_path}"
        }), flush=True)
        sys.exit(1)
    
    # Run separation
    try:
        result = separate_stems(input_path, output_dir, stems)
        
        if result["success"]:
            print(json.dumps({
                "type": "complete",
                "success": True,
                "output_paths": result["output_paths"]
            }), flush=True)
            sys.exit(0)
        else:
            print(json.dumps(result), flush=True)
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Critical script error: {str(e)}"
        }), flush=True)
        sys.exit(1)