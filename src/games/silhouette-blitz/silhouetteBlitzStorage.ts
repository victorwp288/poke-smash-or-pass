export const SILHOUETTE_BLITZ_KEY = "smashdex_game_silhouette_blitz";

export type SilhouetteTone = "neutral" | "success" | "warning" | "danger";

export type SilhouetteFeedback = {
  tone: SilhouetteTone;
  message: string;
};

export type SilhouetteCandidate = {
  rawName: string;
  display: string;
  id: number;
  sprite: string;
  typeNames: string[];
};

export type SilhouetteRound = {
  candidates: SilhouetteCandidate[];
  correctName: string;
  selectedName: string;
  resolved: boolean;
  timedOut: boolean;
};

export type SilhouetteHistoryEntry = {
  result: "win" | "loss";
  answer: string;
  selected: string;
  scoreDelta: number;
};

export type SilhouetteBlitzSnapshot = {
  score: number;
  streak: number;
  bestStreak: number;
  roundsPlayed: number;
  loading: boolean;
  round: SilhouetteRound | null;
  history: SilhouetteHistoryEntry[];
  feedback: SilhouetteFeedback;
  roundEndsAt: number | null;
};

export const createDefaultSilhouetteState = (): SilhouetteBlitzSnapshot => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  loading: false,
  round: null,
  history: [],
  feedback: {
    tone: "neutral",
    message: "Identify the silhouette before the timer runs out."
  },
  roundEndsAt: null
});

export const parseSilhouetteSnapshot = (raw: unknown): SilhouetteBlitzSnapshot => {
  if (!raw || typeof raw !== "object") return createDefaultSilhouetteState();
  const base = createDefaultSilhouetteState();
  const readNumber = (key: keyof SilhouetteBlitzSnapshot) =>
    Math.max(0, Number((raw as any)[key]) || 0);

  const feedbackRaw = (raw as any).feedback;
  const feedback: SilhouetteFeedback = {
    tone:
      typeof feedbackRaw?.tone === "string"
        ? (feedbackRaw.tone as SilhouetteTone)
        : base.feedback.tone,
    message:
      typeof feedbackRaw?.message === "string"
        ? feedbackRaw.message
        : base.feedback.message
  };

  const historyRaw = Array.isArray((raw as any).history) ? (raw as any).history : [];
  const history: SilhouetteHistoryEntry[] = historyRaw
    .map((entry: any) => {
      if (!entry || typeof entry !== "object") return null;
      return {
        result: entry.result === "win" ? "win" : "loss",
        answer: String(entry.answer || ""),
        selected: String(entry.selected || ""),
        scoreDelta: Number(entry.scoreDelta) || 0
      } satisfies SilhouetteHistoryEntry;
    })
    .filter(Boolean)
    .slice(0, 10) as SilhouetteHistoryEntry[];

  const roundRaw = (raw as any).round;
  let round: SilhouetteRound | null = null;
  if (roundRaw && typeof roundRaw === "object") {
    const candidatesRaw = Array.isArray(roundRaw.candidates) ? roundRaw.candidates : [];
    const candidates: SilhouetteCandidate[] = candidatesRaw
      .map((candidate: any) => {
        if (!candidate || typeof candidate !== "object") return null;
        const rawName = String(candidate.rawName || "").toLowerCase();
        if (!rawName) return null;
        return {
          rawName,
          display: String(candidate.display || rawName),
          id: Number(candidate.id) || 0,
          sprite: String(candidate.sprite || ""),
          typeNames: Array.isArray(candidate.typeNames)
            ? candidate.typeNames.slice(0, 2).map((typeName: any) => String(typeName || ""))
            : []
        } satisfies SilhouetteCandidate;
      })
      .filter(Boolean) as SilhouetteCandidate[];

    if (candidates.length >= 2) {
      round = {
        candidates,
        correctName: String(roundRaw.correctName || "").toLowerCase(),
        selectedName: String(roundRaw.selectedName || "").toLowerCase(),
        resolved: Boolean(roundRaw.resolved),
        timedOut: Boolean(roundRaw.timedOut)
      };
    }
  }

  const endsAtRaw = Number((raw as any).roundEndsAt);
  const roundEndsAt = Number.isFinite(endsAtRaw) && endsAtRaw > 0 ? endsAtRaw : null;

  return {
    ...base,
    score: readNumber("score"),
    streak: readNumber("streak"),
    bestStreak: readNumber("bestStreak"),
    roundsPlayed: readNumber("roundsPlayed"),
    loading: Boolean((raw as any).loading),
    round,
    history,
    feedback,
    roundEndsAt
  };
};

