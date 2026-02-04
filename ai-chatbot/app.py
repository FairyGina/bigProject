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

from graph import compiled, make_initial_state

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

SYSTEM_PROMPT = (
    "당신은 레시피 생성 도우미입니다. "
    "사용자 입력 조건을 최우선으로 반영해 실용적이고 따라 하기 쉬운 레시피를 작성하세요. "
    "한국어로만 답변하세요. "
    "과장/추측은 피하고, 일반적인 조리법 기준으로 작성하세요."
)

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
    # Gradio Chatbot에 맞는 role/content 형식으로 변환
    return [{"role": msg.get("role"), "content": msg.get("content")} for msg in messages]


def apply_user_input(state: Dict[str, Any], user_input: str) -> Dict[str, Any]:
    # 사용자 입력을 상태에 반영(옵션 선택/텍스트 입력 분기)
    if user_input:
        state.setdefault("messages", []).append({
            "role": "user",
            "content": user_input,
        })
    options = state.get("options")
    if options:
        if user_input == "트렌드 반영 안 함":
            state["trend_enabled"] = False
            state["country"] = None
        else:
            state["trend_enabled"] = True
            state["country"] = user_input
        state["trend_selected"] = True
    else:
        if not state.get("base_done"):
            state["base_recipe"] = user_input or None
            state["base_done"] = True
        elif not state.get("constraints_done"):
            state["constraints"] = user_input or None
            state["constraints_done"] = True
    return state


def run_graph(state: Dict[str, Any]) -> Dict[str, Any]:
    # 조건부 엣지로 다음 단계까지만 진행
    return compiled.invoke(state)


def call_llm(prompt: str) -> str:
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return response.output_text


def extract_json_from_text(text: str) -> str:
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
    response = client.responses.create(
        model=MODEL_NAME,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    return response.output_text


def parse_json_array(text: str) -> List[str]:
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
    if not candidates:
        return []
    trend_text = trend_summary or "없음"
    prompt = f"""
    당신은 레시피 기획자입니다.
    아래 후보 재료 중에서 사용자 입력과 어울리는 재료만 0~2개 선택하세요.
    어울리는 재료가 없으면 빈 배열([])을 반환하세요.
    트렌드 요약을 참고해 후보 재료의 적합성을 판단하세요.

[메뉴/기존 레시피]
{base_recipe or "없음"}

[추가 조건/아이디어]
{constraints or "없음"}

[트렌드 요약]
{trend_text}

[후보 재료 목록]
{candidates}

출력:
- JSON 배열만 반환 (예: ["김치", "라면"] 또는 [])
"""
    selection_text = call_llm_with_system(
        "당신은 재료 후보를 선별하는 도우미입니다.",
        prompt.strip(),
    )
    selected = parse_json_array(selection_text)
    filtered = [item for item in selected if item in candidates]
    return filtered[:2]


def serpapi_search(query: str, country: str) -> List[Dict[str, Any]]:
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


def maybe_generate_recipe(state: Dict[str, Any]) -> Dict[str, Any]:
    prompt = state.get("prompt")
    if prompt and not state.get("recipe_generated"):
        trend_query_prompt = state.get("trend_query_prompt")
        trend_summary_prompt = state.get("trend_summary_prompt")
        country = state.get("country") or ""
        forecast_candidates = state.get("trend_forecast_items") or []
        base_recipe = state.get("base_recipe")
        constraints = state.get("constraints")
        trend_summary = ""
        if trend_query_prompt and trend_summary_prompt and SERPAPI_API_KEY:
            print("[trend] trend search enabled for country:", country)
            query_text = call_llm(trend_query_prompt)
            print("[trend] query_text:", query_text)
            queries = parse_json_array(query_text)
            print("[trend] parsed queries:", queries)
            if queries:
                results = serpapi_search(queries[0], country)
                print("[trend] results count:", len(results))
                if results:
                    trend_summary = summarize_trends(trend_summary_prompt, results)
                    log_trend(country, queries, results, trend_summary)
        else:
            print("[trend] trend search skipped", {
                "has_query_prompt": bool(trend_query_prompt),
                "has_summary_prompt": bool(trend_summary_prompt),
                "has_serp_key": bool(SERPAPI_API_KEY),
                "country": country,
            })
        final_prompt = prompt
        if trend_summary:
            final_prompt = (
                final_prompt
                + "\n\n[트렌드 요약 - 내부 참고용, 출력 금지]\n"
                + trend_summary
            )
        if forecast_candidates:
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
    return state


def init_chat():
    # 최초 진입 시 인트로 + 국가 선택 단계까지 자동 진행
    state = make_initial_state()
    state = run_graph(state)
    return state, messages_to_chatbot(state.get("messages", [])), gr.update(choices=state.get("options") or [], value=None)


def on_text_submit(user_input: str, state: Dict[str, Any]):
    # 텍스트 입력 시 다음 단계로 진행
    if user_input is None:
        user_input = ""
    state = apply_user_input(state, user_input)
    state = run_graph(state)
    state = maybe_generate_recipe(state)
    return (
        state,
        messages_to_chatbot(state.get("messages", [])),
        gr.update(choices=state.get("options") or [], value=None),
        "",
    )


def on_option_change(choice: str, state: Dict[str, Any]):
    # 옵션 선택 시 다음 단계로 진행(빈 선택은 무시)
    if not choice:
        return (
            state,
            messages_to_chatbot(state.get("messages", [])),
            gr.update(choices=state.get("options") or [], value=None),
            "",
        )
    return on_text_submit(choice, state)


def on_next_click(state: Dict[str, Any]):
    # 빈 입력으로 다음 단계만 진행
    return on_text_submit("", state)


with gr.Blocks() as demo:
    #gr.Markdown("## AI 레시피 생성 챗봇")
    gr.Markdown("원하시는 조건에 맞게, 혹은 랜덤으로 레시피를 생성할 수 있습니다.")

    chatbot = gr.Chatbot()
    textbox = gr.Textbox(label="메시지 입력")
    next_btn = gr.Button("다음")
    options = gr.Radio(choices=[], label="옵션 선택")

    state = gr.State(make_initial_state())

    demo.load(init_chat, None, [state, chatbot, options])
    textbox.submit(on_text_submit, [textbox, state], [state, chatbot, options, textbox])
    next_btn.click(on_next_click, [state], [state, chatbot, options, textbox])
    options.change(on_option_change, [options, state], [state, chatbot, options, textbox])

demo.queue()
demo.launch(
    server_name=os.getenv("GRADIO_SERVER_NAME", "0.0.0.0"),
    server_port=7860,
    css=CUSTOM_CSS,
)
