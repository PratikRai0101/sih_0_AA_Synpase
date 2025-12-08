from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from Bio import SeqIO
import shutil
import os
import uuid
import asyncio
import json
import requests # Ensure you have run: pip install requests

# --- REAL IMPORTS ---
from utils.utils import set_global_seed
from module.model_handler import DNABertEngine
from module.clustering import ClusterEngine
from module.verifier import AsyncBlastVerifier

set_global_seed(42)
ml_models = {"bert": DNABertEngine()} 
# ---------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class TextRequest(BaseModel):
    sequence: str

# --- HTTP ENDPOINTS ---

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.fastq")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"file_id": file_id, "message": "File received."}

@app.post("/api/text-analysis")
async def text_analysis_proxy(request: TextRequest):
    """
    Proxies JSON {"sequence": "..."} to external API.
    Uses MANUAL serialization to ensure the body is not dropped.
    """
    external_api_url = "https://pug-c-776087882401.europe-west1.run.app/predict/sequence"
    
    clean_sequence = request.sequence.strip()
    print(f"Proxying sequence (len={len(clean_sequence)})")

    # FIX 1: Manually dump to string to ensure exact JSON format
    payload_str = json.dumps({"sequence": clean_sequence})

    try:
        # FIX 2: Use standard 'requests' with explicit data and headers
        response = requests.post(
            external_api_url, 
            data=payload_str, # Send raw string
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=60
        )

        if response.status_code == 200:
            print("External API Success")
            return response.json()
        else:
            print(f"External API Failed ({response.status_code}): {response.text}")
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
                
            raise HTTPException(
                status_code=response.status_code,
                detail=f"External API error: {error_detail}"
            )

    except requests.Timeout:
        raise HTTPException(status_code=504, detail="External API timeout")
    except Exception as e:
        print(f"Proxy Internal Error: {e}")
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

# --- WEBSOCKET ENDPOINT ---

@app.websocket("/ws/{file_id}")
async def websocket_endpoint(websocket: WebSocket, file_id: str):
    await websocket.accept()
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.fastq")
    
    async def safe_send(data):
        try:
            await websocket.send_json(data)
            await asyncio.sleep(0.05)
        except:
            pass

    try:
        if not os.path.exists(file_path):
            await safe_send({"type": "error", "message": "File not found"})
            return

        # STEP 1
        await safe_send({"type": "log", "message": "Reading Sequences..."})
        sequences = []
        try:
            for record in SeqIO.parse(file_path, "fastq"):
                sequences.append(str(record.seq))
        except Exception as e:
            # Send error if parsing fails
            await safe_send({"type": "error", "message": f"Invalid File: {str(e)}"})
            return
            
        await safe_send({"type": "progress", "step": "read_sequences", "status": "complete"})

        # STEP 2
        await safe_send({"type": "log", "message": "Generating AI Embeddings..."})
        engine = ml_models["bert"]
        embeddings = engine.process_sequences(sequences)
        await safe_send({"type": "progress", "step": "generate_embeddings", "status": "complete"})

        # STEP 3
        await safe_send({"type": "log", "message": "Running UMAP & HDBSCAN..."})
        result_df = ClusterEngine.run_analysis(embeddings)
        stats = ClusterEngine.get_stats(result_df)
        
        await safe_send({"type": "progress", "step": "umap_hdbscan", "status": "complete"})
        await safe_send({"type": "clustering_result", "data": stats})

        # STEP 4
        await safe_send({"type": "log", "message": "Starting NCBI Verification..."})
        
        last_result = None
        async for verify_result in AsyncBlastVerifier.verify_stream(sequences, result_df, top_n=5):
            await safe_send({"type": "verification_update", "data": verify_result})
            last_result = verify_result

        if last_result:
            last_result['final_update'] = True
            await safe_send({"type": "verification_update", "data": last_result})

        await safe_send({"type": "complete", "message": "Analysis Finished."})

    except Exception as e:
        print(f"WS Error: {e}")
        await safe_send({"type": "error", "message": str(e)})
    
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        try:
            await websocket.close()
        except:
            pass

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": list(ml_models.keys())}