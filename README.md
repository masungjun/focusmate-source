# focusmate

날짜별 공부 계획과 집중 타이머로 실제 공부 기록을 쌓는 스터디 플래너입니다. Vite + React 19 + TypeScript.

## 실행

```bash
pnpm install
pnpm dev --port 5182
pnpm test    # 연속 기록, 주간 날짜, 타이머 계산 테스트
pnpm build
```

## 구조

- `src/lib.ts`: 날짜, 연속 기록, 타이머 계산(순수 함수)
- `src/App.tsx`: 오늘, 플래너, 친구 화면

## 데이터 저장

서버 없이 `localStorage`에만 저장합니다. 프로필 창에서 JSON 백업 파일로 내보내고 불러올 수 있습니다.

- `study-tasks`: 계획(날짜 포함). 날짜가 없던 이전 계획은 오늘로 옮겨집니다.
- `study-sessions`: 집중 기록(계획, 과목, 분, 종료 시각)
- `study-timer`: 진행 중인 타이머. 종료 시각을 저장해 새로고침해도 이어집니다.
- `study-month-goal`, `study-nickname`, `study-lang`: 설정

통계(연속 학습, 주간 그래프, 지난주 대비, 과목별 시간, 월 목표)는 모두 `study-sessions`에서 계산합니다. 1분 미만 집중은 기록하지 않습니다.

## 한계

서버가 없어 친구와 스터디룸은 실제로 동작하지 않는 예시 화면이며, 화면에도 그렇게 표시합니다. 공유는 오늘의 실제 기록을 텍스트로 복사하는 방식입니다.
