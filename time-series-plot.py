#!/usr/bin/env python
"""
time_series_plot_extended.py

This script reads a PGN file (in the same format as used by pgn_final.py) and,
for each move (including the starting position), computes the aggregated
graph-level directional metrics (i.e. the agg_ values from directional_metrics.py)
for all three influence graphs: combined, white, and black.

The aggregated metrics include:
    • fiedler_value         (Fiedler Value)
    • out_diameter         (Out-Diameter)
    • in_diameter          (In-Diameter)
    • in_degree_avg        (In-Degree Centrality Average)
    • in_degree_var        (In-Degree Centrality Variance)
    • out_degree_avg       (Out-Degree Centrality Average)
    • out_degree_var       (Out-Degree Centrality Variance)
    • modularity           (Modularity)
    • community_count      (Community Count)
    • clustering           (Clustering Coefficient)
    • size_entropy         (Size Entropy)

An interactive Plotly HTML file is produced where the subplots are arranged
in an optimal grid. Each subplot displays the time series for one metric,
with three traces – combined, white, and black – whose colors are chosen to resemble
chess-based colors. Toggling one legend item (which are linked via legendgroup)
will filter that trace across every subplot.

Usage:
    Update the hard-coded file paths in the __main__ block as needed.
"""

import math
import chess
import chess.pgn
from directional_metrics import analyze_position
from plotly.subplots import make_subplots
import plotly.graph_objects as go

# List of aggregated metric keys and their labels.
METRICS = [
    ("fiedler_value", "Fiedler Value"),
    ("out_diameter", "Out-Diameter"),
    ("in_diameter", "In-Diameter"),
    ("in_degree_avg", "In-Degree Centrality Average"),
    ("in_degree_var", "In-Degree Centrality Variance"),
    ("out_degree_avg", "Out-Degree Centrality Average"),
    ("out_degree_var", "Out-Degree Centrality Variance"),
    ("modularity", "Modularity"),
    ("community_count", "Community Count"),
    ("clustering", "Clustering Coefficient"),
    ("size_entropy", "Size Entropy")
]

# Custom colors chosen to resemble chess colors.
COLOR_COMBINED = "royalblue"
COLOR_WHITE = "#ffd700"  # gold tone representing white pieces
COLOR_BLACK = "black"

def process_game(pgn_file_path):
    """
    Reads the PGN file and returns a list of records (one per move, including the start)
    with the aggregated directional metrics for each of the three influence graphs.
    Each record includes:
       • "move_number"
       • "fen"
       • "combined": aggregated metrics dict from analyze_position()["combined"]["aggregate_level_metrics"]
       • "white": aggregated metrics dict from analyze_position()["white"]["aggregate_level_metrics"]
       • "black": aggregated metrics dict from analyze_position()["black"]["aggregate_level_metrics"]
    """
    game_data = []
    with open(pgn_file_path, "r") as f:
        game = chess.pgn.read_game(f)
        if game is None:
            print("No game found in the PGN file.")
            return []
        board = game.board()
        move_number = 0

        # Process the initial board state.
        metrics = analyze_position(board.fen())
        record = {
            "move_number": move_number,
            "fen": board.fen(),
            "combined": metrics["combined"]["aggregate_level_metrics"],
            "white": metrics["white"]["aggregate_level_metrics"],
            "black": metrics["black"]["aggregate_level_metrics"]
        }
        game_data.append(record)

        # Process each move.
        for move in game.mainline_moves():
            move_number += 1
            board.push(move)
            metrics = analyze_position(board.fen())
            record = {
                "move_number": move_number,
                "fen": board.fen(),
                "combined": metrics["combined"]["aggregate_level_metrics"],
                "white": metrics["white"]["aggregate_level_metrics"],
                "black": metrics["black"]["aggregate_level_metrics"]
            }
            game_data.append(record)
    return game_data

def create_time_series_plot(game_data, output_html):
    """
    Creates an interactive Plotly figure with subplots arranged in a grid.
    Each subplot shows the time series for one aggregated metric for all three influence graphs.
    All traces are assigned legend groups so that toggling one affects all subplots.
    Custom colors are used for clear differentiation.
    """
    n_metrics = len(METRICS)
    # Determine grid layout using square-root based dimensions.
    cols = math.ceil(math.sqrt(n_metrics))
    rows = math.ceil(n_metrics / cols)
    
    subplot_titles = [label for (_, label) in METRICS]
    fig = make_subplots(rows=rows, cols=cols, subplot_titles=subplot_titles)
    
    moves = [record["move_number"] for record in game_data]
    
    for i, (metric_key, metric_label) in enumerate(METRICS):
        row = (i // cols) + 1
        col = (i % cols) + 1
        
        # Extract metric values for each influence graph.
        y_combined = [record["combined"].get(metric_key, None) for record in game_data]
        y_white    = [record["white"].get(metric_key, None) for record in game_data]
        y_black    = [record["black"].get(metric_key, None) for record in game_data]
        
        show_leg = (i == 0)
        
        # Add trace for Combined with custom color.
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_combined,
                mode="lines+markers",
                name="Combined",
                legendgroup="combined",
                showlegend=show_leg,
                line=dict(color=COLOR_COMBINED),
                marker=dict(color=COLOR_COMBINED)
            ),
            row=row, col=col
        )
        # Add trace for White with custom color.
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_white,
                mode="lines+markers",
                name="White",
                legendgroup="white",
                showlegend=show_leg,
                line=dict(color=COLOR_WHITE),
                marker=dict(color=COLOR_WHITE)
            ),
            row=row, col=col
        )
        # Add trace for Black with custom color.
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_black,
                mode="lines+markers",
                name="Black",
                legendgroup="black",
                showlegend=show_leg,
                line=dict(color=COLOR_BLACK),
                marker=dict(color=COLOR_BLACK)
            ),
            row=row, col=col
        )
        
        fig.update_yaxes(title_text=metric_label, row=row, col=col)
    
    fig.update_layout(
        title="Aggregated Graph-Level Directional Metrics Time Series",
        template="plotly_white",
        hovermode="x unified",
        height=300 * rows,
        width=400 * cols,
        margin=dict(l=50, r=50, t=100, b=50),
        legend=dict(orientation="h", x=0.3, y=-0.05)
    )
    
    fig.write_html(output_html)
    print(f"Time series plot saved to {output_html}")

def process_pgn(pgn_file_path, output_html_path):
    """
    Processes the PGN file to compute the aggregated metrics move-by-move
    and then creates the time series plot.
    """
    game_data = process_game(pgn_file_path)
    if game_data:
        create_time_series_plot(game_data, output_html_path)
    else:
        print("No game data to plot.")

if __name__ == "__main__":
    # Hard-coded file locations; update these paths as needed.
    pgn_file_path = "/Users/ashutoshganguly/Desktop/chessappviz/ChessNetworkVizApp/carlsen_gukesh_2025.pgn"
    output_html_path = "time_series_plot_extended2.html"
    
    process_pgn(pgn_file_path, output_html_path)
