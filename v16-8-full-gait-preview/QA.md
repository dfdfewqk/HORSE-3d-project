# HORSE RANCH V16.8 — 독립 검증 브랜치 / 미승인

기준 main: e7aa72cc8611c708721a6a4468de951f3a4d2137 (V16.7). 이 후보는 main과 GitHub Pages에 게시하지 않는다.

## 포함한 실질 변경
- mode-sync.js: 원본 iframe의 실제 animation index/name을 단일 상태 원천으로 삼고, 5개 모드·기존/신규 비교·하단 선택창·재생 상태·속도와 상단 표시를 연결. Idle도 동기화.
- contact-planner.js: 160프레임×4모드×4발의 착지/지지/회수 계획. y 목표에서 기존 중복 지면 계산 제거.
- ik-gate.js: 실제 V16.1/V16.5 19본 IK의 world 목표를 연결하고, 지면 높이 이중 보정 오류 수정. 실패한 IK를 구버전 채널로 묵시적으로 대체하지 않음.
- ik-experiment.js: 실제 런타임의 GLB 19본·발바닥 정점을 읽고 Walk→Cruise→Fast→Sprint 후보를 별도 추가. 검사 전 자동 선택 금지.
- gait-audit.js: V16.7→V16.8의 각 160프레임, 총 1,280프레임을 실제 GLB 스키닝 좌표로 비교하는 실행 코드. 관통/지지발 높이오차/피부 신장 측정.

## 불합격이 확인된 이전 데이터(이 후보의 결과 아님)
2026-10-19 이전 V16.8 프록시 실험의 발굽 관통 최대 mm: Walk 21.19→16.26, Cruise 39.20→36.60, Fast 62.17→49.54, Sprint 36.49→39.63. 피부 신장은 Walk 1.196→1.447배, Cruise 1.255→1.542배, Fast 1.349→1.583배, Sprint 1.401→1.542배. 기존 실험 모두 FAIL; 재검증 필요.

## 검사 기록
- 이번 작성본 JavaScript 구문 검사: PASS (실행 전 구문 검증).
- 원본 GitHub HEAD / 원본 V16.7 파일 읽기: PASS.
- 실제 V16.8 1,280프레임 CPU 검사: NOT VERIFIED (브라우저 실행 필요).
- 19본 IK 수치·관통·피부신장 조건: NOT VERIFIED.
- Windows Chrome GUI/실제 GPU 및 사용자 녹화 비교: NOT VERIFIED.
- 자동 재생 클립 동기화의 실제 브라우저 조작: NOT VERIFIED.
- 전체 마네/꼬리/포즈 크로스페이드·생체역학 합격: NOT VERIFIED.

## 보존과 배포 게이트
이 독립 경로 이외 기존 파일은 수정·삭제하지 않는다. V16.7 코드와 원본 Blender/GLB·Idle·기존 3종 Gallop·440개 복부 보정은 건드리지 않는다. 실제 브라우저에서 구문/동기화→160×8 GLB CPU→동일 카메라 화면 비교를 통과한 후에만 main 통합/Pages 배포를 검토한다. 수치 게이트 통과만으로 물리적 자연스러움이나 구조적 안정성을 보증하지 않는다.
