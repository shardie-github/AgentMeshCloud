#!/usr/bin/env tsx

/**
 * OpenAPI Diff Validator
 * 
 * Detects breaking changes between OpenAPI specs
 * Enforces BREAKING: label in release notes
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface OpenAPISpec {
  openapi: string;
  info: { version: string; title: string };
  paths: Record<string, any>;
  components?: { schemas?: Record<string, any> };
}

interface Change {
  type: 'breaking' | 'non-breaking';
  category: string;
  path: string;
  description: string;
}

class OpenAPIDiff {
  private oldSpec: OpenAPISpec;
  private newSpec: OpenAPISpec;
  private changes: Change[] = [];

  constructor(oldSpecPath: string, newSpecPath: string) {
    this.oldSpec = this.loadSpec(oldSpecPath);
    this.newSpec = this.loadSpec(newSpecPath);
  }

  private loadSpec(specPath: string): OpenAPISpec {
    const content = fs.readFileSync(specPath, 'utf-8');
    if (specPath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      return yaml.load(content) as OpenAPISpec;
    }
    throw new Error(`Unsupported spec format: ${specPath}`);
  }

  private detectRemovedEndpoints(): void {
    for (const [path, methods] of Object.entries(this.oldSpec.paths)) {
      if (!this.newSpec.paths[path]) {
        this.changes.push({
          type: 'breaking',
          category: 'endpoint',
          path,
          description: `Endpoint removed: ${path}`,
        });
      } else {
        // Check for removed methods
        for (const method of Object.keys(methods)) {
          if (method === 'parameters') continue;
          if (!this.newSpec.paths[path][method]) {
            this.changes.push({
              type: 'breaking',
              category: 'method',
              path: `${method.toUpperCase()} ${path}`,
              description: `Method removed: ${method.toUpperCase()} ${path}`,
            });
          }
        }
      }
    }
  }

  private detectNewEndpoints(): void {
    for (const [path, methods] of Object.entries(this.newSpec.paths)) {
      if (!this.oldSpec.paths[path]) {
        this.changes.push({
          type: 'non-breaking',
          category: 'endpoint',
          path,
          description: `New endpoint: ${path}`,
        });
      } else {
        // Check for new methods
        for (const method of Object.keys(methods)) {
          if (method === 'parameters') continue;
          if (!this.oldSpec.paths[path][method]) {
            this.changes.push({
              type: 'non-breaking',
              category: 'method',
              path: `${method.toUpperCase()} ${path}`,
              description: `New method: ${method.toUpperCase()} ${path}`,
            });
          }
        }
      }
    }
  }

  private detectParameterChanges(): void {
    for (const [path, newMethods] of Object.entries(this.newSpec.paths)) {
      const oldMethods = this.oldSpec.paths[path];
      if (!oldMethods) continue;

      for (const [method, newOperation] of Object.entries(newMethods)) {
        if (method === 'parameters') continue;
        const oldOperation = oldMethods[method];
        if (!oldOperation) continue;

        const oldParams = oldOperation.parameters || [];
        const newParams = newOperation.parameters || [];

        // Check for removed parameters
        for (const oldParam of oldParams) {
          const found = newParams.find((p: any) => p.name === oldParam.name);
          if (!found) {
            this.changes.push({
              type: 'breaking',
              category: 'parameter',
              path: `${method.toUpperCase()} ${path}`,
              description: `Parameter removed: ${oldParam.name}`,
            });
          }
        }

        // Check for new required parameters
        for (const newParam of newParams) {
          const oldParam = oldParams.find((p: any) => p.name === newParam.name);
          if (!oldParam && newParam.required) {
            this.changes.push({
              type: 'breaking',
              category: 'parameter',
              path: `${method.toUpperCase()} ${path}`,
              description: `New required parameter: ${newParam.name}`,
            });
          }
        }
      }
    }
  }

  private detectResponseChanges(): void {
    for (const [path, newMethods] of Object.entries(this.newSpec.paths)) {
      const oldMethods = this.oldSpec.paths[path];
      if (!oldMethods) continue;

      for (const [method, newOperation] of Object.entries(newMethods)) {
        if (method === 'parameters') continue;
        const oldOperation = oldMethods[method];
        if (!oldOperation) continue;

        const oldResponses = oldOperation.responses || {};
        const newResponses = newOperation.responses || {};

        // Check for removed response codes
        for (const code of Object.keys(oldResponses)) {
          if (!newResponses[code]) {
            this.changes.push({
              type: 'breaking',
              category: 'response',
              path: `${method.toUpperCase()} ${path}`,
              description: `Response code removed: ${code}`,
            });
          }
        }
      }
    }
  }

  private detectSchemaChanges(): void {
    const oldSchemas = this.oldSpec.components?.schemas || {};
    const newSchemas = this.newSpec.components?.schemas || {};

    for (const [name, oldSchema] of Object.entries(oldSchemas)) {
      const newSchema = newSchemas[name];
      if (!newSchema) {
        this.changes.push({
          type: 'breaking',
          category: 'schema',
          path: `schemas/${name}`,
          description: `Schema removed: ${name}`,
        });
        continue;
      }

      // Check for removed required fields
      const oldRequired = (oldSchema as any).required || [];
      const newRequired = (newSchema as any).required || [];

      for (const field of oldRequired) {
        if (!newRequired.includes(field)) {
          this.changes.push({
            type: 'breaking',
            category: 'schema',
            path: `schemas/${name}`,
            description: `Required field removed from ${name}: ${field}`,
          });
        }
      }

      // Check for removed properties
      const oldProps = (oldSchema as any).properties || {};
      const newProps = (newSchema as any).properties || {};

      for (const prop of Object.keys(oldProps)) {
        if (!newProps[prop]) {
          this.changes.push({
            type: 'breaking',
            category: 'schema',
            path: `schemas/${name}`,
            description: `Property removed from ${name}: ${prop}`,
          });
        }
      }
    }
  }

  public analyze(): void {
    console.log('🔍 Analyzing OpenAPI spec changes...\n');

    this.detectRemovedEndpoints();
    this.detectNewEndpoints();
    this.detectParameterChanges();
    this.detectResponseChanges();
    this.detectSchemaChanges();
  }

  public getChanges(): Change[] {
    return this.changes;
  }

  public hasBreakingChanges(): boolean {
    return this.changes.some(c => c.type === 'breaking');
  }

  public report(): void {
    const breaking = this.changes.filter(c => c.type === 'breaking');
    const nonBreaking = this.changes.filter(c => c.type === 'non-breaking');

    console.log('📊 OpenAPI Diff Report\n');
    console.log('='.repeat(60));

    if (breaking.length > 0) {
      console.log('\n⚠️  BREAKING CHANGES:\n');
      breaking.forEach(change => {
        console.log(`  ❌ [${change.category}] ${change.description}`);
      });
    }

    if (nonBreaking.length > 0) {
      console.log('\n✅ Non-Breaking Changes:\n');
      nonBreaking.forEach(change => {
        console.log(`  ℹ️  [${change.category}] ${change.description}`);
      });
    }

    if (this.changes.length === 0) {
      console.log('\nℹ️  No API changes detected');
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\nSummary: ${breaking.length} breaking, ${nonBreaking.length} non-breaking\n`);

    // Save report
    const reportPath = path.join('security', `openapi-diff-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      oldVersion: this.oldSpec.info.version,
      newVersion: this.newSpec.info.version,
      changes: this.changes,
    }, null, 2));
    console.log(`Report saved: ${reportPath}\n`);
  }

  public validate(): boolean {
    if (this.hasBreakingChanges()) {
      console.log('⚠️  Breaking changes detected!');
      console.log('Required: BREAKING: label in CHANGELOG.md\n');
      
      // Check CHANGELOG for BREAKING: label
      const changelog = fs.readFileSync('CHANGELOG.md', 'utf-8');
      const hasBreakingLabel = /BREAKING:/i.test(changelog);
      
      if (!hasBreakingLabel) {
        console.log('❌ CHANGELOG.md missing BREAKING: label');
        console.log('Add breaking change documentation before release\n');
        return false;
      } else {
        console.log('✅ BREAKING: label found in CHANGELOG.md\n');
      }
    }
    
    return true;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const oldSpecPath = args[0] || 'openapi.yaml';
  const newSpecPath = args[1] || 'openapi.orca.yaml';

  const diff = new OpenAPIDiff(oldSpecPath, newSpecPath);
  diff.analyze();
  diff.report();
  
  const valid = diff.validate();
  process.exit(valid ? 0 : 1);
}

export default OpenAPIDiff;
