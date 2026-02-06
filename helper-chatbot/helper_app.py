# helper_app.py
from __future__ import annotations

import os
import gradio as gr

from helper_graph import compiled, make_initial_state

CUSTOM_CSS = """
body, .gradio-container {
  font-family: "Pretendard", "Noto Sans KR", system-ui, -apple-system, sans-serif;
  font-size: 15px;
}
"""

DEFAULT_EXAMPLES = [
    "공지사항은 어디서 봐?",
    "레시피 허브에서 전체 레시피는 어떻게 찾아?",
    "내 정보 수정은 어디서 해?",
    "최종 레시피 선정은 어떤 화면이야?",
    "보고서(PDF) 다운로드는 어디서 해?",
]


def run_graph(state: dict) -> dict:
    return compiled.invoke(state)


def history_to_messages(history):
    if not history:
        return []
    if isinstance(history[0], dict):
        return history
    messages = []
    for item in history:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            continue
        user, bot = item
        if user:
            messages.append({"role": "user", "content": user})
        if bot:
            messages.append({"role": "assistant", "content": bot})
    return messages


def init_chat():
    state = make_initial_state()
    state = run_graph(state)
    return state, history_to_messages(state["history"]), gr.update(value="")


def on_submit(user_text: str, state: dict, request: gr.Request | None = None):
    user_text = (user_text or "").strip()
    if not user_text:
        return state, history_to_messages(state["history"]), gr.update(value="")

    state["user_input"] = user_text
    state = run_graph(state)
    return state, history_to_messages(state["history"]), gr.update(value="")


def make_quick_handler(q: str):
    def _fn(state: dict, request: gr.Request | None = None):
        return on_submit(q, state, request)
    return _fn


with gr.Blocks() as demo:
    gr.Markdown("## 홈페이지 FAQ / 사용방법 도우미")

    chatbot = gr.Chatbot(label="도우미 채팅")
    textbox = gr.Textbox(
        label="질문 입력",
        placeholder="예: PDF 다운로드 어디서 해? / 레시피 허브는 뭐야?"
    )

    state = gr.State(make_initial_state())

    with gr.Row():
        send_btn = gr.Button("보내기", variant="primary")
        clear_btn = gr.Button("대화 초기화")

    gr.Markdown("### 빠른 질문")
    with gr.Row():
        for q in DEFAULT_EXAMPLES:
            gr.Button(q).click(
                fn=make_quick_handler(q),
                inputs=[state],
                outputs=[state, chatbot, textbox],
            )

    demo.load(init_chat, inputs=None, outputs=[state, chatbot, textbox])
    textbox.submit(on_submit, inputs=[textbox, state], outputs=[state, chatbot, textbox])
    send_btn.click(on_submit, inputs=[textbox, state], outputs=[state, chatbot, textbox])

    def on_clear():
        s = make_initial_state()
        s = run_graph(s)
        return s, history_to_messages(s["history"]), gr.update(value="")

    clear_btn.click(on_clear, inputs=None, outputs=[state, chatbot, textbox])

demo.queue()
demo.launch(
    server_name=os.getenv("GRADIO_SERVER_NAME", "0.0.0.0"),
    server_port=int(os.getenv("GRADIO_SERVER_PORT", "7861")),
    css=CUSTOM_CSS,  # ✅ 경고 없애려고 launch로 옮김
)
