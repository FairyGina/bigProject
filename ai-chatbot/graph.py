# 파일 설명: 그래프 로직만 분리해 둔 LangGraph 구성 파일
import csv
import json
from pathlib import Path
from typing import Optional, List, TypedDict

from langgraph.graph import StateGraph, END

FORECAST_PATH = Path(__file__).resolve().parent / "forecast_3m_new.csv"
FORECAST_JSON_PATH = Path(__file__).resolve().parent / "forecast_top_2026_02.json"
FORECAST_PERIOD = "2026.02"
FORECAST_TOPN = 7
FORECAST_TOPN_PREPROCESS = 10
FORECAST_COUNTRIES = {"미국", "중국", "일본", "베트남", "독일"}
FORECAST_SELECTED_TOKEN = "__FORECAST_SELECTED__"


def _norm_period(value: str) -> str:
    raw = str(value).strip().replace("-", ".")
    if len(raw) == 6 and raw.isdigit():
        return f"{raw[:4]}.{raw[4:6]}"
    if len(raw) == 7 and raw[4] == ".":
        y, m = raw.split(".")
        return f"{y}.{m.zfill(2)}"
    return raw


def load_forecast_items(country_name: str) -> List[str]:
    if not country_name or country_name not in FORECAST_COUNTRIES:
        return []
    if FORECAST_JSON_PATH.exists():
        try:
            data = json.loads(FORECAST_JSON_PATH.read_text(encoding="utf-8"))
            items = data.get(country_name, [])
            return [str(x).strip() for x in items if str(x).strip()]
        except json.JSONDecodeError:
            pass
    if not FORECAST_PATH.exists():
        return []

    rows: List[dict] = []
    with FORECAST_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("country_name") != country_name:
                continue
            period = row.get("period") or row.get("dt") or ""
            if _norm_period(period) != FORECAST_PERIOD:
                continue
            try:
                yhat = float(row.get("yhat", "0"))
            except ValueError:
                continue
            if yhat <= 0:
                continue
            item_name = (row.get("item_name") or "").strip()
            if not item_name:
                continue
            rows.append({"item_name": item_name, "yhat": yhat})

    rows.sort(key=lambda r: r["yhat"], reverse=True)
    items: List[str] = []
    for r in rows:
        if r["item_name"] in items:
            continue
        items.append(r["item_name"])
        if len(items) >= FORECAST_TOPN_PREPROCESS:
            break
    return items


# LLM 기반 후보 선정은 app.py에서 수행한다.


class RecipeState(TypedDict):
    messages: List[str]  # AI 메시지
    options: Optional[List[str]]   # 버튼 후보들
    # user inputs
    trend_enabled: bool
    country: Optional[str]

    base_recipe: Optional[str]
    constraints: Optional[str]

    # outputs
    recipe: Optional[str]
    report: Optional[str]
    prompt: Optional[str]
    trend_query_prompt: Optional[str]
    trend_summary_prompt: Optional[str]
    trend_forecast_items: Optional[List[str]]
    trend_forecast_period: Optional[str]

    # control flags
    do_save: bool
    feedback: Optional[str]
    regenerate: bool
    recipe_generated: bool

    # step flags
    intro_done: bool
    trend_prompted: bool
    base_prompted: bool
    constraints_prompted: bool
    recipe_done: bool
    trend_selected: bool
    base_done: bool
    constraints_done: bool


# (1) 인트로 메시지를 최초 1회만 추가
def intro_node(state):
    if state.get("intro_done"):
        return state
    state["messages"].append({
        "role": "assistant",
        "content": "안녕하세요! 👋\n저는 레시피 생성 도우미 AI입니다.\n새로운 레시피 생성을 도와드릴게요 🍳\n\n"
    })
    state["intro_done"] = True
    return state


# (2) 트렌드 반영 여부 질문을 출력
def select_trend_node(state):
    if state.get("trend_prompted"):
        return state
    state["messages"].append({
        "role": "assistant",
        "content": (
            "국가의 최신 음식 트렌드를 반영할까요?\n"
            "아래에서 하나를 선택해주세요 👇\n"
            "(원하지 않으면 ‘트렌드 반영 안 함’ 선택)"
        )
    })

    state["options"] = [
        "한국", "일본", "중국", "미국", "독일", "베트남",
        "트렌드 반영 안 함"
    ]
    state["trend_prompted"] = True
    return state


# (3) 기존 레시피 입력 안내
def load_base_recipe_node(state):
    if state.get("base_prompted"):
        return state
    state["messages"].append({
        "role": "assistant",
        "content": (
            "기존 레시피를 불러오고 싶으신가요?\n"
            "있다면 레시피 이름이나 내용을 입력해주세요.\n"
            "없다면 Enter, 혹은 '다음' 버튼을 눌러주세요."
        )
    })
    state["options"] = None  # 텍스트 입력 모드
    state["base_prompted"] = True
    return state


# (4) 추가 조건 입력 안내
def collect_constraints_node(state):
    if state.get("constraints_prompted"):
        return state
    state["messages"].append({
        "role": "assistant",
        "content": (
            "레시피에 반영하고 싶은 조건이 있다면 적어주세요 ✍️\n\n"
            "예시:\n"
            "- 비건이었으면 좋겠다\n"
            "- 현지화가 잘 된 메뉴\n"
            "- 젊은 사람에게 인기 있는 메뉴\n\n"
            "없다면 Enter, 혹은 '다음' 버튼을 눌러주세요."
        )
    })
    state["constraints_prompted"] = True
    return state


# (5) 레시피 생성용 프롬프트 구성, 상태에 저장
def generate_recipe_node(state):
    if state.get("recipe_done"):
        return state
    trend_enabled = state.get("trend_enabled")
    country = state.get("country") or "없음"
    base_recipe = state.get("base_recipe") or "없음"
    constraints = state.get("constraints") or "없음"

    forecast_items = []
    if trend_enabled and country in FORECAST_COUNTRIES:
        forecast_items = load_forecast_items(country)
        state["trend_forecast_items"] = forecast_items
        state["trend_forecast_period"] = FORECAST_PERIOD
    else:
        state["trend_forecast_items"] = None
        state["trend_forecast_period"] = None

    forecast_block = ""
    if forecast_items:
        summary_items = ", ".join(forecast_items[:5])
        forecast_block = (
            f"[수출 수요예측 기반 후보 재료({FORECAST_PERIOD})]\n"
            f"- 국가: {country}\n"
            f"- top 품목(요약): {summary_items}\n"
            f"- 컨셉 반영 후보(최종 0~2개): {FORECAST_SELECTED_TOKEN}\n"
            "- 참고: 후보는 재료가 아니라 '컨셉/아이디어'로만 반영한다.\n"
        )

    prompt = f"""
    [입력 요약]
    - 트렌드 반영: {trend_enabled}
    - 트렌드 국가: {country}
    - 기존 레시피: {base_recipe}
    - 추가 기획/아이디어: {constraints}

    [레시피 생성 규칙]
    - 기존 레시피가 있으면: 입력 레시피를 기반으로 고도화/개선한 버전을 작성한다.
    - 기존 레시피가 없으면: 새로운 레시피를 랜덤 생성한다. 
    - 추가 기획/아이디어가 있으면: 반드시 반영한다.
    - 추가 기획/아이디어가 없으면: 기본적인 레시피로 작성한다.
    - 메뉴명이 있을 때: 메뉴 타입/조리 방식/핵심 재료를 우선 정의한다.
    - 한국에서 해외를 대상으로 수출하는 메뉴임을 고려하여 레시피를 생성한다.
    - 한국의 식문화를 참고하면서, 해외 현지 재료 및 트렌드를 고려하여 레시피를 생성한다.
    - 현지 수요/트렌드와 충돌하면 현지 적합성을 우선한다.
    - 수요예측 결과는 '재료'가 아닌 컨셉에만 반영, '설명/소개'에만 반영한다.

    [수출 수요예측 참고]
    {forecast_block}
    
    [요리 상식 규칙]
    - 조미료만으로 구성된 레시피는 생성하지 않는다.
    - 명확한 맛의 방향(짠맛, 단맛, 감칠맛 등)을 유지한다.
    - 근거 없는 충돌 조합은 피한다.
    - 강한 산성 재료와 유제품은 고온 조리하지 않는다.
    - 메뉴 정체성을 깨는 조합은 피한다.
    - 조미는 단계적으로 추가한다.
    - 조리 순서와 과정은 물리적으로 가능해야 한다.
    - 하나의 명확한 요리 문화(한식, 양식, 일식, 중식 등)를 기준으로 한다.
    - 이질적인 재료끼리 섞지 않는다.
    - 최종 검증: 정체성/조합/조리 순서를 점검한다.

    [맛의 상호작용 규칙]
    - 기본 맛(단맛, 신맛, 쓴맛, 짠맛, 감칠맛)은 독립적으로 더해지지 않으며,
      일정 조건에서 강화되거나 억제된다는 점을 고려한다.
    - 강한 단맛과 강한 매운맛(통각 자극)은 동시에 주된 맛이 될 수 없다.
    - 디저트 또는 당류 기반 음식에서 매운맛/쓴맛/자극적인 신맛은
      명확한 문화적·조리적 근거 없이는 사용하지 않는다.
    - 하나의 요리에는 ‘지배적인 기본 맛(Base taste)’이 하나만 존재해야 한다.
    - 고강도 맛 조합은 상호 억제를 일으키므로 강한 맛+강한 맛 조합을 피한다.
      강한 맛 + 약한 보조 맛만 허용한다.
    - 맛의 충돌이 발생한다고 판단되면 충돌을 일으키는 재료는 제외한다.
    - 일반적인 식문화에서 반복적으로 사용되지 않는 조합은
      전통/실험적 요리/퓨전 맥락 등의 이유를 명시한다.
    - 위 조건을 만족하지 못하면 맛의 정합성이 부족하다고 판단하고 재생성한다.

    [출력 형식]
    반드시 아래 JSON 스키마로만 출력한다. 설명 문장/마크다운/코드펜스 금지.

    {{
    "title": "레시피 이름",
    "description": "레시피 소개(2~3문장)",
    "ingredients": ["재료1", "재료2", "..."],
    "steps": ["1단계", "2단계", "..."],
    "targetCountry": "{country}",
    "draft": false
    }}

"""

    state["prompt"] = prompt.strip()
    state["recipe"] = None
    state["options"] = ["레시피 다시 생성", "저장"]
    state["recipe_done"] = True
    return state


# 트렌드 선택 완료 여부 체크
def has_trend_selected(state: RecipeState) -> bool:
    return bool(state.get("trend_selected"))


# 기존 레시피 입력 완료 여부 체크
def has_base_done(state: RecipeState) -> bool:
    return bool(state.get("base_done"))


# 조건 입력 완료 여부 체크
def has_constraints_done(state: RecipeState) -> bool:
    return bool(state.get("constraints_done"))


graph = StateGraph(dict)

graph.add_node("intro", intro_node)
graph.add_node("select_trend", select_trend_node)
graph.add_node("load_base_recipe", load_base_recipe_node)
graph.add_node("collect_constraints", collect_constraints_node)
graph.add_node("generate_recipe", generate_recipe_node)

graph.set_entry_point("intro")

graph.add_edge("intro", "select_trend")
graph.add_conditional_edges("select_trend", has_trend_selected, {
    True: "load_base_recipe",
    False: END,
})
graph.add_conditional_edges("load_base_recipe", has_base_done, {
    True: "collect_constraints",
    False: END,
})
graph.add_conditional_edges("collect_constraints", has_constraints_done, {
    True: "generate_recipe",
    False: END,
})
graph.add_edge("generate_recipe", END)

compiled = graph.compile()


# 초기 상태 생성
def make_initial_state():
    return {
        "messages": [],
        "options": None,

        "trend_enabled": False,
        "country": None,
        "base_recipe": None,
        "constraints": None,
        "recipe": None,
        "report": None,
        "prompt": None,
        "trend_query_prompt": None,
        "trend_summary_prompt": None,
        "trend_forecast_items": None,
        "trend_forecast_period": None,
        "feedback": None,
        "regenerate": False,
        "recipe_generated": False,

        "intro_done": False,
        "trend_prompted": False,
        "base_prompted": False,
        "constraints_prompted": False,
        "recipe_done": False,
        "trend_selected": False,
        "base_done": False,
        "constraints_done": False,
    }
