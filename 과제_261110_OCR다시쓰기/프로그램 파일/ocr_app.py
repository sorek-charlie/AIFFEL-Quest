"""Windows GUI for the supplied OCR assignment and its saved OCR evidence."""
from pathlib import Path
import argparse
import contextlib
import csv
import io
import json
import os
import sys
import traceback

import extract_layout
import reconstruct_table


def program_root():
    return Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent


def process(root):
    required = [root / 'input/census-table.png', root / 'reviewed_cells.json',
                root.parent / '참고자료/outputs/ocr/text_coordinates.json']
    missing = [str(p) for p in required if not p.is_file()]
    if missing:
        raise FileNotFoundError('과제 폴더 전체를 압축 해제한 후 실행하세요. 필요한 파일: ' + ', '.join(missing))
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        extract_layout.main(root)
        reconstruct_table.main(root)
    result = json.loads((root.parent / '참고자료/outputs/layout/layout.json').read_text(encoding='utf-8'))
    table = result['tables'][0]
    return {'rows': len(table['rows']), 'columns': len(table['headers']),
            'text_blocks': len(result['text_blocks']), 'log': output.getvalue()}


def gui(root, smoke=False):
    import tkinter as tk
    from tkinter import ttk, messagebox
    window = tk.Tk()
    window.title('OCR 과제 - 텍스트·표 추출')
    window.geometry('1080x740')
    window.minsize(850, 580)
    style = ttk.Style(window)
    style.theme_use('clam')
    style.configure('TButton', padding=(12, 9))
    style.configure('Title.TLabel', font=('맑은 고딕', 19, 'bold'))
    style.configure('TLabel', font=('맑은 고딕', 10))
    frame = ttk.Frame(window, padding=22)
    frame.pack(fill='both', expand=True)
    ttk.Label(frame, text='텍스트와 표를 나누고 결과를 확인하세요', style='Title.TLabel').pack(anchor='w')
    ttk.Label(frame, text='1910 Census | 포함된 이미지와 기존 OCR 좌표를 사용합니다. Python 설치 없이 실행됩니다.').pack(anchor='w', pady=(8, 3))
    ttk.Label(frame, text='새 OCR 모델 추론은 실행하지 않습니다. 자동 추출 표와 수동 검토값으로 교정한 표를 별도로 보존합니다.').pack(anchor='w', pady=(0, 14))
    controls = ttk.Frame(frame)
    controls.pack(fill='x', pady=(0, 14))
    status = tk.StringVar(value='준비됨 - 추출 실행 버튼을 누르세요.')
    notebook = ttk.Notebook(frame)
    notebook.pack(fill='both', expand=True)
    tabs = {}
    for title in ['분리된 텍스트', '자동 추출 표', '교정한 표', '실행 기록']:
        tab = ttk.Frame(notebook, padding=8)
        notebook.add(tab, text=title)
        tabs[title] = tab
    text = tk.Text(tabs['분리된 텍스트'], wrap='word', font=('맑은 고딕', 12), padx=14, pady=14)
    text.pack(fill='both', expand=True)
    log = tk.Text(tabs['실행 기록'], wrap='word', font=('맑은 고딕', 10))
    log.pack(fill='both', expand=True)
    trees = {}
    for title in ['자동 추출 표', '교정한 표']:
        container = tabs[title]
        tree = ttk.Treeview(container, show='headings')
        sy = ttk.Scrollbar(container, orient='vertical', command=tree.yview)
        sx = ttk.Scrollbar(container, orient='horizontal', command=tree.xview)
        tree.configure(yscrollcommand=sy.set, xscrollcommand=sx.set)
        tree.grid(row=0, column=0, sticky='nsew')
        sy.grid(row=0, column=1, sticky='ns')
        sx.grid(row=1, column=0, sticky='ew')
        container.rowconfigure(0, weight=1)
        container.columnconfigure(0, weight=1)
        trees[title] = tree

    def show_results():
        out = root.parent / '참고자료/outputs'
        p = out / 'layout/text.txt'
        text.delete('1.0', 'end')
        text.insert('1.0', p.read_text(encoding='utf-8') if p.exists() else '추출을 실행하면 제목·각주가 여기에 표시됩니다.')
        for title, path in [('자동 추출 표', out / 'layout/table_001.csv'), ('교정한 표', out / 'ocr/table.csv')]:
            tree = trees[title]
            tree.delete(*tree.get_children())
            if not path.exists():
                continue
            with path.open(encoding='utf-8-sig', newline='') as handle:
                rows = list(csv.reader(handle))
            tree['columns'] = list(range(len(rows[0])))
            for i, name in enumerate(rows[0]):
                tree.heading(i, text=name)
                tree.column(i, width=390 if i == 0 else 210, minwidth=100, stretch=False)
            for row in rows[1:]:
                tree.insert('', 'end', values=row)

    def run():
        run_button.configure(state='disabled')
        status.set('텍스트·표 구조를 추출하고 교정 표를 생성하고 있습니다…')
        window.update_idletasks()
        try:
            result = process(root)
            show_results()
            log.insert('end', result['log'] + '\n')
            status.set(f"완료: {result['rows']}행 × {result['columns']}열 표 / 텍스트 {result['text_blocks']}개")
        except Exception as exc:
            log.insert('end', traceback.format_exc() + '\n')
            status.set('실행 실패 - 실행 기록을 확인하세요.')
            messagebox.showerror('실행 오류', str(exc), parent=window)
        finally:
            run_button.configure(state='normal')

    def open_path(path):
        try:
            os.startfile(str(path))
        except OSError as exc:
            messagebox.showerror('파일 열기', str(exc), parent=window)

    run_button = ttk.Button(controls, text='텍스트·표 추출 실행', command=run)
    run_button.pack(side='left', padx=(0, 8))
    for label, target in [('결과 폴더 열기', root.parent / '참고자료/outputs'),
                          ('영역 구분 이미지', root.parent / '참고자료/outputs/layout/layout_regions.png'),
                          ('PDF 보고서', root.parent / 'OCR_Assignment_Report.pdf')]:
        ttk.Button(controls, text=label, command=lambda p=target: open_path(p)).pack(side='left', padx=(0, 8))
    ttk.Label(frame, textvariable=status).pack(anchor='w', pady=(12, 0))
    show_results()
    if smoke:
        # Test real Tk widgets and result loading without leaving a window open.
        window.after(300, window.destroy)
    window.mainloop()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--smoke-ui', action='store_true')
    parser.add_argument('--workspace', type=Path, help='Program-files folder for isolated verification')
    parser.add_argument('--result-json', type=Path)
    args = parser.parse_args()
    root = args.workspace.resolve() if args.workspace else program_root()
    try:
        if args.self_test:
            result = process(root)
        else:
            gui(root, smoke=args.smoke_ui)
            result = {'ui_smoke': bool(args.smoke_ui)}
        result['frozen'] = bool(getattr(sys, 'frozen', False))
        result['python'] = sys.version.split()[0]
        if args.result_json:
            args.result_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        return 0
    except Exception:
        detail = traceback.format_exc()
        if args.result_json:
            args.result_json.write_text(json.dumps({'error': detail}, ensure_ascii=False), encoding='utf-8')
        if not args.self_test:
            import tkinter.messagebox
            tkinter.messagebox.showerror('OCR 실행 오류', detail)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
