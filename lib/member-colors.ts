const memberColors = [
  "#f43f5e",
  "#fb923c",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#38bdf8",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899"
];

export function getMemberColor(memberId: string) {
  let hash = 0;

  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 31 + memberId.charCodeAt(i)) | 0;
  }

  return memberColors[Math.abs(hash) % memberColors.length];
}
