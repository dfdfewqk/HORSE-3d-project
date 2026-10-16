# HORSE RANCH 3D — V14 4모션 통합 후보
메뉴에는 Walk, Gallop Cruise, Gallop Fast, Gallop Sprint만 표시합니다.
Walk V13.1의 4박자 다리 모션을 보존하고 몸통 Y 진폭만 40% 줄였습니다.
Gallop 세 가지는 기존 V14 기반입니다.

원본 GLB 포함 legacy-v7.html은 수정하지 않았습니다.
7개 필수 선행 스크립트, V14 생성 코드 및 GLB 수치 검사를
horse-gaits-runtime.js로 순서대로 묶었습니다. 과거 모션은
실행 내부 의존성/QA 목적으로 보존하며 UI에서는 선택할 수 없습니다.

**테스트**: 통합 JS/인라인 HTML 스크립트 문법, 4개 사용자 버튼 및
모션 선택 코드를 정적 확인. 기존 V14 테스트 결과는 이 커밋의 재검증 결과가 아닙니다.

**미검증**: 이번 새 번들의 실제 WebGL 렌더링, 새 Walk의 실제 GLB
160프레임 스킨 검사, 발굽 접지, 보행 품질, 기존 앞다리 과신장 20개.
main 반영 금지.
