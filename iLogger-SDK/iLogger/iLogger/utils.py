import inspect
import os

def get_context():
    """ Automatically detects the calling module and function name. """
    try:
        # We go up 3 frames: 
        # 0: get_context
        # 1: _log (in logger.py)
        # 2: info/error/etc (in logger.py)
        # 3: actual caller
        frame = inspect.stack()[3]
        module = os.path.basename(frame.filename).replace(".py", "")
        function = frame.function
        return module, function
    except Exception:
        return "unknown", "func()"
