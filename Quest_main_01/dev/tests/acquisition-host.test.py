"""Exercise the actual built EXE loopback host with a disposable test certificate."""
from pathlib import Path
from datetime import datetime,timedelta,timezone
import subprocess,time,json,urllib.request,urllib.error,base64,shutil
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.serialization import pkcs12
ROOT=Path(__file__).resolve().parents[2]
out=ROOT/'dev/build/acquisition-host-qa';out.mkdir(exist_ok=True)
session=out/'host-session.json'
if session.exists():session.unlink()
p=subprocess.Popen([str(ROOT/'경정청구.exe'),'--host-test',str(out)],creationflags=subprocess.CREATE_NO_WINDOW)
try:
 for _ in range(100):
  if session.exists():break
  if p.poll() is not None:raise RuntimeError('Host failed to start')
  time.sleep(.2)
 d=json.loads(session.read_text(encoding='utf-8-sig'));base=d['home'].split('/app/index.html')[0]+'/'
 token=base.rstrip('/').rsplit('/',1)[1]
 def call(path,body=None,origin=None,auth=True):
  headers={'Origin':origin or d['origin']}
  if auth:headers['X-ReturnCheck']=token
  data=json.dumps(body).encode() if body is not None else None
  if data is not None:headers['Content-Type']='application/json'
  req=urllib.request.Request(base+path,data=data,headers=headers)
  with urllib.request.urlopen(req,timeout=10) as r:return r.read()
 def api(path,body=None):return json.loads(call('api/'+path,body))
 assert api('status')['automaticInstitutionLogin'] is False
 assert token.encode() in call('app/index.html')
 assert b'ResultMatrix' in call('app/assets/result-matrix.js')
 assert b'data-report' in call('app/index.html')
 assert b'RETURN_CHECK_SOURCE' not in call('app/index.html')
 print('PASS: runtime reports; no embedded company dataset')
 question_path=urllib.parse.quote('docs/추가확인_질문목록.txt')
 assert '최종 확인' in call(question_path).decode('utf8')
 for req in [urllib.request.Request(d['origin']+'/api/status'),urllib.request.Request(base+'api/watch',data=b'{}',headers={'Origin':'https://evil.test','X-ReturnCheck':token})]:
  try:urllib.request.urlopen(req);raise AssertionError('Unauthorized request accepted')
  except urllib.error.HTTPError as e:assert e.code==403
  except (ConnectionResetError,ConnectionAbortedError):pass
 try:call('api/watch',{},auth=False);raise AssertionError('CSRF token missing')
 except urllib.error.HTTPError as e:assert e.code==403
 except (ConnectionResetError,ConnectionAbortedError):pass
 try:call('../README.md');raise AssertionError('Traversal accepted')
 except urllib.error.HTTPError as e:assert e.code==403
 except (ConnectionResetError,ConnectionAbortedError):pass
 print('PASS: loopback session, origin/token, traversal isolation')
 bad_manifest={'routes':[{'id':'grant-paid','name':'test','url':'https://example.invalid/','agency':'test'}]}
 api('institution-collect',{'routes':'grant-paid','format':'npki','manifestJson':json.dumps(bad_manifest)})
 for _ in range(30):
  collector=api('status').get('collector',{})
  if collector.get('state')=='error':break
  time.sleep(.1)
 assert collector.get('state')=='error' and '공식기관' in collector.get('message','')
 assert not api('status')['items']
 print('PASS: native collector rejects non-official route manifests before navigation')
 key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
 name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'ReturnCheck QA certificate - not corporate identity')])
 cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)-timedelta(days=1)).not_valid_after(datetime.now(timezone.utc)+timedelta(days=2)).sign(key,hashes.SHA256())
 password='QA-disposable-password'
 pfx=pkcs12.serialize_key_and_certificates(b'QA',key,cert,None,serialization.BestAvailableEncryption(password.encode()))
 result=api('certificate',{'format':'pfx','data':base64.b64encode(pfx).decode(),'password':password})
 assert result['passwordChecked'] and result['hasPrivateKey'] and not result['authenticated'] and not result['corporateIdentityVerified']
 bad=api('certificate',{'format':'pfx','data':base64.b64encode(pfx).decode(),'password':'incorrect'})
 assert 'error' in bad
 der=api('certificate',{'format':'der','data':base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode(),'password':'unused'})
 assert not der['passwordChecked'] and not der['authenticated']
 assert not list(out.glob('*.pfx')) and not list(out.glob('*.key'))
 print('PASS: local PFX password/private key; invalid password; DER explicitly not authenticated')
 folder=Path(d['folder']);old=folder/'existing.xlsx';old.write_bytes(b'baseline')
 api('watch',{'enabled':True});assert not api('status')['items']
 (folder/'signPri.key').write_bytes(b'not-a-real-private-key')
 (folder/'partial.pdf.crdownload').write_bytes(b'incomplete')
 new=folder/('download-'+str(time.time_ns())+'.pdf');new.write_bytes(b'%PDF-1.7\nQA completed download')
 for _ in range(30):
  items=api('status')['items']
  if items:break
  time.sleep(.3)
 assert len(items)==1 and items[0]['name']==new.name
 assert call('api/file/'+items[0]['id'])==new.read_bytes()
 api('ack',{'id':items[0]['id']});assert not api('status')['items']
 api('watch',{'enabled':False});assert not api('status')['watching']
 print('PASS: only new completed supported downloads queued, content read, acknowledged, stopped')
finally:
 p.terminate()
 try:p.wait(timeout=10)
 except subprocess.TimeoutExpired:p.kill();p.wait()
