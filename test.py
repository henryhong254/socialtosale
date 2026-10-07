import re, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'd:\LP20-caunoi\index.html', 'r', encoding='utf-8') as f: html = f.read()

# Find the quiz result / percentage variable
scripts = re.findall(r'<script.*?</script>', html, flags=re.DOTALL)
for i, s in enumerate(scripts):
    if 'leak' in s.lower() or 'quiz' in s.lower() or '%' in s or 'percent' in s.lower() or 'score' in s.lower() or 'result' in s.lower() or 'ro-ri' in s.lower() or 'rori' in s.lower():
        print(f"=== Script {i} ===")
        print(s[:800])
        print()
