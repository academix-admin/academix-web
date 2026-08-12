"""Snapshot the templates + subjects currently live in the project.

Run this BEFORE build_templates.py --apply so there is an exact rollback point in git for
whatever the dashboard held. Writes ./_previous/*.html plus _previous/subjects.json.
"""
import io, json, os, urllib.request

PROJECT = 'iewqfmkngcgayxbbnpiz'
WEB = 'c:/Users/ajibe/StudioProjects/academix-project/academix-web'
HERE = os.path.dirname(os.path.abspath(__file__))

token = None
for line in io.open(f'{WEB}/.env.local', encoding='utf-8'):
    if line.startswith('SUPABASE_ACCESS_KEY='):
        token = line.split('=', 1)[1].strip().strip('"')
        break

req = urllib.request.Request(
    f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',
    headers={'Authorization': f'Bearer {token}', 'User-Agent': 'curl/8.4.0'})
with urllib.request.urlopen(req) as r:
    cfg = json.loads(r.read().decode('utf-8'))

out = os.path.join(HERE, '_previous')
os.makedirs(out, exist_ok=True)

n = 0
subjects = {}
for k, v in cfg.items():
    if k.startswith('mailer_templates_') and k.endswith('_content') and isinstance(v, str) and v:
        name = k[len('mailer_templates_'):-len('_content')]
        io.open(os.path.join(out, f'{name}.html'), 'w', encoding='utf-8').write(v)
        n += 1
    elif k.startswith('mailer_subjects_') and isinstance(v, str):
        subjects[k] = v

io.open(os.path.join(out, 'subjects.json'), 'w', encoding='utf-8').write(
    json.dumps(subjects, indent=1))
print(f'snapshotted {n} templates and {len(subjects)} subjects to {out}')
