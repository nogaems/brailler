import re
import os
import pathlib
from shutil import copyfile

modules = './node_modules'
dest = './public/js/vendor/'

print(f'Ensuring "{dest}" path exists...')
pathlib.Path(dest).mkdir(parents=True, exist_ok=True)

# [dep_dir, dep_file, dep_name]
deps_list = [
    [
        f'{modules}/marvinj/marvinj/release/',
        'marvinj-.*.js',
        'marvinj.js'
    ],
]

for dep_dir, dep_file, dep_name in deps_list:
    matching = sorted([f for f in os.listdir(
        dep_dir) if re.match(dep_file, f)])
    if len(matching):
        matching = matching[-1]
        path = os.path.join(dep_dir, matching)
        print(f'Copying dependency "{path}" into "{dest}"...')
        copyfile(path, os.path.join(dest, dep_name))
    else:
        print('Nothing matches specified regex '
              '"{dep_file}" within "{dep_dir}"!')

print('Done!')
