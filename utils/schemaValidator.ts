
import { RawChessData, Move, GraphScopeData, NodeData, LinkData, Piece, AggregateStats, ComponentData } from '../types';

interface ValidationResult {
  isValid: boolean;
  data: RawChessData | null;
  error: string | null;
}

function logValidationError(context: string, message: string, value?: any): false {
  console.error(`Validation Error in ${context}: ${message}`, value !== undefined ? `Value: ${JSON.stringify(value)}` : '');
  console.trace(); // Add stack trace for debugging
  return false;
}

function validateGenericProperties(obj: any, checks: { key: string, type: string | string[], canBeNull?: boolean }[], context: string): boolean {
  for (const check of checks) {
    const value = obj[check.key];

    if (check.canBeNull) {
      // If canBeNull is true, value can be of check.type, or null, or undefined (missing).
      // We only need to check its type if it's actually present and neither null nor undefined.
      if (value !== null && value !== undefined) {
        const typeCheckPassed = Array.isArray(check.type) ? check.type.includes(typeof value) : typeof value === check.type;
        if (!typeCheckPassed) {
          return logValidationError(context, `Property '${check.key}' is present with type ${typeof value}, but expected type ${check.type} (or null/undefined).`, value);
        }
      }
    } else { // Not allowed to be null (therefore, implicitly required and must be of correct type)
      if (value === null || value === undefined) {
        return logValidationError(context, `Required property '${check.key}' is missing, null, or undefined. Expected type ${check.type}.`, value);
      }
      // Value is present and not null/undefined. Check its type.
      const typeCheckPassed = Array.isArray(check.type) ? check.type.includes(typeof value) : typeof value === check.type;
      if (!typeCheckPassed) {
        return logValidationError(context, `Property '${check.key}' is present with type ${typeof value}, but expected type ${check.type}.`, value);
      }
    }
  }
  return true;
}


function validateNodeData(node: any, parentContext: string): node is NodeData {
  const context = `${parentContext} -> node ID '${node?.id || 'Unknown'}'`;
  if (typeof node !== 'object' || node === null) {
    return logValidationError(parentContext, `Node data is not an object or is null. Received: ${String(node)}`);
  }

  const checks: { key: keyof NodeData, type: string | string[], canBeNull?: boolean }[] = [
    { key: 'id', type: 'string' }, { key: 'type', type: 'string' }, { key: 'position', type: 'string' },
    { key: 'has_piece', type: 'boolean' },
    { key: 'piece_symbol', type: 'string', canBeNull: true },
    { key: 'piece_color', type: 'string', canBeNull: true }, // "white" or "black"
    { key: 'piece_type', type: 'number', canBeNull: true }, // 1: Pawn etc.
    { key: 'component_id', type: 'number' }, { key: 'community_id', type: 'number' },
    { key: 'in_degree_centrality', type: 'number' }, { key: 'out_degree_centrality', type: 'number' },
    { key: 'in_degree_centrality_variance', type: 'number' }, { key: 'out_degree_centrality_variance', type: 'number' },
    { key: 'in_degree_component_avg', type: 'number' }, { key: 'in_degree_deviation', type: 'number' },
    { key: 'out_degree_component_avg', type: 'number' }, { key: 'out_degree_deviation', type: 'number' },
  ];

  return validateGenericProperties(node, checks as any, context);
}

function validateLinkData(link: any, parentContext: string): link is LinkData {
  const context = `${parentContext} -> link source '${link?.source || 'Unknown'}' to target '${link?.target || 'Unknown'}'`;
  if (typeof link !== 'object' || link === null) {
    return logValidationError(parentContext, `Link data is not an object or is null. Received: ${String(link)}`);
  }

  const checks: { key: keyof LinkData, type: string, canBeNull?: boolean }[] = [
    { key: 'type', type: 'string' }, { key: 'source', type: 'string' }, { key: 'target', type: 'string' },
    { key: 'weight', type: 'number' },
    { key: 'piece_symbol', type: 'string', canBeNull: true },
    { key: 'piece_color', type: 'string', canBeNull: true },
    { key: 'piece_type', type: 'number', canBeNull: true },
  ];

  return validateGenericProperties(link, checks, context);
}

function validatePieceData(piece: any, parentContext: string): piece is Piece {
  const context = `${parentContext} -> piece ID '${piece?.id || 'Unknown'}'`;
  if (typeof piece !== 'object' || piece === null) {
    return logValidationError(parentContext, `Piece data is not an object or is null. Received: ${String(piece)}`);
  }

  const checks: { key: keyof Piece, type: string, canBeNull?: boolean }[] = [
    { key: 'id', type: 'string' }, { key: 't', type: 'string' }, { key: 'c', type: 'string' },
    { key: 'sq', type: 'string' }, { key: 'st', type: 'string' }, { key: 'mc', type: 'number' },
    { key: 'cap', type: 'number', canBeNull: true },
  ];
  return validateGenericProperties(piece, checks, context);
}

function validateAggStats(agg: any, parentContext: string): agg is AggregateStats {
    const context = `${parentContext} -> agg_stats`;
    if (typeof agg !== 'object' || agg === null) {
      return logValidationError(parentContext, `AggregateStats is not an object or is null. Received: ${String(agg)}`);
    }

    const checks: { key: keyof AggregateStats, type: string, canBeNull?: boolean}[] = [
        { key: 'fiedler_value', type: 'number', canBeNull: true },
        { key: 'out_diameter', type: 'number' }, { key: 'in_diameter', type: 'number' },
        { key: 'in_degree_avg', type: 'number' }, { key: 'in_degree_var', type: 'number' },
        { key: 'out_degree_avg', type: 'number' }, { key: 'out_degree_var', type: 'number' },
        { key: 'modularity', type: 'number' }, { key: 'community_count', type: 'number' }, // Assuming int is 'number'
        { key: 'clustering', type: 'number' }, { key: 'size_entropy', type: 'number' },
    ];
    return validateGenericProperties(agg, checks, context);
}

function validateComponentData(comp: any, parentContext: string): comp is ComponentData {
    const context = `${parentContext} -> component index '${comp?.index || 'Unknown'}'`;
    if (typeof comp !== 'object' || comp === null) {
      return logValidationError(parentContext, `ComponentData is not an object or is null. Received: ${String(comp)}`);
    }

    // Validate primitive properties first
    const primitiveChecks: { key: keyof ComponentData, type: string | 'array' | 'path_array' | 'communities_array', canBeNull?: boolean, itemType?: string }[] = [
      { key: 'index', type: 'number' }, { key: 'size', type: 'number' },
      { key: 'fiedler', type: 'number', canBeNull: true },
      { key: 'out_diameter', type: 'number' }, { key: 'in_diameter', type: 'number' },
      { key: 'modularity', type: 'number' },
      { key: 'community_count', type: 'number' }, { key: 'clustering', type: 'number' },
    ];
    if (!validateGenericProperties(comp, primitiveChecks.filter(c => c.type !== 'array' && c.type !== 'path_array' && c.type !== 'communities_array') as any, context)) {
        return false;
    }
    
    // Validate array properties
    const isValidPathArray = (paths: any, pathKey: string): boolean => {
        if (!Array.isArray(paths)) {
            return logValidationError(context, `Property '${pathKey}' is not an array.`, paths);
        }
        for (let i = 0; i < paths.length; i++) {
            const p = paths[i];
            if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string') {
                return logValidationError(context, `Element at index ${i} in '${pathKey}' is not a [string, string] tuple.`, p);
            }
        }
        return true;
    };

    const isValidCommunitiesArray = (communities: any): boolean => {
        if (!Array.isArray(communities)) {
            return logValidationError(context, `Property 'communities' is not an array.`, communities);
        }
        for (let i = 0; i < communities.length; i++) {
            const c = communities[i];
            if (!Array.isArray(c)) {
                 return logValidationError(context, `Element at index ${i} in 'communities' is not an array.`, c);
            }
            for (let j = 0; j < c.length; j++) {
                if (typeof c[j] !== 'string') {
                    return logValidationError(context, `Element at index [${i}][${j}] in 'communities' is not a string.`, c[j]);
                }
            }
        }
        return true;
    };
    
    const arrayChecks: { key: keyof ComponentData, type: 'array' | 'path_array' | 'communities_array', itemType?: string }[] = [
      { key: 'out_diameter_paths', type: 'path_array'},
      { key: 'in_diameter_paths', type: 'path_array'},
      { key: 'communities', type: 'communities_array'},
      { key: 'nodes', type: 'array', itemType: 'string' }
    ];

    for (const check of arrayChecks) {
        const value = comp[check.key];
        if (check.type === 'path_array') {
            if (!isValidPathArray(value, check.key as string)) return false;
        } else if (check.type === 'communities_array') {
            if (!isValidCommunitiesArray(value)) return false;
        } else if (check.type === 'array') {
            if (!Array.isArray(value)) {
                return logValidationError(context, `Property '${check.key}' is not an array.`, value);
            }
            if (check.itemType) {
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] !== check.itemType) {
                         return logValidationError(context, `Item at index ${i} in array '${check.key}' is type ${typeof value[i]}, expected ${check.itemType}.`, value[i]);
                    }
                }
            }
        }
    }
    return true;
}


function validateGraphScopeData(gsd: any, parentContext: string): gsd is GraphScopeData {
  const context = `${parentContext} -> graph_scope_data`;
  if (typeof gsd !== 'object' || gsd === null) {
    return logValidationError(parentContext, `GraphScopeData is not an object or is null. Received: ${String(gsd)}`);
  }

  if (!gsd.hasOwnProperty('agg') || !validateAggStats(gsd.agg, context)) {
    if (!gsd.hasOwnProperty('agg')) return logValidationError(context, `Property 'agg' is missing.`);
    return false; // validateAggStats will log details
  }

  if (!gsd.hasOwnProperty('cmp') || !Array.isArray(gsd.cmp)) {
    return logValidationError(context, `Property 'cmp' is missing or not an array.`, gsd.cmp);
  }
  for (let i = 0; i < gsd.cmp.length; i++) {
    if (!validateComponentData(gsd.cmp[i], `${context} -> cmp index ${i}`)) return false;
  }

  if (!gsd.hasOwnProperty('nds') || !Array.isArray(gsd.nds)) {
    return logValidationError(context, `Property 'nds' is missing or not an array.`, gsd.nds);
  }
  for (let i = 0; i < gsd.nds.length; i++) {
    if (!validateNodeData(gsd.nds[i], `${context} -> nds index ${i}`)) return false;
  }

  if (!gsd.hasOwnProperty('lks') || !Array.isArray(gsd.lks)) {
    return logValidationError(context, `Property 'lks' is missing or not an array.`, gsd.lks);
  }
  for (let i = 0; i < gsd.lks.length; i++) {
    if (!validateLinkData(gsd.lks[i], `${context} -> lks index ${i}`)) return false;
  }
  return true;
}

function validateMoveData(move: any, moveIndex: number): move is Move {
  const context = `Move index ${moveIndex}`;
  if (typeof move !== 'object' || move === null) {
    return logValidationError(`Root`, `Move data at index ${moveIndex} is not an object or is null. Received: ${String(move)}`);
  }

  if (typeof move.n !== 'number') { return logValidationError(context, `Property 'n' is type ${typeof move.n}, expected number.`, move.n); }
  if (typeof move.m !== 'string') { return logValidationError(context, `Property 'm' is type ${typeof move.m}, expected string.`, move.m); }
  if (typeof move.f !== 'string') { return logValidationError(context, `Property 'f' is type ${typeof move.f}, expected string.`, move.f); }
  
  if (!Array.isArray(move.p)) { return logValidationError(context, `Property 'p' (pieces) is not an array.`, move.p); }
  for (let i = 0; i < move.p.length; i++) {
    if (!validatePieceData(move.p[i], `${context} -> piece index ${i}`)) return false;
  }

  if (typeof move.g !== 'object' || move.g === null) {
    return logValidationError(context, `Property 'g' (graph data) is not an object or is null.`, move.g);
  }

  const scopes: (keyof Move['g'])[] = ['combined', 'white', 'black'];
  for (const scope of scopes) {
    if (!move.g.hasOwnProperty(scope)) {
      return logValidationError(context, `Property 'g.${scope}' (graph scope data) is missing.`);
    }
    if (typeof move.g[scope] !== 'object' || move.g[scope] === null) {
        return logValidationError(context, `Property 'g.${scope}' (graph scope data) is not an object or is null.`, move.g[scope]);
    }
    if (!validateGraphScopeData(move.g[scope], `${context}, '${scope}' scope`)) return false;
  }
  
  return true;
}

export function validateSchema(jsonText: string): ValidationResult {
  let parsedData;
  try {
    parsedData = JSON.parse(jsonText);
  } catch (e) {
    const error = e as Error;
    logValidationError("JSON Parsing", error.message);
    return { isValid: false, data: null, error: `Invalid JSON: ${error.message}` };
  }

  if (typeof parsedData !== 'object' || parsedData === null) {
    logValidationError("Root", "Parsed JSON is not an object or is null.");
    return { isValid: false, data: null, error: 'Data is not an object.' };
  }

  const data = parsedData as RawChessData;

  if (typeof data.metadata !== 'object' || data.metadata === null) {
    logValidationError("Root", "Metadata is not an object or is null.");
    return { isValid: false, data: null, error: 'Invalid metadata: not an object.' };
  }
  if (typeof data.metadata.schema_version !== 'string') {
    logValidationError("Root", `Metadata 'schema_version' is type ${typeof data.metadata.schema_version}, expected string.`, data.metadata.schema_version);
    return { isValid: false, data: null, error: 'Invalid metadata: schema_version is not a string.' };
  }
  if (typeof data.metadata.description !== 'string') {
     logValidationError("Root", `Metadata 'description' is type ${typeof data.metadata.description}, expected string.`, data.metadata.description);
    return { isValid: false, data: null, error: 'Invalid metadata: description is not a string.' };
  }


  if (!Array.isArray(data.moves)) {
    logValidationError("Root", "'moves' property is not an array.");
    return { isValid: false, data: null, error: 'Moves array is missing.' };
  }
  if (data.moves.length === 0) {
    logValidationError("Root", "Moves array is empty. Application requires at least one move (initial board setup).");
    return { isValid: false, data: null, error: 'Moves array is empty. At least one move is required.' };
  }


  for (let i = 0; i < data.moves.length; i++) {
    if (!validateMoveData(data.moves[i], i)) {
      // validateMoveData and its children will log specific errors to the console
      return { isValid: false, data: null, error: `Invalid data in move index ${i}. Check console for specific validation failures logged by individual validators.` };
    }
  }

  return { isValid: true, data: data, error: null };
}
