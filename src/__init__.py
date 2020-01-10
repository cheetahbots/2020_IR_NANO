from .setup import *
__all__ = ['loadedModules']

_L = locals()
loadedModules = [_L[key] for key in _L if not key.startswith(
    '__') if hasattr(_L[key], 'isModule')]
