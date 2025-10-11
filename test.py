import requests

result=requests.post("http://127.0.0.1:8000/chat",params={"query":"steps to follow in case of flood"},)

print(result.json())