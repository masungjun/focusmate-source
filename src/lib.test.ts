import { test } from "node:test"
import assert from "node:assert/strict"
import { addDays, computeStreak, elapsedFocusSeconds, migrateTasks, minutesByDate, parseTimer, remainingSeconds, resolveTimerTask, splitElapsed, weekKeys } from "./lib.ts"

const s = (date: string, minutes = 25) => ({ date, minutes, subject: "수학" })

test("연속 기록: 오늘까지 이어진 날을 센다", () => {
  assert.equal(computeStreak([s("2026-11-02"), s("2026-11-03"), s("2026-11-04")], "2026-11-04"), 3)
})
test("연속 기록: 오늘 전이라도 어제까지 이어지면 유지", () => {
  assert.equal(computeStreak([s("2026-11-02"), s("2026-11-03")], "2026-11-04"), 2)
})
test("연속 기록: 하루 빠지면 끊긴다", () => {
  assert.equal(computeStreak([s("2026-11-01"), s("2026-11-04")], "2026-11-04"), 1)
  assert.equal(computeStreak([s("2026-11-01")], "2026-11-04"), 0)
})
test("연속 기록: 다음 날로 넘어가도 계산된다", () => {
  const sessions = [s("2026-12-31"), s("2027-01-01")]
  assert.equal(computeStreak(sessions, "2027-01-02"), 2)
  assert.equal(computeStreak(sessions, "2027-01-03"), 0)
})
test("주간 날짜는 월요일부터 7일", () => {
  const week = weekKeys("2026-11-04")
  assert.equal(week[0], "2026-11-02")
  assert.equal(week[6], "2026-11-08")
  assert.equal(weekKeys("2026-11-08")[0], "2026-11-02")
})
test("날짜 더하기는 월 경계를 넘는다", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01")
})
test("날짜별 분 합계", () => {
  assert.deepEqual(minutesByDate([s("2026-11-04", 10), s("2026-11-04", 15)]), { "2026-11-04": 25 })
})
test("타이머 남은 시간은 종료 시각으로 계산", () => {
  const timer = { mode: "focus" as const, total: 1500, remaining: 1500, endAt: 100000, taskId: null, carrySeconds: 0 }
  assert.equal(remainingSeconds(timer, 40000), 60)
  assert.equal(remainingSeconds(timer, 200000), 0)
  assert.equal(elapsedFocusSeconds(timer, 40000), 1440)
})
test("휴식은 집중 시간으로 세지 않는다", () => {
  assert.equal(elapsedFocusSeconds({ mode: "break", total: 300, remaining: 0, endAt: null, taskId: null, carrySeconds: 0 }, 0), 0)
})
test("깨진 타이머 값은 무시", () => {
  assert.equal(parseTimer("{bad"), null)
  assert.equal(parseTimer('{"mode":"x"}'), null)
})
test("날짜 없는 계획은 오늘로 옮긴다", () => {
  const out = migrateTasks<{ title: string; date?: string }>([{ title: "a" }, { title: "b", date: "2026-11-01" }, null], "2026-11-04")
  assert.deepEqual(out?.map((t) => t.date), ["2026-11-04", "2026-11-01"])
  assert.equal(migrateTasks("x", "2026-11-04"), null)
})
test("1분 미만은 다음 기록으로 넘긴다", () => {
  assert.deepEqual(splitElapsed(90, 0), { minutes: 1, carrySeconds: 30 })
  assert.deepEqual(splitElapsed(30, 30), { minutes: 1, carrySeconds: 0 })
  assert.deepEqual(splitElapsed(20, 0), { minutes: 0, carrySeconds: 20 })
})
test("타이머 할 일: 고른 것 → 오늘 남은 첫 할 일 → 없음", () => {
  const tasks = [
    { id: 1, done: true, date: "2026-11-05" },
    { id: 2, done: false, date: "2026-11-05" },
    { id: 3, done: false, date: "2026-11-06" },
  ]
  assert.equal(resolveTimerTask(null, tasks, "2026-11-05")?.id, 2)
  assert.equal(resolveTimerTask(3, tasks, "2026-11-05")?.id, 3)
  assert.equal(resolveTimerTask(0, tasks, "2026-11-05"), null)
  assert.equal(resolveTimerTask(null, [], "2026-11-05"), null)
})
