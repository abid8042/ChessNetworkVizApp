
=== JSON Output Schema ===
metadata: {
    schema_version: string,       # The version of this schema, e.g., "2.1".
    description:    string        # A human-readable summary of the data's purpose, e.g., "Compact chess game data for D3.js dashboards".
}

moves: [                         # Array of objects, each representing a state of the game at a specific move.
  {
    n:    integer,               # Move number. Starts at 0 for the initial board setup.
    m:    string,                # The move played to reach this state, in Standard Algebraic Notation (SAN), e.g., "Nf3". For the initial state (n=0), this is "start".
    f:    string,                # The Forsyth-Edwards Notation (FEN) string representing the board state after the move 'm' was made, e.g., "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".
    p: [                          # Array of objects, representing the state of each piece on the board. This is a flattened list of all pieces that have existed up to this move.
      {
        id:  string,             # A unique identifier for each piece, e.g., "p1", "p2", ..., "p32".
        t:   string,             # The type of the piece. Possible values include: "pawn", "knight", "bishop", "rook", "queen", "king".
        c:   string,             # The color of the piece: "white" or "black".
        sq:  string,             # The square the piece currently occupies, in algebraic notation, e.g., "e4", "g8". For pieces not on the board (e.g. 'promoted' and original piece is now 'inactive', or 'captured'), this square might represent its last known position or a conceptual holding square.
        st:  string,             # The current state of the piece. Observed values: "active" (on the board and in play), "inactive" (e.g., a pawn that has been promoted, or a king/rook that has castled and its prior square identity is now inactive). Possible values also include: "captured", "promoted".
        mc:  integer,            # The move index (value of 'n') when this piece was created or first appeared on the board. For initial pieces, this is 0. For promoted pieces, it's the move of promotion.
        cap: integer|null        # The move index (value of 'n') when this piece was captured. 'null' if the piece has not been captured.
      }, ...
    ],
    g: {                          # Graph-related data, calculated for the board state after move 'm'. Contains analyses for combined piece influence, as well as for white and black pieces separately.
      combined: {                 # Graph data considering pieces of both colors. The structure is identical for 'white' and 'black' keys.
        agg: {                    # Aggregate-level metrics for the entire graph of this color scope.
            fiedler_value:    float|null, # The Fiedler value (algebraic connectivity) of the graph. Can be null, e.g. if the graph is not connected. e.g., 0.8104595692081307.
            out_diameter:     float,      # The out-diameter of the graph. e.g., 1.0 (move 0, combined). (Schema originally said int).
            in_diameter:      float,      # The in-diameter of the graph. e.g., 1.0 (move 0, combined). (Schema originally said int).
            in_degree_avg:    float,      # Average in-degree of nodes in the graph. e.g., 1.3656716417910448.
            in_degree_var:    float,      # Variance of in-degrees in the graph. e.g., 0.1828358208955224.
            out_degree_avg:   float,      # Average out-degree of nodes in the graph. e.g., 2.0.
            out_degree_var:   float,      # Variance of out-degrees in the graph. e.g., 0.0.
            modularity:       float,      # Modularity score of the graph's community structure. e.g., 0.2515190700350037.
            community_count:  int,        # The total number of communities detected in the graph. e.g., 36 (move 0, combined).
            clustering:       float,      # The global clustering coefficient of the graph. e.g., 2.0. (Note: Typical clustering coefficients range 0-1. This value might indicate a different calculation method or scale.)
            size_entropy:     float       # Entropy of component sizes. e.g., 2.396394120474054.
        },
        cmp: [                    # Array of objects, each describing a connected component within the graph of this color scope.
          {
            index:           int,        # Zero-based index of this component. e.g., 0, 1, 2.
            size:            int,        # Number of nodes (squares) in this component. e.g., 7, 3.
            fiedler:         float|null, # Fiedler value for this component. Can be null. e.g., 0.740832472182546.
            out_diameter:    int,        # Out-diameter of this component. e.g., 1.
            in_diameter:     int,        # In-diameter of this component. e.g., 1.
            out_diameter_paths: [[string,string],...], # Array of paths representing the out-diameter. Each path is [source_node_id, target_node_id]. e.g., [["a2","a3"], ["a2","a4"]].
            in_diameter_paths:  [[string,string],...], # Array of paths representing the in-diameter. Each path is [source_node_id, target_node_id]. e.g., [["c2","c4"], ["a2","a4"]].
            modularity:      float,      # Modularity of the community structure within this component. e.g., 0.1781725989548082.
            communities:     [[string,...],...], # Array of communities within this component. Each community is an array of node IDs (square names). e.g., [["a3","a4","a2"], ["c2","c4"]]. (Added based on sample_data).
            community_count: int,        # Number of communities detected within this component. e.g., 3.
            clustering:      float,      # Clustering coefficient for this component. e.g., 2.0. (Note: Same value observation as agg.clustering).
            nodes:           [string,...]  # Array of node IDs (square names) belonging to this component. e.g., ["c4","a2","a4","c3","a3","b1","c2"].
          }, ...
        ],
        nds: [                    # Array of objects, each describing a node (square) in the graph for this color scope.
          {
            id:                    string,      # Unique identifier for the node, typically the algebraic notation of the square, e.g., "b1", "a3".
            type:                  string,      # Type of the node, observed as "square". (Added based on sample_data).
            position:              string,      # The algebraic notation of the square this node represents, e.g., "b1", "a3". (Appears redundant with 'id' if 'id' is always the square name for nodes of type "square").
            has_piece:             bool,        # True if a piece (of any color relevant to the graph scope: combined, white, or black) is on this square, false otherwise.
            piece_symbol:          string|null, # Standard character for the piece if `has_piece` is true, (e.g., "N" for white knight, "p" for black pawn), else null. Case indicates color (uppercase for white, lowercase for black) when 'combined' or a specific color's graph is considered. (Added based on sample_data).
            piece_color:           string|null, # Color of the piece ("white" or "black") if `has_piece` is true, else null.
            piece_type:            integer|null,# Integer representation of the piece type if `has_piece` is true, else null. e.g., 1 (Pawn), 2 (Knight), 4 (Rook). This likely maps to `p.t` values (e.g., Pawn:1, Knight:2, Bishop:3, Rook:4, Queen:5, King:6). (Schema originally string|null, changed based on sample_data).
            component_id:          integer,     # Index of the component (from the `cmp` array of the current graph scope) to which this node belongs. e.g., 0, 1. (Added based on sample_data).
            in_degree_centrality:  float,       # In-degree centrality of the node. e.g., 0, 2.0.
            out_degree_centrality: float,       # Out-degree centrality of the node. e.g., 2.0, 0.
            in_degree_centrality_variance:  float, # Variance of in-degree centrality. e.g., 0.1828358208955224.
            out_degree_centrality_variance: float, # Variance of out-degree centrality. e.g., 0.0.
            community_id:          int,         # ID of the community (within its component or globally, context dependent) this node belongs to. e.g., 1, 5, 0.
            in_degree_component_avg: float,     # Average in-degree of nodes within the same component as this node. e.g., 1.5, 1.0.
            in_degree_deviation:     float,     # Deviation of this node's in-degree from its component's average in-degree. e.g., 2.25, 0.25.
            out_degree_component_avg: float,    # Average out-degree of nodes within the same component as this node. e.g., 2.0.
            out_degree_deviation:     float     # Deviation of this node's out-degree from its component's average out-degree. e.g., 0.0, 4.0.
          }, ...
        ],
        lks: [                   # Array of objects, each describing an edge (link) in the graph for this color scope. These often represent influence or control.
          {
            type:        string,      # Type of the link, observed as "influence". (Added based on sample_data).
            source:      string,      # Node ID (square name) from which the link originates. e.g., "b1".
            target:      string,      # Node ID (square name) to which the link points. e.g., "c3".
            weight:      float,       # Weight of the link. e.g., 1.0 (sample shows 1, float allows for variability).
            piece_symbol: string|null, # Symbol of the piece at the 'source' square that is exerting the influence/control. e.g., "N", "P", "p". Null if not applicable.
            piece_color:  string|null, # Color of the piece ("white" or "black") at the 'source' square. Null if not applicable.
            piece_type:   integer|null # Integer representation of the type of piece at the 'source' square. e.g., 1 (Pawn), 2 (Knight). (Schema originally string|null, changed based on sample_data).
          }, ...
        ]
      },
      white: { /* Structure is identical to 'combined'. Graph data considering only white pieces and their influence/control. */ },
      black: { /* Structure is identical to 'combined'. Graph data considering only black pieces and their influence/control. */ }
    }
  }, ...
]
