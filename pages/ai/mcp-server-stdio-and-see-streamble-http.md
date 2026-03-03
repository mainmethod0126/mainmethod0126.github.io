# mcp server stdio 와 streamble http(sse) 란

## stdio

- 표준입출력으로 통신하는 방식
- 네트워크 통신이 아니기 때문에 로컬 전용

## streamble http (sse)

- 서버 센트 이벤트로 통신하는 방식
- 로컬이 아닌 외부에 두고 통신할 때 쓰임
- 로컬에 두고 써도 되긴 하는데 stdio가 있는데 굳이 네트워크 리소스를 필요로하는 sse를 쓸 이유가 없음