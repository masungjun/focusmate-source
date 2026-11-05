import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  computeStreak,
  elapsedFocusSeconds,
  fromDateKey,
  initialTimer,
  migrateTasks,
  minutesByDate,
  parseTimer,
  remainingSeconds,
  resolveTimerTask,
  splitElapsed,
  startOfWeek,
  toDateKey,
  weekKeys,
  type Session,
  type TimerState,
} from "./lib"

type IconName = "pencil" | "bolt" | "calendar" | "check" | "chevron" | "clock" | "flame" | "heart" | "home" | "pause" | "play" | "plus" | "rotate" | "share" | "sparkle" | "target" | "trash" | "users"

function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const paths: Record<IconName, React.ReactNode> = {
    pencil: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4" />,
    bolt: <path d="m13 2-9 11h8l-1 9 9-12h-8l1-8Z" />,
    calendar: (
      <>
        <path d="M6 2v4M18 2v4M3 9h18" />
        <rect x="3" y="4" width="18" height="18" rx="3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    flame: (
      <path d="M12 22c4.1 0 7-2.8 7-6.8 0-2.5-1.2-4.6-3.5-6.8.1 2.2-.8 3.5-2 4.2.2-4.3-2-7.5-5.1-10.1.2 3.4-3.4 5.6-3.4 10.2C5 18 8 22 12 22Z" />
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    rotate: (
      <>
        <path d="M20 7h-6V1" />
        <path d="M20 7a9 9 0 1 0 1 8" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5 6.8 4" />
      </>
    ),
    sparkle: (
      <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 3h6l1 4H8l1-4ZM6 7l1 14h10l1-14M10 11v6M14 11v6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2M16 4a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 5.7V21" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

type Lang = "ko" | "en"

const subjectEn: Record<string, string> = {
  수학: "Math",
  영어: "English",
  과학: "Science",
  국어: "Korean",
  기타: "Other",
}

function subjectLabel(subject: string, lang: Lang) {
  return lang === "en" ? (subjectEn[subject] ?? subject) : subject
}

const sampleTaskTitles = [
  { ko: "수학 문제집 3단원", en: "Math workbook, chapter 3" },
  { ko: "영어 단어 30개 암기", en: "Memorize 30 English words" },
  { ko: "과학 수행평가 자료 조사", en: "Research for a science assignment" },
]

function taskTitle(title: string, lang: Lang) {
  const sample = sampleTaskTitles.find((item) => item.ko === title || item.en === title)
  return sample ? sample[lang] : title
}

type FocusStats = {
  week: number[]
  weekDates: string[]
  weekTotal: number
  lastWeekTotal: number
  todayIndex: number
  todayMinutes: number
  todaySessions: number
  streak: number
  monthMinutes: number
}

function formatFocus(minutes: number, lang: Lang) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (lang === "ko") return h > 0 ? `${h}시간 ${m}분` : `${m}분`
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
}

const strings = {
  ko: {
    navToday: "오늘",
    navPlanner: "플래너",
    navFriends: "친구",
    homeAria: "홈으로",
    mainNavAria: "주요 메뉴",
    streakTitle: (days: number) => `${days}일 연속`,
    streakMsg: "멋진 페이스예요!",
    streakStart: "오늘 첫 집중을 시작해 봐요",
    greet: "안녕,",
    greetSub: "오늘도 해볼까?",
    greetMsg: "완벽하지 않아도 괜찮아. 시작하는 게 가장 중요해.",
    sharePlan: "오늘 계획 공유",
    doneWord: "완료",
    goalMsg1: "오늘의 계획을 하나씩",
    goalMsg2: "채워가고 있어요.",
    achieved: "달성",
    focusMode: "집중",
    timerLabel: "영어 단어 암기",
    resetAria: "타이머 초기화",
    pickTask: "공부할 계획",
    noTaskPicked: "계획 선택 안 함",
    timerFree: "자유 집중",
    timerMinutes: "집중 시간",
    breakMode: "휴식",
    breakLabel: "잠깐 쉬어요",
    breakReady: "집중 완료! 5분 쉬어 볼까요? 재생을 누르면 시작해요.",
    breakDone: "휴식이 끝났어요. 다시 시작해 볼까요?",
    skipBreak: "휴식 건너뛰기",
    editPlan: "수정",
    planSaved: "계획을 수정했어요",
    editPlanTitle: "계획 수정",
    dateField: "날짜",
    moveTomorrow: "내일로 넘기기",
    movedTomorrow: "내일로 넘겼어요",
    overdue: (n: number) => `지난 미완료 계획 ${n}개가 있어요`,
    bringToday: "오늘로 가져오기",
    broughtToday: "오늘 계획으로 가져왔어요",
    prevWeek: "지난주",
    nextWeek: "다음 주",
    goToday: "오늘",
    dayPlan: (label: string) => `${label} 계획`,
    emptyDay: "이 날의 계획이 아직 없어요.",
    backupExport: "기록 백업 저장",
    backupImport: "백업 불러오기",
    backupImported: "백업을 불러왔어요",
    backupFailed: "이 파일은 불러올 수 없어요",
    demoAction: "예시 화면이라 실제로 전달되거나 참여되지는 않아요",
    shareRecord: "내 기록 복사",
    startFocus: "집중 타이머로 가기",
    shareFull: (name: string, done: number, total: number, minutes: string, streak: number) =>
      `${name}의 오늘 공부: 계획 ${done}/${total}개 완료, 집중 ${minutes}, 연속 ${streak}일`,
    pauseAria: "일시정지",
    startAria: "시작",
    sessions: "세션",
    myPlan: "오늘의 할 일",
    addPlan: "계획 추가",
    addPlanSubmit: "추가하기",
    markDone: "완료",
    markUndone: "미완료로 변경",
    deleteAria: "삭제",
    minutes: "분",
    emptyToday: "아직 계획이 없어요. 가벼운 목표부터 추가해 보세요.",
    addNewPlan: "새로운 계획 추가하기",
    weeklyReport: "이번 주 집중 기록",
    lastWeek: "지난주보다",
    studyBuddies: "같이 공부 중",
    inviteCopied: "친구 초대 링크를 복사했어요",
    addFriendAria: "친구 추가",
    viewAllFriends: "친구 전체 보기",
    quote1: "큰 변화는 아주 작은",
    quote2: "습관에서 시작돼요.",
    quoteLabel: "오늘의 한마디",
    streakDays: (days: number) => `${days}일`,
    streakStudy: "연속 학습",
    todayFocus: "오늘 집중",
    sessionDone: "집중 세션을 완료했어요!",
    planAdded: "새로운 계획을 추가했어요",
    profileSaved: "프로필을 저장했어요",
    shareCopied: "공유 메시지를 복사했어요",
    newPlanAria: "새로운 계획 추가",
    newPlanTitle: "새로운 계획 추가",
    whatStudy: "무엇을 공부할까요?",
    titlePlaceholder: "예: 세계사 2단원 정리",
    subjectField: "과목",
    durationField: "예상 시간",
    cancel: "취소",
    profileAria: "프로필 설정",
    profileTitle: "어떻게 불러드릴까요?",
    profileMsg: "닉네임만 정하면 바로 시작할 수 있어요.",
    nicknameField: "닉네임",
    save: "저장하기",
    plannerTitle: "나의 플래너",
    plannerMsg: "이번 주의 목표를 한눈에 보고, 차근차근 완성해 보세요.",
    createPlan: "새 계획 만들기",
    weekDays: ["월", "화", "수", "목", "금", "토", "일"],
    todayPlanToast: "오늘의 계획을 보고 있어요",
    noPlanDay: (date: string) => `${date}일 계획은 아직 없어요`,
    todayPlan: "오늘의 계획",
    emptySubject: "이 과목의 계획이 아직 없어요.",
    mayGoal: (label: string) => `${label} 목표`,
    goalRemainingPre: "목표까지",
    goalRemainingTime: (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return h > 0 ? `${h}시간 ${m}분` : `${m}분`
    },
    goalRemainingPost: "남았어요",
    goalAchieved: "목표를 달성했어요!",
    goalHint: "아직 월 목표가 없어요. 목표 시간을 정해 보세요.",
    monthGoalLabel: "월 목표 시간",
    hoursUnit: "시간",
    goalSaved: "월 목표를 설정했어요",
    demoBadge: "예시 화면 · 실제 연동 없음",
    demoSample: "예시",
    subjectFocus: "과목별 집중",
    allFilter: "전체",
    friendsTitle: "함께하면 더 즐거워요",
    friendsMsg: "친구 기능을 어떻게 쓰게 될지 보여주는 예시 화면이에요.",
    inviteFriends: "친구 초대",
    inviteCodeCopied: "초대 코드 FM-1824를 복사했어요",
    liveNow1: "친구와 함께 쓰면",
    liveNow2: "이런 모습이 돼요.",
    notAlone: "아래 친구와 스터디룸은 예시예요. 서버가 없어 실제 친구와 연결되지는 않아요.",
    studyTogether: "같이 공부하기",
    togetherModeStarted: "함께 공부 모드를 시작했어요",
    myFriends: "내 친구",
    studyRooms: "스터디룸",
    focusing: "집중 중",
    resting: "휴식 중",
    today: "오늘",
    cheered: "응원 보냄",
    cheer: "응원하기",
    join: "참여하기",
    cheeredToast: (name: string) => `${name}에게 응원을 보냈어요!`,
    joinedToast: (name: string) => `${name}에 참여했어요`,
    shareText: (nickname: string, progress: number) =>
      `${nickname}의 오늘 공부 달성률은 ${progress}%예요. 같이 공부할래요?`,
  },
  en: {
    navToday: "Today",
    navPlanner: "Planner",
    navFriends: "Friends",
    homeAria: "Go to home",
    mainNavAria: "Main menu",
    streakTitle: (days: number) => `${days}-day streak`,
    streakMsg: "Great pace!",
    streakStart: "Start your first focus today",
    greet: "Hey,",
    greetSub: "Ready for today?",
    greetMsg: "It doesn't have to be perfect. Starting is what matters.",
    sharePlan: "Share today's plan",
    doneWord: "done",
    goalMsg1: "You're filling in",
    goalMsg2: "today's plan one by one.",
    achieved: "achieved",
    focusMode: "Focus",
    timerLabel: "Vocabulary drill",
    resetAria: "Reset timer",
    pickTask: "Plan to study",
    noTaskPicked: "No plan selected",
    timerFree: "Free focus",
    timerMinutes: "Focus length",
    breakMode: "Break",
    breakLabel: "Take a short break",
    breakReady: "Focus done! Want a 5-minute break? Press play to start.",
    breakDone: "Break's over. Ready to start again?",
    skipBreak: "Skip break",
    editPlan: "Edit",
    planSaved: "Plan updated",
    editPlanTitle: "Edit plan",
    dateField: "Date",
    moveTomorrow: "Move to tomorrow",
    movedTomorrow: "Moved to tomorrow",
    overdue: (n: number) => `${n} unfinished plan${n > 1 ? "s" : ""} from earlier days`,
    bringToday: "Bring to today",
    broughtToday: "Moved to today's plan",
    prevWeek: "Previous week",
    nextWeek: "Next week",
    goToday: "Today",
    dayPlan: (label: string) => `Plan for ${label}`,
    emptyDay: "No plans for this day yet.",
    backupExport: "Save backup",
    backupImport: "Load backup",
    backupImported: "Backup loaded",
    backupFailed: "This file can't be loaded",
    demoAction: "This is an example screen, so nothing is actually sent or joined",
    shareRecord: "Copy my record",
    startFocus: "Go to focus timer",
    shareFull: (name: string, done: number, total: number, minutes: string, streak: number) =>
      `${name}'s study today: ${done}/${total} plans done, ${minutes} focused, ${streak}-day streak`,
    pauseAria: "Pause",
    startAria: "Start",
    sessions: "sessions",
    myPlan: "Today's tasks",
    addPlan: "Add plan",
    addPlanSubmit: "Add",
    markDone: "Mark as done",
    markUndone: "Mark as not done",
    deleteAria: "Delete",
    minutes: " min",
    emptyToday: "No plans yet. Start with a small goal.",
    addNewPlan: "Add a new plan",
    weeklyReport: "This week's focus",
    lastWeek: "vs last week",
    studyBuddies: "Studying together",
    inviteCopied: "Invite link copied",
    addFriendAria: "Add friend",
    viewAllFriends: "View all friends",
    quote1: "Big changes start with",
    quote2: "very small habits.",
    quoteLabel: "Quote of the day",
    streakDays: (days: number) => `${days} days`,
    streakStudy: "in a row",
    todayFocus: "Focused today",
    sessionDone: "Focus session complete!",
    planAdded: "New plan added",
    profileSaved: "Profile saved",
    shareCopied: "Share message copied",
    newPlanAria: "Add a new plan",
    newPlanTitle: "Add a new plan",
    whatStudy: "What will you study?",
    titlePlaceholder: "e.g. World history chapter 2",
    subjectField: "Subject",
    durationField: "Estimated time",
    cancel: "Cancel",
    profileAria: "Profile settings",
    profileTitle: "What should we call you?",
    profileMsg: "Just pick a nickname and you're ready to go.",
    nicknameField: "Nickname",
    save: "Save",
    plannerTitle: "My planner",
    plannerMsg: "See this week's goals at a glance and build them step by step.",
    createPlan: "Create new plan",
    weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    todayPlanToast: "You're viewing today's plan",
    noPlanDay: (date: string) => `No plan for ${date} yet`,
    todayPlan: "Today's plan",
    emptySubject: "No plans for this subject yet.",
    mayGoal: (label: string) => `${label} goal`,
    goalRemainingPre: "Only",
    goalRemainingTime: (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
    },
    goalRemainingPost: "left to your goal",
    goalAchieved: "Monthly goal achieved!",
    goalHint: "No monthly goal yet. Set your target hours.",
    monthGoalLabel: "Monthly goal",
    hoursUnit: "h",
    goalSaved: "Monthly goal saved",
    demoBadge: "Demo screen · not connected",
    demoSample: "Demo",
    subjectFocus: "Focus by subject",
    allFilter: "All",
    friendsTitle: "Better together",
    friendsMsg: "An example screen showing how friend features could work.",
    inviteFriends: "Invite friends",
    inviteCodeCopied: "Invite code FM-1824 copied",
    liveNow1: "With friends,",
    liveNow2: "it could look like this.",
    notAlone: "The friends and rooms below are examples. There is no server, so no real friends are connected.",
    studyTogether: "Study together",
    togetherModeStarted: "Study-together mode started",
    myFriends: "My friends",
    studyRooms: "Study rooms",
    focusing: "Focusing",
    resting: "Resting",
    today: "Today",
    cheered: "Cheered",
    cheer: "Cheer",
    join: "Join",
    cheeredToast: (name: string) => `You cheered ${name} on!`,
    joinedToast: (name: string) => `Joined ${name}`,
    shareText: (nickname: string, progress: number) =>
      `${nickname}'s study progress today is ${progress}%. Want to study together?`,
  },
}

type Task = {
  id: number
  title: string
  subject: string
  duration: number
  done: boolean
  date: string
}
const initialTasks: Omit<Task, "date">[] = [
  {
    id: 1,
    title: "Math workbook, chapter 3",
    subject: "수학",
    duration: 45,
    done: true,
  },
  {
    id: 2,
    title: "Memorize 30 English words",
    subject: "영어",
    duration: 30,
    done: false,
  },
  {
    id: 3,
    title: "Research for a science assignment",
    subject: "과학",
    duration: 60,
    done: false,
  },
]

type Bilingual = { ko: string; en: string }

const friends = [
  {
    name: "Mina",
    color: "#ffb59e",
    task: { ko: "생명과학 복습 중", en: "Reviewing biology" } as Bilingual,
    time: { ko: "42분", en: "42 min" } as Bilingual,
    live: true,
    initials: "MN",
  },
  {
    name: "Leo",
    color: "#a9c9ff",
    task: { ko: "수학 모의고사", en: "Math mock exam" } as Bilingual,
    time: { ko: "1시간 12분", en: "1h 12m" } as Bilingual,
    live: true,
    initials: "LE",
  },
  {
    name: "Yuna",
    color: "#d6b6ff",
    task: { ko: "오늘 계획 완료!", en: "Today's plan done!" } as Bilingual,
    time: { ko: "8개 완료", en: "8 done" } as Bilingual,
    live: false,
    initials: "YU",
  },
]

type Page = "today" | "planner" | "friends"

type SharedViewProps = {
  lang: Lang
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  openTask: (date?: string) => void
  onEdit: (task: Task) => void
  onMoveTomorrow: (task: Task) => void
  todayKey: string
  setToast: (message: string) => void
  sessions: Session[]
  focusStats: FocusStats
  monthGoalHours: number
  setMonthGoalHours: (hours: number) => void
}

function LangToggle({
  lang,
  setLang,
}: {
  lang: Lang
  setLang: (lang: Lang) => void
}) {
  return (
    <button
      className="lang-toggle"
      onClick={() => {
        const next = lang === "ko" ? "en" : "ko"
        try {
          localStorage.setItem("study-ui-lang", next)
        } catch {
          // 저장이 안 되어도 이번 화면의 언어는 바꾼다
        }
        setLang(next)
      }}
      aria-label={lang === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      {lang === "ko" ? "EN" : "KO"}
    </button>
  )
}

function TaskRow({
  task,
  setTasks,
  lang,
  onEdit,
  onMoveTomorrow,
}: {
  task: Task
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  lang: Lang
  onEdit: (task: Task) => void
  onMoveTomorrow: (task: Task) => void
}) {
  const t = strings[lang]
  return (
    <article className={`task ${task.done ? "done" : ""}`}>
      <button
        className="checkbox"
        onClick={() =>
          setTasks((current) =>
            current.map((item) =>
              item.id === task.id ? { ...item, done: !item.done } : item,
            ),
          )
        }
        aria-label={`${taskTitle(task.title, lang)} ${task.done ? t.markUndone : t.markDone}`}
      >
        {task.done && <Icon name="check" size={15} />}
      </button>
      <div className="task-copy">
        <strong>{taskTitle(task.title, lang)}</strong>
        <span>
          <i className={`subject subject-${task.subject}`} />
          {subjectLabel(task.subject, lang)}
          <b>·</b>
          <Icon name="clock" size={14} />
          {task.duration}
          {t.minutes}
        </span>
      </div>
      <div className="task-actions">
        {!task.done && (
          <button
            onClick={() => onMoveTomorrow(task)}
            aria-label={`${taskTitle(task.title, lang)} ${t.moveTomorrow}`}
            title={t.moveTomorrow}
          >
            <Icon name="chevron" size={17} />
          </button>
        )}
        <button
          onClick={() => onEdit(task)}
          aria-label={`${taskTitle(task.title, lang)} ${t.editPlan}`}
          title={t.editPlan}
        >
          <Icon name="pencil" size={16} />
        </button>
        <button
          className="delete-task"
          onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}
          aria-label={`${taskTitle(task.title, lang)} ${t.deleteAria}`}
          title={t.deleteAria}
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
    </article>
  )
}

function PlannerView({
  lang,
  tasks,
  setTasks,
  openTask,
  onEdit,
  onMoveTomorrow,
  todayKey,
  sessions,
  focusStats,
  monthGoalHours,
  setMonthGoalHours,
  setToast,
}: SharedViewProps) {
  const t = strings[lang]
  const [filter, setFilter] = useState("전체")
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const subjects = ["전체", "수학", "영어", "과학", "국어", "기타"]
  const dayTasks = tasks.filter((task) => task.date === selectedDate)
  const filtered =
    filter === "전체" ? dayTasks : dayTasks.filter((task) => task.subject === filter)
  const week = weekKeys(selectedDate)
  const selectedLabel = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(fromDateKey(selectedDate))

  return (
    <div className="page-view">
      <section className="page-title">
        <div>
          <p className="eyebrow">MY STUDY PLAN</p>
          <h1>{t.plannerTitle}</h1>
          <p>{t.plannerMsg}</p>
        </div>
        <button className="primary-button" onClick={() => openTask(selectedDate)}>
          <Icon name="plus" size={18} />
          {t.createPlan}
        </button>
      </section>

      <section className="week-nav">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} aria-label={t.prevWeek}>
          <span className="flip"><Icon name="chevron" size={16} /></span> {t.prevWeek}
        </button>
        <button onClick={() => setSelectedDate(todayKey)} disabled={selectedDate === todayKey}>
          {t.goToday}
        </button>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} aria-label={t.nextWeek}>
          {t.nextWeek} <Icon name="chevron" size={16} />
        </button>
      </section>
      <section className="week-strip">
        {week.map((key, index) => (
          <button
            className={`${key === selectedDate ? "selected" : ""} ${key === todayKey ? "is-today" : ""}`}
            key={key}
            aria-pressed={key === selectedDate}
            onClick={() => setSelectedDate(key)}
          >
            <span>{t.weekDays[index]}</span>
            <strong>{fromDateKey(key).getDate()}</strong>
            <i className={tasks.some((task) => task.date === key) ? "has-plan" : ""} />
          </button>
        ))}
      </section>

      <section className="planner-layout">
        <div className="card planner-list-card">
          <div className="section-heading">
            <div>
              <span className="card-kicker">{selectedLabel}</span>
              <h2>{selectedDate === todayKey ? t.todayPlan : t.dayPlan(selectedLabel)}</h2>
            </div>
            <span className="task-count">
              {dayTasks.filter((task) => task.done).length}/{dayTasks.length}{" "}
              {t.doneWord}
            </span>
          </div>
          <div className="filter-pills">
            {subjects.map((subject) => (
              <button
                key={subject}
                className={filter === subject ? "active" : ""}
                onClick={() => setFilter(subject)}
              >
                {subject === "전체" ? t.allFilter : subjectLabel(subject, lang)}
              </button>
            ))}
          </div>
          <div className="task-list expanded">
            {filtered.map((task) => (
              <TaskRow
                task={task}
                setTasks={setTasks}
                lang={lang}
                onEdit={onEdit}
                onMoveTomorrow={onMoveTomorrow}
                key={task.id}
              />
            ))}
            {filtered.length === 0 && (
              <div className="empty-state">{dayTasks.length === 0 ? t.emptyDay : t.emptySubject}</div>
            )}
          </div>
          <button className="quick-add" onClick={() => openTask(selectedDate)}>
            <Icon name="plus" size={18} />
            {t.addNewPlan}
          </button>
        </div>

        <aside className="planner-side">
          <section className="month-goal-card">
            <span className="card-kicker">
              {new Date()
                .toLocaleDateString("en-US", { month: "long" })
                .toUpperCase()}{" "}
              GOAL
            </span>
            <h2>
              {t.mayGoal(
                lang === "en"
                  ? new Date().toLocaleDateString("en-US", { month: "long" })
                  : `${new Date().getMonth() + 1}월`,
              )}
            </h2>
            <div className="month-ring">
              <strong>
                {monthGoalHours > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (focusStats.monthMinutes / (monthGoalHours * 60)) * 100,
                      ),
                    )
                  : 0}
              </strong>
              <span>%</span>
            </div>
            {monthGoalHours > 0 ? (
              <p>
                {t.goalRemainingPre}{" "}
                <strong>
                  {t.goalRemainingTime(
                    Math.max(0, monthGoalHours * 60 - focusStats.monthMinutes),
                  )}
                </strong>{" "}
                {t.goalRemainingPost}
              </p>
            ) : (
              <p>{t.goalHint}</p>
            )}
            <div className="progress-track">
              <span
                style={{
                  width: `${
                    monthGoalHours > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (focusStats.monthMinutes /
                              (monthGoalHours * 60)) *
                              100,
                          ),
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <form
              className="goal-input-row"
              onSubmit={(event) => {
                event.preventDefault()
                const hours = Math.floor(
                  Number(new FormData(event.currentTarget).get("goalHours") || 0),
                )
                if (!Number.isFinite(hours) || hours < 1) return
                setMonthGoalHours(hours)
                setToast(t.goalSaved)
              }}
            >
              <label htmlFor="month-goal-input">{t.monthGoalLabel}</label>
              <input
                id="month-goal-input"
                name="goalHours"
                type="number"
                min={1}
                max={500}
                defaultValue={monthGoalHours > 0 ? monthGoalHours : ""}
                placeholder="20"
                inputMode="numeric"
              />
              <span>{t.hoursUnit}</span>
              <button type="submit">{t.save}</button>
            </form>
          </section>
          <section className="card subject-stats">
            <div className="section-heading">
              <div>
                <span className="card-kicker">SUBJECTS</span>
                <h2>{t.subjectFocus}</h2>
              </div>
            </div>
            {(() => {
              const totals: Record<string, number> = {}
              for (const session of sessions) {
                if (!session || typeof session.minutes !== "number") continue
                totals[session.subject] =
                  (totals[session.subject] || 0) +
                  Math.max(0, Math.round(session.minutes))
              }
              const rows = Object.entries(totals)
                .filter(([, minutes]) => minutes > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
              const fallback: [string, number][] =
                rows.length > 0
                  ? (rows as [string, number][])
                  : [
                      ["수학", 0],
                      ["영어", 0],
                      ["과학", 0],
                    ]
              const maxMinutes = Math.max(...fallback.map(([, m]) => m), 1)
              return fallback.map(([subject, minutes]) => (
                <div className="subject-stat" key={subject}>
                  <span>{subjectLabel(subject, lang)}</span>
                  <div>
                    <i
                      style={{
                        width: `${Math.round((minutes / maxMinutes) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{formatFocus(minutes, lang)}</strong>
                </div>
              ))
            })()}
          </section>
        </aside>
      </section>
    </div>
  )
}

function FriendsView({
  lang,
  cheers,
  setCheers,
  setToast,
  onShare,
  onStartFocus,
}: {
  lang: Lang
  cheers: Record<string, boolean>
  setCheers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setToast: (message: string) => void
  onShare: () => void
  onStartFocus: () => void
}) {
  const t = strings[lang]
  const [tab, setTab] = useState<"friends" | "rooms">("friends")
  const allFriends = [
    ...friends,
    {
      name: "Noah",
      color: "#ffd990",
      task: { ko: "세계사 연표 정리", en: "World history timeline" } as Bilingual,
      time: { ko: "28분", en: "28 min" } as Bilingual,
      live: true,
      initials: "NO",
    },
    {
      name: "Sora",
      color: "#9fe0cf",
      task: { ko: "잠시 쉬는 중", en: "Taking a break" } as Bilingual,
      time: { ko: "오늘 3개 완료", en: "3 done today" } as Bilingual,
      live: false,
      initials: "SO",
    },
  ]

  function cheer(name: string) {
    setCheers((current) => ({ ...current, [name]: !current[name] }))
    if (!cheers[name]) setToast(t.demoAction)
  }

  const rooms = [
    {
      name: { ko: "시험 D-30 열공방", en: "D-30 exam cram room" } as Bilingual,
      members: { ko: "12 / 20명", en: "12 / 20" } as Bilingual,
      color: "#d9f68b",
      rule: { ko: "90분 집중", en: "90-min focus" } as Bilingual,
    },
    {
      name: { ko: "새벽 기상 챌린지", en: "Early rise challenge" } as Bilingual,
      members: { ko: "8 / 12명", en: "8 / 12" } as Bilingual,
      color: "#bcd5ff",
      rule: { ko: "매일 6:00", en: "Daily 6:00" } as Bilingual,
    },
    {
      name: { ko: "영어 루틴 만들기", en: "English routine building" } as Bilingual,
      members: { ko: "16 / 30명", en: "16 / 30" } as Bilingual,
      color: "#ffd0bd",
      rule: { ko: "매일 30분", en: "Daily 30 min" } as Bilingual,
    },
  ]

  return (
    <div className="page-view">
      <section className="page-title friends-title">
        <div>
          <p className="eyebrow">STUDY TOGETHER</p>
          <h1>{t.friendsTitle}</h1>
                      <p>{t.friendsMsg}</p>
                      <span className="demo-badge">{t.demoBadge}</span>
        </div>
        <button
          className="primary-button"
          onClick={onShare}
        >
          <Icon name="share" size={18} />
          {t.shareRecord}
        </button>
      </section>

      <section className="community-hero">
        <div>
          <span className="card-kicker">{t.demoSample}</span>
          <h2>
            {t.liveNow1}
            <br />
            {t.liveNow2}
          </h2>
          <p>{t.notAlone}</p>
          <button onClick={onStartFocus}>
            {t.startFocus} <Icon name="chevron" size={16} />
          </button>
        </div>
        <div className="avatar-cloud" aria-hidden="true">
          {allFriends.slice(0, 4).map((friend, index) => (
            <span
              className={`avatar cloud-${index}`}
              style={{ background: friend.color }}
              key={friend.name}
            >
              {friend.initials}
            </span>
          ))}
          <span className="cloud-orbit" />
        </div>
      </section>

      <div className="community-tabs">
        <button
          className={tab === "friends" ? "active" : ""}
          onClick={() => setTab("friends")}
        >
          {t.myFriends} <span>5</span>
        </button>
        <button
          className={tab === "rooms" ? "active" : ""}
          onClick={() => setTab("rooms")}
        >
          {t.studyRooms} <span>3</span>
        </button>
      </div>

      {tab === "friends" ? (
        <section className="friend-grid">
          {allFriends.map((friend) => (
            <article className="friend-profile-card" key={friend.name}>
              <div className="friend-profile-top">
                <div className="avatar" style={{ background: friend.color }}>
                  {friend.initials}
                </div>
                <span className={friend.live ? "status-live" : "status-away"}>
                  {friend.live ? t.focusing : t.resting}
                </span>
              </div>
              <h3>{friend.name}</h3>
              <p>{friend.task[lang]}</p>
              <div className="friend-session">
                <Icon name="clock" size={15} />
                <span>{t.today}</span>
                <strong>{friend.time[lang]}</strong>
              </div>
              <button
                className={cheers[friend.name] ? "cheered" : ""}
                onClick={() => cheer(friend.name)}
              >
                <Icon name="heart" size={16} />
                {cheers[friend.name] ? t.cheered : t.cheer}
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="room-grid">
          {rooms.map((room) => (
            <article className="room-card" key={room.name.ko}>
              <span className="room-mark" style={{ background: room.color }}>
                <Icon name="users" />
              </span>
              <div>
                <h3>{room.name[lang]}</h3>
                <p>{room.rule[lang]}</p>
              </div>
              <span>{room.members[lang]}</span>
              <button onClick={() => setToast(t.demoAction)}>
                {t.join}
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

// 모달 포커스와 Esc 처리. 열릴 때 한 번만 등록해 타이머가 돌아도 입력 포커스가 튀지 않는다.
function useModal(open: boolean, ref: React.RefObject<HTMLFormElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>("input, select, button")?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close()
        return
      }
      if (event.key !== "Tab" || !ref.current) return
      const focusables = ref.current.querySelectorAll<HTMLElement>(
        "input, select, button:not(:disabled), label.backup-file",
      )
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      opener?.focus?.()
    }
  }, [open])
}
function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      localStorage.removeItem("study-lang")
      return localStorage.getItem("study-ui-lang") === "ko" ? "ko" : "en"
    } catch {
      return "en"
    }
  })
  const [nickname, setNickname] = useState(
    () => localStorage.getItem("study-nickname") || (lang === "en" ? "Friend" : "친구"),
  )
  const [now, setNow] = useState(() => Date.now())
  const todayKey = toDateKey(new Date(now))
  const [tasks, setTasks] = useState<Task[]>(() => {
    const seed = initialTasks.map((task) => ({ ...task, date: toDateKey(new Date()) }))
    try {
      const saved = localStorage.getItem("study-tasks")
      if (!saved) return seed
      return migrateTasks<Task>(JSON.parse(saved), toDateKey(new Date())) ?? seed
    } catch {
      return seed
    }
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [editing, setEditing] = useState<{ task: Task | null; date: string } | null>(null)
  const [timer, setTimer] = useState<TimerState>(() => {
    try {
      return parseTimer(localStorage.getItem("study-timer")) ?? initialTimer()
    } catch {
      return initialTimer()
    }
  })
  const [toast, setToast] = useState("")
  const [cheers, setCheers] = useState<Record<string, boolean>>({})
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem("study-sessions")
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed)
        ? parsed.filter(
            (session) =>
              session &&
              typeof session.date === "string" &&
              typeof session.minutes === "number",
          )
        : []
    } catch {
      return []
    }
  })
  const [monthGoalHours, setMonthGoalHours] = useState(() => {
    try {
      const value = Number(localStorage.getItem("study-month-goal"))
      return Number.isFinite(value) && value > 0 ? value : 0
    } catch {
      return 0
    }
  })
  const completedRef = useRef<number | null>(null)
  const taskModalRef = useRef<HTMLFormElement>(null)
  const profileModalRef = useRef<HTMLFormElement>(null)
  const [page, setPage] = useState<Page>(() => {
    const initial = window.location.hash.replace("#", "")
    return ["today", "planner", "friends"].includes(initial)
      ? (initial as Page)
      : "today"
  })

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = lang === "ko" ? "focusmate — 스터디 플래너" : "focusmate — Study planner"
  }, [lang])

  useEffect(() => {
    localStorage.setItem("study-tasks", JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    try {
      localStorage.setItem("study-sessions", JSON.stringify(sessions))
    } catch {
      // storage unavailable — keep in-memory sessions only
    }
  }, [sessions])

  useEffect(() => {
    try {
      localStorage.setItem("study-month-goal", String(monthGoalHours))
    } catch {
      // storage unavailable — keep in-memory goal only
    }
  }, [monthGoalHours])

  useEffect(() => {
    try {
      localStorage.setItem("study-timer", JSON.stringify(timer))
    } catch {
      // storage unavailable — timer keeps working until reload
    }
  }, [timer])

  const running = timer.endAt !== null
  const seconds = remainingSeconds(timer, now)
  const timerTask = resolveTimerTask(timer.taskId, tasks, todayKey)

  useEffect(() => {
    // 달리는 동안은 1초마다, 아닐 때는 자정 넘김을 알아채도록 30초마다 시각을 갱신한다.
    const tick = window.setInterval(() => setNow(Date.now()), running ? 1000 : 30000)
    return () => window.clearInterval(tick)
  }, [running])

  function recordFocus(seconds: number, endedAt: number) {
    const { minutes, carrySeconds } = splitElapsed(seconds, timer.carrySeconds)
    if (minutes >= 1) {
      const key = toDateKey(new Date(endedAt))
      const task = resolveTimerTask(timer.taskId, tasks, key)
      setSessions((current) => [
        ...current,
        {
          date: key,
          minutes,
          subject: task?.subject ?? "기타",
          taskId: task?.id ?? null,
          endedAt: new Date(endedAt).toISOString(),
        },
      ])
    }
    return carrySeconds
  }

  // 새로고침으로 앱이 꺼져 있던 사이에 끝난 경우에도 여기서 완료 처리한다.
  useEffect(() => {
    if (timer.endAt === null || seconds > 0) return
    if (completedRef.current === timer.endAt) return
    completedRef.current = timer.endAt
    if (timer.mode === "focus") {
      const carrySeconds = recordFocus(timer.total, timer.endAt)
      setTimer({ mode: "break", total: 300, remaining: 300, endAt: null, taskId: timer.taskId, carrySeconds })
      setToast(strings[lang].breakReady)
    } else {
      setTimer({ ...initialTimer(25), taskId: timer.taskId, carrySeconds: timer.carrySeconds })
      setToast(strings[lang].breakDone)
    }
  }, [timer, seconds])

  function toggleTimer() {
    const current = Date.now()
    setNow(current)
    setTimer((value) =>
      value.endAt === null
        ? { ...value, endAt: current + value.remaining * 1000 }
        : { ...value, remaining: remainingSeconds(value, current), endAt: null },
    )
  }

  function resetTimer() {
    const current = Date.now()
    const carrySeconds =
      timer.mode === "focus"
        ? recordFocus(elapsedFocusSeconds(timer, current), current)
        : timer.carrySeconds
    setNow(current)
    setTimer({
      ...initialTimer(timer.mode === "focus" ? Math.round(timer.total / 60) : 25),
      taskId: timer.taskId,
      carrySeconds,
    })
  }

  function setTimerLength(minutes: number) {
    setTimer((value) => ({ ...initialTimer(minutes), taskId: value.taskId, carrySeconds: value.carrySeconds }))
  }

  useModal(Boolean(editing), taskModalRef, () => setEditing(null))
  useModal(profileOpen, profileModalRef, () => setProfileOpen(false))

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 2300)
    return () => window.clearTimeout(timer)
  }, [toast])

  const t = strings[lang]
  const todayTasks = tasks.filter((task) => task.date === todayKey)
  const completed = todayTasks.filter((task) => task.done).length
  const progress = todayTasks.length
    ? Math.round((completed / todayTasks.length) * 100)
    : 0
  const overdueTasks = tasks.filter((task) => !task.done && task.date < todayKey)
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
  const circumference = 2 * Math.PI * 84
  const timerOffset = circumference * (1 - seconds / timer.total)
  const studyMinutes = useMemo(() => {
    const byDate = minutesByDate(sessions)
    return byDate[todayKey] || 0
  }, [sessions, todayKey])

  const focusStats = useMemo<FocusStats>(() => {
    const byDate = minutesByDate(sessions)
    const current = fromDateKey(todayKey)
    const monday = startOfWeek(current)
    const week: number[] = []
    const weekDates: string[] = []
    for (let index = 0; index < 7; index += 1) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      weekDates.push(String(day.getDate()))
      week.push(byDate[toDateKey(day)] || 0)
    }
    let lastWeekTotal = 0
    for (let index = 1; index <= 7; index += 1) {
      const day = new Date(monday)
      day.setDate(monday.getDate() - index)
      lastWeekTotal += byDate[toDateKey(day)] || 0
    }
    const streak = computeStreak(sessions, todayKey)
    const monthPrefix = todayKey.slice(0, 7)
    const monthMinutes = sessions.reduce(
      (sum, session) =>
        typeof session.date === "string" && session.date.startsWith(monthPrefix)
          ? sum + Math.max(0, Math.round(session.minutes))
          : sum,
      0,
    )
    return {
      week,
      weekDates,
      weekTotal: week.reduce((sum, minutes) => sum + minutes, 0),
      lastWeekTotal,
      todayIndex: (current.getDay() + 6) % 7,
      todayMinutes: byDate[todayKey] || 0,
      todaySessions: sessions.filter((session) => session.date === todayKey)
        .length,
      streak,
      monthMinutes,
    }
  }, [sessions, todayKey])

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get("title") || "").trim()
    if (!title || !editing) return
    const fields = {
      title,
      subject: String(data.get("subject")),
      duration: Number(data.get("duration")),
      date: String(data.get("date") || editing.date),
    }
    const target = editing.task
    setTasks((current) =>
      target
        ? current.map((task) => (task.id === target.id ? { ...task, ...fields } : task))
        : [...current, { id: Date.now(), done: false, ...fields }],
    )
    setEditing(null)
    setToast(target ? t.planSaved : t.planAdded)
  }

  function openTask(date?: string) {
    setEditing({ task: null, date: date ?? todayKey })
  }

  function moveTomorrow(task: Task) {
    const base = task.date > todayKey ? task.date : todayKey
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, date: addDays(base, 1) } : item,
      ),
    )
    setToast(t.movedTomorrow)
  }

  function bringOverdue() {
    setTasks((current) =>
      current.map((item) =>
        !item.done && item.date < todayKey ? { ...item, date: todayKey } : item,
      ),
    )
    setToast(t.broughtToday)
  }

  function exportBackup() {
    const data: Record<string, string> = {}
    for (const key of ["study-tasks", "study-sessions", "study-month-goal", "study-nickname", "study-ui-lang", "study-timer"]) {
      const value = localStorage.getItem(key)
      if (value !== null) data[key] = value
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ app: "focusmate", version: 1, data }, null, 2)], { type: "application/json" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `focusmate-backup-${todayKey}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importBackup(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      if (parsed?.app !== "focusmate" || !parsed.data) throw new Error("invalid")
      if (parsed.data["study-tasks"] && !Array.isArray(JSON.parse(parsed.data["study-tasks"]))) throw new Error("invalid")
      if (parsed.data["study-sessions"] && !Array.isArray(JSON.parse(parsed.data["study-sessions"]))) throw new Error("invalid")
      for (const [key, value] of Object.entries(parsed.data)) {
        if (key.startsWith("study-") && typeof value === "string") localStorage.setItem(key, value)
      }
      setToast(t.backupImported)
      window.setTimeout(() => window.location.reload(), 800)
    } catch {
      setToast(t.backupFailed)
    }
  }

  function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(
      new FormData(event.currentTarget).get("nickname") || "",
    ).trim()
    if (!value) return
    setNickname(value)
    localStorage.setItem("study-nickname", value)
    setProfileOpen(false)
    setToast(t.profileSaved)
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    window.location.hash = nextPage
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    const handleHashChange = () => {
      const nextPage = window.location.hash.replace("#", "")
      if (["today", "planner", "friends"].includes(nextPage))
        setPage(nextPage as Page)
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  async function share() {
    const text = t.shareFull(nickname, completed, todayTasks.length, formatFocus(focusStats.todayMinutes, lang), focusStats.streak)
    try {
      await navigator.clipboard.writeText(text)
      setToast(t.shareCopied)
    } catch {
      setToast(text)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("today")}
          aria-label={t.homeAria}
        >
          <span className="brand-mark">
            <Icon name="bolt" size={19} />
          </span>
          <span>
            focus<span>mate</span>
          </span>
        </button>
        <nav className="main-nav" aria-label={t.mainNavAria}>
          <button
            className={page === "today" ? "active" : ""}
            onClick={() => navigate("today")}
          >
            <Icon name="home" />
            {t.navToday}
          </button>
          <button
            className={page === "planner" ? "active" : ""}
            onClick={() => navigate("planner")}
          >
            <Icon name="calendar" />
            {t.navPlanner}
          </button>
          <button
            className={page === "friends" ? "active" : ""}
            onClick={() => navigate("friends")}
          >
            <Icon name="users" />
            {t.navFriends}
          </button>
        </nav>
        <div className="sidebar-streak">
          <span className="streak-icon">
            <Icon name="flame" size={18} />
          </span>
          <div>
            <strong>{t.streakTitle(focusStats.streak)}</strong>
            <small>{focusStats.streak > 0 ? t.streakMsg : t.streakStart}</small>
          </div>
        </div>
        <LangToggle lang={lang} setLang={setLang} />
        <button className="profile-chip" onClick={() => setProfileOpen(true)}>
          <span className="avatar avatar-me">{nickname.slice(0, 1)}</span>
          <span>
            <strong>{nickname}</strong>
            <small>@study_{nickname.toLowerCase()}</small>
          </span>
          <Icon name="chevron" size={17} />
        </button>
      </aside>

      <main>
        <header className="mobile-header">
          <button className="brand" onClick={() => navigate("today")}>
            <span className="brand-mark">
              <Icon name="bolt" size={18} />
            </span>
            <span>
              focus<span>mate</span>
            </span>
          </button>
          <div className="mobile-header-actions">
            <LangToggle lang={lang} setLang={setLang} />
            <button
              className="avatar avatar-me"
              onClick={() => setProfileOpen(true)}
            >
              {nickname.slice(0, 1)}
            </button>
          </div>
        </header>

        <div className="content" id="today">
          {page === "today" ? (
            <>
              <section className="welcome">
                <div>
                  <p className="eyebrow">
                    {new Date()
                      .toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                      .toUpperCase()}
                  </p>
                  <h1>
                    {t.greet} {nickname}! <span>{t.greetSub}</span>
                  </h1>
                  <p>{t.greetMsg}</p>
                </div>
                <button className="share-button" onClick={share}>
                  <Icon name="share" size={18} />
                  {t.sharePlan}
                </button>
              </section>

              <section className="overview-grid">
                <div className="goal-card">
                  <div className="goal-copy">
                    <span className="card-kicker">
                      <Icon name="target" size={17} />
                      TODAY'S GOAL
                    </span>
                    <h2>
                      {completed}/{todayTasks.length} {t.doneWord}
                    </h2>
                    <p>
                      {t.goalMsg1}
                      <br />
                      {t.goalMsg2}
                    </p>
                    <div className="progress-track">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <small>
                      {progress}% {t.achieved}
                    </small>
                  </div>
                  <div className="goal-visual">
                    <span className="orbit orbit-one" />
                    <span className="orbit orbit-two" />
                    <div className="goal-circle">
                      <strong>{progress}</strong>
                      <span>%</span>
                    </div>
                  </div>
                </div>

                <div className="timer-card">
                  <div className="timer-head">
                    <span className="card-kicker">
                      <Icon name="clock" size={17} />
                      FOCUS TIMER
                    </span>
                    <span className={`timer-mode ${timer.mode === "break" ? "is-break" : ""}`}>{timer.mode === "break" ? t.breakMode : t.focusMode}</span>
                  </div>
                  <div className="timer-body">
                    <div className="timer-ring">
                      <svg viewBox="0 0 190 190">
                        <circle cx="95" cy="95" r="84" className="timer-bg" />
                        <circle
                          cx="95"
                          cy="95"
                          r="84"
                          className="timer-progress"
                          style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: timerOffset,
                          }}
                        />
                      </svg>
                      <div>
                        <strong>{time}</strong>
                        <span>{timer.mode === "break" ? t.breakLabel : timerTask ? timerTask.title : t.timerFree}</span>
                      </div>
                    </div>
                    <div className="timer-actions">
                      <button
                        className="reset-button"
                        onClick={resetTimer}
                        aria-label={t.resetAria}
                      >
                        <Icon name="rotate" />
                      </button>
                      <button
                        className="play-button"
                        onClick={toggleTimer}
                        aria-label={running ? t.pauseAria : t.startAria}
                      >
                        <Icon name={running ? "pause" : "play"} size={25} />
                      </button>
                      <span className="session-count">
                        <strong>{focusStats.todaySessions}</strong>
                        <small>{t.sessions}</small>
                      </span>
                    </div>
                  </div>
                  {timer.mode === "focus" ? (
                    <div className="timer-settings">
                      <label>
                        {t.pickTask}
                        <select
                          value={timerTask?.id ?? 0}
                          disabled={running}
                          onChange={(event) =>
                            setTimer((value) => ({
                              ...value,
                              taskId: Number(event.target.value),
                            }))
                          }
                        >
                          <option value={0}>{t.noTaskPicked}</option>
                          {todayTasks
                            .filter((task) => !task.done || task.id === timerTask?.id)
                            .map((task) => (
                              <option key={task.id} value={task.id}>
                                {taskTitle(task.title, lang)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        {t.timerMinutes}
                        <select
                          value={Math.round(timer.total / 60)}
                          disabled={running || seconds !== timer.total}
                          onChange={(event) => setTimerLength(Number(event.target.value))}
                        >
                          {[15, 25, 30, 45, 50, 60, 90].map((m) => (
                            <option key={m} value={m}>
                              {m}
                              {t.minutes}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="timer-settings">
                      <button type="button" className="skip-break" onClick={() => setTimer({ ...initialTimer(25), taskId: timer.taskId, carrySeconds: timer.carrySeconds })}>
                        {t.skipBreak}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="main-grid">
                <div className="left-column">
                  <section className="card task-card" id="planner">
                    <div className="section-heading">
                      <div>
                        <span className="card-kicker">MY PLAN</span>
                        <h2>{t.myPlan}</h2>
                      </div>
                      <button
                        className="add-button"
                        onClick={() => openTask()}
                      >
                        <Icon name="plus" size={18} />
                        {t.addPlan}
                      </button>
                    </div>
                    {overdueTasks.length > 0 && (
                      <div className="overdue-banner">
                        <span>{t.overdue(overdueTasks.length)}</span>
                        <button onClick={bringOverdue}>{t.bringToday}</button>
                      </div>
                    )}
                    <div className="task-list">
                      {todayTasks.map((task) => (
                        <TaskRow
                          task={task}
                          setTasks={setTasks}
                          lang={lang}
                          onEdit={(item) => setEditing({ task: item, date: item.date })}
                          onMoveTomorrow={moveTomorrow}
                          key={task.id}
                        />
                      ))}
                      {todayTasks.length === 0 && (
                        <div className="empty-state">{t.emptyToday}</div>
                      )}
                    </div>
                    <button
                      className="quick-add"
                      onClick={() => openTask()}
                    >
                      <Icon name="plus" size={18} />
                      {t.addNewPlan}
                    </button>
                  </section>

                  <section className="card weekly-card">
                    <div className="section-heading">
                      <div>
                        <span className="card-kicker">WEEKLY REPORT</span>
                        <h2>{t.weeklyReport}</h2>
                      </div>
                      <div className="week-total">
                        <strong>{formatFocus(focusStats.weekTotal, lang)}</strong>
                        {focusStats.lastWeekTotal > 0 && (
                          <span>
                            <b>
                              {focusStats.weekTotal >= focusStats.lastWeekTotal
                                ? `↑ ${Math.round(
                                    ((focusStats.weekTotal -
                                      focusStats.lastWeekTotal) /
                                      focusStats.lastWeekTotal) *
                                      100,
                                  )}%`
                                : `↓ ${Math.round(
                                    ((focusStats.lastWeekTotal -
                                      focusStats.weekTotal) /
                                      focusStats.lastWeekTotal) *
                                      100,
                                  )}%`}
                            </b>{" "}
                            {t.lastWeek}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="chart">
                      {focusStats.week.map((minutes, index) => {
                        const maxMinutes = Math.max(...focusStats.week, 1)
                        return (
                          <div className="bar-column" key={index}>
                            <span className="bar-value">{minutes}m</span>
                            <div
                              className={`bar ${index === focusStats.todayIndex ? "current" : ""}`}
                              style={{
                                height: `${Math.round((minutes / maxMinutes) * 100)}%`,
                              }}
                            />
                            <span>{t.weekDays[index]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <aside className="right-column" id="friends">
                  <section className="card friend-card">
                    <div className="section-heading">
                      <div>
                        <span className="card-kicker">STUDY BUDDIES</span>
                        <h2>{t.studyBuddies}</h2>
                      </div>
                      <span className="demo-badge">{t.demoSample}</span>
                    </div>
                    <div className="friend-list">
                      {friends.map((friend) => (
                        <article className="friend" key={friend.name}>
                          <div
                            className="avatar"
                            style={{ background: friend.color }}
                          >
                            {friend.initials}
                          </div>
                          <div className="friend-copy">
                            <strong>
                              {friend.name}{" "}
                              {friend.live && <span className="live-dot" />}
                            </strong>
                            <span>{friend.task[lang]}</span>
                            <small>{friend.time[lang]}</small>
                          </div>
                          <button
                            className={`cheer-button ${
                              cheers[friend.name] ? "cheered" : ""
                            }`}
                            onClick={() => {
                              setCheers({
                                ...cheers,
                                [friend.name]: !cheers[friend.name],
                              })
                              if (!cheers[friend.name])
                                setToast(t.cheeredToast(friend.name))
                            }}
                            aria-label={t.cheeredToast(friend.name)}
                          >
                            <Icon name="heart" size={17} />
                          </button>
                        </article>
                      ))}
                    </div>
                    <button
                      className="view-friends"
                      onClick={() => navigate("friends")}
                    >
                      {t.viewAllFriends} <Icon name="chevron" size={16} />
                    </button>
                  </section>

                  <section className="quote-card">
                    <div className="quote-icon">
                      <Icon name="sparkle" size={20} />
                    </div>
                    <p>
                      “{t.quote1}
                      <br />
                      {t.quote2}”
                    </p>
                    <span>{t.quoteLabel}</span>
                  </section>

                  <section className="mini-stats">
                    <div>
                      <span className="stat-icon yellow">
                        <Icon name="flame" size={18} />
                      </span>
                      <p>
                        <strong>{t.streakDays(focusStats.streak)}</strong>
                        <small>{t.streakStudy}</small>
                      </p>
                    </div>
                    <div>
                      <span className="stat-icon blue">
                        <Icon name="clock" size={18} />
                      </span>
                      <p>
                        <strong>{formatFocus(focusStats.todayMinutes, lang)}</strong>
                        <small>{t.todayFocus}</small>
                      </p>
                    </div>
                  </section>
                </aside>
              </section>
            </>
          ) : page === "planner" ? (
            <PlannerView
              lang={lang}
              tasks={tasks}
              setTasks={setTasks}
              openTask={openTask}
              onEdit={(item) => setEditing({ task: item, date: item.date })}
              onMoveTomorrow={moveTomorrow}
              todayKey={todayKey}
              setToast={setToast}
              sessions={sessions}
              focusStats={focusStats}
              monthGoalHours={monthGoalHours}
              setMonthGoalHours={setMonthGoalHours}
            />
          ) : (
            <FriendsView
              onShare={share}
              onStartFocus={() => navigate("today")}
              lang={lang}
              cheers={cheers}
              setCheers={setCheers}
              setToast={setToast}
            />
          )}
        </div>
      </main>

      <nav className="mobile-nav">
        <button
          className={page === "today" ? "active" : ""}
          onClick={() => navigate("today")}
        >
          <Icon name="home" />
          <span>{t.navToday}</span>
        </button>
        <button
          className={page === "planner" ? "active" : ""}
          onClick={() => navigate("planner")}
        >
          <Icon name="calendar" />
          <span>{t.navPlanner}</span>
        </button>
        <button
          className={page === "friends" ? "active" : ""}
          onClick={() => navigate("friends")}
        >
          <Icon name="users" />
          <span>{t.navFriends}</span>
        </button>
      </nav>

      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <form
            className="modal"
            onSubmit={saveTask}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editing.task ? t.editPlanTitle : t.newPlanAria}
            ref={taskModalRef}
          >
            <span className="card-kicker">{editing.task ? "EDIT PLAN" : "NEW PLAN"}</span>
            <h2>{editing.task ? t.editPlanTitle : t.newPlanTitle}</h2>
            <label>
              {t.whatStudy}
              <input
                name="title"
                defaultValue={editing.task?.title ?? ""}
                placeholder={t.titlePlaceholder}
                required
              />
            </label>
            <label>
              {t.dateField}
              <input
                name="date"
                type="date"
                defaultValue={editing.task?.date ?? editing.date}
                required
              />
            </label>
            <div className="form-row">
              <label>
                {t.subjectField}
                <select name="subject" defaultValue={editing.task?.subject ?? "수학"}>
                  {["수학", "영어", "과학", "국어", "기타"].map((subject) => (
                    <option key={subject} value={subject}>
                      {subjectLabel(subject, lang)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.durationField}
                <select name="duration" defaultValue={editing.task?.duration ?? 30}>
                  {[15, 30, 45, 60, 90].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes}
                      {t.minutes}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                {t.cancel}
              </button>
              <button type="submit">{editing.task ? t.save : t.addPlanSubmit}</button>
            </div>
          </form>
        </div>
      )}

      {profileOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setProfileOpen(false)}
        >
          <form
            className="modal profile-modal"
            onSubmit={saveNickname}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.profileAria}
            ref={profileModalRef}
          >
            <span className="avatar avatar-me avatar-large">
              {nickname.slice(0, 1)}
            </span>
            <span className="card-kicker">MY PROFILE</span>
            <h2>{t.profileTitle}</h2>
            <p>{t.profileMsg}</p>
            <label>
              {t.nicknameField}
              <input
                name="nickname"
                defaultValue={nickname}
                maxLength={12}
                required
              />
            </label>
            <div className="backup-row">
              <button type="button" onClick={exportBackup}>
                {t.backupExport}
              </button>
              <label className="backup-file">
                {t.backupImport}
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) void importBackup(file)
                  }}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setProfileOpen(false)}>
                {t.cancel}
              </button>
              <button type="submit">{t.save}</button>
            </div>
          </form>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
