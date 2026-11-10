from pathlib import Path
import urllib.request, subprocess
from PIL import Image
r=Path(__file__).resolve().parent;inp=r/'input';inp.mkdir(exist_ok=True)
pdf=r.parent/'참고자료/census_source.pdf'
if not pdf.exists():urllib.request.urlretrieve('https://www2.census.gov/library/publications/decennial/1910/volume-1/volume-1-p3.pdf',pdf)
subprocess.run(['pdftoppm','-f','2','-l','2','-r','200','-png','-singlefile',str(pdf),str(inp/'page_22')],check=True)
Image.open(inp/'page_22.png').crop((675,785,1760,1290)).save(inp/'census-table.png')
