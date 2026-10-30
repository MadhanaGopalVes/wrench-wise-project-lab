import os
import shutil
import zipfile

zip_filenames = [
    'wrench_wise_complete_project_lab.zip',
    'WrenchWise_Project_Lab_Package.zip'
]

dirs_to_pack = [
    'public',
    'server',
    'portal',
    'projects',
    'handouts',
    'content',
    'data'
]

files_to_pack = [
    'gateway.py',
    'start_lab.bat',
    'README.md',
    'MANAGEMENT_VALIDATION_DOSSIER.html',
    'package.json',
    'Dockerfile',
    'render.yaml',
    'start.sh',
    'requirements.txt',
    'RENDER_DEPLOYMENT_GUIDE.md'
]

def should_skip(path):
    p = path.replace('\\', '/')
    return any(skip in p for skip in [
        '__pycache__',
        '.pytest_cache',
        'cloudflared.exe',
        '.git',
        '.zip',
        'inspect_trans.py'
    ])

for zip_filename in zip_filenames:
    count = 0
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files_to_pack:
            if os.path.exists(f) and not should_skip(f):
                z.write(f, f)
                count += 1
        for d in dirs_to_pack:
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for file in files:
                        full = os.path.join(root, file)
                        rel = os.path.relpath(full, '.')
                        if not should_skip(rel):
                            z.write(full, rel)
                            count += 1

    size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
    print(f"Successfully packaged {count} files into {zip_filename} ({size_mb:.2f} MB)")

    # Ensure distribution file is copied to public/ for direct web download
    if os.path.exists('public'):
        shutil.copyfile(zip_filename, os.path.join('public', zip_filename))
        print(f"Copied {zip_filename} to public/ for direct download.")
