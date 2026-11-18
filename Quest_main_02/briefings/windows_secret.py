"""Windows user-bound DPAPI credential storage for the policy API."""
import ctypes
import os
from ctypes import wintypes
from pathlib import Path

SECRET_PATH = Path(__file__).resolve().parents[1] / 'data' / 'secrets' / 'data-go-kr.dpapi'


class Blob(ctypes.Structure):
    _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_ubyte))]


def transform(value, encrypt):
    if os.name != 'nt':
        raise OSError('Windows 사용자 계정의 암호화 기능이 필요합니다.')
    crypt = ctypes.WinDLL('crypt32', use_last_error=True)
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.LocalFree.argtypes = [wintypes.HLOCAL]
    kernel.LocalFree.restype = wintypes.HLOCAL
    data = (ctypes.c_ubyte * len(value)).from_buffer_copy(value)
    source, result = Blob(len(value), data), Blob()
    if encrypt:
        crypt.CryptProtectData.argtypes = [ctypes.POINTER(Blob), wintypes.LPCWSTR, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        fn, args = crypt.CryptProtectData, (ctypes.byref(source), None, None, None, None, 1, ctypes.byref(result))
    else:
        crypt.CryptUnprotectData.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        fn, args = crypt.CryptUnprotectData, (ctypes.byref(source), None, None, None, None, 1, ctypes.byref(result))
    fn.restype = wintypes.BOOL
    if not fn(*args):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(result.pbData, result.cbData)
    finally:
        kernel.LocalFree(ctypes.cast(result.pbData, wintypes.HLOCAL))


def save(key):
    key = key.strip()
    if not key or '\n' in key or '\r' in key or len(key) > 512:
        raise ValueError('인증키 형식을 확인하세요.')
    encrypted = transform(key.encode('utf-8'), True)
    SECRET_PATH.parent.mkdir(parents=True, exist_ok=True)
    SECRET_PATH.write_bytes(encrypted)


def load():
    return transform(SECRET_PATH.read_bytes(), False).decode('utf-8')
