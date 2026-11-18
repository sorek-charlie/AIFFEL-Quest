"""Install the report adapter into the existing workspace-only Hermes plugin."""
import argparse
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = '    def room_route(event, **kwargs):\n'
UPDATED = '''    async def room_route(event, **kwargs):
        from .workroom_hook import dispatch
        plugin = Path(__file__).resolve().parent
        workroom = Path((plugin / "workroom-root.txt").read_text("utf-8").strip())
        routed = await dispatch(event, workroom, plugin.parent.parent)
        if routed:
            return routed
'''


def install(home):
    plugin = home.resolve() / 'plugins' / 'workspace-only'
    original = plugin / '__init__.py'
    text = original.read_text('utf-8')
    if text.count(ORIGINAL) != 1 and UPDATED not in text:
        raise ValueError('기존 workspace-only 플러그인의 연결점을 확인할 수 없습니다.')
    update = text.replace(ORIGINAL, UPDATED, 1)
    compile(update, str(original), 'exec')
    backup = plugin / '__init__.before-workroom.py'
    if not backup.exists():
        shutil.copy2(original, backup)
    shutil.copy2(ROOT / 'app' / 'telegram_receipts.py', plugin / 'workroom_receipts.py')
    shutil.copy2(ROOT / 'scripts' / 'hermes_workroom_hook.py', plugin / 'workroom_hook.py')
    (plugin / 'workroom-root.txt').write_text(str(ROOT), encoding='utf-8')
    temporary = original.with_suffix('.tmp')
    temporary.write_text(update, encoding='utf-8')
    temporary.replace(original)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('hermes_home', type=Path)
    install(parser.parse_args().hermes_home)
