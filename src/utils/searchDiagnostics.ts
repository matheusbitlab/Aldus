const enabled = process.env.EXPO_PUBLIC_SEARCH_DIAGNOSTICS === "1";
export function searchDiagnostic(operationId: number | undefined, stage: string, fields: { sourceIndex?: number; sourceCount?: number; resultsCount?: number; status?: string } = {}) {
  if (!enabled) return;
  // No query, source URL/name, body, error object, headers or credentials.
  console.info("[SearchDiagnostic]", JSON.stringify({ operationId, stage, at: Date.now(), ...fields }));
}
