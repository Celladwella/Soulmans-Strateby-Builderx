
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts';
import { SimulationStep } from '../types';

interface SimulationChartProps {
  data: SimulationStep[];
  startBankroll: number;
  maxSpins: number; 
}

// --- Custom Label Component for Chart Points ---
const SmartBankrollLabel = (props: any) => {
  const { x, y, value, startBankroll, index, fullData } = props;
  
  if (!fullData || !fullData[index]) return null;

  const prev = fullData[index - 1]?.bankroll;
  const next = fullData[index + 1]?.bankroll;
  const curr = value;

  // Determine if Local Peak or Trough
  const isPeak = (prev === undefined || curr >= prev) && (next === undefined || curr >= next);
  const isTrough = (prev === undefined || curr <= prev) && (next === undefined || curr <= next);
  const isLast = index === fullData.length - 1;

  if (!isPeak && !isTrough && !isLast) return null;

  const isProfitable = value >= startBankroll;
  const dy = isPeak ? -15 : 20;

  return (
    <text 
      x={x} 
      y={y} 
      dy={dy} 
      fill={isProfitable ? "#4ade80" : "#f87171"} 
      fontSize={10} 
      fontFamily="monospace"
      textAnchor="middle" 
      fontWeight="bold"
      style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
    >
      ${value}
    </text>
  );
};

// --- Custom Y-Axis Tick Component ---
const CustomYAxisTick = (props: any) => {
  const { x, y, payload, startBankroll } = props;
  const val = payload.value;
  const color = val >= startBankroll ? '#4ade80' : '#f87171'; 
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={4} 
        textAnchor="end" 
        fill={color} 
        fontSize={10} 
        fontFamily="monospace"
        fontWeight="bold"
      >
        ${val}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label, startBankroll }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as SimulationStep;
    const isProfitable = data.bankroll >= startBankroll;
    
    // Dynamic border color based on profitability
    const borderColor = isProfitable ? 'border-green-500 shadow-green-900/20' : 'border-red-500 shadow-red-900/20';

    return (
      <div className={`bg-gray-900 border-2 ${borderColor} p-3 rounded-lg shadow-2xl backdrop-blur-sm z-50`}>
        <p className="font-bold text-yellow-400 mb-1 font-mono">Spin #{label}</p>
        <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Result:</span>
                <span className={`${
                    data.result.color === 'red' ? 'text-red-500' : 
                    data.result.color === 'black' ? 'text-gray-400' : 'text-green-500'
                } font-bold`}>
                    {data.result.number} ({data.result.color})
                </span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-gray-400">Bankroll:</span>
                <span className={`font-bold font-mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    ${data.bankroll}
                </span>
            </div>
             <div className="flex justify-between gap-4">
                <span className="text-gray-400">Net:</span>
                <span className={`font-bold ${data.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.net >= 0 ? '+' : ''}{data.net}
                </span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const SimulationChart: React.FC<SimulationChartProps> = ({ data, startBankroll, maxSpins }) => {
  
  // 1. Calculate Min/Max for dynamic domain including StartBankroll
  const bankrolls = data.map(d => d.bankroll);
  // Ensure startBankroll is part of the range calculation so the line never goes off-screen
  const minVal = Math.min(startBankroll, ...bankrolls);
  const maxVal = Math.max(startBankroll, ...bankrolls);
  
  // 2. Add Padding (Exact Floats - No Floor/Ceil to prevent rounding errors on offset)
  const padding = (maxVal - minVal) * 0.05;
  // If min == max (flat line at start), default to +/- 100
  const effectivePadding = padding === 0 ? 100 : padding;
  
  const domainMin = minVal - effectivePadding;
  const domainMax = maxVal + effectivePadding;

  // 3. Calculate Gradient Offset
  // Formula: (Max - Start) / (Max - Min)
  // Maps StartBankroll to a 0-1 percentage relative to the domain top (0) and bottom (1)
  const gradientOffset = () => {
    if (domainMax <= domainMin) return 0;
    if (startBankroll >= domainMax) return 0; // All Loss (Red)
    if (startBankroll <= domainMin) return 1; // All Profit (Green)
    return (domainMax - startBankroll) / (domainMax - domainMin);
  };

  const off = gradientOffset();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
      >
        <defs>
          <linearGradient id="splitColorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
            <stop offset={`${off * 100}%`} stopColor="#4ade80" stopOpacity={0.1} />
            <stop offset={`${off * 100}%`} stopColor="#ef4444" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.95} />
          </linearGradient>

          <linearGradient id="splitColorStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset={`${off * 100}%`} stopColor="#4ade80" />
            <stop offset={`${off * 100}%`} stopColor="#ef4444" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        
        <CartesianGrid 
            stroke="#334155" 
            strokeOpacity={0.4} 
            vertical={true} 
            horizontal={true}
        />
        
        <XAxis 
          dataKey="spinIndex" 
          type="number"
          domain={[0, 'dataMax']} 
          interval={0} // Force tick for every step
          minTickGap={2} // Prevent overlap if too tight
          stroke="#666" 
          tick={{ fill: '#fbbf24', fontSize: 10, fontFamily: 'monospace' }} 
          tickLine={false}
          axisLine={false}
        />
        
        <YAxis 
          domain={[domainMin, domainMax]} 
          allowDecimals={false} // Hide decimals on axis labels for cleaner look, even if domain is float
          stroke="#666" 
          tick={<CustomYAxisTick startBankroll={startBankroll} />}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        
        <Tooltip 
            content={<CustomTooltip startBankroll={startBankroll} />} 
            cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} 
        />
        
        <ReferenceLine 
            y={startBankroll} 
            stroke="#ffffff" 
            strokeWidth={2} 
            strokeDasharray="6 4" 
            opacity={0.9} 
            label={{ 
                value: 'START', 
                position: 'insideRight', 
                fill: '#fff', 
                fontSize: 10, 
                fontWeight: 'bold', 
                opacity: 0.7 
            }}
        />
        
        <Area
          type="linear"
          dataKey="bankroll"
          stroke="url(#splitColorStroke)"
          strokeWidth={3}
          fill="url(#splitColorFill)"
          baseValue={startBankroll}
          activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
          animationDuration={0}
        >
            <LabelList 
                dataKey="bankroll" 
                content={<SmartBankrollLabel startBankroll={startBankroll} fullData={data} />} 
            />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SimulationChart;
