"""Create and verify an offline backup outside the source repository."""
from pathlib import Path
import argparse, hashlib, json, subprocess, zipfile

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--source',required=True)
    p.add_argument('--destination',required=True)
    a=p.parse_args()
    source=Path(a.source).resolve(); dest=Path(a.destination).resolve()
    if dest==source or dest.is_relative_to(source):
        raise ValueError('Backup destination must be outside the source directory')
    dest.mkdir(parents=True,exist_ok=False)
    subprocess.run(['git','bundle','create',str(dest/'history.bundle'),'--all'],cwd=source,check=True)
    manifest=[]; archive=dest/'workspace-private.zip'
    paths=sorted(p for p in source.rglob('*') if p.is_file())
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z:
        for i,path in enumerate(paths):
            rel=path.relative_to(source).as_posix();h=hashlib.sha256();size=0
            with path.open('rb') as f,z.open(rel,'w',force_zip64=True) as out:
                while data:=f.read(1024*1024):
                    h.update(data);size+=len(data);out.write(data)
            manifest.append({'path':rel,'bytes':size,'sha256':h.hexdigest()})
            if i%250==0:print('Backed up',i+1,'/',len(paths),flush=True)
    with zipfile.ZipFile(archive) as z:
        assert len(z.infolist())==len(manifest)
        for entry in manifest:
            h=hashlib.sha256();size=0
            with z.open(entry['path']) as f:
                while data:=f.read(1024*1024):h.update(data);size+=len(data)
            assert h.hexdigest()==entry['sha256'] and size==entry['bytes'],entry['path']
    subprocess.run(['git','bundle','verify',str(dest/'history.bundle')],cwd=source,check=True,capture_output=True)
    (dest/'backup-manifest.json').write_text(json.dumps({'verified':True,'files':manifest},ensure_ascii=False,indent=2),'utf8')
    print(json.dumps({'backup':str(dest),'verified':True,'files':len(manifest),'archiveBytes':archive.stat().st_size},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
