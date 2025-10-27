import { Check, Star, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for individual developers and small projects',
    features: [
      'Up to 3 agents',
      '1,000 tasks/month',
      'Basic MCP support',
      'Community support',
      'Standard templates',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/month',
    description: 'Ideal for growing teams and medium-scale automation',
    features: [
      'Up to 25 agents',
      '50,000 tasks/month',
      'Full MCP & A2A support',
      'Priority support',
      'Advanced templates',
      'Team collaboration',
      'Usage analytics',
      'Custom integrations',
    ],
    cta: 'Start Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with complex requirements',
    features: [
      'Unlimited agents',
      'Unlimited tasks',
      'Full platform access',
      '24/7 dedicated support',
      'Custom templates',
      'Advanced governance',
      'SLA guarantees',
      'On-premise deployment',
      'Custom integrations',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const addOns = [
  {
    name: 'Compute Credits',
    description: 'Additional processing power for high-volume workloads',
    price: '$0.10',
    unit: 'per 1K tasks',
  },
  {
    name: 'AI Governance API',
    description: 'Compliance monitoring for regulated industries',
    price: '$299',
    unit: '/month',
  },
  {
    name: 'Custom Connectors',
    description: 'Bespoke integrations for your specific tools',
    price: '$1,999',
    unit: 'one-time',
  },
];

export function Pricing() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative card ${
                plan.popular
                  ? 'ring-2 ring-primary-500 shadow-xl scale-105'
                  : 'hover:shadow-lg'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="card max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Add-ons & Extensions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addOns.map((addOn, index) => (
              <div key={index} className="p-6 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{addOn.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{addOn.description}</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-primary-600">{addOn.price}</span>
                  <span className="text-gray-600 ml-1">{addOn.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h3>
          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my plan limits?
              </h4>
              <p className="text-gray-600">
                We'll notify you when you're approaching your limits. You can upgrade your plan 
                or purchase additional compute credits to continue without interruption.
              </p>
            </div>
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-2">
                Can I change my plan at any time?
              </h4>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect 
                immediately, and we'll prorate any billing differences.
              </p>
            </div>
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-2">
                Do you offer custom enterprise solutions?
              </h4>
              <p className="text-gray-600">
                Absolutely! Our Enterprise plan includes custom pricing, dedicated support, 
                and tailored solutions for your specific requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}