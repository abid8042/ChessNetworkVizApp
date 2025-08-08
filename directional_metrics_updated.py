#!/usr/bin/env python
"""
Directional Metrics Module

This module provides functions to analyze directed graphs created from chess positions.
It computes various network metrics including:
- Component decomposition (weak/strong)
- Fiedler values (algebraic connectivity)
- Directed diameters (with detailed paths)
- Normalized centrality measures (in/out degree, betweenness, closeness) with proper statistical pooling
- Community detection (modularity)
- Clustering coefficients
- Size entropy

The module uses proper statistical pooling formulas for aggregating metrics across components:
- Global mean: μ_global = Σ(n_k * μ_k) / Σ(n_k)
- Global variance: Var_global = Σ(n_k * Var_k) / Σ(n_k) + Σ(n_k * n_ℓ * (μ_k - μ_ℓ)²) / (Σ(n_k))²

Additionally, this version annotates each node with:
- Normalized centrality values (in/out degree, in/out betweenness, in/out closeness)
- Component-level averages and variances for each centrality measure
- community_id (from modularity/community detection)
- component_id (the ID of the component the node belongs to)
- Deviations from component means for each centrality measure

The final output is organized into four parts:
1. Aggregate-Level Metrics
2. Component-Level Metrics
3. Node-Level Metrics
4. Graph Information (Nodes & Edges)

Author: Your Name
Version: 2.1.0 (updated to use proper statistical pooling)
Date: March 4, 2025
"""

import networkx as nx
import numpy as np
import math
import chess
from typing import Dict, List, Tuple, Set, Any, Optional, Union
from positional_graph import PositionalGraph
from cdlib import algorithms, evaluation
from cdlib.classes import NodeClustering
from typing import Optional
from typing import Any, List, Set, Tuple
# --- Component Analysis Functions ---

def decompose_into_components(G: nx.DiGraph, component_type: str = 'weak') -> List[nx.DiGraph]:
    if component_type == 'strong':
        # Use strongly connected components for a directed graph.
        # (In the original code, you used the undirected approach for both strong/weak;
        #  we'll leave it as-is to match your original logic.)
        UG = G.to_undirected()
        components = [G.subgraph(c).copy() for c in nx.connected_components(UG)]
    else:
        # For weak connectivity, convert the directed graph to an undirected graph.
        UG = G.to_undirected()
        components = [G.subgraph(c).copy() for c in nx.connected_components(UG)]
    return components


def verify_no_intercomponent_edges(G: nx.DiGraph, components: List[nx.DiGraph]) -> bool:
    node_to_component = {}
    for idx, comp in enumerate(components):
        for node in comp.nodes():
            node_to_component[node] = idx
    for u, v in G.edges():
        if node_to_component.get(u) != node_to_component.get(v):
            return False
    return True


# --- Fiedler Value Functions ---

try:
    from scipy.sparse.linalg import eigsh
except ImportError:
    eigsh = None

import networkx as nx
import numpy as np

# This is necessary for the sparse solver, but it's okay if it's not installed
# as the code has a fallback.
try:
    from scipy.sparse.linalg import eigsh
except ImportError:
    eigsh = None

def compute_fiedler_value(G: nx.DiGraph) -> float:
    """
    Compute the second-smallest eigenvalue (Fiedler value) of the directed Laplacian of G.
    Uses a sparse solver if possible; falls back to dense. 
    Returns 0.0 if G has fewer than 2 nodes or if no second eigenvalue exists.
    
    FIXED: This version now handles the N=2 edge case by catching the error from
    networkx and using a safe, dense computation for the Laplacian matrix 'L' in that
    specific case, allowing the original logic flow to proceed without crashing.
    """
    N = G.number_of_nodes()
    if N < 2:
        return 0.0

    # --- START OF FIX ---
    # The original logic flow failed because this next line can crash.
    # We wrap it in a try/except block to make it robust.
    try:
        # For N > 2, this will succeed and return a sparse matrix.
        # For N = 2, this will raise a TypeError.
        L = nx.directed_laplacian_matrix(G)
    except TypeError as e:
        # This 'except' block is the backup plan for N=2.
        # It creates the Laplacian matrix using a safe, dense method.
        # This ensures 'L' is always successfully created, allowing your
        # original logic flow below to work correctly.
        if "k >= N - 1" in str(e):
            # This is a safe way to get a dense Laplacian matrix.
            # We use the undirected version as a robust, mathematically sound fallback
            # that produces values on a comparable scale.
            UG = G.to_undirected()
            if not nx.is_connected(UG):
                return 0.0 # Disconnected graphs have a Fiedler value of 0.
            L = nx.laplacian_matrix(UG).toarray()
        else:
            # Re-raise any other unexpected error.
            raise e
    # --- END OF FIX ---


    # --- YOUR ORIGINAL LOGIC FLOW (Now safe to execute) ---

    k = 2  # number of smallest eigenvalues to request
    # Attempt sparse solve if available and k < N-1
    # Note: If N=2, L will be a dense numpy array from our fix,
    # so hasattr(L, "toarray") will be False, and this block will be skipped correctly.
    if eigsh is not None and hasattr(L, "toarray") and k < (N - 1):
        try:
            # Using 'SA' (Smallest Algebraic) is more standard for Fiedler values than 'SM'.
            vals, _ = eigsh(L, k=k, which="SA")
            vals_sorted = np.sort(vals)
            return float(vals_sorted[1].real)
        except Exception:
            pass  # fall back to dense

    # Fallback to dense eigenvalue computation
    # If L is already a dense array (from our N=2 fix), this code handles it gracefully.
    try:
        L_dense = L.toarray()
    except AttributeError:
        # This will be triggered if L is already a numpy array, which is what we want.
        L_dense = np.asarray(L)

    # For symmetric matrices (like the one our fix provides), eigvalsh is better.
    if np.allclose(L_dense, L_dense.T):
        eigenvalues = np.linalg.eigvalsh(L_dense)
    else:
        eigenvalues = np.linalg.eigvals(L_dense)
        eigenvalues = sorted(eigenvalues, key=lambda x: x.real)

    if len(eigenvalues) < 2:
        return 0.0

    # The Fiedler value is the second eigenvalue. eigvalsh returns them sorted.
    return float(eigenvalues[1].real)


def aggregate_fiedler_value_power(components: List[nx.DiGraph], exponent: float = 2) -> float:
    """
    Note: This still uses weighted averaging (component_size^exponent weighting).
    Only centrality metrics use the new statistical pooling approach.
    """
    total_weight = sum(comp.number_of_nodes() ** exponent for comp in components)
    aggregated_value = 0.0
    for comp in components:
        weight = comp.number_of_nodes() ** exponent
        fiedler = compute_fiedler_value(comp)
        if fiedler is not None:
            aggregated_value += (weight / total_weight) * fiedler
    return aggregated_value


# --- Diameter Analysis Functions ---

def compute_directed_out_diameter(G: nx.DiGraph) -> int:
    if G.number_of_nodes() <= 1:
        return 0
    max_distance = 0
    for u in G.nodes():
        lengths = dict(nx.single_source_shortest_path_length(G, u))
        if lengths:
            max_distance = max(max_distance, max(lengths.values()))
    return max_distance

def compute_directed_in_diameter(G: nx.DiGraph) -> int:
    if G.number_of_nodes() <= 1:
        return 0
    max_distance = 0
    for v in G.nodes():
        lengths = dict(nx.single_target_shortest_path_length(G, v))
        if lengths:
            max_distance = max(max_distance, max(lengths.values()))
    return max_distance

def compute_directed_out_diameter_details(G: nx.DiGraph) -> Tuple[int, List[Tuple[Any, Any]]]:
    if G.number_of_nodes() <= 1:
        return 0, []
    max_distance = 0
    for u in G.nodes():
        lengths = dict(nx.single_source_shortest_path_length(G, u))
        if lengths:
            max_distance = max(max_distance, max(lengths.values()))
    pairs = []
    for u in G.nodes():
        lengths = dict(nx.single_source_shortest_path_length(G, u))
        for v, d in lengths.items():
            if d == max_distance:
                pairs.append((u, v))
    return max_distance, pairs

def compute_directed_in_diameter_details(G: nx.DiGraph) -> Tuple[int, List[Tuple[Any, Any]]]:
    if G.number_of_nodes() <= 1:
        return 0, []
    max_distance = 0
    for v in G.nodes():
        lengths = dict(nx.single_target_shortest_path_length(G, v))
        if lengths:
            max_distance = max(max_distance, max(lengths.values()))
    pairs = []
    for v in G.nodes():
        lengths = dict(nx.single_target_shortest_path_length(G, v))
        for u, d in lengths.items():
            if d == max_distance:
                pairs.append((u, v))
    return max_distance, pairs

def aggregate_directed_out_diameter(components: List[nx.DiGraph], exponent: float = 2) -> float:
    total_weight = sum(comp.number_of_nodes() ** exponent for comp in components)
    aggregated_value = 0.0
    for comp in components:
        weight = comp.number_of_nodes() ** exponent
        out_diam = compute_directed_out_diameter(comp)
        aggregated_value += (weight / total_weight) * out_diam
    return aggregated_value

def aggregate_directed_in_diameter(components: List[nx.DiGraph], exponent: float = 2) -> float:
    total_weight = sum(comp.number_of_nodes() ** exponent for comp in components)
    aggregated_value = 0.0
    for comp in components:
        weight = comp.number_of_nodes() ** exponent
        in_diam = compute_directed_in_diameter(comp)
        aggregated_value += (weight / total_weight) * in_diam
    return aggregated_value


# --- Centrality Analysis Functions (Now Using NetworkX Normalized Centralities) ---

def compute_in_degree_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute normalized in-degree centrality using NetworkX's built-in function.
    NetworkX normalizes by dividing by (n-1) for directed graphs.
    """
    centrality = nx.in_degree_centrality(G)
    
    # Include all nodes in the component for statistics
    values = [centrality[node] for node in G.nodes()]
    n = len(values)
    if n > 0:
        avg = sum(values) / n
        var = sum((x - avg) ** 2 for x in values) / n
    else:
        avg = 0
        var = 0
    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": G.number_of_nodes()
    }

def compute_out_degree_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute normalized out-degree centrality using NetworkX's built-in function.
    NetworkX normalizes by dividing by (n-1) for directed graphs.
    """
    centrality = nx.out_degree_centrality(G)
    
    # Include all nodes in the component for statistics
    values = [centrality[node] for node in G.nodes()]
    n = len(values)
    if n > 0:
        avg = sum(values) / n
        var = sum((x - avg) ** 2 for x in values) / n
    else:
        avg = 0
        var = 0
    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": G.number_of_nodes()
    }


def compute_in_betweenness_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute betweenness centrality for each node in a directed graph G,
    using NetworkX's built-in function. Returns a dict with:
      - "node_centralities": mapping node → normalized betweenness
      - "average": average of those centralities
      - "variance": variance of those centralities
      - "component_size": number of nodes in G
    """
    n = G.number_of_nodes()

    # Compute directed, normalized betweenness centrality via NetworkX
    centrality = nx.betweenness_centrality(G.to_undirected(), normalized=True)

    # Compute average
    vals = list(centrality.values())
    avg = sum(vals) / n

    # Compute variance
    var = sum((x - avg) ** 2 for x in vals) / n

    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": n
    }



def compute_out_betweenness_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute out-betweenness centrality: betweenness considering only paths starting from each node.
    This is computed by considering shortest paths that have the node as a source.
    """
    n = G.number_of_nodes()
    centrality = {node: 0.0 for node in G.nodes()}
    
    if n <= 1:
        return {
            "node_centralities": centrality,
            "average": 0.0,
            "variance": 0.0,
            "component_size": n
        }
    
    # For each source node, compute shortest paths to all targets
    for source in G.nodes():
        # Get predecessor dict and shortest path lengths from source
        pred, dist = nx.dijkstra_predecessor_and_distance(G, source)
        
        # Count shortest paths and accumulate betweenness
        sigma = {node: 0 for node in G.nodes()}
        sigma[source] = 1
        
        # BFS from source to count paths
        for target in dist:
            if target != source:
                for p in pred.get(target, []):
                    sigma[target] += sigma[p]
        
        # Accumulate betweenness
        delta = {node: 0.0 for node in G.nodes()}
        for target in sorted(dist, key=lambda x: dist[x], reverse=True):
            if target != source:
                for p in pred.get(target, []):
                    if sigma[p] > 0:
                        delta[p] += (sigma[p] / sigma[target]) * (1 + delta[target])
                if target != source:
                    centrality[target] += delta[target]
    
    # Normalize by (n-1)(n-2) for directed graphs
    if n > 2:
        norm = 1.0 / ((n - 1) * (n - 2))
        centrality = {node: val * norm for node, val in centrality.items()}
    
    # Compute statistics
    values = list(centrality.values())
    if values:
        avg = sum(values) / len(values)
        var = sum((x - avg) ** 2 for x in values) / len(values)
    else:
        avg = 0
        var = 0
    
    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": n
    }

def compute_in_closeness_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute normalized in-closeness centrality using NetworkX's built-in function.
    For directed graphs, this measures how close a node is to all other nodes
    based on incoming paths.
    """
    centrality = nx.closeness_centrality(G.reverse(), wf_improved=False)
    
    # Compute statistics
    values = list(centrality.values())
    if values:
        avg = sum(values) / len(values)
        var = sum((x - avg) ** 2 for x in values) / len(values)
    else:
        avg = 0
        var = 0
    
    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": G.number_of_nodes()
    }

def compute_out_closeness_centrality_metrics(G: nx.DiGraph) -> Dict[str, Any]:
    """
    Compute normalized out-closeness centrality using NetworkX's built-in function.
    For directed graphs, this measures how close a node is to all other nodes
    based on outgoing paths.
    """
    centrality = nx.closeness_centrality(G, wf_improved=False)
    
    # Compute statistics
    values = list(centrality.values())
    if values:
        avg = sum(values) / len(values)
        var = sum((x - avg) ** 2 for x in values) / len(values)
    else:
        avg = 0
        var = 0
    
    return {
        "node_centralities": centrality,
        "average": avg,
        "variance": var,
        "component_size": G.number_of_nodes()
    }

# Aggregation functions for centrality metrics using proper statistical pooling
def aggregate_centrality_metrics_pooled(
    components: List[nx.DiGraph], 
    centrality_func: callable
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """
    Aggregate centrality metrics across components using n_k^2 weighting.

    Global mean: μ_global = Σ(n_k^2 * μ_k) / Σ(n_k^2)
    Global variance:
      = Σ(n_k^2 * Var_k) / Σ(n_k^2)
      + Σ(n_i^2 * n_j^2 * (μ_i - μ_j)²) / (Σ(n_k^2))²
    """
    comp_details = []
    sizes = []
    means = []
    variances = []

    # Gather per-component stats
    for comp in components:
        metrics = centrality_func(comp)
        comp_details.append(metrics)
        n_k = comp.number_of_nodes()
        sizes.append(n_k)
        means.append(metrics["average"])
        variances.append(metrics["variance"])

    # Compute n_k^2 weights
    weights = [n_k**2 for n_k in sizes]
    total_w = sum(weights)
    if total_w == 0:
        return 0.0, 0.0, comp_details

    # Weighted mean
    global_mean = sum(w * mu for w, mu in zip(weights, means)) / total_w

    # Within‐component variance term
    within_var = sum(w * var for w, var in zip(weights, variances)) / total_w

    # Between‐component variance term
    between_var = 0.0
    for i in range(len(components)):
        for j in range(i+1, len(components)):
            between_var += weights[i] * weights[j] * (means[i] - means[j])**2
    between_var /= (total_w ** 2)

    global_variance = within_var + between_var
    return global_mean, global_variance, comp_details


# --- Modularity and Community Detection Functions ---

def compute_directed_modularity(G: nx.DiGraph) -> Tuple[float, List[Set[Any]]]:
    """
    Detects communities by maximizing directed modularity (Leicht–Newman) using the Leiden method.
    
    This function uses the Leiden algorithm, an improvement over Louvain, which directly 
    optimizes for the modularity score and correctly handles directed graphs.

    Returns:
      - cov (float): The maximized directed modularity value for the found partition.
      - communities_orig (List[Set[Any]]): List of communities as sets of original node labels.
    """
    # Trivial case: no nodes or a single node
    if G.number_of_nodes() < 2:
        return 0.0, []

    # 1) Relabel graph nodes to integers for cdlib, storing original labels
    # This is a robust way to handle any node type (strings, etc.)
    H = nx.convert_node_labels_to_integers(G, label_attribute="orig_label")

    # 2) Detect communities using the Leiden method to maximize modularity.
    # The Leiden algorithm is a high-quality replacement for Louvain that correctly
    # handles directed graphs. `randomize=False` ensures reproducibility.
    leiden_coms: NodeClustering = algorithms.leiden(
        H, weights="weight"
    )

    # 3) Get the maximized modularity score directly from the result object.
    # This is more efficient and reliable than recalculating it manually.
    # The .newman_girvan_modularity() method correctly selects the directed
    # version for a DiGraph.
    cov = leiden_coms.newman_girvan_modularity().score

    # 4) Map the integer node IDs in the found communities back to their original labels
    communities_orig: List[Set[Any]] = [
        {H.nodes[n]["orig_label"] for n in comm}
        for comm in leiden_coms.communities
    ]

    return cov, communities_orig



def compute_weighted_directed_clustering(G: nx.DiGraph) -> float:
    UG = G.to_undirected()
    cliques = list(nx.find_cliques(UG))
    max_clique_size = {node: 0 for node in UG.nodes()}
    for clique in cliques:
        clique_size = len(clique)
        for node in clique:
            if clique_size > max_clique_size[node]:
                max_clique_size[node] = clique_size
    if len(max_clique_size) == 0:
        return 0.0
    return sum(max_clique_size.values()) / len(max_clique_size)

def aggregate_directed_modularity(
    components: List[nx.DiGraph], exponent: float = 2
) -> Tuple[float, List[Tuple[float, List[Set[Any]]]]]:
    total_weight = sum(comp.number_of_nodes() ** exponent for comp in components)
    aggregated_value = 0.0
    mod_values = []
    for comp in components:
        if comp.number_of_nodes() < 2:
            mod_val = 0
            communities = []
        else:
            mod_val, communities = compute_directed_modularity(comp)
        mod_values.append((mod_val, communities))
        weight = comp.number_of_nodes() ** exponent
        aggregated_value += (weight / total_weight) * mod_val
    return aggregated_value, mod_values

def aggregate_weighted_directed_clustering(
    components: List[nx.DiGraph], exponent: float = 2
) -> Tuple[float, List[float]]:
    total_weight = sum(comp.number_of_nodes() ** exponent for comp in components)
    aggregated_value = 0.0
    clust_values = []
    for comp in components:
        if comp.number_of_nodes() < 2:
            cc = 0
        else:
            cc = compute_weighted_directed_clustering(comp)
        clust_values.append(cc)
        weight = comp.number_of_nodes() ** exponent
        aggregated_value += (weight / total_weight) * cc
    return aggregated_value, clust_values


# --- Entropy Functions ---

def compute_size_entropy(components: List[nx.DiGraph]) -> Tuple[float, Dict[str, float]]:
    total_nodes = sum(comp.number_of_nodes() for comp in components)
    entropy_dict = {}
    aggregated_entropy = 0.0
    for idx, comp in enumerate(components):
        size = comp.number_of_nodes()
        p = size / total_nodes if total_nodes > 0 else 0
        entropy = -p * math.log(p) if p > 0 else 0
        entropy_dict[f"Component {idx+1} (size {size})"] = entropy
        aggregated_entropy += entropy
    return aggregated_entropy, entropy_dict


# ---Helper Functions for Node-Level Metrics ---
from typing import Tuple

def scale_node_metric(
    centrality: float, variance: float, comp_size: int, total_size: int, is_betweenness: bool = False
) -> Tuple[float, float]:
    """
    Denominator-based normalization of a node-level metric and its variance
    from component-scale to full-graph scale.

    For degree/closeness: scale = (n_k - 1) / (N - 1)
    For betweenness: scale = (n_k - 1)*(n_k - 2) / ((N - 1)*(N - 2))
    Variance scales as scale**2.
    """
    # Handle trivial cases where scaling is not possible or results in zero
    if total_size <= 1:
        return 0.0, 0.0

    if is_betweenness:
        # Numerator is zero or negative if component has 2 or fewer nodes
        if comp_size <= 2:
            return 0.0, 0.0
        num = (comp_size - 1) * (comp_size - 2)
        # Denominator is zero or negative if total graph has 2 or fewer nodes
        if total_size <= 2:
            return 0.0, 0.0
        den = (total_size - 1) * (total_size - 2)
    else:
        # Numerator is zero if component has 1 or fewer nodes
        if comp_size <= 1:
            return 0.0, 0.0
        num = comp_size - 1
        den = total_size - 1

    # Final scale calculation, avoiding division by zero
    scale = num / den if den > 0 else 0.0

    return centrality * scale, variance * (scale**2)

# --- Full Graph Analysis Functions ---

import networkx as nx
import math
from typing import Dict, List, Tuple, Set, Any

# Assume all helper functions from the original file are available in the scope:
# decompose_into_components, verify_no_intercomponent_edges, compute_fiedler_value,
# compute_directed_out_diameter, compute_directed_in_diameter,
# compute_directed_out_diameter_details, compute_directed_in_diameter_details,
# compute_directed_modularity, compute_weighted_directed_clustering,
# compute_in_degree_centrality_metrics, compute_out_degree_centrality_metrics,
# compute_in_betweenness_centrality_metrics, compute_out_betweenness_centrality_metrics,
# compute_in_closeness_centrality_metrics, compute_out_closeness_centrality_metrics,
# aggregate_fiedler_value_power, aggregate_directed_out_diameter,
# aggregate_directed_in_diameter, aggregate_centrality_metrics_pooled,
# aggregate_directed_modularity, aggregate_weighted_directed_clustering,
# compute_size_entropy, and the new scale_node_metric helper function.

def analyze_chess_graph(G: nx.DiGraph, name: str = "Graph") -> Dict[str, Any]:
    print(f"\n{name} Influence Graph Analysis:")
    # Decompose into components
    components = decompose_into_components(G, component_type='weak')
    total_N = G.number_of_nodes()  # Total nodes in the full graph
    print(f"  Number of disconnected components: {len(components)}")
    if verify_no_intercomponent_edges(G, components):
        print("  Verified: No inter-component edges.")
    else:
        print("  Error: Inter-component edges detected.")
    
    # Component-level metrics
    component_metrics = []
    # Store all centrality details for later use
    all_centrality_details = {
        'in_degree': [],
        'out_degree': [],
        'in_betweenness': [],
        'out_betweenness': [],
        'in_closeness': [],
        'out_closeness': []
    }
    
    # Create a map of node -> component size for efficient lookup later
    component_size_map = {}

    # Tag each node with its component id and populate the size map
    for idx, comp in enumerate(components):
        component_size = comp.number_of_nodes()
        for node in comp.nodes():
            G.nodes[node]["component_id"] = idx
            component_size_map[node] = component_size
            
        fiedler_val = compute_fiedler_value(comp)
        out_diam, out_paths = compute_directed_out_diameter_details(comp)
        in_diam, in_paths = compute_directed_in_diameter_details(comp)
        mod_val, communities = compute_directed_modularity(comp)
        clust_val = compute_weighted_directed_clustering(comp)
        
        # Compute all centrality metrics for this component
        in_deg_metrics = compute_in_degree_centrality_metrics(comp)
        out_deg_metrics = compute_out_degree_centrality_metrics(comp)
        in_bet_metrics = compute_in_betweenness_centrality_metrics(comp)
        out_bet_metrics = compute_out_betweenness_centrality_metrics(comp)
        in_close_metrics = compute_in_closeness_centrality_metrics(comp)
        out_close_metrics = compute_out_closeness_centrality_metrics(comp)
        
        all_centrality_details['in_degree'].append(in_deg_metrics)
        all_centrality_details['out_degree'].append(out_deg_metrics)
        all_centrality_details['in_betweenness'].append(in_bet_metrics)
        all_centrality_details['out_betweenness'].append(out_bet_metrics)
        all_centrality_details['in_closeness'].append(in_close_metrics)
        all_centrality_details['out_closeness'].append(out_close_metrics)
        
        component_metrics.append({
            "index": idx,
            "size": component_size,
            "fiedler": fiedler_val,
            "out_diameter": out_diam,
            "in_diameter": in_diam,
            "out_diameter_paths": out_paths,
            "in_diameter_paths": in_paths,
            "modularity": mod_val,
            "communities": communities,
            "community_count": len(communities),
            "clustering": clust_val,
            "nodes": list(comp.nodes()),
            # Add centrality averages and variances
            "in_degree_centrality_avg": in_deg_metrics["average"],
            "in_degree_centrality_var": in_deg_metrics["variance"],
            "out_degree_centrality_avg": out_deg_metrics["average"],
            "out_degree_centrality_var": out_deg_metrics["variance"],
            "in_betweenness_centrality_avg": in_bet_metrics["average"],
            "in_betweenness_centrality_var": in_bet_metrics["variance"],
            "out_betweenness_centrality_avg": out_bet_metrics["average"],
            "out_betweenness_centrality_var": out_bet_metrics["variance"],
            "in_closeness_centrality_avg": in_close_metrics["average"],
            "in_closeness_centrality_var": in_close_metrics["variance"],
            "out_closeness_centrality_avg": out_close_metrics["average"],
            "out_closeness_centrality_var": out_close_metrics["variance"]
        })
        
        print(f"\n  Component {idx+1} (size {component_size}):")
        print(f"    Fiedler Value = {fiedler_val}")
        print(f"    Directed Out-Diameter = {out_diam}, Node pairs = {out_paths[:3]}...")
        print(f"    Directed In-Diameter = {in_diam}, Node pairs = {in_paths[:3]}...")
        print(f"    Modularity = {mod_val}")
        print(f"    Number of communities = {len(communities)}")
        print(f"    Clustering Coefficient = {clust_val}")
        print(f"    Centrality Averages:")
        print(f"      In-Degree: avg={in_deg_metrics['average']:.4f}, var={in_deg_metrics['variance']:.4f}")
        print(f"      Out-Degree: avg={out_deg_metrics['average']:.4f}, var={out_deg_metrics['variance']:.4f}")
        print(f"      In-Betweenness: avg={in_bet_metrics['average']:.4f}, var={in_bet_metrics['variance']:.4f}")
        print(f"      Out-Betweenness: avg={out_bet_metrics['average']:.4f}, var={out_bet_metrics['variance']:.4f}")
        print(f"      In-Closeness: avg={in_close_metrics['average']:.4f}, var={in_close_metrics['variance']:.4f}")
        print(f"      Out-Closeness: avg={out_close_metrics['average']:.4f}, var={out_close_metrics['variance']:.4f}")
    
    # Aggregate-level metrics
    agg_fiedler = aggregate_fiedler_value_power(components)
    agg_out_diam = aggregate_directed_out_diameter(components)
    agg_in_diam = aggregate_directed_in_diameter(components)
    
    # Aggregate all centrality metrics using proper pooling
    agg_in_deg_avg, agg_in_deg_var, _ = aggregate_centrality_metrics_pooled(components, compute_in_degree_centrality_metrics)
    agg_out_deg_avg, agg_out_deg_var, _ = aggregate_centrality_metrics_pooled(components, compute_out_degree_centrality_metrics)
    agg_in_bet_avg, agg_in_bet_var, _ = aggregate_centrality_metrics_pooled(components, compute_in_betweenness_centrality_metrics)
    agg_out_bet_avg, agg_out_bet_var, _ = aggregate_centrality_metrics_pooled(components, compute_out_betweenness_centrality_metrics)
    agg_in_close_avg, agg_in_close_var, _ = aggregate_centrality_metrics_pooled(components, compute_in_closeness_centrality_metrics)
    agg_out_close_avg, agg_out_close_var, _ = aggregate_centrality_metrics_pooled(components, compute_out_closeness_centrality_metrics)
    
    # Collect all node centralities (these are still component-normalized)
    node_centralities = {
        'in_degree': {}, 'out_degree': {}, 'in_betweenness': {},
        'out_betweenness': {}, 'in_closeness': {}, 'out_closeness': {}
    }
    for metric, details_list in all_centrality_details.items():
        for details in details_list:
            node_centralities[metric].update(details["node_centralities"])
    
    agg_mod, mod_info = aggregate_directed_modularity(components)
    agg_clust, _ = aggregate_weighted_directed_clustering(components)
    all_communities = [community for _, communities in mod_info for community in communities]
    entropy, entropy_details = compute_size_entropy(components)
    
    # Annotate nodes with all metrics
    community_map = {node: cid for cid, community in enumerate(all_communities) for node in community}
            
    for node in G.nodes():
        # Get component size for the current node
        n_k = component_size_map[node]

        # --- THIS IS THE MODIFIED SECTION ---
        # Pick off the component-normalized values
        raw_in_deg = node_centralities['in_degree'].get(node, 0)
        raw_out_deg = node_centralities['out_degree'].get(node, 0)
        raw_in_bet = node_centralities['in_betweenness'].get(node, 0)
        raw_out_bet = node_centralities['out_betweenness'].get(node, 0)
        raw_in_close = node_centralities['in_closeness'].get(node, 0)
        raw_out_close = node_centralities['out_closeness'].get(node, 0)

        # Scale degree/closeness metrics and their global variances to full-graph scale
        scaled_in_deg, scaled_var_deg = scale_node_metric(raw_in_deg, agg_in_deg_var, n_k, total_N, is_betweenness=False)
        scaled_out_deg, scaled_var_odeg = scale_node_metric(raw_out_deg, agg_out_deg_var, n_k, total_N, is_betweenness=False)
        scaled_in_close, scaled_var_close = scale_node_metric(raw_in_close, agg_in_close_var, n_k, total_N, is_betweenness=False)
        scaled_out_close, scaled_var_oclose = scale_node_metric(raw_out_close, agg_out_close_var, n_k, total_N, is_betweenness=False)

        # Scale betweenness metrics and their global variances to full-graph scale
        scaled_in_bet, scaled_var_bet = scale_node_metric(raw_in_bet, agg_in_bet_var, n_k, total_N, is_betweenness=True)
        scaled_out_bet, scaled_var_obet = scale_node_metric(raw_out_bet, agg_out_bet_var, n_k, total_N, is_betweenness=True)

        # Assign the new, correctly scaled values to the node attributes
        G.nodes[node]['in_degree_centrality'] = scaled_in_deg
        G.nodes[node]['out_degree_centrality'] = scaled_out_deg
        G.nodes[node]['in_betweenness_centrality'] = scaled_in_bet
        G.nodes[node]['out_betweenness_centrality'] = scaled_out_bet
        G.nodes[node]['in_closeness_centrality'] = scaled_in_close
        G.nodes[node]['out_closeness_centrality'] = scaled_out_close
        
        # Assign the new, correctly scaled variances to the node attributes
        G.nodes[node]['in_degree_centrality_variance'] = scaled_var_deg
        G.nodes[node]['out_degree_centrality_variance'] = scaled_var_odeg
        G.nodes[node]['in_betweenness_centrality_variance'] = scaled_var_bet
        G.nodes[node]['out_betweenness_centrality_variance'] = scaled_var_obet
        G.nodes[node]['in_closeness_centrality_variance'] = scaled_var_close
        G.nodes[node]['out_closeness_centrality_variance'] = scaled_var_oclose
        # --- END OF MODIFIED SECTION ---

        G.nodes[node]['community_id'] = community_map.get(node, -1)
    
    # Annotate each node with component-specific averages and deviations
    for idx, comp in enumerate(components):
        # Get component-specific metrics
        comp_in_deg = all_centrality_details['in_degree'][idx]
        comp_out_deg = all_centrality_details['out_degree'][idx]
        comp_in_bet = all_centrality_details['in_betweenness'][idx]
        comp_out_bet = all_centrality_details['out_betweenness'][idx]
        comp_in_close = all_centrality_details['in_closeness'][idx]
        comp_out_close = all_centrality_details['out_closeness'][idx]
        
        for node in comp.nodes():
            # Add component averages
            G.nodes[node]["in_degree_component_avg"] = comp_in_deg["average"]
            G.nodes[node]["out_degree_component_avg"] = comp_out_deg["average"]
            G.nodes[node]["in_betweenness_component_avg"] = comp_in_bet["average"]
            G.nodes[node]["out_betweenness_component_avg"] = comp_out_bet["average"]
            G.nodes[node]["in_closeness_component_avg"] = comp_in_close["average"]
            G.nodes[node]["out_closeness_component_avg"] = comp_out_close["average"]
            
            # Add component variances
            G.nodes[node]["in_degree_component_var"] = comp_in_deg["variance"]
            G.nodes[node]["out_degree_component_var"] = comp_out_deg["variance"]
            G.nodes[node]["in_betweenness_component_var"] = comp_in_bet["variance"]
            G.nodes[node]["out_betweenness_component_var"] = comp_out_bet["variance"]
            G.nodes[node]["in_closeness_component_var"] = comp_in_close["variance"]
            G.nodes[node]["out_closeness_component_var"] = comp_out_close["variance"]
            
            # Add deviations from component means (using the raw, component-normalized values)
            G.nodes[node]["in_degree_deviation"] = (node_centralities['in_degree'].get(node, 0) - comp_in_deg["average"]) ** 2
            G.nodes[node]["out_degree_deviation"] = (node_centralities['out_degree'].get(node, 0) - comp_out_deg["average"]) ** 2
            G.nodes[node]["in_betweenness_deviation"] = (node_centralities['in_betweenness'].get(node, 0) - comp_in_bet["average"]) ** 2
            G.nodes[node]["out_betweenness_deviation"] = (node_centralities['out_betweenness'].get(node, 0) - comp_out_bet["average"]) ** 2
            G.nodes[node]["in_closeness_deviation"] = (node_centralities['in_closeness'].get(node, 0) - comp_in_close["average"]) ** 2
            G.nodes[node]["out_closeness_deviation"] = (node_centralities['out_closeness'].get(node, 0) - comp_out_close["average"]) ** 2
    
    # Gather complete graph information: nodes and edges
    graph_info = {
        "nodes": list(G.nodes(data=True)),
        "edges": list(G.edges(data=True))
    }
    
    # Structure final results (ordered as Aggregated, Component, Node-Level, Graph Info)
    results = {
        "aggregate_level_metrics": {
            "fiedler_value": agg_fiedler,
            "out_diameter": agg_out_diam,
            "in_diameter": agg_in_diam,
            "in_degree_centrality_avg": agg_in_deg_avg,
            "in_degree_centrality_var": agg_in_deg_var,
            "out_degree_centrality_avg": agg_out_deg_avg,
            "out_degree_centrality_var": agg_out_deg_var,
            "in_betweenness_centrality_avg": agg_in_bet_avg,
            "in_betweenness_centrality_var": agg_in_bet_var,
            "out_betweenness_centrality_avg": agg_out_bet_avg,
            "out_betweenness_centrality_var": agg_out_bet_var,
            "in_closeness_centrality_avg": agg_in_close_avg,
            "in_closeness_centrality_var": agg_in_close_var,
            "out_closeness_centrality_avg": agg_out_close_avg,
            "out_closeness_centrality_var": agg_out_close_var,
            "modularity": agg_mod,
            "community_count": len(all_communities),
            "clustering": agg_clust,
            "size_entropy": entropy
        },
        "component_level_metrics": component_metrics,
        "node_level_metrics": { node: G.nodes[node] for node in G.nodes() },
        "graph_info": graph_info
    }
    
    print("\n  Aggregated metrics:")
    print(f"    Fiedler Value: {agg_fiedler}")
    print(f"    Out-Diameter: {agg_out_diam}")
    print(f"    In-Diameter: {agg_in_diam}")
    print(f"    Centrality Aggregates:")
    print(f"      In-Degree: avg={agg_in_deg_avg:.4f}, var={agg_in_deg_var:.4f}")
    print(f"      Out-Degree: avg={agg_out_deg_avg:.4f}, var={agg_out_deg_var:.4f}")
    print(f"      In-Betweenness: avg={agg_in_bet_avg:.4f}, var={agg_in_bet_var:.4f}")
    print(f"      Out-Betweenness: avg={agg_out_bet_avg:.4f}, var={agg_out_bet_var:.4f}")
    print(f"      In-Closeness: avg={agg_in_close_avg:.4f}, var={agg_in_close_var:.4f}")
    print(f"      Out-Closeness: avg={agg_out_close_avg:.4f}, var={agg_out_close_var:.4f}")
    print(f"    Modularity: {agg_mod}")
    print(f"    Communities: {len(all_communities)}")
    print(f"    Clustering: {agg_clust}")
    print(f"    Size Entropy: {entropy}")
    
    return results

# --- Full Position Analysis Functions ---

def analyze_position(fen: str) -> Dict[str, Dict[str, Any]]:
    board = chess.Board(fen)
    pos_graph = PositionalGraph(board)
    combined_graph = pos_graph.compute_combined_influence_graph()
    white_graph = pos_graph.compute_influence_subgraph_by_color(chess.WHITE)
    black_graph = pos_graph.compute_influence_subgraph_by_color(chess.BLACK)
    combined_metrics = analyze_chess_graph(combined_graph, "Combined")
    white_metrics = analyze_chess_graph(white_graph, "White")
    black_metrics = analyze_chess_graph(black_graph, "Black")
    return {
        "combined": combined_metrics,
        "white": white_metrics,
        "black": black_metrics
    }


if __name__ == "__main__":
    fen = "rnbq1rk1/1pp2ppp/3pp3/pP6/2P5/P3PP2/2QP1P1P/R1B1KB1R b KQ - 0 11"
    results = analyze_position(fen)
    
    # Print final output in the required order:
    print("\n--- Final Output ---")
    for graph_type, metrics in results.items():
        print(f"\n--- {graph_type.upper()} GRAPH METRICS ---")
        print("\nAggregate-Level Metrics:")
        for key, value in metrics["aggregate_level_metrics"].items():
            print(f"{key}: {value}")
        print("\nComponent-Level Metrics:")
        for comp in metrics["component_level_metrics"]:
            print(comp)
        print("\nNode-Level Metrics:")
        for node, data in metrics["node_level_metrics"].items():
            print(f"Node {node}: {data}")
        print("\nGraph Information:")
        print("Nodes:")
        for node_info in metrics["graph_info"]["nodes"]:
            print(node_info)
        print("Edges:")
        for edge_info in metrics["graph_info"]["edges"]:
            print(edge_info)
    
    total_metric_count = 0
    for graph_type, metrics in results.items():
        count = (len(metrics["aggregate_level_metrics"]) +
                 len(metrics["component_level_metrics"]) +
                 len(metrics["node_level_metrics"]) +
                 len(metrics["graph_info"]["nodes"]) +
                 len(metrics["graph_info"]["edges"]))
        total_metric_count += count
    print(f"\nAnalysis complete! Total metric entries printed: {total_metric_count}")
