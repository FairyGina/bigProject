# 파일 설명: Gradio 챗봇 UI와 LangChain(OpenAI) 호출을 연결하는 엔트리 스크립트.
from __future__ import annotations

import os
from typing import List, Tuple

import gradio as gr
from langchain_openai import ChatOpenAI

SYSTEM_PROMPT = "\n".join(
    [
        "당신은 유용한 레시피 어시스턴트입니다.",
        "창의적인 레시피를 생성하고 사용자 피드백에 맞게 조정합니다.",
        "사용자가 따로 요청하지 않는 한 한국어로 응답합니다.",
    ]
)

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

def build_prompt(history: List[Tuple[str, str]], user_message: str) -> str:
    parts = [SYSTEM_PROMPT, "", "Conversation so far:"]
    for item in history:
        user_text = ""
        assistant_text = ""
        if isinstance(item, (list, tuple)):
            if len(item) >= 1:
                user_text = item[0] or ""
            if len(item) >= 2:
                assistant_text = item[1] or ""
        elif isinstance(item, dict):
            role = item.get("role")
            content = item.get("content") or ""
            if role == "user":
                user_text = content
            elif role == "assistant":
                assistant_text = content
        if user_text:
            parts.append(f"User: {user_text}")
        if assistant_text:
            parts.append(f"Assistant: {assistant_text}")
    parts.append(f"User: {user_message}")
    parts.append("Assistant:")
    return "\n".join(parts)


#chat 함수에서 llm.invoke(prompt) 하고있는 부분을 그래프 실행으로 교체해야 함.
#response=graph.invoke(state)로 나중엔 대체 ㄱㄱ
def chat(message: str, history: List[Tuple[str, str]]) -> str:
    prompt = build_prompt(history, message)
    response = llm.invoke(prompt)
    return response.content


llm = ChatOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    model="gpt-4.1-mini",
    temperature=0.8,
)


def main() -> None:
    with gr.Blocks(css=CUSTOM_CSS) as demo:
        #gr.Markdown("## AI 레시피 생성 챗봇")
        gr.Markdown("원하시는 조건에 맞게, 혹은 랜덤으로 레시피를 생성할 수 있습니다.")
        gr.ChatInterface(fn=chat)
    demo.queue()
    demo.launch(
        server_name=os.getenv("GRADIO_SERVER_NAME", "0.0.0.0"),
        server_port=7860,
    )


if __name__ == "__main__":
    main()
