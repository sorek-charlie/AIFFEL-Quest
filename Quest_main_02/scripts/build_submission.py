"""Build a GitHub-ready source archive from an explicit public allowlist."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = ('README.md', 'PRODUCT.md', 'DESIGN.md', 'AGENTS.md', 'requirements.txt',
              '.gitignore', '.env.example', 'AI_API_키_설정.cmd', '.github/workflows/demo-pages.yml')
WEB = ('index.html', 'landing.html', 'demo.html', 'app.js', 'styles.css', 'playful.css', 'motion.js')
DOCS = ('PRD.md', '문제정의_및_평가.md', '간략보고서_분석.md', '심층분석_양식.md',
        '정기_브리핑.md', '정책공고_API_확인.md', '로컬_LLM_사양.md')
SCRIPTS = ('build_submission.py', 'prepare_finance_demo.py', 'render_demo_html.py', 'build_cloudflare_pages.py', 'cloudflare_demo_worker.mjs', 'record_workroom_demo.py',
           'install_hermes_workroom.py', 'hermes_workroom_hook.py',
           'provider_keys_setup.py', 'policy_key_setup.py', 'launcher.py', 'check_ui.py',
           'finance_reports.js', 'finance_decks.js', 'render_policy_report_image.py',
           'register_daily_news_task.ps1', 'register_policy_task.ps1', 'register_policy_weekly_task.ps1')
EXAMPLES = ('meeting.txt', 'policy.json', 'issue.json', 'finance-demo.csv')


def build(target):
    sources = [ROOT / name for name in ROOT_FILES]
    for directory, names in [('web', WEB), ('docs', DOCS), ('scripts', SCRIPTS), ('examples', EXAMPLES)]:
        sources.extend(ROOT / directory / name for name in names)
    for directory in ('app', 'briefings', 'tests'):
        sources.extend(sorted((ROOT / directory).glob('*.py')))
    for name in sources:
        if not name.is_file() or not name.resolve().is_relative_to(ROOT):
            raise ValueError(f'공개 제출 파일을 확인하세요: {name.relative_to(ROOT)}')
    target.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
        for path in sources:
            archive.write(path, path.relative_to(ROOT).as_posix())
    return len(sources)


if __name__ == '__main__':
    target = ROOT / 'output' / 'github-submission' / '업무작업실_GitHub_제출.zip'
    print(f'{build(target)} files · {target}')
