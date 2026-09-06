from __future__ import annotations
import json, os
from typing import Any
from redis.asyncio import Redis

redis = Redis.from_url(os.getenv('REDIS_URL','redis://127.0.0.1:6379/0'), decode_responses=True)

async def cached(key:str)->Any|None:
    try:
        value=await redis.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None

async def put(key:str,value:Any,ttl:int=60)->None:
    try: await redis.set(key,json.dumps(value),ex=ttl)
    except Exception: return

async def invalidate(prefix:str)->None:
    try:
        keys=await redis.keys(prefix+'*')
        if keys: await redis.delete(*keys)
    except Exception: return
