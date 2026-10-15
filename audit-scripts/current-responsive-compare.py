from PIL import Image, ImageChops
from pathlib import Path
import json
base=Path('audit-results/current-run')
results=[]
for before in sorted((base/'baseline').glob('*.png')):
 after=base/'final'/before.name
 a,b=Image.open(before).convert('RGB'),Image.open(after).convert('RGB')
 row={'screenshot':before.name,'baseline_dimensions':a.size,'final_dimensions':b.size}
 if a.size==b.size:
  diff=ImageChops.difference(a,b)
  row['difference_bounds']=diff.getbbox()
  row['pixel_identical']=row['difference_bounds'] is None
  row['difference_after_first_900px']=diff.crop((0,900,a.width,a.height)).getbbox() if a.height>900 else None
 else:row['pixel_identical']=False
 results.append(row)
(base/'screenshot-comparison.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'cases':len(results),'identical':sum(r['pixel_identical'] for r in results),'changed':[r for r in results if not r['pixel_identical']]},indent=2))
