from fastapi import FastAPI, WebSocket, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from Bio import SeqIO
import shutil
import os
import uuid
import aiohttp
import asyncio

from utils.utils import set_global_seed
# NOTE: ClusterEngine import removed - using external API instead

set_global_seed(42)

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# External API endpoint
EXTERNAL_API_URL = "https://pug-c-776087882401.europe-west1.run.app"



""""
Upload Files
"""
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), type: str = Form(".fastq")):
    """
    Saves file and returns an ID. 
    Frontend uses this ID to open a WebSocket connection.
    Accepts file type parameter (.fasta or .fastq)
    """
    file_id = str(uuid.uuid4())
    # Use the provided file type (remove leading dot if present)
    file_extension = type.lstrip('.')
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"file_id": file_id, "message": "File received. Connect to WebSocket."}


""""
Socket for prcocessing 
"""
@app.websocket("/ws/{file_id}")
async def websocket_endpoint(websocket: WebSocket, file_id: str):
    await websocket.accept()
    
    # Try to find the file with either extension
    file_path = None
    file_format = None
    for ext, fmt in [("fastq", "fastq"), ("fasta", "fasta"), ("fa", "fasta"), ("fq", "fastq")]:
        potential_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
        if os.path.exists(potential_path):
            file_path = potential_path
            file_format = fmt
            break

    try:
        # STEP 1: VALIDATION
        if not file_path or not os.path.exists(file_path):
            try:
                await websocket.send_json({"type": "error", "message": "File not found"})
            except:
                pass
            return

        # Small delay to ensure client is ready
        await asyncio.sleep(0.1)
        
        try:
            await websocket.send_json({"type": "log", "message": f"Reading Sequences from {file_format.upper()} file..."})
        except Exception as e:
            print(f"Failed to send initial message: {e}")
            return
        
        # Read file content and count sequences
        sequence_count = 0
        with open(file_path, 'r') as f:
            for record in SeqIO.parse(f, file_format):
                sequence_count += 1
        
        if sequence_count == 0:
            await websocket.send_json({"type": "error", "message": "No sequences found in file. Please check the file format."})
            return
        
        await websocket.send_json({"type": "log", "message": f"Found {sequence_count} sequences"})
        
        # Read file content as binary for upload
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        await websocket.send_json({"type": "log", "message": "Generating AI Embeddings..."})
        
        # Create session with connector that allows retries
        connector = aiohttp.TCPConnector(
            ttl_dns_cache=300,
            use_dns_cache=True,
            limit=100,
            limit_per_host=10
        )
        async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=600)) as session:
            # Prepare form data for FASTA prediction
            form = aiohttp.FormData()
            form.add_field('file', file_content, filename=f"{file_id}.{file_format}", content_type='application/octet-stream')
            
            await websocket.send_json({"type": "log", "message": "Running UMAP & HDBSCAN..."})
            
            # Retry logic with exponential backoff
            max_retries = 3
            retry_delay = 2
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    print(f"Attempting to call external API (attempt {attempt + 1}/{max_retries})...")
                    await websocket.send_json({"type": "log", "message": f"Connecting to analysis service (attempt {attempt + 1}/{max_retries})..."})
                    
                    # Re-create form data for each retry
                    form = aiohttp.FormData()
                    form.add_field('file', file_content, filename=f"{file_id}.{file_format}", content_type='application/octet-stream')
                    
                    async with session.post(f"{EXTERNAL_API_URL}/predict/fasta", data=form, timeout=aiohttp.ClientTimeout(total=300)) as resp:
                        print(f"External API response status: {resp.status}")
                        
                        if resp.status != 200:
                            error_text = await resp.text()
                            print(f"External API error: {error_text}")
                            last_error = f"External API error ({resp.status}): {error_text}"
                            if attempt < max_retries - 1:
                                await websocket.send_json({"type": "log", "message": f"Service returned error, retrying in {retry_delay}s..."})
                                await asyncio.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue
                            else:
                                await websocket.send_json({"type": "error", "message": last_error})
                                return
                        
                        result = await resp.json()
                        print(f"External API response: {result}")
                        
                        # Success! Break out of retry loop
                        break
                        
                except (aiohttp.ClientConnectorError, aiohttp.ClientConnectorDNSError, asyncio.TimeoutError) as e:
                    last_error = str(e)
                    print(f"Connection error on attempt {attempt + 1}: {last_error}")
                    
                    if attempt < max_retries - 1:
                        await websocket.send_json({"type": "log", "message": f"Connection failed, retrying in {retry_delay}s..."})
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        error_msg = f"Cannot connect to analysis service after {max_retries} attempts: {last_error}"
                        print(f"Final error: {error_msg}")
                        await websocket.send_json({"type": "error", "message": error_msg})
                        return
                except Exception as e:
                    last_error = str(e)
                    print(f"Unexpected error on attempt {attempt + 1}: {last_error}")
                    
                    if attempt < max_retries - 1:
                        await websocket.send_json({"type": "log", "message": f"Processing error, retrying in {retry_delay}s..."})
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        await websocket.send_json({"type": "error", "message": f"Processing failed: {last_error}"})
                        return
            
            # Continue processing if we successfully got a result
            if 'result' not in locals():
                return
            
            await websocket.send_json({"type": "log", "message": "Clustering Complete"})
            
            # Parse the response
            count = result.get("count", 0)
            results = result.get("results", [])
            
            # Calculate cluster statistics
            if results:
                unique_predictions = {}
                for item in results:
                    pred_dict = item.get("prediction", {})
                    # Use genus as the key
                    genus = pred_dict.get("genus", "unknown")
                    genus_prob = pred_dict.get("genus_prob", 0)
                    class_name = pred_dict.get("class", "unknown")
                    
                    if genus not in unique_predictions:
                        unique_predictions[genus] = {
                            "count": 0,
                            "class": class_name,
                            "avg_prob": 0,
                            "total_prob": 0
                        }
                    unique_predictions[genus]["count"] += 1
                    unique_predictions[genus]["total_prob"] += genus_prob
                
                # Calculate averages
                for genus in unique_predictions:
                    unique_predictions[genus]["avg_prob"] = unique_predictions[genus]["total_prob"] / unique_predictions[genus]["count"]
                
                # Create top groups
                top_groups = []
                for idx, (genus, data) in enumerate(sorted(unique_predictions.items(), key=lambda x: x[1]["count"], reverse=True)[:20]):
                    percentage = (data["count"] / count * 100) if count > 0 else 0
                    top_groups.append({
                        "group_id": idx,
                        "count": data["count"],
                        "percentage": round(percentage, 2)
                    })
                
                total_clusters = len(unique_predictions)
            else:
                top_groups = []
                total_clusters = 0
            
            # Send clustering result
            await websocket.send_json({
                "type": "clustering_result",
                "data": {
                    "total_reads": count,
                    "total_clusters": total_clusters,
                    "noise_count": 0,
                    "noise_percentage": 0.0,
                    "top_groups": top_groups
                }
            })
            
            # Send verification updates from prediction results
            await websocket.send_json({"type": "log", "message": "Starting NCBI Verification (Slow)..."})
            print(f"Sending verification for {len(unique_predictions)} unique predictions")
            
            # Group results by prediction for verification display
            if results:
                displayed = 0
                sorted_predictions = sorted(unique_predictions.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
                print(f"Top 5 predictions: {[genus for genus, _ in sorted_predictions]}")
                
                for idx, (genus, data) in enumerate(sorted_predictions):
                    percentage = (data["count"] / count * 100) if count > 0 else 0
                    prob_percent = round(data["avg_prob"] * 100, 1)
                    
                    # Determine status based on probability
                    if prob_percent >= 95:
                        status = "KNOWN (Old)"
                    elif prob_percent >= 80:
                        status = "RELATED (Old)"
                    elif prob_percent >= 50:
                        status = "NOVEL (New)"
                    else:
                        status = "GHOST (Newish)"
                    
                    verification_msg = {
                        "type": "verification_update",
                        "data": {
                            "step": f"Verification {idx+1}/{min(5, len(unique_predictions))}",
                            "cluster_id": idx,
                            "status": status,
                            "match_percentage": prob_percent,
                            "description": f"{genus} (Class: {data['class']}, {data['count']} sequences, {round(percentage, 1)}%)"
                        }
                    }
                    print(f"Sending verification {idx+1}: {genus} - {prob_percent}%")
                    await websocket.send_json(verification_msg)
                    await asyncio.sleep(0.1)  # Small delay between messages
                    displayed += 1
                    if displayed >= 5:
                        break
            else:
                # No results - show placeholder
                await websocket.send_json({
                    "type": "verification_update",
                    "data": {
                        "step": "Verification 1/1",
                        "cluster_id": 0,
                        "status": "No predictions available",
                        "match_percentage": 0.0,
                        "description": "The file may be empty or in an unsupported format"
                    }
                })
            
            await websocket.send_json({"type": "complete", "message": "Analysis Finished."})
            print("Analysis complete, waiting before closing connection...")
            
            # Give client time to receive all messages before closing
            await asyncio.sleep(1.0)

    except aiohttp.ClientError as e:
        print(f"Client error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": f"Connection error: {str(e)}"})
            await asyncio.sleep(0.2)
        except:
            pass
    except Exception as e:
        print(f"General error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await asyncio.sleep(0.2)
        except:
            pass
    
    finally:
        # Cleanup
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass  # Ignore cleanup errors
        # Close connection gracefully
        try:
            await websocket.close()
        except:
            pass  # Connection may already be closed


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
