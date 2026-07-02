import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../../utils/formatters'
import LoadingSpinner from '../../common/LoadingSpinner'

export default function RevenueTrendChart({ data, loading }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-md">
          <p className="mb-1 font-semibold text-xs text-gray-900">
            {payload[0].payload.day}
          </p>
          <p className="text-green-600 text-base font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl h-[350px] mb-8 flex items-center justify-center shadow-sm">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Doanh Thu 7 Ngày Gần Nhất
      </h3>

      {data.length === 0 ? (
        <div className="text-center py-16 px-6 text-gray-400">
          <p>No revenue data available for this week</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="day"
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#FFFFFF', stroke: '#10B981', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#10B981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
