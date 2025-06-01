#!/usr/bin/env python3
"""
Optimized PGN Processor for Compact JSON Output (v2.1)

This script reads a PGN file, computes positional graphs and directional metrics,
tracks piece states, and emits a compact JSON schema designed for seamless
integration with a D3.js dashboard.

=== JSON Output Schema ===
metadata: {
    schema_version: string,       # e.g. "2.1"
    description:     string        # human-readable summary
}

moves: [                         # array of per-move objects
  {
    n:    integer,               # move_number (0=start)
    m:    string,                # SAN move or "start"
    f:    string,                # FEN of board state
    p: [                          # piece_states (flattened)
      {
        id:  string,             # "p1", "p2", ...
        t:   string,             # "pawn","knight",...
        c:   string,             # "white" or "black"
        sq:  string,             # square name, e.g. "e4"
        st:  string,             # "active","inactive","captured","promoted"
        mc:  integer,            # move index when created
        cap: integer|null        # move index when captured
      }, ...
    ],
    g: {                          # graph_data bundles per color
      combined: {                 # same keys for white & black
        agg: {                    # aggregate-level metrics
            fiedler_value:    float|null,
            out_diameter:     int,
            in_diameter:      int,
            in_degree_avg:    float,
            in_degree_var:    float,
            out_degree_avg:   float,
            out_degree_var:   float,
            modularity:       float,
            community_count:  int,
            clustering:       float,
            size_entropy:     float
        },
        cmp: [                    # component-level array
          {
            index:           int,
            size:            int,
            fiedler:         float|null,
            out_diameter:    int,
            in_diameter:     int,
            out_diameter_paths: [[string,string],...],
            in_diameter_paths:  [[string,string],...],
            modularity:      float,
            community_count: int,
            clustering:      float,
            nodes:           [string,...]
          }, ...
        ],
        nds: [                    # node-level list
          {
            id:                    string,
            position:              string,      # node key
            has_piece:             bool,
            piece_color:           string|null,
            piece_type:            string|null,
            in_degree_centrality:  float,
            out_degree_centrality: float,
            in_degree_centrality_variance:  float,
            out_degree_centrality_variance: float,
            community_id:         int,
            in_degree_component_avg: float,
            in_degree_deviation:     float,
            out_degree_component_avg: float,
            out_degree_deviation:     float
          }, ...
        ],
        lks: [                   # edge-level list
          {
            source:      string,   # node id
            target:      string,   # node id
            weight:      float,
            piece_symbol: string|null,
            piece_color:  string|null,
            piece_type:   string|null
          }, ...
        ]
      },
      white: { /* same as combined */ },
      black: { /* same as combined */ }
    }
  }, ...
]

=== D3.js Dashboard Consumption ===
1. Fetch JSON with d3.json()
2. Iterate over data.moves:
   - Use move.n and move.m to label steps.
   - Render board via move.f (optional).
   - Bind move.p as piece data; use 'st' to color nodes.
   - For each color in move.g:
     • g[color].nds → d3.force simulation nodes
     • g[color].lks → links with 'weight'
     • g[color].agg & g[color].cmp for summary panels
3. Provide time-slider on move.n to animate moves.
"""
import chess
import chess.pgn
import json

from directional_metrics import analyze_position
from positional_graph import PositionalGraph



PIECE_NAMES = {
    chess.PAWN:   "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK:   "rook",
    chess.QUEEN:  "queen",
    chess.KING:   "king"
}

class PieceTracker:
    def __init__(self, board):
        """
        board: chess.Board
        """
        self.pieces = {}
        self.id_counter = 1
        self._init_from_board(board)

    def _init_from_board(self, board):
        """
        Initialize from board state.
        board: chess.Board
        """
        for sq, piece in board.piece_map().items():
            pid = f"p{self.id_counter}"; self.id_counter += 1
            self.pieces[pid] = {
                "id": pid,
                "type": PIECE_NAMES[piece.piece_type],
                "color": "white" if piece.color == chess.WHITE else "black",
                "current_square": chess.square_name(sq),
                "status": "active",
                "move_created": 0,
                "move_captured": None,
                "promoted": False
            }

    def update_move(self, board, move, move_number):
        """
        board: chess.Board
        move: chess.Move
        move_number: int
        """
        from_sq = chess.square_name(move.from_square)
        to_sq = chess.square_name(move.to_square)
        # Castling
        if board.is_castling(move):
            king_id = next((pid for pid,info in self.pieces.items()
                            if info['current_square']==from_sq and info['status']=='active'), None)
            if king_id:
                self.pieces[king_id]['current_square'] = to_sq
            return
        mover = next((pid for pid,info in self.pieces.items()
                      if info['current_square']==from_sq and info['status']=='active'), None)
        if mover:
            if move.promotion:
                self.pieces[mover]['status'] = 'promoted'
                self.pieces[mover]['move_captured'] = move_number
                nid = f"p{self.id_counter}"; self.id_counter += 1
                self.pieces[nid] = {
                    'id': nid,
                    'type': PIECE_NAMES[move.promotion],
                    'color': self.pieces[mover]['color'],
                    'current_square': to_sq,
                    'status': 'active',
                    'move_created': move_number,
                    'move_captured': None,
                    'promoted': True
                }
            else:
                self.pieces[mover]['current_square'] = to_sq
        if board.is_capture(move):
            cap_sq = to_sq if not board.is_en_passant(move) else (
                chess.square_name(move.to_square - (8 if board.turn==chess.WHITE else -8)))
            victim = next((pid for pid,info in self.pieces.items()
                            if info['current_square']==cap_sq and info['status']=='active'), None)
            if victim:
                self.pieces[victim]['status'] = 'captured'
                self.pieces[victim]['move_captured'] = move_number

    def get_snapshot(self, board):
        """
        board: chess.Board
        returns: dict of lists {active,inactive,captured,promoted}
        """
        pos_graph = PositionalGraph(board)
        active_nodes = set(pos_graph.graph.nodes())
        snap = {'active':[],'inactive':[],'captured':[],'promoted':[]}
        for pid,info in self.pieces.items():
            info_copy = info.copy()
            if info_copy['status'] in ('captured','promoted'):
                snap[info_copy['status']].append(info_copy)
            else:
                status = 'active' if info_copy['current_square'] in active_nodes else 'inactive'
                info_copy['status'] = status
                snap[status].append(info_copy)
        return snap


def convert_graph_info_to_array(graph_info):
    """
    graph_info: {'nodes':[(id,data)], 'edges':[(u,v,data)]}
    returns: {'nodes':[...], 'edges':[...]} with id/source/target
    """
    nodes=[]
    for nid,data in graph_info.get('nodes',[]):
        entry=data.copy(); entry['id']=str(nid); nodes.append(entry)
    edges=[]
    for u,v,data in graph_info.get('edges',[]):
        entry=data.copy(); entry['source']=str(u); entry['target']=str(v); edges.append(entry)
    return {'nodes':nodes,'edges':edges}


def flatten_move(rec):
    """
    rec: move record dict
    returns: compact dict {'n','m','f','p','g'}
    """
    pieces=[]
    for cat in ('active','inactive','captured','promoted'):
        for p in rec['piece_tracking'].get(cat,[]):
            pieces.append({
                'id':p['id'],'t':p['type'],'c':p['color'],
                'sq':p['current_square'],'st':cat,
                'mc':p['move_created'],'cap':p['move_captured']
            })
    graphs={}
    for color in ('combined','white','black'):
        dm=rec['directional_metrics'][color]
        agg=dm['aggregate_level_metrics']
        cmp=dm.get('component_level_metrics',[])
        gi=convert_graph_info_to_array(dm['graph_info'])
        graphs[color]={'agg':agg,'cmp':cmp,'nds':gi['nodes'],'lks':gi['edges']}
    return {'n':rec['move_number'],'m':rec['move'],'f':rec['fen'],'p':pieces,'g':graphs}


def make_json_serializable(obj):
    """
    Recursively convert objects (e.g. numpy scalars, tuples, sets) to
    built-in Python types so that json.dump(...) won't choke.
    """
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [make_json_serializable(v) for v in obj]
    if isinstance(obj, set):
        return [make_json_serializable(v) for v in obj]
    if hasattr(obj, "item"):
        try:
            return obj.item()
        except:
            pass
    return obj


def process_pgn(pgn_path, out_path):
    """
    pgn_path: str, PGN input file path
    out_path: str, JSON output file path
    """
    moves=[]
    with open(pgn_path) as f:
        game=chess.pgn.read_game(f)
    board=game.board()
    tracker=PieceTracker(board)
    # initial
    moves.append({
        'move_number':0,'move':'start','fen':board.fen(),
        'piece_tracking':tracker.get_snapshot(board),
        'directional_metrics':analyze_position(board.fen())
    })
    for idx,mv in enumerate(game.mainline_moves(),start=1):
        san=board.san(mv)
        tracker.update_move(board,mv,idx)
        board.push(mv)
        moves.append({
            'move_number':idx,'move':san,'fen':board.fen(),
            'piece_tracking':tracker.get_snapshot(board),
            'directional_metrics':analyze_position(board.fen())
        })
    output={
        'metadata':{'schema_version':'2.1','description':'Compact chess game data for D3.js dashboards'},
        'moves':[flatten_move(r) for r in moves]
    }
    with open(out_path,'w',encoding='utf-8') as out_f:
        serializable_output = make_json_serializable(output)
        json.dump(serializable_output, out_f, separators=(',',':'))
    print(f"Output written to {out_path}")

if __name__=='__main__':
    # Hard-coded file locations; update these paths as needed.
    pgn_file_path = "test_game.pgn"
    output_json_path = "sample_datav4.json"
    
    process_pgn(pgn_file_path, output_json_path)