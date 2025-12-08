import { Lock, Shield, FileCheck, Bell } from 'lucide-react';
import { useState } from 'react';

export default function SmartContracts() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const features = [
    {
      icon: Shield,
      title: 'Data Integrity',
      description: 'Immutable records of all eDNA analysis results stored on blockchain',
    },
    {
      icon: FileCheck,
      title: 'Verified Discoveries',
      description: 'Timestamped proof of novel taxa discoveries with cryptographic verification',
    },
    {
      icon: Lock,
      title: 'Secure Sharing',
      description: 'Controlled data access with smart contract-based permissions',
    },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
          <Lock className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Smart Contracts</h2>
        <p className="text-xl text-gray-600">Blockchain-powered data integrity for marine research</p>
        <div className="inline-block mt-6 px-6 py-2 bg-blue-50 text-blue-700 rounded-full font-medium">
          Coming Soon
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Revolutionary Features
        </h3>
        <div className="grid gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{feature.title}</h4>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-start gap-4 mb-6">
          <Bell className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="text-2xl font-bold mb-2">Be the First to Know</h3>
            <p className="text-blue-100">
              Get notified when smart contract features launch. Join our early access list for
              exclusive updates on blockchain-enabled marine biodiversity research.
            </p>
          </div>
        </div>

        {!subscribed ? (
          <form onSubmit={handleSubscribe} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Notify Me
            </button>
          </form>
        ) : (
          <div className="bg-blue-500 rounded-lg p-4 text-center">
            <p className="font-medium">Thank you for subscribing! We'll keep you updated.</p>
          </div>
        )}
      </div>
    </div>
  );
}
