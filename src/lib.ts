// 날짜·집중 기록 계산. 화면과 분리해 node --test로 검증한다.

export type Session = {
  date: string
  minutes: number
  subject: string
  taskId?: number | null
  endedAt?: string
}

export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function weekKeys(anchorKey: string) {
  const monday = toDateKey(startOfWeek(fromDateKey(anchorKey)))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function minutesByDate(sessions: Session[]) {
  const map: Record<string, number> = {}
  for (const session of sessions) {
    if (!session || typeof session.date !== "string" || typeof session.minutes !== "number") continue
    map[session.date] = (map[session.date] || 0) + Math.max(0, Math.round(session.minutes))
  }
  return map
}

// 오늘 기록이 없어도 어제까지 이어졌으면 연속으로 친다.
export function computeStreak(sessions: Session[], todayKey: string) {
  const byDate = minutesByDate(sessions)
  let cursor = byDate[todayKey] ? todayKey : addDays(todayKey, -1)
  let streak = 0
  while (byDate[cursor]) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export type TimerState = {
  mode: "focus" | "break"
  total: number
  remaining: number
  endAt: number | null
  // null: 오늘 남은 첫 할 일을 자동으로 쓴다, 0: 계획 없이 집중
  taskId: number | null
  // 1분이 안 돼 기록하지 못한 초. 다음 기록에 이어 붙인다.
  carrySeconds: number
}

export function initialTimer(minutes = 25): TimerState {
  return { mode: "focus", total: minutes * 60, remaining: minutes * 60, endAt: null, taskId: null, carrySeconds: 0 }
}

// 시작 시각 기준으로 계산해 백그라운드 탭이 느려져도 시간이 어긋나지 않는다.
export function remainingSeconds(timer: TimerState, now: number) {
  if (timer.endAt === null) return timer.remaining
  return Math.max(0, Math.ceil((timer.endAt - now) / 1000))
}

export function elapsedFocusSeconds(timer: TimerState, now: number) {
  if (timer.mode !== "focus") return 0
  return timer.total - remainingSeconds(timer, now)
}

// 쌓인 초를 분으로 나누고 남은 초는 다음 기록으로 넘긴다.
export function splitElapsed(seconds: number, carry: number) {
  const total = Math.max(0, seconds) + Math.max(0, carry)
  return { minutes: Math.floor(total / 60), carrySeconds: total % 60 }
}

export function resolveTimerTask<T extends { id: number; done: boolean; date: string }>(
  taskId: number | null,
  tasks: T[],
  todayKey: string,
): T | null {
  if (taskId === 0) return null
  const picked = taskId === null ? undefined : tasks.find((task) => task.id === taskId)
  return picked ?? tasks.find((task) => task.date === todayKey && !task.done) ?? null
}

export function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    if (
      (value?.mode === "focus" || value?.mode === "break") &&
      Number.isFinite(value.total) && value.total > 0 &&
      Number.isFinite(value.remaining) && value.remaining >= 0 &&
      (value.endAt === null || Number.isFinite(value.endAt))
    ) {
      return { mode: value.mode, total: value.total, remaining: value.remaining, endAt: value.endAt, taskId: Number.isFinite(value.taskId) ? value.taskId : null, carrySeconds: Number.isFinite(value.carrySeconds) ? value.carrySeconds : 0 }
    }
  } catch {
    // 깨진 값은 무시하고 새 타이머로 시작한다.
  }
  return null
}

// 날짜가 없던 이전 계획은 오늘 계획으로 옮긴다.
export function migrateTasks<T extends { date?: unknown }>(raw: unknown, todayKey: string): (T & { date: string })[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .filter((task) => task && typeof task === "object" && typeof (task as { title?: unknown }).title === "string")
    .map((task) => ({
      ...(task as T),
      date: typeof (task as T).date === "string" ? ((task as T).date as string) : todayKey,
    }))
}
