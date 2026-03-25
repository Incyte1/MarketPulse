from __future__ import annotations

import threading
import traceback

_refresh_locks: dict[str, threading.Lock] = {}
_global_lock = threading.Lock()


def _get_lock(key: str) -> threading.Lock:
    with _global_lock:
        if key not in _refresh_locks:
            _refresh_locks[key] = threading.Lock()
        return _refresh_locks[key]


def run_once(key: str, fn, *args, **kwargs) -> bool:
    lock = _get_lock(key)

    if not lock.acquire(blocking=False):
        print(f"[BG] skipped already running: {key}")
        return False

    def _runner():
        print(f"[BG] started: {key}")
        try:
            fn(*args, **kwargs)
            print(f"[BG] finished: {key}")
        except Exception as exc:
            print(f"[BG] failed: {key} -> {exc}")
            traceback.print_exc()
        finally:
            lock.release()

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
    return True