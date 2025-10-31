#!/usr/bin/env tsx
/**
 * API Endpoint Explainer
 * 
 * Explains API endpoints in detail including:
 * - HTTP methods
 * - Parameters and body schema
 * - Response format
 * - Authentication requirements
 * - Example usage
 */

import fs from 'fs';
import path from 'path';

interface EndpointInfo {
  method: string;
  path: string;
  handler: string;
  description: string;
  parameters: ParameterInfo[];
  requestBody?: any;
  responses: ResponseInfo[];
  authentication: boolean;
  middleware: string[];
  example: string;
}

interface ParameterInfo {
  name: string;
  location: 'path' | 'query' | 'body' | 'header';
  type: string;
  required: boolean;
  description: string;
}

interface ResponseInfo {
  status: number;
  description: string;
  schema?: any;
}

class EndpointExplainer {
  /**
   * Explain API endpoint from file
   */
  explainEndpoint(filePath: string): EndpointInfo[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`🔍 Analyzing endpoints in ${filePath}...\n`);

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.extractEndpoints(content, filePath);
  }

  /**
   * Extract endpoints from content
   */
  private extractEndpoints(content: string, filePath: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Find route definitions
    const routeRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,?\s*([^)]*)\)/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const handlers = match[3];

      const endpoint: EndpointInfo = {
        method,
        path,
        handler: this.extractHandlerName(handlers),
        description: this.generateDescription(method, path),
        parameters: this.extractParameters(path, content),
        responses: this.inferResponses(method),
        authentication: this.hasAuthentication(handlers),
        middleware: this.extractMiddleware(handlers),
        example: this.generateExample(method, path)
      };

      endpoints.push(endpoint);
    }

    return endpoints;
  }

  /**
   * Extract handler name
   */
  private extractHandlerName(handlers: string): string {
    const handlerMatch = handlers.match(/(\w+)\s*$/);
    return handlerMatch ? handlerMatch[1] : 'anonymous';
  }

  /**
   * Generate description
   */
  private generateDescription(method: string, path: string): string {
    const resource = path.split('/').filter(p => p && !p.startsWith(':')).pop() || 'resource';
    
    switch (method) {
      case 'GET':
        return path.includes(':') 
          ? `Retrieve a specific ${resource}` 
          : `List all ${resource}s`;
      case 'POST':
        return `Create a new ${resource}`;
      case 'PUT':
        return `Update an existing ${resource}`;
      case 'PATCH':
        return `Partially update a ${resource}`;
      case 'DELETE':
        return `Delete a ${resource}`;
      default:
        return `${method} operation on ${resource}`;
    }
  }

  /**
   * Extract parameters from path
   */
  private extractParameters(path: string, content: string): ParameterInfo[] {
    const parameters: ParameterInfo[] = [];

    // Path parameters
    const pathParams = path.match(/:(\w+)/g);
    if (pathParams) {
      for (const param of pathParams) {
        const name = param.substring(1);
        parameters.push({
          name,
          location: 'path',
          type: 'string',
          required: true,
          description: `${name} identifier`
        });
      }
    }

    // Query parameters (look for req.query in content)
    const queryRegex = /req\.query\.(\w+)/g;
    let match;
    const seenQuery = new Set<string>();

    while ((match = queryRegex.exec(content)) !== null) {
      const name = match[1];
      if (!seenQuery.has(name)) {
        seenQuery.add(name);
        parameters.push({
          name,
          location: 'query',
          type: 'string',
          required: false,
          description: `Query parameter: ${name}`
        });
      }
    }

    // Body parameters (look for req.body)
    if (content.includes('req.body')) {
      parameters.push({
        name: 'body',
        location: 'body',
        type: 'object',
        required: true,
        description: 'Request body payload'
      });
    }

    return parameters;
  }

  /**
   * Infer response formats
   */
  private inferResponses(method: string): ResponseInfo[] {
    const responses: ResponseInfo[] = [];

    switch (method) {
      case 'GET':
        responses.push({
          status: 200,
          description: 'Successful response',
          schema: { type: 'object' }
        });
        responses.push({
          status: 404,
          description: 'Resource not found'
        });
        break;
      
      case 'POST':
        responses.push({
          status: 201,
          description: 'Resource created successfully',
          schema: { type: 'object' }
        });
        responses.push({
          status: 400,
          description: 'Bad request - validation failed'
        });
        break;
      
      case 'PUT':
      case 'PATCH':
        responses.push({
          status: 200,
          description: 'Resource updated successfully',
          schema: { type: 'object' }
        });
        responses.push({
          status: 404,
          description: 'Resource not found'
        });
        break;
      
      case 'DELETE':
        responses.push({
          status: 204,
          description: 'Resource deleted successfully'
        });
        responses.push({
          status: 404,
          description: 'Resource not found'
        });
        break;
    }

    responses.push({
      status: 500,
      description: 'Internal server error'
    });

    return responses;
  }

  /**
   * Check for authentication
   */
  private hasAuthentication(handlers: string): boolean {
    return handlers.includes('auth') || 
           handlers.includes('Auth') || 
           handlers.includes('authenticate') ||
           handlers.includes('requireAuth');
  }

  /**
   * Extract middleware
   */
  private extractMiddleware(handlers: string): string[] {
    const middleware: string[] = [];
    const middlewareRegex = /(\w+(?:Auth|Middleware|Guard|Validator))/g;
    let match;

    while ((match = middlewareRegex.exec(handlers)) !== null) {
      middleware.push(match[1]);
    }

    return middleware;
  }

  /**
   * Generate example
   */
  private generateExample(method: string, path: string): string {
    const examplePath = path.replace(/:(\w+)/g, (_, param) => {
      return param === 'id' ? '123' : `example-${param}`;
    });

    let example = `curl -X ${method} 'http://localhost:3000${examplePath}'`;

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      example += ` \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "value"}'`;
    }

    return example;
  }

  /**
   * Format as markdown
   */
  formatMarkdown(endpoints: EndpointInfo[], filePath: string): string {
    let md = `# API Endpoints: ${path.basename(filePath)}\n\n`;
    md += `> Analyzed from: \`${filePath}\`\n\n`;

    md += '## Table of Contents\n\n';
    endpoints.forEach((endpoint, idx) => {
      md += `${idx + 1}. [${endpoint.method} ${endpoint.path}](#${idx + 1}-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[/:]/g, '')})\n`;
    });
    md += '\n---\n\n';

    endpoints.forEach((endpoint, idx) => {
      md += `## ${idx + 1}. ${endpoint.method} ${endpoint.path}\n\n`;
      md += `**Description:** ${endpoint.description}\n\n`;

      if (endpoint.authentication) {
        md += `🔒 **Authentication Required**\n\n`;
      }

      if (endpoint.middleware.length > 0) {
        md += `**Middleware:** ${endpoint.middleware.join(', ')}\n\n`;
      }

      if (endpoint.parameters.length > 0) {
        md += '### Parameters\n\n';
        md += '| Name | Location | Type | Required | Description |\n';
        md += '|------|----------|------|----------|-------------|\n';
        
        for (const param of endpoint.parameters) {
          md += `| ${param.name} | ${param.location} | ${param.type} | ${param.required ? '✅' : '❌'} | ${param.description} |\n`;
        }
        md += '\n';
      }

      md += '### Responses\n\n';
      for (const response of endpoint.responses) {
        md += `- **${response.status}**: ${response.description}\n`;
      }
      md += '\n';

      md += '### Example\n\n';
      md += '```bash\n';
      md += endpoint.example;
      md += '\n```\n\n';

      md += '---\n\n';
    });

    return md;
  }
}

// Main execution
async function main() {
  const explainer = new EndpointExplainer();
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx explain_endpoint.ts <file-path>');
    console.error('Example: tsx explain_endpoint.ts src/api/routes/users.ts');
    process.exit(1);
  }

  try {
    const endpoints = explainer.explainEndpoint(filePath);
    
    if (endpoints.length === 0) {
      console.log('No API endpoints found in this file.');
      return;
    }

    const markdown = explainer.formatMarkdown(endpoints, filePath);
    console.log(markdown);

    // Save if requested
    if (process.argv.includes('--save')) {
      const outputFile = `${filePath}.ENDPOINTS.md`;
      fs.writeFileSync(outputFile, markdown);
      console.log(`\n✅ Endpoint documentation saved to ${outputFile}`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
