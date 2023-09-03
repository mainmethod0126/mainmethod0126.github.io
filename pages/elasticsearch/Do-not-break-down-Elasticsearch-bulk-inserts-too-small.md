# elasticsearch  bulk insert를 너무 작게 쪼개면 안된다

패킷 사이즈 제한때문에 100만 Document를 insert하는 BulkInsert를 100개의 Document씩 잘개쪼개면 Elasticsearch write 풀의 대기큐 공간만 많이 잡아먹게된다.

그렇다고 또 큰데이터를 한번에 다 보낸다고 해서 무조건 한칸의 대기 큐 공간을 차지하는 것도 아니다.

너무 크면 elasticsearch내부에서 알아서 대용량 Bulk를 쪼개서 대기 큐에 적재하는 것 같다.

그러니 너무 커서 패킷 사이즈를 초과하지 않고, 너무 작아서 write 대기큐의 공간을 많이 잡아먹지 않도록 쪼개는게 중요하다.