// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';

const MAP_FILE_PATH = path.join(__dirname, '../../project-map.json');

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }
  return parsed;
}

interface FunctionMeta {
  name: string;
  purpose: string;
  dependencies: string[];
}

interface FileMeta {
  module: string;
  functions: FunctionMeta[];
}

interface ProjectMap {
  lastUpdated: string;
  structure: Record<string, FileMeta>;
}

function loadMap(): ProjectMap {
  if (!fs.existsSync(MAP_FILE_PATH)) {
    return { lastUpdated: new Date().toISOString(), structure: {} };
  }
  const data = fs.readFileSync(MAP_FILE_PATH, 'utf-8');
  return JSON.parse(data);
}

function saveMap(map: ProjectMap) {
  map.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MAP_FILE_PATH, JSON.stringify(map, null, 2), 'utf-8');
}

function main() {
  const args = parseArgs();
  
  if (!args.file || !args.func || !args.purpose) {
    console.error('Thiếu trường bắt buộc. Sử dụng:');
    console.error('npm run map:update -- --file "path.ts" --module "M" --func "f" --purpose "P" --deps "d1,d2"');
    process.exit(1);
  }

  try {
    const { file, module, func, purpose, deps } = args;
    const dependencies = deps ? deps.split(',').map(d => d.trim()) : [];

    const map = loadMap();

    if (!map.structure[file]) {
      map.structure[file] = {
        module: module || 'Khác',
        functions: []
      };
    }

    const funcIndex = map.structure[file].functions.findIndex(f => f.name === func);
    const newFuncMeta: FunctionMeta = {
      name: func,
      purpose,
      dependencies
    };

    if (funcIndex !== -1) {
      map.structure[file].functions[funcIndex] = newFuncMeta;
    } else {
      map.structure[file].functions.push(newFuncMeta);
    }

    saveMap(map);
    console.log(`[Project Mapper] Thành công: Lưu thông tin hàm "${func}" tại "${file}" vào project-map.json`);
  } catch (error: any) {
    console.error('[Project Mapper] Lỗi xử lý:', error.message);
    process.exit(1);
  }
}

main();
