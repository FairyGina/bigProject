# helper_graph.py
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple, TypedDict

from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

load_dotenv()  # Load .env for local development

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


KB_PATH = Path(__file__).resolve().parent / "kb" / "flow.md"


class HelperState(TypedDict, total=False):
    history: List[Tuple[str | None, str | None]]  # Gradio Chatbot: list of (user, bot)
    intro_done: bool
    user_input: str | None
    kb_text: str
    kb_sections: List[Dict[str, Any]]


def _tokenize(text: str) -> List[str]:
    # 한글/영문/숫자 토큰만 뽑기
    return re.findall(r"[A-Za-z0-9가-힣]+", (text or "").lower())


def _load_kb_text() -> str:
    if KB_PATH.exists():
        return KB_PATH.read_text(encoding="utf-8")
    return ""


def _split_kb_sections(md: str) -> List[Dict[str, Any]]:
    """
    ## 헤더 기준으로 섹션 나눔
    섹션: {title, body, tokens}
    """
    md = md or ""
    lines = md.splitlines()

    sections: List[Dict[str, Any]] = []
    cur_title = "KB"
    cur_body: List[str] = []

    def flush():
        nonlocal cur_title, cur_body
        body = "\n".join(cur_body).strip()
        if body:
            tokens = set(_tokenize(cur_title + "\n" + body))
            sections.append({"title": cur_title.strip(), "body": body, "tokens": tokens})
        cur_body = []

    for ln in lines:
        if ln.strip().startswith("## "):
            flush()
            cur_title = ln.strip()[3:].strip()
        else:
            cur_body.append(ln)
    flush()
    return sections


def retrieve_kb(md_sections: List[Dict[str, Any]], question: str, top_k: int = 3) -> List[Dict[str, Any]]:
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        return []

    scored = []
    for sec in md_sections:
        overlap = len(q_tokens & sec.get("tokens", set()))
        if overlap <= 0:
            continue
        # 제목 매칭 가중치
        title_tokens = set(_tokenize(sec.get("title", "")))
        overlap_title = len(q_tokens & title_tokens)
        score = overlap + overlap_title * 2
        scored.append((score, sec))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scored[:top_k]]


def _build_context(hits: List[Dict[str, Any]]) -> str:
    blocks = []
    for h in hits:
        blocks.append(f"[{h['title']}]\n{h['body']}".strip())
    return "\n\n---\n\n".join(blocks).strip()


def build_kb_only_answer(question: str, hits: List[Dict[str, Any]]) -> str:
    if not hits:
        return "KB에서 해당 내용을 찾지 못했어요. 어느 화면에서 보고 계신지 알려주실 수 있나요?"

    sec = hits[0]
    title = (sec.get("title") or "").strip()
    body = (sec.get("body") or "").strip()
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]

    picked: List[str] = []
    for prefix in ("메뉴 경로:", "진입 경로:", "상단 제목:", "화면 설명:"):
        for ln in lines:
            if ln.startswith(prefix):
                picked.append(ln)
                break

    if not picked and lines:
        picked = lines[:3]

    header = title or "관련 화면"
    answer = header
    if picked:
        answer += "\n" + "\n".join(picked)
    if title:
        answer += f"\n(KB: {title})"
    return answer.strip()


import sys
import traceback

# 로거 설정 대신 sys.stderr.write 사용 (Docker 로그 강제 출력) + 파일 로그 추가
def log_stderr(msg: str):
    # 1. stderr 출력
    sys.stderr.write(f"[HelperBot] {msg}\n")
    sys.stderr.flush()
    
    # 2. 파일 출력 (확실한 디버깅용)
    try:
        with open("/app/debug.log", "a", encoding="utf-8") as f:
            f.write(f"[HelperBot] {msg}\n")
    except Exception:
        pass  # 파일 쓰기 실패는 무시

def answer_with_llm(question: str, context: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # 디버깅: API Key 및 Model 확인 (필수)
    if api_key:
        log_stderr(f"API Key found (starts with: {api_key[:8]}..., len={len(api_key)})")
    else:
        log_stderr("CRITICAL: OPENAI_API_KEY is EMPTY!")
        
    log_stderr(f"Using Model: {model}")

    if not api_key or OpenAI is None:
        if context:
            return (
                "현재 OPENAI_API_KEY가 설정되지 않아 KB 기반으로만 안내합니다.\n\n"
                + context
            ).strip()
        return "OPENAI_API_KEY가 없어 답변을 생성할 수 없습니다. (환경변수 확인 필요)"

    client = OpenAI(api_key=api_key)

    system = (
        "너는 '홈페이지 FAQ / 사용방법 도우미' 챗봇이다.\n"
        "- 사용자는 웹사이트를 이용 중이며, 메뉴 경로(좌측 메뉴)를 기준으로 안내한다.\n"
        "- 답변은 한국어로, 짧고 정확하게, 단계(1,2,3)로 안내한다.\n"
        "- 제공된 KB 내용 안에서만 근거를 두고, 추측하지 않는다.\n"
    )

    user = f"""
[질문]
{question}

[KB 컨텍스트]
{context if context else "(관련 KB 없음)"}

요구사항:
- '어디서/어떻게'를 메뉴 경로로 명확히 안내
- 근거가 되는 섹션 제목을 (KB: 섹션명) 으로 표기
""".strip()

    try:
        log_stderr(f"Sending request to OpenAI... (Question: {question})")
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        log_stderr("OpenAI API call successful")
        return resp.choices[0].message.content.strip()
    except Exception as e:
        error_msg = f"죄송합니다. 오류가 발생했습니다.\n[에러 내용]: {str(e)}\n"
        import traceback
        tb = traceback.format_exc()
        log_stderr(f"OpenAI API Call Failed: {e}\n{tb}")
        
        # 디버깅용: UI에 에러 노출
        return f"{error_msg}\n\n[Traceback]\n{tb}"


def intro_node(state: Dict[str, Any]) -> Dict[str, Any]:
    if state.get("intro_done"):
        return state

    kb_text = _load_kb_text()
    sections = _split_kb_sections(kb_text)

    state["kb_text"] = kb_text
    state["kb_sections"] = sections
    state["history"] = state.get("history") or []
    state["history"].append((None, "안녕하세요! 👋\n홈페이지 FAQ / 사용방법 도우미입니다.\n궁금한 기능을 질문해 주세요."))
    if not kb_text.strip():
        state["history"].append((None, "※ 현재 KB(flow.md)가 비어 있어요. kb/flow.md에 화면/메뉴 안내를 추가해 주세요."))
    state["intro_done"] = True
    return state


def answer_node(state: Dict[str, Any]) -> Dict[str, Any]:
    q = (state.get("user_input") or "").strip()
    log_stderr(f"Received help request: {q}")
    if not q:
        return state

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    use_llm = bool(api_key) and OpenAI is not None

    sections = state.get("kb_sections") or []
    hits = retrieve_kb(sections, q, top_k=3 if use_llm else 1)
    context = _build_context(hits)

    if not context:
        # KB 매칭 실패 → 안내 요청
        msg = (
            "KB에 딱 맞는 안내를 못 찾았어요.\n"
            "지금 보고 있는 화면 이름(예: 공지사항/레시피 허브/최종 레시피 선정/보고서 화면)이나\n"
            "좌측 메뉴 경로를 같이 알려주면 정확히 안내할게요."
        )
        state["history"].append((q, msg))
        state["user_input"] = None
        return state

    if not use_llm:
        ans = build_kb_only_answer(q, hits)
    else:
        ans = answer_with_llm(q, context)

    # 근거 섹션명 최소 표기(LLM이 써주지만 혹시 없으면 강제로)
    if "(KB:" not in ans:
        titles = ", ".join([h["title"] for h in hits[:2]])
        ans = ans.rstrip() + f"\n(KB: {titles})"

    state["history"].append((q, ans))
    state["user_input"] = None
    return state


graph = StateGraph(dict)
graph.add_node("intro", intro_node)
graph.add_node("answer", answer_node)

graph.set_entry_point("intro")
graph.add_edge("intro", "answer")
graph.add_edge("answer", END)

compiled = graph.compile()


def make_initial_state() -> Dict[str, Any]:
    return {
        "history": [],
        "intro_done": False,
        "user_input": None,
        "kb_text": "",
        "kb_sections": [],
    }
