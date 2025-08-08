"""
UMAP + HDBSCAN Clustering Pipeline with 3D Visualization via Plotly
Fixed version addressing DBCV calculation issues and warnings
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import trustworthiness
import umap
import hdbscan
from hdbscan import validity
import plotly.express as px
import warnings

# Suppress the sklearn deprecation warnings
warnings.filterwarnings('ignore', message='.*force_all_finite.*')
warnings.filterwarnings('ignore', message='.*n_jobs value.*')

# ================================
# 1. LOAD DATA
# ================================
df = pd.read_csv("ECO_Aggregate_update.csv")

# Define exactly which metric‐columns we want as features:
metric_cols = [
    "fiedler_value",
    "in_degree_centrality_avg",
    "in_degree_centrality_var",
    "out_degree_centrality_var",
    "in_betweenness_centrality_avg",
    "in_betweenness_centrality_var",
    "in_closeness_centrality_avg",
    "in_closeness_centrality_var",
    "out_closeness_centrality_avg",
    "modularity",
    "size_entropy"
]

# We also need "unique_id" and "graph_type" to exist.
required_cols = set(["unique_id", "graph_type"] + metric_cols)
missing = required_cols - set(df.columns)
if missing:
    raise ValueError(f"Missing required columns in CSV: {missing}")

# Now explicitly set feature_cols to exactly those metric names
feature_cols = metric_cols.copy()

# Split into combined vs. white/black subsets
df_combined = df[df["graph_type"] == "combined"].reset_index(drop=True)
df_colors   = df[df["graph_type"].isin(["white", "black"])].reset_index(drop=True)

print(f"Combined subset rows: {df_combined.shape[0]}")
print(f"White/Black subset rows: {df_colors.shape[0]}")

# ================================
# 2. GRID SEARCH (3D UMAP)
# ================================
def grid_search_umap_hdbscan_3d(df_subset, feature_cols, subset_name):
    X = df_subset[feature_cols].values
    X_scaled = StandardScaler().fit_transform(X)
    
    # Check for any NaN or infinite values in the data
    if np.any(np.isnan(X_scaled)) or np.any(np.isinf(X_scaled)):
        print(f"Warning: NaN or infinite values detected in scaled data for {subset_name}")
        # Replace NaN/inf with 0
        X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)

    n_neighbors_list      = list(range(10, 101, 10))   # 10,20,...,100
    min_cluster_size_list = list(range(5, 51, 5))      # 5,10,...,50

    records = []
    skipped_count = 0
    total_combinations = len(n_neighbors_list) * len(min_cluster_size_list)
    print(f"\nGrid search 3D UMAP + HDBSCAN for '{subset_name}'...")
    
    for n_nb in n_neighbors_list:
        # Ensure n_neighbors doesn't exceed dataset size
        n_nb_adjusted = min(n_nb, X_scaled.shape[0] - 1)
        
        # 3D UMAP embedding
        umap_mapper = umap.UMAP(
            n_neighbors=n_nb_adjusted,
            min_dist=0.1,
            n_components=3,            # 3D
            metric="euclidean",
            random_state=42,
            unique=True,  # Use unique=True to avoid duplicate points
            n_jobs=1  # Explicitly set to avoid warning
        )
        
        try:
            embedding = umap_mapper.fit_transform(X_scaled)  # shape (n_samples, 3)
            # Trustworthiness (still valid for 3D)
            tw = trustworthiness(X_scaled, embedding, n_neighbors=min(5, X_scaled.shape[0] - 1))
        except Exception as e:
            print(f"  UMAP failed for n_neighbors={n_nb}: {e}")
            continue

        for mcs in min_cluster_size_list:
            # Skip if min_cluster_size is too large for the dataset
            if mcs >= X_scaled.shape[0]:
                continue
                
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=mcs,
                min_samples=max(1, min(mcs, 5)),  # Ensure min_samples is reasonable
                cluster_selection_epsilon=0.0,
                gen_min_span_tree=True  # Required for DBCV
            )
            
            try:
                labels = clusterer.fit_predict(embedding)
            except Exception as e:
                print(f"  HDBSCAN failed for min_cluster_size={mcs}: {e}")
                continue

            n_clusters = len(set(labels) - {-1})
            n_noise    = int(np.sum(labels == -1))
            noise_ratio = n_noise / len(labels)
            
            # Skip if all points are noise or if noise ratio is too high (>95%)
            if n_clusters == 0 or noise_ratio > 0.95:
                print(f"    Skipping n_neighbors={n_nb}, min_cluster_size={mcs} "
                      f"(clusters={n_clusters}, noise={noise_ratio:.1%})")
                skipped_count += 1
                continue
            
            # Calculate DBCV only if we have actual clusters
            dbcv_score = np.nan
            if n_clusters > 0:
                try:
                    # DBCV requires the clusterer object, not just labels
                    dbcv_score = clusterer.relative_validity_
                except AttributeError:
                    # Fallback to validity_index if relative_validity_ not available
                    try:
                        if hasattr(validity, 'validity_index'):
                            dbcv_score = validity.validity_index(
                                embedding.astype(np.float64), 
                                labels, 
                                metric='euclidean'
                            )
                        else:
                            # For newer versions of hdbscan
                            dbcv_score = hdbscan.validity.validity_index(
                                embedding.astype(np.float64), 
                                labels
                            )
                    except Exception as e:
                        print(f"    DBCV calculation failed: {e}")
                        dbcv_score = np.nan

            # Alternative scoring if DBCV fails
            if np.isnan(dbcv_score) and n_clusters > 0:
                # Use silhouette score as fallback
                from sklearn.metrics import silhouette_score
                try:
                    # Only calculate for non-noise points
                    mask = labels != -1
                    if np.sum(mask) > 1 and len(np.unique(labels[mask])) > 1:
                        dbcv_score = silhouette_score(embedding[mask], labels[mask])
                except:
                    dbcv_score = -1.0  # Penalty score

            records.append({
                "n_neighbors": n_nb,
                "min_cluster_size": mcs,
                "trustworthiness": tw,
                "dbcv": dbcv_score,
                "n_clusters": n_clusters,
                "n_noise": n_noise,
                "noise_ratio": noise_ratio
            })

        print(f"  UMAP n_neighbors={n_nb}, Trust={tw:.4f}")

    print(f"\nGrid search completed for {subset_name}:")
    print(f"  Total combinations tested: {total_combinations}")
    print(f"  Valid results: {len(records)}")
    print(f"  Skipped (all noise): {skipped_count}")
    
    if len(records) == 0:
        print(f"Error: All parameter combinations resulted in noise for {subset_name}")
        return pd.DataFrame(), {"n_neighbors": 15, "min_cluster_size": 5}

    results_df = pd.DataFrame.from_records(records)
    
    # If all DBCV scores are NaN, use alternative selection criteria
    if results_df["dbcv"].isna().all():
        print(f"Warning: All DBCV scores are NaN for {subset_name}. Using alternative criteria.")
        # Prefer solutions with: some clusters (but not too many), low noise ratio, high trustworthiness
        results_df["score"] = (
            (results_df["n_clusters"] > 0).astype(float) * 0.3 +  # Has clusters
            (1 - results_df["noise_ratio"]) * 0.4 +  # Low noise
            results_df["trustworthiness"] * 0.3  # High trustworthiness
        )
        results_df = results_df.sort_values(
            by=["score", "n_clusters"], ascending=[False, False]
        ).reset_index(drop=True)
    else:
        # Original sorting by DBCV
        results_df = results_df.dropna(subset=["dbcv"]).reset_index(drop=True)
        results_df = results_df.sort_values(
            by=["dbcv", "trustworthiness"], ascending=[False, False]
        ).reset_index(drop=True)
    
    # Check if we have any results
    if len(results_df) == 0:
        print(f"Error: No valid parameter combinations found for {subset_name}")
        # Return default parameters
        return results_df, {"n_neighbors": 15, "min_cluster_size": 5}
    
    best = results_df.iloc[0]
    best_params = {
        "n_neighbors": int(best["n_neighbors"]),
        "min_cluster_size": int(best["min_cluster_size"])
    }
    
    dbcv_val = best.get('dbcv', best.get('score', 'N/A'))
    # Format the DBCV/Score value properly
    if isinstance(dbcv_val, float):
        dbcv_str = f"{dbcv_val:.4f}"
    else:
        dbcv_str = str(dbcv_val)
    
    print(f"Best for '{subset_name}': n_neighbors={best_params['n_neighbors']}, "
          f"min_cluster_size={best_params['min_cluster_size']} "
          f"(DBCV/Score={dbcv_str}, "
          f"Trust={best['trustworthiness']:.4f}, "
          f"Clusters={int(best['n_clusters'])}, "
          f"Noise ratio={best.get('noise_ratio', 0):.2%})")

    return results_df, best_params

# Run grid search on both subsets
try:
    results_combined, best_params_combined = grid_search_umap_hdbscan_3d(
        df_subset=df_combined,
        feature_cols=feature_cols,
        subset_name="combined"
    )
except Exception as e:
    print(f"Grid search failed for combined subset: {e}")
    best_params_combined = {"n_neighbors": 15, "min_cluster_size": 5}
    results_combined = pd.DataFrame()

try:
    results_colors, best_params_colors = grid_search_umap_hdbscan_3d(
        df_subset=df_colors,
        feature_cols=feature_cols,
        subset_name="white_black"
    )
except Exception as e:
    print(f"Grid search failed for white/black subset: {e}")
    best_params_colors = {"n_neighbors": 15, "min_cluster_size": 5}
    results_colors = pd.DataFrame()

# Save grid search outputs if not empty
if not results_combined.empty:
    results_combined.to_csv("grid_search_3d_combined.csv", index=False)
if not results_colors.empty:
    results_colors.to_csv("grid_search_3d_white_black.csv", index=False)

# ================================
# 3. FINAL FIT WITH BEST PARAMETERS (3D UMAP + HDBSCAN)
# ================================
def fit_pipeline_3d(df_subset, feature_cols, best_params):
    X = df_subset[feature_cols].values
    X_scaled = StandardScaler().fit_transform(X)
    
    # Handle NaN/inf values
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=0.0, neginf=0.0)
    
    # Adjust n_neighbors if needed
    n_neighbors_adjusted = min(best_params["n_neighbors"], X_scaled.shape[0] - 1)

    umap_mapper = umap.UMAP(
        n_neighbors=n_neighbors_adjusted,
        min_dist=0.1,
        n_components=3,
        metric="euclidean",
        random_state=42,
        n_jobs=1
    )
    embedding = umap_mapper.fit_transform(X_scaled)

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=best_params["min_cluster_size"],
        min_samples=max(1, min(best_params["min_cluster_size"], 5)),
        cluster_selection_epsilon=0.0
    )
    labels = clusterer.fit_predict(embedding)

    return embedding, labels, clusterer

# Combined subset final
try:
    emb_combined, labels_combined, clusterer_combined = fit_pipeline_3d(
        df_subset=df_combined,
        feature_cols=feature_cols,
        best_params=best_params_combined
    )
    df_combined["cluster_label"] = labels_combined
    df_combined["is_noise"] = df_combined["cluster_label"] == -1
except Exception as e:
    print(f"Final fit failed for combined subset: {e}")
    df_combined["cluster_label"] = -1
    df_combined["is_noise"] = True
    emb_combined = np.zeros((len(df_combined), 3))
    labels_combined = np.full(len(df_combined), -1)

# White/Black subset final
try:
    emb_colors, labels_colors, clusterer_colors = fit_pipeline_3d(
        df_subset=df_colors,
        feature_cols=feature_cols,
        best_params=best_params_colors
    )
    df_colors["cluster_label"] = labels_colors
    df_colors["is_noise"] = df_colors["cluster_label"] == -1
except Exception as e:
    print(f"Final fit failed for white/black subset: {e}")
    df_colors["cluster_label"] = -1
    df_colors["is_noise"] = True
    emb_colors = np.zeros((len(df_colors), 3))
    labels_colors = np.full(len(df_colors), -1)

# ================================
# 4. INTERACTIVE 3D PLOT WITH PLOTLY
# ================================
def plot_umap_3d_interactive(df_subset, embedding, labels, subset_name, output_html=None):
    """
    Builds an interactive Plotly 3D scatter of the UMAP embedding:
    • Color-coded by cluster_label (string; noise labeled as 'Noise')
    • Hover info: unique_id, graph_type, cluster_label
    """
    plot_df = pd.DataFrame({
        "UMAP-1": embedding[:, 0],
        "UMAP-2": embedding[:, 1],
        "UMAP-3": embedding[:, 2],
        "cluster_label": labels,
        "unique_id": df_subset["unique_id"].values,
        "graph_type": df_subset["graph_type"].values
    })

    # Convert labels to string, map "-1" → "Noise"
    plot_df["cluster_str"] = plot_df["cluster_label"].astype(str)
    plot_df.loc[plot_df["cluster_str"] == "-1", "cluster_str"] = "Noise"

    fig = px.scatter_3d(
        plot_df,
        x="UMAP-1",
        y="UMAP-2",
        z="UMAP-3",
        color="cluster_str",
        hover_data=["unique_id", "graph_type", "cluster_label"],
        title=f"3D UMAP + HDBSCAN ({subset_name})",
        labels={"cluster_str": "Cluster"},
        width=800,
        height=600
    )
    
    # Ensure 'Noise' is last in legend if present
    trace_names = [trace.name for trace in fig.data]
    if "Noise" in trace_names:
        traces = list(fig.data)
        noise_traces = [t for t in traces if t.name == "Noise"]
        other_traces = [t for t in traces if t.name != "Noise"]
        fig.data = (*other_traces, *noise_traces)

    fig.update_layout(
        legend_title_text="Cluster",
        legend=dict(itemsizing="constant", title_font_size=12, font_size=11, bordercolor="LightGray", borderwidth=1)
    )

    if output_html:
        fig.write_html(output_html)
        print(f"Interactive 3D plot saved to {output_html}")
    fig.show()

# Plot combined
plot_umap_3d_interactive(
    df_subset=df_combined,
    embedding=emb_combined,
    labels=labels_combined,
    subset_name="combined",
    output_html="umap3d_hdbscan_combined.html"
)

# Plot white/black
plot_umap_3d_interactive(
    df_subset=df_colors,
    embedding=emb_colors,
    labels=labels_colors,
    subset_name="white_black",
    output_html="umap3d_hdbscan_white_black.html"
)

# ================================
# 5. SUMMARY STATISTICS
# ================================
def summarize_clusters(df_subset, feature_cols):
    df_nn = df_subset[df_subset["cluster_label"] != -1]
    if len(df_nn) == 0:
        print("Warning: No non-noise clusters found")
        return pd.DataFrame()
    
    grp = df_nn.groupby("cluster_label")
    sizes = grp.size().rename("size")
    centroids = grp[feature_cols].mean().rename_axis("cluster_label")
    summary = centroids.copy()
    summary["size"] = sizes
    return summary.reset_index()

summary_combined = summarize_clusters(df_combined, feature_cols)
summary_colors   = summarize_clusters(df_colors, feature_cols)

if not summary_combined.empty:
    summary_combined.to_csv("cluster_summary_3d_combined.csv", index=False)
if not summary_colors.empty:
    summary_colors.to_csv("cluster_summary_3d_white_black.csv", index=False)

# ================================
# 6. SAVE FINAL LABELS
# ================================
df_combined[['unique_id','graph_type','cluster_label','is_noise']].to_csv(
    "final_labels_3d_combined.csv", index=False
)
df_colors[['unique_id','graph_type','cluster_label','is_noise']].to_csv(
    "final_labels_3d_white_black.csv", index=False
)

print("\n3D pipeline complete. Outputs saved.")
print(f"Combined: {len(set(labels_combined) - {-1})} clusters found, "
      f"{np.sum(labels_combined == -1)} noise points")
print(f"White/Black: {len(set(labels_colors) - {-1})} clusters found, "
      f"{np.sum(labels_colors == -1)} noise points")


# ================================
# 7. SAVE JSON OUTPUTS FOR D3/REACT DASHBOARD
# ================================
def save_umap3d_json(df_subset, embedding, filename):
    """
    Save a JSON file with one entry per row in df_subset, including:
      - unique_id (string)
      - graph_type (string)
      - x, y, z  (floats)
      - cluster_label (int)
      - is_noise (bool)
    """
    records = []
    # embedding is a numpy array of shape (n_rows, 3)
    for i, (_, row) in enumerate(df_subset.iterrows()):
        rec = {
            "unique_id":     row["unique_id"],
            "graph_type":    row["graph_type"],
            "x":             float(embedding[i, 0]),
            "y":             float(embedding[i, 1]),
            "z":             float(embedding[i, 2]),
            "cluster_label": int(row["cluster_label"]),
            "is_noise":      bool(row["is_noise"])
        }
        records.append(rec)

    import json
    with open(filename, "w") as fp:
        json.dump(records, fp, indent=2)
    print(f"Saved UMAP-3D JSON to {filename} ({len(records)} points)")

# Save JSON for “combined”—this will create "umap3d_combined.json"
save_umap3d_json(
    df_subset=df_combined,
    embedding=emb_combined,
    filename="umap3d_combined.json"
)

# Save JSON for “white/black”—this will create "umap3d_white_black.json"
save_umap3d_json(
    df_subset=df_colors,
    embedding=emb_colors,
    filename="umap3d_white_black.json"
)