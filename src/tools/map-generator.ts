// @ts-nocheck
import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

// --- Parser Tham Số Dòng Lệnh ---
const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
🚀 Map Generator CLI

Sử dụng:
  npm run map:generate -- [options]
  ts-node src/tools/map-generator.ts [options]

Tùy chọn:
  --help, -h       : Hiển thị hướng dẫn
  --output, -o     : Đường dẫn file lưu kết quả (mặc định: ./project-map.json)
  --dirs, -d       : Các thư mục con cần quét (cách nhau dấu phẩy). VD: "apps/frontend,apps/backend"
  --ignore, -i     : Các từ khóa chứa trong tên file/thư mục cần bỏ qua (cách nhau dấu phẩy). VD: "test,mock"
  `);
  process.exit(0);
}

// Thiết lập cấu hình mặc định
let mapFilePath = path.join(process.cwd(), 'project-map.json');
let projectRoot = process.cwd();
let targetDirs: string[] = [];
let ignoreList: string[] = ['node_modules', 'dist', 'build', '.git'];

// Check file config trước
const configPath = path.join(process.cwd(), 'structure.config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.dirs && Array.isArray(config.dirs)) {
      targetDirs = config.dirs;
    }
  } catch (e) {
    console.error(`⚠️ Lỗi khi đọc structure.config.json: ${e.message}`);
  }
}

// Đọc tham số (ghi đè nếu có truyền cờ trên CLI)
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
    mapFilePath = path.resolve(process.cwd(), args[i + 1]);
    i++;
  } else if ((args[i] === '--dirs' || args[i] === '-d') && args[i + 1]) {
    targetDirs = args[i + 1].split(',').map(d => d.trim()).filter(Boolean);
    i++;
  } else if ((args[i] === '--ignore' || args[i] === '-i') && args[i + 1]) {
    const extraIgnores = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
    ignoreList.push(...extraIgnores);
    i++;
  }
}

// Nếu không có thư mục nào được cung cấp, mặc định là root
if (targetDirs.length === 0) {
  targetDirs = ['.'];
}

// Cấu trúc dữ liệu
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

// Tiện ích lấy mô tả từ JSDoc
function getPurposeFromJsDoc(node: any): string {
  if (typeof node.getJsDocs === 'function') {
    const jsdocs = node.getJsDocs();
    if (jsdocs && jsdocs.length > 0) {
      return jsdocs[0].getDescription().trim();
    }
  }
  return "Chưa có mô tả (Tạo tự động)";
}

// Kiểm tra bỏ qua file/folder
function shouldIgnore(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return ignoreList.some(pattern => normalizedPath.includes(pattern));
}

// Chạy luồng chính
function main() {
  console.log(`\n🔍 [Map Generator] Đang quét codebase tại các thư mục: ${targetDirs.join(', ')}`);
  console.log(`📁 File kết quả: ${mapFilePath}`);
  console.log(`🚫 Đang bỏ qua các file/thư mục chứa: ${ignoreList.join(', ')}\n`);

  const newMap: ProjectMap = {
    lastUpdated: new Date().toISOString(),
    structure: {}
  };

  let processedCount = 0;

  for (const dir of targetDirs) {
    const baseDir = path.resolve(projectRoot, dir);
    if (!fs.existsSync(baseDir)) {
      console.warn(`⚠️ [Cảnh báo] Thư mục ${dir} không tồn tại, bỏ qua.`);
      continue;
    }

    const tsConfigFilePath = path.join(baseDir, 'tsconfig.json');
    
    // Khởi tạo Project ts-morph
    const project = new Project({
      tsConfigFilePath: fs.existsSync(tsConfigFilePath) ? tsConfigFilePath : undefined,
    });

    // Nếu không có tsconfig, bổ sung sources cơ bản
    if (!fs.existsSync(tsConfigFilePath)) {
      project.addSourceFilesAtPaths(path.join(baseDir, '**/*.ts'));
    }

    const sourceFiles = project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      if (sourceFile.isFromExternalLibrary() || sourceFile.isDeclarationFile()) {
        continue;
      }

      const absolutePath = sourceFile.getFilePath();
      if (shouldIgnore(absolutePath)) {
        continue;
      }

      // Đường dẫn file tương đối so với project root để đảm bảo thống nhất
      const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
      
      const imports = sourceFile.getImportDeclarations();
      const fileDependencies = imports.map(imp => imp.getModuleSpecifierValue());

      const fileMeta: FileMeta = {
        module: path.dirname(relativePath),
        functions: []
      };

      // Hàm bình thường
      const functions = sourceFile.getFunctions();
      for (const func of functions) {
        fileMeta.functions.push({
          name: func.getName() || 'anonymous_func',
          purpose: getPurposeFromJsDoc(func),
          dependencies: [...fileDependencies]
        });
      }

      // Classes & Methods
      const classes = sourceFile.getClasses();
      for (const cls of classes) {
        const className = cls.getName() || 'anonymous_class';
        fileMeta.functions.push({
          name: className,
          purpose: getPurposeFromJsDoc(cls) || `Class ${className}`,
          dependencies: [...fileDependencies]
        });

        const methods = cls.getMethods();
        for (const method of methods) {
          fileMeta.functions.push({
            name: `${className}.${method.getName()}`,
            purpose: getPurposeFromJsDoc(method),
            dependencies: [...fileDependencies]
          });
        }
      }

      if (fileMeta.functions.length > 0) {
        newMap.structure[relativePath] = fileMeta;
        processedCount++;
      }
    }
  }

  // Đảm bảo thư mục lưu file tồn tại
  const outputDir = path.dirname(mapFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(mapFilePath, JSON.stringify(newMap, null, 2), 'utf-8');
  console.log(`✅ [Map Generator] Đã tạo thành công map với ${processedCount} file hợp lệ.\n`);
}

main();
