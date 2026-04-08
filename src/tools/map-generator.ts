// @ts-nocheck
import { Project, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const MAP_FILE_PATH = path.join(__dirname, '../../project-map.json');
const ROOT_DIR = path.join(__dirname, '../../');

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

function getPurposeFromJsDoc(node: any): string {
  if (node.getJsDocs) {
    const jsdocs = node.getJsDocs();
    if (jsdocs && jsdocs.length > 0) {
      return jsdocs[0].getDescription().trim();
    }
  }
  return "Chưa có mô tả (Tạo tự động)";
}

function main() {
  console.log('[Map Generator] Đang quét toàn bộ dự án...');

  const project = new Project({
    tsConfigFilePath: path.join(ROOT_DIR, 'tsconfig.json'),
  });

  // Có thể bạn chỉ muốn quét trong mục src, bỏ qua test hoặc tools.
  const sourceFiles = project.getSourceFiles();

  const newMap: ProjectMap = {
    lastUpdated: new Date().toISOString(),
    structure: {}
  };

  for (const sourceFile of sourceFiles) {
    // Chỉ file trong project nội bộ, bỏ dts và node_modules
    if (sourceFile.isFromExternalLibrary() || sourceFile.isDeclarationFile()) {
      continue;
    }

    const filePath = path.relative(ROOT_DIR, sourceFile.getFilePath()).replace(/\\/g, '/');
    
    // Thu thập Import làm dependency chung cho file/hàm
    const imports = sourceFile.getImportDeclarations();
    const fileDependencies = imports.map(imp => imp.getModuleSpecifierValue());

    const fileMeta: FileMeta = {
      module: path.dirname(filePath),
      functions: []
    };

    // Quét Functions (Hàm bình thường)
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      const name = func.getName() || 'anonymous_func';
      fileMeta.functions.push({
        name,
        purpose: getPurposeFromJsDoc(func),
        dependencies: [...fileDependencies] // Lấy deps từ imports
      });
    }

    // Quét Classes
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const className = cls.getName() || 'anonymous_class';
      fileMeta.functions.push({
        name: className,
        purpose: getPurposeFromJsDoc(cls) || `Class ${className}`,
        dependencies: [...fileDependencies]
      });

      // Lấy thêm các method trong class
      const methods = cls.getMethods();
      for (const method of methods) {
        fileMeta.functions.push({
          name: `${className}.${method.getName()}`,
          purpose: getPurposeFromJsDoc(method),
          dependencies: [...fileDependencies]
        });
      }
    }

    // Nếu có quét được function hay class thì mới đưa vào cấu trúc
    if (fileMeta.functions.length > 0) {
      newMap.structure[filePath] = fileMeta;
    }
  }

  // Đọc map cũ để hợp nhất (merge) nếu cần thiết, nhưng ở đây vẽ lại hoàn toàn thì ghi đè là tốt nhất
  let finalMap = newMap;
  if (fs.existsSync(MAP_FILE_PATH)) {
    try {
      const oldMap: ProjectMap = JSON.parse(fs.readFileSync(MAP_FILE_PATH, 'utf-8'));
      // Ở đây ta ghi đè hoàn toàn map mới, nhưng nếu muốn thì có thể merge
      // Để phục vụ "vẽ lại map cho các dự án dang dở", việc làm mới (reset) map cho đúng hiện trạng code là an toàn nhất.
      console.log(`[Map Generator] Đã tìm thấy map cũ. Sẽ cập nhật và ghi đè bằng cấu trúc mới quét được từ source.`);
    } catch(e) {}
  }

  fs.writeFileSync(MAP_FILE_PATH, JSON.stringify(finalMap, null, 2), 'utf-8');
  console.log(`[Map Generator] Đã tạo lại thành công project-map.json với ${Object.keys(finalMap.structure).length} files.`);
}

main();
