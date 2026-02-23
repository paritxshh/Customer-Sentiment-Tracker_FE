import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomerById } from '../lib/api';
import PriorityBadge from '../components/PriorityBadge';
import SentimentBadge from '../components/SentimentBadge';
import { ArrowLeft, User } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerById(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.customer) {
    return <p className="text-gray-500 text-center py-16">Customer not found</p>;
  }

  const { customer, feedbackHistory } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-full">
            <User className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{customer.name || customer.email}</h2>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{customer.customerId}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{customer.email}</p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-xs text-gray-500">Total Feedback</p>
                <p className="text-lg font-bold">{customer.feedbackCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Sentiment</p>
                <p className={`text-lg font-bold ${customer.avgSentimentScore < -0.3 ? 'text-red-400' : customer.avgSentimentScore > 0.3 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {customer.avgSentimentScore}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Sentiment</p>
                <p className="text-lg font-bold capitalize">{customer.lastSentiment}</p>
              </div>
              {customer.lastContactedAt && (
                <div>
                  <p className="text-xs text-gray-500">Last Contact</p>
                  <p className="text-sm text-gray-300 mt-1">{new Date(customer.lastContactedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Feedback History</h3>
        {feedbackHistory?.length > 0 ? (
          <div className="space-y-3">
            {feedbackHistory.map((fb) => (
              <div key={fb._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <SentimentBadge sentiment={fb.sentiment} score={fb.score} />
                  <PriorityBadge level={fb.priorityLevel} score={fb.priorityScore} />
                  <span className="text-xs text-gray-500 ml-auto">{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
                {fb.emailSubject && <p className="text-sm font-medium text-gray-300 mb-1">{fb.emailSubject}</p>}
                <p className="text-sm text-gray-400 leading-relaxed">{fb.text?.slice(0, 300)}{fb.text?.length > 300 ? '...' : ''}</p>
                {fb.urgencyKeywords?.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {fb.urgencyKeywords.map((kw) => (
                      <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No feedback history</p>
        )}
      </div>
    </div>
  );
}
