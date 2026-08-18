#!/bin/bash
B=http://localhost:3789
J='Content-Type: application/json'

echo "== 1. 注册派派 =="
P=$(curl -s $B/api/register -X POST -H "$J" -d '{"name":"派派","pass":"1234","sp":"🐰"}')
echo $P
PT=$(echo $P | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
CODE=$(echo $P | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).user.inviteCode')
echo "派派邀请码: $CODE"

echo "== 2. 注册小柴 =="
C=$(curl -s $B/api/register -X POST -H "$J" -d '{"name":"小柴","pass":"1234","sp":"🐶"}')
echo $C
CT=$(echo $C | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

echo "== 3. 小柴用派派邀请码加入 =="
curl -s $B/api/join -X POST -H "$J" -H "Authorization: Bearer $CT" -d "{\"code\":\"$CODE\"}"
echo; echo "重复加入（应提示 already）:"
curl -s $B/api/join -X POST -H "$J" -H "Authorization: Bearer $CT" -d "{\"code\":\"$CODE\"}"
echo

echo "== 4. 派派查成员（应看到小柴）=="
curl -s $B/api/me -H "Authorization: Bearer $PT" | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'const d=JSON.parse(require("fs").readFileSync(0)); JSON.stringify({members:d.members,joined:d.joined})'

echo "== 5. 派派投喂小柴 八卦 =="
MEMBER=$(curl -s $B/api/me -H "Authorization: Bearer $PT" | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).members[0].id')
FEED=$(curl -s $B/api/feed -X POST -H "$J" -H "Authorization: Bearer $PT" -d "{\"memberId\":\"$MEMBER\",\"foodId\":\"gossip\",\"text\":\"听说芒果台新综艺要上啦\"}")
echo $FEED
MEALID=$(echo $FEED | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).meal.id')

echo "== 6. 小柴查饭桌（应看到八卦）=="
curl -s $B/api/table -H "Authorization: Bearer $CT" | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'const d=JSON.parse(require("fs").readFileSync(0)); JSON.stringify(d.feeds.map(f=>({who:f.feederName,sp:f.feederSp,food:f.foodId,text:f.text,react:f.reaction,date:f.dateKey})))'

echo "== 7. 权限：小柴尝试投喂派派（小柴站里没有派派，应 403）=="
PAIPAI=$(curl -s $B/api/me -H "Authorization: Bearer $PT" | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).user.id')
curl -s $B/api/feed -X POST -H "$J" -H "Authorization: Bearer $CT" -d "{\"memberId\":\"$PAIPAI\",\"foodId\":\"praise\",\"text\":\"你好棒\"}"
echo

echo "== 8. 派派撤菜 =="
curl -s $B/api/feed/$MEALID -X DELETE -H "Authorization: Bearer $PT"
echo; echo "== 9. 撤后小柴饭桌应为空 =="
curl -s $B/api/table -H "Authorization: Bearer $CT" | /Users/huangxin/.workbuddy/binaries/node/versions/22.22.2/bin/node -pe 'JSON.parse(require("fs").readFileSync(0)).feeds.length'

echo "== 10. 图片上传 =="
IMG="data:image/png;base64,$(printf 'fake-png-data' | base64)"
curl -s $B/api/media -X POST -H "$J" -H "Authorization: Bearer $PT" -d "{\"data\":\"$IMG\"}"
echo
