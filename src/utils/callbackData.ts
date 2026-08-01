export type ApprovalAction = "approve" | "reject";

export interface ParsedApprovalCallback {
  action: ApprovalAction;
  transactionId: number;
}

/**
 * Parses callback_query data in the form "approve:123" / "reject:123".
 * Pure function — easy to unit test without spinning up grammY or a DB.
 */
export function parseApprovalCallbackData(
  data: string,
): ParsedApprovalCallback | null {
  const [action, idStr] = data.split(":");
  const transactionId = Number(idStr);
  if (
    (action !== "approve" && action !== "reject") ||
    Number.isNaN(transactionId)
  ) {
    return null;
  }
  return { action, transactionId };
}
