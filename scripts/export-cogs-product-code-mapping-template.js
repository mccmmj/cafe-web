#!/usr/bin/env node

/**
 * Runner for scripts/export-cogs-product-code-mapping-template.ts (transpile on the fly).
 */

require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const Module = module.constructor

const entryPath = path.join(__dirname, 'export-cogs-product-code-mapping-template.ts')
const source = fs.readFileSync(entryPath, 'utf8')

const { outputText } = ts.transpileModule(source, {
  fileName: entryPath,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    resolveJsonModule: true
  }
})

const compiledModule = new Module(entryPath, module.parent)
compiledModule.filename = entryPath
compiledModule.paths = Module._nodeModulePaths(path.dirname(entryPath))
compiledModule._compile(outputText, entryPath)

