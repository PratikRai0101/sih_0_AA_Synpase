import asyncio
import aiohttp
import json

class AsyncBlastVerifier:
    GCP_API_URL = "https://pug-c-776087882401.europe-west1.run.app/predict/fasta"
    
    @staticmethod
    async def verify_stream(sequences, cluster_df, top_n=5):
        """
        Verify sequences using GCP API and yield results one by one.
        Streams top N clusters based on abundance.
        """
        abundance = cluster_df['cluster'].value_counts()
        top_clusters = abundance.index[abundance.index != -1][:top_n].tolist()
        
        # Prepare FASTA content from all sequences
        fasta_content = ""
        for idx, seq in enumerate(sequences):
            fasta_content += f">seq_{idx}\n{seq}\n"
        
        try:
            # Call GCP API once with all sequences
            async with aiohttp.ClientSession() as session:
                gcp_results = await AsyncBlastVerifier._call_gcp_api(session, fasta_content)
            
            # Process results by cluster
            for cluster_idx, cluster_id in enumerate(top_clusters):
                # Get sequences in this cluster
                indices = cluster_df[cluster_df['cluster'] == cluster_id].index.tolist()
                cluster_count = len(indices)
                
                if cluster_count == 0:
                    continue
                
                # Get the top prediction for this cluster from GCP results
                cluster_predictions = []
                for idx in indices:
                    if idx < len(gcp_results):
                        cluster_predictions.append(gcp_results[idx])
                
                if not cluster_predictions:
                    continue
                
                # Sort by confidence (probability) and take the top prediction
                top_pred = sorted(cluster_predictions, key=lambda x: float(x.get('probability', 0)), reverse=True)[0]
                
                genus = top_pred.get('genus', 'Unknown')
                class_name = top_pred.get('class', 'Unknown')
                probability = float(top_pred.get('probability', 0))
                percentage = (cluster_count / len(sequences)) * 100
                
                # Format description for consistency
                description = f"{genus} (Class: {class_name}, {cluster_count} sequences, {percentage:.1f}%)"
                
                yield {
                    "cluster_index": cluster_idx + 1,
                    "cluster_id": int(cluster_id),
                    "cluster_count": cluster_count,
                    "genus": genus,
                    "class": class_name,
                    "probability": probability,
                    "percentage": round(percentage, 1),
                    "match_percentage": probability,
                    "description": description
                }
        
        except Exception as e:
            print(f"GCP API Error: {e}")
            # Return empty - error will be handled by websocket
    
    @staticmethod
    async def _call_gcp_api(session, fasta_content):
        """
        Call the GCP API with FASTA content and return parsed results.
        """
        try:
            # Create form data with FASTA file
            data = aiohttp.FormData()
            data.add_field('file', fasta_content, filename='sequences.fasta', content_type='text/plain')
            
            # Send request to GCP API
            async with session.post(
                AsyncBlastVerifier.GCP_API_URL,
                data=data,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    # Parse the GCP API response
                    # Expected format: {"count": N, "results": [...]}
                    results_list = result.get('results', [])
                    
                    # Convert to standardized format
                    parsed_results = []
                    for item in results_list:
                        if isinstance(item, dict):
                            parsed_results.append({
                                'genus': item.get('genus', item.get('name', 'Unknown')),
                                'class': item.get('class', item.get('family', 'Unknown')),
                                'probability': float(item.get('probability', item.get('confidence', 0)))
                            })
                    
                    return parsed_results
                else:
                    print(f"GCP API Error ({response.status}): {await response.text()}")
                    return []
        
        except asyncio.TimeoutError:
            print("GCP API Timeout")
            return []
        except Exception as e:
            print(f"GCP API Exception: {e}")
            return []