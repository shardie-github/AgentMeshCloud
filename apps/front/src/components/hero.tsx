'use client';

import { useState } from 'react';
import { ArrowRight, Play, Zap, Shield, Globe } from 'lucide-react';

export function Hero() {
  const [email, setEmail] = useState('');

  return (
    <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mb-8">
            <Zap className="w-4 h-4 mr-2" />
            First A2A/MCP-compliant platform
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            <span className="text-gradient">AgentMesh Cloud</span>
            <br />
            <span className="text-gray-700">Cognitive Automation</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Unite autonomous AI agents, enterprise workflows, and developer tools 
            under one secure SaaS umbrella with MCP and A2A standards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button className="btn-primary text-lg px-8 py-4 flex items-center">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button className="btn-secondary text-lg px-8 py-4 flex items-center">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </button>
          </div>

          {/* Email Signup */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 input-field"
              />
              <button className="btn-primary whitespace-nowrap">
                Get Started
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              No credit card required • 14-day free trial
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-16 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-8">Trusted by leading enterprises</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary-600" />
                <span className="font-semibold">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-primary-600" />
                <span className="font-semibold">99.9% Uptime</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary-600" />
                <span className="font-semibold">Sub-second Latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}