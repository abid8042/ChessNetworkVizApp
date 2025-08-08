#!/usr/bin/env python
"""
time_series_plot_clean.py

This script reads a PGN file (in the same format as used by pgn_final.py) and,
for each move (including the starting position), computes the aggregated
graph-level directional metrics (i.e. the agg_ values from directional_metrics_updated.py)
for all three influence graphs: combined, white, and black.

It then builds a Plotly figure with 13 subplots (one per metric). Instead of
using long y-axis titles (which caused overlapping), each subplot now only
displays a short subtitle (from METRICS) at the top. All traces share a common
x-axis of “move number,” and toggling one legend item will filter that trace
across all panels.

Usage:
    Update the hard-coded file paths in the __main__ block as needed.
"""

import math
import chess
import chess.pgn
from directional_metrics_updated import analyze_position
from plotly.subplots import make_subplots
import plotly.graph_objects as go

# List of aggregated metric keys and their (shorter) subplot titles.
METRICS = [
    ("size_entropy",                          "Size Entropy\n(Graph Size Distribution)"),
    ("fiedler_value",                         "Fiedler Value\n(Graph Connectivity)"),
    ("modularity",                            "Modularity\n(Graph Community Structure Quality)"),
    ("in_degree_centrality_avg",              "Degree Centrality\n(Positional Influence)"),
    ("in_closeness_centrality_avg",           "In-Closeness Centrality\n(Square Control Accessiblity)"),
    ("out_closeness_centrality_avg",          "Out-Closeness Centrality\n(Mobility Broadcaster)"),
    ("in_betweenness_centrality_avg",         "Betweenness Centrality\n(Positional Bottleneck)"),
    ("in_degree_centrality_var",              "In-Degree Variance\n(Is Square Control Skewed?)"),
    ("out_degree_centrality_var",             "Out-Degree Variance\n(Is Piece Mobility Skewed?)"),
    ("in_betweenness_centrality_var",         "Betweenness Variance\n(Positional Bottlenecks Concentrated?)"),
    ("in_closeness_centrality_var",           "In-Closeness Variance\n(Super-Spreaders Concentrated?)")
]

# (2) Colors for Combined / White / Black traces
COLOR_COMBINED = "royalblue"
COLOR_WHITE    = "#ffd700"  # gold for White
COLOR_BLACK    = "black"

def process_game(pgn_file_path):
    """
    Reads the first game from `pgn_file_path`, extracts:
      • White player name (header “White”)
      • Black player name (header “Black”)
      • A list of move-by-move aggregated metrics for combined/white/black graphs.

    Returns:
      (game_data, white_name, black_name), where:
        - game_data is a list of dicts: {move_number, fen, combined, white, black}
        - white_name, black_name are strings (or empty if header not found).
    """
    with open(pgn_file_path, "r") as f:
        game = chess.pgn.read_game(f)
        if game is None:
            print("❌ No game found in the PGN file.")
            return [], "", ""

        # Extract player names from headers (fall back to empty string)
        white_name = game.headers.get("White", "")
        black_name = game.headers.get("Black", "")

        board = game.board()
        move_number = 0

        # Start with initial position (move_number = 0)
        metrics = analyze_position(board.fen())
        game_data = [{
            "move_number": move_number,
            "fen": board.fen(),
            "combined": metrics["combined"]["aggregate_level_metrics"],
            "white":    metrics["white"]["aggregate_level_metrics"],
            "black":    metrics["black"]["aggregate_level_metrics"]
        }]

        # Now iterate through each ply in the mainline
        for move in game.mainline_moves():
            move_number += 1
            board.push(move)
            metrics = analyze_position(board.fen())
            game_data.append({
                "move_number": move_number,
                "fen": board.fen(),
                "combined": metrics["combined"]["aggregate_level_metrics"],
                "white":    metrics["white"]["aggregate_level_metrics"],
                "black":    metrics["black"]["aggregate_level_metrics"]
            })

        return game_data, white_name, black_name


def create_time_series_plot(game_data, white_name, black_name, output_html):
    """
    Builds a Plotly figure with 13 subplots (one per metric). The main title
    now includes “WhiteName vs BlackName” above the standard description.

    Parameters:
      - game_data: list of {move_number, fen, combined, white, black}
      - white_name: string (from PGN header)
      - black_name: string (from PGN header)
      - output_html: path to write the html file
    """
    n_metrics = len(METRICS)
    cols = math.ceil(math.sqrt(n_metrics))
    rows = math.ceil(n_metrics / cols)

    # Extract the move numbers
    moves = [rec["move_number"] for rec in game_data]

    # Each subplot title is defined in METRICS
    subplot_titles = [title for (_, title) in METRICS]

    # Build a shared-x‐axes grid
    fig = make_subplots(
        rows=rows,
        cols=cols,
        subplot_titles=subplot_titles,
        shared_xaxes=True,
        vertical_spacing=0.06,
        horizontal_spacing=0.04
    )

    # Plot each metric in its own cell
    for i, (metric_key, _) in enumerate(METRICS):
        row = (i // cols) + 1
        col = (i % cols) + 1

        # Pull arrays of values for combined/white/black
        y_combined = [rec["combined"].get(metric_key, None) for rec in game_data]
        y_white    = [rec["white"].get(metric_key, None)    for rec in game_data]
        y_black    = [rec["black"].get(metric_key, None)    for rec in game_data]

        # Only show legend on the first subplot
        show_legend = (i == 0)

        # Combined trace
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_combined,
                mode="lines+markers",
                name="Combined",
                legendgroup="Combined",
                showlegend=show_legend,
                line=dict(color=COLOR_COMBINED),
                marker=dict(color=COLOR_COMBINED),
                hovertemplate="Move %{x}<br>Combined %{y:.4f}<extra></extra>"
            ),
            row=row, col=col
        )
        # White trace
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_white,
                mode="lines+markers",
                name="White",
                legendgroup="White",
                showlegend=show_legend,
                line=dict(color=COLOR_WHITE),
                marker=dict(color=COLOR_WHITE),
                hovertemplate="Move %{x}<br>White %{y:.4f}<extra></extra>"
            ),
            row=row, col=col
        )
        # Black trace
        fig.add_trace(
            go.Scatter(
                x=moves,
                y=y_black,
                mode="lines+markers",
                name="Black",
                legendgroup="Black",
                showlegend=show_legend,
                line=dict(color=COLOR_BLACK),
                marker=dict(color=COLOR_BLACK),
                hovertemplate="Move %{x}<br>Black %{y:.4f}<extra></extra>"
            ),
            row=row, col=col
        )

        # Remove y-axis label text to avoid collisions
        fig.update_yaxes(title_text="", row=row, col=col)

    # Shrink & center each subplot title (annotation)
    for annotation in fig.layout.annotations:
        annotation.font.size = 10
        annotation.align = "center"
        annotation.textangle = 0

    # Determine the combined figure title
    if white_name and black_name:
        main_title = f"{white_name} vs {black_name}<br><b>Aggregated Graph-Level Directional Metrics Time Series</b>"
    else:
        main_title = "<b>Aggregated Graph-Level Directional Metrics Time Series</b>"

    fig.update_layout(
        title_text=main_title,
        title_x=0.5,
        title_font_size=16,
        template="plotly_white",
        hovermode="x unified",
        height=280 * rows,
        width=380 * cols,
        margin=dict(l=40, r=40, t=100, b=40),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=-0.10,
            xanchor="center",
            x=0.50,
            font=dict(size=11)
        )
    )

    fig.write_html(output_html)
    print(f"✔ Saved time-series plot (with match info) to: {output_html}")


def process_pgn(pgn_file_path, output_html_path):
    """
    Ties everything together:
      1. Reads PGN → gets game_data, white_name, black_name
      2. Calls create_time_series_plot(...) with those three
    """
    game_data, white_name, black_name = process_game(pgn_file_path)
    if not game_data:
        print("No game data to plot.")
        return
    create_time_series_plot(game_data, white_name, black_name, output_html_path)


if __name__ == "__main__":
    # ─── Edit these paths as needed ──────────────────────────────────────────────
    pgn_file_path    = "dubov_games -vs_carlsen.pgn"
    output_html_path = "time_series_plot_with_DUBOV_Magnus.html"
    # ──────────────────────────────────────────────────────────────────────────────

    process_pgn(pgn_file_path, output_html_path)
