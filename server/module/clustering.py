import umap
import pandas as pd
import numpy as np

# HDBSCAN removed - using external API for clustering instead
# This module is kept for backwards compatibility but not actively used

class ClusterEngine:
    @staticmethod
    def run_analysis(embeddings, seed=42):
        """
        Fallback analysis using UMAP only.
        For production, use external API via main.py
        """
        try:
            # 1. UMAP
            reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, metric='cosine', random_state=seed, n_jobs=1)
            embedding_2d = reducer.fit_transform(embeddings)

            # 3. Create Stats DataFrame
            df = pd.DataFrame(embedding_2d, columns=['x', 'y'])
            df['cluster'] = 0  # Single cluster fallback
            return df
        except Exception as e:
            print(f"Clustering fallback failed: {e}")
            # Return minimal valid structure
            return pd.DataFrame({'x': [], 'y': [], 'cluster': []})

    @staticmethod
    def get_stats(df):
        try:
            total_seqs = len(df)
            if total_seqs == 0:
                return pd.DataFrame()
            
            abundance = df['cluster'].value_counts().reset_index()
            abundance.columns = ['cluster', 'count']
            abundance['percentage'] = (abundance['count'] / total_seqs) * 100
            
            # Filter valid species
            species_df = abundance[abundance['cluster'] != -1].sort_values('count', ascending=False)
            return species_df
        except Exception as e:
            print(f"Stats calculation failed: {e}")
            return pd.DataFrame()
        
        noise_row = abundance[abundance['cluster'] == -1]
        noise_count = int(noise_row['count'].sum()) if not noise_row.empty else 0
        noise_perc = float(noise_row['percentage'].sum()) if not noise_row.empty else 0

      
        top_groups = []
        for _, row in species_df.head(20).iterrows():
            top_groups.append({
                "group_id": int(row['cluster']),
                "count": int(row['count']),
                "percentage": round(row['percentage'], 2)
            })

        return {
            "total_reads": total_seqs,
            "total_clusters": len(species_df),
            "noise_count": noise_count,
            "noise_percentage": round(noise_perc, 2),
            "top_groups": top_groups
        }