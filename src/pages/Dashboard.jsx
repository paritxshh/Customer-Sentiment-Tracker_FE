import { useEffect, useState } from 'react';
import { fetchStats } from '../lib/api';
import StatCard from '../components/StatCard';
import { MessageSquare, AlertTriangle, TrendingDown, Users, Mail, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const SENTIMENT_COLORS = { positive: '#10b981', negative: '#ef4444', neutral: '#6b7280', mixed: '#f59e0b' };
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!stats) return <p className="text-gray-500">Failed to load stats.</p>;

  const sentimentPie = Object.entries(stats.sentiments || {}).map(([name, v]) => ({ name, value: v.count }));
  const priorityPie = Object.entries(stats.priorities || {}).map(([name, v]) => ({ name, value: v.count }));

  const criticalCount = stats.priorities?.critical?.count || 0;
  const highCount = stats.priorities?.high?.count || 0;
  const negativeCount = stats.sentiments?.negative?.count || 0;
  const emailCount = stats.sources?.email || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Customer sentiment overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Feedback" value={stats.total} icon={MessageSquare} color="indigo" />
        <StatCard label="Critical Alerts" value={criticalCount + highCount} sub={`${criticalCount} critical, ${highCount} high`} icon={AlertTriangle} color="red" />
        <StatCard label="Negative Feedback" value={negativeCount} sub={stats.sentiments?.negative ? `${stats.sentiments.negative.percentage}% of total` : ''} icon={TrendingDown} color="amber" />
        <StatCard label="Emails Processed" value={emailCount} icon={Mail} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Sentiment Distribution</h3>
          {sentimentPie.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={sentimentPie} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {sentimentPie.map((entry) => (
                      <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {sentimentPie.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[name] }} />
                    <span className="text-gray-400 capitalize">{name}</span>
                    <span className="text-gray-200 font-medium ml-auto">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Priority Distribution</h3>
          {priorityPie.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={priorityPie} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {priorityPie.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {priorityPie.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[name] }} />
                    <span className="text-gray-400 capitalize">{name}</span>
                    <span className="text-gray-200 font-medium ml-auto">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No data yet</p>
          )}
        </div>
      </div>

      {stats.dailyTrend?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">30-Day Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.dailyTrend}>
              <defs>
                <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#colorPos)" strokeWidth={2} />
              <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#colorNeg)" strokeWidth={2} />
              <Area type="monotone" dataKey="critical" stroke="#f97316" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats.topComplainters?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top Repeat Complainers
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 pr-4 font-medium">Email</th>
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-right py-2 pr-4 font-medium">Feedbacks</th>
                  <th className="text-right py-2 font-medium">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.topComplainters.map((c) => (
                  <tr key={c.email} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2.5 pr-4 text-gray-300">{c.email}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{c.name || '—'}</td>
                    <td className="py-2.5 pr-4 text-right font-medium">{c.feedbackCount}</td>
                    <td className={`py-2.5 text-right font-medium ${c.avgScore < -0.3 ? 'text-red-400' : c.avgScore > 0.3 ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {c.avgScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
