# 파일 설명: Gradio UI에서 LangGraph(graph.py)를 호출해 단계형 레시피 챗봇을 실행한다.
#             사용자 입력/옵션을 상태에 반영하고, 각 단계 메시지를 Chatbot에 렌더링한다.
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import List, Dict, Any

import gradio as gr
import requests
from openai import OpenAI

from graph import compiled, make_initial_state, FORECAST_COUNTRIES
<<<<<<< HEAD
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
=======
>>>>>>> upstream/UI5

CUSTOM_CSS = """
/* Minimal UI polish */
body, .gradio-container {
  font-family: "Pretendard", "Noto Sans KR", system-ui, -apple-system, sans-serif;
  font-size: 15px;
}
.chatbot {
  min-height: 60vh;
}
.chatbot .message {
  font-size: 15px;
  line-height: 1.6;
}
.chatbot textarea {
  font-size: 15px;
  line-height: 1.5;
  min-height: 90px;
}
button, .primary {
  font-size: 14px !important;
  border-radius: 10px !important;
}
"""


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL_NAME = "gpt-4.1-mini"
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
<<<<<<< HEAD
=======
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")

REGEN_OPTION = "레시피 다시 생성"
SAVE_OPTION = "저장"
SAVE_DONE_OPTION = "저장(완료)"
SAVE_PUBLIC_OPTION = "공개 저장"
SAVE_PRIVATE_OPTION = "비공개 저장"
>>>>>>> upstream/UI5

SYSTEM_PROMPT = (
    "당신은 레시피 생성 도우미입니다. "
    "사용자 입력 조건을 최우선으로 반영해 실용적이고 따라 하기 쉬운 레시피를 작성하세요. "
    "한국어로만 답변하세요. "
    "과장/추측은 피하고, 일반적인 조리법 기준으로 작성하세요."
)

TREND_SUMMARY_PROMPT = """
당신은 검색 결과를 요약해 트렌드 인사이트를 뽑는 분석가입니다.
신메뉴 개발 아이디어로 바로 활용할 수 있도록 요약하세요.
출처와 날짜(가능하면 2025~2026)를 간단히 유지하세요.

[검색 결과]
{search_results}

요구사항:
- 핵심 트렌드 키워드 5~8개
- 각 키워드마다 1줄 요약 (신메뉴 아이디어로 연결되게)
- 가능하면 근거 출처/날짜 포함 (2025~2026 우선)
- 한국어로 작성
- 출력 형식은 JSON

출력 JSON 스키마:
{
  "country": "...",
  "keywords": [
    {"term": "...", "summary": "...", "source": "...", "date": "..."}
  ]
}
"""
COUNTRY_LOCALE = {
    "한국": ("ko", "kr"),
    "일본": ("ja", "jp"),
    "중국": ("zh-cn", "cn"),
    "대만": ("zh-tw", "tw"),
    "베트남": ("vi", "vn"),
    "미국": ("en", "us"),
    "독일": ("de", "de"),
}


def messages_to_chatbot(messages: List[Dict[str, Any]]):
    # 메시지 리스트를 Gradio Chatbot에 맞는 role/content 형식으로 변환
    # Gradio Chatbot에 맞는 role/content 형식으로 변환
    return [{"role": msg.get("role"), "content": msg.get("content")} for msg in messages]

def should_disable_textbox(state: Dict[str, Any]) -> bool:
    # 옵션 선택 단계에서는 텍스트 입력 비활성화
    options = state.get("options") or []
    return bool(options)


def build_trend_query_prompt(country: str) -> str:
    # SerpAPI 검색 쿼리 생성을 위한 트렌드 프롬프트 구성
    return f"""
당신은 식품/외식 트렌드 리서치 전문가입니다.
국가: {country}

<<<<<<< HEAD
조건:
- 2025~2026 트렌드 중심 (가능하면 최신 연도 명시)
- 요리/레시피/외식 트렌드 모두 포함
- 신메뉴 개발 아이디어에 바로 활용 가능한 키워드/콘셉트 중심
- 검색 엔진에서 잘 먹히는 키워드 조합
- 한국어/영어 혼합 가능(필요 시 현지 언어도 포함)

출력:
- 쿼리 4개를 JSON 배열로만 반환
=======
  목표:
  - 2025~2026 트렌드 기반의 실전형 검색 쿼리 4개 생성

  작성 규칙:
  - 요리/레시피/외식 트렌드 모두 포함
  - 검색 엔진에 잘 맞는 짧고 명확한 키워드 조합
  - 한국어/영어 혼합 가능(필요 시 현지 언어 포함)
  - 건강/비건 일반론으로 쏠리지 않게 축 분산
  - AI/데이터/기술 중심 키워드는 제외

  출력:
- 쿼리 4개를 JSON 배열로만 반환
- 아래 4가지 축을 반드시 각각 반영해 분산된 쿼리를 만들 것:
  1) 메뉴 개발/푸드서비스 트렌드
  2) 맛/텍스처/형태 트렌드
  3) 카테고리(음료/디저트/스낵) 트렌드
  4) 리포트/전망/산업 트렌드
>>>>>>> upstream/UI5
"""

def apply_user_input(state: Dict[str, Any], user_input: str) -> Dict[str, Any]:
    # 사용자 입력을 상태에 반영(옵션 선택/텍스트 입력 분기)
    if user_input:
        state.setdefault("messages", []).append({
            "role": "user",
            "content": user_input,
        })
    options = state.get("options")
    if options:
<<<<<<< HEAD
=======
        if state.get("await_save_visibility"): #저장 시 공개 비공개 여부
            if user_input == SAVE_PUBLIC_OPTION:
                state["save_open_yn"] = "Y"
                state["do_save"] = True
                state["await_save_visibility"] = False
                state["options"] = None
                return state
            if user_input == SAVE_PRIVATE_OPTION:
                state["save_open_yn"] = "N"
                state["do_save"] = True
                state["await_save_visibility"] = False
                state["options"] = None
                return state
            return state
>>>>>>> upstream/UI5
        if user_input == "트렌드 반영 안 함":
            state["trend_enabled"] = False
            state["country"] = None
        # 재생성 요청: 수정사항 입력 모드로 전환
<<<<<<< HEAD
        elif user_input == "레시피 다시 생성":
            state["regenerate"] = True
            state["await_revision"] = True
=======
        elif user_input == REGEN_OPTION:
            state["regenerate"] = True
            state["await_revision"] = True
            state["save_disabled"] = False
            state["saved_recipe_id"] = None
>>>>>>> upstream/UI5
            state["options"] = None
            state.setdefault("messages", []).append({
                "role": "assistant",
                "content": "수정하고 싶은 내용을 입력해주세요.",
            })
            return state
<<<<<<< HEAD
=======
        elif user_input == SAVE_OPTION or user_input == SAVE_DONE_OPTION: #방금 저장했는데 또 저장하려고 할때
            if state.get("save_disabled"):
                state.setdefault("messages", []).append({
                    "role": "assistant",
                    "content": "이미 저장된 레시피입니다.",
                })
                return state
            state["await_save_visibility"] = True
            state["options"] = [SAVE_PUBLIC_OPTION, SAVE_PRIVATE_OPTION]
            state.setdefault("messages", []).append({
                "role": "assistant",
                "content": "공개 여부를 선택해주세요.",
            })
            return state
>>>>>>> upstream/UI5
        else:
            state["trend_enabled"] = True
            state["country"] = user_input
        state["trend_selected"] = True
    else:
        # 재생성 단계에서 수정사항 입력 처리
        if state.get("await_revision"):
            state["revision_request"] = user_input or ""
            state["await_revision"] = False
            state["recipe_generated"] = False
            return state
        if not state.get("base_done"):
            state["base_recipe"] = user_input or None
            state["base_done"] = True
        elif not state.get("constraints_done"):
            state["constraints"] = user_input or None
            state["constraints_done"] = True
    return state


def run_graph(state: Dict[str, Any]) -> Dict[str, Any]:
    # LangGraph 흐름 실행
    # 조건부 엣지로 다음 단계까지만 진행
    return compiled.invoke(state)


def call_llm(prompt: str) -> str:
    # 기본 시스템 프롬프트로 LLM 호출
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return response.output_text


def build_revision_prompt(recipe_json: str, revision_request: str) -> str:
    # 기존 레시피(JSON)을 수정사항에 맞게 재작성하도록 프롬프트 구성
    return f"""
아래 레시피 JSON을 사용자의 수정사항에 맞게 수정하세요.
출력은 반드시 동일한 JSON 스키마만 반환합니다(설명/마크다운/코드펜스 금지).

[기존 레시피 JSON]
{recipe_json}

[수정사항]
{revision_request}
"""


def extract_json_from_text(text: str) -> str:
    # 응답 텍스트에서 JSON 객체 문자열만 추출
    if not text:
        return ""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start:end + 1]
    return ""


def render_recipe_text(payload: Dict[str, Any]) -> str:
    # JSON 레시피 데이터를 사람이 보기 좋은 문자열로 변환
    title = payload.get("title") or ""
    description = payload.get("description") or ""
    ingredients = payload.get("ingredients") or []
    steps = payload.get("steps") or []

    lines = []
    if title:
        lines.append(f"레시피 이름: {title}")
        lines.append("")
    if ingredients:
        lines.append("재료(2~3인분 기준):")
        for item in ingredients:
            lines.append(f"- {item}")
        lines.append("")
    if steps:
        lines.append("조리 순서:")
        for idx, step in enumerate(steps, start=1):
            lines.append(f"{idx}) {step}")
        lines.append("")
    if description:
        lines.append("레시피 소개:")
        lines.append(description)
    return "\n".join(lines).strip()


def call_llm_with_system(system_prompt: str, prompt: str) -> str:
    # 시스템 프롬프트를 외부에서 지정해 LLM 호출
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    return response.output_text


<<<<<<< HEAD
=======
def _normalize_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        if "\n" in raw:
            return [v.strip() for v in raw.split("\n") if v.strip()]
        return [v.strip() for v in raw.split(",") if v.strip()]
    return [str(value).strip()] if str(value).strip() else []


def _extract_recipe_payload(state: Dict[str, Any]) -> Dict[str, Any] | None:
    recipe_text = state.get("recipe") or ""
    if not recipe_text:
        return None
    recipe_json = extract_json_from_text(recipe_text)
    if not recipe_json:
        recipe_json = recipe_text.strip()
    try:
        payload = json.loads(recipe_json)
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def _build_save_payload(payload: Dict[str, Any], open_yn: str) -> Dict[str, Any]:
    return {
        "title": (payload.get("title") or "").strip(),
        "description": (payload.get("description") or "").strip(),
        "ingredients": _normalize_list(payload.get("ingredients")),
        "steps": _normalize_list(payload.get("steps")),
        "imageBase64": payload.get("imageBase64") or "",
        "targetCountry": (payload.get("targetCountry") or "").strip(),
        "openYn": open_yn,
        "draft": bool(payload.get("draft", False)),
        "regenerateReport": False,
        "reportSections": [],
    }


def _build_backend_session(request: gr.Request | None) -> requests.Session:
    session = requests.Session()
    if request is None:
        return session
    headers = {}
    try:
        req_headers = request.headers or {}
        auth = req_headers.get("authorization") or req_headers.get("Authorization")
        if auth:
            headers["Authorization"] = auth
        cookie_header = req_headers.get("cookie") or req_headers.get("Cookie")
        if cookie_header:
            headers["Cookie"] = cookie_header
        if headers:
            session.headers.update(headers)
    except Exception:
        pass
    try:
        if getattr(request, "cookies", None):
            session.cookies.update(request.cookies)
    except Exception:
        pass
    return session


def _fetch_csrf(session: requests.Session) -> Dict[str, str] | None:
    try:
        resp = session.get(f"{API_BASE_URL}/api/csrf", timeout=10)
        if not resp.ok:
            return None
        data = resp.json()
        if not isinstance(data, dict):
            return None
        if "headerName" in data and "token" in data:
            return {"headerName": data["headerName"], "token": data["token"]}
    except Exception:
        return None
    return None


def save_recipe_to_backend(state: Dict[str, Any], request: gr.Request | None) -> Dict[str, Any]:
    payload = _extract_recipe_payload(state)
    if not payload:
        state.setdefault("messages", []).append({
            "role": "assistant",
            "content": "레시피 내용을 JSON으로 파싱하지 못했습니다. 다시 생성 후 저장해주세요.",
        })
        state["options"] = [REGEN_OPTION, SAVE_OPTION]
        return state
    open_yn = state.get("save_open_yn") or "N"
    save_payload = _build_save_payload(payload, open_yn)
    session = _build_backend_session(request)
    headers = {"Content-Type": "application/json"}
    csrf = _fetch_csrf(session)
    if csrf:
        headers[csrf["headerName"]] = csrf["token"]
    try:
        resp = session.post(
            f"{API_BASE_URL}/api/recipes",
            json=save_payload,
            headers=headers,
            timeout=20,
        )
        if resp.ok:
            data = resp.json() if resp.headers.get("Content-Type", "").startswith("application/json") else {}
            state["saved_recipe_id"] = data.get("id")
            state["save_disabled"] = True
            state.setdefault("messages", []).append({
                "role": "assistant",
                "content": "저장이 완료되었습니다.",
            })
        else:
            state.setdefault("messages", []).append({
                "role": "assistant",
                "content": f"저장에 실패했습니다. (HTTP {resp.status_code})",
            })
    except Exception as e:
        state.setdefault("messages", []).append({
            "role": "assistant",
            "content": f"저장 중 오류가 발생했습니다: {e}",
        })
    state["options"] = [REGEN_OPTION, SAVE_DONE_OPTION if state.get("save_disabled") else SAVE_OPTION]
    return state


>>>>>>> upstream/UI5
def parse_json_array(text: str) -> List[str]:
    # JSON 배열 문자열을 리스트로 파싱
    if not text:
        return []
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            return [str(x).strip() for x in data if str(x).strip()]
    except Exception:
        pass
    return []


def select_forecast_items_llm(
    candidates: List[str],
    base_recipe: str | None,
    constraints: str | None,
    trend_summary: str | None,
) -> List[str]:
    # 수요예측 후보(컨셉) 중 0~2개 선택하도록 LLM에 요청
    if not candidates:
        return []
    trend_text = trend_summary or "없음"
    prompt = f"""
    당신은 레시피 기획자입니다.
    아래 후보는 '재료'가 아니라 '메뉴 컨셉/아이디어' 용도입니다.
    사용자 입력과 어울리는 컨셉만 0~2개 선택하세요.
    어울리는 컨셉이 없으면 빈 배열([])을 반환하세요.
    트렌드 요약을 참고해 컨셉 적합성을 판단하세요.
    적합하지 않으면 빈 배열([])을 반환하세요.

[메뉴/기존 레시피]
{base_recipe or "없음"}

[추가 조건/아이디어]
{constraints or "없음"}

[트렌드 요약]
{trend_text}

[후보 컨셉 목록]
{candidates}

출력:
- JSON 배열만 반환 (예: ["...", "..."])
"""
    selection_text = call_llm_with_system(
        "당신은 메뉴 컨셉 후보를 선별하는 도우미입니다.",
        prompt.strip(),
    )
    selected = parse_json_array(selection_text)
    filtered = [item for item in selected if item in candidates]
    return filtered[:2]


def serpapi_search(query: str, country: str) -> List[Dict[str, Any]]:
    # SerpAPI로 검색 결과 상위 3개 수집
    if not SERPAPI_API_KEY:
        print("[trend] SERPAPI_API_KEY not set")
        return []
    hl, gl = COUNTRY_LOCALE.get(country, ("en", "us"))
    params = {
        "engine": "google",
        "q": query,
        "hl": hl,
        "gl": gl,
        "num": 3,
        "api_key": SERPAPI_API_KEY,
    }
    print(f"[trend] serpapi query='{query}' hl={hl} gl={gl}")
    resp = requests.get("https://serpapi.com/search.json", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    organic = data.get("organic_results", [])
    results = []
    for item in organic[:3]:
        results.append({
            "title": item.get("title"),
            "link": item.get("link"),
            "snippet": item.get("snippet"),
            "date": item.get("date"),
        })
    return results


def summarize_trends(prompt_template: str, search_results: List[Dict[str, Any]]) -> str:
    # 검색 결과를 요약하는 LLM 호출
    payload = json.dumps(search_results, ensure_ascii=False, indent=2)
    prompt = prompt_template.replace("{search_results}", payload)
    print("[trend] summarize_trends input size:", len(payload))
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": "당신은 검색 결과를 요약하는 분석가입니다."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.output_text


def log_trend(country: str, queries: List[str], results: List[Dict[str, Any]], summary: str) -> None:
    # 트렌드 검색/요약 로그를 파일로 저장
    os.makedirs("logs", exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join("logs", f"trend_{country}_{stamp}.json")
    payload = {
        "country": country,
        "queries": queries,
        "results": results,
        "summary": summary,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("[trend] log saved:", path)


def try_generate_recipe(state: Dict[str, Any]) -> Dict[str, Any]:
    # graph.py에서 만든 state["prompt"]를 기반으로 레시피 생성
    prompt = state.get("prompt")
    
    # 재생성 모드: 기존 레시피(JSON) + 수정사항으로 재작성
    if state.get("regenerate") and state.get("revision_request"):
        # 0) 재생성: 기존 레시피(JSON) + 수정사항으로 재작성
        recipe_json = state.get("recipe") or "{}"
        revision_prompt = build_revision_prompt(recipe_json, state.get("revision_request") or "")
        recipe_text = call_llm(revision_prompt)
        recipe_json_text = extract_json_from_text(recipe_text)
        recipe_payload: Dict[str, Any] = {}
        if recipe_json_text:
            try:
                recipe_payload = json.loads(recipe_json_text)
            except json.JSONDecodeError:
                recipe_payload = {}
        if recipe_payload:
            rendered = render_recipe_text(recipe_payload)
            state["recipe"] = recipe_json_text
            state["messages"].append({
                "role": "assistant",
                "content": rendered
            })
        else:
            state["recipe"] = recipe_text
            state["messages"].append({
                "role": "assistant",
                "content": recipe_text
            })
        state["recipe_generated"] = True
        state["regenerate"] = False
        state["revision_request"] = ""
<<<<<<< HEAD
        state["options"] = ["레시피 다시 생성", "저장"]
=======
        state["options"] = [REGEN_OPTION, SAVE_OPTION]
>>>>>>> upstream/UI5
        return state
    
    if prompt and not state.get("recipe_generated"):
        # 1) 트렌드 요약 생성 (SerpAPI 사용 시)
        country = state.get("country") or ""
        trend_enabled = bool(state.get("trend_enabled"))
        forecast_candidates = state.get("trend_forecast_items") or []
        base_recipe = state.get("base_recipe")
        constraints = state.get("constraints")
        trend_summary = ""
        trend_country_enabled = country == "한국" or country in FORECAST_COUNTRIES
        if trend_enabled and trend_country_enabled and SERPAPI_API_KEY:
            print("[trend] trend search enabled for country:", country)
            query_text = call_llm(build_trend_query_prompt(country))
            print("[trend] query_text:", query_text)
            queries = parse_json_array(query_text)
<<<<<<< HEAD
            print("[trend] parsed queries:", queries)
            if queries:
                results = serpapi_search(queries[0], country)
                print("[trend] results count:", len(results))
                if results:
                    trend_summary = summarize_trends(TREND_SUMMARY_PROMPT, results)
=======
            print("[trend] parsed queries count:", len(queries))
            print("[trend] parsed queries:", queries)
            if queries:
                selected_query = queries[0]
                print("[trend] selected query:", selected_query)
                results = serpapi_search(selected_query, country)
                print("[trend] results count:", len(results))
                for idx, item in enumerate(results, start=1):
                    print(
                        f"[trend] result {idx}:",
                        {
                            "title": item.get("title"),
                            "date": item.get("date"),
                            "link": item.get("link"),
                        },
                    )
                if results:
                    trend_summary = summarize_trends(TREND_SUMMARY_PROMPT, results)
                    print("[trend] summary size:", len(trend_summary or ""))
>>>>>>> upstream/UI5
                    log_trend(country, queries, results, trend_summary)
        else:
            print("[trend] trend search skipped", {
                "trend_enabled": trend_enabled,
                "trend_country_enabled": trend_country_enabled,
                "has_serp_key": bool(SERPAPI_API_KEY),
                "country": country,
            })
        # 2) 최종 프롬프트 조합 (트렌드/컨셉 반영)
        final_prompt = prompt
        if trend_summary:
            final_prompt = (
                final_prompt
                + trend_summary
            )
        if forecast_candidates:
            # 3) 수요예측 컨셉 후보 0~2개 선정
            selected_items = select_forecast_items_llm(
                forecast_candidates,
                base_recipe,
                constraints,
                trend_summary,
            )
            selected_text = ", ".join(selected_items) if selected_items else "없음"
            print("[forecast] selected items:", selected_items)
            final_prompt = final_prompt.replace("__FORECAST_SELECTED__", selected_text)
        else:
            final_prompt = final_prompt.replace("__FORECAST_SELECTED__", "없음")
        # 4) 레시피 생성 + JSON 파싱/렌더링
        recipe_text = call_llm(final_prompt)
        recipe_json_text = extract_json_from_text(recipe_text)
        recipe_payload: Dict[str, Any] = {}
        if recipe_json_text:
            try:
                recipe_payload = json.loads(recipe_json_text)
            except json.JSONDecodeError:
                recipe_payload = {}

        if recipe_payload:
            rendered = render_recipe_text(recipe_payload)
            state["recipe"] = recipe_json_text
            state["messages"].append({
                "role": "assistant",
                "content": rendered
            })
        else:
            state["recipe"] = recipe_text
            state["messages"].append({
                "role": "assistant",
                "content": recipe_text
            })
        state["recipe_generated"] = True
<<<<<<< HEAD
=======
        state["save_disabled"] = False
>>>>>>> upstream/UI5
    return state


def init_chat():
    # 최초 진입 시 인트로 + 국가 선택 단계까지 자동 진행
    state = make_initial_state()
    state = run_graph(state)
    return (
        state,
        messages_to_chatbot(state.get("messages", [])),
        gr.update(choices=state.get("options") or [], value=None),
        gr.update(value="", interactive=not should_disable_textbox(state)),
    )


<<<<<<< HEAD
def on_text_submit(user_input: str, state: Dict[str, Any]):
=======
def on_text_submit(user_input: str, state: Dict[str, Any], request: gr.Request | None = None):
>>>>>>> upstream/UI5
    # 텍스트 입력 시 다음 단계로 진행
    if user_input is None:
        user_input = ""
    state = apply_user_input(state, user_input)
<<<<<<< HEAD
    # 재생성 수정 입력 중에는 그래프 진행을 멈춘다
    if not state.get("await_revision"):
=======
    if state.get("do_save"):
        state["do_save"] = False
        state = save_recipe_to_backend(state, request)
        disable_input = should_disable_textbox(state)
        return (
            state,
            messages_to_chatbot(state.get("messages", [])),
            gr.update(choices=state.get("options") or [], value=None),
            gr.update(value="", interactive=not disable_input),
        )
    # 재생성 수정 입력 중에는 그래프 진행을 멈춘다
    if not state.get("await_revision") and not state.get("await_save_visibility"):
>>>>>>> upstream/UI5
        state = run_graph(state)
    state = try_generate_recipe(state)
    disable_input = should_disable_textbox(state)
    return (
        state,
        messages_to_chatbot(state.get("messages", [])),
        gr.update(choices=state.get("options") or [], value=None),
        gr.update(value="", interactive=not disable_input),
    )


<<<<<<< HEAD
def on_option_change(choice: str, state: Dict[str, Any]):
=======
def on_option_change(choice: str, state: Dict[str, Any], request: gr.Request | None = None):
>>>>>>> upstream/UI5
    # 옵션 선택 시 다음 단계로 진행(빈 선택은 무시)
    if not choice:
        return (
            state,
            messages_to_chatbot(state.get("messages", [])),
            gr.update(choices=state.get("options") or [], value=None),
            gr.update(value="", interactive=not should_disable_textbox(state)),
        )
<<<<<<< HEAD
    return on_text_submit(choice, state)


def on_next_click(state: Dict[str, Any]):
    # 빈 입력으로 다음 단계만 진행
    return on_text_submit("", state)
=======
    return on_text_submit(choice, state, request)
>>>>>>> upstream/UI5


with gr.Blocks() as demo:
    #gr.Markdown("## AI 레시피 생성 챗봇")
    gr.Markdown("원하시는 조건에 맞게, 혹은 랜덤으로 레시피를 생성할 수 있습니다.")

    chatbot = gr.Chatbot()
    textbox = gr.Textbox(label="메시지 입력")
<<<<<<< HEAD
    next_btn = gr.Button("다음")
=======
>>>>>>> upstream/UI5
    options = gr.Radio(choices=[], label="옵션 선택")

    state = gr.State(make_initial_state())

    demo.load(init_chat, None, [state, chatbot, options, textbox])
    textbox.submit(on_text_submit, [textbox, state], [state, chatbot, options, textbox])
<<<<<<< HEAD
    next_btn.click(on_next_click, [state], [state, chatbot, options, textbox])
    options.change(on_option_change, [options, state], [state, chatbot, options, textbox])

demo.queue()
# FastAPI 앱 생성 및 Iframe 허용 설정
app = FastAPI()

# Iframe 허용을 위한 미들웨어 (X-Frame-Options 제거 및 CSP 설정)
class IframeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # X-Frame-Options 헤더 제거 (iframe 허용)
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        # CSP 헤더 설정 (모든 도메인 허용)
        response.headers["Content-Security-Policy"] = "frame-ancestors *"
        return response

app.add_middleware(IframeMiddleware)

# Gradio 앱을 FastAPI에 마운트
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
=======
    options.change(on_option_change, [options, state], [state, chatbot, options, textbox])

demo.queue()
demo.launch(
    server_name=os.getenv("GRADIO_SERVER_NAME", "0.0.0.0"),
    server_port=7860,
    css=CUSTOM_CSS,
)
>>>>>>> upstream/UI5
