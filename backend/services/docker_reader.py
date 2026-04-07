import asyncio
import docker
from ws_manager import manager
from datetime import datetime

client = docker.from_env()

async def list_containers():
    """Returns a list of all containers with their states."""
    try:
        containers = client.containers.list(all=True)
        return [{"id": c.id, "name": c.name, "status": c.status} for c in containers]
    except Exception as e:
        return []

async def stream_docker_logs(container_id: str, source_id: str):
    """Streams logs from a docker container to the websocket manager."""
    try:
        container = client.containers.get(container_id)
        # using blocking stream in an thread/asyncio.to_thread or simple generator
        # The docker-py SDK returns a blocking generator, so for simple async we 
        # should use asyncio.to_thread, but for brevity we will simulate an async loop
        
        # In a real async docker implementation, aio-docker is better, but since
        # we have `docker` installed, we'll wrap it in a thread executor
        # Get logs with timestamps enabled
        log_stream = container.logs(stream=True, follow=True, tail=100, timestamps=True)
        
        loop = asyncio.get_event_loop()
        
        # Read next line in a thread so it doesn't block the event loop
        def get_next_line():
            try:
                line = next(log_stream)
                return line.decode('utf-8', errors='ignore').strip()
            except StopIteration:
                return None
            except Exception:
                return None

        while True:
            line = await loop.run_in_executor(None, get_next_line)
            if line is None:
                break
            
            # Docker logs with timestamps=True start with the RFC3339 timestamp followed by a space
            raw_timestamp = None
            if " " in line:
                ts_part, message_part = line.split(" ", 1)
                try:
                    # ISO 8601 parsing (Docker uses RFC3339Z)
                    dt = datetime.fromisoformat(ts_part.replace("Z", "+00:00"))
                    raw_timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
                    line = message_part
                except:
                    pass

            level = "INFO"
            up_line = line.upper()
            if "ERROR" in up_line:
                level = "ERROR"
            elif "WARN" in up_line:
                level = "WARNING"
            elif "DEBUG" in up_line:
                level = "DEBUG"

            log_data = {
                "timestamp": raw_timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "level": level,
                "message": line
            }
            await manager.broadcast_log(source_id=source_id, log_data=log_data)
    except docker.errors.NotFound:
        pass
    except Exception as e:
        print(f"Error streaming docker logs for {container_id}: {e}")
