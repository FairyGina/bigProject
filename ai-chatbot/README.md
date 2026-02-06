<!-- 파일 설명: Gradio + LangChain 챗봇 실행 방법을 정리. 
     실행하시려면 필수 사항입니다. 하단 순서대로 진행.-->
# AI Chatbot (Gradio + LangChain)

1) 파이썬 설치 안되어있다면 설치하셔야 합니다. 저는 3.14.2로 설치하였습니다.

2) 챗봇 돌리려면 필요한 것 설치하셔야 합니다. 하단 명령어 순서대로 사용하시면 됩니다.
   - 명령어: cd ai-chatbot
   - 명령어: python -m pip install -r requirements.txt

3) 환경변수 입력 (PowerShell 기준)
   - 명령어: $env:OPENAI_API_KEY="사용하시는 openai api 키"
   - 명령어: $env:SERPAPI_API_KEY="사용하시는 serpapi api 키"
   - 기존에 application-oauth.properties 파일에 있던 키는 spring boot 서버에서 불러오는 값이므로, 챗봇에서 사용하는 python 서버는 해당 파일을 못 읽어오기 때문에 또 등록해줘야 하는 것 같습니다

4) 이제부터 챗봇 사용하시려면 python app.py도 함께 돌리셔야 합니다. 하단 명령어 사용(이거 먼저 실행, 그 다음에 백엔드 서버 실행)
   - 명령어: python app.py (ai-chatbot 폴더 내에서 실행)
* gradio만 보기: http://localhost:7860
