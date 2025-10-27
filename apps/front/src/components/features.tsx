import { 
  Bot, 
  Workflow, 
  Shield, 
  BarChart3, 
  Code, 
  Zap,
  Users,
  Database,
  MessageSquare,
  Settings
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'Agent Registry',
    description: 'MCP/A2A compliant agent discovery and lifecycle management with verifiable NANDA credentials.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Workflow,
    title: 'Workflow Composer',
    description: 'Ultimate no-code builder with LLM assistance for complex multi-agent orchestration.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: BarChart3,
    title: 'Agent Inspector',
    description: 'Real-time monitoring with predictive health alerts and performance analytics.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Shield,
    title: 'Governance Studio',
    description: 'Auto-enforces compliance rules with embedded Agile Governance Agent validation.',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: Code,
    title: 'Developer SDK',
    description: 'TypeScript SDK with OpenAPI integration for seamless agent development.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Database,
    title: 'Semantic Memory',
    description: 'pgvector-powered retrieval augmentation for context-aware agent collaboration.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    icon: MessageSquare,
    title: 'A2A Communication',
    description: 'Secure agent-to-agent messaging with Kafka/NATS message queuing.',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Multi-tenant workspace with role-based access and usage credit pooling.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    icon: Settings,
    title: 'DevOps Integration',
    description: 'GitHub Actions → Vercel Preview → Supabase Branch Sync automation.',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need for AI orchestration
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From agent registration to workflow execution, AgentMesh Cloud provides 
            the complete toolkit for enterprise-grade AI automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow duration-300">
              <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="card max-w-2xl mx-auto bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to orchestrate your AI agents?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of developers building the future of cognitive automation.
            </p>
            <button className="btn-primary text-lg px-8 py-3">
              Start Building Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}