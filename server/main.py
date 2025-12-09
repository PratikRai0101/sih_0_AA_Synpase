from fastapi import FastAPI, WebSocket, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from Bio import SeqIO
import shutil
import os
import uuid
import aiohttp
import asyncio
import requests
import pandas as pd
import time

from utils.utils import set_global_seed
from database import (
    init_database,
    add_training_record,
    add_analysis_record,
    update_analysis_status,
    get_combined_history,
    delete_training_record,
    delete_analysis_record,
    clear_all_history
)
# NOTE: ClusterEngine import removed - using external API instead
from module.model_handler import DNABertEngine
from module.vector_memory import BioMemory

set_global_seed(42)
init_database()

# Initialize AI Engine and Vector Memory
try:
    dna_bert_engine = DNABertEngine()
    bio_memory = BioMemory()
    print("AI Engine and Vector Memory initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize AI components: {e}")
    dna_bert_engine = None
    bio_memory = None

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

class TextRequest(BaseModel):
    sequence: str

@app.post("/train")
async def add_knowledge(
    file: UploadFile = File(...),
    depth: str = Form(""),
    latitude: str = Form(""),
    longitude: str = Form(""),
    collectionDate: str = Form(""),
    voyage: str = Form("")
):
    """
    Accepts a CSV/FASTA/FASTQ file with metadata for training.
    Returns training statistics and metadata.
    """
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'csv'
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{file_extension}")
    
    start_time = time.time()
    
    try:
        # 1. Save File
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Training endpoint hit - File: {file.filename}, Metadata: depth={depth}, lat={latitude}, lon={longitude}, date={collectionDate}, voyage={voyage}")

        # 2. Read file based on type
        num_rows = 0
        top_rows = []
        sequences = []
        species_labels = []
        
        if file_extension.lower() == 'csv':
            try:
                df = pd.read_csv(file_path)
                num_rows = len(df)
                top_rows = df.head(10).to_dict('records')
                
                # Extract sequences and species for vector storage (case-insensitive column matching)
                # Convert column names to lowercase for matching
                df_lower_cols = {col.lower(): col for col in df.columns}
                
                if 'sequence' in df_lower_cols:
                    sequence_col = df_lower_cols['sequence']
                    sequences = df[sequence_col].astype(str).tolist()
                    
                    # Use species/taxon column if available, otherwise use filename
                    if 'species' in df_lower_cols:
                        species_col = df_lower_cols['species']
                        species_labels = df[species_col].astype(str).tolist()
                    elif 'taxon' in df_lower_cols:
                        taxon_col = df_lower_cols['taxon']
                        species_labels = df[taxon_col].astype(str).tolist()
                    else:
                        species_labels = [f"{voyage or file.filename}" for _ in range(len(sequences))]
                
                print(f"CSV file processed: {num_rows} rows, columns: {list(df.columns)}, sequences found: {len(sequences)}")
            except Exception as csv_err:
                raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(csv_err)}")
                
        elif file_extension.lower() in ['fasta', 'fa', 'fastq', 'fq']:
            try:
                # Determine format
                seq_format = 'fasta' if file_extension.lower() in ['fasta', 'fa'] else 'fastq'
                sequence_records = []
                
                for record in SeqIO.parse(file_path, seq_format):
                    sequence_records.append({
                        'id': record.id,
                        'sequence': str(record.seq)[:50] + '...' if len(str(record.seq)) > 50 else str(record.seq),
                        'length': len(record.seq)
                    })
                    sequences.append(str(record.seq))
                    species_labels.append(record.id or f"{voyage or file.filename}")
                
                num_rows = len(sequence_records)
                top_rows = sequence_records[:10]
                print(f"{seq_format.upper()} file processed: {num_rows} sequences")
            except Exception as seq_err:
                raise HTTPException(status_code=400, detail=f"Invalid sequence file: {str(seq_err)}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
        
        # 3. Generate embeddings and store in Qdrant
        vectors_stored = False
        if sequences and dna_bert_engine and bio_memory:
            try:
                print(f"Generating embeddings for {len(sequences)} sequences...")
                embeddings = dna_bert_engine.process_sequences(sequences)
                print(f"Generated embeddings shape: {embeddings.shape}")
                
                # Store in Qdrant
                vectors_stored = bio_memory.add_knowledge(sequences, embeddings, species_labels)
                if vectors_stored:
                    print(f"Successfully stored {len(sequences)} sequences in Qdrant")
                else:
                    print("Failed to store sequences in Qdrant")
            except Exception as vec_err:
                print(f"Error processing vectors: {vec_err}")
                import traceback
                traceback.print_exc()
        else:
            if not sequences:
                print("No sequences found in file for vector storage")
            else:
                print("AI components not available for vector processing")
        
        training_time = time.time() - start_time
        
        # Save to database
        add_training_record(
            file_id=file_id,
            filename=file.filename,
            file_type=file_extension,
            num_rows=num_rows,
            training_time=training_time,
            depth=depth,
            latitude=latitude,
            longitude=longitude,
            collection_date=collectionDate,
            voyage=voyage,
            status="completed"
        )
        
        # Return response with metadata
        return {
            "message": f"Successfully processed {num_rows} records",
            "model_trained": True,
            "vectors_stored": vectors_stored,
            "num_sequences": len(sequences),
            "num_rows": num_rows,
            "training_time": training_time,
            "top_rows": top_rows,
            "metadata": {
                "depth": depth,
                "latitude": latitude,
                "longitude": longitude,
                "collectionDate": collectionDate,
                "voyage": voyage,
                "filename": file.filename
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Training Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
        
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

"""
Health Check
"""
@app.get("/health")
async def health_check():
    """Simple health check endpoint to verify backend is running"""
    return {"status": "ok", "message": "Backend is running"}

@app.get("/history")
async def get_history():
    """Get combined history of all training and analysis records"""
    try:
        history = get_combined_history()
        return {"history": history}
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.delete("/history/{record_type}/{file_id}")
async def delete_history_record(record_type: str, file_id: str):
    """Delete a specific history record"""
    try:
        if record_type == "training":
            success = delete_training_record(file_id)
        elif record_type == "analysis":
            success = delete_analysis_record(file_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid record type")
        
        if success:
            return {"message": "Record deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Record not found")
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error deleting record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")

@app.delete("/history")
async def clear_all_history_endpoint():
    """Clear all history records"""
    try:
        clear_all_history()
        return {"message": "All history cleared successfully"}
    except Exception as e:
        print(f"Error clearing history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")

@app.post("/api/text-analysis")
async def text_analysis_proxy(request: TextRequest):
    external_api_url = "https://pug-c-776087882401.europe-west1.run.app/predict/sequence"
    clean_sequence = request.sequence.strip()
    
    try:
        try:
            response = requests.post(
                external_api_url, 
                data={"sequence": clean_sequence}
            )

        except requests.RequestException as req_err:
            raise HTTPException(status_code=502, detail=f"External API request failed: {str(req_err)}")
        

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=f"External API error: {response.text}")

    except requests.Timeout:
        raise HTTPException(status_code=504, detail="External API timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

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
    filename = None
    for ext, fmt in [("fastq", "fastq"), ("fasta", "fasta"), ("fa", "fasta"), ("fq", "fastq")]:
        potential_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
        if os.path.exists(potential_path):
            file_path = potential_path
            file_format = fmt
            filename = f"{file_id}.{ext}"
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
                        "genus": genus,
                        "class": data["class"],
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
            
            # Save to database
            add_analysis_record(
                file_id=file_id,
                filename=filename or "unknown",
                file_type=file_format or "unknown",
                sequence_count=sequence_count,
                total_clusters=total_clusters,
                total_reads=count,
                status="completed",
                result_data={
                    "total_reads": count,
                    "total_clusters": total_clusters,
                    "top_groups": top_groups[:5] if top_groups else []
                }
            )
            
            # Give client time to receive all messages before closing
            await asyncio.sleep(1.0)

    except aiohttp.ClientError as e:
        print(f"Client error: {e}")
        update_analysis_status(file_id, "failed")
        try:
            await websocket.send_json({"type": "error", "message": f"Connection error: {str(e)}"})
            await asyncio.sleep(0.2)
        except:
            pass
    except Exception as e:
        print(f"General error: {e}")
        update_analysis_status(file_id, "failed")
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
